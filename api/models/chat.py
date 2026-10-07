from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints


class ChatRequest(BaseModel):
    message: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=4000),
    ]
    history: list["ChatTurn"] = Field(default_factory=list, max_length=20)


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=4000),
    ]


class ChatResponse(BaseModel):
    response: str