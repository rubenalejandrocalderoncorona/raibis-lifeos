"""Sprint board view widget."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, DataTable, Label, Select
from textual.containers import Horizontal, Vertical

from raibis.tui.widgets.ai_sidebar import AISidebar


class SprintView(Widget):
    DEFAULT_CSS = """
    SprintView {
        layout: horizontal;
        height: 1fr;
    }
    #sprint-area {
        width: 1fr;
        padding: 1 2;
        height: 1fr;
        layout: vertical;
    }
    .section-title {
        text-style: bold;
        color: $accent;
        height: 2;
        margin-bottom: 1;
    }
    #sprint-header {
        height: 8;
        layout: horizontal;
        margin-bottom: 1;
    }
    .sprint-info {
        width: 1fr;
        border: round $primary-darken-2;
        padding: 1;
        background: $surface;
        margin-right: 1;
    }
    #project-select {
        width: 30;
        height: 3;
    }
    #sprint-table {
        height: 1fr;
    }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn
        self._project_id: int | None = None
        self._sprint_id: int | None = None

    def _get_context(self) -> str:
        if not self._sprint_id:
            return "No active sprint selected."
        from raibis.db import database as db
        tasks = db.get_tasks(self._conn, sprint_id=self._sprint_id, parent_task_id=None)
        lines = [f"- [{t['status']}] {t['title']} ({t['priority']})" for t in tasks]
        return "Sprint tasks:\n" + "\n".join(lines) if lines else "Sprint is empty."

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Vertical(id="sprint-area"):
                with Horizontal(id="sprint-header"):
                    with Vertical(classes="sprint-info"):
                        yield Label("Sprint Board", classes="section-title")
                        yield Select(
                            [("Select project…", None)],
                            id="project-select",
                            value=None,
                            allow_blank=False,
                        )
                    with Vertical(classes="sprint-info"):
                        yield Static("[dim]Select a project to view sprint[/dim]", id="sprint-summary")
                yield DataTable(id="sprint-table", cursor_type="row")
            yield AISidebar(get_context_fn=self._get_context)

    def on_mount(self) -> None:
        self._load_projects()
        table = self.query_one("#sprint-table", DataTable)
        table.add_columns("#", "Title", "Priority", "Status", "Due", "Est.", "Tags")

    def _load_projects(self) -> None:
        from raibis.db import database as db
        projects = db.get_projects(self._conn)
        options = [("Select project…", None)] + [(p["title"], p["id"]) for p in projects]
        self.query_one("#project-select", Select).set_options(options)

    def on_select_changed(self, event: Select.Changed) -> None:
        if event.select.id == "project-select":
            self._project_id = event.value
            self._load_sprint()

    def _load_sprint(self) -> None:
        if not self._project_id:
            return
        from raibis.db import database as db
        sprint = db.get_active_sprint(self._conn, self._project_id)
        summary = self.query_one("#sprint-summary", Static)
        table = self.query_one("#sprint-table", DataTable)
        table.clear()

        if not sprint:
            summary.update("[yellow]No active sprint for this project.[/yellow]")
            return

        self._sprint_id = sprint["id"]
        tasks = db.get_tasks(self._conn, sprint_id=self._sprint_id, parent_task_id=None)
        total = len(tasks)
        done = sum(1 for t in tasks if t["status"] == "done")
        pct = int(done / total * 100) if total else 0

        summary.update(
            f"[bold]{sprint['title']}[/bold]\n"
            f"{sprint['start_date'] or '?'} → {sprint['end_date'] or '?'}\n"
            f"Progress: {done}/{total} done  [{pct}%]"
        )
        for i, t in enumerate(tasks, 1):
            tags = db.get_tag_string(self._conn, "task", t["id"])
            table.add_row(
                str(i), t["title"], t["priority"] or "—", t["status"],
                t["due_date"] or "—",
                f"{t['estimated_mins']}m" if t["estimated_mins"] else "—",
                tags or "—",
            )
