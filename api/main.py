from fastapi import FastAPI
from routes.pods import router as pods_router
from routes.events import router as events_router
from routes.ai import router as ai_router
from routes.incidents import router as incidents_router
app = FastAPI(
    title="AI DevOps Copilot",
    version="1.0.0"
)
app.include_router(ai_router)
app.include_router(incidents_router)
app.include_router(pods_router)
app.include_router(events_router)
@app.get("/")
async def root():
    return {
        "message": "AI DevOps Copilot Running"
    }