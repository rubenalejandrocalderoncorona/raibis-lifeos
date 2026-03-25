"""AI sidebar widget — chat panel toggled with Ctrl+A."""
from __future__ import annotations

from textual.app import ComposeResult
from textual.widgets import Static, Input, RichLog
from textual.containers import Vertical
from textual import work


SYSTEM_PROMPT = """You are Raibis AI, a personal productivity assistant embedded in a LifeOS TUI.
You help the user understand their tasks, priorities, and projects.
Be concise. Use plain text (no markdown headers). Max 150 words per reply unless asked for more."""


class AISidebar(Vertical):
    """Collapsible AI chat panel."""

    DEFAULT_CSS = """
    AISidebar {
        width: 44;
        border-left: solid $primary-darken-2;
        background: $panel;
        display: none;
        padding: 0 1;
        height: 1fr;
        layout: vertical;
    }
    AISidebar.visible {
        display: block;
    }
    AISidebar #ai-log {
        height: 1fr;
    }
    AISidebar #ai-input {
        height: 3;
    }
    AISidebar .ai-header {
        height: 3;
        text-style: bold;
        color: $accent;
        content-align: center middle;
        border-bottom: solid $primary-darken-2;
    }
    """

    def __init__(self, get_context_fn=None, **kwargs):
        super().__init__(**kwargs)
        self._history: list[dict] = []
        self._get_context = get_context_fn

    def compose(self) -> ComposeResult:
        yield Static("✦ Raibis AI  (Ctrl+A to close)", classes="ai-header")
        yield RichLog(id="ai-log", wrap=True, markup=True)
        yield Input(placeholder="Ask anything… (Enter to send)", id="ai-input")

    def on_mount(self) -> None:
        log = self.query_one("#ai-log", RichLog)
        log.write("[dim]Press Ctrl+A to hide. Ask me about your tasks, priorities, or next steps.[/dim]")

    def on_input_submitted(self, event: Input.Submitted) -> None:
        user_msg = event.value.strip()
        if not user_msg:
            return
        self.query_one("#ai-input", Input).clear()
        self._send(user_msg)

    @work(thread=True)
    def _send(self, user_msg: str) -> None:
        log = self.query_one("#ai-log", RichLog)
        log.write(f"[bold cyan]You:[/bold cyan] {user_msg}")
        log.write("[dim]thinking…[/dim]")

        self._history.append({"role": "user", "content": user_msg})

        system = SYSTEM_PROMPT
        if self._get_context:
            ctx = self._get_context()
            if ctx:
                system += f"\n\nCurrent context:\n{ctx}"

        try:
            from raibis.ai.factory import get_provider
            provider = get_provider()
            reply = provider.chat(self._history, system=system)
        except Exception as e:
            reply = f"[red]Error: {e}[/red]"

        self._history.append({"role": "assistant", "content": reply})
        # Remove "thinking…" line is tricky in RichLog — just write the reply
        log.write(f"[bold green]AI:[/bold green] {reply}\n")
