package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	ioFs "io/fs"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"strings"
	"syscall"
	"time"

	_ "modernc.org/sqlite"

	"github.com/raibis/raibis-go/internal/cmdutil"
	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/gui"
	"github.com/raibis/raibis-go/internal/richtext"
	"github.com/raibis/raibis-go/internal/rollup"
	"github.com/raibis/raibis-go/internal/service"
	"github.com/raibis/raibis-go/internal/storage"
	"github.com/raibis/raibis-go/internal/vault"
)

type serverConfig struct {
	dbPath     string
	socketPath string // UDS path; empty = UDS disabled
	vaultPath  string
	tcpPort    string // non-empty = also bind TCP (dual-listen for web GUI)
	host       string // TCP bind address; "127.0.0.1" (default) or "0.0.0.0" (Flutter/LAN)
}

func runServer(args []string) {
	fs := flag.NewFlagSet("server", flag.ExitOnError)
	socketFlag := fs.String("socket", cmdutil.DefaultSocketPath(), `Unix domain socket path ("" to disable)`)
	dbFlag     := fs.String("db",     cmdutil.DefaultDBPath(),     "SQLite database path")
	vaultFlag  := fs.String("vault",  cmdutil.DefaultVaultPath(),  "Vault root directory")
	portFlag   := fs.String("port",   "",                          "Also bind TCP port for web GUI (e.g. 3344)")
	hostFlag   := fs.String("host",   "127.0.0.1",                 `TCP bind address ("0.0.0.0" for LAN/Flutter access)`)
	fs.Parse(args) //nolint:errcheck — ExitOnError handles it

	serve(serverConfig{
		dbPath:     *dbFlag,
		socketPath: *socketFlag,
		vaultPath:  *vaultFlag,
		tcpPort:    *portFlag,
		host:       *hostFlag,
	})
}

func serve(cfg serverConfig) {
	store, err := storage.Open(cfg.dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "lifeos server: cannot open database %s: %v\n", cfg.dbPath, err)
		os.Exit(1)
	}
	defer store.Close()

	v, err := vault.New(cfg.vaultPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "lifeos server: cannot open vault: %v\n", err)
		os.Exit(1)
	}
	log.Printf("vault at %s", v.Root)

	// Reconcile SQLite with vault — imports any entities missing from the
	// index and pulls in any hand-edits made in Obsidian since the app was
	// last open. Safe to run on every start: per-field conflict detection
	// means this never silently overwrites a change on one side with a
	// stale value from the other. Conflicts (both sides changed the same
	// field since last sync) are just logged here — no UI to show a merge
	// prompt at boot time — and stay pending until the user clicks Sync.
	applied, startupConflicts := twoWaySyncVault(v, cfg.dbPath)
	if applied > 0 {
		log.Printf("vault sync on start: %d entities reconciled", applied)
	}
	if len(startupConflicts) > 0 {
		log.Printf("vault sync on start: %d entities have pending conflicts — resolve via the Sync button", len(startupConflicts))
	}

	// One-time per boot: feed the entity-agnostic rollup graph from rows that
	// predate intrinsic mirroring / FK-edge sync, then recompute aggregates.
	go backfillRollupSources(store)

	svc := service.New(store)
	habitSvc := service.NewHabitService(store)
	mux := buildMux(svc, habitSvc, store, v, cfg.dbPath)

	if cfg.socketPath == "" && cfg.tcpPort == "" {
		fmt.Fprintln(os.Stderr, "lifeos server: no socket or port specified; use --socket or --port")
		os.Exit(1)
	}

	// ── TCP listener (optional, for web GUI / Flutter) ───────────────────────
	if cfg.tcpPort != "" {
		go func() {
			addr := cfg.host + ":" + cfg.tcpPort
			log.Printf("lifeos server also listening on TCP %s", addr)
			if err := http.ListenAndServe(addr, mux); err != nil {
				log.Printf("TCP server error: %v", err)
			}
		}()
	}

	// ── Unix Domain Socket listener ───────────────────────────────────────────
	if cfg.socketPath == "" {
		// TCP-only mode: block forever waiting for a signal
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		log.Printf("received %s, shutting down", sig)
		return
	}

	// Remove stale socket file from a previous unclean exit.
	_ = os.Remove(cfg.socketPath)

	// Ensure the parent directory exists.
	if err := os.MkdirAll(filepath.Dir(cfg.socketPath), 0o755); err != nil {
		log.Fatalf("lifeos server: mkdir for socket: %v", err)
	}

	ln, err := net.Listen("unix", cfg.socketPath)
	if err != nil {
		log.Fatalf("lifeos server: listen unix %s: %v", cfg.socketPath, err)
	}
	// Restrict socket to owner only — SwiftUI app runs as the same user.
	if err := os.Chmod(cfg.socketPath, 0o600); err != nil {
		log.Printf("lifeos server: chmod socket: %v", err)
	}

	defer func() {
		ln.Close()
		os.Remove(cfg.socketPath)
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		log.Printf("received %s, shutting down", sig)
		ln.Close()
		os.Remove(cfg.socketPath)
	}()

	log.Printf("lifeos server on unix:%s  (db: %s)", cfg.socketPath, cfg.dbPath)
	if err := http.Serve(ln, mux); err != nil && !errors.Is(err, net.ErrClosed) {
		log.Fatalf("lifeos server: %v", err)
	}
}

// ── Router ─────────────────────────────────────────────────────────────────────

func buildMux(svc service.TaskService, habitSvc *service.HabitService, store storage.Storage, v *vault.Vault, dbPath string) http.Handler {
	mux := http.NewServeMux()

	// Tasks
	mux.HandleFunc("/api/tasks", withCORS(tasksHandler(svc, store, v, dbPath)))
	mux.HandleFunc("/api/tasks/", withCORS(taskHandler(svc, store, dbPath, v)))

	// Goals
	mux.HandleFunc("/api/goals", withCORS(goalsHandler(svc, store, v, dbPath)))
	mux.HandleFunc("/api/goals/", withCORS(goalHandler(store, dbPath, v)))

	// Projects
	mux.HandleFunc("/api/projects", withCORS(projectsHandler(svc, store, v, dbPath)))
	mux.HandleFunc("/api/projects/", withCORS(projectHandler(store, dbPath, v)))

	// Sprints
	mux.HandleFunc("/api/sprints", withCORS(sprintsHandler(svc, store, dbPath, v)))
	mux.HandleFunc("/api/sprints/", withCORS(sprintHandler(store, v, dbPath)))

	// Notes — vault-backed file-only
	mux.HandleFunc("/api/notes", withCORS(notesHandler(store, v)))
	mux.HandleFunc("/api/notes/", withCORS(noteHandler(store, v)))

	// Categories
	mux.HandleFunc("/api/categories", withCORS(categoriesHandler(store)))
	mux.HandleFunc("/api/categories/", withCORS(categoryHandler(store)))

	// Tags
	mux.HandleFunc("/api/tags", withCORS(tagsHandler(store)))
	mux.HandleFunc("/api/tags/", withCORS(tagHandler(store)))

	// Habits
	mux.HandleFunc("/api/habits", withCORS(habitsHandler(habitSvc, v, dbPath)))
	mux.HandleFunc("/api/habits/", withCORS(habitHandler(habitSvc, v, dbPath)))

	// Kanban, Resources, Pomodoro, misc
	mux.HandleFunc("/api/kanban", withCORS(kanbanHandler(svc, store)))
	mux.HandleFunc("/api/resources", withCORS(resourcesHandler(store, dbPath, v)))
	mux.HandleFunc("/api/resources/", withCORS(resourceHandler(store, dbPath, v)))
	mux.HandleFunc("/api/resource-upload/", withCORS(resourceUploadHandler(dbPath)))
	mux.HandleFunc("/api/resource-file/", withCORS(resourceFileServeHandler(dbPath)))
	mux.HandleFunc("/api/pomodoro", withCORS(pomodoroHandler(store, dbPath)))
	mux.HandleFunc("/api/quick-capture", withCORS(captureHandler(svc)))
	mux.HandleFunc("/api/dashboard", withCORS(dashboardHandler(svc, store, dbPath)))

	// Export — single entity by id: /api/export/{entity}/{id}; bulk: /api/export
	mux.HandleFunc("/api/export/", withCORS(exportHandler(store, v, dbPath)))
	mux.HandleFunc("/api/export", withCORS(bulkExportHandler(store, v, dbPath)))

	// Data management — clean slate
	mux.HandleFunc("/api/data/purge", withCORS(purgeAllHandler(store, v)))

	// Search & Version
	mux.HandleFunc("/api/search", withCORS(searchHandler(store, dbPath)))
	mux.HandleFunc("/api/version", withCORS(versionHandler()))

	// Vector sync feed — consumed by N8N / external embedding pipelines
	mux.HandleFunc("/api/sync-feed", withCORS(syncFeedHandler(svc, store)))

	// Connected apps — status probe + launch + save
	mux.HandleFunc("/api/apps/status", withCORS(appsStatusHandler()))
	mux.HandleFunc("/api/apps/launch", withCORS(appsLaunchHandler()))
	mux.HandleFunc("/api/apps", withCORS(saveAppsHandler()))

	// App integrations — CRUD + probe
	mux.HandleFunc("/api/integrations", withCORS(integrationsHandler()))
	mux.HandleFunc("/api/integrations/probe", withCORS(integrationsProbeHandler()))

	// Comments
	mux.HandleFunc("/api/comments", withCORS(commentsHandler(store, v)))

	// Entity children (generic parent→child hierarchy)
	mux.HandleFunc("/api/children/", withCORS(entityChildrenHandler(store, v)))

	// Entity relations (bidirectional peer links)
	mux.HandleFunc("/api/relations/", withCORS(entityRelationsHandler(store, v)))

	// Properties (icon + custom key-value pairs per entity)
	mux.HandleFunc("/api/properties", withCORS(propertiesHandler(store, v)))

	// Rich content — EditorJS JSON dual-storage
	mux.HandleFunc("/api/content", withCORS(contentHandler(store, v, dbPath)))

	// Automations
	mux.HandleFunc("/api/automations", withCORS(automationsHandler(store)))
	mux.HandleFunc("/api/automations/", withCORS(automationHandler(store)))

	// Custom Entity Types
	mux.HandleFunc("/api/custom-types", withCORS(customTypesHandler(store)))
	mux.HandleFunc("/api/custom-types/", withCORS(customTypeHandler(store)))

	// Custom Entities — /api/custom/{type} and /api/custom/{type}/{id}
	mux.HandleFunc("/api/custom/", withCORS(customEntitiesHandler(store, v, dbPath)))

	// Workspaces — group entity types (built-in or custom) under a named container
	mux.HandleFunc("/api/workspaces", withCORS(workspacesHandler(store, v, dbPath)))
	mux.HandleFunc("/api/workspaces/", withCORS(workspaceHandler(store, v, dbPath)))

	// Vault sync (on-demand)
	mux.HandleFunc("/api/sync", withCORS(vaultSyncHandler(v, dbPath)))
	mux.HandleFunc("/api/sync/resolve", withCORS(vaultSyncResolveHandler(v, dbPath)))

	// Server config (vault path, db path)
	mux.HandleFunc("/api/config", withCORS(configHandler(v, dbPath)))

	// Embedded Web GUI — self-contained, no external /public folder needed.
	// Serves index.html + assets for all non-/api/ requests.
	sub, err := gui.Sub()
	if err != nil {
		log.Fatalf("lifeos: embed GUI FS: %v", err)
	}
	// Inject startup timestamp into index.html to bust WKWebView asset cache on every launch.
	startupVer := fmt.Sprintf("%d", time.Now().Unix())
	fileServer := http.FileServer(http.FS(sub))
	mux.Handle("/", noCacheHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if p == "/" || p == "/index.html" {
			raw, e := ioFs.ReadFile(sub, "index.html")
			if e != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(bytes.ReplaceAll(raw, []byte("__VER__"), []byte(startupVer)))
			return
		}
		fileServer.ServeHTTP(w, r)
	})))

	return mux
}

// ── Middleware ─────────────────────────────────────────────────────────────────

