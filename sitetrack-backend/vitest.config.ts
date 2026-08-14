import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Force sequential test file execution: all files share the same in-memory
    // MongoDB instance (started by globalSetup.ts), so they must not run in
    // parallel. maxWorkers:1 is the Vitest 4 compatible way to achieve this.
    maxWorkers: 1,
    minWorkers: 1,
    pool: 'forks',
    globalSetup: './src/__tests__/globalSetup.ts',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    environment: 'node',
  },
})



