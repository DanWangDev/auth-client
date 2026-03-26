import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  revokeSubject,
  isRevoked,
  unrevokeSubject,
  clearRevocations,
} from './revocation-registry.js'

describe('revocation-registry', () => {
  beforeEach(() => {
    clearRevocations()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for unknown subjects', () => {
    expect(isRevoked('unknown-sub')).toBe(false)
  })

  it('returns true for revoked subjects', () => {
    revokeSubject('user-42')

    expect(isRevoked('user-42')).toBe(true)
  })

  it('returns false after expiry', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    revokeSubject('user-42', 60) // 60 seconds TTL

    expect(isRevoked('user-42')).toBe(true)

    // Advance past the TTL
    vi.setSystemTime(now + 61_000)

    expect(isRevoked('user-42')).toBe(false)
  })

  it('removes entry via unrevokeSubject', () => {
    revokeSubject('user-42')

    expect(isRevoked('user-42')).toBe(true)

    unrevokeSubject('user-42')

    expect(isRevoked('user-42')).toBe(false)
  })

  it('clears all revocations', () => {
    revokeSubject('user-1')
    revokeSubject('user-2')
    revokeSubject('user-3')

    clearRevocations()

    expect(isRevoked('user-1')).toBe(false)
    expect(isRevoked('user-2')).toBe(false)
    expect(isRevoked('user-3')).toBe(false)
  })

  it('tracks multiple subjects independently', () => {
    revokeSubject('user-1')
    revokeSubject('user-2')

    expect(isRevoked('user-1')).toBe(true)
    expect(isRevoked('user-2')).toBe(true)
    expect(isRevoked('user-3')).toBe(false)

    unrevokeSubject('user-1')

    expect(isRevoked('user-1')).toBe(false)
    expect(isRevoked('user-2')).toBe(true)
  })

  it('uses default TTL of 7 days', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    revokeSubject('user-42')

    // Just before 7 days
    vi.setSystemTime(now + 604_799_000)
    expect(isRevoked('user-42')).toBe(true)

    // After 7 days
    vi.setSystemTime(now + 604_801_000)
    expect(isRevoked('user-42')).toBe(false)
  })

  it('prunes expired entries lazily', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    revokeSubject('user-old', 10)
    revokeSubject('user-new', 3600)

    // Advance past old entry TTL and past prune interval (60s)
    vi.setSystemTime(now + 61_000)

    // isRevoked triggers lazy prune
    expect(isRevoked('user-new')).toBe(true)
    // Old entry should have been pruned
    expect(isRevoked('user-old')).toBe(false)
  })

  it('unrevokeSubject is no-op for unknown subjects', () => {
    expect(() => unrevokeSubject('unknown-sub')).not.toThrow()
  })
})
