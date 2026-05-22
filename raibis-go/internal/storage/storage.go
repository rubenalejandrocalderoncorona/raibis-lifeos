package storage

import "github.com/raibis/raibis-go/internal/domain"

// Storage is the single persistence interface.
// Neither the TUI nor the HTTP server touch SQL directly — they go through this.
type Storage interface {
	// ── Tasks ────────────────────────────────────────────────────────────────
	CreateTask(t *domain.Task) (int64, error)
	GetTask(id int64) (*domain.Task, error)
	ListTasks(f domain.TaskFilter) ([]*domain.Task, error)
	UpdateTask(t *domain.Task) error
	DeleteTask(id int64) error

	// ── Goals ────────────────────────────────────────────────────────────────
	CreateGoal(g *domain.Goal) (int64, error)
	GetGoal(id int64) (*domain.Goal, error)
	ListGoals(status domain.Status) ([]*domain.Goal, error)
	UpdateGoal(g *domain.Goal) error
	DeleteGoal(id int64) error

	// ── Projects ─────────────────────────────────────────────────────────────
	CreateProject(p *domain.Project) (int64, error)
	GetProject(id int64) (*domain.Project, error)
	ListProjects(status domain.Status) ([]*domain.Project, error)
	UpdateProject(p *domain.Project) error
	DeleteProject(id int64) error

	// ── Sprints ──────────────────────────────────────────────────────────────
	CreateSprint(s *domain.Sprint) (int64, error)
	GetSprint(id int64) (*domain.Sprint, error)
	ListSprints(projectID int64) ([]*domain.Sprint, error)
	GetActiveSprint(projectID int64) (*domain.Sprint, error)
	UpdateSprintStatus(id int64, status string) error

	// ── Notes ────────────────────────────────────────────────────────────────
	CreateNote(n *domain.Note) (int64, error)
	GetNote(id int64) (*domain.Note, error)
	ListNotes(goalID, taskID, projectID *int64) ([]*domain.Note, error)
	UpdateNote(n *domain.Note) error
	DeleteNote(id int64) error

	// ── Categories ───────────────────────────────────────────────────────────
	CreateCategory(c *domain.Category) (int64, error)
	ListCategories() ([]*domain.Category, error)
	UpdateCategory(c *domain.Category) error
	DeleteCategory(id int64) error

	// ── Tags ─────────────────────────────────────────────────────────────────
	CreateTag(t *domain.Tag) (int64, error)
	ListTags() ([]*domain.Tag, error)
	UpdateTag(t *domain.Tag) error
	DeleteTag(id int64) error
	// SetEntityTags replaces all tags for an entity atomically.
	SetEntityTags(entityType string, entityID int64, tagIDs []int64) error
	// GetEntityTags returns all tags attached to an entity.
	GetEntityTags(entityType string, entityID int64) ([]domain.Tag, error)

	// ── Properties ───────────────────────────────────────────────────────────
	// SetProperty creates or updates a single key-value property on an entity.
	SetProperty(entityType string, entityID int64, key, value string) error
	// DeleteProperty removes a property key from an entity.
	DeleteProperty(entityType string, entityID int64, key string) error
	// ListProperties returns all properties for an entity as a map.
	ListProperties(entityType string, entityID int64) (map[string]string, error)

	// ── Habits ───────────────────────────────────────────────────────────────
	CreateHabit(h *domain.Habit) (int64, error)
	GetHabit(id int64) (*domain.Habit, error)
	ListHabits() ([]*domain.Habit, error)
	UpdateHabit(h *domain.Habit) error
	DeleteHabit(id int64) error

	// ── Comments ─────────────────────────────────────────────────────────────
	CreateComment(c *domain.Comment) (int64, error)
	ListComments(entityType string, entityID int64) ([]*domain.Comment, error)
	CountComments(entityType string, entityID int64) (int, error)

	// ── Pages (universal content unit) ───────────────────────────────────────
	CreatePage(p *domain.Page) (string, error)
	GetPage(id string) (*domain.Page, error)
	ListPages(f domain.PageFilter) ([]*domain.Page, error)
	UpdatePage(p *domain.Page) error
	DeletePage(id string) error

	// ── Page properties ───────────────────────────────────────────────────────
	GetProperties(pageID string) (map[string]string, error)
	SetProperties(pageID string, props map[string]string) error
	PatchProperties(pageID string, patch map[string]string) error

	// ── Database schema ───────────────────────────────────────────────────────
	GetSchema(dbID string) ([]domain.SchemaColumn, error)
	SetSchema(dbID string, cols []domain.SchemaColumn) error
	AddSchemaColumn(dbID string, col domain.SchemaColumn) error
	UpdateSchemaColumn(dbID string, col domain.SchemaColumn) error
	DeleteSchemaColumn(dbID string, key string) error

	// ── Page relations ────────────────────────────────────────────────────────
	AddRelation(rel domain.Relation) error
	RemoveRelation(rel domain.Relation) error
	GetRelations(fromID string, key string) ([]domain.Relation, error)
	GetBackRelations(toID string, key string) ([]domain.Relation, error)

	// ── Obsidian vaults ───────────────────────────────────────────────────────
	AddVault(v *domain.ObsidianVault) (int64, error)
	GetVault(id int64) (*domain.ObsidianVault, error)
	ListVaults() ([]*domain.ObsidianVault, error)
	UpdateVault(v *domain.ObsidianVault) error
	DeleteVault(id int64) error
	TouchVaultSync(id int64) error

	// ── Settings ──────────────────────────────────────────────────────────────
	GetSetting(key string) (string, error)
	SetSetting(key, value string) error

	// ── Page comments ─────────────────────────────────────────────────────────
	ListPageComments(pageID string) ([]*domain.Comment, error)

	// Close releases the database connection.
	Close() error
}
