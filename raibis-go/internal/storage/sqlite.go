package storage

import (
	"database/sql"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"

	"github.com/raibis/raibis-go/internal/domain"
)

//go:embed schema.sql
var schemaSQL string

type sqliteStorage struct {
	db *sql.DB
	mu sync.RWMutex
}

// Open opens (or creates) the SQLite database at dbPath.
// It sets WAL + foreign_keys, runs the embedded schema, and returns a Storage.
func Open(dbPath string) (Storage, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("mkdir %s: %w", filepath.Dir(dbPath), err)
	}
	dsn := fmt.Sprintf(
		"file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=busy_timeout(5000)",
		dbPath,
	)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// Single connection: WAL lets multiple readers run concurrently but only
	// one writer at a time. Pinning MaxOpenConns=1 means Go's connection pool
	// never opens a second connection that would race on the write lock.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	if _, err := db.Exec(schemaSQL); err != nil {
		return nil, fmt.Errorf("apply schema: %w", err)
	}
	if err := applyMigrations(db); err != nil {
		return nil, fmt.Errorf("apply migrations: %w", err)
	}
	return &sqliteStorage{db: db}, nil
}

// applyMigrations runs each DDL statement individually, ignoring errors that
// indicate the change is already applied (duplicate column, no such column for
// renames that already ran, etc.). Safe to call on both fresh and existing DBs.
func applyMigrations(db *sql.DB) error {
	stmts := []string{
		// ── categories table (new) ──────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS categories (
			id    INTEGER PRIMARY KEY AUTOINCREMENT,
			name  TEXT NOT NULL UNIQUE,
			color TEXT NOT NULL DEFAULT 'blue'
		)`,

		// ── goals: Notion fields ────────────────────────────────────────────
		`ALTER TABLE goals ADD COLUMN type          TEXT`,
		`ALTER TABLE goals ADD COLUMN year          TEXT`,
		`ALTER TABLE goals ADD COLUMN start_date    DATE`,
		`ALTER TABLE goals ADD COLUMN due_date      DATE`,
		`ALTER TABLE goals ADD COLUMN start_value   REAL`,
		`ALTER TABLE goals ADD COLUMN current_value REAL`,
		`ALTER TABLE goals ADD COLUMN target        REAL`,
		`ALTER TABLE goals ADD COLUMN category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL`,

		// ── projects: Notion fields ─────────────────────────────────────────
		`ALTER TABLE projects ADD COLUMN macro_area  TEXT`,
		`ALTER TABLE projects ADD COLUMN kanban_col  TEXT`,
		`ALTER TABLE projects ADD COLUMN archived    INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE projects ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL`,

		// ── tasks: legacy text category + new FK + pomodoro rename ─────────
		`ALTER TABLE tasks ADD COLUMN category        TEXT`,
		`ALTER TABLE tasks ADD COLUMN category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL`,
		`ALTER TABLE tasks ADD COLUMN focus_block      DATE`,
		`ALTER TABLE tasks ADD COLUMN focus_block_start DATE`,
		`ALTER TABLE tasks ADD COLUMN recur_interval   INTEGER`,
		`ALTER TABLE tasks ADD COLUMN recur_unit       TEXT`,
		`ALTER TABLE tasks ADD COLUMN story_points     INTEGER`,
		// Rename planned/finished → pomodoros_planned/pomodoros_finished
		// (RENAME COLUMN supported SQLite 3.25+; modernc bundles 3.46+)
		`ALTER TABLE tasks RENAME COLUMN planned  TO pomodoros_planned`,
		`ALTER TABLE tasks RENAME COLUMN finished TO pomodoros_finished`,
		// Fallback: add if DB never had planned/finished at all
		`ALTER TABLE tasks ADD COLUMN pomodoros_planned  INTEGER`,
		`ALTER TABLE tasks ADD COLUMN pomodoros_finished INTEGER`,
		// ── tasks: start_date for timeline/gantt view ───────────────────────
		`ALTER TABLE tasks ADD COLUMN start_date DATE`,

		// ── projects: date range support ────────────────────────────────────
		`ALTER TABLE projects ADD COLUMN start_date DATE`,
		`ALTER TABLE projects ADD COLUMN due_date   DATE`,

		// ── entity_properties: custom key-value pairs for any entity ───────
		`CREATE TABLE IF NOT EXISTS entity_properties (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT NOT NULL,
			entity_id   INTEGER NOT NULL,
			key         TEXT NOT NULL,
			value       TEXT NOT NULL DEFAULT '',
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_props ON entity_properties(entity_type, entity_id, key)`,

		// ── notes: category + Notion fields ────────────────────────────────
		`ALTER TABLE notes ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL`,
		`ALTER TABLE notes ADD COLUMN archived    INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE notes ADD COLUMN note_date   DATE`,
		`ALTER TABLE notes ADD COLUMN goal_id     INTEGER REFERENCES goals(id) ON DELETE SET NULL`,

		// ── tasks: goal FK (v3) ─────────────────────────────────────────────
		`ALTER TABLE tasks ADD COLUMN goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL`,

		// ── notes: vault file path (hybrid file-only) ───────────────────────
		`ALTER TABLE notes ADD COLUMN file_path TEXT`,

		// ── goal_id / resource goal indexes (added after goal_id columns exist) ─
		`CREATE INDEX IF NOT EXISTS idx_tasks_goal    ON tasks(goal_id)`,
		`CREATE INDEX IF NOT EXISTS idx_notes_goal    ON notes(goal_id)`,
		`CREATE INDEX IF NOT EXISTS idx_resources_goal ON resources(goal_id)`,

		// ── indexes ─────────────────────────────────────────────────────────
		`CREATE INDEX IF NOT EXISTS idx_tasks_category    ON tasks(category_id)`,
		`CREATE INDEX IF NOT EXISTS idx_tasks_goal        ON tasks(goal_id)`,
		`CREATE INDEX IF NOT EXISTS idx_notes_goal        ON notes(goal_id)`,
		`CREATE INDEX IF NOT EXISTS idx_goals_category    ON goals(category_id)`,
		`CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id)`,

		// ── sprints: story_points capacity ─────────────────────────────────
		`ALTER TABLE sprints ADD COLUMN story_points INTEGER`,

		// ── comments: threaded notes on any entity ──────────────────────────
		`CREATE TABLE IF NOT EXISTS comments (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT    NOT NULL,
			entity_id   INTEGER NOT NULL,
			author      TEXT    NOT NULL DEFAULT 'me',
			body        TEXT    NOT NULL,
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id)`,

		// ── entity_children: generic parent→child hierarchy ─────────────────
		`CREATE TABLE IF NOT EXISTS entity_children (
			id                 INTEGER PRIMARY KEY AUTOINCREMENT,
			parent_entity_type TEXT NOT NULL,
			parent_entity_id   INTEGER NOT NULL,
			child_entity_type  TEXT NOT NULL,
			child_entity_id    INTEGER NOT NULL,
			position           INTEGER NOT NULL DEFAULT 0,
			created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(parent_entity_type, parent_entity_id, child_entity_type, child_entity_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_entity_children_parent ON entity_children(parent_entity_type, parent_entity_id)`,

		// ── entity_relations: bidirectional peer links ──────────────────────
		// Pairs are stored normalized: type_a+":"+id_a <= type_b+":"+id_b
		`CREATE TABLE IF NOT EXISTS entity_relations (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			type_a     TEXT NOT NULL,
			id_a       INTEGER NOT NULL,
			type_b     TEXT NOT NULL,
			id_b       INTEGER NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(type_a, id_a, type_b, id_b)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_entity_relations_a ON entity_relations(type_a, id_a)`,
		`CREATE INDEX IF NOT EXISTS idx_entity_relations_b ON entity_relations(type_b, id_b)`,

		// ── tasks: pomodoro checkbox ────────────────────────────────────────
		`ALTER TABLE tasks ADD COLUMN pomodoro INTEGER NOT NULL DEFAULT 0`,

		// ── automations ─────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS automations (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			name           TEXT    NOT NULL,
			description    TEXT    NOT NULL DEFAULT '',
			entity_type    TEXT    NOT NULL DEFAULT 'task',
			enabled        INTEGER NOT NULL DEFAULT 1,
			trigger_logic  TEXT    NOT NULL DEFAULT 'all',
			trigger_type   TEXT    NOT NULL DEFAULT '',
			trigger_config TEXT    NOT NULL DEFAULT '[]',
			action_type    TEXT    NOT NULL DEFAULT '',
			action_config  TEXT    NOT NULL DEFAULT '[]',
			created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_automations_entity ON automations(entity_type)`,
		// Migration: add trigger_logic to existing automations table
		`ALTER TABLE automations ADD COLUMN trigger_logic TEXT NOT NULL DEFAULT 'all'`,

		// ── custom_entity_types: user-defined entity schemas ──────────────────
		`CREATE TABLE IF NOT EXISTS custom_entity_types (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			name         TEXT NOT NULL UNIQUE,
			display_name TEXT NOT NULL,
			icon         TEXT NOT NULL DEFAULT '📁',
			prop_defs    TEXT NOT NULL DEFAULT '[]',
			created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,

		// ── custom_entities: records for user-defined types ───────────────────
		`CREATE TABLE IF NOT EXISTS custom_entities (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			type_name    TEXT NOT NULL REFERENCES custom_entity_types(name) ON DELETE CASCADE,
			title        TEXT NOT NULL,
			created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_custom_entities_type ON custom_entities(type_name)`,

		// ── content_json: EditorJS rich content dual-storage ──────────────────
		`ALTER TABLE tasks     ADD COLUMN content_json TEXT`,
		`ALTER TABLE notes     ADD COLUMN content_json TEXT`,
		`ALTER TABLE projects  ADD COLUMN content_json TEXT`,
		`ALTER TABLE goals     ADD COLUMN content_json TEXT`,
		`ALTER TABLE sprints   ADD COLUMN content_json TEXT`,
		`ALTER TABLE resources ADD COLUMN content_json TEXT`,

		// ── habit_completions: daily check-in log ─────────────────────────────
		`CREATE TABLE IF NOT EXISTS habit_completions (
			id       INTEGER PRIMARY KEY AUTOINCREMENT,
			habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
			date     TEXT    NOT NULL,
			UNIQUE(habit_id, date)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, date)`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			e := err.Error()
			if strings.Contains(e, "duplicate column") ||
				strings.Contains(e, "no such column") ||
				strings.Contains(e, "already exists") {
				continue
			}
			preview := stmt
			if len(preview) > 60 {
				preview = preview[:60]
			}
			return fmt.Errorf("migration failed %q: %w", preview, err)
		}
	}
	return migrateSprintsProjectIdNullable(db)
}

// migrateSprintsProjectIdNullable rebuilds the sprints table so that
// project_id is nullable. This lets sprints exist without a parent project.
// Idempotent: checks the NOT NULL flag first and skips if already nullable.
func migrateSprintsProjectIdNullable(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(sprints)`)
	if err != nil {
		return nil // non-fatal; table may not exist yet
	}
	defer rows.Close()
	needsMigration := false
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull int
		var dflt, pk sql.NullString
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			continue
		}
		if name == "project_id" && notNull == 1 {
			needsMigration = true
			break
		}
	}
	rows.Close()
	if !needsMigration {
		return nil
	}
	stmts := []string{
		`CREATE TABLE sprints_proj_nullable (
			id           INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
			title        TEXT    NOT NULL,
			goal         TEXT,
			start_date   DATE,
			end_date     DATE,
			status       TEXT    NOT NULL DEFAULT 'planned',
			created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			story_points INTEGER
		)`,
		`INSERT INTO sprints_proj_nullable
		    SELECT id, project_id, title, goal, start_date, end_date, status, created_at,
		           CASE WHEN typeof(story_points)='integer' THEN story_points ELSE NULL END
		    FROM sprints`,
		`DROP TABLE sprints`,
		`ALTER TABLE sprints_proj_nullable RENAME TO sprints`,
		`CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("sprints nullable migration: %w", err)
		}
	}
	return nil
}

func (s *sqliteStorage) Close() error { return s.db.Close() }

// ── Tasks ─────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateTask(t *domain.Task) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO tasks
		    (goal_id, project_id, sprint_id, parent_task_id, title, description,
		     status, priority, start_date, due_date, estimated_mins, logged_mins,
		     category, category_id, focus_block, focus_block_start, recur_interval, recur_unit,
		     story_points, pomodoros_planned, pomodoros_finished, pomodoro)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		t.GoalID, t.ProjectID, t.SprintID, t.ParentTaskID,
		t.Title, t.Description,
		string(t.Status), string(t.Priority),
		nullTime(t.StartDate), nullTime(t.DueDate), t.EstimatedMin, t.LoggedMins,
		t.Category, t.CategoryID, t.FocusBlock, t.FocusBlockStart, t.RecurInterval, t.RecurUnit,
		t.StoryPoints, t.PomodorosPlanned, t.PomodorosFinished, t.Pomodoro,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) GetTask(id int64) (*domain.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(taskSelectCols+` WHERE t.id = ?`, id)
	return scanTask(row)
}

func (s *sqliteStorage) ListTasks(f domain.TaskFilter) ([]*domain.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	q := taskSelectCols + ` WHERE 1=1`
	args := []any{}

	if f.GoalID != nil {
		q += ` AND t.goal_id = ?`
		args = append(args, *f.GoalID)
	}
	if f.ProjectID != nil {
		q += ` AND t.project_id = ?`
		args = append(args, *f.ProjectID)
	}
	if f.SprintID != nil {
		q += ` AND t.sprint_id = ?`
		args = append(args, *f.SprintID)
	}
	if f.Status != nil {
		q += ` AND t.status = ?`
		args = append(args, string(*f.Status))
	}
	if f.CategoryID != nil {
		q += ` AND t.category_id = ?`
		args = append(args, *f.CategoryID)
	}
	if f.ParentTaskID != nil {
		q += ` AND t.parent_task_id = ?`
		args = append(args, *f.ParentTaskID)
	}
	if f.TopLevelOnly {
		q += ` AND t.parent_task_id IS NULL`
	}
	q += ` ORDER BY
	    CASE t.priority
	        WHEN 'urgent' THEN 0
	        WHEN 'high'   THEN 1
	        WHEN 'medium' THEN 2
	        WHEN 'low'    THEN 3
	        ELSE 2
	    END,
	    COALESCE(t.due_date, '9999-12-31') ASC`

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*domain.Task
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (s *sqliteStorage) UpdateTask(t *domain.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var contentJSON interface{}
	if t.ContentJSON != "" {
		contentJSON = t.ContentJSON
	}
	_, err := s.db.Exec(
		`UPDATE tasks SET
		    goal_id=?, project_id=?, sprint_id=?, parent_task_id=?,
		    title=?, description=?, status=?, priority=?,
		    start_date=?, due_date=?, estimated_mins=?, logged_mins=?,
		    category=?, category_id=?, focus_block=?, focus_block_start=?, recur_interval=?, recur_unit=?,
		    story_points=?, pomodoros_planned=?, pomodoros_finished=?, pomodoro=?,
		    content_json=COALESCE(?,content_json),
		    updated_at=datetime('now')
		 WHERE id=?`,
		t.GoalID, t.ProjectID, t.SprintID, t.ParentTaskID,
		t.Title, t.Description,
		string(t.Status), string(t.Priority),
		nullTime(t.StartDate), nullTime(t.DueDate), t.EstimatedMin, t.LoggedMins,
		t.Category, t.CategoryID, t.FocusBlock, t.FocusBlockStart, t.RecurInterval, t.RecurUnit,
		t.StoryPoints, t.PomodorosPlanned, t.PomodorosFinished, t.Pomodoro,
		contentJSON,
		t.ID,
	)
	return err
}

func (s *sqliteStorage) DeleteTask(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM tasks WHERE id = ?`, id)
	return err
}

// taskSelectCols is the shared SELECT + JOIN for GetTask and ListTasks.
const taskSelectCols = `
SELECT t.id, t.goal_id, t.project_id, t.sprint_id, t.parent_task_id,
       t.title, COALESCE(t.description,''), t.status, t.priority, t.start_date, t.due_date,
       t.estimated_mins, t.logged_mins, t.created_at, t.updated_at,
       COALESCE(t.category,''), t.category_id, t.focus_block, t.focus_block_start,
       t.recur_interval, t.recur_unit, t.story_points,
       t.pomodoros_planned, t.pomodoros_finished,
       COALESCE(c.name,'') AS category_name,
       COALESCE(t.pomodoro, 0),
       COALESCE(t.content_json,'')
FROM tasks t
LEFT JOIN categories c ON t.category_id = c.id`

// ── Goals ─────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateGoal(g *domain.Goal) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO goals (title, description, status, type, year, start_date, due_date,
		  start_value, current_value, target, category_id)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		g.Title, g.Description, string(g.Status),
		emptyToNil(g.Type), emptyToNil(g.Year),
		g.StartDate, g.DueDate,
		g.StartValue, g.CurrentValue, g.Target, g.CategoryID,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListGoals(status domain.Status) ([]*domain.Goal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(goalSelectCols+` WHERE g.status=? ORDER BY g.created_at DESC`, string(status))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var goals []*domain.Goal
	for rows.Next() {
		g, err := scanGoal(rows)
		if err != nil {
			return nil, err
		}
		goals = append(goals, g)
	}
	return goals, rows.Err()
}

