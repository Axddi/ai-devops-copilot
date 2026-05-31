const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
const AI_ANALYSIS_CACHE_MS = 60000;

let analyzedIncidentsCache: { data: AnalyzedIncident[]; fetchedAt: number } | null = null;
let analyzedIncidentsRequest: Promise<AnalyzedIncident[]> | null = null;

export interface Incident {
  pod: string;
  severity: string;
  reasons: string[];
  messages: string[];
  logs: string;
}

export interface AIAnalysis {
  root_cause: string;
  severity: string;
  explanation: string;
  recommended_fix: string[];
  kubectl_commands: string[];
}

export interface AnalyzedIncident {
  incident: Incident;
  ai_analysis: AIAnalysis;
  provider: string;
}

export interface Pod {
  name: string;
  namespace: string;
  status: string;
}

export interface ClusterEvent {
  reason: string;
  message: string;
  type: string;
  object: string;
}

export interface BackendStatus {
  message: string;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    throw new Error(`Backend request failed: ${path} (${res.status})${details ? ` - ${details}` : ''}`);
  }

  return res.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeIncident(value: unknown): Incident {
  const incident = isRecord(value) ? value : {};

  return {
    pod: stringValue(incident.pod, 'unknown-pod'),
    severity: stringValue(incident.severity, 'unknown'),
    reasons: stringArray(incident.reasons),
    messages: stringArray(incident.messages),
    logs: stringValue(incident.logs),
  };
}

function normalizeAnalysis(value: unknown): AIAnalysis {
  const analysis = isRecord(value) ? value : {};

  return {
    root_cause: stringValue(analysis.root_cause, 'No root cause available'),
    severity: stringValue(analysis.severity, 'unknown'),
    explanation: stringValue(analysis.explanation, 'No AI explanation returned yet.'),
    recommended_fix: stringArray(analysis.recommended_fix),
    kubectl_commands: stringArray(analysis.kubectl_commands),
  };
}

function normalizeAnalyzedIncident(value: unknown): AnalyzedIncident {
  const outer = isRecord(value) ? value : {};
  const aiPayload = isRecord(outer.ai_analysis) ? outer.ai_analysis : {};
  const nestedPayload = isRecord(aiPayload.ai_analysis) || isRecord(aiPayload.incident) ? aiPayload : outer;

  return {
    incident: normalizeIncident(outer.incident ?? nestedPayload.incident),
    ai_analysis: normalizeAnalysis(nestedPayload.ai_analysis ?? outer.ai_analysis),
    provider: stringValue(outer.provider ?? nestedPayload.provider, 'unknown'),
  };
}

export async function getBackendStatus() {
  return request<BackendStatus>('/');
}

export async function getIncidentSummary() {
  const incidents = await request<unknown[]>('/incident-summary');
  return incidents.map(normalizeIncident);
}

export async function getAnalyzedIncidents(options: { force?: boolean } = {}) {
  const now = Date.now();

  if (!options.force && analyzedIncidentsCache && now - analyzedIncidentsCache.fetchedAt < AI_ANALYSIS_CACHE_MS) {
    return analyzedIncidentsCache.data;
  }

  if (!options.force && analyzedIncidentsRequest) {
    return analyzedIncidentsRequest;
  }

  analyzedIncidentsRequest = request<unknown[]>('/analyze-incidents')
    .then((incidents) => {
      const data = incidents.map(normalizeAnalyzedIncident);
      analyzedIncidentsCache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      analyzedIncidentsRequest = null;
    });

  return analyzedIncidentsRequest;
}

export async function getIncidents() {
  return getAnalyzedIncidents();
}

export async function getPods() {
  return request<Pod[]>('/pods');
}

export async function getEvents(namespace = 'ai-devops') {
  const params = new URLSearchParams({ namespace });
  return request<ClusterEvent[]>(`/events?${params.toString()}`);
}
