'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Boxes, CircleAlert, RefreshCw, ShieldCheck } from 'lucide-react';

interface DemoStatus {
  namespace: string;
  deployments: {
    name: string;
    ready_replicas: number;
    desired_replicas: number;
    available_replicas: number;
  }[];
  pods: {
    name: string;
    status: string;
    ready: boolean;
    reason: string | null;
  }[];
}

export default function PublicDemoPage() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/backend/demo/status', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Demo status request failed (${response.status})`);
      }
      const data: unknown = await response.json();
      if (
        typeof data !== 'object' ||
        data === null ||
        !('namespace' in data) ||
        typeof data.namespace !== 'string' ||
        !('deployments' in data) ||
        !Array.isArray(data.deployments) ||
        !('pods' in data) ||
        !Array.isArray(data.pods)
      ) {
        throw new Error('The demo status response was invalid');
      }
      setStatus(data as DemoStatus);
      setUpdatedAt(new Date());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load live demo status',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const readyPods = status?.pods.filter((pod) => pod.ready).length ?? 0;
  const unhealthyPods = (status?.pods.length ?? 0) - readyPods;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-900 bg-cyan-950/60 px-3 py-1 text-xs text-cyan-300">
              <Activity className="h-3.5 w-3.5" />
              Live EKS demo
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              AI DevOps Copilot
            </h1>
            <p className="mt-2 text-slate-400">
              Read-only view of workload health in the{' '}
              <span className="font-mono text-slate-300">
                {status?.namespace ?? 'demo'} namespace
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Cluster summary">
          <SummaryCard
            icon={<Boxes className="h-5 w-5 text-cyan-300" />}
            label="Deployments"
            value={status?.deployments.length ?? '—'}
          />
          <SummaryCard
            icon={<ShieldCheck className="h-5 w-5 text-emerald-300" />}
            label="Ready pods"
            value={status ? `${readyPods} / ${status.pods.length}` : '—'}
          />
          <SummaryCard
            icon={<CircleAlert className="h-5 w-5 text-amber-300" />}
            label="Pods needing attention"
            value={status ? unhealthyPods : '—'}
          />
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <StatusList
            title="Deployments"
            empty="No deployments found."
            loading={loading && !status}
          >
            {status?.deployments.map((deployment) => {
              const ready = deployment.ready_replicas >= deployment.desired_replicas;
              return (
                <div key={deployment.name} className="flex items-center justify-between gap-4 border-b border-slate-800 py-4 last:border-0">
                  <span className="font-mono text-sm">{deployment.name}</span>
                  <span className={`text-sm ${ready ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {deployment.ready_replicas} / {deployment.desired_replicas} ready
                  </span>
                </div>
              );
            })}
          </StatusList>

          <StatusList title="Pods" empty="No pods found." loading={loading && !status}>
            {status?.pods.map((pod) => (
              <div key={pod.name} className="flex items-center justify-between gap-4 border-b border-slate-800 py-4 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{pod.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {pod.ready ? pod.status : 'Container is not ready'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${pod.ready ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>
                {pod.ready ? 'Ready' : pod.reason ?? 'Not ready'}
              </span>
              </div>
            ))}
          </StatusList>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-5 text-xs text-slate-500">
          <span>Public demo · Read-only · No logs, credentials, or remediation controls</span>
          <span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : 'Waiting for live status'}</span>
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function StatusList({
  title,
  empty,
  loading,
  children,
}: {
  title: string;
  empty: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-5">
      <h2 className="border-b border-slate-800 py-4 text-lg font-medium">{title}</h2>
      {loading ? (
        <p className="py-6 text-sm text-slate-500">Loading live cluster status…</p>
      ) : hasChildren ? (
        children
      ) : (
        <p className="py-6 text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}