func (s *sqliteStorage) GetGoal(id int64) (*domain.Goal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(goalSelectCols+` WHERE g.id=?`, id)
	return scanGoal(row)
}

func (s *sqliteStorage) UpdateGoal(g *domain.Goal) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var contentJSON interface{}
	if g.ContentJSON != "" {
		contentJSON = g.ContentJSON
	}
	_, err := s.db.Exec(
		`UPDATE goals SET title=?, description=?, status=?, type=?, year=?,
		  start_date=?, due_date=?, start_value=?, current_value=?, target=?,
		  category_id=?, content_json=COALESCE(?,content_json)
		 WHERE id=?`,
		g.Title, g.Description, string(g.Status),
		emptyToNil(g.Type), emptyToNil(g.Year),
		g.StartDate, g.DueDate,
		g.StartValue, g.CurrentValue, g.Target, g.CategoryID,
		contentJSON, g.ID,
	)
	return err
}

func (s *sqliteStorage) DeleteGoal(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM goals WHERE id=?`, id)
	return err
}

const goalSelectCols = `
SELECT g.id, g.title, COALESCE(g.description,''), g.status, g.created_at,
       COALESCE(g.type,''), COALESCE(g.year,''),
       g.start_date, g.due_date, g.start_value, g.current_value, g.target,
       g.category_id, COALESCE(c.name,'') AS category_name,
       COALESCE(g.content_json,'')
FROM goals g
LEFT JOIN categories c ON g.category_id = c.id`

// ── Projects ──────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateProject(p *domain.Project) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	archived := 0
	if p.Archived {
		archived = 1
	}
	res, err := s.db.Exec(
		`INSERT INTO projects (goal_id, title, description, status, macro_area, kanban_col, archived, category_id)
		 VALUES (?,?,?,?,?,?,?,?)`,
		p.GoalID, p.Title, p.Description, string(p.Status),
		emptyToNil(p.MacroArea), emptyToNil(p.KanbanCol), archived, p.CategoryID,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListProjects(status domain.Status) ([]*domain.Project, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(projSelectCols+` WHERE p.status=? ORDER BY p.created_at DESC`, string(status))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []*domain.Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (s *sqliteStorage) GetProject(id int64) (*domain.Project, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(projSelectCols+` WHERE p.id=?`, id)
	return scanProject(row)
}

func (s *sqliteStorage) UpdateProject(p *domain.Project) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	archived := 0
	if p.Archived {
		archived = 1
	}
	var contentJSON interface{}
	if p.ContentJSON != "" {
		contentJSON = p.ContentJSON
	}
	_, err := s.db.Exec(
		`UPDATE projects SET goal_id=?, title=?, description=?, status=?,
		  macro_area=?, kanban_col=?, archived=?, category_id=?,
		  start_date=?, due_date=?, content_json=COALESCE(?,content_json)
		 WHERE id=?`,
		p.GoalID, p.Title, p.Description, string(p.Status),
		emptyToNil(p.MacroArea), emptyToNil(p.KanbanCol), archived, p.CategoryID,
		nullTime(p.StartDate), nullTime(p.DueDate),
		contentJSON, p.ID,
	)
	return err
}

func (s *sqliteStorage) DeleteProject(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM projects WHERE id=?`, id)
	return err
}

