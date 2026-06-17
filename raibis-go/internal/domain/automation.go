package domain

import "time"

// Automation defines a trigger→action rule on an entity type.
// trigger_config and action_config are JSON blobs stored as strings.
type Automation struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	EntityType    string    `json:"entity_type"`
	Enabled       bool      `json:"enabled"`
	TriggerType   string    `json:"trigger_type"`   // property_changed | item_added | frequency
	TriggerConfig string    `json:"trigger_config"`  // JSON string
	ActionType    string    `json:"action_type"`    // edit_property | add_item | edit_item
	ActionConfig  string    `json:"action_config"`   // JSON string
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
