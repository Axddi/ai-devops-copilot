import logging
import os
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWKClientConnectionError, PyJWKClientError

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)
_jwks_clients: dict[str, PyJWKClient] = {}
_role_priority = ("Admin", "SRE", "Viewer")


@dataclass(frozen=True)
class CognitoPrincipal:
    subject: str
    role: str


def _get_jwks_client(issuer: str) -> PyJWKClient:
    if issuer not in _jwks_clients:
        _jwks_clients[issuer] = PyJWKClient(
            f"{issuer.rstrip('/')}/.well-known/jwks.json",
            timeout=5,
        )

    return _jwks_clients[issuer]


def verify_cognito_access_token(access_token: str) -> CognitoPrincipal:
    issuer = os.getenv("COGNITO_ISSUER")
    client_id = os.getenv("COGNITO_CLIENT_ID")

    if not issuer or not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cognito authentication is not configured.",
        )

    try:
        signing_key = _get_jwks_client(issuer).get_signing_key_from_jwt(access_token).key
    except PyJWKClientConnectionError as error:
        logger.error("Unable to reach the Cognito JWKS endpoint: %s", error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cognito token verification is temporarily unavailable.",
        ) from error
    except PyJWKClientError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Cognito access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    try:
        claims = jwt.decode(
            access_token,
            signing_key,
            algorithms=["RS256"],
            issuer=issuer,
            options={
                "verify_aud": False,
                "require": ["exp", "iat", "iss", "sub", "token_use", "client_id"],
            },
        )
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Cognito access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    if claims.get("token_use") != "access" or claims.get("client_id") != client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Cognito access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    groups = claims.get("cognito:groups", [])
    role = (
        next((candidate for candidate in _role_priority if candidate in groups), None)
        if isinstance(groups, list)
        else None
    )

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your Cognito account is not assigned an application role.",
        )

    return CognitoPrincipal(subject=claims["sub"], role=role)


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CognitoPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return verify_cognito_access_token(credentials.credentials)
