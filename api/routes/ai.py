from fastapi import APIRouter
from models.incident import AnalyzedIncident
from services.incident_service import generate_incident_summary
from services.ai_service import analyze_incident

router = APIRouter()


@router.get("/analyze-incidents", response_model=list[AnalyzedIncident])
async def analyze_incidents(namespace: str = "ai-devops"):

    incidents = generate_incident_summary(namespace)

    results = []

    for incident in incidents:

        analysis = analyze_incident(incident, namespace)

        results.append({
            "incident": incident,
            "ai_analysis": analysis,
            "provider": analysis["provider"]
        })

    return results
