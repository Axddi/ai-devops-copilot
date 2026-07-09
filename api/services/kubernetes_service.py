from kubernetes import client, config
from kubernetes.config.config_exception import ConfigException


def get_k8s_client():
    """
    Returns a Kubernetes CoreV1Api client.

    Priority:
    1. In-cluster config (when running inside EKS)
    2. Local kubeconfig (when running locally or Docker with mounted kubeconfig)
    """

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
    v1 = get_k8s_client()

    pods = v1.list_pod_for_all_namespaces()

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
    v1 = get_k8s_client()

    return v1.read_namespaced_pod_log(
        name=pod_name,
        namespace=namespace,
    )


def get_namespace_events(namespace: str = "default"):
    v1 = get_k8s_client()

    events = v1.list_namespaced_event(namespace)

    return [
        {
            "reason": event.reason,
            "message": event.message,
            "type": event.type,
            "object": event.involved_object.name,
        }
        for event in events.items
    ]