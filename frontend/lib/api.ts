const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/backend').replace(/\/$/, '');
const AI_ANALYSIS_CACHE_MS = 60000;
const DASHBOARD_CACHE_MS = 5000;
const REQUEST_TIMEOUT_MS = 15000;

let analyzedIncidentsCache: { data: AnalyzedIncident[]; fetchedAt: number } | null = null;
let analyzedIncidentsRequest: Promise<AnalyzedIncident[]> | null = null;
let dashboardCache: { data: DashboardResponse; fetchedAt: number } | null = null;
let dashboardRequest: Promise<DashboardResponse> | null = null;

export interface Incident {
  pod: string;
  namespace: string;
  severity: string;
  reasons: string[];
  messages: string[];
  logs: string;
}

export interface AIError {
  code: string;
  message: string;
}

export interface AIAnalysis {
  status: 'success' | 'fallback';
  provider: string;
  root_cause: string;
  severity: string;
  explanation: string;
  recommended_fix: string[];
  kubectl_commands: string[];
  error: AIError | null;
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

export interface PodMetrics {
  namespace: string;
  total_pods: number;
  namespace_pods: number;
  failed_pods: number;
  system_pods: number;
}

export interface PrometheusMetricValue {
  metric: Record<string, string>;
  value: [number, string];
}

export interface PrometheusMetricResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusMetricValue[];
  };
  error?: string;
}

export interface DashboardMetrics {
  cpu: PrometheusMetricResponse;
  memory: PrometheusMetricResponse;
  running: PrometheusMetricResponse;
  restarts: PrometheusMetricResponse;
}

export interface DashboardSummary {
  healthy: boolean;
  pod_count: number;
  incident_count: number;
}

export interface DashboardResponse {
  pods: Pod[];
  events: ClusterEvent[];
  incidents: Incident[];
  metrics: DashboardMetrics;
  summary: DashboardSummary;
}

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Backend request timed out: ${path}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

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

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizedProviderMessage(value: unknown, fallback: string) {
  const message = stringValue(value, fallback);
  const lower = message.toLowerCase();
  const looksRaw =
    lower.includes('resource_exhausted') ||
    lower.includes('generativelanguage.googleapis.com') ||
    lower.includes('quota exceeded') ||
    lower.includes('google.rpc') ||
    lower.includes('api key');

  return looksRaw ? fallback : message;
}

function normalizeAIError(value: unknown): AIError | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    code: stringValue(value.code, 'AI_ANALYSIS_UNAVAILABLE'),
    message: sanitizedProviderMessage(
      value.message,
      'AI analysis is unavailable. Showing Kubernetes-derived fallback analysis.'
    ),
  };
}

function normalizeIncident(value: unknown): Incident {
  const incident = isRecord(value) ? value : {};

  return {
    pod: stringValue(incident.pod, 'unknown-pod'),
    namespace: stringValue(incident.namespace, 'ai-devops'),
    severity: stringValue(incident.severity, 'unknown'),
    reasons: stringArray(incident.reasons),
    messages: stringArray(incident.messages),
    logs: stringValue(incident.logs),
  };
}

function normalizeAnalysis(value: unknown): AIAnalysis {
  const analysis = isRecord(value) ? value : {};
  const error = normalizeAIError(analysis.error);
  const status = analysis.status === 'success' ? 'success' : analysis.status === 'fallback' || error ? 'fallback' : 'success';

  return {
    status,
    provider: stringValue(analysis.provider, 'unknown'),
    root_cause: stringValue(analysis.root_cause, 'No root cause available'),
    severity: stringValue(analysis.severity, 'unknown'),
    explanation: sanitizedProviderMessage(
      analysis.explanation,
      'AI analysis is unavailable. Showing Kubernetes-derived fallback analysis.'
    ),
    recommended_fix: stringArray(analysis.recommended_fix),
    kubectl_commands: stringArray(analysis.kubectl_commands),
    error,
  };
}

function normalizePod(value: unknown): Pod {
  const pod = isRecord(value) ? value : {};

  return {
    name: stringValue(pod.name, 'unknown-pod'),
    namespace: stringValue(pod.namespace, 'default'),
    status: stringValue(pod.status, 'Unknown'),
  };
}

function normalizeEvent(value: unknown): ClusterEvent {
  const event = isRecord(value) ? value : {};

  return {
    reason: stringValue(event.reason, 'Unknown'),
    message: stringValue(event.message),
    type: stringValue(event.type, 'Normal'),
    object: stringValue(event.object, 'unknown-object'),
  };
}

function normalizePrometheusMetric(value: unknown): PrometheusMetricResponse {
  const metric = isRecord(value) ? value : {};
  const data = isRecord(metric.data) ? metric.data : {};
  const result = Array.isArray(data.result) ? data.result : [];

  return {
    status: stringValue(metric.status, 'unavailable'),
    data: {
      resultType: stringValue(data.resultType, 'vector'),
      result: result
        .filter(isRecord)
        .map((item) => {
          const rawMetric = isRecord(item.metric) ? item.metric : {};
          const rawValue = Array.isArray(item.value) ? item.value : [];
          const timestamp = numberValue(rawValue[0]);
          const sample = stringValue(rawValue[1], '0');

          return {
            metric: Object.fromEntries(
              Object.entries(rawMetric).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
            ),
            value: [timestamp, sample] as [number, string],
          };
        }),
    },
    error: stringValue(metric.error),
  };
}

