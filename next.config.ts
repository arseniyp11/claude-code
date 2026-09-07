import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright spawns its own `next dev` on a separate port for E2E runs.
  // Without a distinct distDir it shares .next/dev/lock with a developer's
  // already-running `bun dev`, and the second process refuses to start.
  ...(process.env.E2E ? { distDir: '.next-e2e' } : {}),
};

export default nextConfig;
