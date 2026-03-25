"""
raibis TUI — main Textual application entry point.
Run with:  python -m raibis.tui.app   or   raibis  (if installed)
"""
from __future__ import annotations

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.screen import ModalScreen
from textual.widget import Widget
from textual.widgets import (
    Header, Footer, ContentSwitcher, Input, Button,
    Select, Label, Static, TextArea,
)
from textual.containers import Vertical, Horizontal

from raibis.db.database import init_db
from raibis.config import get_config
from raibis.tui.widgets.ai_sidebar import AISidebar


# ─────────────────────────────────────────
# Left command sidebar
# ─────────────────────────────────────────

NAV_VIEWS = [
    ("dashboard",  "1", "Dashboard"),
    ("kanban",     "2", "Kanban"),
    ("sprint",     "3", "Sprint"),
    ("pomodoro",   "4", "Pomodoro"),
    ("goals",      "5", "Goals"),
    ("projects",   "6", "Projects"),
    ("resources",  "7", "Resources"),
]


class CommandSidebar(Widget):
    DEFAULT_CSS = """
    CommandSidebar {
        width: 22;
        border-right: solid $primary-darken-2;
        background: $panel;
        padding: 1;
        height: 1fr;
        display: block;
    }
    CommandSidebar.hidden {
        display: none;
    }
    CommandSidebar .sidebar-title {
        text-style: bold;
        color: $accent;
        height: 2;
        content-align: center middle;
        border-bottom: solid $primary-darken-2;
        margin-bottom: 1;
    }
    CommandSidebar .nav-section {
        color: $text-muted;
        text-style: bold;
        height: 1;
        margin-top: 1;
    }
    CommandSidebar .cmd {
        height: 1;
        margin-left: 1;
    }
    CommandSidebar .active-tab {
        color: $accent;
        text-style: bold;
    }
    """

    def compose(self) -> ComposeResult:
        yield Static("⬡ raibis", classes="sidebar-title")
        yield Static("NAVIGATE", classes="nav-section")
        for view_id, key, label in NAV_VIEWS:
            yield Static(f"[bold]{key}[/bold]  {label}", classes="cmd", id=f"nav-{view_id}")
        yield Static("CREATE", classes="nav-section")
        yield Static("[bold]n[/bold]  New task",     classes="cmd")
        yield Static("[bold]g[/bold]  New goal",     classes="cmd")
        yield Static("[bold]p[/bold]  New project",  classes="cmd")
        yield Static("[bold]e[/bold]  New resource", classes="cmd")
        yield Static("TOOLS", classes="nav-section")
        yield Static("[bold]r[/bold]  Refresh",      classes="cmd")
        yield Static("[bold]^a[/bold] AI sidebar",   classes="cmd")
        yield Static("[bold]?[/bold]  Hide sidebar", classes="cmd")
        yield Static("[bold]q[/bold]  Quit",         classes="cmd")

    def highlight(self, view_id: str) -> None:
        for vid, _, _ in NAV_VIEWS:
            try:
                self.query_one(f"#nav-{vid}", Static).remove_class("active-tab")
            except Exception:
                pass
        try:
            self.query_one(f"#nav-{view_id}", Static).add_class("active-tab")
        except Exception:
            pass


# ─────────────────────────────────────────
# Shared modal base CSS
# ─────────────────────────────────────────

_MODAL_CSS = """
{cls} {{ align: center middle; }}
{cls} #modal-box {{
    width: 66; height: auto;
    border: double $accent;
    background: $panel; padding: 2 3;
}}
{cls} #modal-title {{ text-style: bold; color: $accent; height: 2; margin-bottom: 1; }}
{cls} .field-label {{ height: 1; color: $text-muted; margin-top: 1; }}
{cls} #btn-row {{ layout: horizontal; height: 3; margin-top: 2; align: right middle; }}
{cls} #btn-save {{ margin-left: 1; }}
"""


# ─────────────────────────────────────────
# New Task modal
# ─────────────────────────────────────────

