package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/gui"
	obsync "github.com/raibis/raibis-go/internal/sync"
	"github.com/raibis/raibis-go/internal/storage"
)

// StartVaultSyncers launches one Obsidian syncer goroutine per active vault
// and returns the list of running syncers.
func StartVaultSyncers(ctx context.Context, store storage.Storage) []*obsync.Syncer {
	vaults, err := store.ListVaults()
	if err != nil {
		log.Printf("obsidian sync: list vaults: %v", err)
		return nil
	}
	var syncers []*obsync.Syncer
	for _, v := range vaults {
		if !v.Active {
			continue
		}
		syncer := obsync.New(store, v.ID, v.Path)
		syncers = append(syncers, syncer)
		go func(s *obsync.Syncer, name string) {
			if err := s.Run(ctx); err != nil {
				log.Printf("obsidian sync [%s] stopped: %v", name, err)
			}
		}(syncer, v.Name)
	}
	return syncers
}

// SeedSystemDatabases creates built-in system databases (Tasks, Goals, Projects,
// Sprints, Notes) if they don't already exist. These databases give the new
// pages UI a home for the legacy entities.
func SeedSystemDatabases(store storage.Storage) {
	type systemDB struct {
		title  string
		icon   string
		schema []domain.SchemaColumn
	}
	dbs := []systemDB{
		{
			title: "Tasks", icon: "✅",
			schema: []domain.SchemaColumn{
				{Key: "status", Label: "Status", DataType: "status", Position: 0},
				{Key: "priority", Label: "Priority", DataType: "select", Options: []string{"urgent", "high", "medium", "low"}, Position: 1},
				{Key: "due_date", Label: "Due Date", DataType: "date", Position: 2},
				{Key: "story_points", Label: "Story Points", DataType: "number", Position: 3},
				{Key: "project", Label: "Project", DataType: "relation", Position: 4},
			},
		},
		{
			title: "Goals", icon: "🎯",
			schema: []domain.SchemaColumn{
				{Key: "status", Label: "Status", DataType: "status", Position: 0},
				{Key: "type", Label: "Type", DataType: "select", Options: []string{"12 Weeks", "12 Months", "3 Years", "5 Years"}, Position: 1},
				{Key: "due_date", Label: "Due Date", DataType: "date", Position: 2},
				{Key: "target", Label: "Target", DataType: "number", Position: 3},
			},
		},
		{
			title: "Projects", icon: "📁",
			schema: []domain.SchemaColumn{
				{Key: "status", Label: "Status", DataType: "status", Position: 0},
				{Key: "macro_area", Label: "Area", DataType: "select", Options: []string{"Soul", "Output", "Growth", "Body"}, Position: 1},
				{Key: "due_date", Label: "Due Date", DataType: "date", Position: 2},
				{Key: "goal", Label: "Goal", DataType: "relation", Position: 3},
			},
		},
		{
			title: "Sprints", icon: "🏃",
			schema: []domain.SchemaColumn{
				{Key: "status", Label: "Status", DataType: "status", Position: 0},
				{Key: "start_date", Label: "Start Date", DataType: "date", Position: 1},
				{Key: "end_date", Label: "End Date", DataType: "date", Position: 2},
				{Key: "story_points", Label: "Story Points", DataType: "number", Position: 3},
			},
		},
		{
			title: "Notes", icon: "📝",
			schema: []domain.SchemaColumn{
				{Key: "note_date", Label: "Date", DataType: "date", Position: 0},
				{Key: "category", Label: "Category", DataType: "select", Position: 1},
			},
		},
	}

	dbType := domain.PageTypeDatabase
	existing, err := store.ListPages(domain.PageFilter{Type: &dbType})
	if err != nil {
		log.Printf("seed: list databases: %v", err)
		return
	}
	existingTitles := map[string]bool{}
	for _, p := range existing {
		existingTitles[p.Title] = true
	}

	for _, d := range dbs {
		if existingTitles[d.title] {
			continue
		}
		p := &domain.Page{Type: domain.PageTypeDatabase, Title: d.title, Icon: d.icon}
		id, err := store.CreatePage(p)
		if err != nil {
			log.Printf("seed: create database %s: %v", d.title, err)
			continue
		}
		if err := store.SetSchema(id, d.schema); err != nil {
			log.Printf("seed: set schema %s: %v", d.title, err)
		}
		log.Printf("seed: created system database %q (%s)", d.title, id)
	}
}

