package domain

import "fmt"

// Status is a typed string for entity lifecycle states.
type Status string

const (
	// Task statuses
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusBlocked    Status = "blocked"
	StatusDone       Status = "done"
	// Goal / Project statuses
	StatusActive    Status = "active"
	StatusCompleted Status = "completed"
	StatusArchived  Status = "archived"
	StatusOnHold    Status = "on_hold"
	// Sprint statuses
	StatusPlanned Status = "planned"
)

func (s Status) Valid() bool {
	switch s {
	case StatusTodo, StatusInProgress, StatusBlocked, StatusDone,
		StatusActive, StatusCompleted, StatusArchived, StatusOnHold, StatusPlanned:
		return true
	}
	return false
}

// Priority is a typed string for task urgency.
type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"
)

func (p Priority) Valid() bool {
	switch p {
	case PriorityLow, PriorityMedium, PriorityHigh, PriorityUrgent:
		return true
	}
	return false
}

// Order returns a sort key: lower = higher importance.
func (p Priority) Order() int {
	switch p {
	case PriorityUrgent:
		return 0
	case PriorityHigh:
		return 1
	case PriorityMedium:
		return 2
	case PriorityLow:
		return 3
	}
	return 2
}

// ParsePriority converts a string to Priority, falling back to Medium on unknown values.
func ParsePriority(s string) Priority {
	p := Priority(s)
	if p.Valid() {
		return p
	}
	return PriorityMedium
}

// ParseStatus converts a string to Status; returns an error if unrecognised.
func ParseStatus(s string) (Status, error) {
	st := Status(s)
	if !st.Valid() {
		return StatusTodo, fmt.Errorf("unknown status %q", s)
	}
	return st, nil
}
