// Package rollup implements write-time DAG rollup propagation.
// When a custom entity's properties change, TriggerPropagation walks up
// the entity_children hierarchy, recomputes any Rollup-typed prop_defs on
// each parent, writes the result back via SetProperty, and continues cascading.
// A visited set prevents infinite loops in cyclic graphs.
package rollup

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/raibis/raibis-go/internal/domain"
)

// Storer is the minimal storage subset needed for rollup propagation.
// Defined here so the rollup package stays decoupled from the full storage interface.
type Storer interface {
	GetEntityParents(childType string, childID int64) ([]*domain.EntityChild, error)
	GetEntityChildren(parentType string, parentID int64) ([]*domain.EntityChild, error)
	GetCustomEntityType(name string) (*domain.CustomEntityType, error)
	ListProperties(entityType string, entityID int64) (map[string]string, error)
	SetProperty(entityType string, entityID int64, key, value string) error
}

// Config is the JSON schema stored in a prop_def's "rollup" field.
type Config struct {
	ChildEntityType string             `json:"child_entity_type"` // optional filter
	TargetProperty  string             `json:"target_property"`
	Operation       string             `json:"operation"` // sum | average | percentage_match
	ValueMap        map[string]float64 `json:"value_map"`
	Condition       *Condition         `json:"condition"`
}

// Condition is used for percentage_match operation.
type Condition struct {
	MatchValue string `json:"match_value"`
}

type propDef struct {
	Key    string  `json:"key"`
	Type   string  `json:"type"`
	Rollup *Config `json:"rollup"`
}

// TriggerPropagation starts rollup recalculation from a changed entity,
// walking up through all parent entities. Safe to call in a goroutine.
func TriggerPropagation(store Storer, childType string, childID int64) {
	propagate(store, childType, childID, map[string]bool{})
}

func propagate(store Storer, childType string, childID int64, visited map[string]bool) {
	key := fmt.Sprintf("%s:%d", childType, childID)
	if visited[key] {
		return // cycle detected — stop
	}
	visited[key] = true

	parents, err := store.GetEntityParents(childType, childID)
	if err != nil || len(parents) == 0 {
		return
	}

	for _, parent := range parents {
		pType := parent.ParentEntityType
		typeConfig, err := store.GetCustomEntityType(pType)
		if err != nil {
			continue // not a custom type — no rollup rules possible
		}
		if typeConfig.PropDefs == "" || typeConfig.PropDefs == "[]" {
			continue
		}

		var defs []propDef
		if err := json.Unmarshal([]byte(typeConfig.PropDefs), &defs); err != nil {
			continue
		}

		// Collect rollup rules for this parent type
		var rollupDefs []propDef
		for _, d := range defs {
			if d.Type == "rollup" && d.Rollup != nil && d.Rollup.TargetProperty != "" && d.Rollup.Operation != "" {
				rollupDefs = append(rollupDefs, d)
			}
		}
		if len(rollupDefs) == 0 {
			continue
		}

		// Fetch all children of the parent once (shared across all rollup rules)
		children, err := store.GetEntityChildren(pType, parent.ParentEntityID)
		if err != nil {
			continue
		}

		// Evaluate and write each rollup rule
		for _, rd := range rollupDefs {
			result := evaluate(store, rd.Rollup, children)
			_ = store.SetProperty(pType, parent.ParentEntityID, rd.Key, formatResult(result))
		}

		// Cascade up the DAG
		propagate(store, pType, parent.ParentEntityID, visited)
	}
}

func evaluate(store Storer, cfg *Config, children []*domain.EntityChild) float64 {
	var values []float64
	total := 0
	matches := 0

	for _, child := range children {
		if cfg.ChildEntityType != "" && child.ChildEntityType != cfg.ChildEntityType {
			continue
		}

		props, err := store.ListProperties(child.ChildEntityType, child.ChildEntityID)
		if err != nil {
			continue
		}
		rawVal, ok := props[cfg.TargetProperty]
		if !ok || rawVal == "" {
			continue
		}

		total++

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
			} else {
				if f, err := strconv.ParseFloat(strings.TrimSpace(rawVal), 64); err == nil {
					values = append(values, f)
				}
			}
		}
	}

	switch cfg.Operation {
	case "percentage_match":
		if total > 0 {
			return float64(matches) / float64(total) * 100
		}
	case "sum":
		var s float64
		for _, v := range values {
			s += v
		}
		return s
	case "average":
		if len(values) > 0 {
			var s float64
			for _, v := range values {
				s += v
			}
			return s / float64(len(values))
		}
	}
	return 0
}

func formatResult(v float64) string {
	if v == float64(int64(v)) {
		return strconv.FormatInt(int64(v), 10)
	}
	return strconv.FormatFloat(v, 'f', 2, 64)
}
