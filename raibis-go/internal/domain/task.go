package domain

import "time"

// Task is the core work item entity.
type Task struct {
	ID                 int64      `json:"id"`
	GoalID             *int64     `json:"goal_id,omitempty"`
	ProjectID          *int64     `json:"project_id,omitempty"`
	SprintID           *int64     `json:"sprint_id,omitempty"`
	ParentTaskID       *int64     `json:"parent_task_id,omitempty"`
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Status             Status     `json:"status"`
	Priority           Priority   `json:"priority"`
	StartDate          *time.Time `json:"start_date,omitempty"`
	DueDate            *time.Time `json:"due_date,omitempty"`
	EstimatedMin       *int       `json:"estimated_mins,omitempty"`
	LoggedMins         int        `json:"logged_mins"`
	// Category: legacy text value kept for display; category_id is the FK
	Category           string     `json:"category,omitempty"`
	CategoryID         *int64     `json:"category_id,omitempty"`
	FocusBlock         *string    `json:"focus_block,omitempty"`
	FocusBlockStart    *string    `json:"focus_block_start,omitempty"`
	RecurInterval      *int       `json:"recur_interval,omitempty"`
	RecurUnit          string     `json:"recur_unit,omitempty"`
	StoryPoints        *int       `json:"story_points,omitempty"`
	PomodorosPlanned   *int       `json:"pomodoros_planned,omitempty"`
	PomodorosFinished  *int       `json:"pomodoros_finished,omitempty"`
	// Computed / joined fields (not stored in tasks table)
	SubTasks           []*Task    `json:"sub_tasks,omitempty"`
	Tags               []Tag      `json:"tags,omitempty"`
	CategoryName       string     `json:"category_name,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// TaskFilter holds optional criteria for ListTasks.
type TaskFilter struct {
	GoalID       *int64
	ProjectID    *int64
	SprintID     *int64
	Status       *Status
	CategoryID   *int64
	TopLevelOnly bool // WHERE parent_task_id IS NULL
}
