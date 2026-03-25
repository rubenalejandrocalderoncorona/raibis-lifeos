package views

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/raibis/raibis-go/internal/domain"
	st "github.com/raibis/raibis-go/internal/tui/styles"
)

// SprintView shows tasks in the current/recent sprints.
type SprintView struct {
	tasks    []*domain.Task
	projects []*domain.Project
	cursor   int
	width    int
}

func NewSprintView() SprintView { return SprintView{} }

func (s SprintView) SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) SprintView {
	s.tasks = tasks
	s.projects = projects
	return s
}

func (s SprintView) SetSize(w, h int) SprintView { s.width = w; return s }
func (s SprintView) Init() tea.Cmd               { return nil }

func (s SprintView) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "k", "up":
			if s.cursor > 0 {
				s.cursor--
			}
		case "j", "down":
			if s.cursor < len(s.sprintTasks())-1 {
				s.cursor++
			}
		}
	}
	return s, nil
}

func (s SprintView) sprintTasks() []*domain.Task {
	var out []*domain.Task
	for _, t := range s.tasks {
		if t.SprintID != nil {
			out = append(out, t)
		}
	}
	return out
}

func (s SprintView) View() string {
	sprintTasks := s.sprintTasks()
	title := st.StyleTitle.Render("⚡ Sprint") + "  " +
		st.StyleMuted.Render(fmt.Sprintf("%d tasks in sprints", len(sprintTasks)))

	if len(sprintTasks) == 0 {
		return title + "\n\n" + st.StyleDim.Render("  No tasks assigned to sprints")
	}

	colW := []int{36, 14, 10, 16}
	header := st.StyleHeader.Render(
		fmt.Sprintf("%-*s  %-*s  %-*s  %-*s",
			colW[0], "TITLE",
			colW[1], "STATUS",
			colW[2], "PRIORITY",
			colW[3], "PROJECT",
		),
	)

	var rows []string
	for i, t := range sprintTasks {
		projName := "—"
		for _, p := range s.projects {
			if t.ProjectID != nil && p.ID == *t.ProjectID {
				projName = p.Title
				if len(projName) > colW[3] {
					projName = projName[:colW[3]-1] + "…"
				}
			}
		}
		title2 := t.Title
		if len(title2) > colW[0] {
			title2 = title2[:colW[0]-1] + "…"
		}
		prefix := "  "
		if i == s.cursor {
			prefix = st.StyleAccent.Render("> ")
			title2 = st.StyleBold.Render(title2)
		}
		rows = append(rows, prefix+fmt.Sprintf("%-*s  %-*s  %-*s  %-*s",
			colW[0], title2,
			colW[1], st.StatusStyle(string(t.Status)).Render(string(t.Status)),
			colW[2], st.PriorityStyle(string(t.Priority)).Render(string(t.Priority)),
			colW[3], st.StyleMuted.Render(projName),
		))
	}

	return title + "\n\n" + st.StyleBorder.Render(header+"\n"+joinLines(rows))
}
