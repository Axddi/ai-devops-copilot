'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getIncidentHistory, type IncidentHistoryEntry } from '@/lib/api';

export function IncidentHistory() {
  const [entries, setEntries] = useState<IncidentHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getIncidentHistory()
      .then((history) => {
        if (!cancelled) {
          setEntries(history);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load incident history.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle>Incident History</CardTitle>
        <p className="text-sm text-muted-foreground">
          Saved pod errors, AI remediation plans, and runbooks. History is private to your account.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div role="alert" className="flex items-center gap-2 py-4 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No incident analyses have been saved yet.
          </p>
        ) : (
          entries.map((entry) => {
            const isExpanded = expanded === entry.id;
            return (
              <article key={entry.id} className="rounded-lg border border-border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-secondary/40"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm">{entry.pod}</span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.namespace} · {entry.messages[0] || entry.reasons.join(', ')}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <Badge variant="outline">{entry.severity}</Badge>
                    <time className="hidden text-xs text-muted-foreground sm:block" dateTime={entry.updated_at}>
                      {new Date(entry.updated_at).toLocaleString()}
                    </time>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-border p-4">
                    <section>
                      <h3 className="text-sm font-medium">Pod errors</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.reasons.join(', ') || 'No event reason was recorded.'}
                      </p>
                      {entry.messages.map((message, index) => (
                        <p key={`${message}-${index}`} className="mt-1 text-sm">{message}</p>
                      ))}
                    </section>
                    <section>
                      <h3 className="text-sm font-medium">Root cause</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.analysis.root_cause}</p>
                      <p className="mt-1 text-sm">{entry.analysis.explanation}</p>
                    </section>
                    <section>
                      <h3 className="text-sm font-medium">Remediation plan</h3>
                      <ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                        {entry.analysis.recommended_fix.map((step, index) => (
                          <li key={`${step}-${index}`}>{step}</li>
                        ))}
                      </ol>
                    </section>
                    <section>
                      <h3 className="text-sm font-medium">Runbook commands (suggestions only)</h3>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-secondary p-3 text-xs">
                        {entry.analysis.kubectl_commands.join('\n') || 'No commands were recorded.'}
                      </pre>
                    </section>
                    {entry.logs && (
                      <details>
                        <summary className="cursor-pointer text-sm font-medium">Pod logs</summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-secondary p-3 text-xs">
                          {entry.logs}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
