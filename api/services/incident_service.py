from services.kubernetes_service import (
    get_namespace_events,
    get_pod_logs
)


def generate_incident_summary(namespace: str = "ai-devops"):

    events = get_namespace_events(namespace)

    incidents = {}
    
    for event in events:

        if event["type"] != "Warning":
            continue

        pod_name = event["object"]

        if pod_name not in incidents:

            try:
                logs = get_pod_logs(pod_name, namespace)
            except Exception:
                logs = "Unable to fetch logs"

            incidents[pod_name] = {
                "pod": pod_name,
                "namespace": namespace,
                "severity": "high",
                "reasons": [],
                "messages": [],
                "logs": logs[:500]
            }

        if event["reason"] not in incidents[pod_name]["reasons"]:
            incidents[pod_name]["reasons"].append(event["reason"])

        if event["message"] not in incidents[pod_name]["messages"]:
            incidents[pod_name]["messages"].append(event["message"])
    return list(incidents.values())
