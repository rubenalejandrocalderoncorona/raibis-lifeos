package service

import "github.com/raibis/raibis-go/internal/domain"

// TaskService is the application-layer interface.
// The TUI and HTTP server talk to this; they never access storage directly.
type TaskService interface {
	// Tasks
	Create(t *domain.Task) (*domain.Task, error)
	Get(id int64) (*domain.Task, error)
	List(f domain.TaskFilter) ([]*domain.Task, error)
	Update(t *domain.Task) error
	Delete(id int64) error

	// QuickCapture parses the mini-syntax string and creates a task.
	// Syntax: "Title #priority @project !YYYY-MM-DD"
	QuickCapture(input string) (*domain.Task, error)

	// Goals / Projects — needed by TUI filters and capture parser
	Goals() ([]*domain.Goal, error)
	Projects() ([]*domain.Project, error)
	CreateGoal(title, desc string) (*domain.Goal, error)
	CreateProject(title string, goalID *int64) (*domain.Project, error)
}
