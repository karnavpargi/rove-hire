/**
 * Auth layout — no sidebar, centered form.
 * Used for login page.
 * Includes proper landmark (main) for screen readers.
 *
 * Requirements: 15.1
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12"
      aria-label="Authentication"
    >
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
