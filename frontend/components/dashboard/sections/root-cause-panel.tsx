'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronUp, Copy, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalyzedIncidents, type AnalyzedIncident } from '@/lib/api';

export function RootCausePanel() {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [incident, setIncident] = useState<AnalyzedIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRootCause() {
      try {
        const incidents = await getAnalyzedIncidents();

        if (!cancelled) {
          setIncident(incidents[0] ?? null);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch root cause:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch root cause');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRootCause();
    const interval = setInterval(loadRootCause, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const copyToClipboard = () => {
    const command = incident?.ai_analysis.kubectl_commands[0];

    if (!command) {
      return;
    }

    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!expanded) {
    return (
      <Card className="border-border bg-card cursor-pointer" onClick={() => setExpanded(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">AI Root Cause Analysis</span>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 border text-xs">
                Collapsed
              </Badge>
            </div>
            <ChevronUp className="w-4 h-4 text-muted-foreground rotate-180" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">AI Root Cause Analysis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {incident ? `Powered by ${incident.provider}` : 'Powered by the backend AI analysis endpoint'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : !incident ? (
          <p className="text-sm text-muted-foreground">No active incidents returned for root cause analysis.</p>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Incident Summary</h3>
              <div className="bg-secondary/50 rounded-lg p-4 border border-border space-y-2">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Pod:</span> {incident.incident.pod}
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Severity:</span> {incident.incident.severity}
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Reasons:</span>{' '}
                  {incident.incident.reasons.length > 0 ? incident.incident.reasons.join(', ') : 'none returned'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">AI Explanation</h3>
              <div className="bg-secondary/50 rounded-lg p-4 border border-border text-sm text-foreground leading-relaxed">
                <p>{incident.ai_analysis.explanation}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Root Cause</h3>
              <div className="bg-red-500/5 rounded-lg p-4 border border-red-500/20 text-sm space-y-2">
                <p className="text-red-400 font-semibold">{incident.ai_analysis.root_cause}</p>
                <p className="text-foreground">
                  {incident.incident.messages.length > 0
                    ? incident.incident.messages[0]
                    : 'No Kubernetes event message was returned for this incident.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Recommended Fixes</h3>
              <div className="space-y-2">
                {incident.ai_analysis.recommended_fix.length > 0 ? (
                  incident.ai_analysis.recommended_fix.map((fix, index) => (
                    <div key={`${fix}-${index}`} className="bg-green-500/5 rounded-lg p-3 border border-green-500/20 text-sm">
                      <p className="font-semibold text-green-400 mb-2">{index + 1}. Recommended action</p>
                      <p className="text-foreground text-xs">{fix}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No remediation steps were returned.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Suggested kubectl Commands</h3>
              <div className="space-y-2">
                {incident.ai_analysis.kubectl_commands.length > 0 ? (
                  incident.ai_analysis.kubectl_commands.map((command, index) => (
                    <div key={`${command}-${index}`} className="bg-secondary/70 rounded-lg p-3 border border-border font-mono text-xs text-amber-400 relative group">
                      <code className="block break-all pr-10">{command}</code>
                      {index === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={copyToClipboard}
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No kubectl commands were returned.</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
