'use client';

import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEvents, getIncidentSummary, getPodMetrics, type ClusterEvent, type Incident, type PodMetrics } from '@/lib/api';

interface Metric {
  title: string;
  value: string;
  unit: string;
  status: 'healthy' | 'warning' | 'critical' | 'info';
  progress: number;
}

function getStatusColor(status: Metric['status']) {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-blue-500';
  }
}

function getStatusBar(status: Metric['status']) {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
}

export function PlatformOverview() {
  const [podMetrics, setPodMetrics] = useState<PodMetrics | null>(null);
  const [events, setEvents] = useState<ClusterEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const [metricsData, eventsData, incidentsData] = await Promise.all([
          getPodMetrics(),
          getEvents(),
          getIncidentSummary(),
        ]);

        if (!cancelled) {
          setPodMetrics(metricsData);
          setEvents(eventsData);
          setIncidents(incidentsData);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch overview:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch overview');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOverview();
    const interval = setInterval(loadOverview, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const totalPods = podMetrics?.total_pods ?? 0;
  const namespacePods = podMetrics?.namespace_pods ?? 0;
  const failedPods = podMetrics?.failed_pods ?? 0;
  const systemPods = podMetrics?.system_pods ?? 0;
  const runningPods = Math.max(0, namespacePods - failedPods);
  const warningEvents = events.filter((event) => event.type.toLowerCase() === 'warning').length;
  const clusterHealth = namespacePods === 0 ? 100 : Math.round((runningPods / namespacePods) * 100);

  const metrics: Metric[] = [
    {
      title: 'Cluster Health',
      value: `${clusterHealth}%`,
      unit: 'running pod ratio',
      status: clusterHealth >= 95 ? 'healthy' : clusterHealth >= 80 ? 'warning' : 'critical',
      progress: clusterHealth,
    },
    {
      title: 'Active Incidents',
      value: incidents.length.toString(),
      unit: 'AI-analyzed warnings',
      status: incidents.length === 0 ? 'healthy' : incidents.length < 5 ? 'warning' : 'critical',
      progress: Math.min(100, incidents.length * 20),
    },
    {
      title: 'Running Pods',
      value: runningPods.toLocaleString(),
      unit: `${namespacePods.toLocaleString()} namespace pods`,
      status: failedPods === 0 ? 'healthy' : 'warning',
      progress: namespacePods === 0 ? 0 : Math.round((runningPods / namespacePods) * 100),
    },
    {
      title: 'Failed Pods',
      value: failedPods.toLocaleString(),
      unit: 'non-running namespace pods',
      status: failedPods === 0 ? 'healthy' : failedPods < 5 ? 'warning' : 'critical',
      progress: namespacePods === 0 ? 0 : Math.min(100, Math.round((failedPods / namespacePods) * 100)),
    },
    {
      title: 'Warning Events',
      value: warningEvents.toLocaleString(),
      unit: 'namespace events',
      status: warningEvents === 0 ? 'healthy' : warningEvents < 5 ? 'warning' : 'critical',
      progress: Math.min(100, warningEvents * 20),
    },
    {
      title: 'System Pods',
      value: systemPods.toLocaleString(),
      unit: `${totalPods.toLocaleString()} total cluster pods`,
      status: 'info',
      progress: 100,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time cluster metrics and health status</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.title} className="border-border bg-card hover:bg-secondary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${getStatusColor(metric.status)}`}>
                    <Activity className="w-3 h-3" />
                    <span>live</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{metric.unit}</p>
                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getStatusBar(metric.status)}`}
                    style={{ width: `${Math.max(4, Math.min(100, metric.progress))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
