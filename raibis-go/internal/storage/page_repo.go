package storage

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/raibis/raibis-go/internal/domain"
)

// ── UUID helper ───────────────────────────────────────────────────────────────

func newUUID() string {
	b := make([]byte, 16)
	rand.Read(b) //nolint:errcheck — crypto/rand never errors on Unix
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b[:4]) + "-" +
		hex.EncodeToString(b[4:6]) + "-" +
		hex.EncodeToString(b[6:8]) + "-" +
		hex.EncodeToString(b[8:10]) + "-" +
		hex.EncodeToString(b[10:])
}

// ── Pages ─────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) CreatePage(p *domain.Page) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p.ID == "" {
		p.ID = newUUID()
	}
	if p.Type == "" {
		p.Type = domain.PageTypePage
	}
	_, err := s.db.Exec(
		`INSERT INTO pages (id, type, title, icon, cover, body, database_id, parent_id, archived, position)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, string(p.Type), p.Title, nullStr(p.Icon), nullStr(p.Cover), nullStr(p.Body),
		p.DatabaseID, p.ParentID, boolInt(p.Archived), p.Position,
	)
	if err != nil {
		return "", fmt.Errorf("create page: %w", err)
	}
	return p.ID, nil
}

func (s *sqliteStorage) GetPage(id string) (*domain.Page, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getPage(id)
}

func (s *sqliteStorage) getPage(id string) (*domain.Page, error) {
	row := s.db.QueryRow(
		`SELECT id, type, title, COALESCE(icon,''), COALESCE(cover,''), COALESCE(body,''),
		        database_id, parent_id, archived, position, created_at, updated_at
		 FROM pages WHERE id=?`, id,
	)
	p := &domain.Page{}
	var dbID, parentID *string
	var createdAt, updatedAt string
	err := row.Scan(&p.ID, &p.Type, &p.Title, &p.Icon, &p.Cover, &p.Body,
		&dbID, &parentID, &p.Archived, &p.Position, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	p.DatabaseID = dbID
	p.ParentID = parentID
	p.CreatedAt, _ = parseTime(createdAt)
	p.UpdatedAt, _ = parseTime(updatedAt)
	p.Properties, _ = s.getPropertiesRaw(id)
	return p, nil
}

func (s *sqliteStorage) ListPages(f domain.PageFilter) ([]*domain.Page, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var conds []string
	var args []any

	if f.DatabaseID != nil {
		conds = append(conds, "database_id=?")
		args = append(args, *f.DatabaseID)
	}
	if f.ParentID != nil {
		conds = append(conds, "parent_id=?")
		args = append(args, *f.ParentID)
	}
	if f.Type != nil {
		conds = append(conds, "type=?")
		args = append(args, string(*f.Type))
	}
	if f.Archived != nil {
		conds = append(conds, "archived=?")
		args = append(args, boolInt(*f.Archived))
	}
	if f.Search != "" {
		conds = append(conds, "title LIKE ?")
		args = append(args, "%"+f.Search+"%")
	}

	q := `SELECT id, type, title, COALESCE(icon,''), COALESCE(cover,''), COALESCE(body,''),
	             database_id, parent_id, archived, position, created_at, updated_at
	      FROM pages`
	if len(conds) > 0 {
		q += " WHERE " + strings.Join(conds, " AND ")
	}
	q += " ORDER BY position ASC, created_at ASC"

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pages []*domain.Page
	for rows.Next() {
		p := &domain.Page{}
		var dbID, parentID *string
		var createdAt, updatedAt string
		if err := rows.Scan(&p.ID, &p.Type, &p.Title, &p.Icon, &p.Cover, &p.Body,
			&dbID, &parentID, &p.Archived, &p.Position, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		p.DatabaseID = dbID
		p.ParentID = parentID
		p.CreatedAt, _ = parseTime(createdAt)
		p.UpdatedAt, _ = parseTime(updatedAt)
		pages = append(pages, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load properties in a second pass (avoid N+1 for large lists by loading only on demand)
	for _, p := range pages {
		p.Properties, _ = s.getPropertiesRaw(p.ID)
	}
	return pages, nil
}

func (s *sqliteStorage) UpdatePage(p *domain.Page) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`UPDATE pages SET type=?, title=?, icon=?, cover=?, body=?,
		 database_id=?, parent_id=?, archived=?, position=?,
		 updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		string(p.Type), p.Title, nullStr(p.Icon), nullStr(p.Cover), nullStr(p.Body),
		p.DatabaseID, p.ParentID, boolInt(p.Archived), p.Position, p.ID,
	)
	return err
}

