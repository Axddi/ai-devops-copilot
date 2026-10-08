import logging

from fastapi import APIRouter, HTTPException
from kubernetes.client.exceptions import ApiException

from services.demo_service import get_demo_status

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/demo", tags=["Public demo"])


@router.get("/status")
def demo_status():
    try:
        return get_demo_status()
    except (RuntimeError, ApiException) as error:
        logger.exception("Unable to retrieve public demo status")
        raise HTTPException(
            status_code=503,
            detail="Demo cluster status is temporarily unavailable.",
        ) from error
