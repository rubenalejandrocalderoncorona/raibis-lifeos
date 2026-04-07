package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"github.com/raibis/raibis-go/internal/cmdutil"
	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/service"
	"github.com/raibis/raibis-go/internal/storage"
	"github.com/raibis/raibis-go/internal/vault"
)

func main() {
	dbPath := cmdutil.DefaultDBPath()
	store, err := storage.Open(dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "raibis-server: cannot open database %s: %v\n", dbPath, err)
		os.Exit(1)
	}
	defer store.Close()

	v, err := vault.New(os.Getenv("LIFEOS_VAULT"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "raibis-server: cannot open vault: %v\n", err)
		os.Exit(1)
	}
	log.Printf("vault at %s", v.Root)

	svc := service.New(store)
	mux := buildMux(svc, store, v, dbPath)

	port := os.Getenv("LIFEOS_PORT")
	if port == "" {
		port = "3344"
	}
	log.Printf("raibis server listening on http://localhost:%s  (db: %s)", port, dbPath)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

// ── Router ────────────────────────────────────────────────────────────────────

func buildMux(svc service.TaskService, store storage.Storage, v *vault.Vault, dbPath string) http.Handler {
	mux := http.NewServeMux()

	// Tasks
	mux.HandleFunc("/api/tasks", withCORS(tasksHandler(svc, store)))
	mux.HandleFunc("/api/tasks/", withCORS(taskHandler(svc, store, dbPath)))

	// Goals
	mux.HandleFunc("/api/goals", withCORS(goalsHandler(svc, store)))
	mux.HandleFunc("/api/goals/", withCORS(goalHandler(store, v, dbPath)))

	// Projects
	mux.HandleFunc("/api/projects", withCORS(projectsHandler(svc, store)))
	mux.HandleFunc("/api/projects/", withCORS(projectHandler(store, v, dbPath)))

	// Sprints
	mux.HandleFunc("/api/sprints", withCORS(sprintsHandler(svc, store, dbPath)))
	mux.HandleFunc("/api/sprints/", withCORS(sprintHandler(store, svc)))

	// Notes — vault-backed file-only
	mux.HandleFunc("/api/notes", withCORS(notesHandler(store, v)))
	mux.HandleFunc("/api/notes/", withCORS(noteHandler(store, v)))

	// Categories
	mux.HandleFunc("/api/categories", withCORS(categoriesHandler(store)))
	mux.HandleFunc("/api/categories/", withCORS(categoryHandler(store)))

	// Tags
	mux.HandleFunc("/api/tags", withCORS(tagsHandler(store)))
	mux.HandleFunc("/api/tags/", withCORS(tagHandler(store)))

	// Properties
	mux.HandleFunc("/api/properties", withCORS(propertiesHandler(store)))

	// Kanban, Resources, Pomodoro, misc
	mux.HandleFunc("/api/kanban", withCORS(kanbanHandler(svc, store)))
	mux.HandleFunc("/api/resources", withCORS(resourcesHandler(store, dbPath)))
	mux.HandleFunc("/api/resources/", withCORS(resourceHandler(store, dbPath)))
	mux.HandleFunc("/api/pomodoro", withCORS(pomodoroHandler(store, dbPath)))
	mux.HandleFunc("/api/quick-capture", withCORS(captureHandler(svc)))
	mux.HandleFunc("/api/dashboard", withCORS(dashboardHandler(svc, store, dbPath)))

	// Export
	mux.HandleFunc("/api/export/", withCORS(exportHandler(store, v)))

	// Static files
	guiDir := guiPublicDir()
	if _, err := os.Stat(guiDir); err == nil {
		log.Printf("serving GUI from %s", guiDir)
		mux.Handle("/", noCacheHeaders(http.FileServer(http.Dir(guiDir))))
	} else {
		log.Printf("GUI dir not found (%s) — API-only mode", guiDir)
	}

	// raibis-chat companion app
	chatDir := raibisChatDir()
	if _, err := os.Stat(chatDir); err == nil {
		log.Printf("serving raibis-chat from %s", chatDir)
		mux.Handle("/raibis-chat/", noCacheHeaders(http.StripPrefix("/raibis-chat/", http.FileServer(http.Dir(chatDir)))))
	}

	return mux
}