function normalizeDashboard(value: unknown): DashboardResponse {
  const dashboard = isRecord(value) ? value : {};
  const metrics = isRecord(dashboard.metrics) ? dashboard.metrics : {};
  const summary = isRecord(dashboard.summary) ? dashboard.summary : {};
  const pods = Array.isArray(dashboard.pods) ? dashboard.pods.map(normalizePod) : [];
  const events = Array.isArray(dashboard.events) ? dashboard.events.map(normalizeEvent) : [];
  const incidents = Array.isArray(dashboard.incidents) ? dashboard.incidents.map(normalizeIncident) : [];

  return {
    pods,
    events,
    incidents,
    metrics: {
      cpu: normalizePrometheusMetric(metrics.cpu),
      memory: normalizePrometheusMetric(metrics.memory),
      running: normalizePrometheusMetric(metrics.running),
      restarts: normalizePrometheusMetric(metrics.restarts),
    },
    summary: {
      healthy: booleanValue(summary.healthy, incidents.length === 0),
      pod_count: numberValue(summary.pod_count, pods.length),
      incident_count: numberValue(summary.incident_count, incidents.length),
    },
  };
}

function normalizeAnalyzedIncident(value: unknown): AnalyzedIncident {
  const data = isRecord(value) ? value : {};

  const analysis = normalizeAnalysis(data.analysis);

  return {
    incident: {
      pod: stringValue(data.pod, "unknown-pod"),
      namespace: stringValue(data.namespace, "default"),
      severity: analysis.severity || "unknown",
      reasons: [stringValue(data.reason)],
      messages: [stringValue(data.message)],
      logs: stringValue(data.logs),
    },

    ai_analysis: analysis,

    provider: analysis.provider,
  };
}

function fallbackAnalyzedIncident(incident: Incident): AnalyzedIncident {
  const reason = incident.reasons[0] ?? 'Kubernetes warning';

  return {
    incident,
    provider: 'dashboard',
    ai_analysis: {
      status: 'fallback',
      provider: 'dashboard',
      root_cause: reason,
      severity: incident.severity,
      explanation: incident.messages[0] ?? 'Dashboard incident summary returned by the backend.',
      recommended_fix: [
        `Inspect pod ${incident.pod} in namespace ${incident.namespace}.`,
        'Review Kubernetes events and logs for the affected workload.',
      ],
      kubectl_commands: [
        `kubectl describe pod ${incident.pod} -n ${incident.namespace}`,
        `kubectl logs ${incident.pod} -n ${incident.namespace} --tail=100`,
      ],
      error: {
        code: 'AI_ANALYSIS_UNAVAILABLE',
        message: 'AI analysis is unavailable. Showing dashboard incident data.',
      },
    },
  };
}

export async function getBackendStatus() {
  return request<BackendStatus>('/');
}

export async function getDashboard(options: { force?: boolean } = {}) {
  const now = Date.now();

  if (!options.force && dashboardCache && now - dashboardCache.fetchedAt < DASHBOARD_CACHE_MS) {
    return dashboardCache.data;
  }

  if (!options.force && dashboardRequest) {
    return dashboardRequest;
  }

  dashboardRequest = request<unknown>('/dashboard')
    .then((response) => {
      const data = normalizeDashboard(response);
      dashboardCache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      dashboardRequest = null;
    });

  return dashboardRequest;
}

function metricsFromDashboard(dashboard: DashboardResponse, namespace: string): PodMetrics {
  const namespacePods = dashboard.pods.filter((pod) => pod.namespace === namespace);
  const failedPods = namespacePods.filter((pod) => !['Running', 'Succeeded'].includes(pod.status));
  const systemPods = dashboard.pods.filter((pod) => pod.namespace === 'kube-system');

  return {
    namespace,
    total_pods: dashboard.summary.pod_count,
    namespace_pods: namespacePods.length,
    failed_pods: failedPods.length,
    system_pods: systemPods.length,
  };
}

export function getPrometheusAverage(metric: PrometheusMetricResponse) {
  const values = metric.data.result
    .map((item) => Number.parseFloat(item.value[1]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getPrometheusScalar(metric: PrometheusMetricResponse) {
  const value = metric.data.result[0]?.value[1];
  const parsed = value === undefined ? Number.NaN : Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getIncidentSummary() {
  const dashboard = await getDashboard();
  return dashboard.incidents;
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
    .catch(async (error) => {
      const dashboard = await getDashboard();
      const data = dashboard.incidents.map(fallbackAnalyzedIncident);
      analyzedIncidentsCache = { data, fetchedAt: Date.now() };

      if (data.length > 0) {
        return data;
      }

      throw error;
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
  const dashboard = await getDashboard();
  return dashboard.pods;
}

export async function getPodMetrics(namespace = 'ai-devops') {
  const dashboard = await getDashboard();
  return metricsFromDashboard(dashboard, namespace);
}

export async function getEvents(namespace = 'ai-devops') {
  const dashboard = await getDashboard();
  return dashboard.events;
}
