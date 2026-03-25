"""
Factory — returns the configured AI provider.

Usage:
    from raibis.ai.factory import get_provider
    ai = get_provider()       # reads from config / .env
    ai = get_provider("openai")  # explicit override
"""
from __future__ import annotations

from raibis.ai.base import AIProvider


def get_provider(name: str | None = None) -> AIProvider:
    """
    Return an AIProvider instance for the given name.
    If name is None, read from config (which reads AI_PROVIDER env var).
    """
    from raibis.config import get_config
    cfg = get_config()

    provider_name = name or cfg.ai_provider

    if provider_name == "anthropic":
        key = cfg.effective_anthropic_key
        if not key:
            raise ValueError(
                "No Anthropic key found. Set ANTHROPIC_API_KEY (personal) "
                "or both ANTHROPIC_PROXY_KEY + ANTHROPIC_PROXY_URL (work proxy) in .env"
            )
        from raibis.ai.anthropic import AnthropicProvider
        return AnthropicProvider(
            api_key=key,
            base_url=cfg.effective_anthropic_base_url,
        )

    if provider_name == "openai":
        if not cfg.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set in .env")
        from raibis.ai.openai import OpenAIProvider
        return OpenAIProvider(api_key=cfg.openai_api_key)

    if provider_name == "google":
        if not cfg.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not set in .env")
        from raibis.ai.google import GoogleProvider
        return GoogleProvider(api_key=cfg.google_api_key)

    if provider_name == "ollama":
        from raibis.ai.ollama import OllamaProvider
        return OllamaProvider(
            base_url=cfg.ollama_base_url,
            model=cfg.ollama_model,
        )

    raise ValueError(
        f"Unknown AI provider: '{provider_name}'. "
        "Valid options: anthropic | openai | google | ollama"
    )
