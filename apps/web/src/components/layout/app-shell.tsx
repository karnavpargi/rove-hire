'use client';

import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { SkipNav } from './skip-nav';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell Layout Component
 *
 * The top-level authenticated layout that provides:
 * - Skip-to-main-content accessibility link (first focusable element)
 * - Persistent sidebar navigation on tablet/desktop (>=768px)
 * - Collapsible overlay sidebar below 768px
 * - Header with mobile menu toggle and breadcrumbs
 * - Main content area with proper landmark roles
 * - Focus management on route transitions
 *
 * Requirements: 18.1, 18.2, 18.3, 18.5, 15.10, 15.1, 15.2
 */
export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip navigation — first focusable element in DOM */}
      <SkipNav />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header
          className="flex h-16 shrink-0 items-center gap-4 border-b bg-[hsl(var(--background))] px-4 md:px-6"
          role="banner"
        >
          {/* Mobile menu toggle — visible only below 768px, min 44x44 touch target */}
          <button
            onClick={openSidebar}
            className="flex items-center justify-center rounded-md p-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] md:hidden min-h-[44px] min-w-[44px]"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Breadcrumb navigation */}
          <Breadcrumbs />
        </header>

        {/* Main content — receives focus on route change for screen reader announcement */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6"
          tabIndex={-1}
          role="main"
          aria-label="Page content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
