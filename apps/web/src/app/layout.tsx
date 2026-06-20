import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { RouteChangeAnnouncer } from '@/components/accessibility/route-change-announcer';
import { GlobalLiveRegions } from '@/components/accessibility/live-region';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ROVE Hire',
  description: 'Internal recruitment management tool for ROVE HR team',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
            {/* Screen reader route announcements (Requirements: 15.1, 15.8) */}
            <RouteChangeAnnouncer />
            {/* Global ARIA live regions for dynamic updates (Requirements: 15.6) */}
            <GlobalLiveRegions />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
