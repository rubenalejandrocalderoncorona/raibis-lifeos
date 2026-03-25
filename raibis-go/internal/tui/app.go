package tui

import (
	"fmt"

	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/service"
	st "github.com/raibis/raibis-go/internal/tui/styles"
	"github.com/raibis/raibis-go/internal/tui/overlay"
	"github.com/raibis/raibis-go/internal/tui/views"
)

// ── Messages ──────────────────────────────────────────────────────────────────

type loadedMsg struct {
	tasks    []*domain.Task
	goals    []*domain.Goal
	projects []*domain.Project
	err      error
}

type errMsg struct{ err error }

// ── View indices ──────────────────────────────────────────────────────────────

const (
	viewDashboard = iota
	viewKanban
	viewGoals
	viewProjects
	viewSprint
	viewResources
	viewCount
)

var viewNames = [viewCount]string{
	"Dashboard", "Kanban", "Goals", "Projects", "Sprint", "Resources",
}

// ── View interface ────────────────────────────────────────────────────────────

type dataView interface {
	tea.Model
	SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) dataView
	SetSize(w, h int) dataView
}

// ── Wrapper to satisfy dataView interface ─────────────────────────────────────

type dashWrapper struct{ v views.Dashboard }

func (w dashWrapper) Init() tea.Cmd { return w.v.Init() }
func (w dashWrapper) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	m, c := w.v.Update(msg)
	w.v = m.(views.Dashboard)
	return w, c
}
func (w dashWrapper) View() string { return w.v.View() }
func (w dashWrapper) SetData(t []*domain.Task, g []*domain.Goal, p []*domain.Project) dataView {
	w.v = w.v.SetData(t, g, p)
	return w
}
func (w dashWrapper) SetSize(width, h int) dataView { w.v = w.v.SetSize(width, h); return w }

type kanbanWrapper struct{ v views.Kanban }

func (w kanbanWrapper) Init() tea.Cmd { return w.v.Init() }
func (w kanbanWrapper) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	m, c := w.v.Update(msg)
	w.v = m.(views.Kanban)
	return w, c
}
func (w kanbanWrapper) View() string { return w.v.View() }
func (w kanbanWrapper) SetData(t []*domain.Task, g []*domain.Goal, p []*domain.Project) dataView {
	w.v = w.v.SetData(t, g, p)
	return w
}
func (w kanbanWrapper) SetSize(width, h int) dataView { w.v = w.v.SetSize(width, h); return w }

type goalsWrapper struct{ v views.Goals }

func (w goalsWrapper) Init() tea.Cmd { return w.v.Init() }
func (w goalsWrapper) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	m, c := w.v.Update(msg)
	w.v = m.(views.Goals)
	return w, c
}
func (w goalsWrapper) View() string { return w.v.View() }
func (w goalsWrapper) SetData(t []*domain.Task, g []*domain.Goal, p []*domain.Project) dataView {
	w.v = w.v.SetData(t, g, p)
	return w
}
func (w goalsWrapper) SetSize(width, h int) dataView { w.v = w.v.SetSize(width, h); return w }

type projectsWrapper struct{ v views.Projects }

func (w projectsWrapper) Init() tea.Cmd { return w.v.Init() }
func (w projectsWrapper) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	m, c := w.v.Update(msg)
	w.v = m.(views.Projects)
	return w, c
}
func (w projectsWrapper) View() string { return w.v.View() }
func (w projectsWrapper) SetData(t []*domain.Task, g []*domain.Goal, p []*domain.Project) dataView {
	w.v = w.v.SetData(t, g, p)
	return w
}
func (w projectsWrapper) SetSize(width, h int) dataView { w.v = w.v.SetSize(width, h); return w }

type sprintWrapper struct{ v views.SprintView }

func (w sprintWrapper) Init() tea.Cmd { return w.v.Init() }
func (w sprintWrapper) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	m, c := w.v.Update(msg)
	w.v = m.(views.SprintView)
	return w, c
}
func (w sprintWrapper) View() string { return w.v.View() }
func (w sprintWrapper) SetData(t []*domain.Task, g []*domain.Goal, p []*domain.Project) dataView {
	w.v = w.v.SetData(t, g, p)
	return w
}
func (w sprintWrapper) SetSize(width, h int) dataView { w.v = w.v.SetSize(width, h); return w }

type resourcesWrapper struct{ v views.ResourcesView }

func (w resourcesWrapper) Init() tea.Cmd { return w.v.Init() }
func (w resourcesWrapper) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	m, c := w.v.Update(msg)
	w.v = m.(views.ResourcesView)
	return w, c
}
func (w resourcesWrapper) View() string { return w.v.View() }
func (w resourcesWrapper) SetData(t []*domain.Task, g []*domain.Goal, p []*domain.Project) dataView {
	w.v = w.v.SetData(t, g, p)
	return w
}
func (w resourcesWrapper) SetSize(width, h int) dataView { w.v = w.v.SetSize(width, h); return w }

// ── Root App Model ────────────────────────────────────────────────────────────

