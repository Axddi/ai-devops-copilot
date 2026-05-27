from fastapi import APIRouter
from services.incident_service import generate_incident_summary
from services.ai_service import analyze_incident

router = APIRouter()


@router.get("/analyze-incidents")
async def analyze_incidents():

    incidents = generate_incident_summary()

    results = []

    for incident in incidents:

        analysis = analyze_incident(incident)

        results.append({
            "incident": incident,
            "analysis": analysis
        })

    return results