// BuildMux constructs and returns the HTTP mux with all API routes and the
// embedded GUI file server.
func BuildMux(store storage.Storage, syncers ...*obsync.Syncer) http.Handler {
	h := &handlers{store: store, syncers: syncers}
	mux := http.NewServeMux()

	mux.HandleFunc("/api/pages", withCORS(h.pages))
	mux.HandleFunc("/api/pages/", withCORS(h.page))

	mux.HandleFunc("/api/databases", withCORS(h.databases))
	mux.HandleFunc("/api/databases/", withCORS(h.database))

	mux.HandleFunc("/api/comments/", withCORS(h.comments))
	mux.HandleFunc("/api/relations", withCORS(h.relations))

	mux.HandleFunc("/api/vaults", withCORS(h.vaults))
	mux.HandleFunc("/api/vaults/", withCORS(h.vault))

	mux.HandleFunc("/api/settings", withCORS(h.settings))
	mux.HandleFunc("/api/export/", withCORS(h.exportPage))

	mux.HandleFunc("/api/ping", withCORS(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}))

	sub, err := gui.Sub()
	if err != nil {
		panic("gui embed: " + err.Error())
	}
	mux.Handle("/", http.FileServer(http.FS(sub)))

	return mux
}

type handlers struct {
	store   storage.Storage
	syncers []*obsync.Syncer
}

// notifySync exports a page to all active Obsidian vaults in the background.
func (h *handlers) notifySync(p *domain.Page) {
	for _, s := range h.syncers {
		go func(syn *obsync.Syncer, page *domain.Page) {
			if err := syn.ExportPage(page); err != nil {
				log.Printf("obsidian sync: export page %s: %v", page.ID, err)
			}
		}(s, p)
	}
}

// ── /api/pages ────────────────────────────────────────────────────────────────

func (h *handlers) pages(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		f := domain.PageFilter{}
		q := r.URL.Query()
		if v := q.Get("database_id"); v != "" {
			f.DatabaseID = &v
		}
		if v := q.Get("parent_id"); v != "" {
			f.ParentID = &v
		}
		if v := q.Get("type"); v != "" {
			t := domain.PageType(v)
			f.Type = &t
		}
		if v := q.Get("archived"); v != "" {
			b := v == "true" || v == "1"
			f.Archived = &b
		}
		f.Search = q.Get("search")
		pages, err := h.store.ListPages(f)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if pages == nil {
			pages = []*domain.Page{}
		}
		writeJSON(w, http.StatusOK, pages)

	case http.MethodPost:
		var p domain.Page
		if err := readJSON(r, &p); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		id, err := h.store.CreatePage(&p)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		created, err := h.store.GetPage(id)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusCreated, created)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) page(w http.ResponseWriter, r *http.Request) {
	parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, "/api/pages/"), "/", 2)
	id := parts[0]
	sub := ""
	if len(parts) == 2 {
		sub = parts[1]
	}
	switch sub {
	case "":
		h.pageCore(w, r, id)
	case "properties":
		h.pageProperties(w, r, id)
	case "children":
		h.pageChildren(w, r, id)
	case "comments":
		h.pageComments(w, r, id)
	case "relations":
		h.pageRelations(w, r, id)
	case "backlinks":
		h.pageBacklinks(w, r, id)
	default:
		http.NotFound(w, r)
	}
}

