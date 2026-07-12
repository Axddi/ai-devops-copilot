import os
import json

from dotenv import load_dotenv
from groq import Groq

load_dotenv()
print("Groq Key Loaded:", bool(os.getenv("GROQ_API_KEY")))

PROVIDER = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile"
)

client = None


def _get_client():
    global client

    if client:
        return client

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    return client


def _as_string_list(value):
    if not isinstance(value, list):
        return []

    return [item for item in value if isinstance(item, str)]


def _as_string(value, fallback):
    return value if isinstance(value, str) else fallback


def _provider_error(code, message):
    return {
        "code": code,
        "message": message
    }


def _classify_provider_error(error):
    text = str(error).lower()

    if (
        "429" in text
        or "quota" in text
        or "rate" in text
        or "limit" in text
    ):
        return _provider_error(
            "AI_RATE_LIMITED",
            "AI provider quota or rate limit was reached. Showing Kubernetes-derived fallback analysis."
        )

    if (
        "api_key" in text
        or "authentication" in text
        or "unauthorized" in text
        or "forbidden" in text
    ):
        return _provider_error(
            "AI_AUTH_FAILED",
            "AI provider authentication failed. Showing Kubernetes-derived fallback analysis."
        )

    return _provider_error(
        "AI_PROVIDER_UNAVAILABLE",
        "AI provider analysis is unavailable. Showing Kubernetes-derived fallback analysis."
    )


def _fallback_analysis(incident, namespace="ai-devops", error=None):
    pod = incident.get("pod", "unknown-pod")
    reasons = _as_string_list(incident.get("reasons"))
    messages = _as_string_list(incident.get("messages"))
    logs = incident.get("logs") if isinstance(incident.get("logs"), str) else ""

    reason_text = ", ".join(reasons) if reasons else "Kubernetes warning"
    message_text = messages[0] if messages else "Kubernetes reported warning events for this pod."

    lower_context = " ".join(reasons + messages + [logs]).lower()

    recommended_fix = [
        "Inspect the pod description and recent events to confirm the failure reason.",
        "Review container logs for the failing pod before applying remediation.",
    ]

    if (
        "imagepullbackoff" in lower_context
        or "errimagepull" in lower_context
        or "failed to pull image" in lower_context
    ):
        root_cause = "Container image pull failure"

        recommended_fix = [
            "Verify the image name, tag, registry, and imagePullSecrets.",
            "Confirm the image exists in the registry.",
            "Redeploy the workload after correcting the image reference."
        ]

    elif (
        "oom" in lower_context
        or "memory" in lower_context
    ):
        root_cause = "Container memory pressure"

        recommended_fix = [
            "Inspect memory usage.",
            "Increase memory limits if appropriate.",
            "Review application memory leaks."
        ]

    elif (
        "crashloop" in lower_context
        or "backoff" in lower_context
    ):
        root_cause = "CrashLoopBackOff"

        recommended_fix = [
            "Inspect previous container logs.",
            "Check startup configuration.",
            "Rollback recent deployments if necessary."
        ]

    else:
        root_cause = reason_text

    return {
        "status": "fallback",
        "provider": PROVIDER,
        "root_cause": root_cause,
        "severity": incident.get("severity", "high"),
        "explanation": f"{message_text} AI analysis is unavailable, so this summary is based on Kubernetes events and logs.",
        "recommended_fix": recommended_fix,
        "kubectl_commands": [
            f"kubectl describe pod {pod} -n {namespace}",
            f"kubectl logs {pod} -n {namespace} --tail=100",
            f"kubectl get events -n {namespace} --field-selector involvedObject.name={pod}"
        ],
        "error": error
        or _provider_error(
            "AI_ANALYSIS_UNAVAILABLE",
            "AI analysis is unavailable."
        )
    }


def _normalize_success(parsed):
    return {
        "status": "success",
        "provider": PROVIDER,
        "root_cause": _as_string(
            parsed.get("root_cause"),
            "AI analysis completed"
        ),
        "severity": _as_string(
            parsed.get("severity"),
            "unknown"
        ),
        "explanation": _as_string(
            parsed.get("explanation"),
            "AI analysis completed successfully."
        ),
        "recommended_fix": _as_string_list(
            parsed.get("recommended_fix")
        ),
        "kubectl_commands": _as_string_list(
            parsed.get("kubectl_commands")
        ),
        "error": None
    }


def analyze_incident(
    incident,
    namespace="ai-devops"
):

    prompt = f"""
You are a Senior Kubernetes Site Reliability Engineer.

Analyze the following Kubernetes incident.

Return ONLY valid JSON.

Incident:

{json.dumps(incident, indent=2)}

Return format:

{{
  "root_cause":"...",
  "severity":"...",
  "explanation":"...",
  "recommended_fix":[
      "...",
      "..."
  ],
  "kubectl_commands":[
      "...",
      "..."
  ]
}}
"""

    try:

        response = _get_client().chat.completions.create(

            model=PROVIDER,

            temperature=0.2,

            response_format={
                "type": "json_object"
            },

            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Kubernetes Site Reliability Engineer."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        text = response.choices[0].message.content.strip()

        parsed = json.loads(text)

        if not isinstance(parsed, dict):
            return _fallback_analysis(
                incident,
                namespace,
                _provider_error(
                    "AI_INVALID_RESPONSE",
                    "AI provider returned invalid JSON."
                )
            )

        return _normalize_success(parsed)

    except Exception as e:
        print("\n========== GROQ ERROR ==========")
        print(type(e))
        print(repr(e))
        print(str(e))
        print("================================\n")

        return _fallback_analysis(
            incident,
            namespace,
            _classify_provider_error(e)
        )