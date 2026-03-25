import type { HubTokenClaims } from '../types/hub-user.js'

/**
 * Creates a mock HubTokenClaims object for unit tests that don't need
 * actual JWT verification (e.g., testing route handlers directly).
 */
export function mockHubClaims(overrides: Partial<HubTokenClaims> = {}): HubTokenClaims {
  const now = Math.floor(Date.now() / 1000)
  return {
    sub: '1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    role: 'student',
    plan: 'free',
    features: [],
    apps: ['writing-buddy'],
    expiresAt: null,
    iat: now,
    exp: now + 900,
    ...overrides,
  }
}
