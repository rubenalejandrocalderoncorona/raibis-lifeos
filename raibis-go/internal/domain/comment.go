package domain

import "time"

type Comment struct {
	ID         int64     `json:"id"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   int64     `json:"entity_id,omitempty"`
	PageID     string    `json:"page_id,omitempty"`
	Author     string    `json:"author"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"created_at"`
}
