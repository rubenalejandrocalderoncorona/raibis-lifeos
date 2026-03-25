package views

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/raibis/raibis-go/internal/domain"
	st "github.com/raibis/raibis-go/internal/tui/styles"
)

// Goals lists all active goals with task progress.
type Goals struct {
	goals    []*domain.Goal
	tasks    []*domain.Task
	projects []*domain.Project
	cursor   int
	width    int
}

func NewGoals() Goals { return Goals{} }

func (g Goals) SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) Goals {
	g.tasks = tasks
	g.goals = goals
	g.projects = projects
	return g
}

func (g Goals) SetSize(w, h int) Goals { g.width = w; return g }
func (g Goals) Init() tea.Cmd         { return nil }

func (g Goals) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "k", "up":
			if g.cursor > 0 {
				g.cursor--
			}
		case "j", "down":
			if g.cursor < len(g.goals)-1 {
				g.cursor++
			}
		}
	}
	return g, nil
}

func (g Goals) View() string {
	title := st.StyleTitle.Render("◈ Goals") + "  " + st.StyleMuted.Render(fmt.Sprintf("%d active", len(g.goals)))

	if len(g.goals) == 0 {
		return title + "\n\n" + st.StyleDim.Render("  No goals yet — use the REST API or press space to capture")
	}

	var lines []string
	for i, goal := range g.goals {
		// Count tasks under projects belonging to this goal
		var projIDs []int64
		for _, p := range g.projects {
			if p.GoalID != nil && *p.GoalID == goal.ID {
				projIDs = append(projIDs, p.ID)
			}
		}
		total, done := 0, 0
		for _, t := range g.tasks {
			if t.ProjectID == nil {
				continue
			}
			for _, pid := range projIDs {
				if *t.ProjectID == pid {
					total++
					if t.Status == domain.StatusDone {
						done++
					}
					break
				}
			}
		}

		pct := 0
		if total > 0 {
			pct = done * 100 / total
		}

		selected := i == g.cursor
		prefix := "  "
		titleStyle := st.StyleBold
		if selected {
			prefix = st.StyleAccent.Render("> ")
			titleStyle = st.StyleAccent.Copy().Bold(true)
		}

		bar := st.ProgressBar(pct, 20)
		projCount := len(projIDs)

		card := prefix + titleStyle.Render(goal.Title) + "\n" +
			"    " + bar + "\n" +
			"    " + st.StyleMuted.Render(fmt.Sprintf("%d/%d tasks  ·  %d project(s)", done, total, projCount))
		lines = append(lines, st.StyleBorder.Render(card))
	}

	return title + "\n\n" + joinLines(lines)
}
