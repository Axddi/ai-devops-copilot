import os

from services.ai.gemini import GeminiProvider
from services.ai.grok import GrokProvider


class AIProvider:

    @staticmethod
    def get():

        provider = os.getenv("AI_PROVIDER", "gemini").lower()

        providers = {
            "gemini": GeminiProvider,
            "grok": GrokProvider,
        }

        provider_class = providers.get(provider)

        if provider_class is None:
            raise RuntimeError(f"Unsupported AI provider: {provider}")

        return provider_class()