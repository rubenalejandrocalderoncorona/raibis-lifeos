// Package rollup implements write-time DAG rollup propagation over the
// generic entity_children edge table.
//
// The engine is strictly entity agnostic: default entities (task, project,
// goal, …) and user-created custom types follow the exact same path —
//
//  1. edges are read ONLY from entity_children (never entity-specific tables),
//  2. child values are read ONLY from the universal properties store,
//  3. rollup rules are read from the type-config row whose name matches the
//     entity's canonical type name.
//
// There are no entity-name branches anywhere in this package. A visited set
// keyed by canonical "type:id" halts traversal on cyclic graphs (task A →
// task B → task A) before any stack growth or repeated writes.
//
// Canonical type names: historically edges may carry a "custom_" prefix
// (e.g. "custom_books") while the properties and type-config stores use the
// bare name ("books"). canonical()/edgeForms() normalize this uniformly for
// every type, so the same code path serves both spellings.
package rollup

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/raibis/raibis-go/internal/domain"
)

// Storer is the minimal storage subset needed for rollup propagation.
// Defined here so the rollup package stays decoupled from the full storage interface.
type Storer interface {
	GetEntityParents(childType string, childID int64) ([]*domain.EntityChild, error)
	GetEntityChildren(parentType string, parentID int64) ([]*domain.EntityChild, error)
	GetEntityRelations(entityType string, entityID int64) ([]*domain.EntityRelation, error)
	GetCustomEntityType(name string) (*domain.CustomEntityType, error)
	ListProperties(entityType string, entityID int64) (map[string]string, error)
	SetProperty(entityType string, entityID int64, key, value string) error
}

// Config is the JSON schema stored in a prop_def's "rollup" field:
//
//	{"target_property":"status","operation":"average","value_map":{"Done":100,"Todo":0}}
type Config struct {
	ChildEntityType string             `json:"child_entity_type"` // optional filter (canonical or prefixed)
	TargetProperty  string             `json:"target_property"`
	Operation       string             `json:"operation"` // sum | average | percentage_match | count
	ValueMap        map[string]float64 `json:"value_map"`
	Condition       *Condition         `json:"condition"`
	Display         string             `json:"display,omitempty"` // text | progress_bar | ring (UI hint, ignored by the engine)
}

// Condition is used for the percentage_match operation.
type Condition struct {
	MatchValue string `json:"match_value"`
}

type propDef struct {
	Key    string  `json:"key"`
	Type   string  `json:"type"`
	Rollup *Config `json:"rollup"`
}

// canonical strips the legacy "custom_" edge prefix: the properties store and
// the type-config table always use the bare type name.
func canonical(t string) string { return strings.TrimPrefix(t, "custom_") }

// edgeForms returns every spelling an entity_children row may use for a type.
func edgeForms(t string) []string {
	if b := canonical(t); b != t {
		return []string{t, b}
	}
	return []string{t, "custom_" + t}
}

// TriggerPropagation starts rollup recalculation from a changed entity,
// cascading up through all ancestors. Safe to call in a goroutine.
func TriggerPropagation(store Storer, entityType string, entityID int64) {
	propagate(store, entityType, entityID, map[string]bool{})
}

// propagate walks one level up the edge graph, recomputes every rollup rule
// on each parent, then recurses. visited carries the canonical ids already
// processed in this chain; hitting one again means a cycle — halt immediately.
func propagate(store Storer, childType string, childID int64, visited map[string]bool) {
	key := canonical(childType) + ":" + strconv.FormatInt(childID, 10)
	if visited[key] {
		return // cycle detected — halt the cascade
	}
	visited[key] = true

	parents := collectParents(store, childType, childID)
	for _, parent := range parents {
		recompute(store, parent.ParentEntityType, parent.ParentEntityID)
		propagate(store, parent.ParentEntityType, parent.ParentEntityID, visited)
	}
}

// RecomputeEntity recalculates the rollup rules on the entity itself — used
// when one of its child links was removed (the child can no longer reach it
// through the edge graph) — then cascades to its ancestors.
func RecomputeEntity(store Storer, entityType string, entityID int64) {
	recompute(store, entityType, entityID)
	propagate(store, entityType, entityID, map[string]bool{})
}

// recompute evaluates and writes every rollup rule configured on one entity.
func recompute(store Storer, entityType string, entityID int64) {
	pType := canonical(entityType)
	defs := rollupDefsFor(store, pType)
	if len(defs) == 0 {
		return
	}
	children := collectChildren(store, entityType, entityID)
	for _, rd := range defs {
		if result, ok := evaluate(store, rd.Rollup, children); ok {
			_ = store.SetProperty(pType, entityID, rd.Key, formatResult(result))
		}
	}
}

// relationPeers returns the entity's bidirectional peer links from the
// relations table, under every type spelling. Peer links count both as
// potential children (when aggregating) and as potential parents (when
// cascading a change outward): a Goal "related to" Tasks must recompute when
// one of those Tasks changes, regardless of link direction.
func relationPeers(store Storer, entityType string, entityID int64) []*domain.EntityRelation {
	var out []*domain.EntityRelation
	seen := map[string]bool{}
	for _, form := range edgeForms(entityType) {
		rels, err := store.GetEntityRelations(form, entityID)
		if err != nil {
			continue
		}
		for _, r := range rels {
			k := canonical(r.RelatedType) + ":" + strconv.FormatInt(r.RelatedID, 10)
			if seen[k] {
				continue
			}
			seen[k] = true
			out = append(out, r)
		}
	}
	return out
}

