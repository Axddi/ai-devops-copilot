import os
import logging
from concurrent.futures import ThreadPoolExecutor, wait

from services.kubernetes_service import (
    get_all_pods,
    get_namespace_events,
)

from services.incident_service import (
    generate_incident_summary,
)

from services.prometheus_service import (
    get_node_cpu_usage,
    get_node_memory_usage,
    get_running_pods,
    get_pod_restarts,
)

from services.redis_service import (
    get_cache,
    set_cache,
)

logger = logging.getLogger(__name__)

DASHBOARD_NAMESPACE = os.getenv("DASHBOARD_NAMESPACE", "ai-devops")
DASHBOARD_CACHE_TTL_SECONDS = int(os.getenv("DASHBOARD_CACHE_TTL_SECONDS", "15"))
DASHBOARD_TIMEOUT_SECONDS = float(os.getenv("DASHBOARD_TIMEOUT_SECONDS", "4"))


EMPTY_METRIC = {
    "status": "unavailable",
    "data": {
        "resultType": "vector",
        "result": [],
    },
    "error": "metric unavailable",
}


def cluster_summary(data):

    unhealthy = [
        pod
        for pod in data["pods"]
        if pod.get("status") != "Succeeded"
        and (
            not pod.get("ready", False)
            or pod.get("reason")
            in [
                "CrashLoopBackOff",
                "ImagePullBackOff",
                "ErrImagePull",
                "CreateContainerConfigError",
                "CreateContainerError",
                "RunContainerError",
                "Error",
            ]
        )
    ]

    healthy = len(data["pods"]) - len(unhealthy)

    return {
        "healthy": bool(data["pods"]) and len(unhealthy) == 0,
        "healthy_pods": healthy,
        "unhealthy_pods": len(unhealthy),
        "pod_count": len(data["pods"]),
        "incident_count": len(data["incidents"]),
    }

def resolve_future(name, future, fallback):
    if not future.done():
        future.cancel()
        logger.warning("Dashboard data source %s exceeded the collection timeout", name)
        return fallback

    try:
        return future.result()
    except Exception:
        logger.exception("Dashboard data source %s failed", name)
        return fallback


def build_dashboard():

    cached = get_cache("dashboard")

    if cached:
        return cached

    executor = ThreadPoolExecutor(max_workers=7)
    futures = {
        "pods": executor.submit(get_all_pods),
        "events": executor.submit(get_namespace_events, DASHBOARD_NAMESPACE),
        "incidents": executor.submit(generate_incident_summary, DASHBOARD_NAMESPACE),
        "cpu": executor.submit(get_node_cpu_usage),
        "memory": executor.submit(get_node_memory_usage),
        "running": executor.submit(get_running_pods),
        "restarts": executor.submit(get_pod_restarts),
    }

    wait(futures.values(), timeout=DASHBOARD_TIMEOUT_SECONDS)

    dashboard = {
        "pods": resolve_future("pods", futures["pods"], []),
        "events": resolve_future("events", futures["events"], []),
        "incidents": resolve_future("incidents", futures["incidents"], []),
        "metrics": {
            "cpu": resolve_future("cpu", futures["cpu"], EMPTY_METRIC),
            "memory": resolve_future("memory", futures["memory"], EMPTY_METRIC),
            "running": resolve_future("running", futures["running"], EMPTY_METRIC),
            "restarts": resolve_future("restarts", futures["restarts"], EMPTY_METRIC),
        },
    }

    executor.shutdown(wait=False, cancel_futures=True)

    dashboard["summary"] = cluster_summary(dashboard)

    set_cache(
        "dashboard",
        dashboard,
        ttl=DASHBOARD_CACHE_TTL_SECONDS,
    )

    return dashboard
