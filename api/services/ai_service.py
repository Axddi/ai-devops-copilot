import os
import json

from google import genai


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def analyze_incident(incident):

    prompt = f"""
You are an expert Kubernetes SRE.

Analyze this Kubernetes incident and return STRICT JSON only.

Incident:
{json.dumps(incident, indent=2)}

Return format:
{{
  "root_cause": "...",
  "severity": "...",
  "explanation": "...",
  "recommended_fix": [
    "..."
  ],
  "kubectl_commands": [
    "..."
  ]
}}
"""

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text.strip()

        # remove markdown wrappers
        text = text.replace("```json", "")
        text = text.replace("```", "")

        parsed = json.loads(text)

        return {
            "incident": incident,
            "ai_analysis": parsed,
            "provider": "gemini-2.5-flash"
        }

    except Exception as e:

        return {
            "incident": incident,
            "ai_analysis": {
                "root_cause": "AI analysis failed",
                "severity": "unknown",
                "explanation": str(e),
                "recommended_fix": [],
                "kubectl_commands": []
            },
            "provider": "gemini-2.5-flash"
        }