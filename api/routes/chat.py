from fastapi import APIRouter, HTTPException
from models.chat import ChatRequest, ChatResponse
from services.ai_service import _get_client, PROVIDER

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
                {
                    "role": "user",
                    "content": request.message,
                },
            ],
            temperature=0.3,
        )

        return ChatResponse(
            response=response.choices[0].message.content
        )

    except Exception as e:
        print("\n========== CHAT ERROR ==========")
        print(type(e))
        print(e)
        print("================================\n")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )