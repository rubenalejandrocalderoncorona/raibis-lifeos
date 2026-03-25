package domain

import "time"

// Task is the core work item entity.
type Task struct {
	ID           int64      `json:"id"`
	ProjectID    *int64     `json:"project_id"`
	SprintID     *int64     `json:"sprint_id"`
	ParentTaskID *int64     `json:"parent_task_id"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Status       Status     `json:"status"`
	Priority     Priority   `json:"priority"`
	DueDate      *time.Time `json:"due_date"`
	EstimatedMin *int       `json:"estimated_mins"`
	LoggedMins   int        `json:"logged_mins"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// TaskFilter holds optional criteria for ListTasks.
// Nil pointers mean "no filter on this field".
type TaskFilter struct {
	ProjectID    *int64
	SprintID     *int64
	Status       *Status
	TopLevelOnly bool // WHERE parent_task_id IS NULL
}
