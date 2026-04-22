package service

import (
	"fmt"

	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/storage"
)

// HabitService encapsulates business logic for Habits.
//
// For habits of type "learning", it validates that the provided reference_id
// maps to a real StudyTrack objective before persisting.
type HabitService struct {
	store  storage.Storage
	stc    *studyTrackClient
}

// NewHabitService constructs a HabitService backed by the given storage.
func NewHabitService(store storage.Storage) *HabitService {
	return &HabitService{
		store: store,
		stc:   newStudyTrackClient(),
	}
}

// Create validates and inserts a new Habit.
//
// Validation rules:
//   - Title must not be empty.
//   - Type "learning" requires a non-empty ReferenceID that resolves to an
//     existing StudyTrack objective.
func (s *HabitService) Create(h *domain.Habit) (*domain.Habit, error) {
	if h.Title == "" {
		return nil, fmt.Errorf("title is required")
	}

	if h.Type == domain.HabitTypeLearning {
		if h.ReferenceID == nil || *h.ReferenceID == "" {
			return nil, fmt.Errorf("reference_id is required for learning habits")
		}
		if _, err := s.stc.ValidateTrack(*h.ReferenceID); err != nil {
			return nil, fmt.Errorf("invalid study track reference: %w", err)
		}
	}

	// Default type when not specified
	if h.Type == "" {
		h.Type = domain.HabitTypeGeneral
	}

	id, err := s.store.CreateHabit(h)
	if err != nil {
		return nil, err
	}
	return s.store.GetHabit(id)
}

// Get returns a Habit by ID.
func (s *HabitService) Get(id int64) (*domain.Habit, error) {
	return s.store.GetHabit(id)
}

// List returns all Habits.
func (s *HabitService) List() ([]*domain.Habit, error) {
	return s.store.ListHabits()
}

// Update replaces a Habit's mutable fields.
//
// Re-validates the StudyTrack reference if the type is "learning".
func (s *HabitService) Update(h *domain.Habit) (*domain.Habit, error) {
	if h.Title == "" {
		return nil, fmt.Errorf("title is required")
	}

	if h.Type == domain.HabitTypeLearning {
		if h.ReferenceID == nil || *h.ReferenceID == "" {
			return nil, fmt.Errorf("reference_id is required for learning habits")
		}
		if _, err := s.stc.ValidateTrack(*h.ReferenceID); err != nil {
			return nil, fmt.Errorf("invalid study track reference: %w", err)
		}
	}

	if err := s.store.UpdateHabit(h); err != nil {
		return nil, err
	}
	return s.store.GetHabit(h.ID)
}

// Delete removes a Habit by ID.
func (s *HabitService) Delete(id int64) error {
	return s.store.DeleteHabit(id)
}
