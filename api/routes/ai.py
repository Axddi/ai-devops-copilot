from fastapi import APIRouter
<<<<<<< HEAD
=======
from models.incident import AnalyzedIncident
>>>>>>> 90a80e94a3c0518c10a393feb096c0977fb8a6ce
from services.incident_service import generate_incident_summary
from services.ai_service import analyze_incident

router = APIRouter()


<<<<<<< HEAD
@router.get("/analyze-incidents")
async def analyze_incidents():

    incidents = generate_incident_summary()
=======
@router.get("/analyze-incidents", response_model=list[AnalyzedIncident])
async def analyze_incidents(namespace: str = "ai-devops"):

    incidents = generate_incident_summary(namespace)
>>>>>>> 90a80e94a3c0518c10a393feb096c0977fb8a6ce

    results = []

    for incident in incidents:

<<<<<<< HEAD
        analysis = analyze_incident(incident)

        results.append({
            "incident": incident,
            "analysis": analysis
        })

    return results
=======
        analysis = analyze_incident(incident, namespace)

        results.append({
            "incident": incident,
            "ai_analysis": analysis,
            "provider": analysis["provider"]
        })

    return results
>>>>>>> 90a80e94a3c0518c10a393feb096c0977fb8a6ce
