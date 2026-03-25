package views

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/raibis/raibis-go/internal/domain"
	st "github.com/raibis/raibis-go/internal/tui/styles"
)

// Projects lists all active projects with task progress.
type Projects struct {
	tasks    []*domain.Task
	goals    []*domain.Goal
	projects []*domain.Project
	cursor   int
	width    int
}

func NewProjects() Projects { return Projects{} }

func (p Projects) SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) Projects {
	p.tasks = tasks
	p.goals = goals
	p.projects = projects
	return p
}

func (p Projects) SetSize(w, h int) Projects { p.width = w; return p }
func (p Projects) Init() tea.Cmd             { return nil }

func (p Projects) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "k", "up":
			if p.cursor > 0 {
				p.cursor--
			}
		case "j", "down":
			if p.cursor < len(p.projects)-1 {
				p.cursor++
			}
		}
	}
	return p, nil
}

func (p Projects) View() string {
	title := st.StyleTitle.Render("◆ Projects") + "  " + st.StyleMuted.Render(fmt.Sprintf("%d active", len(p.projects)))

	if len(p.projects) == 0 {
		return title + "\n\n" + st.StyleDim.Render("  No projects yet")
	}

	var lines []string
	for i, proj := range p.projects {
		total, done := 0, 0
		var activeTitles []string
		for _, t := range p.tasks {
			if t.ProjectID == nil || *t.ProjectID != proj.ID {
				continue
			}
			total++
			if t.Status == domain.StatusDone {
				done++
			}
			if t.Status == domain.StatusInProgress && len(activeTitles) < 3 {
				activeTitles = append(activeTitles, t.Title)
			}
		}

		pct := 0
		if total > 0 {
			pct = done * 100 / total
		}

		selected := i == p.cursor
		prefix := "  "
		titleStyle := st.StyleBold
		if selected {
			prefix = st.StyleAccent.Render("> ")
			titleStyle = st.StyleAccent.Copy().Bold(true)
		}

		goalName := "—"
		if proj.GoalTitle != "" {
			goalName = proj.GoalTitle
		}

		bar := st.ProgressBar(pct, 20)
		card := prefix + titleStyle.Render(proj.Title) + "\n" +
			"    " + bar + "\n" +
			"    " + st.StyleMuted.Render(fmt.Sprintf("%d/%d tasks  ·  Goal: %s", done, total, goalName))

		if len(activeTitles) > 0 {
			active := ""
			for j, t := range activeTitles {
				if j > 0 {
					active += " · "
				}
				active += t
			}
			card += "\n    " + st.StyleDim.Render("In progress: "+active)
		}
		lines = append(lines, st.StyleBorder.Render(card))
	}

	return title + "\n\n" + joinLines(lines)
}