func (s *sqliteStorage) DeletePage(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM pages WHERE id=?`, id)
	return err
}

// ── Page properties ───────────────────────────────────────────────────────────

func (s *sqliteStorage) GetProperties(pageID string) (map[string]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getPropertiesRaw(pageID)
}

func (s *sqliteStorage) getPropertiesRaw(pageID string) (map[string]string, error) {
	rows, err := s.db.Query(`SELECT key, COALESCE(value,'') FROM page_properties WHERE page_id=?`, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	props := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		props[k] = v
	}
	return props, rows.Err()
}

func (s *sqliteStorage) SetProperties(pageID string, props map[string]string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM page_properties WHERE page_id=?`, pageID); err != nil {
		tx.Rollback() //nolint:errcheck
		return err
	}
	for k, v := range props {
		if _, err := tx.Exec(`INSERT INTO page_properties (page_id, key, value) VALUES (?,?,?)`, pageID, k, v); err != nil {
			tx.Rollback() //nolint:errcheck
			return err
		}
	}
	return tx.Commit()
}

func (s *sqliteStorage) PatchProperties(pageID string, patch map[string]string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range patch {
		if _, err := s.db.Exec(
			`INSERT INTO page_properties (page_id, key, value) VALUES (?,?,?)
			 ON CONFLICT(page_id, key) DO UPDATE SET value=excluded.value`,
			pageID, k, v,
		); err != nil {
			return err
		}
	}
	return nil
}

// ── Schema ────────────────────────────────────────────────────────────────────

func (s *sqliteStorage) GetSchema(dbID string) ([]domain.SchemaColumn, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getSchema(dbID)
}

func (s *sqliteStorage) getSchema(dbID string) ([]domain.SchemaColumn, error) {
	rows, err := s.db.Query(
		`SELECT key, label, data_type, COALESCE(options,'[]'), required, position
		 FROM schema_columns WHERE database_id=? ORDER BY position ASC`, dbID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cols []domain.SchemaColumn
	for rows.Next() {
		c := domain.SchemaColumn{}
		var optJSON string
		if err := rows.Scan(&c.Key, &c.Label, &c.DataType, &optJSON, &c.Required, &c.Position); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(optJSON), &c.Options) //nolint:errcheck
		cols = append(cols, c)
	}
	return cols, rows.Err()
}

func (s *sqliteStorage) SetSchema(dbID string, cols []domain.SchemaColumn) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM schema_columns WHERE database_id=?`, dbID); err != nil {
		tx.Rollback() //nolint:errcheck
		return err
	}
	for i, c := range cols {
		opts, _ := json.Marshal(c.Options)
		if _, err := tx.Exec(
			`INSERT INTO schema_columns (database_id, key, label, data_type, options, required, position)
			 VALUES (?,?,?,?,?,?,?)`,
			dbID, c.Key, c.Label, c.DataType, string(opts), boolInt(c.Required), i,
		); err != nil {
			tx.Rollback() //nolint:errcheck
			return err
		}
	}
	return tx.Commit()
}

func (s *sqliteStorage) AddSchemaColumn(dbID string, col domain.SchemaColumn) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	opts, _ := json.Marshal(col.Options)
	_, err := s.db.Exec(
		`INSERT INTO schema_columns (database_id, key, label, data_type, options, required, position)
		 VALUES (?,?,?,?,?,?,
		         COALESCE((SELECT MAX(position)+1 FROM schema_columns WHERE database_id=?), 0))`,
		dbID, col.Key, col.Label, col.DataType, string(opts), boolInt(col.Required), dbID,
	)
	return err
}

func (s *sqliteStorage) UpdateSchemaColumn(dbID string, col domain.SchemaColumn) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	opts, _ := json.Marshal(col.Options)
	_, err := s.db.Exec(
		`UPDATE schema_columns SET label=?, data_type=?, options=?, required=?, position=?
		 WHERE database_id=? AND key=?`,
		col.Label, col.DataType, string(opts), boolInt(col.Required), col.Position, dbID, col.Key,
	)
	return err
}

func (s *sqliteStorage) DeleteSchemaColumn(dbID string, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM schema_columns WHERE database_id=? AND key=?`, dbID, key)
	return err
}

// ── Relations ─────────────────────────────────────────────────────────────────

