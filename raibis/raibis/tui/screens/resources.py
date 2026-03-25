"""Resources view — notes, ideas, links, files linked to goals/projects/tasks."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Static, Label, Select, DataTable
from textual.containers import Horizontal, Vertical

from raibis.tui.widgets.ai_sidebar import AISidebar

RESOURCE_TYPES = ["note", "idea", "link", "file", "doc", "reference", "video"]


class ResourcesView(Widget):
    DEFAULT_CSS = """
    ResourcesView {
        layout: horizontal;
        height: 1fr;
    }
    #res-main {
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
    #type-filter { width: 20; margin-right: 1; }
    #link-filter { width: 30; }
    #res-table { height: 1fr; }
    """

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._conn = db_conn
        self._type_filter: str | None = None
        self._link_filter: str | None = None  # "goal:ID" | "project:ID" | "task:ID"

    def _get_context(self) -> str:
        from raibis.db import database as db
        resources = db.get_resources(self._conn)
        lines = [f"- [{r['resource_type']}] {r['title']}" for r in resources[:15]]
        return "Resources:\n" + "\n".join(lines) if lines else "No resources yet."

    def compose(self) -> ComposeResult:
        type_opts = [("All types", None)] + [(t, t) for t in RESOURCE_TYPES]
        with Horizontal():
            with Vertical(id="res-main"):
                with Horizontal(id="filter-row"):
                    yield Label("Resources", classes="view-title")
                    yield Select(type_opts, id="type-filter", value=None, allow_blank=False)
                    yield Select(
                        [("All items", None)],
                        id="link-filter", value=None, allow_blank=False,
                    )
                yield DataTable(id="res-table", cursor_type="row")
            yield AISidebar(get_context_fn=self._get_context)

    def on_mount(self) -> None:
        self._load_link_filter()
        table = self.query_one("#res-table", DataTable)
        table.add_columns("Type", "Title", "Linked to", "Tags", "Created")
        self.refresh_data()

    def _load_link_filter(self) -> None:
        from raibis.db import database as db
        options = [("All items", None)]
        for g in db.get_goals(self._conn):
            options.append((f"Goal: {g['title']}", f"goal:{g['id']}"))
        for p in db.get_projects(self._conn):
            options.append((f"Project: {p['title']}", f"project:{p['id']}"))
        tasks = db.get_tasks(self._conn, parent_task_id=None)
        for t in tasks[:20]:  # cap to avoid huge list
            options.append((f"Task: {t['title']}", f"task:{t['id']}"))
        self.query_one("#link-filter", Select).set_options(options)

    def on_select_changed(self, event: Select.Changed) -> None:
        if event.select.id == "type-filter":
            self._type_filter = event.value
        elif event.select.id == "link-filter":
            self._link_filter = event.value
        self.refresh_data()

    def refresh_data(self) -> None:
        from raibis.db import database as db

        # resolve link filter
        goal_id = project_id = task_id = None
        if self._link_filter:
            kind, _, rid = self._link_filter.partition(":")
            rid = int(rid)
            if kind == "goal":
                goal_id = rid
            elif kind == "project":
                project_id = rid
            elif kind == "task":
                task_id = rid

        resources = db.get_resources(self._conn, goal_id=goal_id,
                                     project_id=project_id, task_id=task_id)

        if self._type_filter:
            resources = [r for r in resources if r["resource_type"] == self._type_filter]

        table = self.query_one("#res-table", DataTable)
        table.clear()

        for r in resources:
            # build linked-to label
            linked = "—"
            if r["task_id"]:
                t = db.get_task(self._conn, r["task_id"])
                linked = f"task: {t['title']}" if t else "task"
            elif r["project_id"]:
                p = db.get_project(self._conn, r["project_id"])
                linked = f"project: {p['title']}" if p else "project"
            elif r["goal_id"]:
                g = db.get_goal(self._conn, r["goal_id"])
                linked = f"goal: {g['title']}" if g else "goal"

            tags = db.get_tag_string(self._conn, "resource", r["id"])
            created = r["created_at"][:10] if r["created_at"] else "—"
            table.add_row(
                r["resource_type"],
                r["title"],
                linked,
                tags or "—",
                created,
            )
