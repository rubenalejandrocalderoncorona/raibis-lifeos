package views

import (
	"fmt"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/raibis/raibis-go/internal/domain"
	st "github.com/raibis/raibis-go/internal/tui/styles"
)

// Dashboard shows stats and recent/today's tasks.
type Dashboard struct {
	tasks    []*domain.Task
	goals    []*domain.Goal
	projects []*domain.Project
	width    int
	height   int
}

func NewDashboard() Dashboard { return Dashboard{} }

func (d Dashboard) SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) Dashboard {
	d.tasks = tasks
	d.goals = goals
	d.projects = projects
	return d
}

func (d Dashboard) SetSize(w, h int) Dashboard {
	d.width = w
	d.height = h
	return d
}

func (d Dashboard) Init() tea.Cmd { return nil }

func (d Dashboard) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	return d, nil
}

func (d Dashboard) View() string {
	today := time.Now().Format("2006-01-02")
	var inProgress, overdue, todayCount int
	var recentRows []string

	for _, t := range d.tasks {
		if t.Status == domain.StatusInProgress {
			inProgress++
		}
		if t.DueDate != nil && t.DueDate.Format("2006-01-02") < today && t.Status != domain.StatusDone {
			overdue++
		}
		if t.DueDate != nil && t.DueDate.Format("2006-01-02") == today {
			todayCount++
		}
	}

	// Stat cards row
	statStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(st.ColBorder).
		Padding(0, 2).
		Width(18).
		Align(lipgloss.Center)

	statLine := lipgloss.JoinHorizontal(lipgloss.Top,
		statStyle.Render(st.StyleAccent.Bold(true).Render(fmt.Sprintf("%d", len(d.goals)))+"\n"+st.StyleMuted.Render("Goals")),
		"  ",
		statStyle.Render(st.StyleAccent.Bold(true).Render(fmt.Sprintf("%d", len(d.projects)))+"\n"+st.StyleMuted.Render("Projects")),
		"  ",
		statStyle.Render(st.StyleAccent.Bold(true).Render(fmt.Sprintf("%d", inProgress))+"\n"+st.StyleMuted.Render("In Progress")),
		"  ",
		func() string {
			s := st.StyleDanger.Bold(true).Render(fmt.Sprintf("%d", overdue))
			if overdue == 0 {
				s = st.StyleSuccess.Bold(true).Render("0")
			}
			return statStyle.Render(s + "\n" + st.StyleMuted.Render("Overdue"))
		}(),
	)

	// Recent tasks table
	colW := []int{40, 12, 10, 18}
	header := st.StyleHeader.Render(
		fmt.Sprintf("%-*s  %-*s  %-*s  %-*s",
			colW[0], "TITLE",
			colW[1], "STATUS",
			colW[2], "PRIORITY",
			colW[3], "PROJECT",
		),
	)

	shown := d.tasks
	if len(shown) > 12 {
		shown = shown[:12]
	}
	for _, t := range shown {
		projName := "—"
		for _, p := range d.projects {
			if t.ProjectID != nil && p.ID == *t.ProjectID {
				projName = p.Title
				if len(projName) > colW[3] {
					projName = projName[:colW[3]-1] + "…"
				}
			}
		}
		title := t.Title
		if len(title) > colW[0] {
			title = title[:colW[0]-1] + "…"
		}
		row := fmt.Sprintf("%-*s  %-*s  %-*s  %-*s",
			colW[0], title,
			colW[1], st.StatusStyle(string(t.Status)).Render(string(t.Status)),
			colW[2], st.PriorityStyle(string(t.Priority)).Render(string(t.Priority)),
			colW[3], st.StyleMuted.Render(projName),
		)
		recentRows = append(recentRows, row)
	}
	if len(recentRows) == 0 {
		recentRows = append(recentRows, st.StyleDim.Render("  No active tasks — press space to quick-capture one"))
	}

	table := st.StyleBorder.Render(header + "\n" + joinLines(recentRows))

	title := st.StyleTitle.Render("⊞ Dashboard") +
		"  " + st.StyleMuted.Render(time.Now().Format("Mon, 02 Jan 2006")) +
		"  " + st.StyleDim.Render(fmt.Sprintf("today: %d tasks due", todayCount))

	return title + "\n\n" + statLine + "\n\n" + st.StyleMuted.Render("Recent Tasks") + "\n" + table
}

func joinLines(lines []string) string {
	out := ""
	for i, l := range lines {
		if i > 0 {
			out += "\n"
		}
		out += l
	}
	return out
}
