package domain

import (
	"encoding/json"
	"time"
)

// PropDef is a typed column definition for a specific entity type.
// It lives in the prop_schema table and is shared across all records of that entity.
type PropDef struct {
	ID        int64           `json:"id"`
	Entity    string          `json:"entity"`   // task | goal | project | note | resource | sprint
	Key       string          `json:"key"`      // snake_case identifier
	Label     string          `json:"label"`    // display name
	Type      string          `json:"type"`     // text|number|select|multi_select|status|date|checkbox|url|phone|email|relation|files
	Options   json.RawMessage `json:"options"`  // raw JSON — []string or [{value,color}] for select/multi_select/status
	Position  int             `json:"position"` // display order
	CreatedAt time.Time       `json:"created_at"`
}

// PropRelation defines a typed relation between two entity types.
type PropRelation struct {
	ID         int64  `json:"id"`
	FromEntity string `json:"from_entity"` // e.g. "task"
	FromKey    string `json:"from_key"`    // property key on from_entity
	ToEntity   string `json:"to_entity"`   // e.g. "goal"
	ToKey      *string `json:"to_key,omitempty"` // property key on to_entity (two-sided)
}

// RelationLink is a single many-to-many connection between two entity records.
type RelationLink struct {
	FromEntity string `json:"from_entity"`
	FromID     int64  `json:"from_id"`
	FromKey    string `json:"from_key"`
	ToEntity   string `json:"to_entity"`
	ToID       int64  `json:"to_id"`
}
