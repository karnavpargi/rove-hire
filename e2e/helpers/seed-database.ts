import { execSync } from 'child_process';

/**
 * Re-seed the database to a known pipeline state.
 * Called before test groups that mutate terminal candidate statuses.
 */
export function reseedDatabase(): void {
  execSync('pnpm --filter @rove-hire/api exec prisma db seed', {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
}
