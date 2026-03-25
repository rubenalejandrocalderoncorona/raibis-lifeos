package overlay

import (
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// SubmitMsg is sent when the user presses Enter in the capture overlay.
type SubmitMsg struct{ Input string }

// DismissMsg is sent when the user presses Esc.
type DismissMsg struct{}

var (
	overlayStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#378ADD")).
			Padding(0, 1)
	promptStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#5a8ab0"))
)

// Model is the Quick Capture one-line input overlay.
type Model struct {
	input   textinput.Model
	width   int
	visible bool
}

func New() Model {
	ti := textinput.New()
	ti.Placeholder = "Title #priority @project !YYYY-MM-DD"
	ti.CharLimit = 200
	ti.Width = 60
	return Model{input: ti}
}

func (m Model) Visible() bool { return m.visible }

func (m Model) Open() Model {
	m.visible = true
	m.input.SetValue("")
	m.input.Focus()
	return m
}

func (m Model) Close() Model {
	m.visible = false
	m.input.Blur()
	return m
}

func (m Model) SetWidth(w int) Model {
	m.width = w
	m.input.Width = w - 6
	return m
}

func (m Model) Init() tea.Cmd { return nil }

func (m Model) Update(msg tea.Msg) (Model, tea.Cmd) {
	if !m.visible {
		return m, nil
	}
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			val := m.input.Value()
			m = m.Close()
			if val != "" {
				return m, func() tea.Msg { return SubmitMsg{Input: val} }
			}
			return m, func() tea.Msg { return DismissMsg{} }
		case "esc":
			m = m.Close()
			return m, func() tea.Msg { return DismissMsg{} }
		}
	}
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

func (m Model) View() string {
	if !m.visible {
		return ""
	}
	label := promptStyle.Render("Quick Capture  ")
	return overlayStyle.Render(label + m.input.View())
}
