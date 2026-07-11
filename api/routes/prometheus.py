from fastapi import APIRouter

from services.prometheus_service import (
    get_node_cpu_usage,
    get_node_memory_usage,
    get_pod_restarts,
    get_running_pods,
)

router = APIRouter(prefix="/metrics", tags=["Prometheus"])


@router.get("/cluster")
def cluster_metrics():

    return {
        "cpu": get_node_cpu_usage(),
        "memory": get_node_memory_usage(),
        "restarts": get_pod_restarts(),
        "running_pods": get_running_pods(),
    }