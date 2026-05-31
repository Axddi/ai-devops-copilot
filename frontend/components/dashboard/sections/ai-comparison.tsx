'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';
import { getAnalyzedIncidents } from '@/lib/api';

const providers = [
  {
    name: 'Gemini Flash',
    badge: 'ACTIVE',
    rcaLatency: '1.2s',
    estimatedCost: '$0.001/req',
    confidence: '98%',
    remediationQuality: 'Excellent',
    benchmarks: {
      speed: 95,
      accuracy: 98,
      cost: 92,
      quality: 96,
    },
    features: ['Fast inference', 'High accuracy', 'Cost effective', 'Real-time analysis'],
  },
  {
    name: 'GPT-5 Mini',
    badge: 'AVAILABLE',
    rcaLatency: '2.1s',
    estimatedCost: '$0.003/req',
    confidence: '96%',
    remediationQuality: 'Very Good',
    benchmarks: {
      speed: 75,
      accuracy: 96,
      cost: 70,
      quality: 94,
    },
    features: ['Detailed analysis', 'Multi-step reasoning', 'Context aware', 'Edge cases handled'],
  },
  {
    name: 'Claude Sonnet',
    badge: 'AVAILABLE',
    rcaLatency: '3.5s',
    estimatedCost: '$0.005/req',
    confidence: '94%',
    remediationQuality: 'Excellent',
    benchmarks: {
      speed: 60,
      accuracy: 94,
      cost: 50,
      quality: 98,
    },
    features: ['Complex reasoning', 'Natural explanations', 'Best for research', 'Comprehensive'],
  },
];

export function AIComparison() {
  const [activeProvider, setActiveProvider] = useState('gemini-2.5-flash');

  useEffect(() => {
    let cancelled = false;

    async function loadProvider() {
      try {
        const incidents = await getAnalyzedIncidents();
        const provider = incidents.find((item) => item.provider)?.provider;

        if (!cancelled && provider) {
          setActiveProvider(provider);
        }
      } catch (error) {
        console.error('Failed to fetch active AI provider:', error);
      }
    }

    loadProvider();
    const interval = setInterval(loadProvider, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeProviderName = activeProvider.toLowerCase().includes('gemini') ? 'Gemini Flash' : activeProvider;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Provider Comparison</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Backend active provider: {activeProvider}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {providers.map((provider, idx) => {
          const isActive = provider.name === activeProviderName;

          return (
          <Card
            key={idx}
            className={`border-2 transition-colors cursor-pointer ${
              isActive
                ? 'border-blue-500/50 bg-blue-500/5'
                : 'border-border bg-card hover:border-border'
            }`}
          >
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg font-semibold">{provider.name}</CardTitle>
                <Badge
                  className={`${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-green-500/20 text-green-400 border-green-500/30'
                  } border text-xs font-semibold`}
                >
                  {isActive && <Zap className="w-3 h-3 inline mr-1" />}
                  {isActive ? 'ACTIVE' : provider.badge}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Key Metrics */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Performance</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">RCA Latency</p>
                    <p className="font-mono font-semibold text-foreground">{provider.rcaLatency}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Cost per RCA</p>
                    <p className="font-mono font-semibold text-foreground">{provider.estimatedCost}</p>
                  </div>
                </div>
              </div>

              {/* Quality Metrics */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Quality</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-xs font-semibold text-green-400">{provider.confidence}</p>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: provider.confidence }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Remediation Quality: </span>
                  <span className="font-semibold text-amber-400">{provider.remediationQuality}</span>
                </p>
              </div>

              {/* Benchmarks */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Benchmarks</h3>
                <div className="space-y-2">
                  {Object.entries(provider.benchmarks).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-muted-foreground capitalize">{key}</p>
                        <p className="text-xs font-semibold text-foreground">{value}%</p>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Key Features</h3>
                <div className="space-y-1">
                  {provider.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              {isActive && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-400">
                    <span className="font-semibold">Currently Active</span> - Optimized for your workload
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Detailed Comparison Table */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm">Detailed Comparison</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Metric</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Gemini Flash</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">GPT-5 Mini</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Claude Sonnet</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Latency', values: ['1.2s', '2.1s', '3.5s'] },
                  { metric: 'Cost per RCA', values: ['$0.001', '$0.003', '$0.005'] },
                  { metric: 'RCA Confidence', values: ['98%', '96%', '94%'] },
                  { metric: 'Token Limit', values: ['2M', '1M', '2M'] },
                  { metric: 'Batch Processing', values: ['Yes', 'Yes', 'No'] },
                  { metric: 'Custom Training', values: ['Limited', 'Available', 'Available'] },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-secondary/30">
                    <td className="py-3 px-4 text-foreground font-medium">{row.metric}</td>
                    {row.values.map((value, vidx) => (
                      <td key={vidx} className="py-3 px-4 text-muted-foreground">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-blue-500/30 bg-blue-500/5 border-2">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-400">Recommendation</h3>
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-semibold text-blue-400">Gemini Flash</span> is currently the optimal choice for your
              workload. It provides the fastest RCA latency (1.2s), highest confidence (98%), and lowest cost. For
              complex incident analysis requiring deep reasoning, consider{' '}
              <span className="font-semibold text-amber-400">Claude Sonnet</span> for critical incidents. For detailed
              step-by-step remediation guidance,{' '}
              <span className="font-semibold text-amber-400">GPT-5 Mini</span> provides excellent results.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
