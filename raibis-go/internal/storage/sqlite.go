package storage

import (
	"database/sql"
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"

	"github.com/raibis/raibis-go/internal/domain"
)

//go:embed schema.sql
var schemaSQL string

type sqliteStorage struct {
	db  *sql.DB
	mu  sync.RWMutex
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
	return &sqliteStorage{db: db}, nil
}

func (s *sqliteStorage) Close() error { return s.db.Close() }

// ── Tasks ─────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateTask(t *domain.Task) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO tasks
		    (project_id, sprint_id, parent_task_id, title, description,
		     status, priority, due_date, estimated_mins, logged_mins)
		 VALUES (?,?,?,?,?,?,?,?,?,?)`,
		t.ProjectID, t.SprintID, t.ParentTaskID,
		t.Title, t.Description,
		string(t.Status), string(t.Priority),
		nullTime(t.DueDate), t.EstimatedMin, t.LoggedMins,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) GetTask(id int64) (*domain.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(`SELECT id, project_id, sprint_id, parent_task_id,
	    title, description, status, priority, due_date, estimated_mins,
	    logged_mins, created_at, updated_at FROM tasks WHERE id = ?`, id)
	return scanTask(row)
}

func (s *sqliteStorage) ListTasks(f domain.TaskFilter) ([]*domain.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	q := `SELECT id, project_id, sprint_id, parent_task_id,
	    title, description, status, priority, due_date, estimated_mins,
	    logged_mins, created_at, updated_at FROM tasks WHERE 1=1`
	args := []any{}

	if f.ProjectID != nil {
		q += ` AND project_id = ?`
		args = append(args, *f.ProjectID)
	}
	if f.SprintID != nil {
		q += ` AND sprint_id = ?`
		args = append(args, *f.SprintID)
	}
	if f.Status != nil {
		q += ` AND status = ?`
		args = append(args, string(*f.Status))
	}
	if f.TopLevelOnly {
		q += ` AND parent_task_id IS NULL`
	}
	q += ` ORDER BY
	    CASE priority
	        WHEN 'urgent' THEN 0
	        WHEN 'high'   THEN 1
	        WHEN 'medium' THEN 2
	        WHEN 'low'    THEN 3
	        ELSE 2
	    END,
	    COALESCE(due_date, '9999-12-31') ASC`

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
		    project_id=?, sprint_id=?, parent_task_id=?,
		    title=?, description=?, status=?, priority=?,
		    due_date=?, estimated_mins=?, logged_mins=?,
		    updated_at=datetime('now')
		 WHERE id=?`,
		t.ProjectID, t.SprintID, t.ParentTaskID,
		t.Title, t.Description,
		string(t.Status), string(t.Priority),
		nullTime(t.DueDate), t.EstimatedMin, t.LoggedMins,
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

// ── Goals ─────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateGoal(g *domain.Goal) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO goals (title, description, status) VALUES (?,?,?)`,
		g.Title, g.Description, string(g.Status),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListGoals(status domain.Status) ([]*domain.Goal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, title, description, status, created_at FROM goals
		 WHERE status=? ORDER BY created_at DESC`,
		string(status),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var goals []*domain.Goal
	for rows.Next() {
		g := &domain.Goal{}
		var createdAt string
		if err := rows.Scan(&g.ID, &g.Title, &g.Description, &g.Status, &createdAt); err != nil {
			return nil, err
		}
		g.CreatedAt, _ = parseTime(createdAt)
		goals = append(goals, g)
	}
	return goals, rows.Err()
}

func (s *sqliteStorage) GetGoal(id int64) (*domain.Goal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(
		`SELECT id, title, description, status, created_at FROM goals WHERE id=?`, id)
	g := &domain.Goal{}
	var createdAt string
	if err := row.Scan(&g.ID, &g.Title, &g.Description, &g.Status, &createdAt); err != nil {
		return nil, err
	}
	g.CreatedAt, _ = parseTime(createdAt)
	return g, nil
}

// ── Projects ──────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateProject(p *domain.Project) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO projects (goal_id, title, description, status) VALUES (?,?,?,?)`,
		p.GoalID, p.Title, p.Description, string(p.Status),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) ListProjects(status domain.Status) ([]*domain.Project, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT p.id, p.goal_id, p.title, p.description, p.status, p.created_at,
		        COALESCE(g.title,'') AS goal_title
		 FROM projects p
		 LEFT JOIN goals g ON p.goal_id = g.id
		 WHERE p.status=? ORDER BY p.created_at DESC`,
		string(status),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []*domain.Project
	for rows.Next() {
		p := &domain.Project{}
		var createdAt string
		if err := rows.Scan(&p.ID, &p.GoalID, &p.Title, &p.Description,
			&p.Status, &createdAt, &p.GoalTitle); err != nil {
			return nil, err
		}
		p.CreatedAt, _ = parseTime(createdAt)
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (s *sqliteStorage) GetProject(id int64) (*domain.Project, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	row := s.db.QueryRow(
		`SELECT p.id, p.goal_id, p.title, p.description, p.status, p.created_at,
		        COALESCE(g.title,'') AS goal_title
		 FROM projects p LEFT JOIN goals g ON p.goal_id = g.id
		 WHERE p.id=?`, id)
	p := &domain.Project{}
	var createdAt string
	if err := row.Scan(&p.ID, &p.GoalID, &p.Title, &p.Description,
		&p.Status, &createdAt, &p.GoalTitle); err != nil {
		return nil, err
	}
	p.CreatedAt, _ = parseTime(createdAt)
	return p, nil
}

// ── Sprints ───────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreateSprint(sp *domain.Sprint) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO sprints (project_id, title, goal, start_date, end_date, status)
		 VALUES (?,?,?,?,?,?)`,
		sp.ProjectID, sp.Title, sp.Goal,
		nullTime(sp.StartDate), nullTime(sp.EndDate), string(sp.Status),
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
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at
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
		`SELECT id, project_id, title, COALESCE(goal,''), start_date, end_date, status, created_at
		 FROM sprints WHERE project_id=? AND status='active' LIMIT 1`, projectID)
	return scanSprint(row)
}

// ── Scan helpers ──────────────────────────────────────────────────────────────

// scanner abstracts *sql.Row and *sql.Rows so scan functions serve both.
type scanner interface {
	Scan(dest ...any) error
}

func scanTask(sc scanner) (*domain.Task, error) {
	t := &domain.Task{}
	var (
		createdAt, updatedAt string
		dueDate              sql.NullString
		status, priority     string
	)
	err := sc.Scan(
		&t.ID, &t.ProjectID, &t.SprintID, &t.ParentTaskID,
		&t.Title, &t.Description, &status, &priority,
		&dueDate, &t.EstimatedMin, &t.LoggedMins,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	t.Status = domain.Status(status)
	t.Priority = domain.Priority(priority)
	if dueDate.Valid {
		tt, _ := parseTime(dueDate.String)
		t.DueDate = &tt
	}
	t.CreatedAt, _ = parseTime(createdAt)
	t.UpdatedAt, _ = parseTime(updatedAt)
	return t, nil
}

func scanSprint(sc scanner) (*domain.Sprint, error) {
	sp := &domain.Sprint{}
	var createdAt, status string
	var startDate, endDate sql.NullString
	err := sc.Scan(&sp.ID, &sp.ProjectID, &sp.Title, &sp.Goal,
		&startDate, &endDate, &status, &createdAt)
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
