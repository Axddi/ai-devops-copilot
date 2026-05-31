'use client';

import React from 'react';
import { PlatformOverview } from './sections/platform-overview';
import { IncidentsTable } from './sections/incidents-table';
import { RootCausePanel } from './sections/root-cause-panel';
import { KubernetesHealth } from './sections/kubernetes-health';
import { Observability } from './sections/observability';
import { AIComparison } from './sections/ai-comparison';

interface ContentProps {
  activeSection: string;
}

export function DashboardContent({ activeSection }: ContentProps) {
  const renderContent = () => {
    switch (activeSection) {
      case 'incidents':
        return (
          <div className="space-y-6">
            <IncidentsTable />
            <RootCausePanel />
          </div>
        );
      case 'kubernetes':
        return <KubernetesHealth />;
      case 'logs':
        return <Observability defaultTab="logs" />;
      case 'metrics':
        return <Observability defaultTab="metrics" />;
      case 'ai-analysis':
        return <AIComparison />;
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <p className="text-muted-foreground">Settings configuration coming soon.</p>
          </div>
        );
      case 'alerts':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Alerts</h1>
            <p className="text-muted-foreground">Alert rules configuration coming soon.</p>
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            <PlatformOverview />
            <IncidentsTable />
            <RootCausePanel />
            <KubernetesHealth />
          </div>
        );
    }
  };

  return (
    <div className="p-6 bg-background">
      {renderContent()}
    </div>
  );
}
