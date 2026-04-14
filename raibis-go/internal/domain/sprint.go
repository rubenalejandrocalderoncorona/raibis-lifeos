package domain

import "time"

// Sprint is a time-boxed iteration inside a Project.
type Sprint struct {
	ID          int64      `json:"id"`
	ProjectID   int64      `json:"project_id"`
	Title       string     `json:"title"`
	Goal        string     `json:"goal"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	Status      Status     `json:"status"`
	StoryPoints *int       `json:"story_points,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}
