'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Briefcase,
  UserPlus,
  Calendar,
  FileText,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/shared/theme-toggle';

/**
 * Navigation items for the sidebar.
 * Each maps to a top-level route in the (dashboard) group.
 */
const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Add Candidate', href: '/candidates/new', icon: UserPlus },
  { label: 'Interviews', href: '/interviews', icon: Calendar },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

function getUserInitials(name: string | undefined, email: string | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'HR';
}

interface SidebarProps {
  /** Whether the mobile overlay sidebar is open */
  isOpen: boolean;
  /** Callback to close the mobile sidebar */
  onClose: () => void;
}

/**
 * Sidebar Navigation Component
 *
 * Persistent sidebar on tablet/desktop (>=768px) with navigation items.
 * Collapses to an overlay menu below 768px with backdrop.
 * Highlights active route with distinct background and bold text.
 * Implements focus trap when open in mobile overlay mode.
 *
 * Requirements: 18.1, 18.2, 18.5, 15.2
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const userInitials = getUserInitials(user?.name, user?.email);
  const displayName = user?.name || 'HR User';
  const displayEmail = user?.email || '';

  /**
   * Determine if a nav item is currently active.
   * Dashboard (/) is active only on exact match.
   * Other items are active if pathname starts with their href.
   */
  function isActive(href: string): boolean {
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/candidates/new') {
      return pathname === '/candidates/new';
    }
    return pathname.startsWith(href);
  }

  // Focus trap for mobile sidebar (Requirements: 15.2, 15.8)
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button within 100ms when sidebar opens
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    // Trap focus within sidebar when in mobile overlay mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const sidebar = sidebarRef.current;
        if (!sidebar) return;

        const focusable = Array.from(
          sidebar.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile backdrop overlay — visible only below 768px */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar navigation */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-[hsl(var(--sidebar))] transition-transform duration-300 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        {/* Logo / Brand header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-[hsl(var(--foreground))]"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white"
              aria-hidden="true"
            >
              R
            </span>
            ROVE Hire
          </Link>
          {/* Mobile close button — visible only below 768px */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex items-center justify-center rounded-md p-2 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] md:hidden min-h-[44px] min-w-[44px]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Sidebar navigation">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors min-h-[44px]',
                  active
                    ? 'bg-primary-50 font-semibold text-primary-700'
                    : 'font-medium text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    active ? 'text-primary-600' : 'text-[hsl(var(--sidebar-foreground))]',
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer area */}
        <div className="border-t px-3 py-4 space-y-2">
          <div className="flex items-center justify-end px-1">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[hsl(var(--sidebar-foreground))]">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                {displayName}
              </p>
              {displayEmail && (
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                  {displayEmail}
                </p>
              )}
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              data-touch-target="true"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
