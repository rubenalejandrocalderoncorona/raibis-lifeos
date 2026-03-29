package cmdutil

import (
	"os"
	"path/filepath"
)

// DefaultDBPath returns the resolved SQLite database path.
// Checks LIFEOS_DB env var, then falls back to ~/.local/share/raibis/lifeos.db.
func DefaultDBPath() string {
	if p := os.Getenv("LIFEOS_DB"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "lifeos.db"
	}
	return filepath.Join(home, ".local", "share", "raibis", "lifeos.db")
}

// DefaultSocketPath returns the resolved Unix domain socket path.
// Checks LIFEOS_SOCK env var, then falls back to ~/.local/share/raibis/lifeos.sock.
func DefaultSocketPath() string {
	if p := os.Getenv("LIFEOS_SOCK"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "lifeos.sock"
	}
	return filepath.Join(home, ".local", "share", "raibis", "lifeos.sock")
}

// DefaultVaultPath returns the resolved vault root directory.
// Checks LIFEOS_VAULT env var, then falls back to ~/LifeOS_Vault.
func DefaultVaultPath() string {
	if p := os.Getenv("LIFEOS_VAULT"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "LifeOS_Vault"
	}
	return filepath.Join(home, "LifeOS_Vault")
}
