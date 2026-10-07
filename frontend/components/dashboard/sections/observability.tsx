'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDashboard, type DashboardResponse, type Incident } from '@/lib/api';

interface ObservabilityProps {
  defaultTab?: 'metrics' | 'logs' | 'events';
}

function getLevelColor(level: string) {
  switch (level) {
    case 'ERROR':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'WARN':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'INFO':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

export function Observability({ defaultTab = 'metrics' }: ObservabilityProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadObservability() {
      try {
        const dashboardData = await getDashboard({ force: true });

        if (!cancelled) {
          setDashboard(dashboardData);
          setIncidents(dashboardData.incidents);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch observability data:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch observability data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadObservability();
    const interval = setInterval(loadObservability, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const events = dashboard?.events ?? [];
  const metricData = useMemo(() => {
    if (!dashboard) return [];

    const byNode = new Map<string, { node: string; cpu: number | null; memory: number | null }>();

    function addMetric(metric: DashboardResponse['metrics']['cpu'], key: 'cpu' | 'memory') {
      metric.data.result.forEach((sample, index) => {
        const node = sample.metric.instance || sample.metric.node || `${key} ${index + 1}`;
        const value = Number.parseFloat(sample.value[1]);
        if (!Number.isFinite(value)) return;

        const row = byNode.get(node) ?? { node, cpu: null, memory: null };
        row[key] = value;
        byNode.set(node, row);
      });
    }

    addMetric(dashboard.metrics.cpu, 'cpu');
    addMetric(dashboard.metrics.memory, 'memory');
    return [...byNode.values()].sort((left, right) => left.node.localeCompare(right.node));
  }, [dashboard]);
  const runningPods = dashboard?.metrics.running.data.result[0]?.value[1] ?? 'Unavailable';
  const warningCount = events.filter((event) => event.type.toLowerCase() === 'warning').length;

  const logRows = incidents
    .filter((item) => item.logs)
    .map((item) => ({
      timestamp: 'live',
      level: item.severity.toLowerCase() === 'high' ? 'WARN' : 'INFO',
      service: item.pod,
      message: item.logs,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{defaultTab === 'events' ? 'Cluster Alerts' : 'Observability'}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {defaultTab === 'events'
            ? 'Live Kubernetes warning and cluster events'
            : 'Logs, metrics, and events across the platform'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-secondary">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-sm">CPU Usage by Node</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {metricData.some((row) => row.cpu !== null) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metricData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="node" stroke="#71717a" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#71717a" unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '6px' }} />
                        <Bar dataKey="cpu" name="CPU" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">CPU metrics are unavailable.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-sm">Memory Usage by Node</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {metricData.some((row) => row.memory !== null) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metricData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="node" stroke="#71717a" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#71717a" unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '6px' }} />
                        <Bar dataKey="memory" name="Memory" fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">Memory metrics are unavailable.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm">Current Cluster Signals</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Running pods (Prometheus)</p>
                  <p className="mt-1 text-2xl font-semibold">{runningPods}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warning events</p>
                  <p className="mt-1 text-2xl font-semibold">{warningCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active incidents</p>
                  <p className="mt-1 text-2xl font-semibold">{incidents.length}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm">Incident Log Excerpts</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {logRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No incident logs returned by the backend.</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {logRows.map((log, idx) => (
                      <div key={`${log.service}-${idx}`} className="bg-secondary/50 rounded-lg p-3 border border-border font-mono text-xs space-y-2">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-muted-foreground">{log.timestamp}</span>
                          <Badge className={`${getLevelColor(log.level)} border text-xs`}>{log.level}</Badge>
                        </div>
                        <div className="text-foreground whitespace-pre-wrap">
                          <span className="text-blue-400">[{log.service}]</span> {log.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm">Cluster Events</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events returned by the backend.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, idx) => (
                      <div key={`${event.object}-${event.reason}-${idx}`} className="bg-secondary/50 rounded-lg p-3 border border-border space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 border text-xs">
                              {event.reason}
                            </Badge>
                            <Badge className={`${getLevelColor(event.type === 'Warning' ? 'WARN' : 'INFO')} border text-xs`}>
                              {event.type}
                            </Badge>
                          </div>
                          <span className="font-mono text-xs text-foreground">{event.object}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
