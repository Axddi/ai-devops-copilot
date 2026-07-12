import json


def build_incident_prompt(incident: dict) -> str:
    return f"""
You are a Senior Site Reliability Engineer specializing in Kubernetes.

Analyze the following Kubernetes incident.

Return ONLY valid JSON.

Incident:

{json.dumps(incident, indent=2)}

Response format:

{{
  "root_cause": "...",
  "severity": "...",
  "explanation": "...",
  "recommended_fix": [
    "...",
    "..."
  ],
  "kubectl_commands": [
    "...",
    "..."
  ]
}}
"""