func noCacheHeaders(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		h.ServeHTTP(w, r)
	})
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h(w, r)
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func errJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func parseID(path string) (int64, bool) {
	parts := strings.Split(strings.TrimRight(path, "/"), "/")
	if len(parts) == 0 {
		return 0, false
	}
	id, err := strconv.ParseInt(parts[len(parts)-1], 10, 64)
	return id, err == nil
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullInt(n sql.NullInt64) any {
	if !n.Valid {
		return nil
	}
	return n.Int64
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

// ── Rollup source sync ────────────────────────────────────────────────────────
// The rollup engine is entity agnostic: it reads child values ONLY from the
// universal properties store and relations ONLY from entity_children. These
// helpers feed that graph from the built-in entities' native columns so
// default and custom entities become indistinguishable to the engine.

// mirrorIntrinsicsAndPropagate copies an entity's built-in aggregatable fields
// into the universal properties store, then cascades rollups up the edge graph.
func mirrorIntrinsicsAndPropagate(store storage.Storage, entityType string, id int64, fields map[string]string) {
	for k, v := range fields {
		if v == "" {
			continue
		}
		_ = store.SetProperty(entityType, id, k, v)
	}
	rollup.TriggerPropagation(store, entityType, id)
}

// syncTaskParentEdge mirrors a task's native FK columns into the generic
// entity_children edge table, so subtasks (parent_task_id) AND the classic
// relational links (goal_id, project_id, sprint_id) all flow through the
// same graph the entity-agnostic rollup engine reads.
func syncTaskParentEdge(store storage.Storage, t *domain.Task) {
	if t == nil {
		return
	}
	// desired FK-derived parents, keyed by parent type
	want := map[string]*int64{
		"task":    t.ParentTaskID,
		"goal":    t.GoalID,
		"project": t.ProjectID,
		"sprint":  t.SprintID,
	}
	if parents, err := store.GetEntityParents("task", t.ID); err == nil {
		for _, p := range parents {
			desired, managed := want[p.ParentEntityType]
			if !managed {
				continue // user-created edge of another type — never touch
			}
			if desired == nil || p.ParentEntityID != *desired {
				_ = store.RemoveEntityChild(p.ParentEntityType, p.ParentEntityID, "task", t.ID)
			}
		}
	}
	for pType, id := range want {
		if id != nil {
			_ = store.AddEntityChild(pType, *id, "task", t.ID)
		}
	}
}

// backfillRollupSources runs once at startup: mirrors intrinsic fields and FK
// edges for rows created before mirroring existed, then recomputes rollups so
// stored aggregates match reality.
func backfillRollupSources(store storage.Storage) {
	if tasks, err := store.ListTasks(domain.TaskFilter{}); err == nil {
		for _, t := range tasks {
			syncTaskParentEdge(store, t)
			for k, v := range taskIntrinsics(t) {
				if v != "" {
					_ = store.SetProperty("task", t.ID, k, v)
				}
			}
		}
		for _, t := range tasks {
			rollup.TriggerPropagation(store, "task", t.ID)
		}
	}
	if goals, err := store.ListGoals(""); err == nil {
		for _, g := range goals {
			_ = store.SetProperty("goal", g.ID, "status", string(g.Status))
		}
	}
	if projects, err := store.ListProjects(""); err == nil {
		for _, p := range projects {
			_ = store.SetProperty("project", p.ID, "status", string(p.Status))
			rollup.TriggerPropagation(store, "project", p.ID)
		}
	}
	if sprints, err := store.ListSprints(0); err == nil {
		for _, sp := range sprints {
			_ = store.SetProperty("sprint", sp.ID, "status", string(sp.Status))
		}
	}
	log.Printf("rollup: backfill of intrinsic props + FK edges complete")
}

// resyncTaskParentsVault refreshes the vault files of every entity this task
// links to (goal, project, sprint, parent task) so their link sections list
// the task — files only got written at parent creation time before, which is
// why only the first-ever linked item appeared in Obsidian.
func resyncTaskParentsVault(store storage.Storage, vlt *vault.Vault, t *domain.Task) {
	if vlt == nil || t == nil {
		return
	}
	parents := map[string]*int64{"goal": t.GoalID, "project": t.ProjectID, "sprint": t.SprintID, "task": t.ParentTaskID}
	for pType, id := range parents {
		if id != nil {
			resyncEntityVault(pType, *id, store, vlt)
		}
	}
}

func taskIntrinsics(t *domain.Task) map[string]string {
	m := map[string]string{
		"status":   string(t.Status),
		"priority": string(t.Priority),
	}
	if t.StoryPoints != nil {
		m["story_points"] = strconv.Itoa(*t.StoryPoints)
	}
	return m
}

func tasksHandler(svc service.TaskService, store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			f := domain.TaskFilter{TopLevelOnly: true}
			q := r.URL.Query()
			if v := q.Get("project_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					f.ProjectID = &id
				}
			}
			if v := q.Get("sprint_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					f.SprintID = &id
				}
			}
			if v := q.Get("status"); v != "" {
				st := domain.Status(v)
				f.Status = &st
			}
			if q.Get("all") == "1" {
				f.TopLevelOnly = false
			}
			var workspaceFilter *int64
			if v := q.Get("workspace_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					workspaceFilter = &id
				}
			}
			tasks, err := svc.List(f)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			tasks = filterByWorkspace(tasks, workspaceFilter, func(t *domain.Task) *int64 { return t.WorkspaceID })
			projects, _ := svc.Projects()
			projMap := make(map[int64]string)
			for _, p := range projects {
				projMap[p.ID] = p.Title
			}
			goals, _ := svc.Goals()
			goalMap := make(map[int64]string)
			for _, g := range goals {
				goalMap[g.ID] = g.Title
			}
			type taskOut struct {
				*domain.Task
				ProjectTitle string `json:"project_title,omitempty"`
				GoalTitle    string `json:"goal_title,omitempty"`
				SubTaskCount int    `json:"sub_task_count"`
			}
			out := make([]taskOut, len(tasks))
			for i, t := range tasks {
				to := taskOut{Task: t}
				if t.ProjectID != nil {
					to.ProjectTitle = projMap[*t.ProjectID]
				}
				if t.GoalID != nil {
					to.GoalTitle = goalMap[*t.GoalID]
				}
				sub, _ := store.ListTasks(domain.TaskFilter{})
				for _, s := range sub {
					if s.ParentTaskID != nil && *s.ParentTaskID == t.ID {
						to.SubTaskCount++
					}
				}
				tags, _ := store.GetEntityTags("task", t.ID)
				t.Tags = tags
				out[i] = to
			}
			writeJSON(w, 200, out)

		case http.MethodPost:
			var body struct {
				Title             string `json:"title"`
				Description       string `json:"description"`
				Status            string `json:"status"`
				Priority          string `json:"priority"`
				DueDate           string `json:"due_date"`
				FocusBlock        string `json:"focus_block"`
				FocusBlockStart   string `json:"focus_block_start"`
				GoalID            *int64 `json:"goal_id"`
				ProjectID         *int64 `json:"project_id"`
				SprintID          *int64 `json:"sprint_id"`
				ParentTaskID      *int64 `json:"parent_task_id"`
				WorkspaceID       *int64 `json:"workspace_id"`
				CategoryID        *int64 `json:"category_id"`
				Category          string `json:"category"`
				RecurInterval     *int   `json:"recur_interval"`
				RecurUnit         string `json:"recur_unit"`
				StoryPoints       *int   `json:"story_points"`
				PomodorosPlanned  *int   `json:"pomodoros_planned"`
				PomodorosFinished *int   `json:"pomodoros_finished"`
				Pomodoro          bool   `json:"pomodoro"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			if body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			t := &domain.Task{
				Title:             body.Title,
				Description:       body.Description,
				Status:            domain.StatusTodo,
				Priority:          domain.PriorityMedium,
				GoalID:            body.GoalID,
				ProjectID:         body.ProjectID,
				SprintID:          body.SprintID,
				ParentTaskID:      body.ParentTaskID,
				WorkspaceID:       body.WorkspaceID,
				CategoryID:        body.CategoryID,
				Category:          body.Category,
				RecurUnit:         body.RecurUnit,
				RecurInterval:     body.RecurInterval,
				StoryPoints:       body.StoryPoints,
				PomodorosPlanned:  body.PomodorosPlanned,
				PomodorosFinished: body.PomodorosFinished,
				Pomodoro:          body.Pomodoro,
			}
			if body.Status != "" {
				t.Status = domain.Status(body.Status)
			}
			if body.Priority != "" {
				t.Priority = domain.ParsePriority(body.Priority)
			}
			if body.DueDate != "" {
				if due, err := time.Parse("2006-01-02", body.DueDate); err == nil {
					t.DueDate = &due
				}
			}
			if body.FocusBlock != "" {
				t.FocusBlock = &body.FocusBlock
			}
			if body.FocusBlockStart != "" {
				t.FocusBlockStart = &body.FocusBlockStart
			}
			created, err := svc.Create(t)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			go func() {
				syncTaskParentEdge(store, created)
				mirrorIntrinsicsAndPropagate(store, "task", created.ID, taskIntrinsics(created))
				resyncTaskParentsVault(store, vlt, created)
			}()
			go func() {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("task", created.ID, mergeFMWithProps(taskFM(created), store, "task", created.ID), taskLinksBody(created, store)+relationsLinksBody("task", created.ID, store)); err != nil {
					log.Printf("vault: write task %d: %v", created.ID, err)
				}
				// Re-sync parent task so its ## Subtasks section stays up-to-date
				if created.ParentTaskID != nil {
					if pt, err := store.GetTask(*created.ParentTaskID); err == nil {
						_ = vlt.WriteEntityMD("task", pt.ID, mergeFMWithProps(taskFM(pt), store, "task", pt.ID), taskLinksBody(pt, store)+relationsLinksBody("task", pt.ID, store))
					}
				}
			}()
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func taskHandler(svc service.TaskService, store storage.Storage, dbPath string, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")
		if strings.HasSuffix(path, "/tags") {
			taskIDStr := strings.TrimSuffix(path, "/tags")
			taskIDStr = taskIDStr[strings.LastIndex(taskIDStr, "/")+1:]
			taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid task id")
				return
			}
			entityTagsHandler(store, "task", taskID)(w, r)
			return
		}

		if strings.HasSuffix(path, "/subtasks") {
			taskIDStr := strings.TrimSuffix(path, "/subtasks")
			taskIDStr = taskIDStr[strings.LastIndex(taskIDStr, "/")+1:]
			taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid task id")
				return
			}
			if r.Method != http.MethodGet {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
			subs, err := store.ListTasks(domain.TaskFilter{})
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			var out []*domain.Task
			for _, t := range subs {
				if t.ParentTaskID != nil && *t.ParentTaskID == taskID {
					tags, _ := store.GetEntityTags("task", t.ID)
					t.Tags = tags
					out = append(out, t)
				}
			}
			if out == nil {
				out = []*domain.Task{}
			}
			writeJSON(w, 200, out)
			return
		}

		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid task id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			t, err := svc.Get(id)
			if err != nil {
				errJSON(w, 404, "task not found")
				return
			}
			t.Tags, _ = store.GetEntityTags("task", id)
			subs, _ := store.ListTasks(domain.TaskFilter{})
			for _, s := range subs {
				if s.ParentTaskID != nil && *s.ParentTaskID == id {
					s.Tags, _ = store.GetEntityTags("task", s.ID)
					t.SubTasks = append(t.SubTasks, s)
				}
			}
			type taskDetail struct {
				*domain.Task
				GoalTitle       string           `json:"goal_title,omitempty"`
				ProjectTitle    string           `json:"project_title,omitempty"`
				ParentTaskTitle string           `json:"parent_task_title,omitempty"`
				Notes           []*domain.Note   `json:"notes"`
				Resources       []map[string]any `json:"resources"`
			}
			det := taskDetail{Task: t, Notes: []*domain.Note{}, Resources: []map[string]any{}}
			if t.GoalID != nil {
				if g, err := store.GetGoal(*t.GoalID); err == nil {
					det.GoalTitle = g.Title
				}
			}
			if t.ProjectID != nil {
				if p, err := store.GetProject(*t.ProjectID); err == nil {
					det.ProjectTitle = p.Title
				}
			}
			if t.ParentTaskID != nil {
				if pt, err := svc.Get(*t.ParentTaskID); err == nil {
					det.ParentTaskTitle = pt.Title
				}
			}
			det.Notes, _ = store.ListNotes(nil, &id, nil)
			for _, n := range det.Notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
			}
			if rawDB, err := openRawDB(dbPath); err == nil {
				defer rawDB.Close()
				rrows, _ := rawDB.Query(
					`SELECT id, title, COALESCE(url,''), resource_type, COALESCE(body,''), created_at
					 FROM resources WHERE task_id=? ORDER BY created_at DESC`, id)
				if rrows != nil {
					defer rrows.Close()
					for rrows.Next() {
						var rid int64
						var rtitle, rurl, rtype, rbody, rcat string
						if err := rrows.Scan(&rid, &rtitle, &rurl, &rtype, &rbody, &rcat); err == nil {
							det.Resources = append(det.Resources, map[string]any{
								"id": rid, "title": rtitle, "url": rurl,
								"resource_type": rtype, "body": rbody, "created_at": rcat,
							})
						}
					}
				}
			}
			writeJSON(w, 200, det)

		case http.MethodPatch:
			t, err := svc.Get(id)
			if err != nil {
				errJSON(w, 404, "task not found")
				return
			}
			prevStatus := t.Status
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if v, ok := body["title"].(string); ok {
				t.Title = v
			}
			if v, ok := body["status"].(string); ok {
				t.Status = domain.Status(v)
			}
			if v, ok := body["priority"].(string); ok {
				t.Priority = domain.ParsePriority(v)
			}
			if v, ok := body["description"].(string); ok {
				t.Description = v
			}
			if v, ok := body["start_date"]; ok {
				if v == nil {
					t.StartDate = nil
				} else if sv, ok := v.(string); ok {
					if sv == "" {
						t.StartDate = nil
					} else if due, err := time.Parse("2006-01-02", sv); err == nil {
						t.StartDate = &due
					}
				}
			}
			if v, ok := body["due_date"]; ok {
				if v == nil {
					t.DueDate = nil
				} else if sv, ok := v.(string); ok {
					if sv == "" {
						t.DueDate = nil
					} else if due, err := time.Parse("2006-01-02", sv); err == nil {
						t.DueDate = &due
					}
				}
			}
			if v, ok := body["focus_block"].(string); ok {
				t.FocusBlock = &v
			}
			if v, ok := body["focus_block_start"].(string); ok {
				t.FocusBlockStart = &v
			}
			if v, ok := body["goal_id"]; ok {
				if v == nil {
					t.GoalID = nil
				} else if fv, ok := v.(float64); ok {
					gid := int64(fv)
					t.GoalID = &gid
				}
			}
			if v, ok := body["project_id"]; ok {
				if v == nil {
					t.ProjectID = nil
				} else if fv, ok := v.(float64); ok {
					pid := int64(fv)
					t.ProjectID = &pid
				}
			}
			if v, ok := body["sprint_id"]; ok {
				if v == nil {
					t.SprintID = nil
				} else if fv, ok := v.(float64); ok {
					sid := int64(fv)
					t.SprintID = &sid
				}
			}
			oldParentTaskID := t.ParentTaskID // capture before mutation
			if v, ok := body["parent_task_id"]; ok {
				if v == nil {
					t.ParentTaskID = nil
				} else if fv, ok := v.(float64); ok {
					pid := int64(fv)
					t.ParentTaskID = &pid
				}
			}
			_ = oldParentTaskID // used in goroutine below
			if v, ok := body["workspace_id"]; ok {
				if v == nil {
					t.WorkspaceID = nil
				} else if fv, ok := v.(float64); ok {
					wid := int64(fv)
					t.WorkspaceID = &wid
				}
			}
			if v, ok := body["category_id"]; ok {
				if v == nil {
					t.CategoryID = nil
				} else if fv, ok := v.(float64); ok {
					cid := int64(fv)
					t.CategoryID = &cid
				}
			}
			if v, ok := body["category"].(string); ok {
				t.Category = v
			}
			if v, ok := body["recur_unit"].(string); ok {
				t.RecurUnit = v
			}
			if v, ok := body["recur_interval"].(float64); ok {
				iv := int(v)
				t.RecurInterval = &iv
			}
			if v, ok := body["story_points"].(float64); ok {
				iv := int(v)
				t.StoryPoints = &iv
			}
			if v, ok := body["pomodoros_planned"].(float64); ok {
				iv := int(v)
				t.PomodorosPlanned = &iv
			}
			if v, ok := body["pomodoros_finished"].(float64); ok {
				iv := int(v)
				t.PomodorosFinished = &iv
			}
			if v, ok := body["pomodoro"].(bool); ok {
				t.Pomodoro = v
			}
			if err := svc.Update(t); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := svc.Get(id)
			updated.Tags, _ = store.GetEntityTags("task", id)
			go runAutomations(store, svc, updated, prevStatus)
			go func() {
				syncTaskParentEdge(store, updated)
				mirrorIntrinsicsAndPropagate(store, "task", updated.ID, taskIntrinsics(updated))
				resyncTaskParentsVault(store, vlt, updated)
			}()
			go func(oldPID *int64) {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("task", updated.ID, mergeFMWithProps(taskFM(updated), store, "task", updated.ID), taskLinksBody(updated, store)+relationsLinksBody("task", updated.ID, store)); err != nil {
					log.Printf("vault: update task %d: %v", updated.ID, err)
				}
				// Re-sync new parent's ## Subtasks section
				if updated.ParentTaskID != nil {
					if pt, err := store.GetTask(*updated.ParentTaskID); err == nil {
						_ = vlt.WriteEntityMD("task", pt.ID, mergeFMWithProps(taskFM(pt), store, "task", pt.ID), taskLinksBody(pt, store)+relationsLinksBody("task", pt.ID, store))
					}
				}
				// Re-sync old parent if parent changed (covers removal of subtask)
				if oldPID != nil && (updated.ParentTaskID == nil || *oldPID != *updated.ParentTaskID) {
					if pt, err := store.GetTask(*oldPID); err == nil {
						_ = vlt.WriteEntityMD("task", pt.ID, mergeFMWithProps(taskFM(pt), store, "task", pt.ID), taskLinksBody(pt, store)+relationsLinksBody("task", pt.ID, store))
					}
				}
			}(oldParentTaskID)
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			// Capture parent before delete so we can re-sync it after
			deletedTask, _ := svc.Get(id)
			if err := svc.Delete(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			go func() {
				if err := vlt.DeleteEntityMD("task", id); err != nil {
					log.Printf("vault: delete task %d: %v", id, err)
				}
				// Re-sync parent's ## Subtasks if this was a subtask
				if deletedTask != nil && deletedTask.ParentTaskID != nil {
					if pt, err := store.GetTask(*deletedTask.ParentTaskID); err == nil {
						_ = vlt.WriteEntityMD("task", pt.ID, mergeFMWithProps(taskFM(pt), store, "task", pt.ID), taskLinksBody(pt, store)+relationsLinksBody("task", pt.ID, store))
					}
				}
			}()
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Goals ─────────────────────────────────────────────────────────────────────

func goalsHandler(svc service.TaskService, store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			// List endpoint must return every goal regardless of status —
			// svc.Goals() hardcodes status=active, which silently hid any
			// on_hold/completed/archived goal from the list entirely.
			goals, err := store.ListGoals("")
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			var workspaceFilter *int64
			if v := r.URL.Query().Get("workspace_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					workspaceFilter = &id
				}
			}
			goals = filterByWorkspace(goals, workspaceFilter, func(g *domain.Goal) *int64 { return g.WorkspaceID })
			tasks, _ := svc.List(domain.TaskFilter{})
			projects, _ := store.ListProjects("")
			out := enrichGoals(goals, projects, tasks)
			for i := range out {
				out[i].Goal.Tags, _ = store.GetEntityTags("goal", out[i].Goal.ID)
			}
			writeJSON(w, 200, out)

		case http.MethodPost:
			var body struct {
				Title        string   `json:"title"`
				Description  string   `json:"description"`
				Type         string   `json:"type"`
				Year         string   `json:"year"`
				StartDate    string   `json:"start_date"`
				DueDate      string   `json:"due_date"`
				StartValue   *float64 `json:"start_value"`
				CurrentValue *float64 `json:"current_value"`
				Target       *float64 `json:"target"`
				CategoryID   *int64   `json:"category_id"`
				WorkspaceID  *int64   `json:"workspace_id"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			g := &domain.Goal{
				Title:        body.Title,
				Description:  body.Description,
				Status:       domain.StatusActive,
				Type:         body.Type,
				Year:         body.Year,
				StartValue:   body.StartValue,
				CurrentValue: body.CurrentValue,
				Target:       body.Target,
				CategoryID:   body.CategoryID,
				WorkspaceID:  body.WorkspaceID,
			}
			if body.StartDate != "" {
				g.StartDate = &body.StartDate
			}
			if body.DueDate != "" {
				g.DueDate = &body.DueDate
			}
			id, err := store.CreateGoal(g)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			created, _ := store.GetGoal(id)
			go mirrorIntrinsicsAndPropagate(store, "goal", id, map[string]string{"status": string(created.Status)})
			go func() {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("goal", created.ID, mergeFMWithProps(goalFM(created), store, "goal", created.ID), childrenLinksBody("goal", created.ID, store)+commentsSection("goal", created.ID, store)); err != nil {
					log.Printf("vault: write goal %d: %v", created.ID, err)
				}
			}()
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func goalHandler(store storage.Storage, dbPath string, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")
		if strings.HasSuffix(path, "/tags") {
			idStr := strings.TrimSuffix(path, "/tags")
			idStr = idStr[strings.LastIndex(idStr, "/")+1:]
			eid, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid id")
				return
			}
			entityTagsHandler(store, "goal", eid)(w, r)
			return
		}

		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid goal id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			g, err := store.GetGoal(id)
			if err != nil {
				errJSON(w, 404, "goal not found")
				return
			}
			g.Tags, _ = store.GetEntityTags("goal", id)
			type goalDetail struct {
				*domain.Goal
				Projects  []*domain.Project `json:"projects"`
				Tasks     []*domain.Task    `json:"tasks"`
				Notes     []*domain.Note    `json:"notes"`
				Resources []map[string]any  `json:"resources"`
			}
			det := goalDetail{Goal: g, Projects: []*domain.Project{}, Tasks: []*domain.Task{}, Notes: []*domain.Note{}, Resources: []map[string]any{}}
			allProjects, _ := store.ListProjects(domain.StatusActive)
			for _, p := range allProjects {
				if p.GoalID != nil && *p.GoalID == id {
					p.Tags, _ = store.GetEntityTags("project", p.ID)
					det.Projects = append(det.Projects, p)
				}
			}
			directTasks, _ := store.ListTasks(domain.TaskFilter{GoalID: &id})
			for _, t := range directTasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
				det.Tasks = append(det.Tasks, t)
			}
			det.Notes, _ = store.ListNotes(&id, nil, nil)
			for _, n := range det.Notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
			}
			if rawDB, err := openRawDB(dbPath); err == nil {
				defer rawDB.Close()
				rrows, _ := rawDB.Query(
					`SELECT id, title, COALESCE(url,''), resource_type, COALESCE(body,''), created_at
					 FROM resources WHERE goal_id=? ORDER BY created_at DESC`, id)
				if rrows != nil {
					defer rrows.Close()
					for rrows.Next() {
						var rid int64
						var rtitle, rurl, rtype, rbody, rcat string
						if err := rrows.Scan(&rid, &rtitle, &rurl, &rtype, &rbody, &rcat); err == nil {
							det.Resources = append(det.Resources, map[string]any{
								"id": rid, "title": rtitle, "url": rurl,
								"resource_type": rtype, "body": rbody, "created_at": rcat,
							})
						}
					}
				}
			}
			writeJSON(w, 200, det)

		case http.MethodPatch:
			g, err := store.GetGoal(id)
			if err != nil {
				errJSON(w, 404, "goal not found")
				return
			}
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if v, ok := body["title"].(string); ok {
				g.Title = v
			}
			if v, ok := body["description"].(string); ok {
				g.Description = v
			}
			if v, ok := body["status"].(string); ok {
				g.Status = domain.Status(v)
			}
			if v, ok := body["type"].(string); ok {
				g.Type = v
			}
			if v, ok := body["year"].(string); ok {
				g.Year = v
			}
			if v, ok := body["start_date"].(string); ok {
				if v == "" {
					g.StartDate = nil
				} else {
					g.StartDate = &v
				}
			}
			if v, ok := body["due_date"].(string); ok {
				if v == "" {
					g.DueDate = nil
				} else {
					g.DueDate = &v
				}
			}
			if v, ok := body["target"].(float64); ok {
				g.Target = &v
			}
			if v, ok := body["current_value"].(float64); ok {
				g.CurrentValue = &v
			}
			if v, ok := body["start_value"].(float64); ok {
				g.StartValue = &v
			}
			if v, ok := body["category_id"]; ok {
				if v == nil {
					g.CategoryID = nil
				} else if fv, ok := v.(float64); ok {
					cid := int64(fv)
					g.CategoryID = &cid
				}
			}
			if v, ok := body["workspace_id"]; ok {
				if v == nil {
					g.WorkspaceID = nil
				} else if fv, ok := v.(float64); ok {
					wid := int64(fv)
					g.WorkspaceID = &wid
				}
			}
			if err := store.UpdateGoal(g); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := store.GetGoal(id)
			updated.Tags, _ = store.GetEntityTags("goal", id)
			go mirrorIntrinsicsAndPropagate(store, "goal", id, map[string]string{"status": string(updated.Status)})
			go func() {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("goal", updated.ID, mergeFMWithProps(goalFM(updated), store, "goal", updated.ID), childrenLinksBody("goal", updated.ID, store)+commentsSection("goal", updated.ID, store)); err != nil {
					log.Printf("vault: update goal %d: %v", updated.ID, err)
				}
			}()
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			if err := store.DeleteGoal(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			go func() {
				if err := vlt.DeleteEntityMD("goal", id); err != nil {
					log.Printf("vault: delete goal %d: %v", id, err)
				}
			}()
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Projects ──────────────────────────────────────────────────────────────────

func projectsHandler(svc service.TaskService, store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			// List endpoint must return every project regardless of status —
			// svc.Projects() hardcodes status=active, which silently hid any
			// on_hold/completed/archived project from the list entirely.
			projects, err := store.ListProjects("")
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			var workspaceFilter *int64
			if v := r.URL.Query().Get("workspace_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					workspaceFilter = &id
				}
			}
			projects = filterByWorkspace(projects, workspaceFilter, func(p *domain.Project) *int64 { return p.WorkspaceID })
			tasks, _ := svc.List(domain.TaskFilter{})
			out := enrichProjects(projects, tasks)
			for i := range out {
				out[i].Project.Tags, _ = store.GetEntityTags("project", out[i].Project.ID)
			}
			writeJSON(w, 200, out)

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				GoalID      *int64 `json:"goal_id"`
				MacroArea   string `json:"macro_area"`
				KanbanCol   string `json:"kanban_col"`
				CategoryID  *int64 `json:"category_id"`
				WorkspaceID *int64 `json:"workspace_id"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			p := &domain.Project{
				Title:       body.Title,
				Description: body.Description,
				GoalID:      body.GoalID,
				Status:      domain.StatusActive,
				MacroArea:   body.MacroArea,
				KanbanCol:   body.KanbanCol,
				CategoryID:  body.CategoryID,
				WorkspaceID: body.WorkspaceID,
			}
			id, err := store.CreateProject(p)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			created, _ := store.GetProject(id)
			go mirrorIntrinsicsAndPropagate(store, "project", id, map[string]string{"status": string(created.Status)})
			go func() {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("project", created.ID, mergeFMWithProps(projectFM(created), store, "project", created.ID), projectLinksBody(created, store)+childrenLinksBody("project", created.ID, store)+commentsSection("project", created.ID, store)); err != nil {
					log.Printf("vault: write project %d: %v", created.ID, err)
				}
			}()
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func projectHandler(store storage.Storage, dbPath string, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")
		if strings.HasSuffix(path, "/tags") {
			idStr := strings.TrimSuffix(path, "/tags")
			idStr = idStr[strings.LastIndex(idStr, "/")+1:]
			eid, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid id")
				return
			}
			entityTagsHandler(store, "project", eid)(w, r)
			return
		}

		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid project id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			p, err := store.GetProject(id)
			if err != nil {
				errJSON(w, 404, "project not found")
				return
			}
			p.Tags, _ = store.GetEntityTags("project", id)
			type projectDetail struct {
				*domain.Project
				Tasks     []*domain.Task   `json:"tasks"`
				Notes     []*domain.Note   `json:"notes"`
				Resources []map[string]any `json:"resources"`
			}
			det := projectDetail{Project: p, Tasks: []*domain.Task{}, Notes: []*domain.Note{}, Resources: []map[string]any{}}
			tasks, _ := store.ListTasks(domain.TaskFilter{ProjectID: &id, TopLevelOnly: true})
			for _, t := range tasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
				det.Tasks = append(det.Tasks, t)
			}
			det.Notes, _ = store.ListNotes(nil, nil, &id)
			for _, n := range det.Notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
			}
			if rawDB, err := openRawDB(dbPath); err == nil {
				defer rawDB.Close()
				rrows, _ := rawDB.Query(
					`SELECT id, title, COALESCE(url,''), resource_type, COALESCE(body,''), created_at
					 FROM resources WHERE project_id=? ORDER BY created_at DESC`, id)
				if rrows != nil {
					defer rrows.Close()
					for rrows.Next() {
						var rid int64
						var rtitle, rurl, rtype, rbody, rcat string
						if err := rrows.Scan(&rid, &rtitle, &rurl, &rtype, &rbody, &rcat); err == nil {
							det.Resources = append(det.Resources, map[string]any{
								"id": rid, "title": rtitle, "url": rurl,
								"resource_type": rtype, "body": rbody, "created_at": rcat,
							})
						}
					}
				}
			}
			writeJSON(w, 200, det)

		case http.MethodPatch:
			p, err := store.GetProject(id)
			if err != nil {
				errJSON(w, 404, "project not found")
				return
			}
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if v, ok := body["title"].(string); ok {
				p.Title = v
			}
			if v, ok := body["description"].(string); ok {
				p.Description = v
			}
			if v, ok := body["status"].(string); ok {
				p.Status = domain.Status(v)
			}
			if v, ok := body["macro_area"].(string); ok {
				p.MacroArea = v
			}
			if v, ok := body["kanban_col"].(string); ok {
				p.KanbanCol = v
			}
			if v, ok := body["goal_id"]; ok {
				if v == nil {
					p.GoalID = nil
				} else if fv, ok := v.(float64); ok {
					gid := int64(fv)
					p.GoalID = &gid
				}
			}
			if v, ok := body["archived"].(bool); ok {
				p.Archived = v
			}
			if v, ok := body["category_id"]; ok {
				if v == nil {
					p.CategoryID = nil
				} else if fv, ok := v.(float64); ok {
					cid := int64(fv)
					p.CategoryID = &cid
				}
			}
			if v, ok := body["workspace_id"]; ok {
				if v == nil {
					p.WorkspaceID = nil
				} else if fv, ok := v.(float64); ok {
					wid := int64(fv)
					p.WorkspaceID = &wid
				}
			}
			if v, ok := body["start_date"]; ok {
				if v == nil {
					p.StartDate = nil
				} else if sv, ok := v.(string); ok {
					if sv == "" {
						p.StartDate = nil
					} else if t, err := time.Parse("2006-01-02", sv); err == nil {
						p.StartDate = &t
					}
				}
			}
			if v, ok := body["due_date"]; ok {
				if v == nil {
					p.DueDate = nil
				} else if sv, ok := v.(string); ok {
					if sv == "" {
						p.DueDate = nil
					} else if t, err := time.Parse("2006-01-02", sv); err == nil {
						p.DueDate = &t
					}
				}
			}
			if err := store.UpdateProject(p); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := store.GetProject(id)
			updated.Tags, _ = store.GetEntityTags("project", id)
			go mirrorIntrinsicsAndPropagate(store, "project", id, map[string]string{"status": string(updated.Status)})
			go func() {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("project", updated.ID, mergeFMWithProps(projectFM(updated), store, "project", updated.ID), projectLinksBody(updated, store)+childrenLinksBody("project", updated.ID, store)+commentsSection("project", updated.ID, store)); err != nil {
					log.Printf("vault: update project %d: %v", updated.ID, err)
				}
			}()
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			if err := store.DeleteProject(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			go func() {
				if err := vlt.DeleteEntityMD("project", id); err != nil {
					log.Printf("vault: delete project %d: %v", id, err)
				}
			}()
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Sprints ───────────────────────────────────────────────────────────────────

func sprintsHandler(svc service.TaskService, store storage.Storage, dbPath string, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			var projectID *int64
			if v := r.URL.Query().Get("project_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					projectID = &id
				}
			}
			sprints := listSprints(store, svc, dbPath, projectID)
			var workspaceFilter *int64
			if v := r.URL.Query().Get("workspace_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					workspaceFilter = &id
				}
			}
			sprints = filterByWorkspace(sprints, workspaceFilter, func(s sprintOut) *int64 { return s.WorkspaceID })
			writeJSON(w, 200, sprints)

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				ProjectID   int64  `json:"project_id"`
				StartDate   string `json:"start_date"`
				EndDate     string `json:"end_date"`
				StoryPoints *int   `json:"story_points"`
				WorkspaceID *int64 `json:"workspace_id"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			sp := &domain.Sprint{
				ProjectID:   body.ProjectID,
				Title:       body.Title,
				Status:      domain.Status("planned"),
				StoryPoints: body.StoryPoints,
				WorkspaceID: body.WorkspaceID,
			}
			if body.StartDate != "" {
				if t, err := time.Parse("2006-01-02", body.StartDate); err == nil {
					sp.StartDate = &t
				}
			}
			if body.EndDate != "" {
				if t, err := time.Parse("2006-01-02", body.EndDate); err == nil {
					sp.EndDate = &t
				}
			}
			id, err := store.CreateSprint(sp)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			sp.ID = id
			go mirrorIntrinsicsAndPropagate(store, "sprint", id, map[string]string{"status": string(sp.Status)})
			go func() {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				if err := vlt.WriteEntityMD("sprint", sp.ID, mergeFMWithProps(sprintFM(sp), store, "sprint", sp.ID), sprintLinksBody(sp, store)); err != nil {
					log.Printf("vault: write sprint %d: %v", sp.ID, err)
				}
			}()
			writeJSON(w, 201, map[string]any{"id": id, "title": body.Title, "status": "planned"})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func sprintHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")
		if strings.HasSuffix(path, "/tags") {
			idStr := strings.TrimSuffix(path, "/tags")
			idStr = idStr[strings.LastIndex(idStr, "/")+1:]
			eid, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid id")
				return
			}
			entityTagsHandler(store, "sprint", eid)(w, r)
			return
		}
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid sprint id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			sp, err := store.GetSprint(id)
			if err != nil {
				errJSON(w, 404, "sprint not found")
				return
			}
			tasks, _ := store.ListTasks(domain.TaskFilter{SprintID: &id})
			done := 0
			for _, t := range tasks {
				if t.Status == domain.StatusDone {
					done++
				}
			}
			pct := 0
			if len(tasks) > 0 {
				pct = done * 100 / len(tasks)
			}
			startDate := ""
			endDate := ""
			if sp.StartDate != nil {
				startDate = sp.StartDate.Format("2006-01-02")
			}
			if sp.EndDate != nil {
				endDate = sp.EndDate.Format("2006-01-02")
			}
			proj, _ := store.GetProject(sp.ProjectID)
			projTitle := ""
			if proj != nil {
				projTitle = proj.Title
			}
			writeJSON(w, 200, map[string]any{
				"id":            sp.ID,
				"title":         sp.Title,
				"project_id":    sp.ProjectID,
				"project_title": projTitle,
				"status":        string(sp.Status),
				"start_date":    startDate,
				"end_date":      endDate,
				"story_points":  sp.StoryPoints,
				"workspace_id":  sp.WorkspaceID,
				"tasks":         tasks,
				"progress": map[string]any{
					"total": len(tasks),
					"done":  done,
					"pct":   pct,
				},
			})

		case http.MethodPatch:
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			sp, err := store.GetSprint(id)
			if err != nil {
				errJSON(w, 404, "sprint not found")
				return
			}
			if v, ok := body["title"].(string); ok && v != "" {
				sp.Title = v
			}
			if v, ok := body["project_id"]; ok {
				if v == nil {
					sp.ProjectID = 0
				} else if fv, ok := v.(float64); ok {
					sp.ProjectID = int64(fv)
				}
			}
			if v, ok := body["start_date"]; ok {
				if v == nil {
					sp.StartDate = nil
				} else if sv, ok := v.(string); ok && sv != "" {
					if t, err := time.Parse("2006-01-02", sv); err == nil {
						sp.StartDate = &t
					}
				}
			}
			if v, ok := body["end_date"]; ok {
				if v == nil {
					sp.EndDate = nil
				} else if sv, ok := v.(string); ok && sv != "" {
					if t, err := time.Parse("2006-01-02", sv); err == nil {
						sp.EndDate = &t
					}
				}
			}
			if v, ok := body["status"].(string); ok {
				sp.Status = domain.Status(v)
			}
			if v, ok := body["story_points"]; ok {
				if v == nil {
					sp.StoryPoints = nil
				} else if fv, ok := v.(float64); ok {
					p := int(fv)
					sp.StoryPoints = &p
				}
			}
			if v, ok := body["workspace_id"]; ok {
				if v == nil {
					sp.WorkspaceID = nil
				} else if fv, ok := v.(float64); ok {
					wid := int64(fv)
					sp.WorkspaceID = &wid
				}
			}
			if err := store.UpdateSprint(sp); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if sp, err := store.GetSprint(id); err == nil {
				go mirrorIntrinsicsAndPropagate(store, "sprint", id, map[string]string{"status": string(sp.Status)})
				go func() {
					refreshWorkspaceVaultFoldersAt(dbPath, vlt)
					if err := vlt.WriteEntityMD("sprint", sp.ID, mergeFMWithProps(sprintFM(sp), store, "sprint", sp.ID), sprintLinksBody(sp, store)); err != nil {
						log.Printf("vault: update sprint %d: %v", sp.ID, err)
					}
				}()
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		case http.MethodDelete:
			if err := store.DeleteSprint(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if err := vlt.DeleteEntityMD("sprint", id); err != nil {
				log.Printf("vault: delete sprint %d: %v", id, err)
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Notes ─────────────────────────────────────────────────────────────────────

func notesHandler(store storage.Storage, v *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			q := r.URL.Query()
			var goalID, taskID, projectID *int64
			if val := q.Get("goal_id"); val != "" {
				if id, err := strconv.ParseInt(val, 10, 64); err == nil {
					goalID = &id
				}
			}
			if val := q.Get("task_id"); val != "" {
				if id, err := strconv.ParseInt(val, 10, 64); err == nil {
					taskID = &id
				}
			}
			if val := q.Get("project_id"); val != "" {
				if id, err := strconv.ParseInt(val, 10, 64); err == nil {
					projectID = &id
				}
			}
			notes, err := store.ListNotes(goalID, taskID, projectID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			var workspaceFilter *int64
			if wv := q.Get("workspace_id"); wv != "" {
				if id, err := strconv.ParseInt(wv, 10, 64); err == nil {
					workspaceFilter = &id
				}
			}
			notes = filterByWorkspace(notes, workspaceFilter, func(n *domain.Note) *int64 { return n.WorkspaceID })
			for _, n := range notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
				if n.FilePath != nil {
					n.Body, _ = v.ReadFile(*n.FilePath)
				}
			}
			if notes == nil {
				notes = []*domain.Note{}
			}
			writeJSON(w, 200, notes)

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Body        string `json:"body"`
				GoalID      *int64 `json:"goal_id"`
				TaskID      *int64 `json:"task_id"`
				ProjectID   *int64 `json:"project_id"`
				CategoryID  *int64 `json:"category_id"`
				WorkspaceID *int64 `json:"workspace_id"`
				NoteDate    string `json:"note_date"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			if body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			n := &domain.Note{
				Title:       body.Title,
				GoalID:      body.GoalID,
				TaskID:      body.TaskID,
				ProjectID:   body.ProjectID,
				CategoryID:  body.CategoryID,
				WorkspaceID: body.WorkspaceID,
			}
			if body.NoteDate != "" {
				n.NoteDate = &body.NoteDate
			}
			fp := v.NoteFilePath(body.Title)
			if err := v.WriteFile(fp, body.Body); err != nil {
				errJSON(w, 500, "vault write: "+err.Error())
				return
			}
			n.FilePath = &fp
			id, err := store.CreateNote(n)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			created, _ := store.GetNote(id)
			created.Body, _ = v.ReadFile(fp)
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func noteHandler(store storage.Storage, v *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")
		if strings.HasSuffix(path, "/tags") {
			idStr := strings.TrimSuffix(path, "/tags")
			idStr = idStr[strings.LastIndex(idStr, "/")+1:]
			eid, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid id")
				return
			}
			entityTagsHandler(store, "note", eid)(w, r)
			return
		}

		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid note id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			n, err := store.GetNote(id)
			if err != nil {
				errJSON(w, 404, "note not found")
				return
			}
			n.Tags, _ = store.GetEntityTags("note", id)
			if n.FilePath != nil {
				n.Body, _ = v.ReadFile(*n.FilePath)
			}
			writeJSON(w, 200, n)

		case http.MethodPatch:
			n, err := store.GetNote(id)
			if err != nil {
				errJSON(w, 404, "note not found")
				return
			}
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if val, ok := body["title"].(string); ok {
				n.Title = val
			}
			if val, ok := body["note_date"].(string); ok {
				if val == "" {
					n.NoteDate = nil
				} else {
					n.NoteDate = &val
				}
			}
			if val, ok := body["archived"].(bool); ok {
				n.Archived = val
			}
			if val, ok := body["category_id"]; ok {
				if val == nil {
					n.CategoryID = nil
				} else if fv, ok := val.(float64); ok {
					cid := int64(fv)
					n.CategoryID = &cid
				}
			}
			if val, ok := body["goal_id"]; ok {
				if val == nil {
					n.GoalID = nil
				} else if fv, ok := val.(float64); ok {
					gid := int64(fv)
					n.GoalID = &gid
				}
			}
			if val, ok := body["task_id"]; ok {
				if val == nil {
					n.TaskID = nil
				} else if fv, ok := val.(float64); ok {
					tid := int64(fv)
					n.TaskID = &tid
				}
			}
			if val, ok := body["project_id"]; ok {
				if val == nil {
					n.ProjectID = nil
				} else if fv, ok := val.(float64); ok {
					pid := int64(fv)
					n.ProjectID = &pid
				}
			}
			if val, ok := body["workspace_id"]; ok {
				if val == nil {
					n.WorkspaceID = nil
				} else if fv, ok := val.(float64); ok {
					wid := int64(fv)
					n.WorkspaceID = &wid
				}
			}
			if bodyStr, ok := body["body"].(string); ok {
				fp := n.FilePath
				if fp == nil {
					newPath := v.NoteFilePath(n.Title)
					fp = &newPath
					n.FilePath = fp
				}
				if err := v.WriteFile(*fp, bodyStr); err != nil {
					errJSON(w, 500, "vault write: "+err.Error())
					return
				}
			}
			if err := store.UpdateNote(n); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := store.GetNote(id)
			updated.Tags, _ = store.GetEntityTags("note", id)
			if updated.FilePath != nil {
				updated.Body, _ = v.ReadFile(*updated.FilePath)
			}
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			n, _ := store.GetNote(id)
			if err := store.DeleteNote(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if n != nil && n.FilePath != nil {
				v.DeleteFile(*n.FilePath) //nolint:errcheck
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Categories ────────────────────────────────────────────────────────────────

func categoriesHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			cats, err := store.ListCategories()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if cats == nil {
				cats = []*domain.Category{}
			}
			writeJSON(w, 200, cats)

		case http.MethodPost:
			var body struct {
				Name  string `json:"name"`
				Color string `json:"color"`
			}
			if err := readJSON(r, &body); err != nil || body.Name == "" {
				errJSON(w, 400, "name is required")
				return
			}
			if body.Color == "" {
				body.Color = "blue"
			}
			id, err := store.CreateCategory(&domain.Category{Name: body.Name, Color: body.Color})
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 201, map[string]any{"id": id, "name": body.Name, "color": body.Color})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func categoryHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid category id")
			return
		}
		switch r.Method {
		case http.MethodPatch:
			var body struct {
				Name  string `json:"name"`
				Color string `json:"color"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if err := store.UpdateCategory(&domain.Category{ID: id, Name: body.Name, Color: body.Color}); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		case http.MethodDelete:
			if err := store.DeleteCategory(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Tags ──────────────────────────────────────────────────────────────────────

func tagsHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			tags, err := store.ListTags()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if tags == nil {
				tags = []*domain.Tag{}
			}
			writeJSON(w, 200, tags)

		case http.MethodPost:
			var body struct {
				Name  string `json:"name"`
				Color string `json:"color"`
			}
			if err := readJSON(r, &body); err != nil || body.Name == "" {
				errJSON(w, 400, "name is required")
				return
			}
			if body.Color == "" {
				body.Color = "blue"
			}
			id, err := store.CreateTag(&domain.Tag{Name: body.Name, Color: body.Color})
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 201, map[string]any{"id": id, "name": body.Name, "color": body.Color})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func tagHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid tag id")
			return
		}
		switch r.Method {
		case http.MethodPatch:
			var body struct {
				Name  string `json:"name"`
				Color string `json:"color"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if err := store.UpdateTag(&domain.Tag{ID: id, Name: body.Name, Color: body.Color}); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		case http.MethodDelete:
			if err := store.DeleteTag(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func entityTagsHandler(store storage.Storage, entityType string, entityID int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			tags, err := store.GetEntityTags(entityType, entityID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if tags == nil {
				tags = []domain.Tag{}
			}
			writeJSON(w, 200, tags)

		case http.MethodPut:
			var body struct {
				TagIDs []int64 `json:"tag_ids"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if err := store.SetEntityTags(entityType, entityID, body.TagIDs); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			tags, _ := store.GetEntityTags(entityType, entityID)
			if tags == nil {
				tags = []domain.Tag{}
			}
			writeJSON(w, 200, tags)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Kanban ────────────────────────────────────────────────────────────────────

func kanbanHandler(svc service.TaskService, store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		f := domain.TaskFilter{TopLevelOnly: true}
		if v := r.URL.Query().Get("project_id"); v != "" {
			if id, err := strconv.ParseInt(v, 10, 64); err == nil {
				f.ProjectID = &id
			}
		}
		tasks, err := svc.List(f)
		if err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		projects, _ := svc.Projects()
		projMap := make(map[int64]string)
		for _, p := range projects {
			projMap[p.ID] = p.Title
		}
		type kanbanTask struct {
			ID           int64        `json:"id"`
			Title        string       `json:"title"`
			Priority     string       `json:"priority"`
			DueDate      *string      `json:"due_date,omitempty"`
			ProjectTitle string       `json:"project_title,omitempty"`
			Category     string       `json:"category,omitempty"`
			StoryPoints  *int         `json:"story_points,omitempty"`
			Tags         []domain.Tag `json:"tags"`
		}
		board := map[string][]kanbanTask{
			"todo":        {},
			"in_progress": {},
			"blocked":     {},
			"done":        {},
		}
		for _, t := range tasks {
			kt := kanbanTask{
				ID:          t.ID,
				Title:       t.Title,
				Priority:    string(t.Priority),
				Category:    t.Category,
				StoryPoints: t.StoryPoints,
			}
			if t.ProjectID != nil {
				kt.ProjectTitle = projMap[*t.ProjectID]
			}
			if t.DueDate != nil {
				s := t.DueDate.Format("2006-01-02")
				kt.DueDate = &s
			}
			kt.Tags, _ = store.GetEntityTags("task", t.ID)
			if kt.Tags == nil {
				kt.Tags = []domain.Tag{}
			}
			col := string(t.Status)
			if _, ok := board[col]; ok {
				board[col] = append(board[col], kt)
			}
		}
		writeJSON(w, 200, board)
	}
}

// ── Resources ─────────────────────────────────────────────────────────────────

// resourceFM builds the vault frontmatter for a Resource.
func resourceFM(id int64, title, url, resourceType, body string, goalID, projectID, taskID *int64) map[string]any {
	fm := map[string]any{
		"id":            id,
		"title":         title,
		"aliases":       []string{title},
		"resource_type": resourceType,
	}
	if url != "" {
		fm["url"] = url
	}
	if body != "" {
		fm["body"] = body
	}
	if goalID != nil {
		fm["goal_id"] = *goalID
	}
	if projectID != nil {
		fm["project_id"] = *projectID
	}
	if taskID != nil {
		fm["task_id"] = *taskID
	}
	return fm
}

func resourcesHandler(store storage.Storage, dbPath string, vlt *vault.Vault) http.HandlerFunc {
	db, err := openRawDB(dbPath)
	if err != nil {
		return func(w http.ResponseWriter, r *http.Request) {
			errJSON(w, 500, "db unavailable")
		}
	}
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			q := r.URL.Query()
			where := "1=1"
			args := []any{}
			if v := q.Get("resource_type"); v != "" {
				where += " AND r.resource_type=?"
				args = append(args, v)
			}
			if v := q.Get("goal_id"); v != "" {
				where += " AND r.goal_id=?"
				args = append(args, v)
			}
			if v := q.Get("project_id"); v != "" {
				where += " AND r.project_id=?"
				args = append(args, v)
			}
			if v := q.Get("task_id"); v != "" {
				where += " AND r.task_id=?"
				args = append(args, v)
			}
			if v := q.Get("workspace_id"); v != "" {
				where += " AND r.workspace_id=?"
				args = append(args, v)
			}
			rows, err := db.Query(fmt.Sprintf(`
				SELECT r.id, r.title, COALESCE(r.url,''), COALESCE(r.file_path,''),
				       r.resource_type, COALESCE(r.body,''),
				       COALESCE(t.title,''), COALESCE(p.title,''), COALESCE(g.title,''),
				       r.created_at, r.workspace_id
				FROM resources r
				LEFT JOIN tasks    t ON r.task_id = t.id
				LEFT JOIN projects p ON r.project_id = p.id
				LEFT JOIN goals    g ON r.goal_id = g.id
				WHERE %s ORDER BY r.created_at DESC`, where), args...)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			defer rows.Close()
			type resOut struct {
				ID           int64  `json:"id"`
				Title        string `json:"title"`
				URL          string `json:"url,omitempty"`
				FilePath     string `json:"file_path,omitempty"`
				ResourceType string `json:"resource_type"`
				Body         string `json:"body,omitempty"`
				TaskTitle    string `json:"task_title,omitempty"`
				ProjectTitle string `json:"project_title,omitempty"`
				GoalTitle    string `json:"goal_title,omitempty"`
				CreatedAt    string `json:"created_at"`
				WorkspaceID  *int64 `json:"workspace_id,omitempty"`
			}
			var out []resOut
			for rows.Next() {
				var res resOut
				var workspaceID sql.NullInt64
				if err := rows.Scan(&res.ID, &res.Title, &res.URL, &res.FilePath,
					&res.ResourceType, &res.Body,
					&res.TaskTitle, &res.ProjectTitle, &res.GoalTitle,
					&res.CreatedAt, &workspaceID); err != nil {
					errJSON(w, 500, err.Error())
					return
				}
				if workspaceID.Valid {
					res.WorkspaceID = &workspaceID.Int64
				}
				out = append(out, res)
			}
			if out == nil {
				out = []resOut{}
			}
			writeJSON(w, 200, out)

		case http.MethodPost:
			var body struct {
				Title        string `json:"title"`
				URL          string `json:"url"`
				Body         string `json:"body"`
				ResourceType string `json:"resource_type"`
				GoalID       *int64 `json:"goal_id"`
				ProjectID    *int64 `json:"project_id"`
				TaskID       *int64 `json:"task_id"`
				WorkspaceID  *int64 `json:"workspace_id"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			if body.ResourceType == "" {
				body.ResourceType = "note"
			}
			res, err := db.Exec(
				`INSERT INTO resources (title, url, resource_type, body, goal_id, project_id, task_id, workspace_id)
				 VALUES (?,?,?,?,?,?,?,?)`,
				body.Title, nullStr(body.URL), body.ResourceType, nullStr(body.Body),
				body.GoalID, body.ProjectID, body.TaskID, body.WorkspaceID,
			)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			id, _ := res.LastInsertId()
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD("resource", id, resourceFM(id, body.Title, body.URL, body.ResourceType, body.Body, body.GoalID, body.ProjectID, body.TaskID), "")
			}
			writeJSON(w, 201, map[string]any{"id": id, "title": body.Title})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func resourceHandler(store storage.Storage, dbPath string, vlt *vault.Vault) http.HandlerFunc {
	db, _ := openRawDB(dbPath)
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")
		if strings.HasSuffix(path, "/tags") {
			idStr := strings.TrimSuffix(path, "/tags")
			idStr = idStr[strings.LastIndex(idStr, "/")+1:]
			eid, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid id")
				return
			}
			entityTagsHandler(store, "resource", eid)(w, r)
			return
		}
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid resource id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			var res struct {
				ID           int64   `json:"id"`
				Title        string  `json:"title"`
				URL          string  `json:"url"`
				Body         string  `json:"body"`
				ResourceType string  `json:"resource_type"`
				GoalID       *int64  `json:"goal_id"`
				ProjectID    *int64  `json:"project_id"`
				TaskID       *int64  `json:"task_id"`
				WorkspaceID  *int64  `json:"workspace_id"`
			}
			var goalID, projectID, taskID, workspaceID sql.NullInt64
			row := db.QueryRow(`SELECT id, title, COALESCE(url,''), COALESCE(body,''), resource_type,
				goal_id, project_id, task_id, workspace_id FROM resources WHERE id=?`, id)
			if err := row.Scan(&res.ID, &res.Title, &res.URL, &res.Body, &res.ResourceType,
				&goalID, &projectID, &taskID, &workspaceID); err != nil {
				errJSON(w, 404, "resource not found")
				return
			}
			if goalID.Valid    { res.GoalID    = &goalID.Int64 }
			if projectID.Valid { res.ProjectID = &projectID.Int64 }
			if taskID.Valid    { res.TaskID    = &taskID.Int64 }
			if workspaceID.Valid { res.WorkspaceID = &workspaceID.Int64 }
			writeJSON(w, 200, res)
		case http.MethodPatch:
			var bodyMap map[string]any
			if err := readJSON(r, &bodyMap); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			// Read current state then apply partial updates
			var cur struct {
				title        string
				url          string
				body         string
				resourceType string
				goalID       sql.NullInt64
				projectID    sql.NullInt64
				taskID       sql.NullInt64
				workspaceID  sql.NullInt64
			}
			row := db.QueryRow(`SELECT title, COALESCE(url,''), COALESCE(body,''), resource_type,
				goal_id, project_id, task_id, workspace_id FROM resources WHERE id=?`, id)
			if err := row.Scan(&cur.title, &cur.url, &cur.body, &cur.resourceType,
				&cur.goalID, &cur.projectID, &cur.taskID, &cur.workspaceID); err != nil {
				errJSON(w, 404, "resource not found")
				return
			}
			if v, ok := bodyMap["title"].(string); ok && v != "" {
				cur.title = v
			}
			if v, ok := bodyMap["url"].(string); ok && v != "" {
				cur.url = v
			}
			if v, ok := bodyMap["body"].(string); ok && v != "" {
				cur.body = v
			}
			if v, ok := bodyMap["resource_type"].(string); ok && v != "" {
				cur.resourceType = v
			}
			// FK fields: explicit null clears; numeric value sets
			goalID := cur.goalID
			if val, ok := bodyMap["goal_id"]; ok {
				if val == nil {
					goalID = sql.NullInt64{}
				} else if fv, ok := val.(float64); ok {
					goalID = sql.NullInt64{Int64: int64(fv), Valid: true}
				}
			}
			projectID := cur.projectID
			if val, ok := bodyMap["project_id"]; ok {
				if val == nil {
					projectID = sql.NullInt64{}
				} else if fv, ok := val.(float64); ok {
					projectID = sql.NullInt64{Int64: int64(fv), Valid: true}
				}
			}
			taskID := cur.taskID
			if val, ok := bodyMap["task_id"]; ok {
				if val == nil {
					taskID = sql.NullInt64{}
				} else if fv, ok := val.(float64); ok {
					taskID = sql.NullInt64{Int64: int64(fv), Valid: true}
				}
			}
			workspaceID := cur.workspaceID
			if val, ok := bodyMap["workspace_id"]; ok {
				if val == nil {
					workspaceID = sql.NullInt64{}
				} else if fv, ok := val.(float64); ok {
					workspaceID = sql.NullInt64{Int64: int64(fv), Valid: true}
				}
			}
			if _, err := db.Exec(
				`UPDATE resources SET title=?, url=?, body=?, resource_type=?,
				 goal_id=?, project_id=?, task_id=?, workspace_id=?, updated_at=datetime('now')
				 WHERE id=?`,
				nullStr(cur.title), nullStr(cur.url), nullStr(cur.body), cur.resourceType,
				nullInt(goalID), nullInt(projectID), nullInt(taskID), nullInt(workspaceID), id,
			); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				var goalIDPtr, projectIDPtr, taskIDPtr *int64
				if goalID.Valid {
					goalIDPtr = &goalID.Int64
				}
				if projectID.Valid {
					projectIDPtr = &projectID.Int64
				}
				if taskID.Valid {
					taskIDPtr = &taskID.Int64
				}
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD("resource", id, resourceFM(id, cur.title, cur.url, cur.resourceType, cur.body, goalIDPtr, projectIDPtr, taskIDPtr), "")
			}
			writeJSON(w, 200, map[string]any{"id": id, "ok": true})
		case http.MethodDelete:
			if _, err := db.Exec(`DELETE FROM resources WHERE id=?`, id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				_ = vlt.DeleteEntityMD("resource", id)
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Resource file upload / serve ──────────────────────────────────────────────

func resourceFilesDir(dbPath string) string {
	return filepath.Join(filepath.Dir(dbPath), "files")
}

func resourceUploadHandler(dbPath string) http.HandlerFunc {
	db, _ := openRawDB(dbPath)
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid resource id")
			return
		}
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			errJSON(w, 400, "failed to parse form: "+err.Error())
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			errJSON(w, 400, "missing file field")
			return
		}
		defer file.Close()

		dir := resourceFilesDir(dbPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			errJSON(w, 500, "cannot create files dir")
			return
		}
		// Use resource ID as prefix to avoid collisions
		dest := filepath.Join(dir, fmt.Sprintf("%d_%s", id, header.Filename))
		out, err := os.Create(dest)
		if err != nil {
			errJSON(w, 500, "cannot create file")
			return
		}
		defer out.Close()
		if _, err := io.Copy(out, file); err != nil {
			errJSON(w, 500, "failed to write file")
			return
		}
		if _, err := db.Exec(`UPDATE resources SET file_path=?, updated_at=datetime('now') WHERE id=?`, dest, id); err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		writeJSON(w, 200, map[string]any{"file_path": dest, "filename": header.Filename})
	}
}

func resourceFileServeHandler(dbPath string) http.HandlerFunc {
	db, _ := openRawDB(dbPath)
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid resource id")
			return
		}
		var filePath string
		if err := db.QueryRow(`SELECT COALESCE(file_path,'') FROM resources WHERE id=?`, id).Scan(&filePath); err != nil || filePath == "" {
			errJSON(w, 404, "no file attached")
			return
		}
		w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(filePath))
		http.ServeFile(w, r, filePath)
	}
}

// ── Pomodoro ──────────────────────────────────────────────────────────────────

func pomodoroHandler(store storage.Storage, dbPath string) http.HandlerFunc {
	db, _ := openRawDB(dbPath)
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			TaskID       *int64 `json:"task_id"`
			DurationMins int    `json:"duration_mins"`
			Completed    bool   `json:"completed"`
		}
		if err := readJSON(r, &body); err != nil {
			errJSON(w, 400, "invalid JSON")
			return
		}
		if body.DurationMins == 0 {
			body.DurationMins = 25
		}
		completed := 0
		if body.Completed {
			completed = 1
		}
		res, err := db.Exec(
			`INSERT INTO pomodoro_sessions (task_id, duration_mins, completed) VALUES (?,?,?)`,
			body.TaskID, body.DurationMins, completed,
		)
		if err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		id, _ := res.LastInsertId()
		if body.Completed && body.TaskID != nil {
			db.Exec(`UPDATE tasks SET pomodoros_finished = COALESCE(pomodoros_finished,0)+1 WHERE id=?`, *body.TaskID)
		}
		writeJSON(w, 201, map[string]any{"id": id, "duration_mins": body.DurationMins})
	}
}

// ── Quick capture ─────────────────────────────────────────────────────────────

func captureHandler(svc service.TaskService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Input string `json:"input"`
		}
		if err := readJSON(r, &body); err != nil || body.Input == "" {
			errJSON(w, 400, "input is required")
			return
		}
		t, err := svc.QuickCapture(body.Input)
		if err != nil {
			errJSON(w, 400, err.Error())
			return
		}
		writeJSON(w, 201, t)
	}
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

func dashboardHandler(svc service.TaskService, store storage.Storage, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		today := time.Now().Format("2006-01-02")

		var workspaceFilter *int64
		if v := r.URL.Query().Get("workspace_id"); v != "" {
			if id, err := strconv.ParseInt(v, 10, 64); err == nil {
				workspaceFilter = &id
			}
		}

		tasks, _ := svc.List(domain.TaskFilter{TopLevelOnly: true})
		tasks = filterByWorkspace(tasks, workspaceFilter, func(t *domain.Task) *int64 { return t.WorkspaceID })
		goals, _ := svc.Goals()
		goals = filterByWorkspace(goals, workspaceFilter, func(g *domain.Goal) *int64 { return g.WorkspaceID })
		projects, _ := svc.Projects()
		projects = filterByWorkspace(projects, workspaceFilter, func(p *domain.Project) *int64 { return p.WorkspaceID })

		projMap := make(map[int64]string)
		for _, p := range projects {
			projMap[p.ID] = p.Title
		}

		type dashTask struct {
			*domain.Task
			ProjectTitle string `json:"project_title,omitempty"`
			SubTaskCount int    `json:"sub_task_count"`
		}

		var inProgress, overdue int
		var todayTasks []dashTask
		var urgentTasks []dashTask

		allTasks, _ := store.ListTasks(domain.TaskFilter{})
		allTasks = filterByWorkspace(allTasks, workspaceFilter, func(t *domain.Task) *int64 { return t.WorkspaceID })
		parentCount := make(map[int64]int)
		for _, t := range allTasks {
			if t.ParentTaskID != nil {
				parentCount[*t.ParentTaskID]++
			}
		}

		for _, t := range tasks {
			if t.Status == domain.StatusInProgress {
				inProgress++
			}
			isOverdue := t.DueDate != nil && t.DueDate.Format("2006-01-02") < today && t.Status != domain.StatusDone
			if isOverdue {
				overdue++
			}
			t.Tags, _ = store.GetEntityTags("task", t.ID)
			dt := dashTask{Task: t, SubTaskCount: parentCount[t.ID]}
			if t.ProjectID != nil {
				dt.ProjectTitle = projMap[*t.ProjectID]
			}
			if t.DueDate != nil && t.DueDate.Format("2006-01-02") == today {
				todayTasks = append(todayTasks, dt)
			}
			if (t.Priority == domain.PriorityUrgent || t.Priority == domain.PriorityHigh) &&
				t.Status != domain.StatusDone && len(urgentTasks) < 5 {
				urgentTasks = append(urgentTasks, dt)
			}
		}
		if todayTasks == nil {
			todayTasks = []dashTask{}
		}
		if urgentTasks == nil {
			urgentTasks = []dashTask{}
		}

		activeProjects := enrichProjects(projects, allTasks)

		type sprintWidget struct {
			ID           int64  `json:"id"`
			Title        string `json:"title"`
			ProjectTitle string `json:"project_title"`
			StartDate    string `json:"start_date"`
			EndDate      string `json:"end_date"`
			Total        int    `json:"total"`
			Done         int    `json:"done"`
			Pct          int    `json:"pct"`
		}
		var activeSprint *sprintWidget
		sprints := listSprints(store, svc, dbPath, nil)
		sprints = filterByWorkspace(sprints, workspaceFilter, func(s sprintOut) *int64 { return s.WorkspaceID })
		for _, s := range sprints {
			if s.Status == "active" {
				activeSprint = &sprintWidget{
					ID:           s.ID,
					Title:        s.Title,
					ProjectTitle: s.ProjectTitle,
					StartDate:    s.StartDate,
					EndDate:      s.EndDate,
					Total:        s.Progress.Total,
					Done:         s.Progress.Done,
					Pct:          s.Progress.Pct,
				}
				break
			}
		}

		writeJSON(w, 200, map[string]any{
			"goals_count":     len(goals),
			"projects_count":  len(projects),
			"in_progress":     inProgress,
			"overdue":         overdue,
			"today_tasks":     todayTasks,
			"urgent_tasks":    urgentTasks,
			"active_projects": activeProjects,
			"active_sprint":   activeSprint,
		})
	}
}

// ── Export ────────────────────────────────────────────────────────────────────

func exportHandler(store storage.Storage, v *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) < 4 {
			errJSON(w, 400, "usage: /api/export/<entity>/<id>")
			return
		}
		entity := parts[2]
		id, err := strconv.ParseInt(parts[3], 10, 64)
		if err != nil {
			errJSON(w, 400, "invalid id")
			return
		}

		hydrateNotes := func(notes []*domain.Note) {
			for _, n := range notes {
				if n.FilePath != nil {
					n.Body, _ = v.ReadFile(*n.FilePath)
				}
			}
		}

		switch entity {
		case "goal":
			g, err := store.GetGoal(id)
			if err != nil {
				errJSON(w, 404, "goal not found")
				return
			}
			g.Tags, _ = store.GetEntityTags("goal", id)
			allProjects, _ := store.ListProjects(domain.StatusActive)
			var projects []*domain.Project
			for _, p := range allProjects {
				if p.GoalID != nil && *p.GoalID == id {
					p.Tags, _ = store.GetEntityTags("project", p.ID)
					projects = append(projects, p)
				}
			}
			tasks, _ := store.ListTasks(domain.TaskFilter{GoalID: &id})
			for _, t := range tasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
			}
			notes, _ := store.ListNotes(&id, nil, nil)
			for _, n := range notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
			}
			hydrateNotes(notes)
			writeJSON(w, 200, map[string]any{
				"entity": "goal", "goal": g, "projects": projects,
				"tasks": tasks, "notes": notes,
			})

		case "project":
			p, err := store.GetProject(id)
			if err != nil {
				errJSON(w, 404, "project not found")
				return
			}
			p.Tags, _ = store.GetEntityTags("project", id)
			tasks, _ := store.ListTasks(domain.TaskFilter{ProjectID: &id})
			for _, t := range tasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
			}
			notes, _ := store.ListNotes(nil, nil, &id)
			for _, n := range notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
			}
			hydrateNotes(notes)
			writeJSON(w, 200, map[string]any{
				"entity": "project", "project": p, "tasks": tasks, "notes": notes,
			})

		case "task":
			t, err := store.GetTask(id)
			if err != nil {
				errJSON(w, 404, "task not found")
				return
			}
			t.Tags, _ = store.GetEntityTags("task", id)
			notes, _ := store.ListNotes(nil, &id, nil)
			for _, n := range notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
			}
			hydrateNotes(notes)
			writeJSON(w, 200, map[string]any{
				"entity": "task", "task": t, "notes": notes,
			})

		case "note":
			n, err := store.GetNote(id)
			if err != nil {
				errJSON(w, 404, "note not found")
				return
			}
			n.Tags, _ = store.GetEntityTags("note", id)
			if n.FilePath != nil {
				n.Body, _ = v.ReadFile(*n.FilePath)
			}
			writeJSON(w, 200, map[string]any{"entity": "note", "note": n})

		case "sprint":
			s, err := store.GetSprint(id)
			if err != nil {
				errJSON(w, 404, "sprint not found")
				return
			}
			tasks, _ := store.ListTasks(domain.TaskFilter{SprintID: &id})
			for _, t := range tasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
			}
			writeJSON(w, 200, map[string]any{"entity": "sprint", "sprint": s, "tasks": tasks})

		case "resource":
			db, err := openRawDB(dbPath)
			if err != nil {
				errJSON(w, 500, "db unavailable")
				return
			}
			defer db.Close()
			type resOut struct {
				ID           int64  `json:"id"`
				Title        string `json:"title"`
				URL          string `json:"url,omitempty"`
				FilePath     string `json:"file_path,omitempty"`
				ResourceType string `json:"resource_type"`
				Body         string `json:"body,omitempty"`
				TaskTitle    string `json:"task_title,omitempty"`
				ProjectTitle string `json:"project_title,omitempty"`
				GoalTitle    string `json:"goal_title,omitempty"`
				CreatedAt    string `json:"created_at"`
			}
			row := db.QueryRow(`
				SELECT r.id, r.title, COALESCE(r.url,''), COALESCE(r.file_path,''),
				       r.resource_type, COALESCE(r.body,''),
				       COALESCE(t.title,''), COALESCE(p.title,''), COALESCE(g.title,''),
				       r.created_at
				FROM resources r
				LEFT JOIN tasks    t ON r.task_id = t.id
				LEFT JOIN projects p ON r.project_id = p.id
				LEFT JOIN goals    g ON r.goal_id = g.id
				WHERE r.id = ?`, id)
			var res resOut
			if err := row.Scan(&res.ID, &res.Title, &res.URL, &res.FilePath,
				&res.ResourceType, &res.Body,
				&res.TaskTitle, &res.ProjectTitle, &res.GoalTitle, &res.CreatedAt); err != nil {
				errJSON(w, 404, "resource not found")
				return
			}
			writeJSON(w, 200, map[string]any{"entity": "resource", "resource": res})

		default:
			errJSON(w, 400, "unknown entity: "+entity)
		}
	}
}

// bulkExportHandler returns all (or selected) entity data as a single JSON object.
// GET /api/export?entities=tasks,goals,projects,sprints,notes,resources
// Omitting the query param exports everything.
func bulkExportHandler(store storage.Storage, v *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		want := map[string]bool{}
		if sel := r.URL.Query().Get("entities"); sel != "" {
			for _, e := range strings.Split(sel, ",") {
				want[strings.TrimSpace(e)] = true
			}
		}
		all := len(want) == 0
		out := map[string]any{}

		if all || want["tasks"] {
			items, _ := store.ListTasks(domain.TaskFilter{})
			for _, t := range items {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
			}
			out["tasks"] = items
		}
		if all || want["goals"] {
			items, _ := store.ListGoals("")
			for _, g := range items {
				g.Tags, _ = store.GetEntityTags("goal", g.ID)
			}
			out["goals"] = items
		}
		if all || want["projects"] {
			items, _ := store.ListProjects("")
			for _, p := range items {
				p.Tags, _ = store.GetEntityTags("project", p.ID)
			}
			out["projects"] = items
		}
		if all || want["sprints"] {
			// ListSprints requires a projectID; fetch all via raw query
			var sprints []map[string]any
			if db, err := openRawDB(dbPath); err == nil {
				defer db.Close()
				srows, err := db.Query(`SELECT id, project_id, title, COALESCE(goal,''), COALESCE(start_date,''), COALESCE(end_date,''), status, created_at FROM sprints ORDER BY created_at DESC`)
				if err == nil {
					defer srows.Close()
					for srows.Next() {
						var id, projID int64
						var title, goal, start, end, status, createdAt string
						if srows.Scan(&id, &projID, &title, &goal, &start, &end, &status, &createdAt) == nil {
							sprints = append(sprints, map[string]any{"id": id, "project_id": projID, "title": title, "goal": goal, "start_date": start, "end_date": end, "status": status, "created_at": createdAt})
						}
					}
				}
			}
			if sprints == nil {
				sprints = []map[string]any{}
			}
			out["sprints"] = sprints
		}
		if all || want["notes"] {
			items, _ := store.ListNotes(nil, nil, nil)
			for _, n := range items {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
				if n.FilePath != nil {
					n.Body, _ = v.ReadFile(*n.FilePath)
				}
			}
			out["notes"] = items
		}
		if all || want["resources"] {
			if db, err := openRawDB(dbPath); err == nil {
				defer db.Close()
				rows, err := db.Query(`
					SELECT r.id, r.title, COALESCE(r.url,''), COALESCE(r.file_path,''),
					       r.resource_type, COALESCE(r.body,''),
					       COALESCE(t.title,''), COALESCE(p.title,''), COALESCE(g.title,''),
					       r.created_at
					FROM resources r
					LEFT JOIN tasks    t ON r.task_id    = t.id
					LEFT JOIN projects p ON r.project_id = p.id
					LEFT JOIN goals    g ON r.goal_id    = g.id
					ORDER BY r.created_at DESC`)
				if err == nil {
					defer rows.Close()
					var resList []map[string]any
					for rows.Next() {
						var id int64
						var title, url, filePath, rtype, body, taskTitle, projTitle, goalTitle, createdAt string
						if rows.Scan(&id, &title, &url, &filePath, &rtype, &body, &taskTitle, &projTitle, &goalTitle, &createdAt) == nil {
							resList = append(resList, map[string]any{
								"id": id, "title": title, "url": url, "file_path": filePath,
								"resource_type": rtype, "body": body,
								"task_title": taskTitle, "project_title": projTitle, "goal_title": goalTitle,
								"created_at": createdAt,
							})
						}
					}
					out["resources"] = resList
				}
			}
		}
		if all || want["automations"] {
			items, _ := store.ListAutomations("")
			out["automations"] = items
		}
		if all || want["custom"] {
			customTypes, _ := store.ListCustomEntityTypes()
			customOut := map[string]any{}
			for _, ct := range customTypes {
				entities, _ := store.ListCustomEntities(ct.Name)
				if entities == nil {
					entities = []*domain.CustomEntity{}
				}
				customOut[ct.Name] = entities
			}
			out["custom"] = customOut
		}
		writeJSON(w, 200, out)
	}
}

// purgeAllHandler deletes all user data from the DB and the vault's raibis/ directory.
// DELETE /api/data/purge
func purgeAllHandler(store storage.Storage, v *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if err := store.PurgeAll(); err != nil {
			errJSON(w, 500, "purge failed: "+err.Error())
			return
		}
		// Remove all vault entity files
		raibisDir := filepath.Join(v.Root, "raibis")
		_ = os.RemoveAll(raibisDir)
		// Remove notes and resources markdown files
		_ = os.RemoveAll(filepath.Join(v.Root, "notes"))
		_ = os.RemoveAll(filepath.Join(v.Root, "resources"))
		writeJSON(w, 200, map[string]bool{"ok": true})
	}
}

// ── Enrichment helpers ────────────────────────────────────────────────────────

type goalOut struct {
	*domain.Goal
	Progress struct {
		Done  int `json:"done"`
		Total int `json:"total"`
	} `json:"progress"`
}

func enrichGoals(goals []*domain.Goal, projects []*domain.Project, tasks []*domain.Task) []goalOut {
	out := make([]goalOut, len(goals))
	for i, g := range goals {
		go2 := goalOut{Goal: g}
		for _, p := range projects {
			if p.GoalID != nil && *p.GoalID == g.ID {
				for _, t := range tasks {
					if t.ProjectID != nil && *t.ProjectID == p.ID {
						go2.Progress.Total++
						if t.Status == domain.StatusDone {
							go2.Progress.Done++
						}
					}
				}
			}
		}
		out[i] = go2
	}
	return out
}

type projectOut struct {
	*domain.Project
	Progress struct {
		Done  int `json:"done"`
		Total int `json:"total"`
		Pct   int `json:"pct"`
	} `json:"progress"`
	ActiveTasks []string `json:"active_tasks"`
}

func enrichProjects(projects []*domain.Project, tasks []*domain.Task) []projectOut {
	out := make([]projectOut, len(projects))
	for i, p := range projects {
		po := projectOut{Project: p, ActiveTasks: []string{}}
		for _, t := range tasks {
			if t.ProjectID == nil || *t.ProjectID != p.ID {
				continue
			}
			po.Progress.Total++
			if t.Status == domain.StatusDone {
				po.Progress.Done++
			}
			if t.Status == domain.StatusInProgress && len(po.ActiveTasks) < 3 {
				po.ActiveTasks = append(po.ActiveTasks, t.Title)
			}
		}
		if po.Progress.Total > 0 {
			po.Progress.Pct = po.Progress.Done * 100 / po.Progress.Total
		}
		out[i] = po
	}
	return out
}

type sprintOut struct {
	ID           int64  `json:"id"`
	Title        string `json:"title"`
	ProjectID    int64  `json:"project_id"`
	ProjectTitle string `json:"project_title"`
	Status       string `json:"status"`
	StartDate    string `json:"start_date,omitempty"`
	EndDate      string `json:"end_date,omitempty"`
	WorkspaceID  *int64 `json:"workspace_id,omitempty"`
	Progress     struct {
		Done  int `json:"done"`
		Total int `json:"total"`
		Pct   int `json:"pct"`
	} `json:"progress"`
}

func listSprints(store storage.Storage, svc service.TaskService, dbPath string, projectID *int64) []sprintOut {
	db, err := openRawDB(dbPath)
	if err != nil {
		return []sprintOut{}
	}
	defer db.Close()

	q := `SELECT s.id, s.project_id, s.title, s.status,
	             COALESCE(s.start_date,''), COALESCE(s.end_date,''),
	             COALESCE(p.title,''), s.workspace_id
	      FROM sprints s LEFT JOIN projects p ON s.project_id = p.id
	      WHERE 1=1`
	args := []any{}
	if projectID != nil {
		q += " AND s.project_id=?"
		args = append(args, *projectID)
	}
	q += " ORDER BY s.created_at DESC"

	rows, err := db.Query(q, args...)
	if err != nil {
		return []sprintOut{}
	}
	defer rows.Close()

	var out []sprintOut
	for rows.Next() {
		var so sprintOut
		var projID, workspaceID sql.NullInt64
		if err := rows.Scan(&so.ID, &projID, &so.Title, &so.Status,
			&so.StartDate, &so.EndDate, &so.ProjectTitle, &workspaceID); err != nil {
			continue
		}
		if projID.Valid {
			so.ProjectID = projID.Int64
		}
		if workspaceID.Valid {
			so.WorkspaceID = &workspaceID.Int64
		}
		tasks, _ := svc.List(domain.TaskFilter{SprintID: &so.ID})
		for _, t := range tasks {
			so.Progress.Total++
			if t.Status == domain.StatusDone {
				so.Progress.Done++
			}
		}
		if so.Progress.Total > 0 {
			so.Progress.Pct = so.Progress.Done * 100 / so.Progress.Total
		}
		out = append(out, so)
	}
	if out == nil {
		return []sprintOut{}
	}
	return out
}

// ── DB helpers ────────────────────────────────────────────────────────────────

func openRawDB(dbPath string) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=busy_timeout(5000)",
		dbPath,
	)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	return db, nil
}

// ── Version ───────────────────────────────────────────────────────────────────

func versionHandler() http.HandlerFunc {
	// Read the build info once at startup (baked in at compile time via -buildvcs).
	sha := "unknown"
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, s := range info.Settings {
			if s.Key == "vcs.revision" {
				sha = s.Value
				break
			}
		}
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, 200, map[string]string{
			"sha":  sha,
			"repo": "https://github.com/rubenalejandrocalderoncorona/lifeos-raibis",
		})
	}
}

// ── Search ────────────────────────────────────────────────────────────────────

// searchHandler implements GET /api/search?q=<query>
// It executes a UNION text search across goals, projects, tasks, and notes,
// and includes tag matches by joining entity_tags.
func searchHandler(store storage.Storage, dbPath string) http.HandlerFunc {
	db, err := openRawDB(dbPath)
	if err != nil {
		return func(w http.ResponseWriter, r *http.Request) {
			errJSON(w, 500, "db unavailable")
		}
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		if q == "" {
			writeJSON(w, 200, map[string]any{
				"goals":    []any{},
				"projects": []any{},
				"tasks":    []any{},
				"notes":    []any{},
			})
			return
		}
		like := "%" + q + "%"

		type result struct {
			ID    int64  `json:"id"`
			Title string `json:"title"`
			Type  string `json:"type"`
			Extra string `json:"extra,omitempty"` // e.g. parent project/goal title
		}

		const unionSQL = `
			SELECT 'goal' AS type, g.id, g.title, '' AS extra
			FROM goals g
			WHERE g.title LIKE ? OR g.description LIKE ?

			UNION ALL

			SELECT 'goal' AS type, g.id, g.title, '' AS extra
			FROM goals g
			JOIN entity_tags et ON et.entity_type='goal' AND et.entity_id=g.id
			JOIN tags t ON t.id=et.tag_id
			WHERE t.name LIKE ?

			UNION ALL

			SELECT 'project' AS type, p.id, p.title, COALESCE(g.title,'') AS extra
			FROM projects p
			LEFT JOIN goals g ON p.goal_id=g.id
			WHERE p.title LIKE ? OR p.description LIKE ?

			UNION ALL

			SELECT 'project' AS type, p.id, p.title, COALESCE(g.title,'') AS extra
			FROM projects p
			LEFT JOIN goals g ON p.goal_id=g.id
			JOIN entity_tags et ON et.entity_type='project' AND et.entity_id=p.id
			JOIN tags tg ON tg.id=et.tag_id
			WHERE tg.name LIKE ?

			UNION ALL

			SELECT 'task' AS type, t.id, t.title, COALESCE(p.title,'') AS extra
			FROM tasks t
			LEFT JOIN projects p ON t.project_id=p.id
			WHERE t.title LIKE ? OR t.description LIKE ?

			UNION ALL

			SELECT 'task' AS type, t.id, t.title, COALESCE(p.title,'') AS extra
			FROM tasks t
			LEFT JOIN projects p ON t.project_id=p.id
			JOIN entity_tags et ON et.entity_type='task' AND et.entity_id=t.id
			JOIN tags tg ON tg.id=et.tag_id
			WHERE tg.name LIKE ?

			UNION ALL

			SELECT 'note' AS type, n.id, COALESCE(n.title,'') AS title, '' AS extra
			FROM notes n
			WHERE n.title LIKE ?

			ORDER BY type, title
			LIMIT 100
		`

		rows, err := db.Query(unionSQL,
			like, like,     // goal text
			like,           // goal tag
			like, like,     // project text
			like,           // project tag
			like, like,     // task text
			like,           // task tag
			like,           // note title
		)
		if err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		defer rows.Close()

		goals := []result{}
		projects := []result{}
		tasks := []result{}
		notes := []result{}

		// Deduplicate by (type, id)
		seen := make(map[string]bool)
		for rows.Next() {
			var res result
			if err := rows.Scan(&res.Type, &res.ID, &res.Title, &res.Extra); err != nil {
				continue
			}
			key := res.Type + ":" + strconv.FormatInt(res.ID, 10)
			if seen[key] {
				continue
			}
			seen[key] = true
			switch res.Type {
			case "goal":
				goals = append(goals, res)
			case "project":
				projects = append(projects, res)
			case "task":
				tasks = append(tasks, res)
			case "note":
				notes = append(notes, res)
			}
		}

		writeJSON(w, 200, map[string]any{
			"goals":    goals,
			"projects": projects,
			"tasks":    tasks,
			"notes":    notes,
		})
	}
}

// ── Comments ──────────────────────────────────────────────────────────────────

func commentsHandler(store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			q := r.URL.Query()
			entityType := q.Get("entity_type")
			entityIDStr := q.Get("entity_id")
			if entityType == "" || entityIDStr == "" {
				errJSON(w, 400, "entity_type and entity_id required")
				return
			}
			entityID, err := strconv.ParseInt(entityIDStr, 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid entity_id")
				return
			}
			comments, err := store.ListComments(entityType, entityID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if comments == nil {
				comments = []*domain.Comment{}
			}
			writeJSON(w, 200, comments)
		case http.MethodPost:
			var body struct {
				EntityType string `json:"entity_type"`
				EntityID   int64  `json:"entity_id"`
				Author     string `json:"author"`
				Body       string `json:"body"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, err.Error())
				return
			}
			if body.EntityType == "" || body.EntityID == 0 || body.Body == "" {
				errJSON(w, 400, "entity_type, entity_id and body required")
				return
			}
			author := body.Author
			if author == "" {
				author = "me"
			}
			c := &domain.Comment{
				EntityType: body.EntityType,
				EntityID:   body.EntityID,
				Author:     author,
				Body:       body.Body,
			}
			id, err := store.CreateComment(c)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			c.ID = id
			go resyncEntityVault(c.EntityType, c.EntityID, store, vlt)
			writeJSON(w, 201, c)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// entityChildrenHandler handles GET/POST/DELETE for /api/children/{parentType}/{parentID}
// and DELETE for /api/children/{parentType}/{parentID}/{childType}/{childID}
func entityChildrenHandler(store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
	// resolveTitle fetches a display title for a child entity.
	resolveTitle := func(entityType string, entityID int64) string {
		switch {
		case entityType == "task":
			if t, err := store.GetTask(entityID); err == nil {
				return t.Title
			}
		case entityType == "goal":
			if g, err := store.GetGoal(entityID); err == nil {
				return g.Title
			}
		case entityType == "project":
			if p, err := store.GetProject(entityID); err == nil {
				return p.Title
			}
		case entityType == "note":
			if n, err := store.GetNote(entityID); err == nil {
				if n.Title != "" {
					return n.Title
				}
				return fmt.Sprintf("note-%d", entityID)
			}
		case strings.HasPrefix(entityType, "custom_"):
			typeName := strings.TrimPrefix(entityType, "custom_")
			if e, err := store.GetCustomEntity(typeName, entityID); err == nil {
				return e.Title
			}
		}
		return fmt.Sprintf("%s-%d", entityType, entityID)
	}

	return func(w http.ResponseWriter, r *http.Request) {
		// Path: /api/children/{parentType}/{parentID}[/{childType}/{childID}]
		parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/children/"), "/"), "/")
		if len(parts) < 2 {
			errJSON(w, 400, "path must be /api/children/{parentType}/{parentID}")
			return
		}
		parentType := parts[0]
		parentID, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			errJSON(w, 400, "invalid parent id")
			return
		}

		switch r.Method {
		case http.MethodGet:
			children, err := store.GetEntityChildren(parentType, parentID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			for _, c := range children {
				c.ChildTitle = resolveTitle(c.ChildEntityType, c.ChildEntityID)
			}
			if children == nil {
				children = []*domain.EntityChild{}
			}
			writeJSON(w, 200, children)

		case http.MethodPost:
			var body struct {
				ChildType string `json:"child_entity_type"`
				ChildID   int64  `json:"child_entity_id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if err := store.AddEntityChild(parentType, parentID, body.ChildType, body.ChildID); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			// A new edge changes the parent's aggregates — recompute and cascade
			go rollup.RecomputeEntity(store, parentType, parentID)
			go resyncEntityVault(parentType, parentID, store, vlt)
			writeJSON(w, 201, map[string]string{"ok": "linked"})

		case http.MethodDelete:
			// /api/children/{parentType}/{parentID}/{childType}/{childID}
			if len(parts) < 4 {
				errJSON(w, 400, "path must be /api/children/{parentType}/{parentID}/{childType}/{childID}")
				return
			}
			childType := parts[2]
			childID, err := strconv.ParseInt(parts[3], 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid child id")
				return
			}
			if err := store.RemoveEntityChild(parentType, parentID, childType, childID); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			// The removed child can no longer reach the parent through the edge
			// graph, so recompute the parent directly, then cascade upward.
			go rollup.RecomputeEntity(store, parentType, parentID)
			go resyncEntityVault(parentType, parentID, store, vlt)
			writeJSON(w, 200, map[string]string{"ok": "unlinked"})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// entityRelationsHandler: GET/POST /api/relations/{type}/{id}
//                         DELETE   /api/relations/{type}/{id}/{relType}/{relId}
func entityRelationsHandler(store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
	resolveTitle := func(entityType string, entityID int64) string {
		switch entityType {
		case "task":
			if t, err := store.GetTask(entityID); err == nil {
				return t.Title
			}
		case "goal":
			if g, err := store.GetGoal(entityID); err == nil {
				return g.Title
			}
		case "project":
			if p, err := store.GetProject(entityID); err == nil {
				return p.Title
			}
		case "note":
			if n, err := store.GetNote(entityID); err == nil && n.Title != "" {
				return n.Title
			}
		case "sprint":
			if sp, err := store.GetSprint(entityID); err == nil {
				return sp.Title
			}
		}
		return fmt.Sprintf("%s-%d", entityType, entityID)
	}

	return func(w http.ResponseWriter, r *http.Request) {
		// Path: /api/relations/{type}/{id}[/{relType}/{relId}]
		parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/relations/"), "/"), "/")
		if len(parts) < 2 {
			errJSON(w, 400, "path must be /api/relations/{type}/{id}")
			return
		}
		entityType := parts[0]
		entityID, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			errJSON(w, 400, "invalid id")
			return
		}

		switch r.Method {
		case http.MethodGet:
			rels, err := store.GetEntityRelations(entityType, entityID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			for _, r := range rels {
				r.RelatedTitle = resolveTitle(r.RelatedType, r.RelatedID)
			}
			if rels == nil {
				rels = []*domain.EntityRelation{}
			}
			writeJSON(w, 200, rels)

		case http.MethodPost:
			var body struct {
				RelatedType string `json:"related_entity_type"`
				RelatedID   int64  `json:"related_entity_id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if err := store.AddEntityRelation(entityType, entityID, body.RelatedType, body.RelatedID); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			// Peer links feed rollups on BOTH ends — recompute each side
			go rollup.RecomputeEntity(store, entityType, entityID)
			go rollup.RecomputeEntity(store, body.RelatedType, body.RelatedID)
			// Re-sync vault for both sides
			go func() {
				resyncEntityVault(entityType, entityID, store, vlt)
				resyncEntityVault(body.RelatedType, body.RelatedID, store, vlt)
			}()
			writeJSON(w, 201, map[string]string{"ok": "linked"})

		case http.MethodDelete:
			if len(parts) < 4 {
				errJSON(w, 400, "path must be /api/relations/{type}/{id}/{relType}/{relId}")
				return
			}
			relType := parts[2]
			relID, err := strconv.ParseInt(parts[3], 10, 64)
			if err != nil {
				errJSON(w, 400, "invalid rel id")
				return
			}
			if err := store.RemoveEntityRelation(entityType, entityID, relType, relID); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			go rollup.RecomputeEntity(store, entityType, entityID)
			go rollup.RecomputeEntity(store, relType, relID)
			go func() {
				resyncEntityVault(entityType, entityID, store, vlt)
				resyncEntityVault(relType, relID, store, vlt)
			}()
			writeJSON(w, 200, map[string]string{"ok": "unlinked"})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func propertiesHandler(store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		entityType := q.Get("entity_type")
		entityIDStr := q.Get("entity_id")
		// Strip "custom_" prefix — custom entity props are stored under the bare
		// type name (e.g. "repositories") to match what ListCustomEntities queries.
		if strings.HasPrefix(entityType, "custom_") {
			entityType = strings.TrimPrefix(entityType, "custom_")
		}
		// Bulk DELETE: entity_type + key, no entity_id required
		if r.Method == http.MethodDelete && entityIDStr == "" {
			key := q.Get("key")
			if entityType == "" || key == "" {
				errJSON(w, 400, "entity_type and key are required")
				return
			}
			if err := store.DeletePropertyKey(entityType, key); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
			return
		}
		entityID, err := strconv.ParseInt(entityIDStr, 10, 64)
		if err != nil || entityType == "" {
			errJSON(w, 400, "entity_type and entity_id are required")
			return
		}
		switch r.Method {
		case http.MethodGet:
			props, err := store.ListProperties(entityType, entityID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if props == nil {
				props = map[string]string{}
			}
			writeJSON(w, 200, props)
		case http.MethodPost:
			var body struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			}
			if err := readJSON(r, &body); err != nil || body.Key == "" {
				errJSON(w, 400, "key is required")
				return
			}
			var prevVal string
			if prevProps, perr := store.ListProperties(entityType, entityID); perr == nil {
				prevVal = prevProps[body.Key]
			}
			if err := store.SetProperty(entityType, entityID, body.Key, body.Value); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			// Relation-prop values mirror into entity_relations edges so the
			// graph, rollups and BOTH sides' vault links stay consistent no
			// matter which UI path created the link.
			go syncRelationPropEdges(store, vlt, entityType, entityID, body.Key, prevVal, body.Value)
			// Propagate rollup recalculation up the hierarchy (non-blocking)
			go rollup.TriggerPropagation(store, entityType, entityID)
			// Sync non-internal keys to the Obsidian vault frontmatter
			if !strings.HasPrefix(body.Key, "_") {
				go func() {
					path := vlt.EntityFilePath(entityType, entityID)
					content, _ := vlt.ReadFile(path)
					existingProps, fileBody := vault.ParseFrontmatter(content)
					if existingProps == nil {
						existingProps = make(map[string]string)
						fileBody = content
					}
					existingProps[body.Key] = body.Value
					targets := relationPropTargets(store, entityType)
					fm := make(map[string]any, len(existingProps))
					for k, v := range existingProps {
						// relation values render as wiki-links, never raw JSON
						if links, ok := relationValueToLinks(store, k, v, targets); ok {
							fm[k] = links
							continue
						}
						fm[k] = v
					}
					_ = vlt.WriteEntityMD(entityType, entityID, fm, fileBody)
				}()
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
		case http.MethodDelete:
			key := q.Get("key")
			if key == "" {
				errJSON(w, 400, "key is required")
				return
			}
			if err := store.DeleteProperty(entityType, entityID, key); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Rich Content ──────────────────────────────────────────────────────────────

// contentHandler handles POST /api/content
// Body: {"entity_type":"task","entity_id":1,"content_json":"{...}"}
// It stores content_json in the entity's DB column and regenerates the
// Obsidian .md file with the existing links body + the new Markdown body.
func contentHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			EntityType  string `json:"entity_type"`
			EntityID    int64  `json:"entity_id"`
			ContentJSON string `json:"content_json"`
		}
		if err := readJSON(r, &body); err != nil {
			errJSON(w, 400, "invalid JSON: "+err.Error())
			return
		}
		if body.EntityType == "" || body.EntityID == 0 || body.ContentJSON == "" {
			errJSON(w, 400, "entity_type, entity_id and content_json are required")
			return
		}

		// Validate entity type
		validTypes := map[string]string{
			"task":     "tasks",
			"note":     "notes",
			"project":  "projects",
			"goal":     "goals",
			"sprint":   "sprints",
			"resource": "resources",
		}
		tableName, ok := validTypes[body.EntityType]
		if !ok {
			errJSON(w, 400, "unsupported entity_type: "+body.EntityType)
			return
		}

		// Save content_json to the DB column
		db, err := openRawDB(dbPath)
		if err != nil {
			errJSON(w, 500, "db unavailable: "+err.Error())
			return
		}
		defer db.Close()

		_, err = db.Exec(
			`UPDATE `+tableName+` SET content_json=? WHERE id=?`, //nolint:gosec — tableName is from allowlist above
			body.ContentJSON, body.EntityID,
		)
		if err != nil {
			errJSON(w, 500, "save content_json: "+err.Error())
			return
		}

		// Convert EditorJS JSON to Markdown
		mdBody, err := richtext.ToMarkdown([]byte(body.ContentJSON))
		if err != nil {
			// Non-fatal: log and skip vault update
			log.Printf("content: richtext.ToMarkdown entity=%s id=%d: %v", body.EntityType, body.EntityID, err)
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Re-generate the Obsidian .md file: keep existing links body, append rich content
		go func() {
			existingLinksBody := entityLinksBody(body.EntityType, body.EntityID, store)
			var fm map[string]any
			switch body.EntityType {
			case "task":
				if t, err := store.GetTask(body.EntityID); err == nil {
					fm = mergeFMWithProps(taskFM(t), store, "task", body.EntityID)
				}
			case "goal":
				if g, err := store.GetGoal(body.EntityID); err == nil {
					fm = mergeFMWithProps(goalFM(g), store, "goal", body.EntityID)
				}
			case "project":
				if p, err := store.GetProject(body.EntityID); err == nil {
					fm = mergeFMWithProps(projectFM(p), store, "project", body.EntityID)
				}
			case "sprint":
				if sp, err := store.GetSprint(body.EntityID); err == nil {
					fm = mergeFMWithProps(sprintFM(sp), store, "sprint", body.EntityID)
				}
			case "note":
				// Notes use vault file directly; update the file content
				if n, err := store.GetNote(body.EntityID); err == nil && n.FilePath != nil {
					// Preserve existing vault content but replace/append rich markdown body
					existing, _ := vlt.ReadFile(*n.FilePath)
					_, existingBody := vault.ParseFrontmatter(existing)
					// For notes, the body IS the content — replace with richtext markdown
					newBody := mdBody
					if existingBody != "" && newBody == "" {
						newBody = existingBody
					}
					_ = vlt.WriteFile(*n.FilePath, newBody)
				}
				return
			case "resource":
				// Resources don't have structured vault entity MD — skip vault write
				return
			}
			if fm == nil {
				return
			}
			// Combine links body with rich content markdown
			fullBody := existingLinksBody
			if mdBody != "" {
				if fullBody != "" {
					fullBody += "\n\n" + mdBody
				} else {
					fullBody = mdBody
				}
			}
			if err := vlt.WriteEntityMD(body.EntityType, body.EntityID, fm, fullBody); err != nil {
				log.Printf("content: vault write entity=%s id=%d: %v", body.EntityType, body.EntityID, err)
			}
		}()

		w.WriteHeader(http.StatusNoContent)
	}
}

// entityLinksBody returns the existing links/children body for an entity
// (same as what would be written on a normal PATCH).
func entityLinksBody(entityType string, entityID int64, store storage.Storage) string {
	switch entityType {
	case "task":
		if t, err := store.GetTask(entityID); err == nil {
			return taskLinksBody(t, store) + relationsLinksBody("task", entityID, store)
		}
	case "goal":
		return childrenLinksBody("goal", entityID, store) + relationsLinksBody("goal", entityID, store)
	case "project":
		if p, err := store.GetProject(entityID); err == nil {
			return projectLinksBody(p, store) + childrenLinksBody("project", entityID, store) + relationsLinksBody("project", entityID, store)
		}
	case "sprint":
		if sp, err := store.GetSprint(entityID); err == nil {
			return sprintLinksBody(sp, store)
		}
	}
	return ""
}

// ── Sync Feed ─────────────────────────────────────────────────────────────────
//
// GET /api/sync-feed?since=<unix_seconds>
//
// Returns all tasks, notes, goals and projects updated after the given Unix
// timestamp.  If `since` is omitted the full dataset is returned.
// Consumers (N8N, embedding pipelines) call this endpoint to page through
// changes and upsert embeddings into the vector store.
//
// Each item carries a `_source` field ("lifeos") and `_entity` field so the
// consumer knows which Qdrant collection to target without inspecting the payload.
func syncFeedHandler(svc service.TaskService, store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var since time.Time
		if s := r.URL.Query().Get("since"); s != "" {
			if ts, err := strconv.ParseInt(s, 10, 64); err == nil {
				since = time.Unix(ts, 0)
			}
		}

		type feedItem struct {
			Source    string `json:"_source"`
			Entity    string `json:"_entity"`
			ID        int64  `json:"id"`
			UpdatedAt string `json:"updated_at"`
			// Embedding text — concatenated searchable fields
			Text      string `json:"text"`
			// Full payload forwarded as-is for metadata storage
			Payload   any    `json:"payload"`
		}

		var items []feedItem

		// Tasks
		tasks, err := svc.List(domain.TaskFilter{TopLevelOnly: false})
		if err == nil {
			for _, t := range tasks {
				if !since.IsZero() && t.UpdatedAt.Before(since) {
					continue
				}
				tags, _ := store.GetEntityTags("task", t.ID)
				t.Tags = tags
				tagNames := make([]string, len(tags))
				for i, tg := range tags {
					tagNames[i] = tg.Name
				}
				text := strings.Join([]string{
					t.Title,
					t.Description,
					string(t.Status),
					string(t.Priority),
					strings.Join(tagNames, " "),
				}, " ")
				items = append(items, feedItem{
					Source:    "lifeos",
					Entity:    "task",
					ID:        t.ID,
					UpdatedAt: t.UpdatedAt.UTC().Format(time.RFC3339),
					Text:      strings.TrimSpace(text),
					Payload:   t,
				})
			}
		}

		// Goals
		goals, err := store.ListGoals("")
		if err == nil {
			for _, g := range goals {
				if !since.IsZero() && g.CreatedAt.Before(since) {
					continue
				}
				text := strings.Join([]string{g.Title, g.Description, string(g.Status), g.Type, g.Year}, " ")
				items = append(items, feedItem{
					Source:    "lifeos",
					Entity:    "goal",
					ID:        g.ID,
					UpdatedAt: g.CreatedAt.UTC().Format(time.RFC3339),
					Text:      strings.TrimSpace(text),
					Payload:   g,
				})
			}
		}

		// Projects
		projects, err := svc.Projects()
		if err == nil {
			for _, p := range projects {
				if !since.IsZero() && p.CreatedAt.Before(since) {
					continue
				}
				text := strings.Join([]string{p.Title, p.Description, string(p.Status), p.MacroArea}, " ")
				items = append(items, feedItem{
					Source:    "lifeos",
					Entity:    "project",
					ID:        p.ID,
					UpdatedAt: p.CreatedAt.UTC().Format(time.RFC3339),
					Text:      strings.TrimSpace(text),
					Payload:   p,
				})
			}
		}

		// Notes
		notes, err := store.ListNotes(nil, nil, nil)
		if err == nil {
			for _, n := range notes {
				if !since.IsZero() && n.UpdatedAt.Before(since) {
					continue
				}
				text := strings.Join([]string{n.Title, n.Body, n.CategoryName}, " ")
				items = append(items, feedItem{
					Source:    "lifeos",
					Entity:    "note",
					ID:        n.ID,
					UpdatedAt: n.UpdatedAt.UTC().Format(time.RFC3339),
					Text:      strings.TrimSpace(text),
					Payload:   n,
				})
			}
		}

		if items == nil {
			items = []feedItem{}
		}

		writeJSON(w, 200, map[string]any{
			"source":    "lifeos",
			"since":     since.UTC().Format(time.RFC3339),
			"count":     len(items),
			"items":     items,
		})
	}
}

// ── Connected Apps ────────────────────────────────────────────────────────────
//
// appDef describes a connected application in the Raibis stack.
// The URL and launch config come from ~/.raibis/apps.json (user-managed),
// with safe defaults so it works out of the box for local dev.
type appDef struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	URL         string `json:"url"`           // health-check base URL
	HealthPath  string `json:"health_path"`   // appended to URL for probe
	// Launch strategy: "local_make" | "docker_local" | "docker_remote" | "none"
	LaunchMode  string `json:"launch_mode"`
	LaunchDir   string `json:"launch_dir"`   // working dir for local launch
	LaunchCmd   string `json:"launch_cmd"`   // command to run (make target, docker-compose up, etc.)
	// Docker remote config (only when launch_mode == "docker_remote")
	DockerHost  string `json:"docker_host,omitempty"`
	DockerImage string `json:"docker_image,omitempty"`
	Color       string `json:"color"`   // accent color for the UI card
	Icon        string `json:"icon"`    // emoji character shown in the card
}

var defaultApps = []appDef{
	{
		ID:          "supergit",
		Name:        "SuperGit",
		Description: "Git repository visualizer & analytics",
		URL:         "http://localhost:8765",
		HealthPath:  "/api/health",
		LaunchMode:  "local_make",
		LaunchDir:   "/Users/i754080/Documents/PersonalRepos/ClaudeCodeProjects/SuperGit",
		LaunchCmd:   "make web",
		Color:       "#6366f1",
		Icon:        "⚡",
	},
	{
		ID:          "studytrack",
		Name:        "StudyTrack",
		Description: "Study plan tracker with AI exam generation",
		URL:         "http://localhost:3333",
		HealthPath:  "/api/health",
		LaunchMode:  "local_make",
		LaunchDir:   "/Users/i754080/Documents/PersonalRepos/ClaudeCodeProjects/studytrack",
		LaunchCmd:   "make web",
		Color:       "#10b981",
		Icon:        "📚",
	},
	{
		ID:          "raibis-chat",
		Name:        "Raibis Chat",
		Description: "AI chat interface connected to the stack",
		URL:         "http://localhost:8080",
		HealthPath:  "/",
		LaunchMode:  "none",
		LaunchDir:   "/Users/i754080/Documents/PersonalRepos/ClaudeCodeProjects/raibis-chat",
		LaunchCmd:   "",
		Color:       "#f59e0b",
		Icon:        "💬",
	},
}

// loadApps merges ~/.raibis/apps.json overrides over the defaults.
// Unknown fields in the JSON file are ignored; missing fields keep their default.
func loadApps() []appDef {
	path := filepath.Join(os.Getenv("HOME"), ".raibis", "apps.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return defaultApps
	}
	var overrides []appDef
	if err := json.Unmarshal(data, &overrides); err != nil {
		return defaultApps
	}
	// Merge: user overrides replace defaults by ID; unknown IDs are appended
	result := make([]appDef, len(defaultApps))
	copy(result, defaultApps)
	for _, ov := range overrides {
		found := false
		for i, def := range result {
			if def.ID == ov.ID {
				result[i] = ov
				found = true
				break
			}
		}
		if !found {
			result = append(result, ov)
		}
	}
	return result
}

// GET /api/apps/status
// Probes each app's health endpoint with a 2-second timeout and returns
// { id, name, url, running, status_code, color, icon, launch_mode } for each.
func appsStatusHandler() http.HandlerFunc {
	client := &http.Client{Timeout: 2 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		apps := loadApps()
		type result struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			URL         string `json:"url"`
			Running     bool   `json:"running"`
			StatusCode  int    `json:"status_code"`
			Color       string `json:"color"`
			Icon        string `json:"icon"`
			LaunchMode  string `json:"launch_mode"`
			LaunchDir   string `json:"launch_dir"`
		}
		out := make([]result, len(apps))
		for i, app := range apps {
			res := result{
				ID:          app.ID,
				Name:        app.Name,
				Description: app.Description,
				URL:         app.URL,
				Color:       app.Color,
				Icon:        app.Icon,
				LaunchMode:  app.LaunchMode,
				LaunchDir:   app.LaunchDir,
			}
			probe := app.URL + app.HealthPath
			resp, err := client.Get(probe)
			if err == nil {
				resp.Body.Close()
				res.Running = resp.StatusCode < 500
				res.StatusCode = resp.StatusCode
			}
			out[i] = res
		}
		writeJSON(w, 200, out)
	}
}

// POST /api/apps/launch
// Body: { "id": "supergit" }
// Launch logic:
//  1. Look up the app definition.
//  2. If launch_mode == "docker_remote": shell out to docker -H <host> compose up -d
//  3. If launch_mode == "docker_local":  shell out to docker compose up -d in LaunchDir
//  4. If launch_mode == "local_make":    run `make <cmd>` in LaunchDir (detached)
//  5. If launch_mode == "none":          return 409 – manual launch required
func appsLaunchHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			ID string `json:"id"`
		}
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			errJSON(w, 400, "id is required")
			return
		}
		apps := loadApps()
		var app *appDef
		for i := range apps {
			if apps[i].ID == body.ID {
				app = &apps[i]
				break
			}
		}
		if app == nil {
			errJSON(w, 404, "app not found: "+body.ID)
			return
		}

		switch app.LaunchMode {
		case "none":
			errJSON(w, 409, "app requires manual launch — no launch_mode configured")
			return

		case "local_make":
			// Split "make web" → ["make", "web"] or use shell for complex commands
			parts := strings.Fields(app.LaunchCmd)
			if len(parts) == 0 {
				errJSON(w, 400, "empty launch_cmd")
				return
			}
			cmd := exec.Command(parts[0], parts[1:]...) //nolint:gosec
			cmd.Dir = app.LaunchDir
			// Detach: stdout/stderr to /dev/null so the HTTP response returns immediately
			cmd.Stdout = nil
			cmd.Stderr = nil
			if err := cmd.Start(); err != nil {
				errJSON(w, 500, "failed to start: "+err.Error())
				return
			}
			// Don't Wait() — let it run in background
			go func() { _ = cmd.Wait() }()

		case "docker_local":
			cmd := exec.Command("docker", "compose", "up", "-d") //nolint:gosec
			cmd.Dir = app.LaunchDir
			if out, err := cmd.CombinedOutput(); err != nil {
				errJSON(w, 500, "docker compose failed: "+string(out))
				return
			}

		case "docker_remote":
			if app.DockerHost == "" {
				errJSON(w, 400, "docker_host not configured for remote launch")
				return
			}
			cmd := exec.Command("docker", "-H", app.DockerHost, "compose", "up", "-d") //nolint:gosec
			cmd.Dir = app.LaunchDir
			if out, err := cmd.CombinedOutput(); err != nil {
				errJSON(w, 500, "remote docker compose failed: "+string(out))
				return
			}

		default:
			errJSON(w, 400, "unknown launch_mode: "+app.LaunchMode)
			return
		}

		writeJSON(w, 200, map[string]any{
			"ok":          true,
			"id":          app.ID,
			"launch_mode": app.LaunchMode,
			"message":     "launch initiated",
		})
	}
}

// ─── App integrations ─────────────────────────────────────────────────────

// integrationDef describes a configured data field from a connected app.
type integrationDef struct {
	ID        string `json:"id"`
	AppID     string `json:"app_id"`
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`    // e.g. "/api/repos"
	Method    string `json:"method"`      // "GET" | "POST"
	FieldPath string `json:"field_path"`  // key to extract from each item (list) or dot-notation path (scalar)
	FieldType string `json:"field_type"`  // "text"|"number"|"date"|"url"|"checkbox"
	IsList    bool   `json:"is_list"`     // true = response is an array; field_path is key per item → becomes a dropdown
	Label     string `json:"label"`       // shown in property picker: "SuperGit: Repository"
}

func raibisDir() string {
	home := os.Getenv("HOME")
	dir := filepath.Join(home, ".raibis")
	_ = os.MkdirAll(dir, 0o755)
	return dir
}

func loadIntegrations() []integrationDef {
	data, err := os.ReadFile(filepath.Join(raibisDir(), "integrations.json"))
	if err != nil {
		return []integrationDef{}
	}
	var out []integrationDef
	if err := json.Unmarshal(data, &out); err != nil {
		return []integrationDef{}
	}
	return out
}

func saveIntegrations(defs []integrationDef) error {
	data, err := json.MarshalIndent(defs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(raibisDir(), "integrations.json"), data, 0o644)
}

// PUT /api/apps — save full apps list to ~/.raibis/apps.json
func saveAppsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var apps []appDef
		if err := readJSON(r, &apps); err != nil {
			errJSON(w, 400, "invalid JSON: "+err.Error())
			return
		}
		data, err := json.MarshalIndent(apps, "", "  ")
		if err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		if err := os.WriteFile(filepath.Join(raibisDir(), "apps.json"), data, 0o644); err != nil {
			errJSON(w, 500, "write failed: "+err.Error())
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "count": len(apps)})
	}
}

// GET /api/integrations — list all; PUT /api/integrations — save all
func integrationsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			writeJSON(w, 200, loadIntegrations())
		case http.MethodPut:
			var defs []integrationDef
			if err := readJSON(r, &defs); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			if err := saveIntegrations(defs); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]any{"ok": true, "count": len(defs)})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// POST /api/integrations/probe
// Body: { app_id, endpoint, method, field_path }
// Returns: { value, inferred_type, error }
func integrationsProbeHandler() http.HandlerFunc {
	client := &http.Client{Timeout: 3 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			AppID     string `json:"app_id"`
			Endpoint  string `json:"endpoint"`
			Method    string `json:"method"`
			FieldPath string `json:"field_path"`
			FieldType string `json:"field_type"` // optional: for mismatch detection
		}
		if err := readJSON(r, &req); err != nil {
			errJSON(w, 400, "invalid JSON: "+err.Error())
			return
		}
		if req.AppID == "" || req.Endpoint == "" {
			errJSON(w, 400, "app_id and endpoint required")
			return
		}

		// Look up app
		apps := loadApps()
		var app *appDef
		for i := range apps {
			if apps[i].ID == req.AppID {
				app = &apps[i]
				break
			}
		}
		if app == nil {
			errJSON(w, 404, "app not found: "+req.AppID)
			return
		}

		method := strings.ToUpper(req.Method)
		if method == "" {
			method = "GET"
		}
		url := app.URL + req.Endpoint
		httpReq, err := http.NewRequest(method, url, nil)
		if err != nil {
			errJSON(w, 400, "bad request: "+err.Error())
			return
		}
		resp, err := client.Do(httpReq)
		if err != nil {
			writeJSON(w, 200, map[string]any{
				"value": nil, "inferred_type": "", "error": "connection failed: " + err.Error(),
			})
			return
		}
		defer resp.Body.Close()

		var body any
		if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
			writeJSON(w, 200, map[string]any{
				"value": nil, "inferred_type": "", "error": "response is not valid JSON",
			})
			return
		}

		// Walk field_path (dot-notation).
		// Special case: if the response root is an array AND field_path has no
		// leading integer index, treat it as "extract this key from each item"
		// (list-type integration). Show a sample of up to 3 values so the user
		// can confirm the field is correct.
		value := body
		isList := false
		if arr, ok := body.([]any); ok && req.FieldPath != "" {
			// Check whether path starts with an integer (explicit indexing)
			firstPart := strings.SplitN(req.FieldPath, ".", 2)[0]
			var tmp int
			if _, err := fmt.Sscanf(firstPart, "%d", &tmp); err != nil {
				// Not an index — list-type: extract field_path from each item
				isList = true
				var samples []any
				for _, item := range arr {
					if m, ok := item.(map[string]any); ok {
						if v, exists := m[req.FieldPath]; exists {
							samples = append(samples, v)
							if len(samples) == 3 {
								break
							}
						}
					}
				}
				value = samples
			}
		}
		if !isList && req.FieldPath != "" {
			for _, part := range strings.Split(req.FieldPath, ".") {
				switch v := value.(type) {
				case map[string]any:
					value = v[part]
				case []any:
					idx := 0
					fmt.Sscanf(part, "%d", &idx)
					if idx >= 0 && idx < len(v) {
						value = v[idx]
					} else {
						value = nil
					}
				default:
					value = nil
				}
				if value == nil {
					break
				}
			}
		}

		// Infer type from first non-nil sample for list, or from scalar
		inferred := "text"
		checkVal := value
		if isList {
			if samples, ok := value.([]any); ok && len(samples) > 0 {
				checkVal = samples[0]
				inferred = "text" // list items are always text unless overridden
			}
		}
		switch checkVal.(type) {
		case float64, int, int64:
			inferred = "number"
		case bool:
			inferred = "checkbox"
		}
		if s, ok := checkVal.(string); ok {
			if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") {
				inferred = "url"
			}
		}

		errMsg := ""
		if req.FieldType != "" && req.FieldType != inferred {
			errMsg = fmt.Sprintf("type mismatch: got %s, expected %s", inferred, req.FieldType)
		}

		writeJSON(w, 200, map[string]any{
			"value":         value,
			"inferred_type": inferred,
			"is_list":       isList,
			"error":         errMsg,
		})
	}
}

// ── Two-way vault sync (with per-field conflict detection) ──────────────────
//
// Goal/Project/Sprint/Task are the only types covered — they're what the
// prior one-way vault→DB sync already handled. Notes/Resources use a
// different filename convention (title-slug, not raibis/{type}/{type}-{id}.md)
// and custom entities/workspaces have no existing reverse-sync path; both are
// out of scope here rather than new ground.
//
// Conflict detection: vault_sync_state stores the last-reconciled value of
// each tracked field per entity. A field only counts as "conflicting" when
// BOTH the current DB value and the current vault value differ from that
// stored baseline AND from each other — a single-sided change (only DB, or
// only vault, changed since last sync) is applied automatically, same as the
// old one-way sync did. On the very first sync for an entity (no baseline
// yet), a field whose DB and vault values already agree (the common case,
// since the app write-throughs to vault on every change) is treated as
// already in sync, not a conflict — only genuine, pre-existing divergence
// surfaces as a conflict on that first pass.

type syncFieldConflict struct {
	Key           string `json:"key"`
	Label         string `json:"label"`
	AppValue      string `json:"app_value"`
	ObsidianValue string `json:"obsidian_value"`
}

type syncConflict struct {
	EntityType string              `json:"entity_type"`
	EntityID   int64               `json:"entity_id"`
	Title      string              `json:"title"`
	Fields     []syncFieldConflict `json:"fields"`
}

var syncFieldLabels = map[string]string{
	"title": "Title", "description": "Description", "status": "Status",
	"priority": "Priority", "due_date": "Due Date", "start_date": "Start Date",
	"end_date": "End Date", "story_points": "Story Points", "type": "Type",
	"year": "Year", "target": "Target", "current_value": "Current Value",
	"start_value": "Start Value", "macro_area": "Macro Area", "goal": "Goal",
	"goal_id": "Goal", "project_id": "Project", "sprint_id": "Sprint",
	"parent_task_id": "Parent Task",
	"reference_id": "Reference ID", "url": "URL", "resource_type": "Resource Type",
	"body": "Body", "task_id": "Task", "icon": "Icon",
}

func syncFieldLabel(key string) string {
	if l, ok := syncFieldLabels[key]; ok {
		return l
	}
	return key
}

func getVaultSyncFields(db *sql.DB, entityType string, entityID int64) map[string]string {
	var raw string
	if err := db.QueryRow(
		`SELECT fields_json FROM vault_sync_state WHERE entity_type=? AND entity_id=?`,
		entityType, entityID,
	).Scan(&raw); err != nil {
		return map[string]string{}
	}
	var m map[string]string
	if json.Unmarshal([]byte(raw), &m) != nil {
		return map[string]string{}
	}
	return m
}

func setVaultSyncFields(db *sql.DB, entityType string, entityID int64, fields map[string]string) {
	raw, err := json.Marshal(fields)
	if err != nil {
		return
	}
	_, _ = db.Exec(
		`INSERT INTO vault_sync_state (entity_type, entity_id, fields_json, synced_at)
		 VALUES (?,?,?,CURRENT_TIMESTAMP)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET fields_json=excluded.fields_json, synced_at=CURRENT_TIMESTAMP`,
		entityType, entityID, string(raw),
	)
}

// diffEntityFields compares current DB/vault field values against the last-
// synced baseline. resolved holds the field set to apply going forward
// (vault's value wins where only vault changed; DB's value is kept — and
// flagged as a conflict — where both sides changed to different values).
// vaultEntityBody returns the current body text (everything after the closing
// frontmatter fence) of an entity's vault file, or "" if the file doesn't
// exist yet. The two-way sync writes only ever touch frontmatter fields, so
// this is read back and passed through on every write to avoid clobbering
// hand-written body content (links sections, comments, notes) with a blank
// body.
func vaultEntityBody(v *vault.Vault, entityType string, id int64) string {
	content, err := v.ReadFile(v.EntityFilePath(entityType, id))
	if err != nil {
		return ""
	}
	_, body := vault.ParseFrontmatter(content)
	return body
}

// fieldsEqual reports whether a and b agree on every key in keys — used to
// detect when a resolved value already matches one side, so that side can be
// left untouched instead of being rewritten (and re-timestamped) every sync.
func fieldsEqual(a, b map[string]string, keys []string) bool {
	for _, k := range keys {
		if a[k] != b[k] {
			return false
		}
	}
	return true
}

func diffEntityFields(dbFields, vaultFields, synced map[string]string, keys []string) (resolved map[string]string, conflicts []syncFieldConflict) {
	resolved = map[string]string{}
	for _, k := range keys {
		dbVal, vaultVal, syncedVal := dbFields[k], vaultFields[k], synced[k]
		dbChanged := dbVal != syncedVal
		vaultChanged := vaultVal != syncedVal
		switch {
		case dbChanged && vaultChanged && dbVal != vaultVal:
			conflicts = append(conflicts, syncFieldConflict{Key: k, Label: syncFieldLabel(k), AppValue: dbVal, ObsidianValue: vaultVal})
			resolved[k] = dbVal // left as-is until the user resolves it
		case vaultChanged:
			resolved[k] = vaultVal
		default:
			resolved[k] = dbVal
		}
	}
	return resolved, conflicts
}

// readOneEntityFields reads the current DB and vault field values for a
// single entity — used by the resolve handler to know what "keep app" /
// "keep obsidian" actually mean for the fields being resolved, without
// re-scanning every row of that entity type.
func readOneEntityFields(db *sql.DB, v *vault.Vault, entityType string, entityID int64) (dbFields, vaultFields map[string]string) {
	dbFields = map[string]string{}
	switch entityType {
	case "goal":
		var title, desc, status, typ, year, startDate, dueDate string
		var startVal, curVal, target sql.NullFloat64
		row := db.QueryRow(`SELECT title, COALESCE(description,''), status, COALESCE(type,''), COALESCE(year,''),
			COALESCE(start_date,''), COALESCE(due_date,''), start_value, current_value, target FROM goals WHERE id=?`, entityID)
		if row.Scan(&title, &desc, &status, &typ, &year, &startDate, &dueDate, &startVal, &curVal, &target) == nil {
			dbFields = map[string]string{"title": title, "description": desc, "status": status, "type": typ, "year": year, "start_date": startDate, "due_date": dueDate}
			if startVal.Valid {
				dbFields["start_value"] = fmt.Sprintf("%g", startVal.Float64)
			}
			if curVal.Valid {
				dbFields["current_value"] = fmt.Sprintf("%g", curVal.Float64)
			}
			if target.Valid {
				dbFields["target"] = fmt.Sprintf("%g", target.Float64)
			}
		}
	case "project":
		var title, desc, status, macro, startDate, dueDate string
		var goalID sql.NullInt64
		row := db.QueryRow(`SELECT title, COALESCE(description,''), status, COALESCE(macro_area,''), goal_id,
			COALESCE(start_date,''), COALESCE(due_date,'') FROM projects WHERE id=?`, entityID)
		if row.Scan(&title, &desc, &status, &macro, &goalID, &startDate, &dueDate) == nil {
			dbFields = map[string]string{"title": title, "description": desc, "status": status, "macro_area": macro, "start_date": startDate, "due_date": dueDate}
			if goalID.Valid {
				dbFields["goal_id"] = strconv.FormatInt(goalID.Int64, 10)
			}
		}
	case "sprint":
		var title, goal, startDate, endDate, status string
		var projID int64
		var storyPts sql.NullInt64
		row := db.QueryRow(`SELECT project_id, title, COALESCE(goal,''), COALESCE(start_date,''), COALESCE(end_date,''), status, story_points FROM sprints WHERE id=?`, entityID)
		if row.Scan(&projID, &title, &goal, &startDate, &endDate, &status, &storyPts) == nil {
			dbFields = map[string]string{"title": title, "goal": goal, "start_date": startDate, "end_date": endDate, "status": status, "project_id": strconv.FormatInt(projID, 10)}
			if storyPts.Valid {
				dbFields["story_points"] = strconv.FormatInt(storyPts.Int64, 10)
			}
		}
	case "task":
		var title, desc, status, priority, dueDate, startDate string
		var storyPts, goalID, projID, sprintID, parentID sql.NullInt64
		row := db.QueryRow(`SELECT title, COALESCE(description,''), status, priority, COALESCE(due_date,''), COALESCE(start_date,''),
			story_points, goal_id, project_id, sprint_id, parent_task_id FROM tasks WHERE id=?`, entityID)
		if row.Scan(&title, &desc, &status, &priority, &dueDate, &startDate, &storyPts, &goalID, &projID, &sprintID, &parentID) == nil {
			dbFields = map[string]string{"title": title, "description": desc, "status": status, "priority": priority, "due_date": dueDate, "start_date": startDate}
			if storyPts.Valid {
				dbFields["story_points"] = strconv.FormatInt(storyPts.Int64, 10)
			}
			if goalID.Valid {
				dbFields["goal_id"] = strconv.FormatInt(goalID.Int64, 10)
			}
			if projID.Valid {
				dbFields["project_id"] = strconv.FormatInt(projID.Int64, 10)
			}
			if sprintID.Valid {
				dbFields["sprint_id"] = strconv.FormatInt(sprintID.Int64, 10)
			}
			if parentID.Valid {
				dbFields["parent_task_id"] = strconv.FormatInt(parentID.Int64, 10)
			}
		}
	case "habit":
		var title, typ string
		var refID sql.NullString
		row := db.QueryRow(`SELECT title, type, reference_id FROM habits WHERE id=?`, entityID)
		if row.Scan(&title, &typ, &refID) == nil {
			dbFields = map[string]string{"title": title, "type": typ}
			if refID.Valid {
				dbFields["reference_id"] = refID.String
			}
		}
	case "resource":
		var title, resType string
		var url, body sql.NullString
		var goalID, projID, taskID sql.NullInt64
		row := db.QueryRow(`SELECT title, COALESCE(url,''), resource_type, COALESCE(body,''), goal_id, project_id, task_id FROM resources WHERE id=?`, entityID)
		if row.Scan(&title, &url, &resType, &body, &goalID, &projID, &taskID) == nil {
			dbFields = map[string]string{"title": title, "url": url.String, "resource_type": resType, "body": body.String}
			if goalID.Valid {
				dbFields["goal_id"] = strconv.FormatInt(goalID.Int64, 10)
			}
			if projID.Valid {
				dbFields["project_id"] = strconv.FormatInt(projID.Int64, 10)
			}
			if taskID.Valid {
				dbFields["task_id"] = strconv.FormatInt(taskID.Int64, 10)
			}
		}
	case "workspace":
		var name, icon string
		row := db.QueryRow(`SELECT name, icon FROM workspaces WHERE id=?`, entityID)
		if row.Scan(&name, &icon) == nil {
			dbFields = map[string]string{"title": name, "icon": icon}
		}
	default:
		// Custom entity type: title column + dynamic props (entity_properties).
		var title string
		row := db.QueryRow(`SELECT title FROM custom_entities WHERE type_name=? AND id=?`, entityType, entityID)
		if row.Scan(&title) == nil {
			dbFields = map[string]string{"title": title}
			rows, err := db.Query(`SELECT key, value FROM entity_properties WHERE entity_type=? AND entity_id=?`, entityType, entityID)
			if err == nil {
				for rows.Next() {
					var k, val string
					if rows.Scan(&k, &val) == nil {
						dbFields[k] = val
					}
				}
				rows.Close()
			}
		}
	}
	content, _ := v.ReadFile(v.EntityFilePath(entityType, entityID))
	vaultFields, _ = vault.ParseFrontmatter(content)
	if vaultFields == nil {
		vaultFields = map[string]string{}
	}
	return dbFields, vaultFields
}

// syncResolution is one field-level conflict resolution choice from the
// frontend's merge-conflict modal.
type syncResolution struct {
	EntityType string `json:"entity_type"`
	EntityID   int64  `json:"entity_id"`
	Field      string `json:"field"`
	Keep       string `json:"keep"` // "app" | "obsidian"
}

// vaultSyncResolveHandler applies the user's per-field conflict choices, then
// re-runs the full two-way sync so the now-unblocked entities (and anything
// else already resolvable) get applied in the same pass.
//
// The trick: rather than duplicating twoWaySyncVault's apply logic, resolving
// a field just means seeding vault_sync_state's baseline for that field to
// whichever side was NOT chosen — that makes the chosen side look like "the
// only thing that changed since last sync" to diffEntityFields, so the next
// sync pass applies it automatically instead of flagging a conflict again.
func vaultSyncResolveHandler(v *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var resolutions []syncResolution
		if err := readJSON(r, &resolutions); err != nil {
			errJSON(w, 400, "invalid JSON: "+err.Error())
			return
		}
		db, err := openRawDB(dbPath)
		if err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		type entityKey struct {
			entityType string
			entityID   int64
		}
		grouped := map[entityKey][]syncResolution{}
		for _, res := range resolutions {
			k := entityKey{res.EntityType, res.EntityID}
			grouped[k] = append(grouped[k], res)
		}
		for k, fieldResolutions := range grouped {
			dbFields, vaultFields := readOneEntityFields(db, v, k.entityType, k.entityID)
			baseline := getVaultSyncFields(db, k.entityType, k.entityID)
			for _, res := range fieldResolutions {
				if res.Keep == "app" {
					baseline[res.Field] = vaultFields[res.Field]
				} else {
					baseline[res.Field] = dbFields[res.Field]
				}
			}
			setVaultSyncFields(db, k.entityType, k.entityID, baseline)
		}
		db.Close()

		applied, remaining := twoWaySyncVault(v, dbPath)
		writeJSON(w, 200, map[string]any{"applied": applied, "conflicts": remaining})
	}
}

// twoWaySyncVault reconciles goal/project/sprint/task rows against their
// vault files in both directions, returning the number of entities updated
// automatically and any per-field conflicts that need user resolution.
// workspaceFolderNames returns every workspace's sanitized, deduped vault
// folder name, keyed by workspace ID — the single source of truth for "what
// folder does workspace X's stuff live under" used by both the per-record
// folder computation below and anything else that needs a workspace's
// on-disk name. Two workspaces that sanitize to the same name are
// disambiguated with a numeric suffix, keyed by ID so a given workspace's
// folder name is stable across calls regardless of iteration order.
func workspaceFolderNames(db *sql.DB) map[int64]string {
	rows, err := db.Query(`SELECT id, name FROM workspaces ORDER BY id ASC`)
	if err != nil {
		return map[int64]string{}
	}
	defer rows.Close()

	type ws struct {
		id   int64
		name string
	}
	var all []ws
	for rows.Next() {
		var w ws
		if rows.Scan(&w.id, &w.name) == nil {
			all = append(all, w)
		}
	}

	folderByWorkspace := map[int64]string{}
	usedNames := map[string]int64{}
	for _, w := range all {
		base := vault.SanitizeFolderName(w.name)
		name := base
		for suffix := 2; ; suffix++ {
			owner, taken := usedNames[name]
			if !taken || owner == w.id {
				break
			}
			name = fmt.Sprintf("%s-%d", base, suffix)
		}
		usedNames[name] = w.id
		folderByWorkspace[w.id] = name
	}
	return folderByWorkspace
}

// computeRecordFolders reads every entity table's workspace_id column and
// returns the record → workspace-folder map the vault needs (keyed
// "{entityType}:{id}"), plus the full list of folder names currently in use.
// A record with workspace_id NULL is simply absent from the map — the vault
// treats an absent key as top-level.
func computeRecordFolders(db *sql.DB) (records map[string]string, folders []string) {
	folderByWorkspace := workspaceFolderNames(db)
	records = map[string]string{}

	tableFor := map[string]string{
		"task": "tasks", "goal": "goals", "project": "projects",
		"sprint": "sprints", "habit": "habits", "resource": "resources",
	}
	for entityType, table := range tableFor {
		rows, err := db.Query(fmt.Sprintf(`SELECT id, workspace_id FROM %s WHERE workspace_id IS NOT NULL`, table))
		if err != nil {
			continue
		}
		for rows.Next() {
			var id, wsID int64
			if rows.Scan(&id, &wsID) == nil {
				if folder, ok := folderByWorkspace[wsID]; ok {
					records[recordFolderKey(entityType, id)] = folder
				}
			}
		}
		rows.Close()
	}

	rows, err := db.Query(`SELECT id, type_name, workspace_id FROM custom_entities WHERE workspace_id IS NOT NULL`)
	if err == nil {
		for rows.Next() {
			var id, wsID int64
			var typeName string
			if rows.Scan(&id, &typeName, &wsID) == nil {
				if folder, ok := folderByWorkspace[wsID]; ok {
					records[recordFolderKey(typeName, id)] = folder
				}
			}
		}
		rows.Close()
	}

	seen := map[string]bool{}
	for _, folder := range folderByWorkspace {
		if !seen[folder] {
			seen[folder] = true
			folders = append(folders, folder)
		}
	}
	return records, folders
}

// recordFolderKey matches vault.recordKey's format (unexported there, so
// duplicated here — must stay in sync with how SetRecordFolders' keys read).
func recordFolderKey(entityType string, id int64) string {
	return fmt.Sprintf("%s:%d", entityType, id)
}

// refreshWorkspaceVaultFolders recomputes the record → workspace-folder map
// from the DB, physically moves every record whose folder changed (including
// back to top-level for records no longer assigned to any workspace), and
// swaps the vault's resolver over to the new map. Safe to call often — a
// no-op pass costs a handful of queries and map diffs.
func refreshWorkspaceVaultFolders(db *sql.DB, v *vault.Vault) {
	newRecords, folders := computeRecordFolders(db)
	oldRecords := v.RecordFolders()

	seen := map[string]bool{}
	for key, newFolder := range newRecords {
		seen[key] = true
		if oldRecords[key] != newFolder {
			entityType, id := splitRecordFolderKey(key)
			if entityType == "" {
				continue
			}
			if err := v.MoveEntityFile(entityType, id, oldRecords[key], newFolder); err != nil {
				log.Printf("vault: move %s to workspace folder %q: %v", key, newFolder, err)
			}
		}
	}
	for key, oldFolder := range oldRecords {
		if seen[key] || oldFolder == "" {
			continue
		}
		entityType, id := splitRecordFolderKey(key)
		if entityType == "" {
			continue
		}
		if err := v.MoveEntityFile(entityType, id, oldFolder, ""); err != nil {
			log.Printf("vault: move %s back to top level: %v", key, err)
		}
	}
	v.SetRecordFolders(newRecords, folders)
}

// splitRecordFolderKey parses a "{entityType}:{id}" key back into its parts.
func splitRecordFolderKey(key string) (entityType string, id int64) {
	idx := strings.LastIndex(key, ":")
	if idx < 0 {
		return "", 0
	}
	n, err := strconv.ParseInt(key[idx+1:], 10, 64)
	if err != nil {
		return "", 0
	}
	return key[:idx], n
}

func twoWaySyncVault(v *vault.Vault, dbPath string) (applied int, conflicts []syncConflict) {
	db, err := openRawDB(dbPath)
	if err != nil {
		log.Printf("vault sync: open db: %v", err)
		return 0, nil
	}
	defer db.Close()

	refreshWorkspaceVaultFolders(db, v)

	applied += syncGoalsTwoWay(db, v, &conflicts)
	applied += syncProjectsTwoWay(db, v, &conflicts)
	applied += syncSprintsTwoWay(db, v, &conflicts)
	applied += syncTasksTwoWay(db, v, &conflicts)
	applied += syncHabitsTwoWay(db, v, &conflicts)
	applied += syncResourcesTwoWay(db, v, &conflicts)
	applied += syncWorkspacesTwoWay(db, v, &conflicts)

	typeRows, err := db.Query(`SELECT name, prop_defs FROM custom_entity_types`)
	if err == nil {
		var types []struct{ name, propDefs string }
		for typeRows.Next() {
			var t struct{ name, propDefs string }
			if typeRows.Scan(&t.name, &t.propDefs) == nil {
				types = append(types, t)
			}
		}
		typeRows.Close()
		for _, t := range types {
			applied += syncCustomEntityTypeTwoWay(db, v, &conflicts, t.name, customTypePropKeys(t.propDefs))
		}
	}
	return applied, conflicts
}

// customTypePropKeys extracts the scalar (non-relation) prop keys from a
// custom entity type's prop_defs JSON — relation-typed props are stored as
// wiki-link JSON blobs that don't round-trip through plain frontmatter
// diffing the way scalar values do, so they're excluded from two-way sync.
func customTypePropKeys(propDefsJSON string) []string {
	var defs []struct {
		Key  string `json:"key"`
		Type string `json:"type"`
	}
	if propDefsJSON == "" || json.Unmarshal([]byte(propDefsJSON), &defs) != nil {
		return nil
	}
	var keys []string
	for _, d := range defs {
		if d.Key != "" && d.Type != "relation" && !strings.HasPrefix(d.Key, "_") {
			keys = append(keys, d.Key)
		}
	}
	return keys
}

var goalSyncKeys = []string{"title", "description", "status", "type", "year", "start_date", "due_date", "start_value", "current_value", "target"}

func syncGoalsTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	createdAts := map[int64]string{}
	rows, err := db.Query(`SELECT id, title, COALESCE(description,''), status, COALESCE(type,''), COALESCE(year,''),
		COALESCE(start_date,''), COALESCE(due_date,''), start_value, current_value, target, created_at FROM goals`)
	if err == nil {
		for rows.Next() {
			var id int64
			var title, desc, status, typ, year, startDate, dueDate, createdAt string
			var startVal, curVal, target sql.NullFloat64
			if rows.Scan(&id, &title, &desc, &status, &typ, &year, &startDate, &dueDate, &startVal, &curVal, &target, &createdAt) != nil {
				continue
			}
			f := map[string]string{"title": title, "description": desc, "status": status, "type": typ, "year": year, "start_date": startDate, "due_date": dueDate}
			if startVal.Valid {
				f["start_value"] = fmt.Sprintf("%g", startVal.Float64)
			}
			if curVal.Valid {
				f["current_value"] = fmt.Sprintf("%g", curVal.Float64)
			}
			if target.Valid {
				f["target"] = fmt.Sprintf("%g", target.Float64)
			}
			dbRows[id] = f
			createdAts[id] = createdAt
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("goal")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, "goal", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, goalSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("goal-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "goal", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, goalSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, goalSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			createdAt := createdAts[id]
			if createdAt == "" {
				createdAt = fmDefault(vaultFields["created_at"], time.Now().UTC().Format("2006-01-02T15:04:05Z"))
			}
			if !dbMatches {
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO goals (id,title,description,status,type,year,start_date,due_date,start_value,current_value,target,created_at)
						VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
						id, resolved["title"], nullStr(resolved["description"]), fmDefault(resolved["status"], "active"),
						nullStr(resolved["type"]), nullStr(resolved["year"]), nullStr(resolved["start_date"]), nullStr(resolved["due_date"]),
						fmFloat64(resolved["start_value"]), fmFloat64(resolved["current_value"]), fmFloat64(resolved["target"]), createdAt)
				} else {
					_, dbErr = db.Exec(`UPDATE goals SET title=?, description=?, status=?, type=?, year=?, start_date=?, due_date=?, start_value=?, current_value=?, target=? WHERE id=?`,
						resolved["title"], nullStr(resolved["description"]), fmDefault(resolved["status"], "active"),
						nullStr(resolved["type"]), nullStr(resolved["year"]), nullStr(resolved["start_date"]), nullStr(resolved["due_date"]),
						fmFloat64(resolved["start_value"]), fmFloat64(resolved["current_value"]), fmFloat64(resolved["target"]), id)
				}
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					fm := map[string]any{"id": id, "title": resolved["title"], "aliases": []string{resolved["title"]}, "status": resolved["status"], "created_at": createdAt}
					if resolved["description"] != "" {
						fm["description"] = resolved["description"]
					}
					if resolved["type"] != "" {
						fm["type"] = resolved["type"]
					}
					if resolved["year"] != "" {
						fm["year"] = resolved["year"]
					}
					if resolved["due_date"] != "" {
						fm["due_date"] = resolved["due_date"]
					}
					if resolved["start_date"] != "" {
						fm["start_date"] = resolved["start_date"]
					}
					if resolved["target"] != "" {
						fm["target"] = fmFloat64(resolved["target"])
					}
					if resolved["current_value"] != "" {
						fm["current_value"] = fmFloat64(resolved["current_value"])
					}
					_ = v.WriteEntityMD("goal", id, fm, vaultEntityBody(v, "goal", id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "goal", id, resolved)
		}
	}
	return applied
}

var projectSyncKeys = []string{"title", "description", "status", "macro_area", "goal_id", "start_date", "due_date"}

func syncProjectsTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	createdAts := map[int64]string{}
	rows, err := db.Query(`SELECT id, title, COALESCE(description,''), status, COALESCE(macro_area,''), goal_id,
		COALESCE(start_date,''), COALESCE(due_date,''), created_at FROM projects`)
	if err == nil {
		for rows.Next() {
			var id int64
			var title, desc, status, macro, startDate, dueDate, createdAt string
			var goalID sql.NullInt64
			if rows.Scan(&id, &title, &desc, &status, &macro, &goalID, &startDate, &dueDate, &createdAt) != nil {
				continue
			}
			f := map[string]string{"title": title, "description": desc, "status": status, "macro_area": macro, "start_date": startDate, "due_date": dueDate}
			if goalID.Valid {
				f["goal_id"] = strconv.FormatInt(goalID.Int64, 10)
			}
			dbRows[id] = f
			createdAts[id] = createdAt
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("project")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, "project", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, projectSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("project-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "project", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, projectSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, projectSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			createdAt := createdAts[id]
			if createdAt == "" {
				createdAt = fmDefault(vaultFields["created_at"], time.Now().UTC().Format("2006-01-02T15:04:05Z"))
			}
			if !dbMatches {
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO projects (id,goal_id,title,description,status,macro_area,start_date,due_date,created_at)
						VALUES (?,?,?,?,?,?,?,?,?)`,
						id, fmInt64(resolved["goal_id"]), resolved["title"], nullStr(resolved["description"]),
						fmDefault(resolved["status"], "active"), nullStr(resolved["macro_area"]),
						nullStr(resolved["start_date"]), nullStr(resolved["due_date"]), createdAt)
				} else {
					_, dbErr = db.Exec(`UPDATE projects SET title=?, description=?, status=?, macro_area=?, goal_id=?, start_date=?, due_date=? WHERE id=?`,
						resolved["title"], nullStr(resolved["description"]), fmDefault(resolved["status"], "active"),
						nullStr(resolved["macro_area"]), fmInt64(resolved["goal_id"]),
						nullStr(resolved["start_date"]), nullStr(resolved["due_date"]), id)
				}
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					fm := map[string]any{"id": id, "title": resolved["title"], "aliases": []string{resolved["title"]}, "status": resolved["status"], "created_at": createdAt}
					if resolved["description"] != "" {
						fm["description"] = resolved["description"]
					}
					if resolved["goal_id"] != "" {
						fm["goal_id"] = fmInt64(resolved["goal_id"])
					}
					if resolved["macro_area"] != "" {
						fm["macro_area"] = resolved["macro_area"]
					}
					if resolved["due_date"] != "" {
						fm["due_date"] = resolved["due_date"]
					}
					if resolved["start_date"] != "" {
						fm["start_date"] = resolved["start_date"]
					}
					_ = v.WriteEntityMD("project", id, fm, vaultEntityBody(v, "project", id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "project", id, resolved)
		}
	}
	return applied
}

