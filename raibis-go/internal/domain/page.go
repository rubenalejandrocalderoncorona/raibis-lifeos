package domain

import "time"

type PageType string

const (
	PageTypePage     PageType = "page"
	PageTypeDatabase PageType = "database"
)

// Page is the universal content unit. A page is either a free-form page or a
// database (type="database"). Database rows are pages with a non-nil DatabaseID.
type Page struct {
	ID         string            `json:"id"`
	Type       PageType          `json:"type"`
	Title      string            `json:"title"`
	Icon       string            `json:"icon,omitempty"`
	Cover      string            `json:"cover,omitempty"`
	Body       string            `json:"body,omitempty"`
	DatabaseID *string           `json:"database_id,omitempty"`
	ParentID   *string           `json:"parent_id,omitempty"`
	Properties map[string]string `json:"properties,omitempty"`
	Archived   bool              `json:"archived"`
	Position   float64           `json:"position"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
}

// PageFilter holds optional criteria for ListPages.
type PageFilter struct {
	DatabaseID *string
	ParentID   *string
	Type       *PageType
	Archived   *bool
	Search     string
}

// SchemaColumn defines one typed property in a database's schema.
type SchemaColumn struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	DataType string   `json:"data_type"` // text|number|select|multi_select|status|date|person|files|checkbox|url|phone|email|relation|rollup|formula|button|id|place|created_time|edited_time|created_by|edited_by
	Options  []string `json:"options,omitempty"` // select/multi_select choices
	Required bool     `json:"required,omitempty"`
	Position int      `json:"position"`
}

// Relation is a directed edge between two pages, optionally tagged with a key.
type Relation struct {
	FromPageID string `json:"from_page_id"`
	ToPageID   string `json:"to_page_id"`
	Key        string `json:"key,omitempty"`
}

// ObsidianVault is a configured Obsidian vault path that pages are synced to.
type ObsidianVault struct {
	ID       int64     `json:"id"`
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Active   bool      `json:"active"`
	LastSync time.Time `json:"last_sync"`
}
