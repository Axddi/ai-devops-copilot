from kubernetes import client, config

config.load_kube_config()

v1 = client.CoreV1Api()


def get_all_pods():
    pods = v1.list_pod_for_all_namespaces()

    return [
        {
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": pod.status.phase
        }
        for pod in pods.items
    ]


def get_pod_metrics(namespace: str = "ai-devops"):
    pods = get_all_pods()

    def is_failed(pod):
        return pod["status"] not in ["Running", "Succeeded"]

    namespace_pods = [
        pod for pod in pods
        if pod["namespace"] == namespace
    ]

    return {
        "namespace": namespace,
        "total_pods": len(pods),
        "namespace_pods": len(namespace_pods),
        "failed_pods": len([pod for pod in namespace_pods if is_failed(pod)]),
        "system_pods": len([pod for pod in pods if pod["namespace"] == "kube-system"])
    }


def get_pod_logs(pod_name: str, namespace: str = "default"):
    return v1.read_namespaced_pod_log(
        name=pod_name,
        namespace=namespace
    )
    
def get_namespace_events(namespace: str = "default"):
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
