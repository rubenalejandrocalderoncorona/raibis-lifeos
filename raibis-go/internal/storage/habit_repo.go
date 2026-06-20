package storage

import (
	"database/sql"
	"time"

	"github.com/raibis/raibis-go/internal/domain"
)

// ── Habit completions ──────────────────────────────────────────────────────────

func (s *sqliteStorage) LogHabitCompletion(habitID int64, date string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO habit_completions (habit_id, date) VALUES (?, ?)`,
		habitID, date,
	)
	return err
}

func (s *sqliteStorage) RemoveHabitCompletion(habitID int64, date string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`DELETE FROM habit_completions WHERE habit_id = ? AND date = ?`,
		habitID, date,
	)
	return err
}

func (s *sqliteStorage) ListHabitCompletions(habitID int64, from, to string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT date FROM habit_completions WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date DESC`,
		habitID, from, to,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var dates []string
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		dates = append(dates, d)
	}
	if dates == nil {
		dates = []string{}
	}
	return dates, rows.Err()
}

func (s *sqliteStorage) GetHabitStreak(habitID int64) (streak int, doneToday bool, err error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	today := time.Now().UTC().Format("2006-01-02")

	rows, qErr := s.db.Query(
		`SELECT date FROM habit_completions WHERE habit_id = ? ORDER BY date DESC`,
		habitID,
	)
	if qErr != nil {
		return 0, false, qErr
	}
	defer rows.Close()

	var dates []string
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return 0, false, err
		}
		dates = append(dates, d)
	}
	if err := rows.Err(); err != nil {
		return 0, false, err
	}

	dateSet := make(map[string]bool, len(dates))
	for _, d := range dates {
		dateSet[d] = true
	}

	doneToday = dateSet[today]

	// Count consecutive days backwards from today
	cursor := time.Now().UTC()
	for {
		ds := cursor.Format("2006-01-02")
		if !dateSet[ds] {
			break
		}
		streak++
		cursor = cursor.AddDate(0, 0, -1)
	}
	return streak, doneToday, nil
}

// ── SQLite implementation for Habits ─────────────────────────────────────────

// CreateHabit inserts a new Habit and returns its generated ID.
func (s *sqliteStorage) CreateHabit(h *domain.Habit) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	res, err := s.db.Exec(
		`INSERT INTO habits (title, type, reference_id) VALUES (?, ?, ?)`,
		h.Title, string(h.Type), nullableStr(h.ReferenceID),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// GetHabit retrieves a single Habit by ID.
func (s *sqliteStorage) GetHabit(id int64) (*domain.Habit, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	row := s.db.QueryRow(
		`SELECT id, title, type, reference_id, created_at FROM habits WHERE id = ?`, id,
	)
	return scanHabit(row)
}

// ListHabits returns all habits, newest first.
func (s *sqliteStorage) ListHabits() ([]*domain.Habit, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rows, err := s.db.Query(
		`SELECT id, title, type, reference_id, created_at FROM habits ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*domain.Habit
	for rows.Next() {
		h, err := scanHabit(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	if out == nil {
		out = []*domain.Habit{}
	}
	return out, rows.Err()
}

// UpdateHabit replaces a Habit's mutable fields.
func (s *sqliteStorage) UpdateHabit(h *domain.Habit) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(
		`UPDATE habits SET title = ?, type = ?, reference_id = ? WHERE id = ?`,
		h.Title, string(h.Type), nullableStr(h.ReferenceID), h.ID,
	)
	return err
}

// DeleteHabit removes a Habit by ID.
func (s *sqliteStorage) DeleteHabit(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`DELETE FROM habits WHERE id = ?`, id)
	return err
}

// ── Scan helper ───────────────────────────────────────────────────────────────

type scannerRow interface {
	Scan(dest ...any) error
}

func scanHabit(sc scannerRow) (*domain.Habit, error) {
	var (
		h      domain.Habit
		refID  sql.NullString
		rawAt  string
	)
	if err := sc.Scan(&h.ID, &h.Title, &h.Type, &refID, &rawAt); err != nil {
		return nil, err
	}
	if refID.Valid {
		h.ReferenceID = &refID.String
	}
	if t, err := time.Parse("2006-01-02 15:04:05", rawAt); err == nil {
		h.CreatedAt = t
	}
	return &h, nil
}

// nullableStr converts a *string to a SQL-compatible value (nil if pointer is nil).
func nullableStr(s *string) any {
	if s == nil {
		return nil
	}
	return *s
}
