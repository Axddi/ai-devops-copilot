import os
import requests

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "").rstrip("/")
PROMETHEUS_TIMEOUT_SECONDS = float(os.getenv("PROMETHEUS_TIMEOUT_SECONDS", "2"))


def unavailable(error):
    return {
        "status": "unavailable",
        "data": {
            "resultType": "vector",
            "result": [],
        },
        "error": error,
    }


def query_prometheus(query: str):
    if not PROMETHEUS_URL:
        return unavailable("PROMETHEUS_URL is not configured")

    try:
        response = requests.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query},
            timeout=PROMETHEUS_TIMEOUT_SECONDS,
        )

        response.raise_for_status()

        return response.json()
    except requests.RequestException as error:
        return unavailable(str(error))


def get_node_cpu_usage():
    query = """
    100 - (
      avg by(instance)(
        irate(node_cpu_seconds_total{mode="idle"}[5m])
      ) * 100
    )
    """

    return query_prometheus(query)


def get_node_memory_usage():
    query = """
    (
      1 -
      (
        node_memory_MemAvailable_bytes
        /
        node_memory_MemTotal_bytes
      )
    ) * 100
    """

    return query_prometheus(query)


def get_pod_restarts():
    query = """
    sum(kube_pod_container_status_restarts_total)
    """

    return query_prometheus(query)


def get_running_pods():
    query = """
    count(kube_pod_status_phase{phase="Running"})
    """

    return query_prometheus(query)