class NewTaskModal(ModalScreen):
    DEFAULT_CSS = _MODAL_CSS.format(cls="NewTaskModal")

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn

    def compose(self) -> ComposeResult:
        with Vertical(id="modal-box"):
            yield Static("New Task", id="modal-title")
            yield Label("Title *", classes="field-label")
            yield Input(placeholder="Task title…", id="task-title")
            yield Label("Priority", classes="field-label")
            yield Select(
                [("medium", "medium"), ("low", "low"), ("high", "high"), ("urgent", "urgent")],
                id="task-priority", value="medium", allow_blank=False,
            )
            yield Label("Project", classes="field-label")
            yield Select([("None", None)], id="task-project", value=None, allow_blank=False)
            yield Label("Due date (YYYY-MM-DD, optional)", classes="field-label")
            yield Input(placeholder="2026-04-15", id="task-due")
            yield Label("Tags (comma-separated)", classes="field-label")
            yield Input(placeholder="work, AI, personal", id="task-tags")
            with Horizontal(id="btn-row"):
                yield Button("Cancel", id="btn-cancel")
                yield Button("Save", id="btn-save", variant="primary")

    def on_mount(self) -> None:
        from raibis.db import database as db
        projects = db.get_projects(self._conn)
        options = [("None", None)] + [(p["title"], p["id"]) for p in projects]
        self.query_one("#task-project", Select).set_options(options)
        self.query_one("#task-title").focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-cancel":
            self.dismiss(None); return
        title = self.query_one("#task-title", Input).value.strip()
        if not title:
            self.query_one("#task-title").border_title = "Required!"; return
        self.dismiss({
            "title": title,
            "priority": self.query_one("#task-priority", Select).value or "medium",
            "project_id": self.query_one("#task-project", Select).value,
            "due_date": self.query_one("#task-due", Input).value.strip() or None,
            "tags": [t.strip() for t in self.query_one("#task-tags", Input).value.split(",") if t.strip()],
        })

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "task-title":
            self.query_one("#task-priority").focus()


# ─────────────────────────────────────────
# New Goal modal
# ─────────────────────────────────────────

class NewGoalModal(ModalScreen):
    DEFAULT_CSS = _MODAL_CSS.format(cls="NewGoalModal")

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn

    def compose(self) -> ComposeResult:
        with Vertical(id="modal-box"):
            yield Static("New Goal", id="modal-title")
            yield Label("Title *", classes="field-label")
            yield Input(placeholder="Goal title…", id="goal-title")
            yield Label("Description", classes="field-label")
            yield Input(placeholder="What does achieving this look like?", id="goal-desc")
            yield Label("Tags (comma-separated)", classes="field-label")
            yield Input(placeholder="life, work, health", id="goal-tags")
            with Horizontal(id="btn-row"):
                yield Button("Cancel", id="btn-cancel")
                yield Button("Save", id="btn-save", variant="primary")

    def on_mount(self) -> None:
        self.query_one("#goal-title").focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-cancel":
            self.dismiss(None); return
        title = self.query_one("#goal-title", Input).value.strip()
        if not title:
            return
        self.dismiss({
            "title": title,
            "description": self.query_one("#goal-desc", Input).value.strip(),
            "tags": [t.strip() for t in self.query_one("#goal-tags", Input).value.split(",") if t.strip()],
        })


# ─────────────────────────────────────────
# New Project modal
# ─────────────────────────────────────────

class NewProjectModal(ModalScreen):
    DEFAULT_CSS = _MODAL_CSS.format(cls="NewProjectModal")

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn

    def compose(self) -> ComposeResult:
        with Vertical(id="modal-box"):
            yield Static("New Project", id="modal-title")
            yield Label("Title *", classes="field-label")
            yield Input(placeholder="Project title…", id="proj-title")
            yield Label("Goal (optional)", classes="field-label")
            yield Select([("None", None)], id="proj-goal", value=None, allow_blank=False)
            yield Label("Tags (comma-separated)", classes="field-label")
            yield Input(placeholder="work, AI", id="proj-tags")
            with Horizontal(id="btn-row"):
                yield Button("Cancel", id="btn-cancel")
                yield Button("Save", id="btn-save", variant="primary")

    def on_mount(self) -> None:
        from raibis.db import database as db
        goals = db.get_goals(self._conn)
        options = [("None", None)] + [(g["title"], g["id"]) for g in goals]
        self.query_one("#proj-goal", Select).set_options(options)
        self.query_one("#proj-title").focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-cancel":
            self.dismiss(None); return
        title = self.query_one("#proj-title", Input).value.strip()
        if not title:
            return
        self.dismiss({
            "title": title,
            "goal_id": self.query_one("#proj-goal", Select).value,
            "tags": [t.strip() for t in self.query_one("#proj-tags", Input).value.split(",") if t.strip()],
        })


# ─────────────────────────────────────────
# New Resource modal
# ─────────────────────────────────────────

RESOURCE_TYPES = ["note", "idea", "link", "file", "doc", "reference", "video"]


