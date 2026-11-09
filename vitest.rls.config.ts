import { defineConfig } from 'vitest/config';
import path from 'path';

// Role-level tests against the LOCAL Supabase stack (see docs/TESTING.md). Not part of `test:unit`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
