'use client';

import React from 'react';
import {
  LayoutDashboard,
  AlertCircle,
  Package,
  FileText,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'incidents', label: 'Incidents', icon: AlertCircle },
  { id: 'kubernetes', label: 'Kubernetes', icon: Database },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'ai-analysis', label: 'AI Analysis', icon: Sparkles },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-56 border-r border-border bg-card overflow-y-auto flex flex-col">
      <div className="p-4 space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <Button
              key={section.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 text-sm font-medium ${
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              onClick={() => onSectionChange(section.id)}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-border space-y-2 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground text-xs">Quick Links</div>
        <a href="#" className="block hover:text-foreground transition-colors">
          Documentation
        </a>
        <a href="#" className="block hover:text-foreground transition-colors">
          Status Page
        </a>
        <a href="#" className="block hover:text-foreground transition-colors">
          Support
        </a>
      </div>
    </aside>
  );
}