// guiPublicDir returns the absolute path to raibis/gui/public/.
func guiPublicDir() string {
	if p := os.Getenv("RAIBIS_GUI"); p != "" {
		return p
	}
	exe, err := os.Executable()
	if err == nil {
		exe, _ = filepath.EvalSymlinks(exe)
		dir := filepath.Dir(exe)
		for i := 0; i < 6; i++ {
			candidate := filepath.Join(dir, "raibis", "gui", "public")
			if _, err := os.Stat(candidate); err == nil {
				return candidate
			}
			dir = filepath.Dir(dir)
		}
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Documents", "PersonalRepos", "ClaudeCodeProjects", "raibis-lifeos", "raibis", "gui", "public")
}

// raibisChatDir returns the absolute path to the raibis-chat companion app.
func raibisChatDir() string {
	if p := os.Getenv("RAIBIS_CHAT"); p != "" {
		return p
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Documents", "PersonalRepos", "ClaudeCodeProjects", "raibis-chat")
}

// ── Middleware ────────────────────────────────────────────────────────────────

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
			goals, _ := svc.Goals()
			projMap := make(map[int64]string)
			for _, p := range projects {
				projMap[p.ID] = p.Title
			}
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
				// Count subtasks
				sub, _ := store.ListTasks(domain.TaskFilter{})
				for _, s := range sub {
					if s.ParentTaskID != nil && *s.ParentTaskID == t.ID {
						to.SubTaskCount++
					}
				}
				// Attach tags
				tags, _ := store.GetEntityTags("task", t.ID)
				t.Tags = tags
				out[i] = to
			}
			writeJSON(w, 200, out)

		case http.MethodPost:
			var body struct {
				Title              string  `json:"title"`
				Description        string  `json:"description"`
				Status             string  `json:"status"`
				Priority           string  `json:"priority"`
				StartDate          string  `json:"start_date"`
				DueDate            string  `json:"due_date"`
				FocusBlock         string  `json:"focus_block"`
				FocusBlockStart    string  `json:"focus_block_start"`
				GoalID             *int64  `json:"goal_id"`
				ProjectID          *int64  `json:"project_id"`
				SprintID           *int64  `json:"sprint_id"`
				ParentTaskID       *int64  `json:"parent_task_id"`
				CategoryID         *int64  `json:"category_id"`
				Category           string  `json:"category"`
				RecurInterval      *int    `json:"recur_interval"`
				RecurUnit          string  `json:"recur_unit"`
				StoryPoints        *int    `json:"story_points"`
				PomodorosPlanned   *int    `json:"pomodoros_planned"`
				PomodorosFinished  *int    `json:"pomodoros_finished"`
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
			if body.StartDate != "" {
				if start, err := time.Parse("2006-01-02", body.StartDate); err == nil {
					t.StartDate = &start
				}
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
		// Route: /api/tasks/:id/tags
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

		// Route: /api/tasks/:id/subtasks
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
			// Attach subtasks
			subs, _ := store.ListTasks(domain.TaskFilter{})
			for _, s := range subs {
				if s.ParentTaskID != nil && *s.ParentTaskID == id {
					s.Tags, _ = store.GetEntityTags("task", s.ID)
					t.SubTasks = append(t.SubTasks, s)
				}
			}
			// Build enriched response with breadcrumb titles + linked notes/resources
			type taskDetail struct {
				*domain.Task
				GoalTitle        string           `json:"goal_title,omitempty"`
				ProjectTitle     string           `json:"project_title,omitempty"`
				ParentTaskTitle  string           `json:"parent_task_title,omitempty"`
				Notes            []*domain.Note   `json:"notes"`
				Resources        []map[string]any `json:"resources"`
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
			if v, ok := body["start_date"].(string); ok && v != "" {
				if start, err := time.Parse("2006-01-02", v); err == nil {
					t.StartDate = &start
				}
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

func goalHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// /api/goals/:id/tags
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
			// Enriched goal detail
			type goalDetail struct {
				*domain.Goal
				Projects  []*domain.Project `json:"projects"`
				Tasks     []*domain.Task    `json:"tasks"`
				Notes     []*domain.Note    `json:"notes"`
				Resources []map[string]any  `json:"resources"`
			}
			det := goalDetail{Goal: g, Projects: []*domain.Project{}, Tasks: []*domain.Task{}, Notes: []*domain.Note{}, Resources: []map[string]any{}}
			// Projects linked to this goal (all statuses)
			var allProjects []*domain.Project
			for _, st := range []domain.Status{domain.StatusActive, domain.StatusCompleted, domain.StatusArchived, domain.StatusOnHold} {
				ps, _ := store.ListProjects(st)
				allProjects = append(allProjects, ps...)
			}
			for _, p := range allProjects {
				if p.GoalID != nil && *p.GoalID == id {
					p.Tags, _ = store.GetEntityTags("project", p.ID)
					det.Projects = append(det.Projects, p)
				}
			}
			// Direct tasks on goal (goal_id set)
			directTasks, _ := store.ListTasks(domain.TaskFilter{GoalID: &id})
			taskSeen := make(map[int64]bool)
			for _, t := range directTasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
				det.Tasks = append(det.Tasks, t)
				taskSeen[t.ID] = true
			}
			// Also include tasks from linked projects
			for _, p := range det.Projects {
				projTasks, _ := store.ListTasks(domain.TaskFilter{ProjectID: &p.ID})
				for _, t := range projTasks {
					if !taskSeen[t.ID] {
						t.Tags, _ = store.GetEntityTags("task", t.ID)
						det.Tasks = append(det.Tasks, t)
						taskSeen[t.ID] = true
					}
				}
			}
			det.Notes, _ = store.ListNotes(&id, nil, nil)
			for _, n := range det.Notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
				if n.FilePath != nil { n.Body, _ = vlt.ReadFile(*n.FilePath) }
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

func projectHandler(store storage.Storage, vlt *vault.Vault, dbPath string) http.HandlerFunc {
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
			// Enriched project detail
			type projectDetail struct {
				*domain.Project
				Tasks     []*domain.Task   `json:"tasks"`
				Notes     []*domain.Note   `json:"notes"`
				Resources []map[string]any `json:"resources"`
			}
			det := projectDetail{Project: p, Tasks: []*domain.Task{}, Notes: []*domain.Note{}, Resources: []map[string]any{}}
			tasks, _ := store.ListTasks(domain.TaskFilter{ProjectID: &id})
			for _, t := range tasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
				det.Tasks = append(det.Tasks, t)
			}
			det.Notes, _ = store.ListNotes(nil, nil, &id)
			for _, n := range det.Notes {
				n.Tags, _ = store.GetEntityTags("note", n.ID)
				if n.FilePath != nil { n.Body, _ = vlt.ReadFile(*n.FilePath) }
			}
			dbPath := defaultDBPath()
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
			if v, ok := body["start_date"].(string); ok && v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					p.StartDate = &t
				}
			} else if _, ok := body["start_date"]; ok {
				p.StartDate = nil
			}
			if v, ok := body["due_date"].(string); ok && v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					p.DueDate = &t
				}
			} else if _, ok := body["due_date"]; ok {
				p.DueDate = nil
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

func sprintHandler(store storage.Storage, svc service.TaskService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid sprint id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			// Sprint detail: sprint metadata + tasks in this sprint
			type sprintDetail struct {
				ID           int64            `json:"id"`
				Title        string           `json:"title"`
				Status       string           `json:"status"`
				ProjectID    int64            `json:"project_id"`
				ProjectTitle string           `json:"project_title,omitempty"`
				StartDate    string           `json:"start_date,omitempty"`
				EndDate      string           `json:"end_date,omitempty"`
				Tasks        []*domain.Task   `json:"tasks"`
				Progress     struct {
					Done  int `json:"done"`
					Total int `json:"total"`
					Pct   int `json:"pct"`
				} `json:"progress"`
			}
			// Find sprint from the sprints list (no direct GetSprint method)
			tasks, err := svc.List(domain.TaskFilter{SprintID: &id})
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			for _, t := range tasks {
				t.Tags, _ = store.GetEntityTags("task", t.ID)
			}
			// Get sprint metadata via raw sprint listing
			spList := listSprints(store, svc, defaultDBPath(), nil)
			det := sprintDetail{ID: id, Tasks: tasks}
			if det.Tasks == nil {
				det.Tasks = []*domain.Task{}
			}
			for _, sp := range spList {
				if sp.ID == id {
					det.Title = sp.Title
					det.Status = sp.Status
					det.ProjectID = sp.ProjectID
					det.ProjectTitle = sp.ProjectTitle
					det.StartDate = sp.StartDate
					det.EndDate = sp.EndDate
					det.Progress.Done = sp.Progress.Done
					det.Progress.Total = sp.Progress.Total
					det.Progress.Pct = sp.Progress.Pct
					break
				}
			}
			writeJSON(w, 200, det)

		case http.MethodPatch:
			var body map[string]any
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if status, ok := body["status"].(string); ok {
				if err := store.UpdateSprintStatus(id, status); err != nil {
					errJSON(w, 500, "update sprint: "+err.Error())
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
				// Hydrate body from vault file (list view: omit for perf unless small)
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
			// Write body to vault file; store only the path in SQLite
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
			// Write updated body to vault file
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
			// Best-effort delete vault file
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

// entityTagsHandler handles GET/PUT /api/:type/:id/tags
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
			ID           int64   `json:"id"`
			Title        string  `json:"title"`
			Priority     string  `json:"priority"`
			DueDate      *string `json:"due_date,omitempty"`
			ProjectTitle string  `json:"project_title,omitempty"`
			Category     string  `json:"category,omitempty"`
			StoryPoints  *int    `json:"story_points,omitempty"`
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

// Resources and Pomodoro still use a direct SQL approach via a local DB handle.
// We open a second connection here since Storage doesn't expose raw SQL.
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
				Type         string `json:"type"`
				GoalID       *int64 `json:"goal_id"`
				ProjectID    *int64 `json:"project_id"`
				TaskID       *int64 `json:"task_id"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			if body.ResourceType == "" {
				body.ResourceType = body.Type
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
				Title        string `json:"title"`
				URL          string `json:"url"`
				Body         string `json:"body"`
				ResourceType string `json:"resource_type"`
				GoalID       *int64 `json:"goal_id"`
				ProjectID    *int64 `json:"project_id"`
				TaskID       *int64 `json:"task_id"`
			}
			if err := readJSON(r, &body); err != nil {
				errJSON(w, 400, "invalid JSON")
				return
			}
			if _, err := db.Exec(
				`UPDATE resources SET title=COALESCE(NULLIF(?,title),title),
				 url=?, body=?, resource_type=COALESCE(NULLIF(?,resource_type),resource_type),
				 goal_id=?, project_id=?, task_id=? WHERE id=?`,
				body.Title, nullStr(body.URL), nullStr(body.Body), body.ResourceType,
				body.GoalID, body.ProjectID, body.TaskID, id,
			); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 200, map[string]bool{"ok": true})
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
		// Also increment task's pomodoros_finished if completed
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

		// Get all tasks once for subtask counting
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

		// Active projects with progress
		activeProjects := enrichProjects(projects, allTasks)

		// Active sprint
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

// ── Export ────────────────────────────────────────────────────────────────────

// exportHandler handles GET /api/export/:entity/:id
// Returns a portable JSON bundle: entity + all linked children + hydrated note bodies.
func exportHandler(store storage.Storage, v *vault.Vault) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		// Parse /api/export/<entity>/<id>
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		// parts: ["api", "export", entity, id]
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
				"entity":   "goal",
				"goal":     g,
				"projects": projects,
				"tasks":    tasks,
				"notes":    notes,
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
				"entity":  "project",
				"project": p,
				"tasks":   tasks,
				"notes":   notes,
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
				"entity": "task",
				"task":   t,
				"notes":  notes,
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
			writeJSON(w, 200, map[string]any{
				"entity": "note",
				"note":   n,
			})

		default:
			errJSON(w, 400, "unknown entity: "+entity)
		}
	}
}

// ── Properties ────────────────────────────────────────────────────────────────

// propertiesHandler handles GET/POST/DELETE /api/properties?entity_type=X&entity_id=Y
func propertiesHandler(store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		entityType := q.Get("entity_type")
		entityIDStr := q.Get("entity_id")
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

func defaultDBPath() string {
	if p := os.Getenv("LIFEOS_DB"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "lifeos.db"
	}
	return filepath.Join(home, ".local", "share", "raibis", "lifeos.db")
}
