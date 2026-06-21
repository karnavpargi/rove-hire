'use client';

/**
 * Settings Page — `/settings`
 *
 * System settings page with placeholder content for the evaluator.
 * Displays application version info and system configuration sections.
 *
 * Validates: Requirement 7.9 (navigation completeness)
 */

import * as React from 'react';
import { SettingsIcon, InfoIcon, DatabaseIcon, ShieldIcon, BellIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Application Info */}
      <SettingsSection
        icon={<InfoIcon className="h-5 w-5 text-muted-foreground" />}
        title="Application Info"
        description="System version and environment details"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem label="Application" value="ROVE Hire" />
          <InfoItem label="Version" value="1.0.0" />
          <InfoItem label="Environment" value="Development" />
          <InfoItem label="API Endpoint" value={process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3001/graphql'} />
        </div>
      </SettingsSection>

      {/* Database Settings */}
      <SettingsSection
        icon={<DatabaseIcon className="h-5 w-5 text-muted-foreground" />}
        title="Database"
        description="Database connection and storage configuration"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem label="Database" value="PostgreSQL 16" />
          <InfoItem label="ORM" value="Prisma" />
          <InfoItem label="File Storage" value="AWS S3" />
          <InfoItem label="PDF Engine" value="Puppeteer (Chromium)" />
        </div>
      </SettingsSection>

      {/* Security Settings */}
      <SettingsSection
        icon={<ShieldIcon className="h-5 w-5 text-muted-foreground" />}
        title="Security"
        description="Authentication and authorization settings"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem label="Auth Method" value="JWT (HttpOnly Cookie)" />
          <InfoItem label="Session Duration" value="8 hours" />
          <InfoItem label="Rate Limiting" value="5 attempts / 15 min" />
          <InfoItem label="Magic Link Expiry" value="14 days" />
        </div>
      </SettingsSection>

      {/* Notification Settings (Placeholder) */}
      <SettingsSection
        icon={<BellIcon className="h-5 w-5 text-muted-foreground" />}
        title="Notifications"
        description="Email and in-app notification preferences"
      >
        <p className="text-sm text-muted-foreground">
          Notification settings will be available in a future release.
        </p>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div className="flex items-center gap-3">
      <SettingsIcon className="h-6 w-6 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          System configuration and application information
        </p>
      </div>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
