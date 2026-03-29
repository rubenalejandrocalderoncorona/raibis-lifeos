package vault

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// Vault manages the LifeOS Markdown file store.
// Each note and resource has a canonical .md file here.
// SQLite holds only metadata + file_path; this package owns file I/O.
type Vault struct {
	Root string // absolute path, e.g. /Users/alice/LifeOS_Vault
}

// New opens (or creates) the vault at root.
// If root is empty, LIFEOS_VAULT env var is checked, then ~/LifeOS_Vault.
func New(root string) (*Vault, error) {
	if root == "" {
		root = os.Getenv("LIFEOS_VAULT")
	}
	if root == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("vault: cannot resolve home dir: %w", err)
		}
		root = filepath.Join(home, "LifeOS_Vault")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("vault: cannot create root %s: %w", root, err)
	}
	return &Vault{Root: root}, nil
}

// ── Sub-directories ────────────────────────────────────────────────────────

func (v *Vault) noteDir() string  { return v.ensureDir("notes") }
func (v *Vault) resDir() string   { return v.ensureDir("resources") }

func (v *Vault) ensureDir(sub string) string {
	d := filepath.Join(v.Root, sub)
	os.MkdirAll(d, 0o755) //nolint:errcheck — best-effort; error surfaces on WriteFile
	return d
}

// ── Path generation ────────────────────────────────────────────────────────

// NoteFilePath returns the canonical path for a new note file.
// Format: notes/<slug>-<unix_sec>.md
func (v *Vault) NoteFilePath(title string) string {
	return filepath.Join(v.noteDir(), fmt.Sprintf("%s-%d.md", slugify(title), time.Now().Unix()))
}

// ResourceFilePath returns the canonical path for a new resource file.
// Format: resources/<slug>-<unix_sec>.md
func (v *Vault) ResourceFilePath(title string) string {
	return filepath.Join(v.resDir(), fmt.Sprintf("%s-%d.md", slugify(title), time.Now().Unix()))
}

// ── File I/O ───────────────────────────────────────────────────────────────

// ReadFile reads the file at path and returns its content as a string.
// Returns ("", nil) when path is empty or the file no longer exists —
// the caller decides whether that is an error.
func (v *Vault) ReadFile(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	b, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("vault: read %q: %w", path, err)
	}
	return string(b), nil
}

// WriteFile atomically writes content to path.
// Parent directories are created as needed.
func (v *Vault) WriteFile(path, content string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("vault: mkdir %q: %w", filepath.Dir(path), err)
	}
	// Write to a temp file then rename so concurrent readers never see a partial write.
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		return fmt.Errorf("vault: write tmp %q: %w", tmp, err)
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp) //nolint:errcheck
		return fmt.Errorf("vault: rename %q → %q: %w", tmp, path, err)
	}
	return nil
}

// DeleteFile removes the file at path.
// A missing file is treated as success (idempotent).
func (v *Vault) DeleteFile(path string) error {
	if path == "" {
		return nil
	}
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("vault: delete %q: %w", path, err)
	}
	return nil
}

// ── Helpers ────────────────────────────────────────────────────────────────

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

// slugify converts a title to a lowercase, hyphenated filename fragment.
// "My Goal: Fitness!" → "my-goal-fitness"  (max 40 chars)
func slugify(s string) string {
	s = strings.ToLower(s)
	s = nonAlphaNum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "note"
	}
	if len(s) > 40 {
		s = s[:40]
	}
	return strings.TrimRight(s, "-")
}
