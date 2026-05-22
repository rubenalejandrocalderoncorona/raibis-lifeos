// Package sync provides bidirectional sync between the page store and an
// Obsidian vault on disk.
//
// Each page maps to one .md file:
//   - body → file body (everything after the YAML frontmatter block)
//   - properties → YAML frontmatter fields
//   - page.ID → frontmatter "id:" field (source of truth for matching)
//   - page.Title → frontmatter "title:" field + used as filename
//
// Sync directions:
//   - Store → disk: called after any page write via ExportPage.
//   - Disk → store: fsnotify watcher fires on create/write/rename/remove.
//
// File layout inside the vault root:
//
//	<vault_root>/<database_title>/<slug>-<id_prefix>.md
//
// The sync goroutine runs until ctx is cancelled.
package sync

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/storage"
)

// Syncer handles bidirectional sync for one vault.
type Syncer struct {
	store     storage.Storage
	vaultPath string
	vaultID   int64

	// debounce disk → store writes to avoid feedback loops
	mu        sync.Mutex
	debounce  map[string]*time.Timer

	// set of file paths currently being written by store→disk to suppress watcher
	writing   sync.Map
}

// New creates a Syncer for the given vault.
func New(store storage.Storage, vaultID int64, vaultPath string) *Syncer {
	return &Syncer{
		store:     store,
		vaultPath: vaultPath,
		vaultID:   vaultID,
		debounce:  make(map[string]*time.Timer),
	}
}

// Run starts the fsnotify watcher and blocks until ctx is cancelled.
// It also performs an initial full sync (store → disk) on startup.
func (s *Syncer) Run(ctx context.Context) error {
	if err := s.FullExport(ctx); err != nil {
		log.Printf("obsidian sync: initial export error: %v", err)
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("fsnotify: %w", err)
	}
	defer watcher.Close()

	// Watch vault root recursively (fsnotify v1.7+ supports recursive watches on
	// most platforms; fall back to single-dir watch if not available).
	if err := watchRecursive(watcher, s.vaultPath); err != nil {
		return fmt.Errorf("watch vault %s: %w", s.vaultPath, err)
	}

	log.Printf("obsidian sync: watching %s", s.vaultPath)

	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-watcher.Events:
			if !ok {
				return nil
			}
			if !strings.HasSuffix(event.Name, ".md") {
				continue
			}
			// Skip files we are currently writing to avoid ping-pong.
			if _, skipping := s.writing.Load(event.Name); skipping {
				continue
			}
			s.scheduleImport(ctx, event)
		case err, ok := <-watcher.Errors:
			if !ok {
				return nil
			}
			log.Printf("obsidian sync watcher error: %v", err)
		}
	}
}

// scheduleImport debounces rapid successive disk events (e.g. editor saves)
// before calling importFile/removeFile.
func (s *Syncer) scheduleImport(ctx context.Context, event fsnotify.Event) {
	const delay = 300 * time.Millisecond

	s.mu.Lock()
	if t, ok := s.debounce[event.Name]; ok {
		t.Stop()
	}
	s.debounce[event.Name] = time.AfterFunc(delay, func() {
		s.mu.Lock()
		delete(s.debounce, event.Name)
		s.mu.Unlock()

		if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
			if err := s.handleRemove(ctx, event.Name); err != nil {
				log.Printf("obsidian sync remove %s: %v", event.Name, err)
			}
		} else {
			if err := s.handleWrite(ctx, event.Name); err != nil {
				log.Printf("obsidian sync import %s: %v", event.Name, err)
			}
		}
	})
	s.mu.Unlock()
}

// ── Disk → Store ──────────────────────────────────────────────────────────────

// handleWrite reads an .md file from disk and upserts it into the store.
func (s *Syncer) handleWrite(ctx context.Context, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	front, body := splitFrontmatter(string(data))
	id := front["id"]

	if id != "" {
		// existing page — patch title + body + properties
		existing, err := s.store.GetPage(id)
		if err != nil {
			// page not found in store — treat as new
			return s.createFromDisk(ctx, path, front, body)
		}
		if t, ok := front["title"]; ok && t != "" {
			existing.Title = t
		}
		existing.Body = body
		if err := s.store.UpdatePage(existing); err != nil {
			return fmt.Errorf("update page %s: %w", id, err)
		}
		props := frontmatterToProps(front)
		if len(props) > 0 {
			if err := s.store.PatchProperties(id, props); err != nil {
				return fmt.Errorf("patch props %s: %w", id, err)
			}
		}
		return nil
	}

	// new file — create page
	return s.createFromDisk(ctx, path, front, body)
}

