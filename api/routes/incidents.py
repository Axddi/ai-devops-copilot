from fastapi import APIRouter
from services.incident_service import generate_incident_summary

router = APIRouter()

@router.get("/incident-summary")
async def incident_summary():
    return generate_incident_summary()