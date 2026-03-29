package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/raibis/raibis-go/internal/cmdutil"
	"github.com/raibis/raibis-go/internal/service"
	"github.com/raibis/raibis-go/internal/storage"
	"github.com/raibis/raibis-go/internal/tui"
)

func runTUI(args []string) {
	fs := flag.NewFlagSet("tui", flag.ExitOnError)
	dbFlag := fs.String("db", cmdutil.DefaultDBPath(), "SQLite database path")
	fs.Parse(args) //nolint:errcheck — ExitOnError handles it

	store, err := storage.Open(*dbFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "lifeos tui: cannot open database %s: %v\n", *dbFlag, err)
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