func (h *handlers) pageCore(w http.ResponseWriter, r *http.Request, id string) {
	switch r.Method {
	case http.MethodGet:
		p, err := h.store.GetPage(id)
		if err != nil {
			errJSON(w, http.StatusNotFound, err)
			return
		}
		writeJSON(w, http.StatusOK, p)

	case http.MethodPatch:
		existing, err := h.store.GetPage(id)
		if err != nil {
			errJSON(w, http.StatusNotFound, err)
			return
		}
		var patch map[string]json.RawMessage
		if err := readJSON(r, &patch); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if v, ok := patch["title"]; ok {
			json.Unmarshal(v, &existing.Title) //nolint:errcheck
		}
		if v, ok := patch["icon"]; ok {
			json.Unmarshal(v, &existing.Icon) //nolint:errcheck
		}
		if v, ok := patch["cover"]; ok {
			json.Unmarshal(v, &existing.Cover) //nolint:errcheck
		}
		if v, ok := patch["body"]; ok {
			json.Unmarshal(v, &existing.Body) //nolint:errcheck
		}
		if v, ok := patch["archived"]; ok {
			json.Unmarshal(v, &existing.Archived) //nolint:errcheck
		}
		if v, ok := patch["position"]; ok {
			json.Unmarshal(v, &existing.Position) //nolint:errcheck
		}
		if err := h.store.UpdatePage(existing); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		updated, _ := h.store.GetPage(id)
		if updated != nil {
			h.notifySync(updated)
		}
		writeJSON(w, http.StatusOK, updated)

	case http.MethodDelete:
		if err := h.store.DeletePage(id); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) pageProperties(w http.ResponseWriter, r *http.Request, id string) {
	switch r.Method {
	case http.MethodGet:
		props, err := h.store.GetProperties(id)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, props)
	case http.MethodPatch:
		var props map[string]string
		if err := readJSON(r, &props); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if err := h.store.PatchProperties(id, props); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		all, _ := h.store.GetProperties(id)
		writeJSON(w, http.StatusOK, all)
	case http.MethodPut:
		var props map[string]string
		if err := readJSON(r, &props); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if err := h.store.SetProperties(id, props); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, props)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) pageChildren(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	children, err := h.store.ListPages(domain.PageFilter{ParentID: &id})
	if err != nil {
		errJSON(w, http.StatusInternalServerError, err)
		return
	}
	if children == nil {
		children = []*domain.Page{}
	}
	writeJSON(w, http.StatusOK, children)
}

func (h *handlers) pageComments(w http.ResponseWriter, r *http.Request, id string) {
	switch r.Method {
	case http.MethodGet:
		comments, err := h.store.ListPageComments(id)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if comments == nil {
			comments = []*domain.Comment{}
		}
		writeJSON(w, http.StatusOK, comments)
	case http.MethodPost:
		var c domain.Comment
		if err := readJSON(r, &c); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		c.PageID = id
		cid, err := h.store.CreateComment(&c)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		c.ID = cid
		writeJSON(w, http.StatusCreated, c)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) pageRelations(w http.ResponseWriter, r *http.Request, id string) {
	switch r.Method {
	case http.MethodGet:
		key := r.URL.Query().Get("key")
		rels, err := h.store.GetRelations(id, key)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if rels == nil {
			rels = []domain.Relation{}
		}
		writeJSON(w, http.StatusOK, rels)
	case http.MethodPost:
		var rel domain.Relation
		if err := readJSON(r, &rel); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		rel.FromPageID = id
		if err := h.store.AddRelation(rel); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusCreated, rel)
	case http.MethodDelete:
		var rel domain.Relation
		if err := readJSON(r, &rel); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		rel.FromPageID = id
		if err := h.store.RemoveRelation(rel); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) pageBacklinks(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	key := r.URL.Query().Get("key")
	rels, err := h.store.GetBackRelations(id, key)
	if err != nil {
		errJSON(w, http.StatusInternalServerError, err)
		return
	}
	if rels == nil {
		rels = []domain.Relation{}
	}
	writeJSON(w, http.StatusOK, rels)
}

func (h *handlers) comments(w http.ResponseWriter, r *http.Request) {
	pageID := strings.TrimPrefix(r.URL.Path, "/api/comments/")
	h.pageComments(w, r, pageID)
}

func (h *handlers) relations(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var rel domain.Relation
		if err := readJSON(r, &rel); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if err := h.store.AddRelation(rel); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusCreated, rel)
	case http.MethodDelete:
		var rel domain.Relation
		if err := readJSON(r, &rel); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if err := h.store.RemoveRelation(rel); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// ── /api/databases ────────────────────────────────────────────────────────────

func (h *handlers) databases(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		dbType := domain.PageTypeDatabase
		dbs, err := h.store.ListPages(domain.PageFilter{Type: &dbType})
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if dbs == nil {
			dbs = []*domain.Page{}
		}
		writeJSON(w, http.StatusOK, dbs)

	case http.MethodPost:
		var body struct {
			Title  string                `json:"title"`
			Icon   string                `json:"icon"`
			Schema []domain.SchemaColumn `json:"schema"`
		}
		if err := readJSON(r, &body); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		p := &domain.Page{Type: domain.PageTypeDatabase, Title: body.Title, Icon: body.Icon}
		id, err := h.store.CreatePage(p)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if len(body.Schema) > 0 {
			if err := h.store.SetSchema(id, body.Schema); err != nil {
				errJSON(w, http.StatusInternalServerError, err)
				return
			}
		}
		created, err := h.store.GetPage(id)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusCreated, created)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) database(w http.ResponseWriter, r *http.Request) {
	parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, "/api/databases/"), "/", 3)
	id := parts[0]
	sub := ""
	if len(parts) >= 2 {
		sub = parts[1]
	}
	subKey := ""
	if len(parts) == 3 {
		subKey = parts[2]
	}
	switch sub {
	case "":
		h.pageCore(w, r, id)
	case "pages":
		h.databasePages(w, r, id)
	case "schema":
		h.databaseSchema(w, r, id, subKey)
	default:
		http.NotFound(w, r)
	}
}