var sprintSyncKeys = []string{"title", "goal", "start_date", "end_date", "status", "project_id", "story_points"}

func syncSprintsTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	createdAts := map[int64]string{}
	rows, err := db.Query(`SELECT id, project_id, title, COALESCE(goal,''), COALESCE(start_date,''), COALESCE(end_date,''), status, story_points, created_at FROM sprints`)
	if err == nil {
		for rows.Next() {
			var id, projID int64
			var title, goal, startDate, endDate, status, createdAt string
			var storyPts sql.NullInt64
			if rows.Scan(&id, &projID, &title, &goal, &startDate, &endDate, &status, &storyPts, &createdAt) != nil {
				continue
			}
			f := map[string]string{"title": title, "goal": goal, "start_date": startDate, "end_date": endDate, "status": status, "project_id": strconv.FormatInt(projID, 10)}
			if storyPts.Valid {
				f["story_points"] = strconv.FormatInt(storyPts.Int64, 10)
			}
			dbRows[id] = f
			createdAts[id] = createdAt
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("sprint")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		// A sprint needs a project to attach to — skip vault-only files with no resolvable project_id.
		projID := fmInt64(dbFields["project_id"])
		if projID == nil {
			projID = fmInt64(vaultFields["project_id"])
		}
		if projID == nil {
			continue
		}
		synced := getVaultSyncFields(db, "sprint", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, sprintSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("sprint-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "sprint", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, sprintSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, sprintSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			createdAt := createdAts[id]
			if createdAt == "" {
				createdAt = fmDefault(vaultFields["created_at"], time.Now().UTC().Format("2006-01-02T15:04:05Z"))
			}
			if !dbMatches {
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO sprints (id,project_id,title,goal,start_date,end_date,status,story_points,created_at)
						VALUES (?,?,?,?,?,?,?,?,?)`,
						id, projID, resolved["title"], nullStr(resolved["goal"]),
						nullStr(resolved["start_date"]), nullStr(resolved["end_date"]),
						fmDefault(resolved["status"], "planned"), fmInt64(resolved["story_points"]), createdAt)
				} else {
					_, dbErr = db.Exec(`UPDATE sprints SET title=?, goal=?, start_date=?, end_date=?, status=?, project_id=?, story_points=? WHERE id=?`,
						resolved["title"], nullStr(resolved["goal"]), nullStr(resolved["start_date"]), nullStr(resolved["end_date"]),
						fmDefault(resolved["status"], "planned"), projID, fmInt64(resolved["story_points"]), id)
				}
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					fm := map[string]any{"id": id, "title": resolved["title"], "aliases": []string{resolved["title"]}, "project_id": projID, "status": resolved["status"], "created_at": createdAt}
					if resolved["goal"] != "" {
						fm["goal"] = resolved["goal"]
					}
					if resolved["start_date"] != "" {
						fm["start_date"] = resolved["start_date"]
					}
					if resolved["end_date"] != "" {
						fm["end_date"] = resolved["end_date"]
					}
					if resolved["story_points"] != "" {
						fm["story_points"] = fmInt64(resolved["story_points"])
					}
					_ = v.WriteEntityMD("sprint", id, fm, vaultEntityBody(v, "sprint", id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "sprint", id, resolved)
		}
	}
	return applied
}

var taskSyncKeys = []string{"title", "description", "status", "priority", "due_date", "start_date", "story_points", "goal_id", "project_id", "sprint_id", "parent_task_id"}

func syncTasksTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	createdAts := map[int64]string{}
	updatedAts := map[int64]string{}
	rows, err := db.Query(`SELECT id, title, COALESCE(description,''), status, priority, COALESCE(due_date,''), COALESCE(start_date,''),
		story_points, goal_id, project_id, sprint_id, parent_task_id, created_at, updated_at FROM tasks`)
	if err == nil {
		for rows.Next() {
			var id int64
			var title, desc, status, priority, dueDate, startDate, createdAt, updatedAt string
			var storyPts, goalID, projID, sprintID, parentID sql.NullInt64
			if rows.Scan(&id, &title, &desc, &status, &priority, &dueDate, &startDate, &storyPts, &goalID, &projID, &sprintID, &parentID, &createdAt, &updatedAt) != nil {
				continue
			}
			f := map[string]string{"title": title, "description": desc, "status": status, "priority": priority, "due_date": dueDate, "start_date": startDate}
			if storyPts.Valid {
				f["story_points"] = strconv.FormatInt(storyPts.Int64, 10)
			}
			if goalID.Valid {
				f["goal_id"] = strconv.FormatInt(goalID.Int64, 10)
			}
			if projID.Valid {
				f["project_id"] = strconv.FormatInt(projID.Int64, 10)
			}
			if sprintID.Valid {
				f["sprint_id"] = strconv.FormatInt(sprintID.Int64, 10)
			}
			if parentID.Valid {
				f["parent_task_id"] = strconv.FormatInt(parentID.Int64, 10)
			}
			dbRows[id] = f
			createdAts[id] = createdAt
			updatedAts[id] = updatedAt
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("task")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, "task", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, taskSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("task-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "task", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, taskSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, taskSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			createdAt := createdAts[id]
			if createdAt == "" {
				createdAt = fmDefault(vaultFields["created_at"], time.Now().UTC().Format("2006-01-02T15:04:05Z"))
			}
			updatedAt := updatedAts[id]
			if !dbMatches {
				updatedAt = time.Now().UTC().Format("2006-01-02T15:04:05Z")
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO tasks (id,goal_id,project_id,sprint_id,parent_task_id,title,description,status,priority,due_date,start_date,story_points,created_at,updated_at)
						VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
						id, fmInt64(resolved["goal_id"]), fmInt64(resolved["project_id"]), fmInt64(resolved["sprint_id"]), fmInt64(resolved["parent_task_id"]),
						resolved["title"], nullStr(resolved["description"]), fmDefault(resolved["status"], "todo"), fmDefault(resolved["priority"], "medium"),
						nullStr(resolved["due_date"]), nullStr(resolved["start_date"]), fmInt64(resolved["story_points"]), createdAt, updatedAt)
				} else {
					_, dbErr = db.Exec(`UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, start_date=?, story_points=?, goal_id=?, project_id=?, sprint_id=?, parent_task_id=?, updated_at=? WHERE id=?`,
						resolved["title"], nullStr(resolved["description"]), fmDefault(resolved["status"], "todo"), fmDefault(resolved["priority"], "medium"),
						nullStr(resolved["due_date"]), nullStr(resolved["start_date"]), fmInt64(resolved["story_points"]),
						fmInt64(resolved["goal_id"]), fmInt64(resolved["project_id"]), fmInt64(resolved["sprint_id"]), fmInt64(resolved["parent_task_id"]), updatedAt, id)
				}
			}
			if dbErr == nil {
				applied++
				if updatedAt == "" {
					updatedAt = createdAt
				}
				if !vaultMatches {
					fm := map[string]any{"id": id, "title": resolved["title"], "aliases": []string{resolved["title"]}, "status": resolved["status"], "priority": resolved["priority"], "created_at": createdAt, "updated_at": updatedAt}
					if resolved["description"] != "" {
						fm["description"] = resolved["description"]
					}
					if resolved["goal_id"] != "" {
						fm["goal_id"] = fmInt64(resolved["goal_id"])
					}
					if resolved["project_id"] != "" {
						fm["project_id"] = fmInt64(resolved["project_id"])
					}
					if resolved["sprint_id"] != "" {
						fm["sprint_id"] = fmInt64(resolved["sprint_id"])
					}
					if resolved["parent_task_id"] != "" {
						fm["parent_task_id"] = fmInt64(resolved["parent_task_id"])
					}
					if resolved["due_date"] != "" {
						fm["due_date"] = resolved["due_date"]
					}
					if resolved["start_date"] != "" {
						fm["start_date"] = resolved["start_date"]
					}
					if resolved["story_points"] != "" {
						fm["story_points"] = fmInt64(resolved["story_points"])
					}
					_ = v.WriteEntityMD("task", id, fm, vaultEntityBody(v, "task", id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "task", id, resolved)
		}
	}
	return applied
}


var habitSyncKeys = []string{"title", "type", "reference_id"}

func syncHabitsTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	rows, err := db.Query(`SELECT id, title, type, reference_id FROM habits`)
	if err == nil {
		for rows.Next() {
			var id int64
			var title, typ string
			var refID sql.NullString
			if rows.Scan(&id, &title, &typ, &refID) != nil {
				continue
			}
			f := map[string]string{"title": title, "type": typ}
			if refID.Valid {
				f["reference_id"] = refID.String
			}
			dbRows[id] = f
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("habit")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, "habit", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, habitSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("habit-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "habit", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, habitSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, habitSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			if !dbMatches {
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO habits (id, title, type, reference_id) VALUES (?,?,?,?)`,
						id, resolved["title"], fmDefault(resolved["type"], "general"), nullStr(resolved["reference_id"]))
				} else {
					_, dbErr = db.Exec(`UPDATE habits SET title=?, type=?, reference_id=? WHERE id=?`,
						resolved["title"], fmDefault(resolved["type"], "general"), nullStr(resolved["reference_id"]), id)
				}
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					h := &domain.Habit{ID: id, Title: resolved["title"], Type: domain.HabitType(fmDefault(resolved["type"], "general")), ReferenceID: strPtrOrNil(resolved["reference_id"])}
					_ = v.WriteEntityMD("habit", id, habitFM(h), vaultEntityBody(v, "habit", id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "habit", id, resolved)
		}
	}
	return applied
}

var resourceSyncKeys = []string{"title", "url", "resource_type", "body", "goal_id", "project_id", "task_id"}

func syncResourcesTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	rows, err := db.Query(`SELECT id, title, COALESCE(url,''), resource_type, COALESCE(body,''), goal_id, project_id, task_id FROM resources`)
	if err == nil {
		for rows.Next() {
			var id int64
			var title, url, resType, body string
			var goalID, projID, taskID sql.NullInt64
			if rows.Scan(&id, &title, &url, &resType, &body, &goalID, &projID, &taskID) != nil {
				continue
			}
			f := map[string]string{"title": title, "url": url, "resource_type": resType, "body": body}
			if goalID.Valid {
				f["goal_id"] = strconv.FormatInt(goalID.Int64, 10)
			}
			if projID.Valid {
				f["project_id"] = strconv.FormatInt(projID.Int64, 10)
			}
			if taskID.Valid {
				f["task_id"] = strconv.FormatInt(taskID.Int64, 10)
			}
			dbRows[id] = f
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("resource")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, "resource", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, resourceSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("resource-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "resource", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, resourceSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, resourceSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			if !dbMatches {
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO resources (id, title, url, resource_type, body, goal_id, project_id, task_id) VALUES (?,?,?,?,?,?,?,?)`,
						id, resolved["title"], nullStr(resolved["url"]), fmDefault(resolved["resource_type"], "link"), nullStr(resolved["body"]),
						fmInt64(resolved["goal_id"]), fmInt64(resolved["project_id"]), fmInt64(resolved["task_id"]))
				} else {
					_, dbErr = db.Exec(`UPDATE resources SET title=?, url=?, resource_type=?, body=?, goal_id=?, project_id=?, task_id=? WHERE id=?`,
						resolved["title"], nullStr(resolved["url"]), fmDefault(resolved["resource_type"], "link"), nullStr(resolved["body"]),
						fmInt64(resolved["goal_id"]), fmInt64(resolved["project_id"]), fmInt64(resolved["task_id"]), id)
				}
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					_ = v.WriteEntityMD("resource", id, resourceFM(id, resolved["title"], resolved["url"], resolved["resource_type"], resolved["body"],
						fmInt64Ptr(resolved["goal_id"]), fmInt64Ptr(resolved["project_id"]), fmInt64Ptr(resolved["task_id"])), vaultEntityBody(v, "resource", id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "resource", id, resolved)
		}
	}
	return applied
}

var workspaceSyncKeys = []string{"title", "icon"}

// syncWorkspacesTwoWay reconciles workspace name/icon in both directions.
// Entity-type assignment (SetWorkspaceEntityTypes) has no frontmatter
// representation — it's listed as a body bullet list, not YAML fields — so it
// isn't diffed here; a workspace also can't be newly created from a
// hand-written vault file alone, since it has no entity-type assignment to
// seed. Both stay app-managed; only name/icon round-trip from Obsidian edits.
func syncWorkspacesTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict) int {
	applied := 0
	dbRows := map[int64]map[string]string{}
	rows, err := db.Query(`SELECT id, name, icon FROM workspaces`)
	if err == nil {
		for rows.Next() {
			var id int64
			var name, icon string
			if rows.Scan(&id, &name, &icon) != nil {
				continue
			}
			dbRows[id] = map[string]string{"title": name, "icon": icon}
		}
		rows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles("workspace")
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	for id, dbFields := range dbRows {
		vaultFields, hadVault := vaultRows[id]
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, "workspace", id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, workspaceSyncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("workspace-%d", id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: "workspace", EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := fieldsEqual(resolved, dbFields, workspaceSyncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, workspaceSyncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			if !dbMatches {
				_, dbErr = db.Exec(`UPDATE workspaces SET name=?, icon=? WHERE id=?`, resolved["title"], resolved["icon"], id)
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					var entityTypes []string
					etRows, err := db.Query(`SELECT entity_type FROM workspace_entity_types WHERE workspace_id=? ORDER BY entity_type ASC`, id)
					if err == nil {
						for etRows.Next() {
							var et string
							if etRows.Scan(&et) == nil {
								entityTypes = append(entityTypes, et)
							}
						}
						etRows.Close()
					}
					ws := &domain.Workspace{ID: id, Name: resolved["title"], Icon: resolved["icon"], EntityTypes: entityTypes}
					_ = v.WriteEntityMD("workspace", id, workspaceFM(ws), workspaceLinksBody(ws))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, "workspace", id, resolved)
		}
	}
	return applied
}

// syncCustomEntityTypeTwoWay reconciles one custom entity type's records —
// title plus its scalar (non-relation) prop keys — in both directions.
func syncCustomEntityTypeTwoWay(db *sql.DB, v *vault.Vault, conflicts *[]syncConflict, typeName string, propKeys []string) int {
	applied := 0
	syncKeys := append([]string{"title"}, propKeys...)

	dbRows := map[int64]map[string]string{}
	rows, err := db.Query(`SELECT id, title FROM custom_entities WHERE type_name=?`, typeName)
	if err == nil {
		for rows.Next() {
			var id int64
			var title string
			if rows.Scan(&id, &title) != nil {
				continue
			}
			dbRows[id] = map[string]string{"title": title}
		}
		rows.Close()
	}
	propRows, err := db.Query(`SELECT entity_id, key, value FROM entity_properties WHERE entity_type=?`, typeName)
	if err == nil {
		for propRows.Next() {
			var id int64
			var k, val string
			if propRows.Scan(&id, &k, &val) != nil {
				continue
			}
			if _, ok := dbRows[id]; ok {
				dbRows[id][k] = val
			}
		}
		propRows.Close()
	}

	vaultFiles, _ := v.ScanEntityFiles(typeName)
	vaultRows := map[int64]map[string]string{}
	for _, fm := range vaultFiles {
		id, _ := strconv.ParseInt(fm["id"], 10, 64)
		if id > 0 {
			vaultRows[id] = fm
		}
	}

	ids := map[int64]bool{}
	for id := range dbRows {
		ids[id] = true
	}
	for id := range vaultRows {
		ids[id] = true
	}

	for id := range ids {
		dbFields, hadDB := dbRows[id]
		vaultFields, hadVault := vaultRows[id]
		if dbFields == nil {
			dbFields = map[string]string{}
		}
		if vaultFields == nil {
			vaultFields = map[string]string{}
		}
		synced := getVaultSyncFields(db, typeName, id)
		resolved, fieldConflicts := diffEntityFields(dbFields, vaultFields, synced, syncKeys)

		if len(fieldConflicts) > 0 {
			title := resolved["title"]
			if title == "" {
				title = fmt.Sprintf("%s-%d", typeName, id)
			}
			*conflicts = append(*conflicts, syncConflict{EntityType: typeName, EntityID: id, Title: title, Fields: fieldConflicts})
			continue
		}

		dbMatches := hadDB && fieldsEqual(resolved, dbFields, syncKeys)
		vaultMatches := hadVault && fieldsEqual(resolved, vaultFields, syncKeys)
		dbErr := error(nil)
		if !dbMatches || !vaultMatches {
			if !dbMatches {
				if !hadDB {
					_, dbErr = db.Exec(`INSERT INTO custom_entities (id, type_name, title) VALUES (?,?,?)`, id, typeName, resolved["title"])
				} else {
					_, dbErr = db.Exec(`UPDATE custom_entities SET title=? WHERE id=?`, resolved["title"], id)
				}
				if dbErr == nil {
					for _, k := range propKeys {
						_, _ = db.Exec(`INSERT INTO entity_properties (entity_type, entity_id, key, value) VALUES (?,?,?,?)
							ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value`, typeName, id, k, resolved[k])
					}
				}
			}
			if dbErr == nil {
				applied++
				if !vaultMatches {
					e := &domain.CustomEntity{ID: id, TypeName: typeName, Title: resolved["title"], Props: map[string]string{}}
					for _, k := range propKeys {
						e.Props[k] = resolved[k]
					}
					_ = v.WriteEntityMD(typeName, id, customEntityFM(nil, e), vaultEntityBody(v, typeName, id))
				}
			}
		}
		if dbErr == nil {
			setVaultSyncFields(db, typeName, id, resolved)
		}
	}
	return applied
}

// ── Vault Sync Handler ────────────────────────────────────────────────────────

func vaultSyncHandler(v *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		applied, conflicts := twoWaySyncVault(v, dbPath)
		if conflicts == nil {
			conflicts = []syncConflict{}
		}
		writeJSON(w, 200, map[string]any{"applied": applied, "conflicts": conflicts})
	}
}

// ── Custom Entity Types Handlers ──────────────────────────────────────────────

// customTypesHandler handles GET /api/custom-types and POST /api/custom-types
func customTypesHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			types, err := store.ListCustomEntityTypes()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if types == nil {
				types = []*domain.CustomEntityType{}
			}
			writeJSON(w, 200, types)

		case http.MethodPost:
			var t domain.CustomEntityType
			if err := readJSON(r, &t); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			if t.Name == "" || t.DisplayName == "" {
				errJSON(w, 400, "name and display_name are required")
				return
			}
			if t.Icon == "" {
				t.Icon = "📁"
			}
			if t.PropDefs == "" {
				t.PropDefs = "[]"
			}
			id, err := store.CreateCustomEntityType(&t)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			t.ID = id
			writeJSON(w, 201, t)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// customTypeHandler handles PUT /api/custom-types/{name} and DELETE /api/custom-types/{name}
func customTypeHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract name from path: /api/custom-types/{name}
		parts := strings.Split(strings.TrimRight(r.URL.Path, "/"), "/")
		if len(parts) == 0 {
			errJSON(w, 400, "missing type name")
			return
		}
		name := parts[len(parts)-1]
		if name == "" {
			errJSON(w, 400, "missing type name")
			return
		}

		switch r.Method {
		case http.MethodPut:
			var t domain.CustomEntityType
			if err := readJSON(r, &t); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			t.Name = name
			if err := store.UpdateCustomEntityType(&t); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, t)

		case http.MethodDelete:
			if err := store.DeleteCustomEntityType(name); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Workspaces Handler ────────────────────────────────────────────────────────

// workspacesHandler handles GET/POST /api/workspaces
// workspaceFM builds the vault frontmatter for a workspace's raibis/workspace/workspace-{id}.md file.
func workspaceFM(ws *domain.Workspace) map[string]any {
	return map[string]any{
		"id":       ws.ID,
		"title":    ws.Name,
		"aliases":  []string{ws.Name},
		"icon":     ws.Icon,
		"position": ws.Position,
	}
}

// workspaceLinksBody lists the entity types currently assigned to a
// workspace — analogous to the "## Sub-items"/"## Children" sections other
// entity types get, just listing type keys rather than wiki-linking to
// individual records (entity types don't have their own vault pages).
func workspaceLinksBody(ws *domain.Workspace) string {
	if len(ws.EntityTypes) == 0 {
		return ""
	}
	lines := []string{"", "## Entity Types"}
	for _, et := range ws.EntityTypes {
		lines = append(lines, fmt.Sprintf("- %s", et))
	}
	return strings.Join(lines, "\n")
}

// refreshWorkspaceVaultFoldersAt is refreshWorkspaceVaultFolders for callers
// that only have dbPath, not an already-open *sql.DB (i.e. HTTP handlers).
func refreshWorkspaceVaultFoldersAt(dbPath string, v *vault.Vault) {
	db, err := openRawDB(dbPath)
	if err != nil {
		return
	}
	defer db.Close()
	refreshWorkspaceVaultFolders(db, v)
}

func workspacesHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			workspaces, err := store.ListWorkspaces()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if workspaces == nil {
				workspaces = []*domain.Workspace{}
			}
			writeJSON(w, 200, workspaces)

		case http.MethodPost:
			var ws domain.Workspace
			if err := readJSON(r, &ws); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			if ws.Name == "" {
				errJSON(w, 400, "name is required")
				return
			}
			if ws.Icon == "" {
				ws.Icon = "🗂️"
			}
			id, err := store.CreateWorkspace(&ws)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			ws.ID = id
			if vlt != nil {
				_ = vlt.WriteEntityMD("workspace", id, workspaceFM(&ws), workspaceLinksBody(&ws))
			}
			writeJSON(w, 201, ws)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// workspaceHandler handles PUT/DELETE /api/workspaces/{id} and
// PUT /api/workspaces/{id}/entity-types
func workspaceHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rest := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
		rest = strings.TrimRight(rest, "/")
		pathParts := strings.SplitN(rest, "/", 2)
		idStr := pathParts[0]
		if idStr == "" {
			errJSON(w, 400, "missing workspace id")
			return
		}
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			errJSON(w, 400, "invalid workspace id")
			return
		}

		// /api/workspaces/{id}/entity-types
		if len(pathParts) == 2 && pathParts[1] == "entity-types" {
			if r.Method != http.MethodPut {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
			var body struct {
				EntityTypes []string `json:"entity_types"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			if err := store.SetWorkspaceEntityTypes(id, body.EntityTypes); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			ws, err := store.GetWorkspace(id)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD("workspace", id, workspaceFM(ws), workspaceLinksBody(ws))
			}
			writeJSON(w, 200, ws)
			return
		}

		switch r.Method {
		case http.MethodPut:
			var ws domain.Workspace
			if err := readJSON(r, &ws); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			ws.ID = id
			if err := store.UpdateWorkspace(&ws); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, err := store.GetWorkspace(id)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD("workspace", id, workspaceFM(updated), workspaceLinksBody(updated))
			}
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			if err := store.DeleteWorkspace(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.DeleteEntityMD("workspace", id)
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Custom Entities Handler ───────────────────────────────────────────────────

// customEntitiesHandler handles all /api/custom/{type} and /api/custom/{type}/{id} requests.
func customEntityFM(store storage.Storage, e *domain.CustomEntity) map[string]any {
	createdAt := e.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now()
	}
	fm := map[string]any{
		"id":         e.ID,
		"title":      e.Title,
		"aliases":    []string{e.Title},
		"type_name":  e.TypeName,
		"created_at": createdAt.Format(time.RFC3339),
	}
	for k, v := range e.Props {
		if strings.HasPrefix(k, "_") {
			continue
		}
		if links, ok := relationValueToLinks(store, k, v, nil); ok {
			fm[k] = links
			continue
		}
		fm[k] = v
	}
	if parentStr, ok := e.Props["_parent"]; ok && parentStr != "" && parentStr != "[]" {
		var parents []struct {
			ID string `json:"id"`
		}
		if json.Unmarshal([]byte(parentStr), &parents) == nil && len(parents) > 0 {
			if pid, err := strconv.ParseInt(parents[0].ID, 10, 64); err == nil && pid > 0 {
				fm["parent_"+e.TypeName+"_id"] = pid
			}
		}
	}
	return fm
}

// customEntityLinksBody builds the parent link and ## Sub-items section for a custom entity's vault file.
func customEntityLinksBody(typeName string, entityID int64, store storage.Storage) string {
	var lines []string

	// Parent link (set after _parent prop is written via properties API)
	if e, err := store.GetCustomEntity(typeName, entityID); err == nil {
		if parentStr, ok := e.Props["_parent"]; ok && parentStr != "" && parentStr != "[]" {
			var parents []struct {
				ID    string `json:"id"`
				Label string `json:"label"`
			}
			if json.Unmarshal([]byte(parentStr), &parents) == nil && len(parents) > 0 {
				lines = append(lines, fmt.Sprintf("\nParent %s: [[%s-%s|%s]]", typeName, typeName, parents[0].ID, parents[0].Label))
			}
		}
	}

	children, err := store.GetEntityChildren("custom_"+typeName, entityID)
	if err == nil && len(children) > 0 {
		lines = append(lines, "\n## Sub-items")
		for _, c := range children {
			var title string
			if strings.HasPrefix(c.ChildEntityType, "custom_") {
				childTypeName := strings.TrimPrefix(c.ChildEntityType, "custom_")
				if ce, err2 := store.GetCustomEntity(childTypeName, c.ChildEntityID); err2 == nil {
					title = ce.Title
				}
			}
			if title == "" {
				title = fmt.Sprintf("%s-%d", c.ChildEntityType, c.ChildEntityID)
			}
			childType := strings.TrimPrefix(c.ChildEntityType, "custom_")
			lines = append(lines, fmt.Sprintf("- [[%s-%d|%s]]", childType, c.ChildEntityID, title))
		}
	}

	return strings.Join(lines, "\n")
}

func customEntitiesHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse path: /api/custom/{type} or /api/custom/{type}/{id}
		// Strip prefix "/api/custom/"
		rest := strings.TrimPrefix(r.URL.Path, "/api/custom/")
		rest = strings.TrimRight(rest, "/")
		pathParts := strings.SplitN(rest, "/", 2)
		typeName := pathParts[0]
		if typeName == "" {
			errJSON(w, 400, "missing type in path")
			return
		}

		// Collection endpoint: /api/custom/{type}
		if len(pathParts) == 1 {
			switch r.Method {
			case http.MethodGet:
				entities, err := store.ListCustomEntities(typeName)
				if err != nil {
					errJSON(w, 500, err.Error())
					return
				}
				var workspaceFilter *int64
				if v := r.URL.Query().Get("workspace_id"); v != "" {
					if id, err := strconv.ParseInt(v, 10, 64); err == nil {
						workspaceFilter = &id
					}
				}
				entities = filterByWorkspace(entities, workspaceFilter, func(e *domain.CustomEntity) *int64 { return e.WorkspaceID })
				if entities == nil {
					entities = []*domain.CustomEntity{}
				}
				writeJSON(w, 200, entities)

			case http.MethodPost:
				var e domain.CustomEntity
				if err := readJSON(r, &e); err != nil {
					errJSON(w, 400, "invalid JSON: "+err.Error())
					return
				}
				e.TypeName = typeName
				if e.Props == nil {
					e.Props = map[string]string{}
				}
				id, err := store.CreateCustomEntity(&e)
				if err != nil {
					errJSON(w, 500, err.Error())
					return
				}
				e.ID = id
				if vlt != nil {
					refreshWorkspaceVaultFoldersAt(dbPath, vlt)
					_ = vlt.WriteEntityMD(typeName, id, customEntityFM(store, &e), customEntityLinksBody(typeName, id, store))
				}
				writeJSON(w, 201, e)

			default:
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}

		// Individual endpoint: /api/custom/{type}/{id} or /api/custom/{type}/{id}/tags
		idPart := pathParts[1]
		if strings.HasSuffix(idPart, "/tags") {
			idPart = strings.TrimSuffix(idPart, "/tags")
			eid, err2 := strconv.ParseInt(idPart, 10, 64)
			if err2 != nil {
				errJSON(w, 400, "invalid entity id")
				return
			}
			entityTagsHandler(store, "custom_"+typeName, eid)(w, r)
			return
		}
		entityID, err := strconv.ParseInt(idPart, 10, 64)
		if err != nil {
			errJSON(w, 400, "invalid entity id")
			return
		}

		switch r.Method {
		case http.MethodGet:
			e, err := store.GetCustomEntity(typeName, entityID)
			if err != nil {
				errJSON(w, 404, "not found")
				return
			}
			writeJSON(w, 200, e)

		case http.MethodPut:
			var e domain.CustomEntity
			if err := readJSON(r, &e); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			e.TypeName = typeName
			e.ID = entityID
			if e.Props == nil {
				e.Props = map[string]string{}
			}
			if err := store.UpdateCustomEntity(&e); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD(typeName, entityID, customEntityFM(store, &e), customEntityLinksBody(typeName, entityID, store))
			}
			go rollup.TriggerPropagation(store, typeName, entityID)
			writeJSON(w, 200, e)

		case http.MethodDelete:
			if err := store.DeleteCustomEntity(typeName, entityID); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				_ = vlt.DeleteEntityMD(typeName, entityID)
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// filterByWorkspace narrows items to those whose workspace (via get) matches
// filter. filter == nil means "All workspaces" — no filtering, every item
// passes through unchanged (including ones with no workspace of their own).
func filterByWorkspace[T any](items []T, filter *int64, get func(T) *int64) []T {
	if filter == nil {
		return items
	}
	out := items[:0]
	for _, it := range items {
		if ws := get(it); ws != nil && *ws == *filter {
			out = append(out, it)
		}
	}
	return out
}

// fmDefault returns s if non-empty, otherwise def.
func fmDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

// fmInt64 parses a string as int64, returning nil if empty or invalid.
func fmInt64(s string) any {
	if s == "" {
		return nil
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return nil
	}
	return n
}

// fmInt64Ptr parses a string as *int64, returning nil if empty or invalid.
func fmInt64Ptr(s string) *int64 {
	if n, ok := fmInt64(s).(int64); ok {
		return &n
	}
	return nil
}

// strPtrOrNil returns nil for an empty string, otherwise a pointer to s.
func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// fmFloat64 parses a string as float64, returning nil if empty or invalid.
func fmFloat64(s string) any {
	if s == "" {
		return nil
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return f
}

// ── Vault frontmatter helpers ─────────────────────────────────────────────────

func taskFM(t *domain.Task) map[string]any {
	fm := map[string]any{
		"id":         t.ID,
		"title":      t.Title,
		"aliases":    []string{t.Title},
		"status":     string(t.Status),
		"priority":   string(t.Priority),
		"created_at": t.CreatedAt.Format(time.RFC3339),
		"updated_at": t.UpdatedAt.Format(time.RFC3339),
	}
	if t.Description != "" {
		fm["description"] = t.Description
	}
	if t.GoalID != nil {
		fm["goal_id"] = *t.GoalID
	}
	if t.ProjectID != nil {
		fm["project_id"] = *t.ProjectID
	}
	if t.SprintID != nil {
		fm["sprint_id"] = *t.SprintID
	}
	if t.ParentTaskID != nil {
		fm["parent_task_id"] = *t.ParentTaskID
	}
	if t.DueDate != nil {
		fm["due_date"] = t.DueDate.Format("2006-01-02")
	}
	if t.StartDate != nil {
		fm["start_date"] = t.StartDate.Format("2006-01-02")
	}
	if t.StoryPoints != nil && *t.StoryPoints > 0 {
		fm["story_points"] = *t.StoryPoints
	}
	if len(t.Tags) > 0 {
		names := make([]string, len(t.Tags))
		for i, tg := range t.Tags {
			names[i] = tg.Name
		}
		fm["tags"] = names
	}
	return fm
}

func goalFM(g *domain.Goal) map[string]any {
	fm := map[string]any{
		"id":         g.ID,
		"title":      g.Title,
		"aliases":    []string{g.Title},
		"status":     string(g.Status),
		"created_at": g.CreatedAt.Format(time.RFC3339),
	}
	if g.Description != "" {
		fm["description"] = g.Description
	}
	if g.Type != "" {
		fm["type"] = g.Type
	}
	if g.Year != "" {
		fm["year"] = g.Year
	}
	if g.DueDate != nil && *g.DueDate != "" {
		fm["due_date"] = *g.DueDate
	}
	if g.StartDate != nil && *g.StartDate != "" {
		fm["start_date"] = *g.StartDate
	}
	if g.Target != nil {
		fm["target"] = *g.Target
	}
	if g.CurrentValue != nil {
		fm["current_value"] = *g.CurrentValue
	}
	if len(g.Tags) > 0 {
		names := make([]string, len(g.Tags))
		for i, tg := range g.Tags {
			names[i] = tg.Name
		}
		fm["tags"] = names
	}
	return fm
}

func projectFM(p *domain.Project) map[string]any {
	fm := map[string]any{
		"id":         p.ID,
		"title":      p.Title,
		"aliases":    []string{p.Title},
		"status":     string(p.Status),
		"created_at": p.CreatedAt.Format(time.RFC3339),
	}
	if p.Description != "" {
		fm["description"] = p.Description
	}
	if p.GoalID != nil {
		fm["goal_id"] = *p.GoalID
	}
	if p.MacroArea != "" {
		fm["macro_area"] = p.MacroArea
	}
	if p.DueDate != nil {
		fm["due_date"] = p.DueDate.Format("2006-01-02")
	}
	if p.StartDate != nil {
		fm["start_date"] = p.StartDate.Format("2006-01-02")
	}
	if len(p.Tags) > 0 {
		names := make([]string, len(p.Tags))
		for i, tg := range p.Tags {
			names[i] = tg.Name
		}
		fm["tags"] = names
	}
	return fm
}

func sprintFM(s *domain.Sprint) map[string]any {
	fm := map[string]any{
		"id":         s.ID,
		"title":      s.Title,
		"aliases":    []string{s.Title},
		"project_id": s.ProjectID,
		"status":     string(s.Status),
		"created_at": s.CreatedAt.Format(time.RFC3339),
	}
	if s.Goal != "" {
		fm["goal"] = s.Goal
	}
	if s.StartDate != nil {
		fm["start_date"] = s.StartDate.Format("2006-01-02")
	}
	if s.EndDate != nil {
		fm["end_date"] = s.EndDate.Format("2006-01-02")
	}
	if s.StoryPoints != nil {
		fm["story_points"] = *s.StoryPoints
	}
	return fm
}

// ── Vault wiki-link body helpers ──────────────────────────────────────────────
// These write [[entity-id|Title]] links into the note body so Obsidian's graph
// view shows real edges between related notes. Each entity that links upward
// (task→project, project→goal, sprint→project) gets its parent as a wiki link.

func taskLinksBody(t *domain.Task, store storage.Storage) string {
	var lines []string
	if t.GoalID != nil {
		if g, err := store.GetGoal(*t.GoalID); err == nil {
			lines = append(lines, fmt.Sprintf("Goal: [[goal-%d|%s]]", g.ID, g.Title))
		}
	}
	if t.ProjectID != nil {
		if p, err := store.GetProject(*t.ProjectID); err == nil {
			lines = append(lines, fmt.Sprintf("Project: [[project-%d|%s]]", p.ID, p.Title))
		}
	}
	if t.SprintID != nil {
		if sp, err := store.GetSprint(*t.SprintID); err == nil {
			lines = append(lines, fmt.Sprintf("Sprint: [[sprint-%d|%s]]", sp.ID, sp.Title))
		}
	}
	if t.ParentTaskID != nil {
		if pt, err := store.GetTask(*t.ParentTaskID); err == nil {
			lines = append(lines, fmt.Sprintf("Parent task: [[task-%d|%s]]", pt.ID, pt.Title))
		}
	}
	// Subtasks as a checklist
	subtasks, err := store.ListTasks(domain.TaskFilter{ParentTaskID: &t.ID})
	if err == nil && len(subtasks) > 0 {
		lines = append(lines, "\n## Subtasks")
		for _, s := range subtasks {
			check := " "
			if s.Status == domain.StatusDone {
				check = "x"
			}
			lines = append(lines, fmt.Sprintf("- [%s] [[task-%d|%s]]", check, s.ID, s.Title))
		}
	}
	// Linked notes
	notes, _ := store.ListNotes(nil, &t.ID, nil)
	if len(notes) > 0 {
		lines = append(lines, "\n## Linked Notes")
		for _, n := range notes {
			lines = append(lines, fmt.Sprintf("- [[note-%d|%s]]", n.ID, n.Title))
		}
	}
	// Linked resources
	resources, _ := store.ListResourcesByTask(t.ID)
	if len(resources) > 0 {
		lines = append(lines, "\n## Linked Resources")
		for _, r := range resources {
			lines = append(lines, fmt.Sprintf("- [[resource-%d|%s]]", r.ID, r.Title))
		}
	}
	return strings.Join(lines, "\n") + commentsSection("task", t.ID, store)
}

func projectLinksBody(p *domain.Project, store storage.Storage) string {
	if p.GoalID != nil {
		if g, err := store.GetGoal(*p.GoalID); err == nil {
			return fmt.Sprintf("Goal: [[goal-%d|%s]]", g.ID, g.Title)
		}
	}
	return ""
}

func sprintLinksBody(s *domain.Sprint, store storage.Storage) string {
	var out string
	if p, err := store.GetProject(s.ProjectID); err == nil {
		out = fmt.Sprintf("Project: [[project-%d|%s]]", p.ID, p.Title)
	}
	return out + commentsSection("sprint", s.ID, store)
}

// commentsSection returns a ## Comments markdown block for an entity.
func commentsSection(entityType string, entityID int64, store storage.Storage) string {
	comments, err := store.ListComments(entityType, entityID)
	if err != nil || len(comments) == 0 {
		return ""
	}
	lines := []string{"\n## Comments"}
	for _, c := range comments {
		lines = append(lines, fmt.Sprintf("- **%s**: %s", c.Author, c.Body))
	}
	return strings.Join(lines, "\n")
}

// childrenLinksBody appends a ## Sub-items section of [[wikilinks]] for any
// entity children registered in the entity_children table.
func childrenLinksBody(entityType string, entityID int64, store storage.Storage) string {
	children, err := store.GetEntityChildren(entityType, entityID)
	if err != nil || len(children) == 0 {
		return ""
	}
	var lines []string
	lines = append(lines, "\n## Sub-items")
	for _, c := range children {
		var title string
		switch c.ChildEntityType {
		case "task":
			if t, err := store.GetTask(c.ChildEntityID); err == nil {
				title = t.Title
			}
		case "goal":
			if g, err := store.GetGoal(c.ChildEntityID); err == nil {
				title = g.Title
			}
		case "project":
			if p, err := store.GetProject(c.ChildEntityID); err == nil {
				title = p.Title
			}
		case "note":
			if n, err := store.GetNote(c.ChildEntityID); err == nil {
				title = n.Title
			}
		default:
			if ce, err := store.GetCustomEntity(c.ChildEntityType, c.ChildEntityID); err == nil {
				title = ce.Title
			}
		}
		if title == "" {
			title = fmt.Sprintf("%s-%d", c.ChildEntityType, c.ChildEntityID)
		}
		lines = append(lines, fmt.Sprintf("- [[%s-%d|%s]]", c.ChildEntityType, c.ChildEntityID, title))
	}
	return strings.Join(lines, "\n")
}

// relationsLinksBody appends a ## Relations section for the entity.
func relationsLinksBody(entityType string, entityID int64, store storage.Storage) string {
	rels, err := store.GetEntityRelations(entityType, entityID)
	if err != nil || len(rels) == 0 {
		return ""
	}
	// Resolve titles inline (N+1 is fine — relation lists are tiny)
	var lines []string
	lines = append(lines, "\n## Relations")
	for _, r := range rels {
		title := fmt.Sprintf("%s-%d", r.RelatedType, r.RelatedID)
		switch r.RelatedType {
		case "task":
			if t, err := store.GetTask(r.RelatedID); err == nil {
				title = t.Title
			}
		case "goal":
			if g, err := store.GetGoal(r.RelatedID); err == nil {
				title = g.Title
			}
		case "project":
			if p, err := store.GetProject(r.RelatedID); err == nil {
				title = p.Title
			}
		case "note":
			if n, err := store.GetNote(r.RelatedID); err == nil && n.Title != "" {
				title = n.Title
			}
		case "sprint":
			if sp, err := store.GetSprint(r.RelatedID); err == nil {
				title = sp.Title
			}
		default:
			if ce, err := store.GetCustomEntity(r.RelatedType, r.RelatedID); err == nil && ce.Title != "" {
				title = ce.Title
			}
		}
		lines = append(lines, fmt.Sprintf("- [[%s-%d|%s]]", r.RelatedType, r.RelatedID, title))
	}
	return strings.Join(lines, "\n")
}

// resyncEntityVault re-writes the vault MD for any supported entity type.
// Called in goroutines after child/relation-link mutations.
func resyncEntityVault(entityType string, entityID int64, store storage.Storage, vlt *vault.Vault) {
	switch entityType {
	case "goal":
		if g, err := store.GetGoal(entityID); err == nil {
			body := childrenLinksBody("goal", g.ID, store) + relationsLinksBody("goal", g.ID, store) + commentsSection("goal", g.ID, store)
			_ = vlt.WriteEntityMD("goal", g.ID, mergeFMWithProps(goalFM(g), store, "goal", g.ID), body)
		}
	case "project":
		if p, err := store.GetProject(entityID); err == nil {
			body := projectLinksBody(p, store) + childrenLinksBody("project", p.ID, store) + relationsLinksBody("project", p.ID, store) + commentsSection("project", p.ID, store)
			_ = vlt.WriteEntityMD("project", p.ID, mergeFMWithProps(projectFM(p), store, "project", p.ID), body)
		}
	case "task":
		if t, err := store.GetTask(entityID); err == nil {
			_ = vlt.WriteEntityMD("task", t.ID, mergeFMWithProps(taskFM(t), store, "task", t.ID), taskLinksBody(t, store)+relationsLinksBody("task", t.ID, store))
		}
	case "sprint":
		if sp, err := store.GetSprint(entityID); err == nil {
			_ = vlt.WriteEntityMD("sprint", sp.ID, mergeFMWithProps(sprintFM(sp), store, "sprint", sp.ID), sprintLinksBody(sp, store))
		}
	default:
		if strings.HasPrefix(entityType, "custom_") {
			tn := strings.TrimPrefix(entityType, "custom_")
			if e, err := store.GetCustomEntity(tn, entityID); err == nil {
				_ = vlt.WriteEntityMD(tn, e.ID, customEntityFM(store, e), customEntityLinksBody(tn, e.ID, store))
			}
		}
	}
}

// mergeFMWithProps merges any stored entity_properties (excluding internal _*
// keys like _icon) into an existing frontmatter map. This ensures custom props
// set from the UI survive every WriteEntityMD call.
func mergeFMWithProps(fm map[string]any, store storage.Storage, entityType string, entityID int64) map[string]any {
	props, err := store.ListProperties(entityType, entityID)
	if err != nil {
		return fm
	}
	targets := relationPropTargets(store, entityType)
	for k, v := range props {
		if strings.HasPrefix(k, "_") {
			continue
		}
		if links, ok := relationValueToLinks(store, k, v, targets); ok {
			fm[k] = links
			continue
		}
		fm[k] = v
	}
	return fm
}

var builtinRelationSingulars = map[string]bool{
	"goal": true, "project": true, "sprint": true, "task": true,
	"note": true, "resource": true, "habit": true,
}

// guessRelationTarget infers a relation prop key's target type when no
// schema-recorded relatedEntity is available (e.g. data written before
// relation prop defs started syncing server-side, or a request that races
// ahead of that sync). Prefers an exact key match — a known builtin
// singular field name, or a custom entity type whose bare name IS the key
// (custom type names are usually already plural/collection-like, e.g.
// "bugs", so blindly stripping a trailing "s" guesses wrong for them) —
// before falling back to naive depluralization.
func guessRelationTarget(store storage.Storage, key string) string {
	if builtinRelationSingulars[key] {
		return key
	}
	if store == nil {
		return strings.TrimSuffix(key, "s")
	}
	if types, err := store.ListCustomEntityTypes(); err == nil {
		for _, t := range types {
			if t.Name == key {
				return key
			}
		}
	}
	return strings.TrimSuffix(key, "s")
}

// relationPropTargets maps relation-typed prop keys to their target type name,
// read from the entity type's schema row (identical for default and custom
// types). Used to render relation values as Obsidian wiki-links.
func relationPropTargets(store storage.Storage, entityType string) map[string]string {
	out := map[string]string{}
	tc, err := store.GetCustomEntityType(strings.TrimPrefix(entityType, "custom_"))
	if err != nil || tc == nil || tc.PropDefs == "" {
		return out
	}
	var defs []struct {
		Key           string `json:"key"`
		Type          string `json:"type"`
		RelatedEntity string `json:"relatedEntity"`
	}
	if json.Unmarshal([]byte(tc.PropDefs), &defs) != nil {
		return out
	}
	for _, d := range defs {
		if d.Type == "relation" && d.Key != "" {
			t := d.RelatedEntity
			if t == "" {
				t = strings.TrimSuffix(d.Key, "s")
			}
			out[d.Key] = strings.TrimPrefix(t, "custom_")
		}
	}
	return out
}

// parseRelationIDs extracts the numeric ids from a stored relation value
// ([{"id","label"},…]); returns nil when the value isn't relation-shaped.
func parseRelationIDs(raw string) map[int64]bool {
	trimmed := strings.TrimSpace(raw)
	if !strings.HasPrefix(trimmed, "[{") {
		return nil
	}
	var items []struct {
		ID string `json:"id"`
	}
	if json.Unmarshal([]byte(trimmed), &items) != nil {
		return nil
	}
	out := map[int64]bool{}
	for _, it := range items {
		if n, err := strconv.ParseInt(it.ID, 10, 64); err == nil {
			out[n] = true
		}
	}
	return out
}

// syncRelationPropEdges diffs a relation property's old/new values and
// mirrors the change into entity_relations edges, then recomputes rollups
// and refreshes vault files on BOTH ends. Entity agnostic: the target type
// comes from the type schema, falling back to the key name.
func syncRelationPropEdges(store storage.Storage, vlt *vault.Vault, entityType string, entityID int64, key, oldVal, newVal string) {
	if strings.HasPrefix(key, "_") {
		return // _parent & friends flow through entity_children instead
	}
	newIDs := parseRelationIDs(newVal)
	oldIDs := parseRelationIDs(oldVal)
	if newIDs == nil && oldIDs == nil {
		return // not a relation prop
	}
	target := relationPropTargets(store, entityType)[key]
	if target == "" {
		target = guessRelationTarget(store, key)
	}
	changed := []int64{}
	for id := range newIDs {
		if !oldIDs[id] {
			_ = store.AddEntityRelation(entityType, entityID, target, id)
			changed = append(changed, id)
		}
	}
	for id := range oldIDs {
		if !newIDs[id] {
			_ = store.RemoveEntityRelation(entityType, entityID, target, id)
			changed = append(changed, id)
		}
	}
	if len(changed) == 0 {
		return
	}
	rollup.RecomputeEntity(store, entityType, entityID)
	resyncType := target
	switch target {
	case "task", "goal", "project", "sprint":
	default:
		resyncType = "custom_" + target
	}
	for _, id := range changed {
		rollup.RecomputeEntity(store, target, id)
		if vlt != nil {
			resyncEntityVault(resyncType, id, store, vlt)
		}
	}
}

// relationValueToLinks converts a stored relation value — a JSON array of
// {id,label} items — into a list of wiki-links ("[[type-id|label]]"), so
// every relation property reads as real links in Obsidian. Non-relation
// values are passed through untouched (ok=false).
func relationValueToLinks(store storage.Storage, key, raw string, targets map[string]string) ([]string, bool) {
	trimmed := strings.TrimSpace(raw)
	if !strings.HasPrefix(trimmed, "[{") {
		return nil, false
	}
	var items []struct {
		ID    string `json:"id"`
		Label string `json:"label"`
	}
	if json.Unmarshal([]byte(trimmed), &items) != nil || len(items) == 0 {
		return nil, false
	}
	target := targets[key]
	if target == "" {
		target = guessRelationTarget(store, key)
	}
	links := make([]string, 0, len(items))
	for _, it := range items {
		if it.ID == "" {
			continue
		}
		label := it.Label
		if label == "" {
			label = target + "-" + it.ID
		}
		links = append(links, "[["+target+"-"+it.ID+"|"+label+"]]")
	}
	if len(links) == 0 {
		return nil, false
	}
	return links, true
}

func configHandler(v *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			errJSON(w, 405, "method not allowed")
			return
		}
		writeJSON(w, 200, map[string]string{
			"vault_path": v.Root,
			"db_path":    dbPath,
		})
	}
}

// ── Automations ───────────────────────────────────────────────────────────────

func automationsHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			et := r.URL.Query().Get("entity_type")
			list, err := store.ListAutomations(et)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if list == nil {
				list = []*domain.Automation{}
			}
			writeJSON(w, 200, list)
		case http.MethodPost:
			var a domain.Automation
			if err := readJSON(r, &a); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if a.TriggerConfig == "" {
				a.TriggerConfig = "[]"
			}
			if a.ActionConfig == "" {
				a.ActionConfig = "[]"
			}
			if a.TriggerLogic == "" {
				a.TriggerLogic = "all"
			}
			id, err := store.CreateAutomation(&a)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			created, _ := store.GetAutomation(id)
			writeJSON(w, 201, created)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func automationHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/automations/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			errJSON(w, 400, "invalid id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			a, err := store.GetAutomation(id)
			if err != nil {
				errJSON(w, 404, "automation not found")
				return
			}
			writeJSON(w, 200, a)
		case http.MethodPatch:
			a, err := store.GetAutomation(id)
			if err != nil {
				errJSON(w, 404, "automation not found")
				return
			}
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if v, ok := body["name"].(string); ok {
				a.Name = v
			}
			if v, ok := body["description"].(string); ok {
				a.Description = v
			}
			if v, ok := body["entity_type"].(string); ok {
				a.EntityType = v
			}
			if v, ok := body["enabled"].(bool); ok {
				a.Enabled = v
			}
			if v, ok := body["trigger_logic"].(string); ok {
				a.TriggerLogic = v
			}
			if v, ok := body["trigger_type"].(string); ok {
				a.TriggerType = v
			}
			if v, ok := body["trigger_config"].(string); ok {
				a.TriggerConfig = v
			}
			if v, ok := body["action_type"].(string); ok {
				a.ActionType = v
			}
			if v, ok := body["action_config"].(string); ok {
				a.ActionConfig = v
			}
			if err := store.UpdateAutomation(a); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := store.GetAutomation(id)
			writeJSON(w, 200, updated)
		case http.MethodDelete:
			if err := store.DeleteAutomation(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func addDateDuration(base time.Time, interval int, unit string) time.Time {
	switch strings.ToLower(unit) {
	case "weeks":
		return base.AddDate(0, 0, interval*7)
	case "months":
		return base.AddDate(0, interval, 0)
	case "years":
		return base.AddDate(interval, 0, 0)
	default:
		return base.AddDate(0, 0, interval)
	}
}

// runAutomations executes all enabled automations that match the given trigger.
// Called after a task is updated. event is "status_changed" etc.
// prevStatus is the status before the update.
// parseCfgArray normalises an automation config string into a slice of maps.
// Supports both legacy single-object format and new JSON-array format.
func parseCfgArray(s string) []map[string]any {
	if s == "" {
		return nil
	}
	// Try array first
	var arr []map[string]any
	if err := json.Unmarshal([]byte(s), &arr); err == nil {
		return arr
	}
	// Fall back to single object
	var obj map[string]any
	if err := json.Unmarshal([]byte(s), &obj); err == nil {
		return []map[string]any{obj}
	}
	return nil
}

func runAutomations(store storage.Storage, svc service.TaskService, t *domain.Task, prevStatus domain.Status) {
	if t.Status != domain.Status("done") || prevStatus == domain.Status("done") {
		return
	}

	automations, err := store.ListAutomations("task")
	if err != nil {
		return
	}

	// matchesTrigger returns true when a single trigger object fires for this event.
	matchesTrigger := func(tc map[string]any) bool {
		tt, _ := tc["trigger_type"].(string)
		if tt == "" {
			tt = "property_changed" // legacy: assume property_changed
		}
		if tt != "property_changed" {
			return false
		}
		if tc["property"] != "status" {
			return false
		}
		if tc["to_value"] != "done" {
			return false
		}
		if eid, ok := tc["entity_id"].(float64); ok && int64(eid) != t.ID {
			return false
		}
		return true
	}

	dbHandledRecur := false

	for _, a := range automations {
		if !a.Enabled {
			continue
		}

		triggers := parseCfgArray(a.TriggerConfig)
		// Backward compat: if trigger_config is empty, synthesise from trigger_type column
		if len(triggers) == 0 && a.TriggerType != "" {
			triggers = []map[string]any{{"trigger_type": a.TriggerType}}
		}
		if len(triggers) == 0 {
			continue
		}

		// Evaluate trigger logic (all / any)
		trigLogic := a.TriggerLogic
		if trigLogic == "" {
			trigLogic = "all"
		}
		var matched bool
		if trigLogic == "any" {
			for _, tc := range triggers {
				if matchesTrigger(tc) {
					matched = true
					break
				}
			}
		} else { // "all"
			matched = true
			for _, tc := range triggers {
				if !matchesTrigger(tc) {
					matched = false
					break
				}
			}
		}
		if !matched {
			continue
		}

		actions := parseCfgArray(a.ActionConfig)
		// Backward compat: synthesise from action_type column
		if len(actions) == 0 && a.ActionType != "" {
			actions = []map[string]any{{"action_type": a.ActionType}}
		}

		for _, ac := range actions {
			at, _ := ac["action_type"].(string)
			if at == "" {
				at = a.ActionType
			}
			switch at {
			case "add_item":
				// Always mark as handled so the fallback recur doesn't double-create.
				dbHandledRecur = true
				if ac["template"] != "copy_current" {
					continue
				}
				newTask := *t
				newTask.ID = 0
				newTask.Status = domain.Status("todo")
				newTask.LoggedMins = 0
				newTask.PomodorosFinished = nil

				var customProps [][2]string // [field, value] for custom properties

				if overrides, ok := ac["overrides"].([]any); ok {
					// New format: overrides array
					for _, raw := range overrides {
						ov, ok := raw.(map[string]any)
						if !ok {
							continue
						}
						field, _ := ov["field"].(string)
						switch field {
						case "status":
							if v, ok := ov["value"].(string); ok && v != "" {
								newTask.Status = domain.Status(v)
							}
						case "priority":
							if v, ok := ov["value"].(string); ok {
								newTask.Priority = domain.Priority(v)
							}
						case "due_date":
							iv := 1
							unit := "days"
							if v, ok := ov["offset_interval"].(float64); ok {
								iv = int(v)
							}
							if v, ok := ov["offset_unit"].(string); ok {
								unit = v
							}
							if t.DueDate != nil {
								next := addDateDuration(*t.DueDate, iv, unit)
								newTask.DueDate = &next
							}
						case "goal_id":
							if v, ok := ov["value"].(string); ok {
								if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
									newTask.GoalID = &id
								} else {
									newTask.GoalID = nil
								}
							}
						case "project_id":
							if v, ok := ov["value"].(string); ok {
								if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
									newTask.ProjectID = &id
								} else {
									newTask.ProjectID = nil
								}
							}
						case "sprint_id":
							if v, ok := ov["value"].(string); ok {
								if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
									newTask.SprintID = &id
								} else {
									newTask.SprintID = nil
								}
							}
						case "category_id":
							if v, ok := ov["value"].(string); ok {
								if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
									newTask.CategoryID = &id
								} else {
									newTask.CategoryID = nil
								}
							}
						default:
							if field != "" {
								if v, ok := ov["value"].(string); ok {
									customProps = append(customProps, [2]string{field, v})
								}
							}
						}
					}
				} else {
					// Old format backward compat: field_overrides + due_date_offset
					if fov, ok := ac["field_overrides"].(map[string]any); ok {
						if s, ok := fov["status"].(string); ok {
							newTask.Status = domain.Status(s)
						}
					}
					if ddo, ok := ac["due_date_offset"].(map[string]any); ok {
						iv := 1
						unit := "days"
						if v, ok := ddo["interval"].(float64); ok {
							iv = int(v)
						}
						if v, ok := ddo["unit"].(string); ok {
							unit = v
						}
						if t.DueDate != nil {
							next := addDateDuration(*t.DueDate, iv, unit)
							newTask.DueDate = &next
						}
					}
				}
				created, err := svc.Create(&newTask)
				if err != nil {
					log.Printf("automations: add_item for task %d: %v", t.ID, err)
					continue
				}
				for _, cp := range customProps {
					_ = store.SetProperty("task", created.ID, cp[0], cp[1])
				}
			}
		}
	}

	// Fallback: tasks with recur_interval but no matching DB automation use built-in logic.
	if !dbHandledRecur && t.RecurInterval != nil && *t.RecurInterval > 0 {
		newTask := *t
		newTask.ID = 0
		newTask.Status = domain.Status("todo")
		newTask.LoggedMins = 0
		newTask.PomodorosFinished = nil
		if t.DueDate != nil {
			var next time.Time
			switch strings.ToLower(t.RecurUnit) {
			case "days":
				next = t.DueDate.AddDate(0, 0, *t.RecurInterval)
			case "weeks":
				next = t.DueDate.AddDate(0, 0, *t.RecurInterval*7)
			case "months":
				next = t.DueDate.AddDate(0, *t.RecurInterval, 0)
			case "years":
				next = t.DueDate.AddDate(*t.RecurInterval, 0, 0)
			default:
				next = t.DueDate.AddDate(0, 0, *t.RecurInterval)
			}
			newTask.DueDate = &next
		}
		if _, err := svc.Create(&newTask); err != nil {
			log.Printf("automations: recur fallback for task %d: %v", t.ID, err)
		}
	}
}

