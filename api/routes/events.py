from fastapi import APIRouter
from services.kubernetes_service import get_namespace_events

router = APIRouter()

@router.get("/events")
async def events(namespace: str = "ai-devops"):
    return get_namespace_events(namespace)