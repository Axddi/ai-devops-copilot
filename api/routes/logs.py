from fastapi import APIRouter
from services.kubernetes_service import get_pod_logs
router = APIRouter()

@router.get("/logs/{pod_name}")
async def logs(pod_name: str, namespace: str = "ai-devops"):
    return {
        "logs": get_pod_logs(pod_name, namespace)
    }
