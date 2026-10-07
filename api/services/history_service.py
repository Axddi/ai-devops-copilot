import hashlib
import json
import logging
import os
import re
import ssl
from datetime import datetime, timezone
from threading import Lock
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import DateTime, Integer, JSON, String, Text, UniqueConstraint, create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

logger = logging.getLogger(__name__)
_engine = None
_session_factory = None
_initialization_lock = Lock()
_sensitive_log_values = re.compile(
    r"(?i)\b(password|passwd|token|secret|api[_-]?key|access[_-]?key)\b"
    r"(\s*[:=]\s*)([^\s,;]+)"
)


class Base(DeclarativeBase):
    pass


class IncidentHistory(Base):
    __tablename__ = "incident_history"
    __table_args__ = (
        UniqueConstraint("owner_id", "fingerprint", name="uq_incident_history_owner_fingerprint"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    namespace: Mapped[str] = mapped_column(String(253), nullable=False)
    pod: Mapped[str] = mapped_column(String(253), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    messages: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    logs: Mapped[str] = mapped_column(Text, nullable=False)
    analysis: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


def _get_session_factory():
    global _engine, _session_factory

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Incident history storage is not configured.",
        )

    with _initialization_lock:
        if _session_factory is None:
            if database_url.startswith("mysql+pymysql://"):
                engine = create_engine(
                    database_url,
                    pool_pre_ping=True,
                    pool_recycle=300,
                    connect_args={
                        "ssl": ssl.create_default_context(
                            cafile=os.getenv("MYSQL_SSL_CA")
                        )
                    },
                )
            elif database_url.startswith("sqlite:///"):
                engine = create_engine(
                    database_url,
                    connect_args={"check_same_thread": False},
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Incident history storage has an unsupported database URL.",
                )

            try:
                Base.metadata.create_all(engine)
            except SQLAlchemyError as error:
                engine.dispose()
                logger.exception("Unable to initialize incident history database")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Incident history storage is temporarily unavailable.",
                ) from error

            _engine = engine
            _session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    return _session_factory


def _fingerprint(incident: dict[str, Any]) -> str:
    identity = {
        "namespace": incident["namespace"],
        "pod": incident["pod"],
        "reasons": sorted(incident["reasons"]),
        "messages": sorted(incident["messages"]),
    }
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _sanitize_logs(logs: str) -> str:
    bounded_logs = logs[:500]
    return _sensitive_log_values.sub(r"\1\2[REDACTED]", bounded_logs)


def _serialize(row: IncidentHistory) -> dict[str, Any]:
    return {
        "id": row.id,
        "namespace": row.namespace,
        "pod": row.pod,
        "severity": row.severity,
        "reasons": row.reasons,
        "messages": row.messages,
        "logs": row.logs,
        "analysis": row.analysis,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def record_incidents(
    owner_id: str,
    incidents: list[dict[str, Any]],
) -> None:
    session_factory = _get_session_factory()
    now = datetime.now(timezone.utc)

    try:
        with session_factory() as session:
            for incident in incidents:
                analysis = incident["analysis"]
                fingerprint = _fingerprint(incident)
                existing = session.scalar(
                    select(IncidentHistory).where(
                        IncidentHistory.owner_id == owner_id,
                        IncidentHistory.fingerprint == fingerprint,
                    )
                )

                if existing is None:
                    session.add(
                        IncidentHistory(
                            owner_id=owner_id,
                            fingerprint=fingerprint,
                            namespace=incident["namespace"],
                            pod=incident["pod"],
                            severity=analysis["severity"],
                            reasons=incident["reasons"],
                            messages=incident["messages"],
                            logs=_sanitize_logs(incident["logs"]),
                            analysis=analysis,
                            created_at=now,
                            updated_at=now,
                        )
                    )
                else:
                    existing.severity = analysis["severity"]
                    existing.logs = _sanitize_logs(incident["logs"])
                    existing.analysis = analysis
                    existing.updated_at = now

            session.commit()
    except SQLAlchemyError as error:
        logger.exception("Unable to save incident history")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Incident history could not be saved.",
        ) from error


def list_incident_history(owner_id: str, limit: int = 50) -> list[dict[str, Any]]:
    session_factory = _get_session_factory()

    try:
        with session_factory() as session:
            rows = session.scalars(
                select(IncidentHistory)
                .where(IncidentHistory.owner_id == owner_id)
                .order_by(IncidentHistory.updated_at.desc(), IncidentHistory.id.desc())
                .limit(limit)
            )
            return [_serialize(row) for row in rows]
    except SQLAlchemyError as error:
        logger.exception("Unable to load incident history")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Incident history is temporarily unavailable.",
        ) from error
