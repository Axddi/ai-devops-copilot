import os

from fastapi import APIRouter

from services.kubernetes_service import (
    get_warning_events,
    get_pod_logs,
)

from services.ai_service import analyze_incident

router = APIRouter()


@router.get("/analyze-incidents")
async def analyze_incidents(namespace: str | None = None):

    target_namespace = namespace or os.getenv("DASHBOARD_NAMESPACE", "ai-devops")
    warnings = get_warning_events(target_namespace)

    results = []

    for event in warnings:

        pod = event["object"]

        logs = get_pod_logs(
            pod_name=pod,
            namespace=target_namespace
        )

        incident = {
            "pod": pod,
            "namespace": target_namespace,
            "severity": "high",
            "reasons": [event["reason"]],
            "messages": [event["message"]],
            "reason": event["reason"],
            "message": event["message"],
            "logs": logs
        }

        ai_result = analyze_incident(
            incident,
            namespace=target_namespace
        )

        results.append({
            "pod": pod,
            "namespace": target_namespace,
            "reason": event["reason"],
            "message": event["message"],
            "logs": logs,
            "analysis": ai_result
        })

    return results
