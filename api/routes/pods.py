from fastapi import APIRouter
from services.kubernetes_service import get_all_pods

router = APIRouter()

@router.get("/pods")
async def list_pods():
    return get_all_pods()