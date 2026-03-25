package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/raibis/raibis-go/internal/domain"
)

// ParseCapture parses the Quick Capture mini-syntax into a partially-filled Task.
// Syntax tokens (space-separated, order does not matter):
//   #priority    → sets Priority (low/medium/high/urgent; unknown → medium)
//   @project     → sets project hint string (caller resolves to ID)
//   !YYYY-MM-DD  → sets DueDate
//   everything else → joined as the Title
//
// Returns the parsed Task and the raw project hint (empty if none).
func ParseCapture(input string, projects []*domain.Project) (*domain.Task, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return nil, fmt.Errorf("empty input")
	}

	t := &domain.Task{
		Status:   domain.StatusTodo,
		Priority: domain.PriorityMedium,
	}

	var titleTokens []string
	var projectHint string

	for _, tok := range strings.Fields(input) {
		switch {
		case strings.HasPrefix(tok, "#"):
			t.Priority = domain.ParsePriority(strings.TrimPrefix(tok, "#"))
		case strings.HasPrefix(tok, "@"):
			projectHint = strings.ToLower(strings.TrimPrefix(tok, "@"))
		case strings.HasPrefix(tok, "!"):
			dateStr := strings.TrimPrefix(tok, "!")
			parsed, err := time.Parse("2006-01-02", dateStr)
			if err == nil {
				t.DueDate = &parsed
			}
		default:
			titleTokens = append(titleTokens, tok)
		}
	}

	t.Title = strings.Join(titleTokens, " ")
	if t.Title == "" {
		return nil, fmt.Errorf("title cannot be empty after parsing")
	}

	// Fuzzy-match project hint against provided projects list.
	if projectHint != "" && len(projects) > 0 {
		for _, p := range projects {
			if strings.Contains(strings.ToLower(p.Title), projectHint) {
				id := p.ID
				t.ProjectID = &id
				break
			}
		}
	}

	return t, nil
}
