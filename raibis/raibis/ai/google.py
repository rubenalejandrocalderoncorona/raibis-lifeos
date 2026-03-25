"""Google (Gemini) provider stub — ready to implement."""
from __future__ import annotations

from raibis.ai.base import AIProvider


class GoogleProvider(AIProvider):
    DEFAULT_MODEL = "gemini-1.5-pro"

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL):
        try:
            import google.generativeai as genai
        except ImportError as e:
            raise ImportError("Run: pip install google-generativeai") from e

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model)
        self._model_name = model

    def name(self) -> str:
        return "google"

    def chat(self, messages: list[dict], system: str = "") -> str:
        # Gemini uses a different message format
        history = []
        for m in messages[:-1]:
            role = "user" if m["role"] == "user" else "model"
            history.append({"role": role, "parts": [m["content"]]})

        chat = self._model.start_chat(history=history)
        last = messages[-1]["content"]
        if system:
            last = f"{system}\n\n{last}"
        response = chat.send_message(last)
        return response.text
