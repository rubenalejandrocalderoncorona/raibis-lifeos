package storage

import "github.com/raibis/raibis-go/internal/domain"

// Storage is the single persistence interface.
// Neither the TUI nor the HTTP server touch SQL directly — they go through this.
type Storage interface {
	// ── Tasks ────────────────────────────────────────────────────────────────
	CreateTask(t *domain.Task) (int64, error)
	GetTask(id int64) (*domain.Task, error)
	ListTasks(f domain.TaskFilter) ([]*domain.Task, error)
	UpdateTask(t *domain.Task) error
	DeleteTask(id int64) error

	// ── Goals ────────────────────────────────────────────────────────────────
	CreateGoal(g *domain.Goal) (int64, error)
	ListGoals(status domain.Status) ([]*domain.Goal, error)
	GetGoal(id int64) (*domain.Goal, error)

	// ── Projects ─────────────────────────────────────────────────────────────
	CreateProject(p *domain.Project) (int64, error)
	ListProjects(status domain.Status) ([]*domain.Project, error)
	GetProject(id int64) (*domain.Project, error)

	// ── Sprints ──────────────────────────────────────────────────────────────
	CreateSprint(s *domain.Sprint) (int64, error)
	ListSprints(projectID int64) ([]*domain.Sprint, error)
	GetActiveSprint(projectID int64) (*domain.Sprint, error)

	// Close releases the database connection.
	Close() error
}
