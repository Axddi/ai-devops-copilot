'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEvents, getIncidentSummary, getPods, type ClusterEvent, type Incident, type Pod } from '@/lib/api';

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
  const [pods, setPods] = useState<Pod[]>([]);
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadObservability() {
      try {
        const [podsData, eventsData, incidentsData] = await Promise.all([
          getPods(),
          getEvents(),
          getIncidentSummary(),
        ]);

        if (!cancelled) {
          setPods(podsData);
          setEvents(eventsData);
          setIncidents(incidentsData);
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

  const chartData = useMemo(() => {
    const running = pods.filter((pod) => pod.status.toLowerCase() === 'running').length;
    const nonRunning = pods.length - running;
    const warnings = events.filter((event) => event.type.toLowerCase() === 'warning').length;
    const labels = ['-60s', '-50s', '-40s', '-30s', '-20s', '-10s', 'now'];

    return labels.map((time) => ({
      time,
      running,
      nonRunning,
      warnings,
    }));
  }, [events, pods]);

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
        <h1 className="text-3xl font-bold">Observability</h1>
        <p className="text-muted-foreground text-sm mt-1">Logs, metrics, and events across the platform</p>
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
                  <CardTitle className="text-sm">Running Pods</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRunning" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="time" stroke="#71717a" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '12px' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '6px' }} />
                      <Area type="monotone" dataKey="running" stroke="#22c55e" fillOpacity={1} fill="url(#colorRunning)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-sm">Non-Running Pods</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorNonRunning" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="time" stroke="#71717a" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '12px' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '6px' }} />
                      <Area type="monotone" dataKey="nonRunning" stroke="#f97316" fillOpacity={1} fill="url(#colorNonRunning)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-sm">Warning Events</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="time" stroke="#71717a" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '12px' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '6px' }} />
                    <Line type="monotone" dataKey="warnings" stroke="#eab308" strokeWidth={2} dot={{ fill: '#eab308' }} />
                  </LineChart>
                </ResponsiveContainer>
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
