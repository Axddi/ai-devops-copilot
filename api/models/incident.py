from pydantic import BaseModel
from typing import List, Optional


class AIError(BaseModel):
    code: str
    message: str


class AIAnalysis(BaseModel):
    status: str
    provider: str
    root_cause: str
    severity: str
    explanation: str
    recommended_fix: List[str]
    kubectl_commands: List[str]
    error: Optional[AIError] = None


class Incident(BaseModel):
    pod: str
    namespace: str = "ai-devops"
    severity: str
    reasons: List[str]
    messages: List[str]
    logs: str


class AnalyzedIncident(BaseModel):
    incident: Incident
    ai_analysis: AIAnalysis
    provider: str


class PodMetrics(BaseModel):
    namespace: str
    total_pods: int
    namespace_pods: int
    failed_pods: int
    system_pods: int