func (s *Syncer) createFromDisk(_ context.Context, path string, front map[string]string, body string) error {
	title := front["title"]
	if title == "" {
		title = strings.TrimSuffix(filepath.Base(path), ".md")
	}

	// Try to infer database_id from parent directory name
	dbID := s.resolveDatabaseIDFromPath(path)

	p := &domain.Page{
		Title: title,
		Body:  body,
	}
	if dbID != "" {
		p.DatabaseID = &dbID
	}

	id, err := s.store.CreatePage(p)
	if err != nil {
		return fmt.Errorf("create page from disk: %w", err)
	}

	// Write the id back into the file so future edits are matched correctly.
	front["id"] = id
	front["title"] = title
	newContent := renderFrontmatter(front) + body
	s.writeWithSuppress(path, newContent)

	props := frontmatterToProps(front)
	if len(props) > 0 {
		s.store.PatchProperties(id, props) //nolint:errcheck
	}
	return nil
}

// handleRemove archives a page when its file is deleted/renamed from disk.
func (s *Syncer) handleRemove(_ context.Context, path string) error {
	// We can only identify the page by scanning frontmatter of our known pages.
	// For delete events the file is already gone, so we search by path convention.
	// Best effort: try to match by filename slug against known pages.
	// If we stored the path in a property we could look it up directly;
	// for now we do nothing — the page stays in the store (not archived).
	// A future enhancement could store "vault_path" as a property.
	log.Printf("obsidian sync: file removed %s (page not archived — no path index)", path)
	return nil
}

// ── Store → Disk ──────────────────────────────────────────────────────────────

// ExportPage writes a single page to disk as an .md file.
// Idempotent: overwrites the existing file if present.
func (s *Syncer) ExportPage(p *domain.Page) error {
	path := s.pageFilePath(p)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	props, _ := s.store.GetProperties(p.ID)
	front := propsToFrontmatter(props)
	front["id"] = p.ID
	front["title"] = p.Title
	if p.Icon != "" {
		front["icon"] = p.Icon
	}

	content := renderFrontmatter(front) + p.Body
	s.writeWithSuppress(path, content)
	return nil
}

// FullExport writes all non-archived pages to disk.
func (s *Syncer) FullExport(_ context.Context) error {
	archived := false
	pages, err := s.store.ListPages(domain.PageFilter{Archived: &archived})
	if err != nil {
		return err
	}
	for _, p := range pages {
		if p.Type == domain.PageTypeDatabase {
			continue // databases are directories, not files
		}
		if err := s.ExportPage(p); err != nil {
			log.Printf("obsidian sync: export page %s: %v", p.ID, err)
		}
	}
	return nil
}

// writeWithSuppress writes content to path while suppressing the watcher event
// for that file so we don't import our own export.
func (s *Syncer) writeWithSuppress(path, content string) {
	s.writing.Store(path, struct{}{})
	defer func() {
		time.AfterFunc(500*time.Millisecond, func() {
			s.writing.Delete(path)
		})
	}()

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		log.Printf("obsidian sync write %s: %v", path, err)
		return
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp) //nolint:errcheck
		log.Printf("obsidian sync rename %s: %v", path, err)
	}
}

// pageFilePath returns the canonical disk path for a page:
//
//	<vault>/<database_title>/<slug>-<id_prefix>.md  (for database rows)
//	<vault>/pages/<slug>-<id_prefix>.md             (for standalone pages)
func (s *Syncer) pageFilePath(p *domain.Page) string {
	idPrefix := p.ID
	if len(idPrefix) > 8 {
		idPrefix = idPrefix[:8]
	}
	filename := slugify(p.Title) + "-" + idPrefix + ".md"

	if p.DatabaseID != nil {
		db, err := s.store.GetPage(*p.DatabaseID)
		if err == nil {
			return filepath.Join(s.vaultPath, slugify(db.Title), filename)
		}
	}
	return filepath.Join(s.vaultPath, "pages", filename)
}

