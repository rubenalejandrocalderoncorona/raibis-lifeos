"""Pomodoro timer view widget."""
from __future__ import annotations

import time
from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, Button, Select, Label
from textual.containers import Horizontal, Vertical, Center
from textual.timer import Timer


WORK_MINS = 25
BREAK_MINS = 5


class PomodoroView(Widget):
    DEFAULT_CSS = """
    PomodoroView {
        layout: vertical;
        align: center middle;
        height: 1fr;
    }
    #pomo-container {
        width: 52;
        height: auto;
        border: double $accent;
        padding: 2 4;
        background: $panel;
    }
    #pomo-title {
        text-style: bold;
        color: $accent;
        content-align: center middle;
        height: 3;
    }
    #pomo-timer {
        content-align: center middle;
        height: 5;
        text-style: bold;
    }
    #pomo-status {
        content-align: center middle;
        color: $text-muted;
        height: 2;
    }
    #task-select { margin: 1 0; }
    #btn-row {
        layout: horizontal;
        height: 3;
        align: center middle;
        margin-top: 1;
    }
    #btn-start { margin-right: 1; min-width: 14; }
    #btn-reset { min-width: 10; }
    #session-count {
        content-align: center middle;
        color: $text-muted;
        height: 2;
        margin-top: 1;
    }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn
        self._task_id: int | None = None
        self._running = False
        self._is_break = False
        self._remaining = WORK_MINS * 60
        self._sessions = 0
        self._timer: Timer | None = None

    def compose(self) -> ComposeResult:
        with Center():
            with Vertical(id="pomo-container"):
                yield Static("🍅 Pomodoro", id="pomo-title")
                yield Select(
                    [("No task selected", None)],
                    id="task-select", value=None, allow_blank=False,
                )
                yield Static(self._format_time(), id="pomo-timer")
                yield Static("Ready to focus", id="pomo-status")
                with Horizontal(id="btn-row"):
                    yield Button("▶  Start", id="btn-start", variant="success")
                    yield Button("↺ Reset", id="btn-reset")
                yield Static("Sessions completed: 0", id="session-count")

    def on_mount(self) -> None:
        self._load_tasks()
        self._update_display()

    def _load_tasks(self) -> None:
        from raibis.db import database as db
        tasks = db.get_tasks(self._conn, status=None, parent_task_id=None)
        open_tasks = [t for t in tasks if t["status"] in ("todo", "in_progress")]
        options = [("No task selected", None)] + [(t["title"], t["id"]) for t in open_tasks]
        self.query_one("#task-select", Select).set_options(options)

    def _format_time(self) -> str:
        m, s = divmod(self._remaining, 60)
        return f"[bold]{m:02d}:{s:02d}[/bold]"

    def _update_display(self) -> None:
        self.query_one("#pomo-timer", Static).update(self._format_time())
        if self._is_break:
            status = "☕ Break time!"
        elif self._running:
            status = "▶ Focusing…"
        else:
            status = "Ready to focus"
        self.query_one("#pomo-status", Static).update(status)
        self.query_one("#session-count", Static).update(f"Sessions completed: {self._sessions}")
        btn = self.query_one("#btn-start", Button)
        btn.label = "⏸ Pause" if self._running else "▶  Start"
        btn.variant = "warning" if self._running else "success"

    def on_select_changed(self, event: Select.Changed) -> None:
        self._task_id = event.value

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-start":
            self._toggle()
        elif event.button.id == "btn-reset":
            self._reset()

    def _toggle(self) -> None:
        self._running = not self._running
        if self._running:
            self._timer = self.set_interval(1, self._tick)
        else:
            if self._timer:
                self._timer.stop()
        self._update_display()

    def _reset(self) -> None:
        self._running = False
        self._is_break = False
        if self._timer:
            self._timer.stop()
        self._remaining = WORK_MINS * 60
        self._update_display()

    def _tick(self) -> None:
        if self._remaining <= 0:
            self._session_complete()
            return
        self._remaining -= 1
        self._update_display()

    def _session_complete(self) -> None:
        if self._timer:
            self._timer.stop()
        self._running = False

        if not self._is_break:
            if self._task_id:
                from raibis.db import database as db
                db.log_pomodoro(self._conn, self._task_id, WORK_MINS, completed=True)
                self._conn.commit()
            self._sessions += 1
            self._is_break = True
            self._remaining = BREAK_MINS * 60
            self.query_one("#pomo-status", Static).update(
                f"[green]✓ Done! Take a {BREAK_MINS}-min break.[/green]"
            )
        else:
            self._is_break = False
            self._remaining = WORK_MINS * 60
            self.query_one("#pomo-status", Static).update(
                "[blue]Break over — ready for next session![/blue]"
            )
        self._update_display()
