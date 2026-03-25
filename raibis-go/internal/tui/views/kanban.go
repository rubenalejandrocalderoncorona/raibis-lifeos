package views

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/raibis/raibis-go/internal/domain"
	st "github.com/raibis/raibis-go/internal/tui/styles"
)

var kanbanCols = []domain.Status{
	domain.StatusTodo,
	domain.StatusInProgress,
	domain.StatusBlocked,
	domain.StatusDone,
}

var kanbanColLabels = map[domain.Status]string{
	domain.StatusTodo:       "TODO",
	domain.StatusInProgress: "IN PROGRESS",
	domain.StatusBlocked:    "BLOCKED",
	domain.StatusDone:       "DONE",
}

// Kanban is a 4-column board view.
type Kanban struct {
	tasks    []*domain.Task
	projects []*domain.Project
	colIdx   int // focused column index (0-3)
	rowIdx   int // focused row within column
	width    int
	height   int
}

func NewKanban() Kanban { return Kanban{} }

func (k Kanban) SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) Kanban {
	k.tasks = tasks
	k.projects = projects
	return k
}

func (k Kanban) SetSize(w, h int) Kanban {
	k.width = w
	k.height = h
	return k
}

func (k Kanban) Init() tea.Cmd { return nil }

func (k Kanban) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		col := k.tasksByCol()
		colLen := len(col[kanbanCols[k.colIdx]])
		switch {
		case msg.String() == "h" || msg.String() == "left":
			if k.colIdx > 0 {
				k.colIdx--
				k.rowIdx = 0
			}
		case msg.String() == "l" || msg.String() == "right":
			if k.colIdx < 3 {
				k.colIdx++
				k.rowIdx = 0
			}
		case msg.String() == "k" || msg.String() == "up":
			if k.rowIdx > 0 {
				k.rowIdx--
			}
		case msg.String() == "j" || msg.String() == "down":
			if k.rowIdx < colLen-1 {
				k.rowIdx++
			}
		}
	}
	return k, nil
}

func (k Kanban) View() string {
	cols := k.tasksByCol()
	colW := (k.width - 8) / 4
	if colW < 20 {
		colW = 20
	}

	rendered := make([]string, 4)
	for i, status := range kanbanCols {
		tasks := cols[status]
		label := kanbanColLabels[status]

		headerStyle := st.StyleHeader.Copy().Width(colW)
		switch status {
		case domain.StatusInProgress:
			headerStyle = headerStyle.Foreground(st.ColAccent)
		case domain.StatusBlocked:
			headerStyle = headerStyle.Foreground(st.ColDanger)
		case domain.StatusDone:
			headerStyle = headerStyle.Foreground(st.ColSuccess)
		}

		header := headerStyle.Render(fmt.Sprintf("%s (%d)", label, len(tasks)))

		var cards []string
		for j, t := range tasks {
			isSelected := (i == k.colIdx && j == k.rowIdx)
			cards = append(cards, renderCard(t, k.projects, colW, isSelected))
		}
		if len(cards) == 0 {
			cards = append(cards, st.StyleDim.Copy().Width(colW).Render("  empty"))
		}

		var bStyle lipgloss.Style
		if i == k.colIdx {
			bStyle = st.StyleActiveBorder.Copy().Width(colW)
		} else {
			bStyle = st.StyleBorder.Copy().Width(colW)
		}
		rendered[i] = bStyle.Render(header + "\n" + strings.Join(cards, "\n"))
	}

	board := lipgloss.JoinHorizontal(lipgloss.Top, rendered[0], " ", rendered[1], " ", rendered[2], " ", rendered[3])
	return st.StyleTitle.Render("▦ Kanban") + "\n\n" + board +
		"\n\n" + st.StyleDim.Render("h/l: switch col  j/k: move  space: new task")
}

func (k Kanban) tasksByCol() map[domain.Status][]*domain.Task {
	m := map[domain.Status][]*domain.Task{
		domain.StatusTodo:       {},
		domain.StatusInProgress: {},
		domain.StatusBlocked:    {},
		domain.StatusDone:       {},
	}
	for _, t := range k.tasks {
		if _, ok := m[t.Status]; ok {
			m[t.Status] = append(m[t.Status], t)
		} else {
			m[domain.StatusTodo] = append(m[domain.StatusTodo], t)
		}
	}
	return m
}

func renderCard(t *domain.Task, projects []*domain.Project, width int, selected bool) string {
	title := t.Title
	if len(title) > width-4 {
		title = title[:width-5] + "…"
	}

	pri := st.PriorityStyle(string(t.Priority)).Render(string(t.Priority))
	due := ""
	if t.DueDate != nil {
		due = " · " + st.StyleMuted.Render(t.DueDate.Format("2006-01-02"))
	}

	proj := ""
	for _, p := range projects {
		if t.ProjectID != nil && p.ID == *t.ProjectID {
			pn := p.Title
			if len(pn) > 16 {
				pn = pn[:15] + "…"
			}
			proj = st.StyleDim.Render("@" + pn)
		}
	}

	titleLine := title
	if selected {
		titleLine = st.StyleAccent.Render("> ") + st.StyleBold.Render(title)
	}

	card := titleLine + "\n" + "  " + pri + due
	if proj != "" {
		card += "\n  " + proj
	}

	style := lipgloss.NewStyle().
		Border(lipgloss.NormalBorder()).
		BorderForeground(st.ColBorder).
		Padding(0, 1).
		Width(width - 4).
		MarginBottom(1)
	if selected {
		style = style.BorderForeground(st.ColAccent)
	}
	return style.Render(card)
}