func (s *sqliteStorage) AddRelation(rel domain.Relation) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO page_relations (from_page_id, to_page_id, key) VALUES (?,?,?)`,
		rel.FromPageID, rel.ToPageID, rel.Key,
	)
	return err
}

func (s *sqliteStorage) RemoveRelation(rel domain.Relation) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`DELETE FROM page_relations WHERE from_page_id=? AND to_page_id=? AND key=?`,
		rel.FromPageID, rel.ToPageID, rel.Key,
	)
	return err
}

func (s *sqliteStorage) GetRelations(fromID string, key string) ([]domain.Relation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q := `SELECT from_page_id, to_page_id, key FROM page_relations WHERE from_page_id=?`
	args := []any{fromID}
	if key != "" {
		q += " AND key=?"
		args = append(args, key)
	}
	return s.scanRelations(q, args...)
}

func (s *sqliteStorage) GetBackRelations(toID string, key string) ([]domain.Relation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q := `SELECT from_page_id, to_page_id, key FROM page_relations WHERE to_page_id=?`
	args := []any{toID}
	if key != "" {
		q += " AND key=?"
		args = append(args, key)
	}
	return s.scanRelations(q, args...)
}

func (s *sqliteStorage) scanRelations(q string, args ...any) ([]domain.Relation, error) {
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var rels []domain.Relation
	for rows.Next() {
		r := domain.Relation{}
		if err := rows.Scan(&r.FromPageID, &r.ToPageID, &r.Key); err != nil {
			return nil, err
		}
		rels = append(rels, r)
	}
	return rels, rows.Err()
}

// ── Obsidian vaults ───────────────────────────────────────────────────────────

func (s *sqliteStorage) AddVault(v *domain.ObsidianVault) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	res, err := s.db.Exec(
		`INSERT INTO obsidian_vaults (name, path, active) VALUES (?,?,?)`,
		v.Name, v.Path, boolInt(v.Active),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *sqliteStorage) GetVault(id int64) (*domain.ObsidianVault, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v := &domain.ObsidianVault{}
	var lastSync *string
	err := s.db.QueryRow(
		`SELECT id, name, path, active, last_sync FROM obsidian_vaults WHERE id=?`, id,
	).Scan(&v.ID, &v.Name, &v.Path, &v.Active, &lastSync)
	if err != nil {
		return nil, err
	}
	if lastSync != nil {
		v.LastSync, _ = parseTime(*lastSync)
	}
	return v, nil
}

func (s *sqliteStorage) ListVaults() ([]*domain.ObsidianVault, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(`SELECT id, name, path, active, last_sync FROM obsidian_vaults ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var vaults []*domain.ObsidianVault
	for rows.Next() {
		v := &domain.ObsidianVault{}
		var lastSync *string
		if err := rows.Scan(&v.ID, &v.Name, &v.Path, &v.Active, &lastSync); err != nil {
			return nil, err
		}
		if lastSync != nil {
			v.LastSync, _ = parseTime(*lastSync)
		}
		vaults = append(vaults, v)
	}
	return vaults, rows.Err()
}

func (s *sqliteStorage) UpdateVault(v *domain.ObsidianVault) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`UPDATE obsidian_vaults SET name=?, path=?, active=? WHERE id=?`,
		v.Name, v.Path, boolInt(v.Active), v.ID,
	)
	return err
}

func (s *sqliteStorage) DeleteVault(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM obsidian_vaults WHERE id=?`, id)
	return err
}

func (s *sqliteStorage) TouchVaultSync(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE obsidian_vaults SET last_sync=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

// ── Settings ──────────────────────────────────────────────────────────────────

func (s *sqliteStorage) GetSetting(key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var value string
	err := s.db.QueryRow(`SELECT COALESCE(value,'') FROM settings WHERE key=?`, key).Scan(&value)
	if err != nil {
		return "", err
	}
	return value, nil
}

func (s *sqliteStorage) SetSetting(key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(
		`INSERT INTO settings (key, value) VALUES (?,?)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
		key, value,
	)
	return err
}

// ── helpers ───────────────────────────────────────────────────────────────────

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// ── Page comments ─────────────────────────────────────────────────────────────

func (s *sqliteStorage) ListPageComments(pageID string) ([]*domain.Comment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rows, err := s.db.Query(
		`SELECT id, COALESCE(page_id,''), author, body, created_at
		 FROM comments WHERE page_id=? ORDER BY created_at ASC`, pageID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var comments []*domain.Comment
	for rows.Next() {
		c := &domain.Comment{}
		var createdAt string
		if err := rows.Scan(&c.ID, &c.PageID, &c.Author, &c.Body, &createdAt); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = parseTime(createdAt)
		comments = append(comments, c)
	}
	return comments, rows.Err()
}
