package domain

import "time"

// CustomEntityType describes a user-defined entity type (e.g. "repository").
type CustomEntityType struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`         // slug: "repository"
	DisplayName string    `json:"display_name"` // "Repository"
	Icon        string    `json:"icon"`         // emoji e.g. "📁"
	PropDefs    string    `json:"prop_defs"`    // JSON: [{key,label,type}]
	CreatedAt   time.Time `json:"created_at"`
}

// CustomEntity is a single record of a user-defined entity type.
type CustomEntity struct {
	ID        int64             `json:"id"`
	TypeName  string            `json:"type_name"`
	Title     string            `json:"title"`
	Props     map[string]string `json:"props"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}