func (h *handlers) databasePages(w http.ResponseWriter, r *http.Request, dbID string) {
	switch r.Method {
	case http.MethodGet:
		f := domain.PageFilter{DatabaseID: &dbID}
		q := r.URL.Query()
		if v := q.Get("archived"); v != "" {
			b := v == "true" || v == "1"
			f.Archived = &b
		}
		f.Search = q.Get("search")
		pages, err := h.store.ListPages(f)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if pages == nil {
			pages = []*domain.Page{}
		}
		writeJSON(w, http.StatusOK, pages)
	case http.MethodPost:
		var p domain.Page
		if err := readJSON(r, &p); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		p.DatabaseID = &dbID
		id, err := h.store.CreatePage(&p)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if len(p.Properties) > 0 {
			h.store.SetProperties(id, p.Properties) //nolint:errcheck
		}
		created, err := h.store.GetPage(id)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		h.notifySync(created)
		writeJSON(w, http.StatusCreated, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) databaseSchema(w http.ResponseWriter, r *http.Request, dbID, key string) {
	if key == "" {
		switch r.Method {
		case http.MethodGet:
			cols, err := h.store.GetSchema(dbID)
			if err != nil {
				errJSON(w, http.StatusInternalServerError, err)
				return
			}
			if cols == nil {
				cols = []domain.SchemaColumn{}
			}
			writeJSON(w, http.StatusOK, cols)
		case http.MethodPut:
			var cols []domain.SchemaColumn
			if err := readJSON(r, &cols); err != nil {
				errJSON(w, http.StatusBadRequest, err)
				return
			}
			if err := h.store.SetSchema(dbID, cols); err != nil {
				errJSON(w, http.StatusInternalServerError, err)
				return
			}
			writeJSON(w, http.StatusOK, cols)
		case http.MethodPost:
			var col domain.SchemaColumn
			if err := readJSON(r, &col); err != nil {
				errJSON(w, http.StatusBadRequest, err)
				return
			}
			if err := h.store.AddSchemaColumn(dbID, col); err != nil {
				errJSON(w, http.StatusInternalServerError, err)
				return
			}
			writeJSON(w, http.StatusCreated, col)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var col domain.SchemaColumn
		if err := readJSON(r, &col); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		col.Key = key
		if err := h.store.UpdateSchemaColumn(dbID, col); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, col)
	case http.MethodDelete:
		if err := h.store.DeleteSchemaColumn(dbID, key); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// ── /api/vaults ───────────────────────────────────────────────────────────────

func (h *handlers) vaults(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		vaults, err := h.store.ListVaults()
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		if vaults == nil {
			vaults = []*domain.ObsidianVault{}
		}
		writeJSON(w, http.StatusOK, vaults)
	case http.MethodPost:
		var v domain.ObsidianVault
		if err := readJSON(r, &v); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		id, err := h.store.AddVault(&v)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		created, err := h.store.GetVault(id)
		if err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusCreated, created)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handlers) vault(w http.ResponseWriter, r *http.Request) {
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/vaults/")
	parts := strings.SplitN(trimmed, "/", 2)
	idStr := parts[0]
	sub := ""
	if len(parts) == 2 {
		sub = parts[1]
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		errJSON(w, http.StatusBadRequest, fmt.Errorf("invalid vault id"))
		return
	}
	if sub == "sync" {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if err := h.store.TouchVaultSync(id); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		v, _ := h.store.GetVault(id)
		writeJSON(w, http.StatusOK, v)
		return
	}
	switch r.Method {
	case http.MethodGet:
		v, err := h.store.GetVault(id)
		if err != nil {
			errJSON(w, http.StatusNotFound, err)
			return
		}
		writeJSON(w, http.StatusOK, v)
	case http.MethodPatch:
		existing, err := h.store.GetVault(id)
		if err != nil {
			errJSON(w, http.StatusNotFound, err)
			return
		}
		var patch map[string]json.RawMessage
		if err := readJSON(r, &patch); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if v, ok := patch["name"]; ok {
			json.Unmarshal(v, &existing.Name) //nolint:errcheck
		}
		if v, ok := patch["path"]; ok {
			json.Unmarshal(v, &existing.Path) //nolint:errcheck
		}
		if v, ok := patch["active"]; ok {
			json.Unmarshal(v, &existing.Active) //nolint:errcheck
		}
		if err := h.store.UpdateVault(existing); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, existing)
	case http.MethodDelete:
		if err := h.store.DeleteVault(id); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// ── /api/settings ─────────────────────────────────────────────────────────────

var exposedSettings = []string{
	"theme", "language", "default_view", "sidebar_width",
	"obsidian_sync_interval", "ai_provider", "ai_model",
}

func (h *handlers) settings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		out := map[string]string{}
		for _, k := range exposedSettings {
			v, _ := h.store.GetSetting(k)
			out[k] = v
		}
		writeJSON(w, http.StatusOK, out)
	case http.MethodPost:
		var body struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		}
		if err := readJSON(r, &body); err != nil {
			errJSON(w, http.StatusBadRequest, err)
			return
		}
		if err := h.store.SetSetting(body.Key, body.Value); err != nil {
			errJSON(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"key": body.Key, "value": body.Value})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// ── /api/export/{id} ──────────────────────────────────────────────────────────

func (h *handlers) exportPage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/export/")
	p, err := h.store.GetPage(id)
	if err != nil {
		errJSON(w, http.StatusNotFound, err)
		return
	}
	tree := buildPageTree(h.store, p)
	filename := sanitizeFilename(p.Title) + ".json"
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	json.NewEncoder(w).Encode(tree) //nolint:errcheck
}

type pageTree struct {
	*domain.Page
	Children []*pageTree `json:"children,omitempty"`
}

func buildPageTree(store storage.Storage, p *domain.Page) *pageTree {
	node := &pageTree{Page: p}
	children, _ := store.ListPages(domain.PageFilter{ParentID: &p.ID})
	for _, c := range children {
		node.Children = append(node.Children, buildPageTree(store, c))
	}
	return node
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func errJSON(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func sanitizeFilename(s string) string {
	var b strings.Builder
	for _, c := range s {
		if c == '/' || c == '\\' || c == ':' || c == '*' || c == '?' || c == '"' || c == '<' || c == '>' || c == '|' {
			b.WriteRune('_')
		} else {
			b.WriteRune(c)
		}
	}
	if b.Len() == 0 {
		return "export"
	}
	return b.String()
}
