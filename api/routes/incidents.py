from fastapi import APIRouter
from models.incident import Incident
from services.incident_service import generate_incident_summary

router = APIRouter()

@router.get("/incident-summary", response_model=list[Incident])
async def incident_summary(namespace: str = "ai-devops"):
    return generate_incident_summary(namespace)
