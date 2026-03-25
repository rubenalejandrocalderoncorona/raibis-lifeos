package tui

import "github.com/charmbracelet/bubbles/key"

// Keys holds all key bindings used across the TUI.
var Keys = struct {
	// Navigation
	Up    key.Binding
	Down  key.Binding
	Left  key.Binding
	Right key.Binding

	// View switching
	View1 key.Binding
	View2 key.Binding
	View3 key.Binding
	View4 key.Binding
	View5 key.Binding
	View6 key.Binding

	// Actions
	Capture key.Binding
	Enter   key.Binding
	Escape  key.Binding
	Delete  key.Binding
	Quit    key.Binding
}{
	Up:    key.NewBinding(key.WithKeys("k", "up"), key.WithHelp("k/↑", "up")),
	Down:  key.NewBinding(key.WithKeys("j", "down"), key.WithHelp("j/↓", "down")),
	Left:  key.NewBinding(key.WithKeys("h", "left"), key.WithHelp("h/←", "prev col")),
	Right: key.NewBinding(key.WithKeys("l", "right"), key.WithHelp("l/→", "next col")),

	View1: key.NewBinding(key.WithKeys("1"), key.WithHelp("1", "Dashboard")),
	View2: key.NewBinding(key.WithKeys("2"), key.WithHelp("2", "Kanban")),
	View3: key.NewBinding(key.WithKeys("3"), key.WithHelp("3", "Goals")),
	View4: key.NewBinding(key.WithKeys("4"), key.WithHelp("4", "Projects")),
	View5: key.NewBinding(key.WithKeys("5"), key.WithHelp("5", "Sprint")),
	View6: key.NewBinding(key.WithKeys("6"), key.WithHelp("6", "Resources")),

	Capture: key.NewBinding(key.WithKeys(" ", ":"), key.WithHelp("space/:", "quick capture")),
	Enter:   key.NewBinding(key.WithKeys("enter"), key.WithHelp("enter", "confirm")),
	Escape:  key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "cancel")),
	Delete:  key.NewBinding(key.WithKeys("d"), key.WithHelp("d", "delete")),
	Quit:    key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
}
