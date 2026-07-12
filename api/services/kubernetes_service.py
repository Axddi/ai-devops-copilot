import os

from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from kubernetes.config.config_exception import ConfigException

KUBERNETES_REQUEST_TIMEOUT_SECONDS = float(os.getenv("KUBERNETES_REQUEST_TIMEOUT_SECONDS", "3"))


def get_k8s_client():
    try:
        config.load_incluster_config()
        print("Loaded in-cluster Kubernetes configuration")
    except ConfigException:
        try:
            config.load_kube_config()
            print("Loaded local kubeconfig")
        except ConfigException:
            raise RuntimeError(
                "No Kubernetes configuration found. "
                "Run 'aws eks update-kubeconfig' or mount ~/.kube into the container."
            )

    return client.CoreV1Api()


def get_all_pods():
    try:
        v1 = get_k8s_client()

        pods = v1.list_pod_for_all_namespaces(_request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS)
    except (RuntimeError, ApiException):
        return []

    return [
        {
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": pod.status.phase,
        }
        for pod in pods.items
    ]


def get_pod_metrics(namespace: str = "ai-devops"):
    pods = get_all_pods()

    namespace_pods = [
        pod for pod in pods
        if pod["namespace"] == namespace
    ]

    failed_pods = [
        pod for pod in namespace_pods
        if pod["status"] not in ["Running", "Succeeded"]
    ]

    system_pods = [
        pod for pod in pods
        if pod["namespace"] == "kube-system"
    ]

    return {
        "namespace": namespace,
        "total_pods": len(pods),
        "namespace_pods": len(namespace_pods),
        "failed_pods": len(failed_pods),
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


def get_namespace_events(namespace: str = "default"):
    try:
        v1 = get_k8s_client()

        events = v1.list_namespaced_event(namespace, _request_timeout=KUBERNETES_REQUEST_TIMEOUT_SECONDS)
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