const projSelectCols = `
SELECT p.id, p.goal_id, p.title, COALESCE(p.description,''), p.status, p.created_at,
       COALESCE(g.title,'') AS goal_title,
       COALESCE(p.macro_area,''), COALESCE(p.kanban_col,''), p.archived,
       p.category_id, COALESCE(c.name,'') AS category_name,
       p.start_date, p.due_date, COALESCE(p.content_json,'')
FROM projects p
LEFT JOIN goals g      ON p.goal_id     = g.id
LEFT JOIN categories c ON p.category_id = c.id`

// ── Sprints ───────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateSprint(sp *domain.Sprint) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var projID interface{}
	if sp.ProjectID != 0 {
		projID = sp.ProjectID
	}
	res, err := s.db.Exec(
		`INSERT INTO sprints (project_id, title, goal, start_date, end_date, status, story_points)
		 VALUES (?,?,?,?,?,?,?)`,
		projID, sp.Title, sp.Goal,
		nullTime(sp.StartDate), nullTime(sp.EndDate), string(sp.Status), sp.StoryPoints,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) GetSprint(id int64) (*domain.Sprint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at, story_points, COALESCE(content_json,'')
		 FROM sprints WHERE id=?`, id)
	return scanSprint(row)
}

func (s *sqliteStorage) ListSprints(projectID int64) ([]*domain.Sprint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at, story_points, COALESCE(content_json,'')
		 FROM sprints WHERE project_id=? ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sprints []*domain.Sprint
	for rows.Next() {
		sp, err := scanSprint(rows)
		if err != nil {
			return nil, err
		}
		sprints = append(sprints, sp)
	}
	return sprints, rows.Err()
}

func (s *sqliteStorage) GetActiveSprint(projectID int64) (*domain.Sprint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at, story_points, COALESCE(content_json,'')
		 FROM sprints WHERE project_id=? AND status='active' LIMIT 1`, projectID)
	return scanSprint(row)
}

