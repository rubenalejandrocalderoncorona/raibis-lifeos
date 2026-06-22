package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
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

	// Rebuild SQLite from vault — imports any entities missing from the index.
	// Safe to run on every start: upsert means existing rows are only overwritten when vault is newer.
	ins, upd := syncVaultToSQLite(v, cfg.dbPath)
	if ins+upd > 0 {
		log.Printf("vault sync on start: %d inserted, %d updated", ins, upd)
	}

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
	mux.HandleFunc("/api/tasks", withCORS(tasksHandler(svc, store, v)))
	mux.HandleFunc("/api/tasks/", withCORS(taskHandler(svc, store, dbPath, v)))

	// Goals
	mux.HandleFunc("/api/goals", withCORS(goalsHandler(svc, store, v)))
	mux.HandleFunc("/api/goals/", withCORS(goalHandler(store, dbPath, v)))

	// Projects
	mux.HandleFunc("/api/projects", withCORS(projectsHandler(svc, store, v)))
	mux.HandleFunc("/api/projects/", withCORS(projectHandler(store, dbPath, v)))

	// Sprints
	mux.HandleFunc("/api/sprints", withCORS(sprintsHandler(svc, store, dbPath, v)))
	mux.HandleFunc("/api/sprints/", withCORS(sprintHandler(store, v)))

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
	mux.HandleFunc("/api/habits", withCORS(habitsHandler(habitSvc)))
	mux.HandleFunc("/api/habits/", withCORS(habitHandler(habitSvc)))

	// Kanban, Resources, Pomodoro, misc
	mux.HandleFunc("/api/kanban", withCORS(kanbanHandler(svc, store)))
	mux.HandleFunc("/api/resources", withCORS(resourcesHandler(store, dbPath)))
	mux.HandleFunc("/api/resources/", withCORS(resourceHandler(store, dbPath)))
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
	mux.HandleFunc("/api/comments", withCORS(commentsHandler(store)))

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
	mux.HandleFunc("/api/custom/", withCORS(customEntitiesHandler(store)))

	// Vault sync (on-demand)
	mux.HandleFunc("/api/sync", withCORS(vaultSyncHandler(v, dbPath)))

	// Server config (vault path, db path)
	mux.HandleFunc("/api/config", withCORS(configHandler(v, dbPath)))

	// Embedded Web GUI — self-contained, no external /public folder needed.
	// Serves index.html + assets for all non-/api/ requests.
	sub, err := gui.Sub()
	if err != nil {
		log.Fatalf("lifeos: embed GUI FS: %v", err)
	}
	mux.Handle("/", noCacheHeaders(http.FileServer(http.FS(sub))))

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

