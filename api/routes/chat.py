import logging

from fastapi import APIRouter, HTTPException
from models.chat import ChatRequest, ChatResponse
from services.ai_service import _get_client, PROVIDER

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"],
)

SYSTEM_PROMPT = """
You are an expert DevOps Engineer.

Help with:

- Kubernetes
- Docker
- AWS
- Terraform
- Jenkins
- Linux
- CI/CD
- Monitoring
- Prometheus
- Grafana

Keep answers concise.
"""

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        client = _get_client()

        response = client.chat.completions.create(
            model=PROVIDER,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                *[
                    {
                        "role": turn.role,
                        "content": turn.content,
                    }
                    for turn in request.history
                ],
                {
                    "role": "user",
                    "content": request.message,
                },
            ],
            temperature=0.3,
        )

        answer = response.choices[0].message.content
        if not answer or not answer.strip():
            raise HTTPException(
                status_code=502,
                detail="AI provider returned an empty response.",
            )

        return ChatResponse(
            response=answer.strip()
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Chat completion failed")

        raise HTTPException(
            status_code=502,
            detail="AI provider is unavailable.",
        )