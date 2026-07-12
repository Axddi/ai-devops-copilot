import os
import json

<<<<<<< HEAD
from dotenv import load_dotenv
from google import genai
load_dotenv()

client = genai.Client(
    api_key=os.getevn("GENAI_API_KEY")
)

def analyze_incident(incident):
    
    prompt = f"""
    you are an expert kubernetes SRE
    
    analyze this kubernetes incident
    
    incident: {json.dumps(incident, indent=2)}
    
    return:
    1. Root cause
    2. Severity
    3. Explanation
    4. Recommended remediation
    5. Suggested kubectl fix commands
    
    keep response concise and operationally useful
    """
    response = client.model.generate_content(
        model = "gemini-2.5-flash",
        contents=prompt
    )
    return response.text
=======
from google import genai


PROVIDER = "gemini-2.5-flash"

client = None


def _get_client():
    global client

    if client:
        return client

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
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

    if "429" in text or "quota" in text or "rate" in text or "resource_exhausted" in text:
        return _provider_error(
            "AI_RATE_LIMITED",
            "AI provider quota or rate limit was reached. Showing Kubernetes-derived fallback analysis."
        )

    if "api_key" in text or "permission" in text or "unauthorized" in text or "forbidden" in text:
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

    if "imagepullbackoff" in lower_context or "errimagepull" in lower_context or "failed to pull image" in lower_context:
        root_cause = "Container image pull failure"
        recommended_fix = [
            "Verify the image name, tag, registry, and pull secret configuration.",
            "Rebuild or republish the image using a supported OCI or Docker v2 manifest format.",
            "Restart or redeploy the workload after the image reference is fixed.",
        ]
    elif "oom" in lower_context or "memory" in lower_context:
        root_cause = "Container memory pressure or OOM restart"
        recommended_fix = [
            "Inspect memory usage and container limits for the affected workload.",
            "Increase memory limits only as a short-term mitigation if the workload is memory constrained.",
            "Review application memory behavior and restart history before redeploying.",
        ]
    elif "backoff" in lower_context or "crashloop" in lower_context:
        root_cause = "Container restart backoff"
        recommended_fix = [
            "Inspect previous container logs to identify the crash reason.",
            "Check recent configuration, image, secret, and dependency changes.",
            "Roll back or redeploy after the failing startup condition is corrected.",
        ]
    else:
        root_cause = reason_text

    return {
        "status": "fallback",
        "provider": PROVIDER,
        "root_cause": root_cause,
        "severity": incident.get("severity", "high"),
        "explanation": f"{message_text} AI analysis is currently unavailable, so this summary is based on Kubernetes events and pod logs.",
        "recommended_fix": recommended_fix,
        "kubectl_commands": [
            f"kubectl describe pod {pod} -n {namespace}",
            f"kubectl logs {pod} -n {namespace} --tail=100",
            f"kubectl get events -n {namespace} --field-selector involvedObject.name={pod}",
        ],
        "error": error or _provider_error(
            "AI_ANALYSIS_UNAVAILABLE",
            "AI analysis is unavailable. Showing Kubernetes-derived fallback analysis."
        )
    }


def _normalize_success(parsed):
    return {
        "status": "success",
        "provider": PROVIDER,
        "root_cause": _as_string(parsed.get("root_cause"), "AI analysis completed"),
        "severity": _as_string(parsed.get("severity"), "unknown"),
        "explanation": _as_string(parsed.get("explanation"), "AI analysis completed successfully."),
        "recommended_fix": _as_string_list(parsed.get("recommended_fix")),
        "kubectl_commands": _as_string_list(parsed.get("kubectl_commands")),
        "error": None
    }


def analyze_incident(incident, namespace="ai-devops"):

    prompt = f"""
You are an expert Kubernetes SRE.

Analyze this Kubernetes incident and return STRICT JSON only.
Do not include markdown fences or prose outside the JSON object.

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

        response = _get_client().models.generate_content(
            model=PROVIDER,
            contents=prompt
        )

        text = (response.text or "").strip()

        # remove markdown wrappers
        text = text.replace("```json", "")
        text = text.replace("```", "")

        parsed = json.loads(text)

        if not isinstance(parsed, dict):
            return _fallback_analysis(
                incident,
                namespace,
                _provider_error(
                    "AI_INVALID_RESPONSE",
                    "AI provider returned an invalid response. Showing Kubernetes-derived fallback analysis."
                )
            )

        return _normalize_success(parsed)

    except Exception as e:

        return _fallback_analysis(incident, namespace, _classify_provider_error(e))
>>>>>>> 90a80e94a3c0518c10a393feb096c0977fb8a6ce
