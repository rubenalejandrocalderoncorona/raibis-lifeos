package views

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/raibis/raibis-go/internal/domain"
	st "github.com/raibis/raibis-go/internal/tui/styles"
)

// ResourcesView is a placeholder — resources live in the DB but the TUI
// focuses on tasks. This view shows a summary table.
type ResourcesView struct {
	tasks    []*domain.Task
	projects []*domain.Project
	width    int
}

func NewResourcesView() ResourcesView { return ResourcesView{} }

func (r ResourcesView) SetData(tasks []*domain.Task, goals []*domain.Goal, projects []*domain.Project) ResourcesView {
	r.tasks = tasks
	r.projects = projects
	return r
}

func (r ResourcesView) SetSize(w, h int) ResourcesView { r.width = w; return r }
func (r ResourcesView) Init() tea.Cmd                  { return nil }

func (r ResourcesView) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	return r, nil
}

func (r ResourcesView) View() string {
	title := st.StyleTitle.Render("⬡ Resources")
	info := st.StyleMuted.Render("Resources are managed via the GUI or REST API.")
	note := st.StyleDim.Render(fmt.Sprintf(
		"  Tip: run  go run ./cmd/server  then open http://localhost:3344\n"+
			"  to manage notes, links, files, and ideas attached to your tasks.\n\n"+
			"  Current DB has %d tasks across %d projects.",
		len(r.tasks), len(r.projects),
	))
	return title + "\n\n" + info + "\n\n" + note
}
