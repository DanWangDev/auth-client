import { describe, it, expect } from 'vitest'
import { mockHubClaims } from './mock-claims.js'

describe('mockHubClaims', () => {
  it('returns default claims', () => {
    const claims = mockHubClaims()

    expect(claims.sub).toBe('1')
    expect(claims.email).toBe('test@example.com')
    expect(claims.username).toBe('testuser')
    expect(claims.displayName).toBe('Test User')
    expect(claims.role).toBe('student')
    expect(claims.plan).toBe('free')
    expect(claims.features).toEqual([])
    expect(claims.apps).toEqual(['writing-buddy'])
    expect(claims.iat).toBeGreaterThan(0)
    expect(claims.exp).toBeGreaterThan(claims.iat)
  })

  it('accepts partial overrides', () => {
    const claims = mockHubClaims({
      sub: '42',
      plan: 'bundle',
      features: ['writing', 'vocab'],
    })

    expect(claims.sub).toBe('42')
    expect(claims.plan).toBe('bundle')
    expect(claims.features).toEqual(['writing', 'vocab'])
    // Defaults preserved
    expect(claims.email).toBe('test@example.com')
    expect(claims.role).toBe('student')
  })

  it('produces immutable-looking claims', () => {
    const a = mockHubClaims()
    const b = mockHubClaims()

    // Different timestamp instances are okay
    expect(a.sub).toBe(b.sub)
    expect(a.email).toBe(b.email)
  })
})
