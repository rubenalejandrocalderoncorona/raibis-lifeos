// Package obsidian syncs raibis-lifeos legacy entities (Goals, Projects,
// Sprints, Tasks, Notes, Resources) to an Obsidian vault on disk.
//
// # Vault Layout
//
//	<vault_root>/
//	  Goals/
//	    <slug>-<id>.md
//	  Projects/
//	    <slug>-<id>.md
//	  Sprints/
//	    <slug>-<id>.md
//	  Tasks/
//	    <slug>-<id>.md
//	  Notes/
//	    <slug>-<id>.md           ← mirrors the existing vault notes dir
//	  Resources/
//	    <slug>-<id>.md
//
// Each file uses YAML frontmatter + Dataview-compatible properties followed by
// the item body.  All cross-entity links are rendered as Obsidian wikilinks so
// that the standard Obsidian graph view shows the hierarchy:
//
//	Goal ← Project ← Sprint ← Task ← Subtask
//
// # Sync direction
//
// This package is currently store→disk only (raibis is the source of truth).
// Disk→store is intentionally left as a future enhancement — editing in
// Obsidian will not overwrite the database automatically.
package obsidian

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/storage"
)

// Syncer exports legacy entities to an Obsidian vault.
type Syncer struct {
	store     storage.Storage
	vaultPath string

	// suppression set: paths currently being written so we don't trigger
	// re-import if a watcher is layered on top.
	writing sync.Map
}

// New returns a ready Syncer.
func New(store storage.Storage, vaultPath string) *Syncer {
	return &Syncer{store: store, vaultPath: vaultPath}
}

// VaultPath returns the configured vault root directory.
func (s *Syncer) VaultPath() string { return s.vaultPath }

// ── Public API ────────────────────────────────────────────────────────────────

// SyncAll exports all entities. Call this once at startup.
func (s *Syncer) SyncAll() error {
	if err := s.ensureDirs(); err != nil {
		return err
	}

	errs := []string{}

	goals, err := s.store.ListGoals("")
	if err == nil {
		for _, g := range goals {
			g.Tags, _ = s.store.GetEntityTags("goal", g.ID)
			if e := s.ExportGoal(g); e != nil {
				errs = append(errs, fmt.Sprintf("goal %d: %v", g.ID, e))
			}
		}
	}

	projects, err := s.store.ListProjects("")
	if err == nil {
		for _, p := range projects {
			p.Tags, _ = s.store.GetEntityTags("project", p.ID)
			if e := s.ExportProject(p); e != nil {
				errs = append(errs, fmt.Sprintf("project %d: %v", p.ID, e))
			}
		}
	}

	// ListSprints(0) returns all sprints across all projects
	sprints, err := s.store.ListSprints(0)
	if err == nil {
		for _, sp := range sprints {
			if e := s.ExportSprint(sp); e != nil {
				errs = append(errs, fmt.Sprintf("sprint %d: %v", sp.ID, e))
			}
		}
	}

	tasks, err := s.store.ListTasks(domain.TaskFilter{})
	if err == nil {
		for _, t := range tasks {
			t.Tags, _ = s.store.GetEntityTags("task", t.ID)
			if e := s.ExportTask(t); e != nil {
				errs = append(errs, fmt.Sprintf("task %d: %v", t.ID, e))
			}
		}
	}

	notes, err := s.store.ListNotes(nil, nil, nil)
	if err == nil {
		for _, n := range notes {
			n.Tags, _ = s.store.GetEntityTags("note", n.ID)
			if e := s.ExportNote(n); e != nil {
				errs = append(errs, fmt.Sprintf("note %d: %v", n.ID, e))
			}
		}
	}

	if len(errs) > 0 {
		log.Printf("obsidian sync: %d errors during SyncAll", len(errs))
		for _, e := range errs {
			log.Printf("  - %s", e)
		}
	}
	return nil
}

// ExportGoal writes (or overwrites) a Goal .md file to the vault.
func (s *Syncer) ExportGoal(g *domain.Goal) error {
	path := s.goalPath(g)
	return s.write(path, renderGoal(g))
}

// ExportProject writes (or overwrites) a Project .md file to the vault.
func (s *Syncer) ExportProject(p *domain.Project) error {
	path := s.projectPath(p)
	return s.write(path, renderProject(p))
}