// habitsHandler handles GET /api/habits and POST /api/habits.
// habitFM builds the vault frontmatter for a Habit.
func habitFM(h *domain.Habit) map[string]any {
	fm := map[string]any{
		"id":      h.ID,
		"title":   h.Title,
		"aliases": []string{h.Title},
		"type":    string(h.Type),
	}
	if h.ReferenceID != nil && *h.ReferenceID != "" {
		fm["reference_id"] = *h.ReferenceID
	}
	return fm
}

func habitsHandler(svc *service.HabitService, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			habits, err := svc.ListWithStats()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			var workspaceFilter *int64
			if v := r.URL.Query().Get("workspace_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					workspaceFilter = &id
				}
			}
			habits = filterByWorkspace(habits, workspaceFilter, func(h *domain.Habit) *int64 { return h.WorkspaceID })
			writeJSON(w, 200, habits)
		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Type        string `json:"type"`
				ReferenceID string `json:"reference_id"`
				WorkspaceID *int64 `json:"workspace_id"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			h := &domain.Habit{
				Title:       body.Title,
				Type:        domain.HabitType(body.Type),
				WorkspaceID: body.WorkspaceID,
			}
			if body.ReferenceID != "" {
				h.ReferenceID = &body.ReferenceID
			}
			created, err := svc.Create(h)
			if err != nil {
				errJSON(w, 400, err.Error())
				return
			}
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD("habit", created.ID, habitFM(created), "")
			}
			writeJSON(w, 201, created)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// habitHandler handles GET/PATCH/DELETE /api/habits/:id and sub-resources.
func habitHandler(svc *service.HabitService, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimRight(r.URL.Path, "/")

		if strings.HasSuffix(path, "/checkin") {
			parentPath := strings.TrimSuffix(path, "/checkin")
			id, ok := parseID(parentPath)
			if !ok {
				errJSON(w, 400, "invalid habit id")
				return
			}
			today := time.Now().UTC().Format("2006-01-02")
			var body struct {
				Date string `json:"date"`
				Done *bool  `json:"done"`
			}
			_ = readJSON(r, &body)
			date := body.Date
			if date == "" {
				date = today
			}
			if r.Method == http.MethodPost {
				if body.Done != nil && !*body.Done {
					if err := svc.RemoveCompletion(id, date); err != nil {
						errJSON(w, 500, err.Error())
						return
					}
				} else {
					if err := svc.LogCompletion(id, date); err != nil {
						errJSON(w, 500, err.Error())
						return
					}
				}
				streak, doneToday, _ := svc.GetStreak(id)
				writeJSON(w, 200, map[string]any{"ok": true, "streak": streak, "done_today": doneToday})
			} else {
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
			return
		}

		if strings.HasSuffix(path, "/completions") {
			parentPath := strings.TrimSuffix(path, "/completions")
			id, ok := parseID(parentPath)
			if !ok {
				errJSON(w, 400, "invalid habit id")
				return
			}
			if r.Method != http.MethodGet {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
			from := r.URL.Query().Get("from")
			to := r.URL.Query().Get("to")
			if from == "" {
				from = time.Now().UTC().AddDate(0, -3, 0).Format("2006-01-02")
			}
			if to == "" {
				to = time.Now().UTC().Format("2006-01-02")
			}
			dates, err := svc.GetCompletions(id, from, to)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, dates)
			return
		}

		id, ok := parseID(path)
		if !ok {
			errJSON(w, 400, "invalid habit id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			h, err := svc.Get(id)
			if err != nil {
				errJSON(w, 404, "habit not found")
				return
			}
			writeJSON(w, 200, h)
		case http.MethodPatch:
			h, err := svc.Get(id)
			if err != nil {
				errJSON(w, 404, "habit not found")
				return
			}
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if v, ok := body["title"].(string); ok {
				h.Title = v
			}
			if v, ok := body["type"].(string); ok {
				h.Type = domain.HabitType(v)
			}
			if v, ok := body["reference_id"]; ok {
				if v == nil {
					h.ReferenceID = nil
				} else if s, ok := v.(string); ok {
					h.ReferenceID = &s
				}
			}
			if v, ok := body["workspace_id"]; ok {
				if v == nil {
					h.WorkspaceID = nil
				} else if fv, ok := v.(float64); ok {
					wid := int64(fv)
					h.WorkspaceID = &wid
				}
			}
			updated, err := svc.Update(h)
			if err != nil {
				errJSON(w, 400, err.Error())
				return
			}
			if vlt != nil {
				refreshWorkspaceVaultFoldersAt(dbPath, vlt)
				_ = vlt.WriteEntityMD("habit", updated.ID, habitFM(updated), "")
			}
			writeJSON(w, 200, updated)
		case http.MethodDelete:
			if err := svc.Delete(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			if vlt != nil {
				_ = vlt.DeleteEntityMD("habit", id)
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}
