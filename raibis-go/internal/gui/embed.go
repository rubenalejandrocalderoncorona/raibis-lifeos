package gui

import (
	"embed"
	"io/fs"
)

//go:embed public
var FS embed.FS

// Sub returns an fs.FS rooted at public/ so paths like "index.html" work directly.
func Sub() (fs.FS, error) {
	return fs.Sub(FS, "public")
}
