import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts',
        'src/react/**',
        'src/server/routes.ts',
        'src/server/session.ts',
        'src/server/middleware.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 80,
        functions: 70,
        lines: 70,
      },
    },
  },
})
