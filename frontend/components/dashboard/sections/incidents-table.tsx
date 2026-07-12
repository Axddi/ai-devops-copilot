'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAnalyzedIncidents, type AnalyzedIncident } from '@/lib/api';

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    default:
      return 'bg-green-500/10 text-green-500 border-green-500/20';
  }
}

export function IncidentsTable() {
  const [incidents, setIncidents] = useState<AnalyzedIncident[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchIncidents(force = false) {
    setRefreshing(true);

    try {
      const data = await getAnalyzedIncidents({ force });
      setIncidents(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchIncidents();

    const interval = setInterval(() => {
      fetchIncidents();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Live Incidents</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered Kubernetes incident analysis
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchIncidents(true)}
                disabled={refreshing}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              <div>
                <div className="text-2xl font-bold text-red-500">
                  {incidents.length}
                </div>
                <p className="text-xs text-muted-foreground">active incidents</p>
              </div>
            </div>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-6 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No warning incidents returned by the backend.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12" />
                  <TableHead>Severity</TableHead>
                  <TableHead>Pod</TableHead>
                  <TableHead>Root Cause</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {incidents.map((item, index) => (
                  <React.Fragment key={`${item.incident.pod}-${index}`}>
                    <TableRow
                      className="border-border hover:bg-secondary/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === index ? null : index)}
                    >
                      <TableCell>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedId === index ? 'rotate-180' : ''
                          }`}
                        />
                      </TableCell>

                      <TableCell>
                        <Badge className={`${getSeverityColor(item.incident.severity)} border`}>
                          {item.incident.severity}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {item.incident.pod}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-amber-400">
                        {item.ai_analysis.root_cause}
                      </TableCell>

                      <TableCell className="text-xs text-blue-400">
                        {item.provider}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lastUpdated ? lastUpdated.toLocaleTimeString() : 'live'}
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedId === index && (
                      <TableRow className="border-border bg-secondary/20">
                        <TableCell colSpan={6}>
                          <div className="space-y-5 py-4">
                            {item.ai_analysis.status !== 'success' && (
                              <div className="flex items-start gap-3 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                  {item.ai_analysis.error?.message ||
                                    'AI analysis is unavailable. Showing Kubernetes-derived fallback analysis.'}
                                </span>
                              </div>
                            )}

                            <div>
                              <h4 className="font-semibold mb-2">Incident Events</h4>
                              <div className="space-y-2">
                                {item.incident.messages.length > 0 ? (
                                  item.incident.messages.map((message, i) => (
                                    <p
                                      key={`${message}-${i}`}
                                      className="text-sm text-muted-foreground bg-secondary/50 rounded-md border border-border px-3 py-2"
                                    >
                                      {message}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No event messages were returned for this incident.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">AI Explanation</h4>
                              <p className="text-sm text-muted-foreground leading-6">
                                {item.ai_analysis.explanation}
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Recommended Fixes</h4>
                              <ul className="space-y-2">
                                {item.ai_analysis.recommended_fix.length > 0 ? (
                                  item.ai_analysis.recommended_fix.map((fix, i) => (
                                    <li key={i} className="text-sm text-muted-foreground">
                                      - {fix}
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-sm text-muted-foreground">
                                    No remediation steps were returned.
                                  </li>
                                )}
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Suggested Commands</h4>
                              <div className="space-y-2">
                                {item.ai_analysis.kubectl_commands.length > 0 ? (
                                  item.ai_analysis.kubectl_commands.map((cmd, i) => (
                                    <div
                                      key={i}
                                      className="bg-black rounded-lg px-3 py-2 font-mono text-xs text-green-400 overflow-x-auto"
                                    >
                                      {cmd}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No kubectl commands were returned.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Log Excerpt</h4>
                              <pre className="bg-black rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                                {item.incident.logs || 'No log excerpt returned.'}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
