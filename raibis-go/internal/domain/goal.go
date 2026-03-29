package domain

import "time"

// Goal is a top-level intention that groups Projects.
type Goal struct {
	ID           int64    `json:"id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Status       Status   `json:"status"`
	Type         string   `json:"type,omitempty"`          // 12 Weeks | 12 Months | 3 Years | 5 Years
	Year         string   `json:"year,omitempty"`          // 2025 | 2026 | 2027 | Multiyear
	StartDate    *string  `json:"start_date,omitempty"`
	DueDate      *string  `json:"due_date,omitempty"`
	StartValue   *float64 `json:"start_value,omitempty"`
	CurrentValue *float64 `json:"current_value,omitempty"`
	Target       *float64 `json:"target,omitempty"`
	CategoryID   *int64   `json:"category_id,omitempty"`
	CategoryName string   `json:"category_name,omitempty"`
	Tags         []Tag    `json:"tags,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}