func (s *sqliteStorage) UpdateSprintStatus(id int64, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE sprints SET status=? WHERE id=?`, status, id)
	return err
}

func (s *sqliteStorage) UpdateSprintStoryPoints(id int64, pts *int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE sprints SET story_points=? WHERE id=?`, pts, id)
	return err
}

// ── Notes ─────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateNote(n *domain.Note) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	archived := 0
	if n.Archived {
		archived = 1
	}
	res, err := s.db.Exec(
		`INSERT INTO notes (title, file_path, goal_id, task_id, project_id, category_id, archived, note_date)
		 VALUES (?,?,?,?,?,?,?,?)`,
		n.Title, n.FilePath, n.GoalID, n.TaskID, n.ProjectID, n.CategoryID, archived, n.NoteDate,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) GetNote(id int64) (*domain.Note, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(noteSelectCols+` WHERE n.id=?`, id)
	return scanNote(row)
}

func (s *sqliteStorage) ListNotes(goalID, taskID, projectID *int64) ([]*domain.Note, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q := noteSelectCols + ` WHERE 1=1`
	args := []any{}
	if goalID != nil {
		q += ` AND n.goal_id=?`
		args = append(args, *goalID)
	}
	if taskID != nil {
		q += ` AND n.task_id=?`
		args = append(args, *taskID)
	}
	if projectID != nil {
		q += ` AND n.project_id=?`
		args = append(args, *projectID)
	}
	q += ` ORDER BY n.created_at DESC`
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var notes []*domain.Note
	for rows.Next() {
		n, err := scanNote(rows)
		if err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

func (s *sqliteStorage) UpdateNote(n *domain.Note) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	archived := 0
	if n.Archived {
		archived = 1
	}
	var contentJSON interface{}
	if n.ContentJSON != "" {
		contentJSON = n.ContentJSON
	}
	_, err := s.db.Exec(
		`UPDATE notes SET title=?, file_path=?, goal_id=?, task_id=?, project_id=?,
		  category_id=?, archived=?, note_date=?, content_json=COALESCE(?,content_json),
		  updated_at=datetime('now')
		 WHERE id=?`,
		n.Title, n.FilePath, n.GoalID, n.TaskID, n.ProjectID, n.CategoryID, archived, n.NoteDate,
		contentJSON, n.ID,
	)
	return err
}

func (s *sqliteStorage) DeleteNote(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM notes WHERE id=?`, id)
	return err
}

const noteSelectCols = `
SELECT n.id, COALESCE(n.title,''), n.file_path, n.goal_id, n.task_id, n.project_id, n.created_at, n.updated_at,
       n.category_id, COALESCE(c.name,'') AS category_name,
       n.archived, n.note_date, COALESCE(n.body,''), COALESCE(n.content_json,'')
FROM notes n
LEFT JOIN categories c ON n.category_id = c.id`

// ── Categories ────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateCategory(c *domain.Category) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(`INSERT INTO categories (name, color) VALUES (?,?)`, c.Name, c.Color)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListCategories() ([]*domain.Category, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(`SELECT id, name, color FROM categories ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cats []*domain.Category
	for rows.Next() {
		c := &domain.Category{}
		if err := rows.Scan(&c.ID, &c.Name, &c.Color); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (s *sqliteStorage) UpdateCategory(c *domain.Category) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE categories SET name=?, color=? WHERE id=?`, c.Name, c.Color, c.ID)
	return err
}

func (s *sqliteStorage) DeleteCategory(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM categories WHERE id=?`, id)
	return err
}

// ── Tags ──────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateTag(t *domain.Tag) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(`INSERT INTO tags (name, color) VALUES (?,?)`, t.Name, t.Color)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListTags() ([]*domain.Tag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(`SELECT id, name, color FROM tags ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []*domain.Tag
	for rows.Next() {
		t := &domain.Tag{}
		if err := rows.Scan(&t.ID, &t.Name, &t.Color); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func (s *sqliteStorage) UpdateTag(t *domain.Tag) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE tags SET name=?, color=? WHERE id=?`, t.Name, t.Color, t.ID)
	return err
}

func (s *sqliteStorage) DeleteTag(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM tags WHERE id=?`, id)
	return err
}

