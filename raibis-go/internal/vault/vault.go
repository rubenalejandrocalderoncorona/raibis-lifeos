package vault

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// Vault manages the LifeOS Markdown file store.
// Each note and resource has a canonical .md file here.
// SQLite holds only metadata + file_path; this package owns file I/O.
type Vault struct {
	Root string // absolute path, e.g. /Users/alice/LifeOS_Vault

	foldersMu sync.RWMutex
	// recordFolders maps a single record (key "{entityType}:{id}") to the
	// workspace subfolder its file currently lives under (e.g. "Work"), so
	// {root}/raibis/{entityType}/ becomes {root}/raibis/{folder}/{entityType}/
	// for that one record. A record can only ever belong to one workspace at
	// a time, but different records of the SAME entity type can be scattered
	// across different workspace folders (or the top level) — kept in sync
	// with each record's own workspace_id column by the caller via
	// SetRecordFolders; the vault package itself has no DB access.
	recordFolders map[string]string
	// knownFolders lists every workspace subfolder currently in use, so
	// ScanEntityFiles knows which subdirectories (beyond the top-level one)
	// might hold files of a given entity type.
	knownFolders []string
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

// recordKey builds the recordFolders map key for one entity record.
func recordKey(entityType string, id int64) string {
	return fmt.Sprintf("%s:%d", entityType, id)
}

// recordFolder returns the workspace subfolder currently assigned to one
// specific record, or "" if it's unassigned (top-level).
func (v *Vault) recordFolder(entityType string, id int64) string {
	v.foldersMu.RLock()
	defer v.foldersMu.RUnlock()
	return v.recordFolders[recordKey(entityType, id)]
}

// entityDir returns the directory holding one record's file, honoring its
// current workspace-folder assignment (if any).
func (v *Vault) entityDir(entityType string, id int64) string {
	if folder := v.recordFolder(entityType, id); folder != "" {
		return filepath.Join(v.Root, "raibis", folder, entityType)
	}
	return filepath.Join(v.Root, "raibis", entityType)
}

// SetRecordFolders replaces the record → workspace-subfolder map that
// EntityFilePath/ScanEntityFiles consult, plus the full list of currently
// known workspace folder names (so ScanEntityFiles knows where else to look
// besides the top level). Call MoveEntityFile for every record whose folder
// actually changed BEFORE calling this, so in-flight reads never land
// between the old and new locations.
func (v *Vault) SetRecordFolders(records map[string]string, knownFolders []string) {
	cp := make(map[string]string, len(records))
	for k, val := range records {
		cp[k] = val
	}
	folders := make([]string, len(knownFolders))
	copy(folders, knownFolders)
	v.foldersMu.Lock()
	v.recordFolders = cp
	v.knownFolders = folders
	v.foldersMu.Unlock()
}

// RecordFolders returns a copy of the current record → workspace-subfolder
// map, so a caller can diff against a freshly computed one before swapping.
func (v *Vault) RecordFolders() map[string]string {
	v.foldersMu.RLock()
	defer v.foldersMu.RUnlock()
	cp := make(map[string]string, len(v.recordFolders))
	for k, val := range v.recordFolders {
		cp[k] = val
	}
	return cp
}

// MoveEntityFile physically relocates a single record's file from its
// oldFolder-prefixed path to newFolder's, creating the destination directory
// as needed. A no-op if the two folders are the same or no file exists yet.
func (v *Vault) MoveEntityFile(entityType string, id int64, oldFolder, newFolder string) error {
	if oldFolder == newFolder {
		return nil
	}
	name := fmt.Sprintf("%s-%d.md", entityType, id)
	oldDir := filepath.Join(v.Root, "raibis", oldFolder, entityType)
	if oldFolder == "" {
		oldDir = filepath.Join(v.Root, "raibis", entityType)
	}
	newDir := filepath.Join(v.Root, "raibis", newFolder, entityType)
	if newFolder == "" {
		newDir = filepath.Join(v.Root, "raibis", entityType)
	}
	oldPath := filepath.Join(oldDir, name)
	if _, err := os.Stat(oldPath); os.IsNotExist(err) {
		return nil
	}
	if err := os.MkdirAll(newDir, 0o755); err != nil {
		return fmt.Errorf("vault: move %s: mkdir %q: %w", name, newDir, err)
	}
	if err := os.Rename(oldPath, filepath.Join(newDir, name)); err != nil {
		return fmt.Errorf("vault: move %s: rename: %w", name, err)
	}
	return nil
}

// SanitizeFolderName strips filesystem-unsafe characters from a
// user-provided name (e.g. a workspace name) so it can be used as a vault
// subfolder. Spaces, case, and emoji are preserved — only characters illegal
// in file/folder names on common filesystems are removed.
func SanitizeFolderName(name string) string {
	name = strings.Map(func(r rune) rune {
		if strings.ContainsRune(`/\:*?"<>|`, r) {
			return -1
		}
		return r
	}, name)
	name = strings.TrimSpace(name)
	name = strings.Trim(name, ".")
	if name == "" {
		name = "workspace"
	}
	return name
}

// EntityFilePath returns the deterministic vault path for a Raibis entity.
// Format: {root}/raibis/{entityType}/{entityType}-{id}.md, or
// {root}/raibis/{workspaceFolder}/{entityType}/{entityType}-{id}.md when this
// specific record is currently assigned to a workspace.
func (v *Vault) EntityFilePath(entityType string, id int64) string {
	dir := v.entityDir(entityType, id)
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

// ParseFrontmatter extracts YAML frontmatter from markdown content.
// Returns a key→value map and the body text after the closing ---.
// Values are returned as raw strings (quoted strings are unquoted).
func ParseFrontmatter(content string) (props map[string]string, body string) {
	if !strings.HasPrefix(content, "---\n") {
		return nil, content
	}
	rest := content[4:]
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return nil, content
	}
	fm := rest[:end]
	body = ""
	if len(rest) > end+4 {
		body = strings.TrimPrefix(rest[end+4:], "\n")
	}
	props = make(map[string]string)
	for _, line := range strings.Split(fm, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.Index(line, ": ")
		if idx < 0 {
			continue
		}
		k := strings.TrimSpace(line[:idx])
		v := strings.TrimSpace(line[idx+2:])
		if len(v) >= 2 && v[0] == '"' && v[len(v)-1] == '"' {
			v = v[1 : len(v)-1]
			v = strings.ReplaceAll(v, `\"`, `"`)
			v = strings.ReplaceAll(v, `\n`, "\n")
		}
		props[k] = v
	}
	return props, body
}

// ScanEntityFiles returns parsed frontmatter maps from every .md file for
// entityType, across the top-level {vault}/raibis/{entityType}/ directory
// AND every known workspace subfolder's {vault}/raibis/{folder}/{entityType}/
// — since different records of the same type can be scattered across
// different workspaces (or none). Files without a valid "id" field are
// skipped.
func (v *Vault) ScanEntityFiles(entityType string) ([]map[string]string, error) {
	v.foldersMu.RLock()
	folders := make([]string, len(v.knownFolders))
	copy(folders, v.knownFolders)
	v.foldersMu.RUnlock()

	var results []map[string]string
	dirs := append([]string{""}, folders...)
	for _, folder := range dirs {
		dir := filepath.Join(v.Root, "raibis", entityType)
		if folder != "" {
			dir = filepath.Join(v.Root, "raibis", folder, entityType)
		}
		entries, err := os.ReadDir(dir)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("vault: scan %s: %w", entityType, err)
		}
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
				continue
			}
			b, err := os.ReadFile(filepath.Join(dir, e.Name()))
			if err != nil {
				continue
			}
			props, _ := ParseFrontmatter(string(b))
			if props != nil && props["id"] != "" {
				results = append(results, props)
			}
		}
	}
	return results, nil
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
			if strings.ContainsAny(val, ":\n\"'#[]") {
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
