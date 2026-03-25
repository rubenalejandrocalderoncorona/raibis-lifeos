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

	"github.com/raibis/raibis-go/internal/domain"
	"github.com/raibis/raibis-go/internal/service"
	"github.com/raibis/raibis-go/internal/storage"
)

func main() {
	dbPath := defaultDBPath()
	store, err := storage.Open(dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "raibis-server: cannot open database %s: %v\n", dbPath, err)
		os.Exit(1)
	}
	defer store.Close()

	// Raw DB connection for tables not in the Storage interface (resources, pomodoro)
	rawDB, err := openRawDB(dbPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "raibis-server: cannot open raw db: %v\n", err)
		os.Exit(1)
	}
	defer rawDB.Close()

	svc := service.New(store)
	mux := buildMux(svc, rawDB)

	port := os.Getenv("LIFEOS_PORT")
	if port == "" {
		port = "3344"
	}
	log.Printf("raibis server listening on http://localhost:%s  (db: %s)", port, dbPath)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

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

// ── Router ────────────────────────────────────────────────────────────────────

func buildMux(svc service.TaskService, db *sql.DB) http.Handler {
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/tasks", withCORS(tasksHandler(svc)))
	mux.HandleFunc("/api/tasks/", withCORS(taskHandler(svc)))
	mux.HandleFunc("/api/goals", withCORS(goalsHandler(svc, db)))
	mux.HandleFunc("/api/goals/", withCORS(goalHandler(svc, db)))
	mux.HandleFunc("/api/projects", withCORS(projectsHandler(svc, db)))
	mux.HandleFunc("/api/kanban", withCORS(kanbanHandler(svc, db)))
	mux.HandleFunc("/api/sprints", withCORS(sprintsHandler(svc, db)))
	mux.HandleFunc("/api/sprints/", withCORS(sprintHandler(db)))
	mux.HandleFunc("/api/resources", withCORS(resourcesHandler(db)))
	mux.HandleFunc("/api/resources/", withCORS(resourceHandler(db)))
	mux.HandleFunc("/api/pomodoro", withCORS(pomodoroHandler(db)))
	mux.HandleFunc("/api/quick-capture", withCORS(captureHandler(svc)))
	mux.HandleFunc("/api/dashboard", withCORS(dashboardHandler(svc, db)))

	// Static files from raibis/gui/public/
	guiDir := guiPublicDir()
	if _, err := os.Stat(guiDir); err == nil {
		log.Printf("serving GUI from %s", guiDir)
		fs := http.FileServer(http.Dir(guiDir))
		mux.Handle("/", fs)
	} else {
		log.Printf("GUI dir not found (%s) — API-only mode", guiDir)
	}

	return mux
}

