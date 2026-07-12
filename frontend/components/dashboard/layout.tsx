'use client';

import React, { useState } from 'react';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { DashboardContent } from './content';

export function DashboardLayout() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <DashboardContent activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}
