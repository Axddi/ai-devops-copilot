from fastapi import APIRouter
from models.incident import PodMetrics
from services.kubernetes_service import get_all_pods, get_pod_metrics

router = APIRouter()

@router.get("/pods")
async def list_pods():
    return get_all_pods()


@router.get("/metrics", response_model=PodMetrics)
async def pod_metrics(namespace: str = "ai-devops"):
    return get_pod_metrics(namespace)
