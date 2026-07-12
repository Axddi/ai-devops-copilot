from fastapi import APIRouter
from services.dashboard_service import build_dashboard

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("")
def dashboard():
    return build_dashboard()


@router.get("/")
def dashboard_slash():
    return build_dashboard()
