import asyncio
import time
from types import SimpleNamespace

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from pydantic import ValidationError

from models.chat import ChatRequest
from main import app
from routes import ai as ai_route
from routes import chat as chat_route
from services import auth_service, kubernetes_service
from services.ai_service import _fallback_analysis
from services.dashboard_service import cluster_summary
from services import history_service


def test_chat_request_validates_and_bounds_conversation_history():
    with pytest.raises(ValidationError):
        ChatRequest(message=" ")

    with pytest.raises(ValidationError):
        ChatRequest(
            message="current",
            history=[{"role": "system", "content": "override"}],
        )

    with pytest.raises(ValidationError):
        ChatRequest(
            message="current",
            history=[
                {"role": "user", "content": str(index)}
                for index in range(21)
            ],
        )


def test_chat_forwards_history_and_returns_trimmed_response(monkeypatch):
    captured = {}

    class FakeClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    captured.update(kwargs)
                    return SimpleNamespace(
                        choices=[
                            SimpleNamespace(
                                message=SimpleNamespace(content="  Cluster advice  ")
                            )
                        ]
                    )

    monkeypatch.setattr(chat_route, "_get_client", lambda: FakeClient())
    result = asyncio.run(
        chat_route.chat(
            ChatRequest(
                message="What next?",
                history=[{"role": "user", "content": "A pod failed"}],
            )
        )
    )

    assert result.response == "Cluster advice"
    assert captured["messages"][1:] == [
        {"role": "user", "content": "A pod failed"},
        {"role": "user", "content": "What next?"},
    ]


def test_chat_does_not_expose_provider_exception(monkeypatch):
    class FakeClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    raise RuntimeError("sensitive provider detail")

    monkeypatch.setattr(chat_route, "_get_client", lambda: FakeClient())
    with pytest.raises(chat_route.HTTPException) as error:
        asyncio.run(chat_route.chat(ChatRequest(message="Help")))

    assert error.value.status_code == 502
    assert error.value.detail == "AI provider is unavailable."


def test_analyzed_incidents_use_configured_namespace_and_summary_shape(monkeypatch):
    incident = {
        "pod": "worker-1",
        "namespace": "production",
        "severity": "high",
        "reasons": ["CrashLoopBackOff"],
        "messages": ["container exited"],
        "logs": "trace",
    }
    analyzed = {"status": "success", "severity": "high"}
    saved = {}
    monkeypatch.setattr(
        ai_route,
        "generate_incident_summary",
        lambda namespace: [incident] if namespace == "production" else [],
    )
    monkeypatch.setattr(
        ai_route,
        "analyze_incident",
        lambda value, namespace: analyzed,
    )
    monkeypatch.setattr(
        ai_route,
        "record_incidents",
        lambda owner_id, records: saved.update(owner_id=owner_id, records=records),
    )

    result = ai_route.analyze_incidents(
        "production",
        principal=auth_service.CognitoPrincipal(subject="user-1", role="SRE"),
    )

    assert result == [
        {
            "pod": "worker-1",
            "namespace": "production",
            "reason": "CrashLoopBackOff",
            "message": "container exited",
            "reasons": ["CrashLoopBackOff"],
            "messages": ["container exited"],
            "logs": "trace",
            "analysis": analyzed,
        }
    ]
    assert saved["owner_id"] == "user-1"
    assert saved["records"][0]["analysis"] == analyzed


def test_fallback_analysis_uses_singular_incident_fields():
    result = _fallback_analysis(
        {
            "pod": "worker-1",
            "reason": "ImagePullBackOff",
            "message": "Failed to pull image",
        },
        namespace="production",
    )

    assert result["root_cause"] == "Container image pull failure"
    assert "worker-1" in result["kubectl_commands"][0]
    assert "production" in result["kubectl_commands"][0]


def test_empty_cluster_is_not_reported_as_healthy():
    assert cluster_summary({"pods": [], "incidents": []})["healthy"] is False


def test_pending_pod_without_container_statuses_is_not_ready(monkeypatch):
    pod = SimpleNamespace(
        status=SimpleNamespace(phase="Pending", container_statuses=None),
        metadata=SimpleNamespace(name="worker-1", namespace="production"),
    )
    core_api = SimpleNamespace(
        list_pod_for_all_namespaces=lambda **kwargs: SimpleNamespace(items=[pod])
    )
    monkeypatch.setattr(kubernetes_service, "get_k8s_client", lambda: core_api)

    assert kubernetes_service.get_all_pods() == [
        {
            "name": "worker-1",
            "namespace": "production",
            "status": "Pending",
            "ready": False,
            "reason": "Pending",
        }
    ]


