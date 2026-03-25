"""Ollama provider — local models, no API key needed."""
from __future__ import annotations

from raibis.ai.base import AIProvider


class OllamaProvider(AIProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        try:
            import httpx
        except ImportError as e:
            raise ImportError("Run: pip install httpx") from e

        import httpx
        self._client = httpx.Client(base_url=base_url, timeout=120)
        self._model = model

    def name(self) -> str:
        return "ollama"

    def chat(self, messages: list[dict], system: str = "") -> str:
        payload: dict = {"model": self._model, "messages": messages, "stream": False}
        if system:
            payload["system"] = system

        response = self._client.post("/api/chat", json=payload)
        response.raise_for_status()
        return response.json()["message"]["content"]
