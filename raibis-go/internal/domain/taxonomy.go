package domain

// Category is a unified taxonomy entity shared across tasks, projects, goals, notes.
type Category struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"` // blue | green | red | yellow | purple | cyan | orange | pink
}

// Tag is a reusable label attachable to any entity.
type Tag struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// EntityChild represents a parent→child link between any two entities.
// Children of the same type automatically inherit the parent type's custom prop definitions.
type EntityChild struct {
	ID               int64  `json:"id"`
	ParentEntityType string `json:"parent_entity_type"`
	ParentEntityID   int64  `json:"parent_entity_id"`
	ChildEntityType  string `json:"child_entity_type"`
	ChildEntityID    int64  `json:"child_entity_id"`
	Position         int    `json:"position"`
	ChildTitle       string `json:"child_title,omitempty"` // denormalized, set by server
}
