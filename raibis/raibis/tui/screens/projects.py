"""Projects view — list projects with progress, linked goal, task counts."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, Label, Select
from textual.containers import Horizontal, Vertical, ScrollableContainer

from raibis.tui.widgets.ai_sidebar import AISidebar


class ProjectsView(Widget):
    DEFAULT_CSS = """
    ProjectsView {
        layout: horizontal;
        height: 1fr;
    }
    #projects-main {
        width: 1fr;
        padding: 1 2;
        height: 1fr;
        layout: vertical;
    }
    .view-title {
        text-style: bold;
        color: $accent;
        height: 2;
    }
    #filter-row {
        height: 3;
        layout: horizontal;
        margin-bottom: 1;
    }
    #goal-filter {
        width: 36;
    }
    #projects-scroll {
        height: 1fr;
    }
    .project-card {
        border: round $primary-darken-2;
        background: $surface;
        padding: 1 2;
        margin-bottom: 1;
        height: auto;
    }
    .project-title { text-style: bold; height: 1; }
    .project-progress { color: $accent; height: 1; margin-top: 1; }
    .project-meta { color: $text-muted; height: 1; }
    .project-tasks { color: $text-muted; height: 1; margin-left: 2; }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn
        self._goal_filter: int | None = None

    def _get_context(self) -> str:
        from raibis.db import database as db
        projects = db.get_projects(self._conn)
        lines = []
        for p in projects:
            done, total, pct = db.project_progress(self._conn, p["id"])
            lines.append(f"- {p['title']}: {pct}% ({done}/{total} tasks)")
        return "Projects:\n" + "\n".join(lines) if lines else "No projects yet."

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Vertical(id="projects-main"):
                with Horizontal(id="filter-row"):
                    yield Label("Projects", classes="view-title")
                    yield Select(
                        [("All goals", None)],
                        id="goal-filter", value=None, allow_blank=False,
                    )
                with ScrollableContainer(id="projects-scroll"):
                    yield Static("[dim]Loading…[/dim]")
            yield AISidebar(get_context_fn=self._get_context)

    def on_mount(self) -> None:
        self._load_goals()
        self.refresh_data()

    def _load_goals(self) -> None:
        from raibis.db import database as db
        goals = db.get_goals(self._conn)
        options = [("All goals", None)] + [(g["title"], g["id"]) for g in goals]
        self.query_one("#goal-filter", Select).set_options(options)

    def on_select_changed(self, event: Select.Changed) -> None:
        self._goal_filter = event.value
        self.refresh_data()

    def refresh_data(self) -> None:
        from raibis.db import database as db
        if self._goal_filter:
            projects = db.fetchall(
                self._conn,
                "SELECT p.*, g.title as goal_title FROM projects p "
                "LEFT JOIN goals g ON p.goal_id = g.id "
                "WHERE p.goal_id = ? AND p.status = 'active'",
                (self._goal_filter,)
            )
        else:
            projects = db.get_projects(self._conn)

        container = self.query_one("#projects-scroll")
        container.remove_children()

        if not projects:
            container.mount(Static("[dim]No projects. Press [bold]p[/bold] to create one.[/dim]"))
            return

        for p in projects:
            done, total, pct = db.project_progress(self._conn, p["id"])
            bar = db.progress_bar(pct, width=24)
            tags = db.get_tag_string(self._conn, "project", p["id"])
            tag_line = f"  [{tags}]" if tags else ""
            goal_title = p["goal_title"] if "goal_title" in p.keys() else "—"
            in_progress = db.fetchall(
                self._conn,
                "SELECT title FROM tasks WHERE project_id=? AND status='in_progress' LIMIT 3",
                (p["id"],)
            )
            active_tasks = " · ".join(t["title"] for t in in_progress) or "—"

            card = Vertical(classes="project-card")
            container.mount(card)
            card.mount(Static(f"◆ {p['title']}{tag_line}", classes="project-title"))
            card.mount(Static(bar, classes="project-progress"))
            card.mount(Static(
                f"{done}/{total} tasks  ·  Goal: {goal_title or '—'}  ·  {p['status']}",
                classes="project-meta"
            ))
            card.mount(Static(f"In progress: {active_tasks}", classes="project-tasks"))
