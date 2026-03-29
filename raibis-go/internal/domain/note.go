package domain

import "time"

// Note is freeform text linked optionally to a task or project.
// Body is hydration-only: populated at read time from FilePath; never stored in SQLite.
type Note struct {
	ID           int64     `json:"id"`
	Title        string    `json:"title"`
	Body         string    `json:"body,omitempty"` // hydrated from vault file, not in DB
	FilePath     *string   `json:"file_path,omitempty"`
	GoalID       *int64    `json:"goal_id,omitempty"`
	TaskID       *int64    `json:"task_id,omitempty"`
	ProjectID    *int64    `json:"project_id,omitempty"`
	CategoryID   *int64    `json:"category_id,omitempty"`
	CategoryName string    `json:"category_name,omitempty"`
	Archived     bool      `json:"archived"`
	NoteDate     *string   `json:"note_date,omitempty"`
	Tags         []Tag     `json:"tags,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
