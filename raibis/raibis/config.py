"""
raibis.config
─────────────
Loads configuration from .env and environment variables.
Single source of truth for all settings.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

_loaded = False


def _load_env() -> None:
    global _loaded
    if _loaded:
        return
    # Walk up from CWD looking for .env
    for parent in [Path.cwd(), *Path.cwd().parents]:
        env_file = parent / ".env"
        if env_file.exists():
            try:
                from dotenv import load_dotenv
                load_dotenv(env_file, override=False)
            except ImportError:
                # manual parse fallback if python-dotenv not installed yet
                for line in env_file.read_text().splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        os.environ.setdefault(k.strip(), v.strip())
            break
    _loaded = True


@dataclass
class Config:
    ai_provider: str = "anthropic"
    # Set by claude-profile work  (ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL)
    anthropic_auth_token: str = ""
    anthropic_base_url: str = ""
    # Set in .env manually (fallback)
    anthropic_api_key: str = ""
    anthropic_proxy_key: str = ""
    anthropic_proxy_url: str = ""
    # OpenAI
    openai_api_key: str = ""
    # Google
    google_api_key: str = ""
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    # Storage
    db_path: str = "data/raibis.db"

    @property
    def effective_anthropic_key(self) -> str:
        """
        Priority order (highest first):
          1. ANTHROPIC_AUTH_TOKEN  — set by claude-profile work
          2. ANTHROPIC_PROXY_KEY   — set in .env manually
          3. ANTHROPIC_API_KEY     — personal direct key
        """
        return self.anthropic_auth_token or self.anthropic_proxy_key or self.anthropic_api_key

    @property
    def effective_anthropic_base_url(self) -> str | None:
        """
        Priority order:
          1. ANTHROPIC_BASE_URL   — set by claude-profile work
          2. ANTHROPIC_PROXY_URL  — set in .env manually
          3. None                 — direct to Anthropic
        """
        return self.anthropic_base_url or self.anthropic_proxy_url or None


_config: Config | None = None


def get_config() -> Config:
    global _config
    if _config is not None:
        return _config

    _load_env()
    _config = Config(
        ai_provider=os.getenv("AI_PROVIDER", "anthropic").lower(),
        # claude-profile vars (take priority when work profile is active)
        anthropic_auth_token=os.getenv("ANTHROPIC_AUTH_TOKEN", ""),
        anthropic_base_url=os.getenv("ANTHROPIC_BASE_URL", ""),
        # .env fallbacks
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        anthropic_proxy_key=os.getenv("ANTHROPIC_PROXY_KEY", ""),
        anthropic_proxy_url=os.getenv("ANTHROPIC_PROXY_URL", ""),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3"),
        db_path=os.getenv("DB_PATH", "data/raibis.db"),
    )
    return _config
