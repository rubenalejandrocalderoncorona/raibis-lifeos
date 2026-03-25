"""AI provider abstract base class."""
from abc import ABC, abstractmethod


class AIProvider(ABC):
    """
    All AI providers implement this interface.
    Adding a new vendor = create a new file + register in factory.py.
    """

    @abstractmethod
    def chat(self, messages: list[dict], system: str = "") -> str:
        """
        Send a chat request.

        messages: list of {"role": "user"|"assistant", "content": str}
        system:   optional system prompt
        Returns:  the assistant's reply as a string
        """
        ...

    @abstractmethod
    def name(self) -> str:
        """Return the provider name (e.g. 'anthropic', 'openai')."""
        ...

    def __repr__(self) -> str:
        return f"<AIProvider: {self.name()}>"
