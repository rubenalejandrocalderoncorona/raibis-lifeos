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
