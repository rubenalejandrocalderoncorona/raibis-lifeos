"""Task card widget — used in Kanban and Sprint screens."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Static
from textual.reactive import reactive

PRIORITY_COLORS = {
    "urgent": "red",
    "high": "yellow",
    "medium": "blue",
    "low": "white",
}

STATUS_ICONS = {
    "todo": "○",
    "in_progress": "◑",
    "blocked": "✕",
    "done": "●",
}


class TaskCard(Static):
    """A compact card representing a single task."""

    DEFAULT_CSS = """
    TaskCard {
        border: round $primary-darken-2;
        padding: 0 1;
        margin-bottom: 1;
        height: auto;
        background: $surface;
    }
    TaskCard:hover {
        border: round $accent;
        background: $boost;
    }
    TaskCard.done {
        opacity: 0.5;
    }
    TaskCard .card-title {
        text-style: bold;
    }
    TaskCard .card-meta {
        color: $text-muted;
    }
    """

    def __init__(self, task, **kwargs):
        super().__init__(**kwargs)
        self._task_data = task
        if task["status"] == "done":
            self.add_class("done")

    def render(self) -> str:
        t = self._task_data
        icon = STATUS_ICONS.get(t["status"], "○")
        priority = t["priority"] or "medium"
        color = PRIORITY_COLORS.get(priority, "white")
        due = f"  due:{t['due_date']}" if t["due_date"] else ""
        return (
            f"[bold]{icon} {t['title']}[/bold]\n"
            f"[{color}]▲ {priority}[/{color}][dim]{due}[/dim]"
        )
