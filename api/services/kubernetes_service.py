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