func (s *sqliteStorage) SetEntityTags(entityType string, entityID int64, tagIDs []int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.Exec(
		`DELETE FROM entity_tags WHERE entity_type=? AND entity_id=?`,
		entityType, entityID,
	); err != nil {
		return err
	}
	for _, tid := range tagIDs {
		if _, err := tx.Exec(
			`INSERT OR IGNORE INTO entity_tags (tag_id, entity_type, entity_id) VALUES (?,?,?)`,
			tid, entityType, entityID,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *sqliteStorage) GetEntityTags(entityType string, entityID int64) ([]domain.Tag, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT t.id, t.name, t.color
		 FROM tags t
		 JOIN entity_tags et ON et.tag_id = t.id
		 WHERE et.entity_type=? AND et.entity_id=?
		 ORDER BY t.name ASC`,
		entityType, entityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []domain.Tag
	for rows.Next() {
		var t domain.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Color); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// ── Properties ────────────────────────────────────────────────────────────────

func (s *sqliteStorage) SetProperty(entityType string, entityID int64, key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`INSERT INTO entity_properties (entity_type, entity_id, key, value)
		 VALUES (?,?,?,?)
		 ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value`,
		entityType, entityID, key, value,
	)
	return err
}

func (s *sqliteStorage) DeleteProperty(entityType string, entityID int64, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`DELETE FROM entity_properties WHERE entity_type=? AND entity_id=? AND key=?`,
		entityType, entityID, key,
	)
	return err
}

// DeletePropertyKey removes a custom property key from ALL records of an entity type.
func (s *sqliteStorage) DeletePropertyKey(entityType, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`DELETE FROM entity_properties WHERE entity_type=? AND key=?`,
		entityType, key,
	)
	return err
}

func (s *sqliteStorage) ListProperties(entityType string, entityID int64) (map[string]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT key, value FROM entity_properties WHERE entity_type=? AND entity_id=? ORDER BY created_at ASC`,
		entityType, entityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	props := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		props[k] = v
	}
	return props, rows.Err()
}

// scanner abstracts *sql.Row and *sql.Rows so scan functions serve both.
type scanner interface {
	Scan(dest ...any) error
}

func scanTask(sc scanner) (*domain.Task, error) {
	t := &domain.Task{}
	var (
		createdAt, updatedAt  string
		startDate             sql.NullString
		dueDate               sql.NullString
		focusBlock            sql.NullString
		focusBlockStart       sql.NullString
		status, priority      string
		recurInterval         sql.NullInt64
		recurUnit             sql.NullString
		storyPoints           sql.NullInt64
		pomodorosPlanned      sql.NullInt64
		pomodorosFinished     sql.NullInt64
		categoryID            sql.NullInt64
		goalID                sql.NullInt64
		pomodoro              int
		contentJSON           string
	)
	err := sc.Scan(
		&t.ID, &goalID, &t.ProjectID, &t.SprintID, &t.ParentTaskID,
		&t.Title, &t.Description, &status, &priority,
		&startDate, &dueDate, &t.EstimatedMin, &t.LoggedMins,
		&createdAt, &updatedAt,
		&t.Category, &categoryID, &focusBlock, &focusBlockStart,
		&recurInterval, &recurUnit, &storyPoints,
		&pomodorosPlanned, &pomodorosFinished,
		&t.CategoryName, &pomodoro, &contentJSON,
	)
	if err != nil {
		return nil, err
	}
	t.Status = domain.Status(status)
	t.Priority = domain.Priority(priority)
	if goalID.Valid {
		t.GoalID = &goalID.Int64
	}
	if startDate.Valid {
		tt, _ := parseTime(startDate.String)
		t.StartDate = &tt
	}
	if dueDate.Valid {
		tt, _ := parseTime(dueDate.String)
		t.DueDate = &tt
	}
	if categoryID.Valid {
		t.CategoryID = &categoryID.Int64
	}
	if focusBlock.Valid {
		t.FocusBlock = &focusBlock.String
	}
	if focusBlockStart.Valid {
		t.FocusBlockStart = &focusBlockStart.String
	}
	if recurInterval.Valid {
		v := int(recurInterval.Int64)
		t.RecurInterval = &v
	}
	if recurUnit.Valid {
		t.RecurUnit = recurUnit.String
	}
	if storyPoints.Valid {
		v := int(storyPoints.Int64)
		t.StoryPoints = &v
	}
	if pomodorosPlanned.Valid {
		v := int(pomodorosPlanned.Int64)
		t.PomodorosPlanned = &v
	}
	if pomodorosFinished.Valid {
		v := int(pomodorosFinished.Int64)
		t.PomodorosFinished = &v
	}
	t.Pomodoro = pomodoro != 0
	t.ContentJSON = contentJSON
	t.CreatedAt, _ = parseTime(createdAt)
	t.UpdatedAt, _ = parseTime(updatedAt)
	return t, nil
}

func scanGoal(sc scanner) (*domain.Goal, error) {
	g := &domain.Goal{}
	var (
		createdAt            string
		startDate, dueDate   sql.NullString
		startVal, curVal, target sql.NullFloat64
		categoryID           sql.NullInt64
		contentJSON          string
	)
	if err := sc.Scan(
		&g.ID, &g.Title, &g.Description, &g.Status, &createdAt,
		&g.Type, &g.Year, &startDate, &dueDate, &startVal, &curVal, &target,
		&categoryID, &g.CategoryName, &contentJSON,
	); err != nil {
		return nil, err
	}
	g.CreatedAt, _ = parseTime(createdAt)
	if startDate.Valid {
		g.StartDate = &startDate.String
	}
	if dueDate.Valid {
		g.DueDate = &dueDate.String
	}
	if startVal.Valid {
		g.StartValue = &startVal.Float64
	}
	if curVal.Valid {
		g.CurrentValue = &curVal.Float64
	}
	if target.Valid {
		g.Target = &target.Float64
	}
	if categoryID.Valid {
		g.CategoryID = &categoryID.Int64
	}
	g.ContentJSON = contentJSON
	return g, nil
}

func scanProject(sc scanner) (*domain.Project, error) {
	p := &domain.Project{}
	var (
		createdAt   string
		archived    int
		categoryID  sql.NullInt64
		startDate   sql.NullString
		dueDate     sql.NullString
		contentJSON string
	)
	if err := sc.Scan(
		&p.ID, &p.GoalID, &p.Title, &p.Description, &p.Status, &createdAt,
		&p.GoalTitle, &p.MacroArea, &p.KanbanCol, &archived,
		&categoryID, &p.CategoryName, &startDate, &dueDate, &contentJSON,
	); err != nil {
		return nil, err
	}
	p.CreatedAt, _ = parseTime(createdAt)
	p.Archived = archived == 1
	if categoryID.Valid {
		p.CategoryID = &categoryID.Int64
	}
	if startDate.Valid && startDate.String != "" {
		if t, err := time.Parse("2006-01-02", startDate.String[:10]); err == nil {
			p.StartDate = &t
		}
	}
	if dueDate.Valid && dueDate.String != "" {
		if t, err := time.Parse("2006-01-02", dueDate.String[:10]); err == nil {
			p.DueDate = &t
		}
	}
	p.ContentJSON = contentJSON
	return p, nil
}

func scanNote(sc scanner) (*domain.Note, error) {
	n := &domain.Note{}
	var (
		createdAt, updatedAt string
		archived             int
		filePath             sql.NullString
		goalID               sql.NullInt64
		taskID               sql.NullInt64
		projectID            sql.NullInt64
		categoryID           sql.NullInt64
		dbBody               string
		contentJSON          string
	)
	if err := sc.Scan(
		&n.ID, &n.Title, &filePath, &goalID, &taskID, &projectID,
		&createdAt, &updatedAt,
		&categoryID, &n.CategoryName,
		&archived, &n.NoteDate, &dbBody, &contentJSON,
	); err != nil {
		return nil, err
	}
	n.CreatedAt, _ = parseTime(createdAt)
	n.UpdatedAt, _ = parseTime(updatedAt)
	n.Archived = archived == 1
	if filePath.Valid {
		n.FilePath = &filePath.String
	}
	// Use inline body from DB as fallback (for notes created before vault migration)
	if dbBody != "" {
		n.Body = dbBody
	}
	if goalID.Valid {
		n.GoalID = &goalID.Int64
	}
	if taskID.Valid {
		n.TaskID = &taskID.Int64
	}
	if projectID.Valid {
		n.ProjectID = &projectID.Int64
	}
	if categoryID.Valid {
		n.CategoryID = &categoryID.Int64
	}
	n.ContentJSON = contentJSON
	return n, nil
}

func scanSprint(sc scanner) (*domain.Sprint, error) {
	sp := &domain.Sprint{}
	var createdAt, status string
	var projectID sql.NullInt64
	var startDate, endDate sql.NullString
	var storyPoints sql.NullInt64
	var contentJSON string
	err := sc.Scan(&sp.ID, &projectID, &sp.Title, &sp.Goal,
		&startDate, &endDate, &status, &createdAt, &storyPoints, &contentJSON)
	if projectID.Valid {
		sp.ProjectID = projectID.Int64
	}
	if err != nil {
		return nil, err
	}
	sp.Status = domain.Status(status)
	if startDate.Valid {
		t, _ := parseTime(startDate.String)
		sp.StartDate = &t
	}
	if endDate.Valid {
		t, _ := parseTime(endDate.String)
		sp.EndDate = &t
	}
	if storyPoints.Valid {
		v := int(storyPoints.Int64)
		sp.StoryPoints = &v
	}
	sp.ContentJSON = contentJSON
	sp.CreatedAt, _ = parseTime(createdAt)
	return sp, nil
}

// ── Time helpers ──────────────────────────────────────────────────────────────

var timeFormats = []string{
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05Z",
	"2006-01-02",
}

func parseTime(s string) (time.Time, error) {
	for _, f := range timeFormats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("cannot parse time %q", s)
}

func nullTime(t *time.Time) any {
	if t == nil {
		return nil
	}
	return t.Format("2006-01-02")
}

func emptyToNil(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// ── Comments ──────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateComment(c *domain.Comment) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO comments (entity_type, entity_id, author, body, created_at)
		 VALUES (?, ?, ?, ?, datetime('now'))`,
		c.EntityType, c.EntityID, c.Author, c.Body,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListComments(entityType string, entityID int64) ([]*domain.Comment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, entity_type, entity_id, author, body, created_at
		 FROM comments WHERE entity_type=? AND entity_id=? ORDER BY created_at ASC`,
		entityType, entityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var comments []*domain.Comment
	for rows.Next() {
		c := &domain.Comment{}
		var createdAt string
		if err := rows.Scan(&c.ID, &c.EntityType, &c.EntityID, &c.Author, &c.Body, &createdAt); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = parseTime(createdAt)
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func (s *sqliteStorage) CountComments(entityType string, entityID int64) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var n int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM comments WHERE entity_type=? AND entity_id=?`,
		entityType, entityID,
	).Scan(&n)
	return n, err
}

func (s *sqliteStorage) GetEntityChildren(parentType string, parentID int64) ([]*domain.EntityChild, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, child_entity_type, child_entity_id, position FROM entity_children
		 WHERE parent_entity_type=? AND parent_entity_id=? ORDER BY position, id`,
		parentType, parentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var children []*domain.EntityChild
	for rows.Next() {
		c := &domain.EntityChild{ParentEntityType: parentType, ParentEntityID: parentID}
		if err := rows.Scan(&c.ID, &c.ChildEntityType, &c.ChildEntityID, &c.Position); err != nil {
			return nil, err
		}
		children = append(children, c)
	}
	return children, rows.Err()
}

func (s *sqliteStorage) AddEntityChild(parentType string, parentID int64, childType string, childID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO entity_children(parent_entity_type, parent_entity_id, child_entity_type, child_entity_id)
		 VALUES(?,?,?,?)`,
		parentType, parentID, childType, childID,
	)
	return err
}

func (s *sqliteStorage) RemoveEntityChild(parentType string, parentID int64, childType string, childID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`DELETE FROM entity_children WHERE parent_entity_type=? AND parent_entity_id=? AND child_entity_type=? AND child_entity_id=?`,
		parentType, parentID, childType, childID,
	)
	return err
}

// normalizeRelPair returns the pair sorted so type_a:id_a <= type_b:id_b.
func normalizeRelPair(ta string, ia int64, tb string, ib int64) (string, int64, string, int64) {
	keyA := fmt.Sprintf("%s:%d", ta, ia)
	keyB := fmt.Sprintf("%s:%d", tb, ib)
	if keyA <= keyB {
		return ta, ia, tb, ib
	}
	return tb, ib, ta, ia
}

func (s *sqliteStorage) GetEntityRelations(entityType string, entityID int64) ([]*domain.EntityRelation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id,
		        CASE WHEN type_a=? AND id_a=? THEN type_b ELSE type_a END,
		        CASE WHEN type_a=? AND id_a=? THEN id_b   ELSE id_a  END
		 FROM entity_relations
		 WHERE (type_a=? AND id_a=?) OR (type_b=? AND id_b=?)
		 ORDER BY id`,
		entityType, entityID, entityType, entityID,
		entityType, entityID, entityType, entityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var rels []*domain.EntityRelation
	for rows.Next() {
		r := &domain.EntityRelation{}
		if err := rows.Scan(&r.ID, &r.RelatedType, &r.RelatedID); err != nil {
			return nil, err
		}
		rels = append(rels, r)
	}
	return rels, rows.Err()
}

func (s *sqliteStorage) AddEntityRelation(typeA string, idA int64, typeB string, idB int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	ta, ia, tb, ib := normalizeRelPair(typeA, idA, typeB, idB)
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO entity_relations(type_a, id_a, type_b, id_b) VALUES(?,?,?,?)`,
		ta, ia, tb, ib,
	)
	return err
}

func (s *sqliteStorage) RemoveEntityRelation(typeA string, idA int64, typeB string, idB int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	ta, ia, tb, ib := normalizeRelPair(typeA, idA, typeB, idB)
	_, err := s.db.Exec(
		`DELETE FROM entity_relations WHERE type_a=? AND id_a=? AND type_b=? AND id_b=?`,
		ta, ia, tb, ib,
	)
	return err
}

func (s *sqliteStorage) ListResourcesByTask(taskID int64) ([]*domain.ResourceLink, error) {
	rows, err := s.db.Query(
		`SELECT id, title, COALESCE(url,'') FROM resources WHERE task_id=? ORDER BY created_at DESC`,
		taskID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.ResourceLink
	for rows.Next() {
		r := &domain.ResourceLink{}
		if err := rows.Scan(&r.ID, &r.Title, &r.URL); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ── Automations ───────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateAutomation(a *domain.Automation) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	tl := a.TriggerLogic
	if tl == "" {
		tl = "all"
	}
	res, err := s.db.Exec(
		`INSERT INTO automations (name, description, entity_type, enabled, trigger_logic, trigger_type, trigger_config, action_type, action_config)
		 VALUES (?,?,?,?,?,?,?,?,?)`,
		a.Name, a.Description, a.EntityType, boolToInt(a.Enabled),
		tl, a.TriggerType, a.TriggerConfig, a.ActionType, a.ActionConfig,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) GetAutomation(id int64) (*domain.Automation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(
		`SELECT id, name, description, entity_type, enabled, trigger_logic, trigger_type, trigger_config, action_type, action_config, created_at, updated_at
		 FROM automations WHERE id = ?`, id)
	return scanAutomation(row)
}

func (s *sqliteStorage) ListAutomations(entityType string) ([]*domain.Automation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q := `SELECT id, name, description, entity_type, enabled, trigger_logic, trigger_type, trigger_config, action_type, action_config, created_at, updated_at
	      FROM automations`
	var args []any
	if entityType != "" {
		q += ` WHERE entity_type = ?`
		args = append(args, entityType)
	}
	q += ` ORDER BY id ASC`
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Automation
	for rows.Next() {
		a, err := scanAutomation(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *sqliteStorage) UpdateAutomation(a *domain.Automation) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tl := a.TriggerLogic
	if tl == "" {
		tl = "all"
	}
	_, err := s.db.Exec(
		`UPDATE automations SET name=?, description=?, entity_type=?, enabled=?, trigger_logic=?, trigger_type=?, trigger_config=?, action_type=?, action_config=?, updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`,
		a.Name, a.Description, a.EntityType, boolToInt(a.Enabled),
		tl, a.TriggerType, a.TriggerConfig, a.ActionType, a.ActionConfig, a.ID,
	)
	return err
}

func (s *sqliteStorage) DeleteAutomation(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM automations WHERE id=?`, id)
	return err
}

type automationScanner interface {
	Scan(dest ...any) error
}

func scanAutomation(row automationScanner) (*domain.Automation, error) {
	a := &domain.Automation{}
	var enabled int
	err := row.Scan(&a.ID, &a.Name, &a.Description, &a.EntityType, &enabled,
		&a.TriggerLogic, &a.TriggerType, &a.TriggerConfig, &a.ActionType, &a.ActionConfig,
		&a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	a.Enabled = enabled != 0
	return a, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// ── Custom Entity Types ────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateCustomEntityType(t *domain.CustomEntityType) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO custom_entity_types (name, display_name, icon, prop_defs) VALUES (?,?,?,?)`,
		t.Name, t.DisplayName, t.Icon, t.PropDefs,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListCustomEntityTypes() ([]*domain.CustomEntityType, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, name, display_name, icon, prop_defs, created_at FROM custom_entity_types ORDER BY id ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.CustomEntityType
	for rows.Next() {
		t := &domain.CustomEntityType{}
		if err := rows.Scan(&t.ID, &t.Name, &t.DisplayName, &t.Icon, &t.PropDefs, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *sqliteStorage) UpdateCustomEntityType(t *domain.CustomEntityType) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`UPDATE custom_entity_types SET display_name=?, icon=?, prop_defs=? WHERE name=?`,
		t.DisplayName, t.Icon, t.PropDefs, t.Name,
	)
	return err
}

func (s *sqliteStorage) DeleteCustomEntityType(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM custom_entity_types WHERE name=?`, name)
	return err
}

// ── Custom Entities ────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateCustomEntity(e *domain.CustomEntity) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO custom_entities (type_name, title) VALUES (?,?)`,
		e.TypeName, e.Title,
	)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	// Save props via entity_properties
	for k, v := range e.Props {
		_, perr := s.db.Exec(
			`INSERT INTO entity_properties (entity_type, entity_id, key, value)
			 VALUES (?,?,?,?)
			 ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value`,
			e.TypeName, id, k, v,
		)
		if perr != nil {
			return id, perr
		}
	}
	return id, nil
}

func (s *sqliteStorage) GetCustomEntity(typeName string, id int64) (*domain.CustomEntity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(
		`SELECT id, type_name, title, created_at, updated_at FROM custom_entities WHERE type_name=? AND id=?`,
		typeName, id,
	)
	e := &domain.CustomEntity{}
	if err := row.Scan(&e.ID, &e.TypeName, &e.Title, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return nil, err
	}
	// Load props
	props, err := s.listPropsNoLock(typeName, id)
	if err != nil {
		return nil, err
	}
	e.Props = props
	return e, nil
}

func (s *sqliteStorage) ListCustomEntities(typeName string) ([]*domain.CustomEntity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Collect entities first, then load all props in one pass to avoid nested
	// queries on the same connection (MaxOpenConns=1 would deadlock otherwise).
	rows, err := s.db.Query(
		`SELECT id, type_name, title, created_at, updated_at FROM custom_entities WHERE type_name=? ORDER BY id ASC`,
		typeName,
	)
	if err != nil {
		return nil, err
	}
	var out []*domain.CustomEntity
	for rows.Next() {
		e := &domain.CustomEntity{Props: map[string]string{}}
		if err := rows.Scan(&e.ID, &e.TypeName, &e.Title, &e.CreatedAt, &e.UpdatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close() // release connection before loading props

	// Load all props for this type in one query, then distribute to entities.
	propRows, err := s.db.Query(
		`SELECT entity_id, key, value FROM entity_properties WHERE entity_type=? ORDER BY entity_id ASC`,
		typeName,
	)
	if err != nil {
		return out, nil // props unavailable; return entities without props
	}
	defer propRows.Close()
	for propRows.Next() {
		var eid int64
		var k, v string
		if err := propRows.Scan(&eid, &k, &v); err != nil {
			continue
		}
		for _, e := range out {
			if e.ID == eid {
				e.Props[k] = v
				break
			}
		}
	}
	return out, propRows.Err()
}

func (s *sqliteStorage) UpdateCustomEntity(e *domain.CustomEntity) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`UPDATE custom_entities SET title=?, updated_at=CURRENT_TIMESTAMP WHERE type_name=? AND id=?`,
		e.Title, e.TypeName, e.ID,
	)
	if err != nil {
		return err
	}
	// Replace props
	if _, err := s.db.Exec(
		`DELETE FROM entity_properties WHERE entity_type=? AND entity_id=?`,
		e.TypeName, e.ID,
	); err != nil {
		return err
	}
	for k, v := range e.Props {
		if _, perr := s.db.Exec(
			`INSERT INTO entity_properties (entity_type, entity_id, key, value)
			 VALUES (?,?,?,?)
			 ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value`,
			e.TypeName, e.ID, k, v,
		); perr != nil {
			return perr
		}
	}
	return nil
}

func (s *sqliteStorage) DeleteCustomEntity(typeName string, id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Remove associated entity_properties first
	if _, err := s.db.Exec(`DELETE FROM entity_properties WHERE entity_type=? AND entity_id=?`, typeName, id); err != nil {
		return err
	}
	_, err := s.db.Exec(`DELETE FROM custom_entities WHERE type_name=? AND id=?`, typeName, id)
	return err
}

// listPropsNoLock queries entity_properties without acquiring the lock (caller must hold it).
func (s *sqliteStorage) listPropsNoLock(entityType string, entityID int64) (map[string]string, error) {
	rows, err := s.db.Query(
		`SELECT key, value FROM entity_properties WHERE entity_type=? AND entity_id=?`,
		entityType, entityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		m[k] = v
	}
	return m, rows.Err()
}

func (s *sqliteStorage) PurgeAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Delete in dependency order (children before parents) to avoid FK issues.
	tables := []string{
		"entity_tags", "entity_properties", "entity_children", "entity_relations",
		"comments", "automations", "pomodoro_sessions",
		"habits", "notes", "resources",
		"tasks", "sprints", "projects", "goals",
		"tags", "categories",
		"custom_entities", "custom_entity_types",
	}
	for _, t := range tables {
		if _, err := s.db.Exec("DELETE FROM " + t); err != nil { //nolint:gosec — table name is a hardcoded string literal
			if !strings.Contains(err.Error(), "no such table") {
				return fmt.Errorf("purge %s: %w", t, err)
			}
		}
	}
	// Best-effort: reset AUTOINCREMENT counters so IDs restart from 1.
	// sqlite_sequence only exists after the first AUTOINCREMENT insert,
	// so ignore "no such table" errors.
	s.db.Exec("DELETE FROM sqlite_sequence") //nolint:errcheck
	return nil
}
