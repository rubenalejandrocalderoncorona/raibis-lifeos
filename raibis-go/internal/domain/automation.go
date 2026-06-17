package domain

import "time"

// Automation defines a trigger→action rule on an entity type.
// trigger_config is a JSON array of trigger objects; action_config is a JSON array of action objects.
type Automation struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	EntityType    string    `json:"entity_type"`
	Enabled       bool      `json:"enabled"`
	TriggerLogic  string    `json:"trigger_logic"`  // "all" | "any" — how multiple triggers are combined
	TriggerType   string    `json:"trigger_type"`   // first trigger's type (for backward compat)
	TriggerConfig string    `json:"trigger_config"`  // JSON array of trigger objects
	ActionType    string    `json:"action_type"`    // first action's type (for backward compat)
	ActionConfig  string    `json:"action_config"`   // JSON array of action objects
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