// ExportSprint writes (or overwrites) a Sprint .md file to the vault.
func (s *Syncer) ExportSprint(sp *domain.Sprint) error {
	path := s.sprintPath(sp)
	return s.write(path, renderSprint(sp))
}

// ExportTask writes (or overwrites) a Task .md file to the vault.
func (s *Syncer) ExportTask(t *domain.Task) error {
	path := s.taskPath(t)
	return s.write(path, renderTask(t))
}

// ExportNote writes (or overwrites) a Note .md file to the vault.
// If the note already has a vault file (n.FilePath), the same content is
// replicated into the structured Notes/ folder with enriched frontmatter.
func (s *Syncer) ExportNote(n *domain.Note) error {
	path := s.notePath(n)
	return s.write(path, renderNote(n))
}

// DeleteGoal removes the vault file for a goal.
func (s *Syncer) DeleteGoal(id int64) error { return s.deleteByID("Goals", id) }

// DeleteProject removes the vault file for a project.
func (s *Syncer) DeleteProject(id int64) error { return s.deleteByID("Projects", id) }

// DeleteSprint removes the vault file for a sprint.
func (s *Syncer) DeleteSprint(id int64) error { return s.deleteByID("Sprints", id) }

// DeleteTask removes the vault file for a task.
func (s *Syncer) DeleteTask(id int64) error { return s.deleteByID("Tasks", id) }

// DeleteNote removes the vault file for a note.
func (s *Syncer) DeleteNote(id int64) error { return s.deleteByID("Notes", id) }

// ── File path helpers ─────────────────────────────────────────────────────────

func (s *Syncer) goalPath(g *domain.Goal) string {
	return filepath.Join(s.vaultPath, "Goals", slugify(g.Title)+"-"+strconv.FormatInt(g.ID, 10)+".md")
}

func (s *Syncer) projectPath(p *domain.Project) string {
	return filepath.Join(s.vaultPath, "Projects", slugify(p.Title)+"-"+strconv.FormatInt(p.ID, 10)+".md")
}

func (s *Syncer) sprintPath(sp *domain.Sprint) string {
	return filepath.Join(s.vaultPath, "Sprints", slugify(sp.Title)+"-"+strconv.FormatInt(sp.ID, 10)+".md")
}

func (s *Syncer) taskPath(t *domain.Task) string {
	return filepath.Join(s.vaultPath, "Tasks", slugify(t.Title)+"-"+strconv.FormatInt(t.ID, 10)+".md")
}

func (s *Syncer) notePath(n *domain.Note) string {
	title := n.Title
	if title == "" {
		title = fmt.Sprintf("note-%d", n.ID)
	}
	return filepath.Join(s.vaultPath, "Notes", slugify(title)+"-"+strconv.FormatInt(n.ID, 10)+".md")
}

func (s *Syncer) deleteByID(dir string, id int64) error {
	// Scan directory for file matching *-<id>.md suffix
	folder := filepath.Join(s.vaultPath, dir)
	entries, err := os.ReadDir(folder)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	suffix := "-" + strconv.FormatInt(id, 10) + ".md"
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), suffix) {
			return os.Remove(filepath.Join(folder, e.Name()))
		}
	}
	return nil
}

// ── Directory setup ───────────────────────────────────────────────────────────

func (s *Syncer) ensureDirs() error {
	for _, d := range []string{"Goals", "Projects", "Sprints", "Tasks", "Notes", "Resources"} {
		if err := os.MkdirAll(filepath.Join(s.vaultPath, d), 0o755); err != nil {
			return fmt.Errorf("obsidian: mkdir %s: %w", d, err)
		}
	}
	return nil
}

// ── Atomic write with watcher suppression ─────────────────────────────────────

func (s *Syncer) write(path, content string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	s.writing.Store(path, struct{}{})
	defer func() {
		time.AfterFunc(500*time.Millisecond, func() { s.writing.Delete(path) })
	}()

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(content), 0o644); err != nil {
		return fmt.Errorf("obsidian write %s: %w", path, err)
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp) //nolint:errcheck
		return fmt.Errorf("obsidian rename %s: %w", path, err)
	}
	return nil
}

// ── Renderers ─────────────────────────────────────────────────────────────────

