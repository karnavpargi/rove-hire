import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { RouteChangeAnnouncer } from '@/components/accessibility/route-change-announcer';
import { GlobalLiveRegions } from '@/components/accessibility/live-region';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'ROVE Hire',
  description: 'Internal recruitment management tool for ROVE HR team',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              {/* Screen reader route announcements (Requirements: 15.1, 15.8) */}
              <RouteChangeAnnouncer />
              {/* Global ARIA live regions for dynamic updates (Requirements: 15.6) */}
              <GlobalLiveRegions />
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
