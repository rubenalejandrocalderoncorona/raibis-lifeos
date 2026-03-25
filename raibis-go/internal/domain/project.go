package domain

import "time"

// Project belongs to a Goal and contains Tasks / Sprints.
type Project struct {
	ID          int64     `json:"id"`
	GoalID      *int64    `json:"goal_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	GoalTitle   string    `json:"goal_title,omitempty"` // populated by JOIN queries
}