// resolveDatabaseIDFromPath infers a database_id from the parent directory name
// by matching it against existing database titles.
func (s *Syncer) resolveDatabaseIDFromPath(path string) string {
	dirName := filepath.Base(filepath.Dir(path))
	dbType := domain.PageTypeDatabase
	dbs, err := s.store.ListPages(domain.PageFilter{Type: &dbType})
	if err != nil {
		return ""
	}
	for _, db := range dbs {
		if slugify(db.Title) == dirName || strings.EqualFold(db.Title, dirName) {
			return db.ID
		}
	}
	return ""
}

// ── Frontmatter parsing ───────────────────────────────────────────────────────

var frontmatterRe = regexp.MustCompile(`(?s)^---\n(.*?)\n---\n?`)

// splitFrontmatter separates YAML frontmatter from body.
// Returns an empty map if no frontmatter present.
func splitFrontmatter(content string) (front map[string]string, body string) {
	front = make(map[string]string)
	m := frontmatterRe.FindStringSubmatch(content)
	if m == nil {
		return front, content
	}
	body = content[len(m[0]):]
	for _, line := range strings.Split(m[1], "\n") {
		idx := strings.IndexByte(line, ':')
		if idx < 0 {
			continue
		}
		k := strings.TrimSpace(line[:idx])
		v := strings.TrimSpace(line[idx+1:])
		// strip surrounding quotes
		if len(v) >= 2 && v[0] == '"' && v[len(v)-1] == '"' {
			v = v[1 : len(v)-1]
		}
		front[k] = v
	}
	return front, body
}

// renderFrontmatter serialises the map back to a YAML block.
// Keys are sorted deterministically: id and title first, rest alphabetically.
func renderFrontmatter(front map[string]string) string {
	if len(front) == 0 {
		return ""
	}
	first := []string{"id", "title", "icon"}
	seen := map[string]bool{}
	var lines []string
	for _, k := range first {
		if v, ok := front[k]; ok {
			lines = append(lines, fmt.Sprintf("%s: %s", k, yamlVal(v)))
			seen[k] = true
		}
	}
	// remaining keys in stable order
	remaining := make([]string, 0, len(front))
	for k := range front {
		if !seen[k] {
			remaining = append(remaining, k)
		}
	}
	sortStrings(remaining)
	for _, k := range remaining {
		lines = append(lines, fmt.Sprintf("%s: %s", k, yamlVal(front[k])))
	}
	return "---\n" + strings.Join(lines, "\n") + "\n---\n"
}

// frontmatterToProps filters out page-level fields and returns the rest as
// a properties map suitable for PatchProperties.
func frontmatterToProps(front map[string]string) map[string]string {
	skip := map[string]bool{"id": true, "title": true, "icon": true, "cover": true}
	props := make(map[string]string)
	for k, v := range front {
		if !skip[k] {
			props[k] = v
		}
	}
	return props
}

// propsToFrontmatter converts a properties map to a frontmatter map,
// excluding internal/page-level keys.
func propsToFrontmatter(props map[string]string) map[string]string {
	skip := map[string]bool{"id": true, "title": true}
	out := make(map[string]string)
	for k, v := range props {
		if !skip[k] {
			out[k] = v
		}
	}
	return out
}

func yamlVal(s string) string {
	if strings.ContainsAny(s, ":#{}[]|>&*!,'\"") || strings.HasPrefix(s, " ") {
		return `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
	}
	if s == "" {
		return `""`
	}
	return s
}

// ── Recursive watcher ─────────────────────────────────────────────────────────

func watchRecursive(w *fsnotify.Watcher, root string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip unreadable dirs
		}
		if info.IsDir() {
			return w.Add(path)
		}
		return nil
	})
}

// ── Sorting helpers ───────────────────────────────────────────────────────────

func sortStrings(ss []string) {
	for i := 1; i < len(ss); i++ {
		for j := i; j > 0 && ss[j] < ss[j-1]; j-- {
			ss[j], ss[j-1] = ss[j-1], ss[j]
		}
	}
}

// ── Slug ──────────────────────────────────────────────────────────────────────

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = nonAlphaNum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "page"
	}
	if len(s) > 40 {
		s = s[:40]
	}
	return strings.TrimRight(s, "-")
}
