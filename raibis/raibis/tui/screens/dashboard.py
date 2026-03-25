"""Dashboard view widget."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, DataTable, Label
from textual.containers import Horizontal, Vertical

from raibis.tui.widgets.ai_sidebar import AISidebar


class DashboardView(Widget):
    DEFAULT_CSS = """
    DashboardView {
        layout: horizontal;
        height: 1fr;
    }
    #dash-main {
        width: 1fr;
        padding: 1 2;
        height: 1fr;
    }
    .section-title {
        text-style: bold;
        color: $accent;
        height: 2;
        margin-top: 1;
    }
    #stats-row {
        height: 5;
        margin-bottom: 1;
    }
    .stat-box {
        border: round $primary-darken-2;
        height: 5;
        width: 1fr;
        content-align: center middle;
        margin-right: 1;
        background: $surface;
    }
    #task-table {
        height: 1fr;
    }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn

    def _get_context(self) -> str:
        from raibis.db import database as db
        tasks = db.get_tasks(self._conn, parent_task_id=None)
        todo = [t for t in tasks if t["status"] in ("todo", "in_progress")]
        lines = [f"- [{t['status']}] {t['title']} (priority: {t['priority']})" for t in todo[:10]]
        return "Open tasks:\n" + "\n".join(lines) if lines else "No open tasks."

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Vertical(id="dash-main"):
                yield Label("Dashboard", classes="section-title")
                with Horizontal(id="stats-row"):
                    yield Static("", id="stat-tasks", classes="stat-box")
                    yield Static("", id="stat-projects", classes="stat-box")
                    yield Static("", id="stat-sprint", classes="stat-box")
                yield Label("Open Tasks", classes="section-title")
                yield DataTable(id="task-table", cursor_type="row")
            yield AISidebar(get_context_fn=self._get_context)

    def on_mount(self) -> None:
        self.refresh_data()

    def refresh_data(self) -> None:
        from raibis.db import database as db
        tasks = db.get_tasks(self._conn, parent_task_id=None)
        open_tasks = [t for t in tasks if t["status"] != "done"]
        projects = db.get_projects(self._conn)

        self.query_one("#stat-tasks", Static).update(
            f"[bold]{len(open_tasks)}[/bold]\nopen tasks"
        )
        self.query_one("#stat-projects", Static).update(
            f"[bold]{len(projects)}[/bold]\nprojects"
        )
        active_sprint_title = "—"
        for p in projects:
            s = db.get_active_sprint(self._conn, p["id"])
            if s:
                active_sprint_title = s["title"]
                break
        self.query_one("#stat-sprint", Static).update(
            f"[bold]Sprint[/bold]\n{active_sprint_title}"
        )

        table = self.query_one("#task-table", DataTable)
        table.clear(columns=True)
        table.add_columns("Priority", "Title", "Project", "Status", "Due", "Tags")
        prio_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        for t in sorted(open_tasks, key=lambda x: prio_order.get(x["priority"], 2)):
            proj = db.get_project(self._conn, t["project_id"]) if t["project_id"] else None
            tags = db.get_tag_string(self._conn, "task", t["id"])
            table.add_row(
                t["priority"] or "—",
                t["title"],
                proj["title"] if proj else "—",
                t["status"],
                t["due_date"] or "—",
                tags or "—",
            )
