from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.auth_service import require_authenticated_user
from routes.pods import router as pods_router
from routes.events import router as events_router
from routes.ai import router as ai_router
from routes.incidents import router as incidents_router
from routes.chat import router as chat_router
from routes.prometheus import router as prometheus_router
from routes.logs import router as logs_router
from routes.dashboard import router as dashboard_router
from routes.demo import router as demo_router

load_dotenv()



app = FastAPI(
    title="AI DevOps Copilot.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(demo_router)
protected = [Depends(require_authenticated_user)]
app.include_router(ai_router, dependencies=protected)
app.include_router(chat_router, dependencies=protected)
app.include_router(incidents_router, dependencies=protected)
app.include_router(dashboard_router, dependencies=protected)
app.include_router(pods_router, dependencies=protected)
app.include_router(events_router, dependencies=protected)
app.include_router(logs_router, dependencies=protected)
app.include_router(prometheus_router, dependencies=protected)

@app.get("/")
async def root():
    return {
        "message": "AI DevOps Copilot Running"
    }
