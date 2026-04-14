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
		     story_points, pomodoros_planned, pomodoros_finished)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		t.GoalID, t.ProjectID, t.SprintID, t.ParentTaskID,
		t.Title, t.Description,
		string(t.Status), string(t.Priority),
		nullTime(t.StartDate), nullTime(t.DueDate), t.EstimatedMin, t.LoggedMins,
		t.Category, t.CategoryID, t.FocusBlock, t.FocusBlockStart, t.RecurInterval, t.RecurUnit,
		t.StoryPoints, t.PomodorosPlanned, t.PomodorosFinished,
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
	_, err := s.db.Exec(
		`UPDATE tasks SET
		    goal_id=?, project_id=?, sprint_id=?, parent_task_id=?,
		    title=?, description=?, status=?, priority=?,
		    start_date=?, due_date=?, estimated_mins=?, logged_mins=?,
		    category=?, category_id=?, focus_block=?, focus_block_start=?, recur_interval=?, recur_unit=?,
		    story_points=?, pomodoros_planned=?, pomodoros_finished=?,
		    updated_at=datetime('now')
		 WHERE id=?`,
		t.GoalID, t.ProjectID, t.SprintID, t.ParentTaskID,
		t.Title, t.Description,
		string(t.Status), string(t.Priority),
		nullTime(t.StartDate), nullTime(t.DueDate), t.EstimatedMin, t.LoggedMins,
		t.Category, t.CategoryID, t.FocusBlock, t.FocusBlockStart, t.RecurInterval, t.RecurUnit,
		t.StoryPoints, t.PomodorosPlanned, t.PomodorosFinished,
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
       t.title, t.description, t.status, t.priority, t.start_date, t.due_date,
       t.estimated_mins, t.logged_mins, t.created_at, t.updated_at,
       COALESCE(t.category,''), t.category_id, t.focus_block, t.focus_block_start,
       t.recur_interval, t.recur_unit, t.story_points,
       t.pomodoros_planned, t.pomodoros_finished,
       COALESCE(c.name,'') AS category_name
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
	_, err := s.db.Exec(
		`UPDATE goals SET title=?, description=?, status=?, type=?, year=?,
		  start_date=?, due_date=?, start_value=?, current_value=?, target=?,
		  category_id=?
		 WHERE id=?`,
		g.Title, g.Description, string(g.Status),
		emptyToNil(g.Type), emptyToNil(g.Year),
		g.StartDate, g.DueDate,
		g.StartValue, g.CurrentValue, g.Target, g.CategoryID,
		g.ID,
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
SELECT g.id, g.title, g.description, g.status, g.created_at,
       COALESCE(g.type,''), COALESCE(g.year,''),
       g.start_date, g.due_date, g.start_value, g.current_value, g.target,
       g.category_id, COALESCE(c.name,'') AS category_name
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
	_, err := s.db.Exec(
		`UPDATE projects SET goal_id=?, title=?, description=?, status=?,
		  macro_area=?, kanban_col=?, archived=?, category_id=?,
		  start_date=?, due_date=?
		 WHERE id=?`,
		p.GoalID, p.Title, p.Description, string(p.Status),
		emptyToNil(p.MacroArea), emptyToNil(p.KanbanCol), archived, p.CategoryID,
		nullTime(p.StartDate), nullTime(p.DueDate),
		p.ID,
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
SELECT p.id, p.goal_id, p.title, p.description, p.status, p.created_at,
       COALESCE(g.title,'') AS goal_title,
       COALESCE(p.macro_area,''), COALESCE(p.kanban_col,''), p.archived,
       p.category_id, COALESCE(c.name,'') AS category_name,
       p.start_date, p.due_date
FROM projects p
LEFT JOIN goals g      ON p.goal_id     = g.id
LEFT JOIN categories c ON p.category_id = c.id`

// ── Sprints ───────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateSprint(sp *domain.Sprint) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO sprints (project_id, title, goal, start_date, end_date, status, story_points)
		 VALUES (?,?,?,?,?,?,?)`,
		sp.ProjectID, sp.Title, sp.Goal,
		nullTime(sp.StartDate), nullTime(sp.EndDate), string(sp.Status), sp.StoryPoints,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListSprints(projectID int64) ([]*domain.Sprint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at, story_points
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
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at, story_points
		 FROM sprints WHERE project_id=? AND status='active' LIMIT 1`, projectID)
	return scanSprint(row)
}

func (s *sqliteStorage) UpdateSprintStatus(id int64, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE sprints SET status=? WHERE id=?`, status, id)
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
	_, err := s.db.Exec(
		`UPDATE notes SET title=?, file_path=?, goal_id=?, task_id=?, project_id=?,
		  category_id=?, archived=?, note_date=?, updated_at=datetime('now')
		 WHERE id=?`,
		n.Title, n.FilePath, n.GoalID, n.TaskID, n.ProjectID, n.CategoryID, archived, n.NoteDate, n.ID,
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
SELECT n.id, n.title, n.file_path, n.goal_id, n.task_id, n.project_id, n.created_at, n.updated_at,
       n.category_id, COALESCE(c.name,'') AS category_name,
       n.archived, n.note_date, COALESCE(n.body,'')
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
	)
	err := sc.Scan(
		&t.ID, &goalID, &t.ProjectID, &t.SprintID, &t.ParentTaskID,
		&t.Title, &t.Description, &status, &priority,
		&startDate, &dueDate, &t.EstimatedMin, &t.LoggedMins,
		&createdAt, &updatedAt,
		&t.Category, &categoryID, &focusBlock, &focusBlockStart,
		&recurInterval, &recurUnit, &storyPoints,
		&pomodorosPlanned, &pomodorosFinished,
		&t.CategoryName,
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
	)
	if err := sc.Scan(
		&g.ID, &g.Title, &g.Description, &g.Status, &createdAt,
		&g.Type, &g.Year, &startDate, &dueDate, &startVal, &curVal, &target,
		&categoryID, &g.CategoryName,
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
	return g, nil
}

func scanProject(sc scanner) (*domain.Project, error) {
	p := &domain.Project{}
	var (
		createdAt  string
		archived   int
		categoryID sql.NullInt64
		startDate  sql.NullString
		dueDate    sql.NullString
	)
	if err := sc.Scan(
		&p.ID, &p.GoalID, &p.Title, &p.Description, &p.Status, &createdAt,
		&p.GoalTitle, &p.MacroArea, &p.KanbanCol, &archived,
		&categoryID, &p.CategoryName, &startDate, &dueDate,
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
	)
	if err := sc.Scan(
		&n.ID, &n.Title, &filePath, &goalID, &taskID, &projectID,
		&createdAt, &updatedAt,
		&categoryID, &n.CategoryName,
		&archived, &n.NoteDate, &dbBody,
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
	return n, nil
}

func scanSprint(sc scanner) (*domain.Sprint, error) {
	sp := &domain.Sprint{}
	var createdAt, status string
	var startDate, endDate sql.NullString
	var storyPoints sql.NullInt64
	err := sc.Scan(&sp.ID, &sp.ProjectID, &sp.Title, &sp.Goal,
		&startDate, &endDate, &status, &createdAt, &storyPoints)
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
