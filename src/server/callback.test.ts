import { describe, it, expect, vi } from 'vitest'
import { exchangeCode } from './callback.js'
import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'

vi.mock('./logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock jwt verification — we test jwt.ts separately
vi.mock('./jwt.js', () => ({
  verifyIdToken: vi.fn().mockResolvedValue({
    sub: '42',
    username: 'emma',
    display_name: 'Emma Wang',
    email: 'emma@example.com',
    email_verified: true,
    role: 'student',
    plan: 'bundle',
    features: ['writing', 'vocab'],
    apps: ['vocab-master'],
  }),
  decodeUser: vi.fn(),
}))

const config: AuthServerConfig = {
  issuer: 'https://hub.labf.app',
  clientId: 'vocab-master-client',
  clientSecret: 'secret',
  redirectUri: 'https://vocab-master.labf.app/auth/callback',
  postLogoutRedirectUri: 'https://vocab-master.labf.app',
  sessionSecret: 'a-very-long-secret-at-least-32-chars!',
}

const metadata: OidcMetadata = {
  issuer: 'https://hub.labf.app',
  authorization_endpoint: 'https://hub.labf.app/oidc/auth',
  token_endpoint: 'https://hub.labf.app/oidc/token',
  userinfo_endpoint: 'https://hub.labf.app/oidc/me',
  jwks_uri: 'https://hub.labf.app/oidc/jwks',
}

describe('callback', () => {
  it('exchanges code for tokens', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'at_123',
          refresh_token: 'rt_456',
          id_token: 'idt_789',
          token_type: 'Bearer',
          expires_in: 900,
        }),
    })

    const result = await exchangeCode('auth_code_abc', 'verifier_xyz', config, metadata, mockFetch)

    expect(result.tokens.access_token).toBe('at_123')
    expect(result.tokens.refresh_token).toBe('rt_456')
    expect(result.tokens.id_token).toBe('idt_789')
    expect(result.tokens.expires_at).toBeGreaterThan(0)
    expect(result.user.sub).toBe('42')
  })

  it('sends correct token exchange parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'at',
          token_type: 'Bearer',
          id_token: 'idt',
        }),
    })

    await exchangeCode('code123', 'verifier456', config, metadata, mockFetch)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hub.labf.app/oidc/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )

    const body = mockFetch.mock.calls[0]?.[1]?.body as string
    const params = new URLSearchParams(body)
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('code')).toBe('code123')
    expect(params.get('code_verifier')).toBe('verifier456')
    expect(params.get('client_id')).toBe('vocab-master-client')
    expect(params.get('client_secret')).toBe('secret')
  })

  it('throws on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('invalid_grant'),
    })

    await expect(exchangeCode('bad_code', 'verifier', config, metadata, mockFetch)).rejects.toThrow(
      'Token exchange failed: 400',
    )
  })

  it('throws if access_token is missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token_type: 'Bearer' }),
    })

    await expect(exchangeCode('code', 'verifier', config, metadata, mockFetch)).rejects.toThrow(
      'Token response missing access_token',
    )
  })
})