// App is the root Bubble Tea model.
type App struct {
	svc         service.TaskService
	views       [viewCount]dataView
	currentView int
	capture     overlay.Model
	width       int
	height      int
	statusMsg   string
	err         error

	// cached data
	tasks    []*domain.Task
	goals    []*domain.Goal
	projects []*domain.Project
}

// New creates a new App backed by the given TaskService.
func New(svc service.TaskService) *App {
	a := &App{
		svc:     svc,
		capture: overlay.New(),
	}
	a.views[viewDashboard] = dashWrapper{v: views.NewDashboard()}
	a.views[viewKanban] = kanbanWrapper{v: views.NewKanban()}
	a.views[viewGoals] = goalsWrapper{v: views.NewGoals()}
	a.views[viewProjects] = projectsWrapper{v: views.NewProjects()}
	a.views[viewSprint] = sprintWrapper{v: views.NewSprintView()}
	a.views[viewResources] = resourcesWrapper{v: views.NewResourcesView()}
	return a
}

func (a *App) Init() tea.Cmd {
	return a.loadData()
}

func (a *App) loadData() tea.Cmd {
	return func() tea.Msg {
		tasks, err := a.svc.List(domain.TaskFilter{TopLevelOnly: true})
		if err != nil {
			return errMsg{err}
		}
		goals, err := a.svc.Goals()
		if err != nil {
			return errMsg{err}
		}
		projects, err := a.svc.Projects()
		if err != nil {
			return errMsg{err}
		}
		return loadedMsg{tasks: tasks, goals: goals, projects: projects}
	}
}

func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	// Handle capture overlay first — it intercepts key input when visible.
	if a.capture.Visible() {
		var cmd tea.Cmd
		a.capture, cmd = a.capture.Update(msg)

		switch msg.(type) {
		case overlay.SubmitMsg:
			input := msg.(overlay.SubmitMsg).Input
			_, err := a.svc.QuickCapture(input)
			if err != nil {
				a.statusMsg = "Error: " + err.Error()
			} else {
				a.statusMsg = "Task captured!"
			}
			return a, tea.Batch(cmd, a.loadData())
		case overlay.DismissMsg:
			a.statusMsg = ""
		}
		return a, cmd
	}

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		for i := range a.views {
			a.views[i] = a.views[i].SetSize(msg.Width, msg.Height-4)
		}
		a.capture = a.capture.SetWidth(msg.Width - 4)

	case loadedMsg:
		if msg.err != nil {
			a.err = msg.err
			return a, nil
		}
		a.tasks = msg.tasks
		a.goals = msg.goals
		a.projects = msg.projects
		for i := range a.views {
			a.views[i] = a.views[i].SetData(a.tasks, a.goals, a.projects)
		}

	case errMsg:
		a.err = msg.err
		return a, nil

	case tea.KeyMsg:
		switch {
		case key.Matches(msg, Keys.Quit):
			return a, tea.Quit
		case key.Matches(msg, Keys.Capture):
			a.capture = a.capture.Open()
			return a, nil
		case key.Matches(msg, Keys.View1):
			a.currentView = viewDashboard
		case key.Matches(msg, Keys.View2):
			a.currentView = viewKanban
		case key.Matches(msg, Keys.View3):
			a.currentView = viewGoals
		case key.Matches(msg, Keys.View4):
			a.currentView = viewProjects
		case key.Matches(msg, Keys.View5):
			a.currentView = viewSprint
		case key.Matches(msg, Keys.View6):
			a.currentView = viewResources
		default:
			// Delegate to current view
			var cmd tea.Cmd
			a.views[a.currentView], cmd = func() (dataView, tea.Cmd) {
				m, c := a.views[a.currentView].Update(msg)
				return m.(dataView), c
			}()
			return a, cmd
		}
	}

	return a, nil
}

func (a *App) View() string {
	if a.err != nil {
		return st.StyleDanger.Render("Error: " + a.err.Error()) + "\n\nPress q to quit."
	}

	// ── Tab bar
	var tabs []string
	for i, name := range viewNames {
		label := fmt.Sprintf(" %d %s ", i+1, name)
		if i == a.currentView {
			tabs = append(tabs, st.StyleActiveBorder.Copy().
				BorderBottom(false).
				Foreground(st.ColAccent).
				Render(label))
		} else {
			tabs = append(tabs, st.StyleDim.Render(label))
		}
	}
	tabBar := lipgloss.JoinHorizontal(lipgloss.Top, tabs...)

	// ── Main content
	content := a.views[a.currentView].View()

	// ── Status / help bar
	help := st.StyleDim.Render("1-6: switch  j/k: nav  space/:: capture  q: quit")
	if a.statusMsg != "" {
		help = st.StyleSuccess.Render("✓ " + a.statusMsg)
	}

	// ── Capture overlay (rendered at bottom if visible)
	captureView := a.capture.View()

	main := tabBar + "\n" + content
	if captureView != "" {
		main += "\n" + captureView
	}
	main += "\n" + help

	return main
}
