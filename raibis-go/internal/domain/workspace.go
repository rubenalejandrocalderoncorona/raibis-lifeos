package domain

import "time"

// Workspace groups a set of entity types (built-in or custom) under one
// named container. An entity type belongs to at most one workspace at a
// time; entity types with no workspace are "General" — always visible
// regardless of which workspace is active in the UI.
type Workspace struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Icon        string    `json:"icon"`
	Position    int       `json:"position"`
	EntityTypes []string  `json:"entity_types"` // populated on read; not a DB column
	CreatedAt   time.Time `json:"created_at"`
}
