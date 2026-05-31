from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pods import router as pods_router
from routes.events import router as events_router
from routes.ai import router as ai_router
from routes.incidents import router as incidents_router
app = FastAPI(
    title="AI DevOps Copilot",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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