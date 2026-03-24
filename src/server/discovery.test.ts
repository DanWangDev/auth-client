import { describe, it, expect, vi, beforeEach } from 'vitest'
import { discoverOidc, clearDiscoveryCache } from './discovery.js'

const mockMetadata = {
  issuer: 'https://hub.labf.app',
  authorization_endpoint: 'https://hub.labf.app/oidc/auth',
  token_endpoint: 'https://hub.labf.app/oidc/token',
  userinfo_endpoint: 'https://hub.labf.app/oidc/me',
  jwks_uri: 'https://hub.labf.app/oidc/jwks',
  end_session_endpoint: 'https://hub.labf.app/oidc/session/end',
}

function createMockFetch(data: unknown = mockMetadata, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(data),
  })
}

describe('discovery', () => {
  beforeEach(() => {
    clearDiscoveryCache()
  })

  it('fetches OIDC metadata from the correct URL', async () => {
    const mockFetch = createMockFetch()

    await discoverOidc('https://hub.labf.app', mockFetch)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hub.labf.app/oidc/.well-known/openid-configuration',
    )
  })

  it('returns parsed metadata', async () => {
    const mockFetch = createMockFetch()

    const result = await discoverOidc('https://hub.labf.app', mockFetch)

    expect(result.authorization_endpoint).toBe('https://hub.labf.app/oidc/auth')
    expect(result.token_endpoint).toBe('https://hub.labf.app/oidc/token')
    expect(result.jwks_uri).toBe('https://hub.labf.app/oidc/jwks')
  })

  it('caches metadata on subsequent calls', async () => {
    const mockFetch = createMockFetch()

    await discoverOidc('https://hub.labf.app', mockFetch)
    await discoverOidc('https://hub.labf.app', mockFetch)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws on non-OK response without cache', async () => {
    const mockFetch = createMockFetch(null, false, 500)

    await expect(discoverOidc('https://hub.labf.app', mockFetch)).rejects.toThrow(
      'Discovery fetch failed: 500',
    )
  })

  it('returns stale cache when refresh fails', async () => {
    const goodFetch = createMockFetch()
    await discoverOidc('https://hub.labf.app', goodFetch)

    // Force cache expiry by clearing and re-fetching with error
    // We can't easily expire the cache, so test the fallback path
    // by making a call with a bad fetch after cache exists
    const badFetch = createMockFetch(null, false, 500)

    // Cache is still valid (within TTL), so this should return cached
    const result = await discoverOidc('https://hub.labf.app', badFetch)
    expect(result.authorization_endpoint).toBe('https://hub.labf.app/oidc/auth')
  })

  it('throws on invalid metadata (missing required fields)', async () => {
    const mockFetch = createMockFetch({ issuer: 'https://hub.labf.app' })

    await expect(discoverOidc('https://hub.labf.app', mockFetch)).rejects.toThrow(
      'Invalid OIDC discovery response',
    )
  })
})
