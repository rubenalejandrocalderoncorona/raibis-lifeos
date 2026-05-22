package sync

import (
	"strings"
	"testing"
)

func TestSplitFrontmatter_present(t *testing.T) {
	input := "---\nid: abc\ntitle: Hello World\nstatus: done\n---\nbody text here"
	front, body := splitFrontmatter(input)
	if front["id"] != "abc" {
		t.Errorf("id: got %q want %q", front["id"], "abc")
	}
	if front["title"] != "Hello World" {
		t.Errorf("title: got %q want %q", front["title"], "Hello World")
	}
	if front["status"] != "done" {
		t.Errorf("status: got %q want %q", front["status"], "done")
	}
	if body != "body text here" {
		t.Errorf("body: got %q want %q", body, "body text here")
	}
}

func TestSplitFrontmatter_absent(t *testing.T) {
	input := "just body text"
	front, body := splitFrontmatter(input)
	if len(front) != 0 {
		t.Errorf("expected empty front, got %v", front)
	}
	if body != input {
		t.Errorf("body mismatch")
	}
}

func TestRenderFrontmatter_roundtrip(t *testing.T) {
	orig := map[string]string{
		"id":     "1234-5678",
		"title":  "My Page",
		"status": "active",
	}
	rendered := renderFrontmatter(orig)
	front, _ := splitFrontmatter(rendered + "body")
	for k, v := range orig {
		if front[k] != v {
			t.Errorf("key %q: got %q want %q", k, front[k], v)
		}
	}
}

func TestRenderFrontmatter_specialChars(t *testing.T) {
	front := map[string]string{"title": "Hello: World"}
	rendered := renderFrontmatter(front)
	if !strings.Contains(rendered, `"Hello: World"`) {
		t.Errorf("expected quoted value in: %s", rendered)
	}
}

func TestSlugify(t *testing.T) {
	cases := [][2]string{
		{"My Goal: Fitness!", "my-goal-fitness"},
		{"", "page"},
		{"   spaces   ", "spaces"},
	}
	for _, c := range cases {
		got := slugify(c[0])
		if got != c[1] {
			t.Errorf("slugify(%q) = %q, want %q", c[0], got, c[1])
		}
	}
}
