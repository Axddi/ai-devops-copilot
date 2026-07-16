import os

from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from kubernetes.config.config_exception import ConfigException

KUBERNETES_REQUEST_TIMEOUT_SECONDS = float(
    os.getenv("KUBERNETES_REQUEST_TIMEOUT_SECONDS", "3")
)


def get_k8s_client():
    try:
        config.load_incluster_config()
    except ConfigException:
        try:
            config.load_kube_config()
        except ConfigException:
            raise RuntimeError(
                "No Kubernetes configuration found. "
                "Run 'aws eks update-kubeconfig' or mount ~/.kube into the container."
            )

    return client.CoreV1Api()


def get_all_pods():
    try:
        v1 = get_k8s_client()
        pods = v1.list_pod_for_all_namespaces(
            _request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS
        )
    except (RuntimeError, ApiException):
        return []

    result = []

    for pod in pods.items:

        ready = True
        reason = pod.status.phase

        if pod.status.container_statuses:
            for container in pod.status.container_statuses:

                if not container.ready:
                    ready = False

                if container.state:

                    if container.state.waiting:
                        reason = container.state.waiting.reason

                    elif container.state.terminated:
                        reason = container.state.terminated.reason

        result.append(
            {
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase,
                "ready": ready,
                "reason": reason,
            }
        )

    return result


def get_pod_metrics(namespace="ai-devops"):
    pods = get_all_pods()

    namespace_pods = [
        p for p in pods
        if p["namespace"] == namespace
    ]

    unhealthy = [
        p
        for p in namespace_pods
        if (
            not p["ready"]
            or p["reason"]
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

    system_pods = [
        p for p in pods
        if p["namespace"] == "kube-system"
    ]

    return {
        "namespace": namespace,
        "total_pods": len(pods),
        "namespace_pods": len(namespace_pods),
        "failed_pods": len(unhealthy),
        "healthy_pods": len(namespace_pods) - len(unhealthy),
        "system_pods": len(system_pods),
    }


def get_pod_logs(pod_name: str, namespace: str = "default"):
    try:
        v1 = get_k8s_client()

        return v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            _request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS,
        )

    except (RuntimeError, ApiException):
        return "Unable to fetch logs"


def get_namespace_events(namespace="default"):
    try:
        v1 = get_k8s_client()

        events = v1.list_namespaced_event(
            namespace,
            _request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS,
        )

    except (RuntimeError, ApiException):
        return []

    return [
        {
            "reason": event.reason,
            "message": event.message,
            "type": event.type,
            "object": event.involved_object.name,
        }
        for event in events.items
    ]


def get_warning_events(namespace="default"):
    events = get_namespace_events(namespace)

    return [
        e
        for e in events
        if e["type"] == "Warning"
    ]