"""Anthropic (Claude) provider.

Supports two modes:
  1. Direct Anthropic API  — set ANTHROPIC_API_KEY
  2. Proxy (e.g. Hyperspace AI) — set ANTHROPIC_BASE_URL + ANTHROPIC_PROXY_KEY
     The proxy speaks the standard Anthropic API protocol on a custom base URL.
"""
from __future__ import annotations

from raibis.ai.base import AIProvider


class AnthropicProvider(AIProvider):
    DEFAULT_MODEL = "claude-sonnet-4-6"

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL, base_url: str | None = None):
        try:
            import anthropic
        except ImportError as e:
            raise ImportError("Run: pip install anthropic") from e

        kwargs: dict = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url

        self._client = anthropic.Anthropic(**kwargs)
        self._model = model

    def name(self) -> str:
        return "anthropic"

    def chat(self, messages: list[dict], system: str = "") -> str:
        kwargs = dict(
            model=self._model,
            max_tokens=2048,
            messages=messages,
        )
        if system:
            kwargs["system"] = system

        response = self._client.messages.create(**kwargs)
        return response.content[0].text