func renderGoal(g *domain.Goal) string {
	f := map[string]string{
		"raibis_id":   strconv.FormatInt(g.ID, 10),
		"raibis_type": "goal",
		"title":       g.Title,
		"status":      string(g.Status),
		"type":        g.Type,
		"year":        g.Year,
	}
	if g.StartDate != nil {
		f["start_date"] = *g.StartDate
	}
	if g.DueDate != nil {
		f["due_date"] = *g.DueDate
	}
	if g.Target != nil {
		f["target"] = fmt.Sprintf("%g", *g.Target)
	}
	if g.CurrentValue != nil {
		f["current_value"] = fmt.Sprintf("%g", *g.CurrentValue)
	}
	if len(g.Tags) > 0 {
		f["tags"] = tagsYAML(g.Tags)
	}

	body := ""
	if g.Description != "" {
		body = g.Description + "\n"
	}

	return renderFrontmatter(f) + "\n" + body
}

func renderProject(p *domain.Project) string {
	f := map[string]string{
		"raibis_id":   strconv.FormatInt(p.ID, 10),
		"raibis_type": "project",
		"title":       p.Title,
		"status":      string(p.Status),
	}
	if p.GoalID != nil {
		f["goal_id"] = strconv.FormatInt(*p.GoalID, 10)
	}
	if p.MacroArea != "" {
		f["macro_area"] = p.MacroArea
	}
	if p.KanbanCol != "" {
		f["kanban_col"] = p.KanbanCol
	}
	if len(p.Tags) > 0 {
		f["tags"] = tagsYAML(p.Tags)
	}

	body := ""
	if p.GoalID != nil {
		body += fmt.Sprintf("**Goal:** [[goal-%d]]\n\n", *p.GoalID)
	}
	if p.Description != "" {
		body += p.Description + "\n"
	}

	return renderFrontmatter(f) + "\n" + body
}

func renderSprint(sp *domain.Sprint) string {
	f := map[string]string{
		"raibis_id":   strconv.FormatInt(sp.ID, 10),
		"raibis_type": "sprint",
		"title":       sp.Title,
		"status":      string(sp.Status),
		"project_id":  strconv.FormatInt(sp.ProjectID, 10),
	}
	if sp.StartDate != nil {
		f["start_date"] = sp.StartDate.Format("2006-01-02")
	}
	if sp.EndDate != nil {
		f["end_date"] = sp.EndDate.Format("2006-01-02")
	}
	if sp.Goal != "" {
		f["sprint_goal"] = sp.Goal
	}

	body := fmt.Sprintf("**Project:** [[project-%d]]\n\n", sp.ProjectID)
	if sp.Goal != "" {
		body += "**Sprint Goal:** " + sp.Goal + "\n\n"
	}

	return renderFrontmatter(f) + "\n" + body
}

func renderTask(t *domain.Task) string {
	f := map[string]string{
		"raibis_id":   strconv.FormatInt(t.ID, 10),
		"raibis_type": "task",
		"title":       t.Title,
		"status":      string(t.Status),
		"priority":    string(t.Priority),
	}
	if t.ProjectID != nil {
		f["project_id"] = strconv.FormatInt(*t.ProjectID, 10)
	}
	if t.GoalID != nil {
		f["goal_id"] = strconv.FormatInt(*t.GoalID, 10)
	}
	if t.SprintID != nil {
		f["sprint_id"] = strconv.FormatInt(*t.SprintID, 10)
	}
	if t.ParentTaskID != nil {
		f["parent_task_id"] = strconv.FormatInt(*t.ParentTaskID, 10)
	}
	if t.DueDate != nil {
		f["due_date"] = t.DueDate.Format("2006-01-02")
	}
	if t.FocusBlock != nil {
		f["focus_block"] = *t.FocusBlock
	}
	if t.StoryPoints != nil && *t.StoryPoints > 0 {
		f["story_points"] = strconv.Itoa(*t.StoryPoints)
	}
	if t.EstimatedMin != nil && *t.EstimatedMin > 0 {
		f["estimated_mins"] = strconv.Itoa(*t.EstimatedMin)
	}
	if t.LoggedMins > 0 {
		f["logged_mins"] = strconv.Itoa(t.LoggedMins)
	}
	if t.RecurInterval != nil && *t.RecurInterval > 0 {
		f["recur_interval"] = strconv.Itoa(*t.RecurInterval)
		f["recur_unit"] = t.RecurUnit
	}
	if len(t.Tags) > 0 {
		f["tags"] = tagsYAML(t.Tags)
	}

	// checkbox status line for Obsidian Tasks plugin compatibility
	checked := " "
	if t.Status == domain.StatusDone {
		checked = "x"
	}

	body := fmt.Sprintf("- [%s] %s\n\n", checked, t.Title)

	// Wikilinks for relationships
	if t.ProjectID != nil {
		body += fmt.Sprintf("**Project:** [[project-%d]]\n", *t.ProjectID)
	}
	if t.GoalID != nil {
		body += fmt.Sprintf("**Goal:** [[goal-%d]]\n", *t.GoalID)
	}
	if t.SprintID != nil {
		body += fmt.Sprintf("**Sprint:** [[sprint-%d]]\n", *t.SprintID)
	}
	if t.ParentTaskID != nil {
		body += fmt.Sprintf("**Parent Task:** [[task-%d]]\n", *t.ParentTaskID)
	}
	if body != fmt.Sprintf("- [%s] %s\n\n", checked, t.Title) {
		body += "\n"
	}

	if t.Description != "" {
		body += t.Description + "\n"
	}

	return renderFrontmatter(f) + "\n" + body
}

