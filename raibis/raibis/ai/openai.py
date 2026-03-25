"""OpenAI (GPT) provider stub — ready to implement."""
from __future__ import annotations

from raibis.ai.base import AIProvider


class OpenAIProvider(AIProvider):
    DEFAULT_MODEL = "gpt-4o"

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL):
        try:
            from openai import OpenAI
        except ImportError as e:
            raise ImportError("Run: pip install openai") from e

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def name(self) -> str:
        return "openai"

    def chat(self, messages: list[dict], system: str = "") -> str:
        all_messages = []
        if system:
            all_messages.append({"role": "system", "content": system})
        all_messages.extend(messages)

        response = self._client.chat.completions.create(
            model=self._model,
            messages=all_messages,
        )
        return response.choices[0].message.content
