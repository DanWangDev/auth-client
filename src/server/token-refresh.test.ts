import { describe, it, expect, vi } from 'vitest'
import { refreshAccessToken } from './token-refresh.js'
import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'
import type { TokenSet } from '../types/token-set.js'

vi.mock('./logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

const config: AuthServerConfig = {
  issuer: 'https://hub.labf.app',
  clientId: 'test-client',
  clientSecret: 'secret',
  redirectUri: 'https://app.labf.app/auth/callback',
  postLogoutRedirectUri: 'https://app.labf.app',
  sessionSecret: 'a-very-long-secret-at-least-32-chars!',
}

const metadata: OidcMetadata = {
  issuer: 'https://hub.labf.app',
  authorization_endpoint: 'https://hub.labf.app/oidc/auth',
  token_endpoint: 'https://hub.labf.app/oidc/token',
  userinfo_endpoint: 'https://hub.labf.app/oidc/me',
  jwks_uri: 'https://hub.labf.app/oidc/jwks',
}

const currentTokens: TokenSet = {
  access_token: 'old_at',
  refresh_token: 'rt_123',
  id_token: 'old_idt',
  expires_at: Math.floor(Date.now() / 1000) - 60, // expired
}

describe('token-refresh', () => {
  it('refreshes the access token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_at',
          refresh_token: 'new_rt',
          id_token: 'new_idt',
          token_type: 'Bearer',
          expires_in: 900,
        }),
    })

    const result = await refreshAccessToken(currentTokens, config, metadata, mockFetch)

    expect(result.access_token).toBe('new_at')
    expect(result.refresh_token).toBe('new_rt')
    expect(result.id_token).toBe('new_idt')
    expect(result.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('keeps old refresh_token if not returned', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_at',
          token_type: 'Bearer',
          expires_in: 900,
        }),
    })

    const result = await refreshAccessToken(currentTokens, config, metadata, mockFetch)

    expect(result.refresh_token).toBe('rt_123')
    expect(result.id_token).toBe('old_idt')
  })

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('invalid_grant'),
    })

    await expect(refreshAccessToken(currentTokens, config, metadata, mockFetch)).rejects.toThrow(
      'Token refresh failed: 400',
    )
  })

  it('throws if no refresh_token available', async () => {
    const noRefresh: TokenSet = { ...currentTokens, refresh_token: '' }

    await expect(refreshAccessToken(noRefresh, config, metadata)).rejects.toThrow(
      'No refresh token available',
    )
  })

  it('sends correct refresh parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new_at',
          token_type: 'Bearer',
        }),
    })

    await refreshAccessToken(currentTokens, config, metadata, mockFetch)

    const body = mockFetch.mock.calls[0]?.[1]?.body as string
    const params = new URLSearchParams(body)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('rt_123')
    expect(params.get('client_id')).toBe('test-client')
    expect(params.get('client_secret')).toBe('secret')
  })
})
