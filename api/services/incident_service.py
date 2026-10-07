from concurrent.futures import ThreadPoolExecutor

from services.kubernetes_service import (
    get_namespace_events,
    get_pod_logs,
    get_all_pods,
)


def generate_incident_summary(namespace: str = "ai-devops"):

    incidents = {}

    with ThreadPoolExecutor(max_workers=8) as executor:
        events_future = executor.submit(get_namespace_events, namespace)
        pods_future = executor.submit(get_all_pods)
        events = events_future.result()
        current_pods = {
            pod["name"]: pod["ready"]
            for pod in pods_future.result()
            if pod["namespace"] == namespace
        }

        for event in events:
            if event["type"] != "Warning":
                continue

            pod_name = event["object"]

            if pod_name not in current_pods or current_pods[pod_name]:
                continue

            if pod_name not in incidents:
                incidents[pod_name] = {
                    "pod": pod_name,
                    "namespace": namespace,
                    "severity": "high",
                    "reasons": [],
                    "messages": [],
                    "logs": "",
                }

            if event["reason"] not in incidents[pod_name]["reasons"]:
                incidents[pod_name]["reasons"].append(event["reason"])

            if event["message"] not in incidents[pod_name]["messages"]:
                incidents[pod_name]["messages"].append(event["message"])

        log_futures = {
            pod_name: executor.submit(get_pod_logs, pod_name, namespace)
            for pod_name in incidents
        }

        for pod_name, future in log_futures.items():
            try:
                incidents[pod_name]["logs"] = future.result()[:500]
            except Exception:
                incidents[pod_name]["logs"] = "Unable to fetch logs"

    return list(incidents.values())