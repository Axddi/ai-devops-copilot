from pydantic import BaseModel
from typing import List


class AIAnalysis(BaseModel):
    root_cause: str
    severity: str
    explanation: str
    recommended_fix: List[str]
    kubectl_commands: List[str]