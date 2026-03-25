package service

import (
	"fmt"

	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/storage"
)

type taskService struct {
	store storage.Storage
}

// New creates a TaskService backed by the given Storage.
func New(store storage.Storage) TaskService {
	return &taskService{store: store}
}

func (s *taskService) Create(t *domain.Task) (*domain.Task, error) {
	if t.Status == "" {
		t.Status = domain.StatusTodo
	}
	if t.Priority == "" {
		t.Priority = domain.PriorityMedium
	}
	id, err := s.store.CreateTask(t)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}
	return s.store.GetTask(id)
}

func (s *taskService) Get(id int64) (*domain.Task, error) {
	return s.store.GetTask(id)
}

func (s *taskService) List(f domain.TaskFilter) ([]*domain.Task, error) {
	return s.store.ListTasks(f)
}

func (s *taskService) Update(t *domain.Task) error {
	return s.store.UpdateTask(t)
}

func (s *taskService) Delete(id int64) error {
	return s.store.DeleteTask(id)
}

func (s *taskService) QuickCapture(input string) (*domain.Task, error) {
	projects, err := s.store.ListProjects(domain.StatusActive)
	if err != nil {
		projects = nil // non-fatal: skip project matching
	}
	t, err := ParseCapture(input, projects)
	if err != nil {
		return nil, err
	}
	return s.Create(t)
}

func (s *taskService) Goals() ([]*domain.Goal, error) {
	return s.store.ListGoals(domain.StatusActive)
}

func (s *taskService) Projects() ([]*domain.Project, error) {
	return s.store.ListProjects(domain.StatusActive)
}

func (s *taskService) CreateGoal(title, desc string) (*domain.Goal, error) {
	g := &domain.Goal{Title: title, Description: desc, Status: domain.StatusActive}
	id, err := s.store.CreateGoal(g)
	if err != nil {
		return nil, err
	}
	return s.store.GetGoal(id)
}

func (s *taskService) CreateProject(title string, goalID *int64) (*domain.Project, error) {
	p := &domain.Project{Title: title, GoalID: goalID, Status: domain.StatusActive}
	id, err := s.store.CreateProject(p)
	if err != nil {
		return nil, err
	}
	return s.store.GetProject(id)
}
