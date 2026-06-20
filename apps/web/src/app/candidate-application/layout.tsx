import Link from 'next/link';
import { SkipNav } from '@/components/layout/skip-nav';

export default function CandidateApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F0F9FF] dark:bg-background">
      <SkipNav />
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
              aria-hidden="true"
            >
              R
            </span>
            ROVE Hire
          </Link>
          <span className="text-xs text-muted-foreground">Candidate Application</span>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-lg px-4 py-8">
        {children}
      </main>
    </div>
  );
}
