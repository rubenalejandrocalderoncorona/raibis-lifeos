from __future__ import annotations
from dataclasses import dataclass


@dataclass
class Goal:
    id: int
    title: str
    description: str = ""
    status: str = "active"
    created_at: str = ""

    @classmethod
    def from_row(cls, row) -> "Goal":
        return cls(**{k: row[k] for k in ("id", "title", "description", "status", "created_at")})


@dataclass
class Project:
    id: int
    title: str
    goal_id: int | None = None
    description: str = ""
    status: str = "active"
    created_at: str = ""
    goal_title: str = ""

    @classmethod
    def from_row(cls, row) -> "Project":
        keys = ("id", "title", "goal_id", "description", "status", "created_at")
        obj = cls(**{k: row[k] for k in keys})
        try:
            obj.goal_title = row["goal_title"] or ""
        except IndexError:
            pass
        return obj


@dataclass
class Sprint:
    id: int
    project_id: int
    title: str
    goal: str = ""
    start_date: str | None = None
    end_date: str | None = None
    status: str = "planned"
    created_at: str = ""

    @classmethod
    def from_row(cls, row) -> "Sprint":
        keys = ("id", "project_id", "title", "goal", "start_date", "end_date", "status", "created_at")
        return cls(**{k: row[k] for k in keys})


@dataclass
class Task:
    id: int
    title: str
    project_id: int | None = None
    sprint_id: int | None = None
    parent_task_id: int | None = None
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    due_date: str | None = None
    estimated_mins: int | None = None
    logged_mins: int = 0
    created_at: str = ""
    updated_at: str = ""

    PRIORITY_ORDER: dict = None
    STATUS_ORDER: dict = None

    def __post_init__(self):
        if self.PRIORITY_ORDER is None:
            object.__setattr__(self, "PRIORITY_ORDER", {"urgent": 0, "high": 1, "medium": 2, "low": 3})
        if self.STATUS_ORDER is None:
            object.__setattr__(self, "STATUS_ORDER", {"in_progress": 0, "todo": 1, "blocked": 2, "done": 3})

    @classmethod
    def from_row(cls, row) -> "Task":
        keys = ("id", "title", "project_id", "sprint_id", "parent_task_id",
                "description", "status", "priority", "due_date",
                "estimated_mins", "logged_mins", "created_at", "updated_at")
        return cls(**{k: row[k] for k in keys})


@dataclass
class Note:
    id: int
    title: str = ""
    body: str = ""
    task_id: int | None = None
    project_id: int | None = None
    created_at: str = ""
    updated_at: str = ""

    @classmethod
    def from_row(cls, row) -> "Note":
        keys = ("id", "title", "body", "task_id", "project_id", "created_at", "updated_at")
        return cls(**{k: row[k] for k in keys})


@dataclass
class Resource:
    id: int
    title: str
    url: str | None = None
    file_path: str | None = None
    resource_type: str = "link"
    task_id: int | None = None
    project_id: int | None = None
    created_at: str = ""

    @classmethod
    def from_row(cls, row) -> "Resource":
        keys = ("id", "title", "url", "file_path", "resource_type", "task_id", "project_id", "created_at")
        return cls(**{k: row[k] for k in keys})
