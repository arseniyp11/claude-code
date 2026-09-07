import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // See test/server-only-stub.ts for why this needs aliasing.
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // The default `forks` pool spawns plain Node child processes, which can't
    // resolve Bun built-ins like `bun:sqlite`. `threads` runs inside the Bun
    // process itself via worker_threads, which Bun implements natively.
    pool: 'threads',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
