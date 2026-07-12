from fastapi import APIRouter

from services.kubernetes_service import (
    get_warning_events,
    get_pod_logs,
)

from services.ai_service import analyze_incident

router = APIRouter()


@router.get("/analyze-incidents")
async def analyze_incidents():

    warnings = get_warning_events("default")

    results = []

    for event in warnings:

        pod = event["object"]

        logs = get_pod_logs(
            pod_name=pod,
            namespace="default"
        )

        incident = {
            "pod": pod,
            "reason": event["reason"],
            "message": event["message"],
            "logs": logs
        }

        ai_result = analyze_incident(
            incident,
            namespace="default"
        )

        results.append({
            "pod": pod,
            "reason": event["reason"],
            "message": event["message"],
            "logs": logs,
            "analysis": ai_result
        })

    return results