import { AppShell } from '@/components/layout';

/**
 * Dashboard Layout
 *
 * Wraps all authenticated pages with the AppShell component
 * providing sidebar navigation, breadcrumbs, and responsive behavior.
 *
 * Route group: (dashboard) — no URL prefix added.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