func renderNote(n *domain.Note) string {
	title := n.Title
	if title == "" {
		title = fmt.Sprintf("note-%d", n.ID)
	}
	f := map[string]string{
		"raibis_id":   strconv.FormatInt(n.ID, 10),
		"raibis_type": "note",
		"title":       title,
	}
	if n.NoteDate != nil {
		f["note_date"] = *n.NoteDate
	}
	if n.GoalID != nil {
		f["goal_id"] = strconv.FormatInt(*n.GoalID, 10)
	}
	if n.TaskID != nil {
		f["task_id"] = strconv.FormatInt(*n.TaskID, 10)
	}
	if n.ProjectID != nil {
		f["project_id"] = strconv.FormatInt(*n.ProjectID, 10)
	}
	if len(n.Tags) > 0 {
		f["tags"] = tagsYAML(n.Tags)
	}

	body := ""
	if n.GoalID != nil {
		body += fmt.Sprintf("**Goal:** [[goal-%d]]\n", *n.GoalID)
	}
	if n.ProjectID != nil {
		body += fmt.Sprintf("**Project:** [[project-%d]]\n", *n.ProjectID)
	}
	if n.TaskID != nil {
		body += fmt.Sprintf("**Task:** [[task-%d]]\n", *n.TaskID)
	}
	if body != "" {
		body += "\n"
	}
	body += n.Body

	return renderFrontmatter(f) + "\n" + body
}

// ── YAML / frontmatter helpers ────────────────────────────────────────────────

// renderFrontmatter serialises a map to a YAML block.
// Key order: raibis_id, raibis_type, title — then remaining keys sorted.
func renderFrontmatter(m map[string]string) string {
	priority := []string{"raibis_id", "raibis_type", "title"}
	seen := map[string]bool{}
	var lines []string

	for _, k := range priority {
		if v, ok := m[k]; ok && v != "" {
			lines = append(lines, k+": "+yamlVal(v))
			seen[k] = true
		}
	}
	rest := make([]string, 0, len(m))
	for k := range m {
		if !seen[k] && m[k] != "" {
			rest = append(rest, k)
		}
	}
	sortStrings(rest)
	for _, k := range rest {
		lines = append(lines, k+": "+yamlVal(m[k]))
	}
	if len(lines) == 0 {
		return ""
	}
	return "---\n" + strings.Join(lines, "\n") + "\n---\n"
}

func tagsYAML(tags []domain.Tag) string {
	names := make([]string, len(tags))
	for i, t := range tags {
		names[i] = t.Name
	}
	return "[" + strings.Join(names, ", ") + "]"
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

// ── Slug ──────────────────────────────────────────────────────────────────────

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = nonAlphaNum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "item"
	}
	if len(s) > 40 {
		s = s[:40]
	}
	return strings.TrimRight(s, "-")
}

// ── Sorting ───────────────────────────────────────────────────────────────────

func sortStrings(ss []string) {
	for i := 1; i < len(ss); i++ {
		for j := i; j > 0 && ss[j] < ss[j-1]; j-- {
			ss[j], ss[j-1] = ss[j-1], ss[j]
		}
	}
}

// ── Context ───────────────────────────────────────────────────────────────────
