// Package richtext converts EditorJS JSON content to Markdown.
//
// EditorJS stores content as a JSON object with a "blocks" array.
// Each block has a "type" and "data" field. This package converts
// the well-known EditorJS block types to standard Markdown.
package richtext

import (
	"encoding/json"
	"fmt"
	"strings"
)

// editorDoc is the top-level EditorJS document structure.
type editorDoc struct {
	Blocks []editorBlock `json:"blocks"`
}

// editorBlock is a single EditorJS block.
type editorBlock struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ToMarkdown converts an EditorJS JSON document to a Markdown string.
// It is a pure function with no side effects — safe to call concurrently.
// Returns an error only if the JSON is fundamentally malformed; unknown block
// types are silently skipped.
func ToMarkdown(jsonData []byte) (string, error) {
	if len(jsonData) == 0 {
		return "", nil
	}

	var doc editorDoc
	if err := json.Unmarshal(jsonData, &doc); err != nil {
		return "", fmt.Errorf("richtext: parse EditorJS JSON: %w", err)
	}

	var parts []string
	for _, block := range doc.Blocks {
		md := blockToMarkdown(block)
		if md != "" {
			parts = append(parts, md)
		}
	}
	return strings.Join(parts, "\n\n"), nil
}

// blockToMarkdown converts a single EditorJS block to Markdown.
// Returns empty string for unknown or empty blocks.
func blockToMarkdown(b editorBlock) string {
	switch b.Type {
	case "paragraph":
		return parseParagraph(b.Data)
	case "header":
		return parseHeader(b.Data)
	case "list":
		return parseList(b.Data)
	case "checklist":
		return parseChecklist(b.Data)
	case "quote":
		return parseQuote(b.Data)
	case "code":
		return parseCode(b.Data)
	case "delimiter":
		return "---"
	case "warning":
		return parseWarning(b.Data)
	case "table":
		return parseTable(b.Data)
	case "image", "simple-image":
		return parseImage(b.Data)
	default:
		return ""
	}
}

// ── Block parsers ─────────────────────────────────────────────────────────────

func parseParagraph(raw json.RawMessage) string {
	var data struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || data.Text == "" {
		return ""
	}
	return stripInlineHTML(data.Text)
}

func parseHeader(raw json.RawMessage) string {
	var data struct {
		Text  string `json:"text"`
		Level int    `json:"level"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || data.Text == "" {
		return ""
	}
	level := data.Level
	if level < 1 {
		level = 1
	}
	if level > 6 {
		level = 6
	}
	return strings.Repeat("#", level) + " " + stripInlineHTML(data.Text)
}

func parseList(raw json.RawMessage) string {
	var data struct {
		Style string   `json:"style"` // "ordered" | "unordered"
		Items []string `json:"items"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || len(data.Items) == 0 {
		return ""
	}
	var lines []string
	for i, item := range data.Items {
		item = stripInlineHTML(item)
		if data.Style == "ordered" {
			lines = append(lines, fmt.Sprintf("%d. %s", i+1, item))
		} else {
			lines = append(lines, "- "+item)
		}
	}
	return strings.Join(lines, "\n")
}

func parseChecklist(raw json.RawMessage) string {
	var data struct {
		Items []struct {
			Text    string `json:"text"`
			Checked bool   `json:"checked"`
		} `json:"items"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || len(data.Items) == 0 {
		return ""
	}
	var lines []string
	for _, item := range data.Items {
		check := " "
		if item.Checked {
			check = "x"
		}
		lines = append(lines, fmt.Sprintf("- [%s] %s", check, stripInlineHTML(item.Text)))
	}
	return strings.Join(lines, "\n")
}

func parseQuote(raw json.RawMessage) string {
	var data struct {
		Text    string `json:"text"`
		Caption string `json:"caption"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || data.Text == "" {
		return ""
	}
	lines := []string{"> " + stripInlineHTML(data.Text)}
	if data.Caption != "" {
		lines = append(lines, ">")
		lines = append(lines, "> — "+stripInlineHTML(data.Caption))
	}
	return strings.Join(lines, "\n")
}

func parseCode(raw json.RawMessage) string {
	var data struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || data.Code == "" {
		return ""
	}
	return "```\n" + data.Code + "\n```"
}

func parseWarning(raw json.RawMessage) string {
	var data struct {
		Title   string `json:"title"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return ""
	}
	var parts []string
	if data.Title != "" {
		parts = append(parts, "> **"+stripInlineHTML(data.Title)+"**")
	}
	if data.Message != "" {
		parts = append(parts, "> "+stripInlineHTML(data.Message))
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "\n")
}

func parseTable(raw json.RawMessage) string {
	var data struct {
		WithHeadings bool       `json:"withHeadings"`
		Content      [][]string `json:"content"`
	}
	if err := json.Unmarshal(raw, &data); err != nil || len(data.Content) == 0 {
		return ""
	}

	var lines []string
	startRow := 0

	if data.WithHeadings && len(data.Content) > 0 {
		// First row as header
		header := data.Content[0]
		lines = append(lines, "| "+strings.Join(escapeCells(header), " | ")+" |")
		// Separator
		sep := make([]string, len(header))
		for i := range sep {
			sep[i] = "---"
		}
		lines = append(lines, "| "+strings.Join(sep, " | ")+" |")
		startRow = 1
	}

	for _, row := range data.Content[startRow:] {
		lines = append(lines, "| "+strings.Join(escapeCells(row), " | ")+" |")
	}
	return strings.Join(lines, "\n")
}

func parseImage(raw json.RawMessage) string {
	// Handle both EditorJS image tool and simple-image tool data shapes.
	var data struct {
		URL     string `json:"url"`
		Caption string `json:"caption"`
		File    struct {
			URL string `json:"url"`
		} `json:"file"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return ""
	}
	url := data.URL
	if url == "" {
		url = data.File.URL
	}
	if url == "" {
		return ""
	}
	caption := stripInlineHTML(data.Caption)
	if caption == "" {
		caption = "image"
	}
	return fmt.Sprintf("![%s](%s)", caption, url)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// stripInlineHTML removes common EditorJS inline HTML tags (bold, italic, etc.)
// while preserving the text content. This produces clean Markdown.
var inlineTagReplacer = strings.NewReplacer(
	"<b>", "**", "</b>", "**",
	"<strong>", "**", "</strong>", "**",
	"<i>", "_", "</i>", "_",
	"<em>", "_", "</em>", "_",
	"<u>", "", "</u>", "",
	"<s>", "~~", "</s>", "~~",
	"<code>", "`", "</code>", "`",
	"<mark>", "==", "</mark>", "==",
	"&amp;", "&",
	"&lt;", "<",
	"&gt;", ">",
	"&nbsp;", " ",
	"<br>", "\n",
	"<br/>", "\n",
	"<br />", "\n",
)

func stripInlineHTML(s string) string {
	return strings.TrimSpace(inlineTagReplacer.Replace(s))
}

// escapeCells strips inline HTML from table cells.
func escapeCells(cells []string) []string {
	out := make([]string, len(cells))
	for i, c := range cells {
		out[i] = stripInlineHTML(c)
	}
	return out
}
