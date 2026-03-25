package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/raibis/raibis-go/internal/service"
	"github.com/raibis/raibis-go/internal/storage"
	"github.com/raibis/raibis-go/internal/tui"
)

func main() {
	dbPath := defaultDBPath()
	store, err := storage.Open(dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "raibis: cannot open database %s: %v\n", dbPath, err)
		os.Exit(1)
	}
	defer store.Close()

	svc := service.New(store)

	p := tea.NewProgram(
		tui.New(svc),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)
	if _, err := p.Run(); err != nil {
		log.Fatal(err)
	}
}

func defaultDBPath() string {
	if p := os.Getenv("LIFEOS_DB"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "lifeos.db"
	}
	return filepath.Join(home, ".local", "share", "raibis", "lifeos.db")
}
