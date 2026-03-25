"""Kanban board view widget."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, Label, Select
from textual.containers import Horizontal, Vertical, ScrollableContainer

from raibis.tui.widgets.task_card import TaskCard
from raibis.tui.widgets.ai_sidebar import AISidebar


COLUMNS = [
    ("todo",        "Todo"),
    ("in_progress", "In Progress"),
    ("blocked",     "Blocked"),
    ("done",        "Done"),
]


class KanbanColumn(Vertical):
    DEFAULT_CSS = """
    KanbanColumn {
        width: 1fr;
        border: round $primary-darken-2;
        margin: 0 1;
        padding: 0 1;
        background: $panel;
        height: 1fr;
    }
    KanbanColumn .col-title {
        text-style: bold;
        color: $accent;
        height: 2;
        content-align: center middle;
        border-bottom: solid $primary-darken-2;
        margin-bottom: 1;
    }
    KanbanColumn ScrollableContainer {
        height: 1fr;
    }
    """

    def __init__(self, status: str, label: str, tasks: list, **kwargs):
        super().__init__(**kwargs)
        self._status = status
        self._label = label
        self._tasks = tasks

    def compose(self) -> ComposeResult:
        yield Static(f"{self._label} ({len(self._tasks)})", classes="col-title")
        with ScrollableContainer():
            for task in self._tasks:
                yield TaskCard(task)
            if not self._tasks:
                yield Static("[dim]empty[/dim]")

    def update_tasks(self, tasks: list, label: str) -> None:
        self._tasks = tasks
        self._label = label
        self.remove_children()
        self.mount(Static(f"{label} ({len(tasks)})", classes="col-title"))
        sc = ScrollableContainer()
        self.mount(sc)
        if tasks:
            for task in tasks:
                sc.mount(TaskCard(task))
        else:
            sc.mount(Static("[dim]empty[/dim]"))


class KanbanView(Widget):
    DEFAULT_CSS = """
    KanbanView {
        layout: horizontal;
        height: 1fr;
    }
    #board-area {
        width: 1fr;
        layout: vertical;
        padding: 1;
        height: 1fr;
    }
    #board-header {
        height: 3;
        layout: horizontal;
        margin-bottom: 1;
    }
    #board-columns {
        height: 1fr;
        layout: horizontal;
    }
    #project-select {
        width: 30;
        margin-right: 2;
    }
    .board-title {
        text-style: bold;
        color: $accent;
        height: 3;
        content-align: left middle;
        width: 1fr;
    }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn
        self._project_id: int | None = None

    def _get_context(self) -> str:
        from raibis.db import database as db
        board = db.get_kanban(self._conn, self._project_id)
        lines = []
        for status, tasks in board.items():
            for t in tasks:
                lines.append(f"- [{status}] {t['title']}")
        return "Kanban board:\n" + "\n".join(lines) if lines else "No tasks on board."

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Vertical(id="board-area"):
                with Horizontal(id="board-header"):
                    yield Static("Kanban Board", classes="board-title")
                    yield Select(
                        [("All projects", None)],
                        id="project-select",
                        value=None,
                        prompt="Filter by project",
                        allow_blank=False,
                    )
                with Horizontal(id="board-columns"):
                    for status, label in COLUMNS:
                        yield KanbanColumn(status, label, [], id=f"col-{status}")
            yield AISidebar(get_context_fn=self._get_context)

    def on_mount(self) -> None:
        self._load_projects()
        self._refresh_board()

    def _load_projects(self) -> None:
        from raibis.db import database as db
        projects = db.get_projects(self._conn)
        options = [("All projects", None)] + [(p["title"], p["id"]) for p in projects]
        self.query_one("#project-select", Select).set_options(options)

    def _refresh_board(self) -> None:
        from raibis.db import database as db
        board = db.get_kanban(self._conn, self._project_id)
        for status, label in COLUMNS:
            col = self.query_one(f"#col-{status}", KanbanColumn)
            col.update_tasks(board.get(status, []), label)

    def on_select_changed(self, event: Select.Changed) -> None:
        self._project_id = event.value
        self._refresh_board()