// collectParents merges parent edges (any spelling) plus relation peers.
func collectParents(store Storer, childType string, childID int64) []*domain.EntityChild {
	var out []*domain.EntityChild
	seen := map[string]bool{}
	add := (func(t string, id int64) {
		k := canonical(t) + ":" + strconv.FormatInt(id, 10)
		if seen[k] {
			return
		}
		seen[k] = true
		out = append(out, &domain.EntityChild{ParentEntityType: t, ParentEntityID: id})
	})
	for _, form := range edgeForms(childType) {
		ps, err := store.GetEntityParents(form, childID)
		if err != nil {
			continue
		}
		for _, p := range ps {
			add(p.ParentEntityType, p.ParentEntityID)
		}
	}
	// exclude self so a self-relation can never recurse
	self := canonical(childType) + ":" + strconv.FormatInt(childID, 10)
	seen[self] = true
	for _, r := range relationPeers(store, childType, childID) {
		add(r.RelatedType, r.RelatedID)
	}
	return out
}

// collectChildren merges child edges (any spelling) plus relation peers, so a
// rule aggregates hierarchy children AND standard relational links alike.
func collectChildren(store Storer, parentType string, parentID int64) []*domain.EntityChild {
	var out []*domain.EntityChild
	seen := map[string]bool{}
	add := (func(t string, id int64) {
		k := canonical(t) + ":" + strconv.FormatInt(id, 10)
		if seen[k] {
			return
		}
		seen[k] = true
		out = append(out, &domain.EntityChild{ChildEntityType: t, ChildEntityID: id})
	})
	for _, form := range edgeForms(parentType) {
		cs, err := store.GetEntityChildren(form, parentID)
		if err != nil {
			continue
		}
		for _, c := range cs {
			add(c.ChildEntityType, c.ChildEntityID)
		}
	}
	self := canonical(parentType) + ":" + strconv.FormatInt(parentID, 10)
	seen[self] = true
	for _, r := range relationPeers(store, parentType, parentID) {
		add(r.RelatedType, r.RelatedID)
	}
	return out
}

// rollupDefsFor reads the rollup rules configured for a type — identically
// for default and custom entities: whatever type-config row matches the
// canonical name. No row (or no rules) simply means nothing to compute.
func rollupDefsFor(store Storer, typeName string) []propDef {
	typeConfig, err := store.GetCustomEntityType(typeName)
	if err != nil || typeConfig == nil || typeConfig.PropDefs == "" || typeConfig.PropDefs == "[]" {
		return nil
	}
	var defs []propDef
	if err := json.Unmarshal([]byte(typeConfig.PropDefs), &defs); err != nil {
		return nil
	}
	var out []propDef
	for _, d := range defs {
		if d.Type == "rollup" && d.Rollup != nil && d.Rollup.Operation != "" &&
			(d.Rollup.TargetProperty != "" || d.Rollup.Operation == "count") {
			out = append(out, d)
		}
	}
	return out
}

// evaluate executes one rollup rule over the given child edges.
// Children lacking the target property are skipped, never fatal.
// ok=false means there was no data to aggregate — the caller must not write,
// so an empty branch never clobbers a previously computed value with 0.
func evaluate(store Storer, cfg *Config, children []*domain.EntityChild) (float64, bool) {
	if cfg == nil || cfg.Operation == "" {
		return 0, false
	}

	var values []float64
	inFilter := 0 // children matching the type filter
	withProp := 0 // …that also carry the target property
	matches := 0

	for _, child := range children {
		if cfg.ChildEntityType != "" && canonical(child.ChildEntityType) != canonical(cfg.ChildEntityType) {
			continue
		}
		inFilter++

		props, err := store.ListProperties(canonical(child.ChildEntityType), child.ChildEntityID)
		if err != nil {
			continue
		}
		rawVal, ok := props[cfg.TargetProperty]
		if !ok || rawVal == "" {
			continue // child does not possess the property — skip it
		}
		withProp++

		switch cfg.Operation {
		case "percentage_match":
			if cfg.Condition != nil && rawVal == cfg.Condition.MatchValue {
				matches++
			}
		case "sum", "average":
			if len(cfg.ValueMap) > 0 {
				if mapped, ok2 := cfg.ValueMap[rawVal]; ok2 {
					values = append(values, mapped)
				}
			} else if f, err := strconv.ParseFloat(strings.TrimSpace(rawVal), 64); err == nil {
				values = append(values, f)
			}
		}
	}

	switch cfg.Operation {
	case "count":
		return float64(inFilter), true
	case "percentage_match":
		if withProp > 0 {
			return float64(matches) / float64(withProp) * 100, true
		}
	case "sum", "average":
		if len(values) > 0 {
			var s float64
			for _, v := range values {
				s += v
			}
			if cfg.Operation == "average" {
				return s / float64(len(values)), true
			}
			return s, true
		}
	}
	return 0, false
}

func formatResult(v float64) string {
	if v == float64(int64(v)) {
		return strconv.FormatInt(int64(v), 10)
	}
	return strconv.FormatFloat(v, 'f', 2, 64)
}
