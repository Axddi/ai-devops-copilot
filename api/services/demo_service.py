import os
import threading
import time

from kubernetes import client
from kubernetes.client.exceptions import ApiException

from services.kubernetes_service import (
    KUBERNETES_REQUEST_TIMEOUT_SECONDS,
    get_k8s_client,
)

DEMO_NAMESPACE = os.getenv("DEMO_NAMESPACE", "ai-devops")
DEMO_STATUS_CACHE_SECONDS = 10
_cache_lock = threading.Lock()
_cached_status = None
_cached_at = 0.0


def _pod_summary(pod):
    ready = pod.status.phase == "Running"
    reason = pod.status.phase or "Unknown"
    for container in pod.status.container_statuses or []:
        if not container.ready:
            ready = False
        if not container.ready and container.state:
            if container.state.waiting:
                reason = container.state.waiting.reason
            elif container.state.terminated:
                reason = container.state.terminated.reason

    return {
        "name": pod.metadata.name,
        "status": pod.status.phase or "Unknown",
        "ready": ready,
        "reason": None if ready else reason,
    }


def get_demo_status():
    global _cached_status, _cached_at
    with _cache_lock:
        now = time.monotonic()
        if (
            _cached_status is not None
            and now - _cached_at < DEMO_STATUS_CACHE_SECONDS
        ):
            return _cached_status

        try:
            core_api = get_k8s_client()
            apps_api = client.AppsV1Api()
            pods = core_api.list_namespaced_pod(
                DEMO_NAMESPACE,
                _request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS,
            )
            deployments = apps_api.list_namespaced_deployment(
                DEMO_NAMESPACE,
                _request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS,
            )
        except (RuntimeError, ApiException) as error:
            raise RuntimeError("Unable to retrieve demo cluster status") from error

        _cached_status = {
            "namespace": DEMO_NAMESPACE,
            "deployments": [
                {
                    "name": deployment.metadata.name,
                    "ready_replicas": deployment.status.ready_replicas or 0,
                    "desired_replicas": deployment.spec.replicas or 0,
                    "available_replicas": deployment.status.available_replicas or 0,
                }
                for deployment in deployments.items
            ],
            "pods": [_pod_summary(pod) for pod in pods.items],
        }
        _cached_at = now
        return _cached_status
