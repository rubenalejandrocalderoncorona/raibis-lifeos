package styles

import "github.com/charmbracelet/lipgloss"

// Colour palette — dark theme inspired by the existing raibis GUI.
var (
	ColBg      = lipgloss.Color("#0f1923")
	ColCard    = lipgloss.Color("#162030")
	ColBorder  = lipgloss.Color("#1e3a5f")
	ColAccent  = lipgloss.Color("#378ADD")
	ColMuted   = lipgloss.Color("#5a8ab0")
	ColDim     = lipgloss.Color("#2a4a6a")
	ColSuccess = lipgloss.Color("#6dcc8a")
	ColWarning = lipgloss.Color("#d4a84b")
	ColDanger  = lipgloss.Color("#e07070")
	ColText    = lipgloss.Color("#d8e8f5")
)

// Shared Lip Gloss styles.
var (
	StyleTitle = lipgloss.NewStyle().
			Bold(true).
			Foreground(ColAccent)

	StyleMuted = lipgloss.NewStyle().
			Foreground(ColMuted)

	StyleDim = lipgloss.NewStyle().
			Foreground(ColDim)

	StyleBold = lipgloss.NewStyle().
			Bold(true).
			Foreground(ColText)

	StyleAccent = lipgloss.NewStyle().
			Foreground(ColAccent)

	StyleSuccess = lipgloss.NewStyle().
			Foreground(ColSuccess)

	StyleWarning = lipgloss.NewStyle().
			Foreground(ColWarning)

	StyleDanger = lipgloss.NewStyle().
			Foreground(ColDanger)

	StyleBorder = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColBorder)

	StyleActiveBorder = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(ColAccent)

	StyleHeader = lipgloss.NewStyle().
			Background(ColCard).
			Foreground(ColMuted).
			Bold(true).
			Padding(0, 1)
)

// PriorityColor returns a Lip Gloss style coloured by task priority.
func PriorityStyle(p string) lipgloss.Style {
	switch p {
	case "urgent":
		return StyleDanger.Copy().Bold(true)
	case "high":
		return StyleDanger.Copy()
	case "medium":
		return StyleWarning.Copy()
	default:
		return StyleMuted.Copy()
	}
}

// StatusStyle returns a Lip Gloss style for a task status badge.
func StatusStyle(s string) lipgloss.Style {
	switch s {
	case "done":
		return StyleSuccess.Copy()
	case "in_progress":
		return StyleAccent.Copy()
	case "blocked":
		return StyleDanger.Copy()
	default:
		return StyleMuted.Copy()
	}
}

// ProgressBar renders a text progress bar.
// e.g. width=20, pct=40 → "████████░░░░░░░░░░░░ 40%"
func ProgressBar(pct, width int) string {
	if pct < 0 {
		pct = 0
	}
	if pct > 100 {
		pct = 100
	}
	filled := pct * width / 100
	bar := ""
	for i := 0; i < filled; i++ {
		bar += "█"
	}
	for i := filled; i < width; i++ {
		bar += "░"
	}
	return StyleAccent.Render(bar) + StyleMuted.Render(" "+itoa(pct)+"%")
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
