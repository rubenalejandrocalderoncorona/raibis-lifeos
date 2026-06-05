package vault

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
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

// ── Entity Markdown files ──────────────────────────────────────────────────

// EntityFilePath returns the deterministic vault path for a Raibis entity.
// Format: {root}/raibis/{entityType}/{entityType}-{id}.md
func (v *Vault) EntityFilePath(entityType string, id int64) string {
	dir := filepath.Join(v.Root, "raibis", entityType)
	os.MkdirAll(dir, 0o755) //nolint:errcheck
	return filepath.Join(dir, fmt.Sprintf("%s-%d.md", entityType, id))
}

// WriteEntityMD writes YAML frontmatter + optional body for a Raibis entity.
// Errors are logged by callers; the HTTP response is never blocked on vault I/O.
func (v *Vault) WriteEntityMD(entityType string, id int64, frontmatter map[string]any, body string) error {
	path := v.EntityFilePath(entityType, id)
	content := buildFrontmatter(frontmatter)
	if body != "" {
		content += "\n" + body
	}
	return v.WriteFile(path, content)
}

// DeleteEntityMD removes the markdown file for a Raibis entity.
func (v *Vault) DeleteEntityMD(entityType string, id int64) error {
	return v.DeleteFile(v.EntityFilePath(entityType, id))
}

// buildFrontmatter serialises a map as YAML frontmatter (--- … ---).
// Keys are sorted for deterministic output; nil, zero-int, and empty-string
// values are omitted.
func buildFrontmatter(props map[string]any) string {
	keys := make([]string, 0, len(props))
	for k, val := range props {
		if val != nil {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)

	var sb strings.Builder
	sb.WriteString("---\n")
	for _, k := range keys {
		switch val := props[k].(type) {
		case string:
			if val == "" {
				continue
			}
			if strings.ContainsAny(val, ":\n\"'#") {
				escaped := strings.ReplaceAll(val, `"`, `\"`)
				escaped = strings.ReplaceAll(escaped, "\n", `\n`)
				sb.WriteString(fmt.Sprintf("%s: \"%s\"\n", k, escaped))
			} else {
				sb.WriteString(fmt.Sprintf("%s: %s\n", k, val))
			}
		case int:
			if val == 0 {
				continue
			}
			sb.WriteString(fmt.Sprintf("%s: %d\n", k, val))
		case int64:
			if val == 0 {
				continue
			}
			sb.WriteString(fmt.Sprintf("%s: %d\n", k, val))
		case float64:
			sb.WriteString(fmt.Sprintf("%s: %g\n", k, val))
		case bool:
			sb.WriteString(fmt.Sprintf("%s: %t\n", k, val))
		case []string:
			if len(val) == 0 {
				continue
			}
			quoted := make([]string, len(val))
			for i, s := range val {
				quoted[i] = fmt.Sprintf("%q", s)
			}
			sb.WriteString(fmt.Sprintf("%s: [%s]\n", k, strings.Join(quoted, ", ")))
		}
	}
	sb.WriteString("---\n")
	return sb.String()
}

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