class NewResourceModal(ModalScreen):
    DEFAULT_CSS = _MODAL_CSS.format(cls="NewResourceModal") + """
    NewResourceModal #modal-box { width: 70; }
    NewResourceModal #res-body { height: 6; }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn

    def compose(self) -> ComposeResult:
        type_opts = [(t, t) for t in RESOURCE_TYPES]
        with Vertical(id="modal-box"):
            yield Static("New Resource", id="modal-title")
            yield Label("Title *", classes="field-label")
            yield Input(placeholder="Resource title…", id="res-title")
            yield Label("Type", classes="field-label")
            yield Select(type_opts, id="res-type", value="note", allow_blank=False)
            yield Label("Content / URL / file path", classes="field-label")
            yield Input(placeholder="https://… or /path/to/file or leave blank", id="res-url")
            yield Label("Notes (optional)", classes="field-label")
            yield TextArea(id="res-body")
            yield Label("Link to (optional)", classes="field-label")
            yield Select([("None", None)], id="res-link", value=None, allow_blank=False)
            yield Label("Tags (comma-separated)", classes="field-label")
            yield Input(placeholder="AI, research", id="res-tags")
            with Horizontal(id="btn-row"):
                yield Button("Cancel", id="btn-cancel")
                yield Button("Save", id="btn-save", variant="primary")

    def on_mount(self) -> None:
        from raibis.db import database as db
        options = [("None", None)]
        for g in db.get_goals(self._conn):
            options.append((f"Goal: {g['title']}", f"goal:{g['id']}"))
        for p in db.get_projects(self._conn):
            options.append((f"Project: {p['title']}", f"project:{p['id']}"))
        for t in db.get_tasks(self._conn, parent_task_id=None)[:20]:
            options.append((f"Task: {t['title']}", f"task:{t['id']}"))
        self.query_one("#res-link", Select).set_options(options)
        self.query_one("#res-title").focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-cancel":
            self.dismiss(None); return
        title = self.query_one("#res-title", Input).value.strip()
        if not title:
            return
        link = self.query_one("#res-link", Select).value
        goal_id = project_id = task_id = None
        if link:
            kind, _, rid = link.partition(":")
            if kind == "goal":      goal_id     = int(rid)
            elif kind == "project": project_id  = int(rid)
            elif kind == "task":    task_id     = int(rid)
        url_val = self.query_one("#res-url", Input).value.strip() or None
        self.dismiss({
            "title": title,
            "resource_type": self.query_one("#res-type", Select).value or "note",
            "url": url_val if url_val and url_val.startswith("http") else None,
            "file_path": url_val if url_val and not url_val.startswith("http") else None,
            "body": self.query_one("#res-body", TextArea).text or None,
            "goal_id": goal_id, "project_id": project_id, "task_id": task_id,
            "tags": [t.strip() for t in self.query_one("#res-tags", Input).value.split(",") if t.strip()],
        })


# ─────────────────────────────────────────
# Main App
# ─────────────────────────────────────────

class RaibisApp(App):
    TITLE = "raibis"
    SUB_TITLE = "your personal LifeOS"

    CSS = """
    Screen { layout: vertical; }
    #app-body { layout: horizontal; height: 1fr; }
    ContentSwitcher { height: 1fr; width: 1fr; }
    ContentSwitcher > * { height: 1fr; width: 1fr; }
    """

    BINDINGS = [
        Binding("1", "show_view('dashboard')",  "Dashboard",  show=True),
        Binding("2", "show_view('kanban')",      "Kanban",     show=True),
        Binding("3", "show_view('sprint')",      "Sprint",     show=True),
        Binding("4", "show_view('pomodoro')",    "Pomodoro",   show=True),
        Binding("5", "show_view('goals')",       "Goals",      show=True),
        Binding("6", "show_view('projects')",    "Projects",   show=True),
        Binding("7", "show_view('resources')",   "Resources",  show=True),
        Binding("n", "new_task",     "New Task",     show=False),
        Binding("g", "new_goal",     "New Goal",     show=False),
        Binding("p", "new_project",  "New Project",  show=False),
        Binding("e", "new_resource", "New Resource", show=False),
        Binding("r", "refresh",      "Refresh",      show=False),
        Binding("ctrl+a", "toggle_ai",      "AI",     show=True),
        Binding("question_mark", "toggle_sidebar", "Sidebar", show=False),
        Binding("q", "quit", "Quit", show=True),
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        cfg = get_config()
        self._conn = init_db(cfg.db_path)

    def compose(self) -> ComposeResult:
        from raibis.tui.screens.dashboard import DashboardView
        from raibis.tui.screens.kanban    import KanbanView
        from raibis.tui.screens.sprint    import SprintView
        from raibis.tui.screens.pomodoro  import PomodoroView
        from raibis.tui.screens.goals     import GoalsView
        from raibis.tui.screens.projects  import ProjectsView
        from raibis.tui.screens.resources import ResourcesView

        yield Header()
        with Horizontal(id="app-body"):
            yield CommandSidebar(id="cmd-sidebar")
            with ContentSwitcher(initial="dashboard"):
                yield DashboardView(self._conn,  id="dashboard")
                yield KanbanView(self._conn,     id="kanban")
                yield SprintView(self._conn,     id="sprint")
                yield PomodoroView(self._conn,   id="pomodoro")
                yield GoalsView(self._conn,      id="goals")
                yield ProjectsView(self._conn,   id="projects")
                yield ResourcesView(self._conn,  id="resources")
        yield Footer()

    def on_mount(self) -> None:
        self.query_one(CommandSidebar).highlight("dashboard")

    # ── Navigation ───────────────────────

    def action_show_view(self, view_id: str) -> None:
        self.query_one(ContentSwitcher).current = view_id
        self.query_one(CommandSidebar).highlight(view_id)

    def action_toggle_sidebar(self) -> None:
        self.query_one(CommandSidebar).toggle_class("hidden")

    def action_toggle_ai(self) -> None:
        current_id = self.query_one(ContentSwitcher).current
        try:
            active_view = self.query_one(f"#{current_id}")
            sidebar = active_view.query_one(AISidebar)
            sidebar.toggle_class("visible")
            if "visible" in sidebar.classes:
                sidebar.query_one("#ai-input").focus()
        except Exception:
            pass

    def action_refresh(self) -> None:
        current = self.query_one(ContentSwitcher).current
        try:
            view = self.query_one(f"#{current}")
            if hasattr(view, "refresh_data"):
                view.refresh_data()
            elif hasattr(view, "_refresh_board"):
                view._refresh_board()
        except Exception:
            pass

    # ── Modals ───────────────────────────

    def action_new_task(self) -> None:
        def cb(result):
            if not result:
                return
            from raibis.db import database as db
            task_id = db.create_task(
                self._conn, title=result["title"],
                project_id=result["project_id"],
                priority=result["priority"],
                due_date=result["due_date"],
            )
            if result.get("tags"):
                db.add_tags(self._conn, "task", task_id, result["tags"])
            self._conn.commit()
            self.notify(f"Task created: {result['title']}")
            self.action_refresh()
        self.push_screen(NewTaskModal(self._conn), cb)

    def action_new_goal(self) -> None:
        def cb(result):
            if not result:
                return
            from raibis.db import database as db
            goal_id = db.create_goal(self._conn, result["title"], result["description"])
            if result.get("tags"):
                db.add_tags(self._conn, "goal", goal_id, result["tags"])
            self._conn.commit()
            self.notify(f"Goal created: {result['title']}")
            self.action_refresh()
        self.push_screen(NewGoalModal(self._conn), cb)

    def action_new_project(self) -> None:
        def cb(result):
            if not result:
                return
            from raibis.db import database as db
            proj_id = db.create_project(self._conn, result["title"], goal_id=result["goal_id"])
            if result.get("tags"):
                db.add_tags(self._conn, "project", proj_id, result["tags"])
            self._conn.commit()
            self.notify(f"Project created: {result['title']}")
            self.action_refresh()
        self.push_screen(NewProjectModal(self._conn), cb)

    def action_new_resource(self) -> None:
        def cb(result):
            if not result:
                return
            from raibis.db import database as db
            res_id = db.create_resource(
                self._conn,
                title=result["title"],
                url=result.get("url"),
                file_path=result.get("file_path"),
                resource_type=result["resource_type"],
                body=result.get("body"),
                goal_id=result.get("goal_id"),
                project_id=result.get("project_id"),
                task_id=result.get("task_id"),
            )
            if result.get("tags"):
                db.add_tags(self._conn, "resource", res_id, result["tags"])
            self._conn.commit()
            self.notify(f"Resource created: {result['title']}")
            self.action_refresh()
        self.push_screen(NewResourceModal(self._conn), cb)


def main():
    app = RaibisApp()
    app.run()


if __name__ == "__main__":
    main()
