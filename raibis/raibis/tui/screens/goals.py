"""Goals view — list goals with progress bars and linked projects."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, DataTable, Label
from textual.containers import Horizontal, Vertical, ScrollableContainer

from raibis.tui.widgets.ai_sidebar import AISidebar


class GoalsView(Widget):
    DEFAULT_CSS = """
    GoalsView {
        layout: horizontal;
        height: 1fr;
    }
    #goals-main {
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
    #goals-scroll {
        height: 1fr;
    }
    .goal-card {
        border: round $primary-darken-2;
        background: $surface;
        padding: 1 2;
        margin-bottom: 1;
        height: auto;
    }
    .goal-title {
        text-style: bold;
        height: 1;
    }
    .goal-progress {
        color: $accent;
        height: 1;
        margin-top: 1;
    }
    .goal-meta {
        color: $text-muted;
        height: 1;
    }
    .goal-projects {
        color: $text-muted;
        height: 1;
        margin-left: 2;
    }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn

    def _get_context(self) -> str:
        from raibis.db import database as db
        goals = db.get_goals(self._conn)
        lines = []
        for g in goals:
            done, total, pct = db.goal_progress(self._conn, g["id"])
            lines.append(f"- {g['title']}: {pct}% ({done}/{total} tasks done)")
        return "Goals:\n" + "\n".join(lines) if lines else "No goals yet."

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Vertical(id="goals-main"):
                yield Label("Goals", classes="view-title")
                with ScrollableContainer(id="goals-scroll"):
                    yield Static("[dim]Loading…[/dim]", id="goals-content")
            yield AISidebar(get_context_fn=self._get_context)

    def on_mount(self) -> None:
        self.refresh_data()

    def refresh_data(self) -> None:
        from raibis.db import database as db
        goals = db.get_goals(self._conn)
        container = self.query_one("#goals-scroll")
        container.remove_children()

        if not goals:
            container.mount(Static("[dim]No goals yet. Press [bold]g[/bold] to create one.[/dim]"))
            return

        for g in goals:
            done, total, pct = db.goal_progress(self._conn, g["id"])
            bar = db.progress_bar(pct, width=24)
            tags = db.get_tag_string(self._conn, "goal", g["id"])
            projects = db.fetchall(
                self._conn,
                "SELECT title FROM projects WHERE goal_id = ? AND status = 'active'",
                (g["id"],)
            )
            proj_names = " · ".join(p["title"] for p in projects) or "no projects"
            tag_line = f"  [{tags}]" if tags else ""

            card = Vertical(classes="goal-card")
            container.mount(card)
            card.mount(Static(f"◈ {g['title']}{tag_line}", classes="goal-title"))
            card.mount(Static(f"{bar}", classes="goal-progress"))
            card.mount(Static(
                f"{done}/{total} tasks done  ·  status: {g['status']}",
                classes="goal-meta"
            ))
            card.mount(Static(f"Projects: {proj_names}", classes="goal-projects"))
