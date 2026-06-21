import { execSync } from 'child_process';

/**
 * Global setup: re-seed the database before E2E tests
 * so each run starts from a known pipeline state.
 */
export default async function globalSetup(): Promise<void> {
  execSync('pnpm --filter @rove-hire/api exec prisma db seed', {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}
