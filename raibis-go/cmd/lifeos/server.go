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

	svc := service.New(store)
	mux := buildMux(svc, store, v, cfg.dbPath)

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

func buildMux(svc service.TaskService, store storage.Storage, v *vault.Vault, dbPath string) http.Handler {
	mux := http.NewServeMux()

	// Tasks
	mux.HandleFunc("/api/tasks", withCORS(tasksHandler(svc, store)))
	mux.HandleFunc("/api/tasks/", withCORS(taskHandler(svc, store, dbPath)))

	// Goals
	mux.HandleFunc("/api/goals", withCORS(goalsHandler(svc, store)))
	mux.HandleFunc("/api/goals/", withCORS(goalHandler(store, dbPath)))

	// Projects
	mux.HandleFunc("/api/projects", withCORS(projectsHandler(svc, store)))
	mux.HandleFunc("/api/projects/", withCORS(projectHandler(store, dbPath)))

	// Sprints
	mux.HandleFunc("/api/sprints", withCORS(sprintsHandler(svc, store, dbPath)))
	mux.HandleFunc("/api/sprints/", withCORS(sprintHandler(store)))

	// Notes — vault-backed file-only
	mux.HandleFunc("/api/notes", withCORS(notesHandler(store, v)))
	mux.HandleFunc("/api/notes/", withCORS(noteHandler(store, v)))

	// Categories
	mux.HandleFunc("/api/categories", withCORS(categoriesHandler(store)))
	mux.HandleFunc("/api/categories/", withCORS(categoryHandler(store)))

	// Tags
	mux.HandleFunc("/api/tags", withCORS(tagsHandler(store)))
	mux.HandleFunc("/api/tags/", withCORS(tagHandler(store)))

	// Kanban, Resources, Pomodoro, misc
	mux.HandleFunc("/api/kanban", withCORS(kanbanHandler(svc, store)))
	mux.HandleFunc("/api/resources", withCORS(resourcesHandler(store, dbPath)))
	mux.HandleFunc("/api/resources/", withCORS(resourceHandler(store, dbPath)))
	mux.HandleFunc("/api/resource-upload/", withCORS(resourceUploadHandler(dbPath)))
	mux.HandleFunc("/api/resource-file/", withCORS(resourceFileServeHandler(dbPath)))
	mux.HandleFunc("/api/pomodoro", withCORS(pomodoroHandler(store, dbPath)))
	mux.HandleFunc("/api/quick-capture", withCORS(captureHandler(svc)))
	mux.HandleFunc("/api/dashboard", withCORS(dashboardHandler(svc, store, dbPath)))

	// Export
	mux.HandleFunc("/api/export/", withCORS(exportHandler(store, v, dbPath)))

	// Search & Version
	mux.HandleFunc("/api/search", withCORS(searchHandler(store, dbPath)))
	mux.HandleFunc("/api/version", withCORS(versionHandler()))

	// Comments
	mux.HandleFunc("/api/comments", withCORS(commentsHandler(store)))

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

func tasksHandler(svc service.TaskService, store storage.Storage) http.HandlerFunc {
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
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func taskHandler(svc service.TaskService, store storage.Storage, dbPath string) http.HandlerFunc {
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
			if v, ok := body["parent_task_id"]; ok {
				if v == nil {
					t.ParentTaskID = nil
				} else if fv, ok := v.(float64); ok {
					pid := int64(fv)
					t.ParentTaskID = &pid
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
			if err := svc.Update(t); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := svc.Get(id)
			updated.Tags, _ = store.GetEntityTags("task", id)
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

// ── Goals ─────────────────────────────────────────────────────────────────────

func goalsHandler(svc service.TaskService, store storage.Storage) http.HandlerFunc {
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
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func goalHandler(store storage.Storage, dbPath string) http.HandlerFunc {
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
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			if err := store.DeleteGoal(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Projects ──────────────────────────────────────────────────────────────────

func projectsHandler(svc service.TaskService, store storage.Storage) http.HandlerFunc {
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
			writeJSON(w, 201, created)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func projectHandler(store storage.Storage, dbPath string) http.HandlerFunc {
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
			writeJSON(w, 200, updated)

		case http.MethodDelete:
			if err := store.DeleteProject(id); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// ── Sprints ───────────────────────────────────────────────────────────────────

func sprintsHandler(svc service.TaskService, store storage.Storage, dbPath string) http.HandlerFunc {
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
				Title     string `json:"title"`
				ProjectID int64  `json:"project_id"`
				StartDate string `json:"start_date"`
				EndDate   string `json:"end_date"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" || body.ProjectID == 0 {
				errJSON(w, 400, "title and project_id are required")
				return
			}
			sp := &domain.Sprint{
				ProjectID: body.ProjectID,
				Title:     body.Title,
				Status:    domain.Status("planned"),
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
			writeJSON(w, 201, map[string]any{"id": id, "title": body.Title, "status": "planned"})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

func sprintHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid resource id")
			return
		}
		switch r.Method {
		case http.MethodPatch:
			var body struct {
				Title        string  `json:"title"`
				URL          string  `json:"url"`
				Body         string  `json:"body"`
				ResourceType string  `json:"resource_type"`
				GoalID       *int64  `json:"goal_id"`
				ProjectID    *int64  `json:"project_id"`
				TaskID       *int64  `json:"task_id"`
			}
			if err := readJSON(r, &body); err != nil {
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
			if body.Title != "" {
				cur.title = body.Title
			}
			if body.URL != "" {
				cur.url = body.URL
			}
			if body.Body != "" {
				cur.body = body.Body
			}
			if body.ResourceType != "" {
				cur.resourceType = body.ResourceType
			}
			// FK fields always overwrite (allow explicit null via pointer)
			goalID := cur.goalID
			if body.GoalID != nil {
				goalID = sql.NullInt64{Int64: *body.GoalID, Valid: true}
			}
			projectID := cur.projectID
			if body.ProjectID != nil {
				projectID = sql.NullInt64{Int64: *body.ProjectID, Valid: true}
			}
			taskID := cur.taskID
			if body.TaskID != nil {
				taskID = sql.NullInt64{Int64: *body.TaskID, Valid: true}
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
		if err := rows.Scan(&so.ID, &so.ProjectID, &so.Title, &so.Status,
			&so.StartDate, &so.EndDate, &so.ProjectTitle); err != nil {
			continue
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