func tasksHandler(svc service.TaskService, store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
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
			type taskOut struct {
				*domain.Task
				ProjectTitle string `json:"project_title,omitempty"`
				SubTaskCount int    `json:"sub_task_count"`
			}
			out := make([]taskOut, len(tasks))
			for i, t := range tasks {
				to := taskOut{Task: t}
				if t.ProjectID != nil {
					to.ProjectTitle = projMap[*t.ProjectID]
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
			if v, ok := body["due_date"].(string); ok && v != "" {
				if due, err := time.Parse("2006-01-02", v); err == nil {
					t.DueDate = &due
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
			go func(oldPID *int64) {
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

func goalsHandler(svc service.TaskService, store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			goals, err := svc.Goals()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			tasks, _ := svc.List(domain.TaskFilter{})
			projects, _ := svc.Projects()
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
			go func() {
				if err := vlt.WriteEntityMD("goal", created.ID, mergeFMWithProps(goalFM(created), store, "goal", created.ID), childrenLinksBody("goal", created.ID, store)); err != nil {
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
			if err := store.UpdateGoal(g); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := store.GetGoal(id)
			updated.Tags, _ = store.GetEntityTags("goal", id)
			go func() {
				if err := vlt.WriteEntityMD("goal", updated.ID, mergeFMWithProps(goalFM(updated), store, "goal", updated.ID), childrenLinksBody("goal", updated.ID, store)); err != nil {
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

func projectsHandler(svc service.TaskService, store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			projects, err := svc.Projects()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
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
			}
			id, err := store.CreateProject(p)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			created, _ := store.GetProject(id)
			go func() {
				if err := vlt.WriteEntityMD("project", created.ID, mergeFMWithProps(projectFM(created), store, "project", created.ID), projectLinksBody(created, store)+childrenLinksBody("project", created.ID, store)); err != nil {
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
			if err := store.UpdateProject(p); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := store.GetProject(id)
			updated.Tags, _ = store.GetEntityTags("project", id)
			go func() {
				if err := vlt.WriteEntityMD("project", updated.ID, mergeFMWithProps(projectFM(updated), store, "project", updated.ID), projectLinksBody(updated, store)+childrenLinksBody("project", updated.ID, store)); err != nil {
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
			writeJSON(w, 200, listSprints(store, svc, dbPath, projectID))

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				ProjectID   int64  `json:"project_id"`
				StartDate   string `json:"start_date"`
				EndDate     string `json:"end_date"`
				StoryPoints *int   `json:"story_points"`
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
			go func() {
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

func sprintHandler(store storage.Storage, vlt *vault.Vault) http.HandlerFunc {
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
			if v, ok := body["status"].(string); ok {
				if err := store.UpdateSprintStatus(id, v); err != nil {
					errJSON(w, 500, err.Error())
					return
				}
			}
			if v, ok := body["story_points"]; ok {
				var pts *int
				if v != nil {
					p := int(v.(float64))
					pts = &p
				}
				if err := store.UpdateSprintStoryPoints(id, pts); err != nil {
					errJSON(w, 500, err.Error())
					return
				}
			}
			if sp, err := store.GetSprint(id); err == nil {
				go func() {
					if err := vlt.WriteEntityMD("sprint", sp.ID, mergeFMWithProps(sprintFM(sp), store, "sprint", sp.ID), sprintLinksBody(sp, store)); err != nil {
						log.Printf("vault: update sprint %d: %v", sp.ID, err)
					}
				}()
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
				Title      string `json:"title"`
				Body       string `json:"body"`
				GoalID     *int64 `json:"goal_id"`
				TaskID     *int64 `json:"task_id"`
				ProjectID  *int64 `json:"project_id"`
				CategoryID *int64 `json:"category_id"`
				NoteDate   string `json:"note_date"`
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
				Title:      body.Title,
				GoalID:     body.GoalID,
				TaskID:     body.TaskID,
				ProjectID:  body.ProjectID,
				CategoryID: body.CategoryID,
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

func resourcesHandler(store storage.Storage, dbPath string) http.HandlerFunc {
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
			rows, err := db.Query(fmt.Sprintf(`
				SELECT r.id, r.title, COALESCE(r.url,''), COALESCE(r.file_path,''),
				       r.resource_type, COALESCE(r.body,''),
				       COALESCE(t.title,''), COALESCE(p.title,''), COALESCE(g.title,''),
				       r.created_at
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
			}
			var out []resOut
			for rows.Next() {
				var res resOut
				if err := rows.Scan(&res.ID, &res.Title, &res.URL, &res.FilePath,
					&res.ResourceType, &res.Body,
					&res.TaskTitle, &res.ProjectTitle, &res.GoalTitle,
					&res.CreatedAt); err != nil {
					errJSON(w, 500, err.Error())
					return
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
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			if body.ResourceType == "" {
				body.ResourceType = "note"
			}
			res, err := db.Exec(
				`INSERT INTO resources (title, url, resource_type, body, goal_id, project_id, task_id)
				 VALUES (?,?,?,?,?,?,?)`,
				body.Title, nullStr(body.URL), body.ResourceType, nullStr(body.Body),
				body.GoalID, body.ProjectID, body.TaskID,
			)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			id, _ := res.LastInsertId()
			writeJSON(w, 201, map[string]any{"id": id, "title": body.Title})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func resourceHandler(store storage.Storage, dbPath string) http.HandlerFunc {
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
			}
			var goalID, projectID, taskID sql.NullInt64
			row := db.QueryRow(`SELECT id, title, COALESCE(url,''), COALESCE(body,''), resource_type,
				goal_id, project_id, task_id FROM resources WHERE id=?`, id)
			if err := row.Scan(&res.ID, &res.Title, &res.URL, &res.Body, &res.ResourceType,
				&goalID, &projectID, &taskID); err != nil {
				errJSON(w, 404, "resource not found")
				return
			}
			if goalID.Valid    { res.GoalID    = &goalID.Int64 }
			if projectID.Valid { res.ProjectID = &projectID.Int64 }
			if taskID.Valid    { res.TaskID    = &taskID.Int64 }
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
			}
			row := db.QueryRow(`SELECT title, COALESCE(url,''), COALESCE(body,''), resource_type,
				goal_id, project_id, task_id FROM resources WHERE id=?`, id)
			if err := row.Scan(&cur.title, &cur.url, &cur.body, &cur.resourceType,
				&cur.goalID, &cur.projectID, &cur.taskID); err != nil {
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
			if _, err := db.Exec(
				`UPDATE resources SET title=?, url=?, body=?, resource_type=?,
				 goal_id=?, project_id=?, task_id=?, updated_at=datetime('now')
				 WHERE id=?`,
				nullStr(cur.title), nullStr(cur.url), nullStr(cur.body), cur.resourceType,
				nullInt(goalID), nullInt(projectID), nullInt(taskID), id,
			); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]any{"id": id, "ok": true})
		case http.MethodDelete:
			if _, err := db.Exec(`DELETE FROM resources WHERE id=?`, id); err != nil {
				errJSON(w, 500, err.Error())
				return
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

		tasks, _ := svc.List(domain.TaskFilter{TopLevelOnly: true})
		goals, _ := svc.Goals()
		projects, _ := svc.Projects()

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
	             COALESCE(p.title,'')
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
		var projID sql.NullInt64
		if err := rows.Scan(&so.ID, &projID, &so.Title, &so.Status,
			&so.StartDate, &so.EndDate, &so.ProjectTitle); err != nil {
			continue
		}
		if projID.Valid {
			so.ProjectID = projID.Int64
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

func commentsHandler(store storage.Storage) http.HandlerFunc {
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
			if n, err := store.GetNote(entityID); err == nil {
				if n.Title != "" {
					return n.Title
				}
				return fmt.Sprintf("note-%d", entityID)
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
			if err := store.SetProperty(entityType, entityID, body.Key, body.Value); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
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
					fm := make(map[string]any, len(existingProps))
					for k, v := range existingProps {
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

// ── Vault → SQLite startup sync ───────────────────────────────────────────────

// syncVaultToSQLite scans vault entity dirs and upserts entities into SQLite.
// For entities with updated_at (tasks), only overwrites when vault is newer.
// Returns (inserted, updated) counts.
// Dependency order: goals → projects → sprints → tasks.
func syncVaultToSQLite(v *vault.Vault, dbPath string) (inserted int, updated int) {
	db, err := openRawDB(dbPath)
	if err != nil {
		log.Printf("vault sync: open db: %v", err)
		return
	}
	defer db.Close()

	// Known core fields per entity type (anything else becomes an entity_property).
	goalCoreFields := map[string]bool{
		"id": true, "title": true, "description": true, "status": true,
		"type": true, "year": true, "start_date": true, "due_date": true,
		"start_value": true, "current_value": true, "target": true,
		"created_at": true, "aliases": true,
	}
	projectCoreFields := map[string]bool{
		"id": true, "title": true, "description": true, "status": true,
		"macro_area": true, "goal_id": true, "created_at": true, "aliases": true,
	}
	sprintCoreFields := map[string]bool{
		"id": true, "title": true, "goal": true, "start_date": true,
		"end_date": true, "status": true, "project_id": true, "created_at": true, "aliases": true,
	}
	taskCoreFields := map[string]bool{
		"id": true, "title": true, "description": true, "status": true,
		"priority": true, "due_date": true, "start_date": true, "story_points": true,
		"goal_id": true, "project_id": true, "sprint_id": true, "parent_task_id": true,
		"created_at": true, "updated_at": true, "aliases": true,
	}

	// saveExtraProps stores any non-core frontmatter keys as entity_properties.
	saveExtraProps := func(entityType string, entityID int64, fm map[string]string, coreFields map[string]bool) {
		for k, v := range fm {
			if coreFields[k] || v == "" {
				continue
			}
			_, _ = db.Exec(
				`INSERT INTO entity_properties (entity_type, entity_id, key, value)
				 VALUES (?,?,?,?)
				 ON CONFLICT(entity_type, entity_id, key) DO UPDATE SET value=excluded.value`,
				entityType, entityID, k, v,
			)
		}
	}

	// preExists returns true if a row with the given id already exists in the table.
	preExists := func(table string, id int64) bool {
		var cnt int
		_ = db.QueryRow("SELECT COUNT(*) FROM "+table+" WHERE id=?", id).Scan(&cnt) //nolint:gosec
		return cnt > 0
	}

	// Goals
	if files, _ := v.ScanEntityFiles("goal"); len(files) > 0 {
		for _, fm := range files {
			id, _ := strconv.ParseInt(fm["id"], 10, 64)
			if id == 0 {
				continue
			}
			wasNew := !preExists("goals", id)
			_, err := db.Exec(`INSERT INTO goals
				(id,title,description,status,type,year,start_date,due_date,
				 start_value,current_value,target,created_at)
				VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
				ON CONFLICT(id) DO UPDATE SET
				  title=excluded.title, description=excluded.description,
				  status=excluded.status, type=excluded.type, year=excluded.year,
				  start_date=excluded.start_date, due_date=excluded.due_date,
				  start_value=excluded.start_value, current_value=excluded.current_value,
				  target=excluded.target
				WHERE 1=1`,
				id, fm["title"], nullStr(fm["description"]),
				fmDefault(fm["status"], "active"),
				nullStr(fm["type"]), nullStr(fm["year"]),
				nullStr(fm["start_date"]), nullStr(fm["due_date"]),
				fmFloat64(fm["start_value"]), fmFloat64(fm["current_value"]),
				fmFloat64(fm["target"]),
				fmDefault(fm["created_at"], time.Now().Format(time.RFC3339)),
			)
			if err == nil {
				if wasNew {
					inserted++
				} else {
					updated++
				}
				saveExtraProps("goal", id, fm, goalCoreFields)
			}
		}
	}

	// Projects
	if files, _ := v.ScanEntityFiles("project"); len(files) > 0 {
		for _, fm := range files {
			id, _ := strconv.ParseInt(fm["id"], 10, 64)
			if id == 0 {
				continue
			}
			wasNew := !preExists("projects", id)
			_, err := db.Exec(`INSERT INTO projects
				(id,goal_id,title,description,status,macro_area,created_at)
				VALUES (?,?,?,?,?,?,?)
				ON CONFLICT(id) DO UPDATE SET
				  title=excluded.title, description=excluded.description,
				  status=excluded.status, macro_area=excluded.macro_area,
				  goal_id=excluded.goal_id
				WHERE 1=1`,
				id, fmInt64(fm["goal_id"]), fm["title"],
				nullStr(fm["description"]),
				fmDefault(fm["status"], "active"),
				nullStr(fm["macro_area"]),
				fmDefault(fm["created_at"], time.Now().Format(time.RFC3339)),
			)
			if err == nil {
				if wasNew {
					inserted++
				} else {
					updated++
				}
				saveExtraProps("project", id, fm, projectCoreFields)
			}
		}
	}

	// Sprints (need project to exist first)
	if files, _ := v.ScanEntityFiles("sprint"); len(files) > 0 {
		for _, fm := range files {
			id, _ := strconv.ParseInt(fm["id"], 10, 64)
			projID, _ := strconv.ParseInt(fm["project_id"], 10, 64)
			if id == 0 || projID == 0 {
				continue
			}
			wasNew := !preExists("sprints", id)
			_, err := db.Exec(`INSERT INTO sprints
				(id,project_id,title,goal,start_date,end_date,status,created_at)
				VALUES (?,?,?,?,?,?,?,?)
				ON CONFLICT(id) DO UPDATE SET
				  title=excluded.title, goal=excluded.goal,
				  start_date=excluded.start_date, end_date=excluded.end_date,
				  status=excluded.status, project_id=excluded.project_id
				WHERE 1=1`,
				id, projID, fm["title"], nullStr(fm["goal"]),
				nullStr(fm["start_date"]), nullStr(fm["end_date"]),
				fmDefault(fm["status"], "planned"),
				fmDefault(fm["created_at"], time.Now().Format(time.RFC3339)),
			)
			if err == nil {
				if wasNew {
					inserted++
				} else {
					updated++
				}
				saveExtraProps("sprint", id, fm, sprintCoreFields)
			}
		}
	}

	// Tasks (need project/sprint/goal to exist first)
	if files, _ := v.ScanEntityFiles("task"); len(files) > 0 {
		for _, fm := range files {
			id, _ := strconv.ParseInt(fm["id"], 10, 64)
			if id == 0 {
				continue
			}
			wasNew := !preExists("tasks", id)
			_, err := db.Exec(`INSERT INTO tasks
				(id,goal_id,project_id,sprint_id,title,description,
				 status,priority,due_date,start_date,story_points,
				 created_at,updated_at)
				VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
				ON CONFLICT(id) DO UPDATE SET
				  title=excluded.title, description=excluded.description,
				  status=excluded.status, priority=excluded.priority,
				  due_date=excluded.due_date, start_date=excluded.start_date,
				  story_points=excluded.story_points, goal_id=excluded.goal_id,
				  project_id=excluded.project_id, sprint_id=excluded.sprint_id,
				  updated_at=excluded.updated_at
				WHERE excluded.updated_at >= tasks.updated_at`,
				id,
				fmInt64(fm["goal_id"]), fmInt64(fm["project_id"]), fmInt64(fm["sprint_id"]),
				fm["title"], nullStr(fm["description"]),
				fmDefault(fm["status"], "todo"),
				fmDefault(fm["priority"], "medium"),
				nullStr(fm["due_date"]), nullStr(fm["start_date"]),
				fmInt64(fm["story_points"]),
				fmDefault(fm["created_at"], time.Now().Format(time.RFC3339)),
				fmDefault(fm["updated_at"], time.Now().Format(time.RFC3339)),
			)
			if err == nil {
				if wasNew {
					inserted++
				} else {
					updated++
				}
				saveExtraProps("task", id, fm, taskCoreFields)
			}
		}
	}

	return inserted, updated
}

// ── Vault Sync Handler ────────────────────────────────────────────────────────

func vaultSyncHandler(v *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		ins, upd := syncVaultToSQLite(v, dbPath)
		writeJSON(w, 200, map[string]int{"inserted": ins, "updated": upd})
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

// ── Custom Entities Handler ───────────────────────────────────────────────────

// customEntitiesHandler handles all /api/custom/{type} and /api/custom/{type}/{id} requests.
func customEntitiesHandler(store storage.Storage) http.HandlerFunc {
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
			writeJSON(w, 200, e)

		case http.MethodDelete:
			if err := store.DeleteCustomEntity(typeName, entityID); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
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
	return strings.Join(lines, "\n")
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
	if p, err := store.GetProject(s.ProjectID); err == nil {
		return fmt.Sprintf("Project: [[project-%d|%s]]", p.ID, p.Title)
	}
	return ""
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
			body := childrenLinksBody("goal", g.ID, store) + relationsLinksBody("goal", g.ID, store)
			_ = vlt.WriteEntityMD("goal", g.ID, mergeFMWithProps(goalFM(g), store, "goal", g.ID), body)
		}
	case "project":
		if p, err := store.GetProject(entityID); err == nil {
			body := projectLinksBody(p, store) + childrenLinksBody("project", p.ID, store) + relationsLinksBody("project", p.ID, store)
			_ = vlt.WriteEntityMD("project", p.ID, mergeFMWithProps(projectFM(p), store, "project", p.ID), body)
		}
	case "task":
		if t, err := store.GetTask(entityID); err == nil {
			_ = vlt.WriteEntityMD("task", t.ID, mergeFMWithProps(taskFM(t), store, "task", t.ID), taskLinksBody(t, store)+relationsLinksBody("task", t.ID, store))
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
	for k, v := range props {
		if !strings.HasPrefix(k, "_") {
			fm[k] = v
		}
	}
	return fm
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
func habitsHandler(svc *service.HabitService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			habits, err := svc.ListWithStats()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, habits)
		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Type        string `json:"type"`
				ReferenceID string `json:"reference_id"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON: "+err.Error())
				return
			}
			h := &domain.Habit{
				Title: body.Title,
				Type:  domain.HabitType(body.Type),
			}
			if body.ReferenceID != "" {
				h.ReferenceID = &body.ReferenceID
			}
			created, err := svc.Create(h)
			if err != nil {
				errJSON(w, 400, err.Error())
				return
			}
			writeJSON(w, 201, created)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// habitHandler handles GET/PATCH/DELETE /api/habits/:id and sub-resources.
func habitHandler(svc *service.HabitService) http.HandlerFunc {
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
			updated, err := svc.Update(h)
			if err != nil {
				errJSON(w, 400, err.Error())
				return
			}
			writeJSON(w, 200, updated)
		case http.MethodDelete:
			if err := svc.Delete(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}
