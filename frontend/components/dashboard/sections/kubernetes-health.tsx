'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Database, Loader2, Network, Package, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDashboard, getPrometheusScalar, type DashboardResponse } from '@/lib/api';

export function KubernetesHealth() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const dashboardData = await getDashboard();

        if (!cancelled) {
          setDashboard(dashboardData);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch Kubernetes health:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch Kubernetes health');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHealth();
    const interval = setInterval(loadHealth, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const pods = dashboard?.pods ?? [];
  const events = dashboard?.events ?? [];
  const prometheusRunningPods = dashboard ? getPrometheusScalar(dashboard.metrics.running) : 0;

  const healthyPods = useMemo(
    () =>
      pods.filter(
        (pod) =>
          pod.ready &&
          pod.status.toLowerCase() === 'running' &&
          pod.reason === 'Running'
      ),
    [pods]
  );

  const unhealthyPods = useMemo(
    () =>
      pods.filter(
        (pod) =>
          !(
            pod.ready &&
            pod.status.toLowerCase() === 'running' &&
            pod.reason === 'Running'
          )
      ),
    [pods]
  );

  const namespaceRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        name: string;
        pods: number;
        healthy: number;
        warning: number;
      }
    >();

    pods.forEach((pod) => {
      const current =
        rows.get(pod.namespace) ?? {
          name: pod.namespace,
          pods: 0,
          healthy: 0,
          warning: 0,
        };

      current.pods++;

      const isHealthy =
        pod.ready &&
        pod.status.toLowerCase() === 'running' &&
        pod.reason === 'Running';

      if (isHealthy) {
        current.healthy++;
      } else {
        current.warning++;
      }

      rows.set(pod.namespace, current);
    });

    return [...rows.values()].sort(
      (a, b) => b.warning - a.warning || b.pods - a.pods
    );
  }, [pods]);

  const totalPods =
    dashboard?.summary.pod_count || Math.max(pods.length, prometheusRunningPods);

  const runningPods =
    pods.length > 0 ? healthyPods.length : prometheusRunningPods;

  const warningPods =
    pods.length > 0
      ? unhealthyPods.length
      : Math.max(0, totalPods - prometheusRunningPods);

  const warningEvents = events.filter(
    (event) => event.type.toLowerCase() === 'warning'
  ).length;

  const namespaces = namespaceRows.length;

  const clusters = [
    {
      icon: Package,
      label: 'Pods',
      total: totalPods,
      healthy: runningPods,
      warning: warningPods,
    },
    {
      icon: Database,
      label: 'Namespaces',
      total: namespaces,
      healthy: namespaceRows.filter((row) => row.warning === 0).length,
      warning: namespaceRows.filter((row) => row.warning > 0).length,
    },
    {
      icon: Network,
      label: 'Events',
      total: events.length,
      healthy: events.length - warningEvents,
      warning: warningEvents,
    },
    {
      icon: Zap,
      label: 'Running',
      total: runningPods,
      healthy: runningPods,
      warning: warningPods,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kubernetes Cluster Health</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live infrastructure status from the backend Kubernetes client
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {clusters.map((cluster) => {
              const Icon = cluster.icon;
              const healthPercent =
                cluster.total === 0
                  ? 100
                  : Math.round((cluster.healthy / cluster.total) * 100);

              return (
                <Card
                  key={cluster.label}
                  className="border-border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-blue-500" />
                      <CardTitle className="text-sm">{cluster.label}</CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold">
                      {cluster.total.toLocaleString()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Health: {healthPercent}%</span>
                        <span className="text-green-400">
                          {cluster.healthy.toLocaleString()} healthy
                        </span>
                      </div>

                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${healthPercent}%` }}
                        />
                      </div>
                    </div>

                    {cluster.warning > 0 && (
                      <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 border w-fit text-xs">
                        {cluster.warning.toLocaleString()} warning
                        {cluster.warning > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Namespace Health Breakdown</CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              {namespaceRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pods returned by the backend.
                </p>
              ) : (
                <div className="space-y-4">
                  {namespaceRows.map((ns) => {
                    const healthPercent =
                      ns.pods === 0
                        ? 100
                        : Math.round((ns.healthy / ns.pods) * 100);

                    return (
                      <div
                        key={ns.name}
                        className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-sm font-semibold">
                              {ns.name}
                            </div>

                            <Badge className="bg-secondary text-xs text-muted-foreground">
                              {ns.pods} pods
                            </Badge>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-semibold">
                              {ns.healthy} healthy
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {healthPercent}%
                            </p>
                          </div>
                        </div>

                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              healthPercent === 100
                                ? 'bg-green-500'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${healthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}