// guiPublicDir returns the absolute path to raibis/gui/public/.
// It tries paths relative to the binary's location and known dev paths.
func guiPublicDir() string {
	// Check env override first
	if p := os.Getenv("RAIBIS_GUI"); p != "" {
		return p
	}
	// Walk up from the executable to find the sibling raibis/ project
	exe, err := os.Executable()
	if err == nil {
		// Resolve symlinks (e.g. go run temp binary)
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
	// Fallback: known dev location
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Documents", "PersonalRepos", "ClaudeCodeProjects", "raibis", "gui", "public")
}

// ── Middleware ────────────────────────────────────────────────────────────────

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
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

// parseID extracts the trailing numeric segment from a URL path.
// e.g. "/api/tasks/42" → 42
func parseID(path string) (int64, bool) {
	parts := strings.Split(strings.TrimRight(path, "/"), "/")
	if len(parts) == 0 {
		return 0, false
	}
	id, err := strconv.ParseInt(parts[len(parts)-1], 10, 64)
	return id, err == nil
}

// taskProgress counts done/total tasks for a given project.
func taskProgress(svc service.TaskService, projectID int64) (done, total int) {
	tasks, err := svc.List(domain.TaskFilter{ProjectID: &projectID})
	if err != nil {
		return 0, 0
	}
	for _, t := range tasks {
		total++
		if t.Status == domain.StatusDone {
			done++
		}
	}
	return done, total
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func tasksHandler(svc service.TaskService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			f := domain.TaskFilter{TopLevelOnly: true}
			if v := r.URL.Query().Get("project_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					f.ProjectID = &id
				}
			}
			if v := r.URL.Query().Get("sprint_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					f.SprintID = &id
				}
			}
			if v := r.URL.Query().Get("status"); v != "" {
				st := domain.Status(v)
				f.Status = &st
			}
			if r.URL.Query().Get("all") == "1" {
				f.TopLevelOnly = false
			}
			tasks, err := svc.List(f)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			// Enrich with project_title
			projects, _ := svc.Projects()
			projMap := make(map[int64]string)
			for _, p := range projects {
				projMap[p.ID] = p.Title
			}
			type taskOut struct {
				*domain.Task
				ProjectTitle string `json:"project_title,omitempty"`
			}
			out := make([]taskOut, len(tasks))
			for i, t := range tasks {
				to := taskOut{Task: t}
				if t.ProjectID != nil {
					to.ProjectTitle = projMap[*t.ProjectID]
				}
				out[i] = to
			}
			writeJSON(w, 200, out)

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				Status      string `json:"status"`
				Priority    string `json:"priority"`
				DueDate     string `json:"due_date"`
				ProjectID   *int64 `json:"project_id"`
				SprintID    *int64 `json:"sprint_id"`
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
				Title:       body.Title,
				Description: body.Description,
				Status:      domain.StatusTodo,
				Priority:    domain.PriorityMedium,
				ProjectID:   body.ProjectID,
				SprintID:    body.SprintID,
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

func taskHandler(svc service.TaskService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
			writeJSON(w, 200, t)

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
			if v, ok := body["project_id"]; ok {
				if v == nil {
					t.ProjectID = nil
				} else if fv, ok := v.(float64); ok {
					pid := int64(fv)
					t.ProjectID = &pid
				}
			}
			if err := svc.Update(t); err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			updated, _ := svc.Get(id)
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

// goalsHandler handles GET /api/goals and POST /api/goals
func goalsHandler(svc service.TaskService, db *sql.DB) http.HandlerFunc {
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
			writeJSON(w, 200, enrichGoals(goals, projects, tasks))

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Description string `json:"description"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			g, err := svc.CreateGoal(body.Title, body.Description)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 201, g)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// goalHandler handles PATCH /api/goals/:id (archive etc.)
func goalHandler(svc service.TaskService, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid goal id")
			return
		}
		if r.Method != http.MethodPatch {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body map[string]any
		if err := readJSON(r, &body); err != nil {
			errJSON(w, 400, "invalid JSON")
			return
		}
		if status, ok := body["status"].(string); ok {
			_, err := db.Exec(`UPDATE goals SET status=? WHERE id=?`, status, id)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
		}
		writeJSON(w, 200, map[string]bool{"ok": true})
	}
}

// projectsHandler handles GET /api/projects and POST /api/projects
func projectsHandler(svc service.TaskService, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			projects, err := svc.Projects()
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			tasks, _ := svc.List(domain.TaskFilter{})
			writeJSON(w, 200, enrichProjects(projects, tasks))

		case http.MethodPost:
			var body struct {
				Title       string `json:"title"`
				Description string `json:"description"`
				GoalID      *int64 `json:"goal_id"`
			}
			if err := readJSON(r, &body); err != nil || body.Title == "" {
				errJSON(w, 400, "title is required")
				return
			}
			p, err := svc.CreateProject(body.Title, body.GoalID)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			writeJSON(w, 201, p)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// kanbanHandler handles GET /api/kanban?project_id=
func kanbanHandler(svc service.TaskService, db *sql.DB) http.HandlerFunc {
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
			ID           int64      `json:"id"`
			Title        string     `json:"title"`
			Priority     string     `json:"priority"`
			DueDate      *string    `json:"due_date,omitempty"`
			ProjectTitle string     `json:"project_title,omitempty"`
			Tags         []string   `json:"tags"`
		}
		board := map[string][]kanbanTask{
			"todo":        {},
			"in_progress": {},
			"blocked":     {},
			"done":        {},
		}
		for _, t := range tasks {
			kt := kanbanTask{
				ID:       t.ID,
				Title:    t.Title,
				Priority: string(t.Priority),
				Tags:     []string{},
			}
			if t.ProjectID != nil {
				kt.ProjectTitle = projMap[*t.ProjectID]
			}
			if t.DueDate != nil {
				s := t.DueDate.Format("2006-01-02")
				kt.DueDate = &s
			}
			col := string(t.Status)
			if _, ok := board[col]; ok {
				board[col] = append(board[col], kt)
			}
		}
		writeJSON(w, 200, board)
	}
}

// sprintsHandler handles GET /api/sprints and POST /api/sprints
func sprintsHandler(svc service.TaskService, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			var projectID *int64
			if v := r.URL.Query().Get("project_id"); v != "" {
				if id, err := strconv.ParseInt(v, 10, 64); err == nil {
					projectID = &id
				}
			}
			writeJSON(w, 200, listSprints(db, svc, projectID))

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
			res, err := db.Exec(
				`INSERT INTO sprints (project_id, title, status, start_date, end_date) VALUES (?,?,?,?,?)`,
				body.ProjectID, body.Title, "planned", nullStr(body.StartDate), nullStr(body.EndDate),
			)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
			id, _ := res.LastInsertId()
			writeJSON(w, 201, map[string]any{"id": id, "title": body.Title, "status": "planned"})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// sprintHandler handles PATCH /api/sprints/:id
func sprintHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid sprint id")
			return
		}
		if r.Method != http.MethodPatch {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var body map[string]any
		if err := readJSON(r, &body); err != nil {
			errJSON(w, 400, "invalid JSON")
			return
		}
		if status, ok := body["status"].(string); ok {
			_, err := db.Exec(`UPDATE sprints SET status=? WHERE id=?`, status, id)
			if err != nil {
				errJSON(w, 500, err.Error())
				return
			}
		}
		writeJSON(w, 200, map[string]bool{"ok": true})
	}
}

// resourcesHandler handles GET /api/resources and POST /api/resources
func resourcesHandler(db *sql.DB) http.HandlerFunc {
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
				ID           int64    `json:"id"`
				Title        string   `json:"title"`
				URL          string   `json:"url,omitempty"`
				FilePath     string   `json:"file_path,omitempty"`
				ResourceType string   `json:"resource_type"`
				Body         string   `json:"body,omitempty"`
				TaskTitle    string   `json:"task_title,omitempty"`
				ProjectTitle string   `json:"project_title,omitempty"`
				GoalTitle    string   `json:"goal_title,omitempty"`
				Tags         []string `json:"tags"`
				CreatedAt    string   `json:"created_at"`
			}
			var out []resOut
			for rows.Next() {
				var res resOut
				res.Tags = []string{}
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

// resourceHandler handles DELETE /api/resources/:id
func resourceHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(r.URL.Path)
		if !ok {
			errJSON(w, 400, "invalid resource id")
			return
		}
		if r.Method != http.MethodDelete {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if _, err := db.Exec(`DELETE FROM resources WHERE id=?`, id); err != nil {
			errJSON(w, 500, err.Error())
			return
		}
		writeJSON(w, 200, map[string]bool{"ok": true})
	}
}

// pomodoroHandler handles POST /api/pomodoro
func pomodoroHandler(db *sql.DB) http.HandlerFunc {
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
		writeJSON(w, 201, map[string]any{"id": id, "duration_mins": body.DurationMins})
	}
}

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

func dashboardHandler(svc service.TaskService, db *sql.DB) http.HandlerFunc {
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
		}

		var inProgress, overdue int
		var todayTasks []dashTask
		var recent []dashTask

		for _, t := range tasks {
			if t.Status == domain.StatusInProgress {
				inProgress++
			}
			if t.DueDate != nil && t.DueDate.Format("2006-01-02") < today && t.Status != domain.StatusDone {
				overdue++
			}
			dt := dashTask{Task: t}
			if t.ProjectID != nil {
				dt.ProjectTitle = projMap[*t.ProjectID]
			}
			if t.DueDate != nil && t.DueDate.Format("2006-01-02") == today {
				todayTasks = append(todayTasks, dt)
			}
			if len(recent) < 8 && (t.Status == domain.StatusTodo || t.Status == domain.StatusInProgress) {
				recent = append(recent, dt)
			}
		}
		if todayTasks == nil {
			todayTasks = []dashTask{}
		}
		if recent == nil {
			recent = []dashTask{}
		}

		// Active sprint (first active sprint across all projects)
		type activeSprint struct {
			ID           int64  `json:"id"`
			Title        string `json:"title"`
			ProjectTitle string `json:"project_title"`
			StartDate    string `json:"start_date"`
			EndDate      string `json:"end_date"`
		}
		var as *activeSprint
		row := db.QueryRow(`
			SELECT s.id, s.title, COALESCE(p.title,''), COALESCE(s.start_date,''), COALESCE(s.end_date,'')
			FROM sprints s LEFT JOIN projects p ON s.project_id = p.id
			WHERE s.status='active' LIMIT 1`)
		var asSprint activeSprint
		if err := row.Scan(&asSprint.ID, &asSprint.Title, &asSprint.ProjectTitle,
			&asSprint.StartDate, &asSprint.EndDate); err == nil {
			as = &asSprint
		}

		writeJSON(w, 200, map[string]any{
			"goals_count":    len(goals),
			"projects_count": len(projects),
			"in_progress":    inProgress,
			"overdue":        overdue,
			"today_tasks":    todayTasks,
			"recent_tasks":   recent,
			"active_sprint":  as,
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
	Tags []string `json:"tags"`
}

func enrichGoals(goals []*domain.Goal, projects []*domain.Project, tasks []*domain.Task) []goalOut {
	out := make([]goalOut, len(goals))
	for i, g := range goals {
		go2 := goalOut{Goal: g, Tags: []string{}}
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
	} `json:"progress"`
	ActiveTasks []string `json:"active_tasks"`
	Tags        []string `json:"tags"`
}

func enrichProjects(projects []*domain.Project, tasks []*domain.Task) []projectOut {
	out := make([]projectOut, len(projects))
	for i, p := range projects {
		po := projectOut{Project: p, Tags: []string{}, ActiveTasks: []string{}}
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

func listSprints(db *sql.DB, svc service.TaskService, projectID *int64) []sprintOut {
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
		// Count tasks in this sprint
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

// ── DB path / utility ─────────────────────────────────────────────────────────

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

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}
