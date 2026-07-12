import json
import os

from google import genai


class GeminiProvider:

    MODEL = "gemini-2.5-flash"

    def __init__(self):

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        self.client = genai.Client(api_key=api_key)

    def analyze(self, prompt: str) -> dict:

        response = self.client.models.generate_content(
            model=self.MODEL,
            contents=prompt
        )

        text = (response.text or "").strip()

        text = (
            text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        parsed = json.loads(text)

        if not isinstance(parsed, dict):
            raise RuntimeError("AI provider returned invalid JSON")

        return parsed

    @property
    def name(self):
        return "gemini"