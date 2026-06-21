/**
 * Auth layout — split branded panel on desktop, centered form on mobile.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Branded panel — desktop only */}
      <aside
        className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-primary p-12 text-primary-foreground"
        aria-hidden="true"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15 text-lg font-bold">
              R
            </span>
            <span className="text-xl font-semibold">ROVE Hire</span>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-heading-1 text-primary-foreground">
            Manage hiring from first application to offer letter.
          </h1>
          <p className="text-body text-primary-foreground/80 max-w-md">
            The internal recruitment tool for the ROVE HR team. Track candidates, schedule
            interviews, and generate offer documents in one place.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Internal access only. Authorized HR personnel.
        </p>
      </aside>

      <main
        className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12"
        aria-label="Authentication"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
