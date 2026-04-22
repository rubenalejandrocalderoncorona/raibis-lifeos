package domain

import "time"

// HabitType defines the category of a Habit.
// The "learning" type requires a valid StudyTrack reference.
type HabitType string

const (
	HabitTypeLearning  HabitType = "learning"
	HabitTypeFitness   HabitType = "fitness"
	HabitTypeMeditation HabitType = "meditation"
	HabitTypeGeneral   HabitType = "general"
)

// Habit represents a trackable recurring behaviour.
//
// When Type == HabitTypeLearning, ReferenceID must be set to a valid
// StudyTrack objective ID.  The service layer validates this via the
// StudyTrack REST API before persisting.
type Habit struct {
	// ID is the SQLite primary key.
	ID int64 `json:"id"`

	// Title is a short human-readable label.
	Title string `json:"title"`

	// Type categorises the habit.
	Type HabitType `json:"type"`

	// ReferenceID is an optional pointer to an external entity.
	// For Type=="learning" this is a StudyTrack objective ID.
	ReferenceID *string `json:"reference_id,omitempty"`

	// CreatedAt is set by the database on insert.
	CreatedAt time.Time `json:"created_at"`
}