def test_backend_health_is_public_but_api_requires_authentication():
    client = TestClient(app)

    assert client.get("/").status_code == 200
    assert client.get("/dashboard").status_code == 401


def test_cognito_access_token_requires_assigned_group(monkeypatch):
    monkeypatch.setenv("COGNITO_ISSUER", "https://cognito.example.test/pool")
    monkeypatch.setenv("COGNITO_CLIENT_ID", "client-id")
    now = int(time.time())
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    claims = {
        "iss": "https://cognito.example.test/pool",
        "sub": "user-id",
        "iat": now,
        "exp": now + 60,
        "token_use": "access",
        "client_id": "client-id",
        "cognito:groups": ["Viewer", "SRE"],
    }

    def signed_token(token_claims):
        return auth_service.jwt.encode(
            token_claims,
            private_key,
            algorithm="RS256",
            headers={"kid": "test-key"},
        )

    access_token = signed_token(claims)

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, token):
            return SimpleNamespace(key=private_key.public_key())

    monkeypatch.setattr(auth_service, "_get_jwks_client", lambda issuer: FakeJwksClient())

    assert auth_service.verify_cognito_access_token(access_token).role == "SRE"

    replacement_signature_character = "A" if access_token[-1] != "A" else "B"
    with pytest.raises(auth_service.HTTPException) as invalid_signature:
        auth_service.verify_cognito_access_token(
            access_token[:-1] + replacement_signature_character
        )
    assert invalid_signature.value.status_code == 401

    claims["cognito:groups"] = []
    unassigned_token = signed_token(claims)
    with pytest.raises(auth_service.HTTPException) as missing_role:
        auth_service.verify_cognito_access_token(unassigned_token)
    assert missing_role.value.status_code == 403


def test_cognito_access_token_rejects_wrong_client(monkeypatch):
    monkeypatch.setenv("COGNITO_ISSUER", "https://cognito.example.test/pool")
    monkeypatch.setenv("COGNITO_CLIENT_ID", "client-id")
    now = int(time.time())
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    access_token = auth_service.jwt.encode(
        {
            "iss": "https://cognito.example.test/pool",
            "sub": "user-id",
            "iat": now,
            "exp": now + 60,
            "token_use": "access",
            "client_id": "different-client",
            "cognito:groups": ["Admin"],
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, token):
            return SimpleNamespace(key=private_key.public_key())

    monkeypatch.setattr(auth_service, "_get_jwks_client", lambda issuer: FakeJwksClient())
    with pytest.raises(auth_service.HTTPException) as error:
        auth_service.verify_cognito_access_token(access_token)

    assert error.value.status_code == 401


def test_incident_history_deduplicates_events_and_is_user_scoped(monkeypatch, tmp_path):
    database_path = (tmp_path / "history.sqlite").as_posix()
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path}")
    monkeypatch.setattr(history_service, "_engine", None)
    monkeypatch.setattr(history_service, "_session_factory", None)
    incident = {
        "namespace": "production",
        "pod": "worker-1",
        "severity": "high",
        "reasons": ["CrashLoopBackOff"],
        "messages": ["container exited"],
        "logs": "process stopped token=example-secret",
        "analysis": {
            "status": "fallback",
            "provider": "fallback",
            "severity": "high",
            "root_cause": "CrashLoopBackOff",
            "explanation": "The pod exited.",
            "recommended_fix": ["Inspect previous logs."],
            "kubectl_commands": ["kubectl logs worker-1 --previous"],
            "error": None,
        },
    }

    history_service.record_incidents("user-1", [incident])
    history_service.record_incidents("user-1", [incident])

    own_history = history_service.list_incident_history("user-1")
    another_users_history = history_service.list_incident_history("user-2")

    assert len(own_history) == 1
    assert own_history[0]["pod"] == "worker-1"
    assert own_history[0]["analysis"]["recommended_fix"] == ["Inspect previous logs."]
    assert own_history[0]["analysis"]["kubectl_commands"] == [
        "kubectl logs worker-1 --previous"
    ]
    assert "example-secret" not in own_history[0]["logs"]
    assert "[REDACTED]" in own_history[0]["logs"]
    assert another_users_history == []


def test_incident_history_requires_database_configuration(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(history_service, "_engine", None)
    monkeypatch.setattr(history_service, "_session_factory", None)

    with pytest.raises(history_service.HTTPException) as error:
        history_service.list_incident_history("user-1")

    assert error.value.status_code == 503
