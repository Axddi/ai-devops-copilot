import os

from fastapi import APIRouter, Depends, Query
from services.auth_service import CognitoPrincipal, require_authenticated_user
from services.ai_service import analyze_incident
from services.incident_service import generate_incident_summary
from services.history_service import list_incident_history, record_incidents

router = APIRouter()
INCIDENT_NAMESPACE = os.getenv("DASHBOARD_NAMESPACE", "ai-devops")


@router.get("/analyze-incidents")
def analyze_incidents(
    namespace: str = INCIDENT_NAMESPACE,
    principal: CognitoPrincipal = Depends(require_authenticated_user),
):
    incidents = generate_incident_summary(namespace)

    results = []

    for incident in incidents:
        ai_result = analyze_incident(incident, namespace=namespace)

        results.append({
            "pod": incident["pod"],
            "namespace": namespace,
            "reason": ", ".join(incident["reasons"]),
            "message": incident["messages"][0] if incident["messages"] else "",
            "reasons": incident["reasons"],
            "messages": incident["messages"],
            "logs": incident["logs"],
            "analysis": ai_result
        })

    record_incidents(
        principal.subject,
        [
            {
                "pod": result["pod"],
                "namespace": result["namespace"],
                "severity": result["analysis"]["severity"],
                "reasons": result["reasons"],
                "messages": result["messages"],
                "logs": result["logs"],
                "analysis": result["analysis"],
            }
            for result in results
        ],
    )

    return results


@router.get("/history")
def incident_history(
    limit: int = Query(default=50, ge=1, le=100),
    principal: CognitoPrincipal = Depends(require_authenticated_user),
):
    return list_incident_history(principal.subject, limit=limit)