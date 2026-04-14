package domain

import "time"

// Project belongs to a Goal and contains Tasks / Sprints.
type Project struct {
	ID           int64      `json:"id"`
	GoalID       *int64     `json:"goal_id,omitempty"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Status       Status     `json:"status"`
	MacroArea    string     `json:"macro_area,omitempty"` // Soul | Output | Growth | Body
	KanbanCol    string     `json:"kanban_col,omitempty"` // Backlog | Maintenance | Sprint
	Archived     bool       `json:"archived"`
	CategoryID   *int64     `json:"category_id,omitempty"`
	CategoryName string     `json:"category_name,omitempty"`
	Tags         []Tag      `json:"tags,omitempty"`
	GoalTitle    string     `json:"goal_title,omitempty"` // populated by JOIN
	StartDate    *time.Time `json:"start_date,omitempty"`
	DueDate      *time.Time `json:"due_date,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}
