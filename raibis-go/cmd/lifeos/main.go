package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}
	switch os.Args[1] {
	case "server":
		runServer(os.Args[2:])
	case "tui":
		runTUI(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand: %q\n\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Fprintln(os.Stderr, `Usage: lifeos <command> [flags]

Commands:
  server   Start the HTTP API server (listens on a Unix socket by default)
           --socket <path>   Unix domain socket path (default: ~/.local/share/raibis/lifeos.sock)
           --db     <path>   SQLite database path    (default: ~/.local/share/raibis/lifeos.db)
           --vault  <path>   Vault root directory    (default: ~/LifeOS_Vault)
           --port   <port>   Also bind TCP port for the web GUI (e.g. 3344)

  tui      Launch the terminal user interface
           --db     <path>   SQLite database path    (default: ~/.local/share/raibis/lifeos.db)`)
}
