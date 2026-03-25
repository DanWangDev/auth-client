import { describe, it, expect } from 'vitest'
import { buildAuthorizationUrl } from './authorization.js'
import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'

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

describe('authorization', () => {
  it('builds a valid authorization URL', () => {
    const result = buildAuthorizationUrl(config, metadata)

    const url = new URL(result.url)
    expect(url.origin + url.pathname).toBe('https://hub.labf.app/oidc/auth')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('vocab-master-client')
    expect(url.searchParams.get('redirect_uri')).toBe('https://vocab-master.labf.app/auth/callback')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('includes default scopes', () => {
    const result = buildAuthorizationUrl(config, metadata)
    const url = new URL(result.url)

    expect(url.searchParams.get('scope')).toBe('openid profile email hub')
  })

  it('uses custom scopes when provided', () => {
    const customConfig = { ...config, scopes: ['openid', 'profile'] }
    const result = buildAuthorizationUrl(customConfig, metadata)
    const url = new URL(result.url)

    expect(url.searchParams.get('scope')).toBe('openid profile')
  })

  it('returns PKCE code_verifier and state', () => {
    const result = buildAuthorizationUrl(config, metadata)

    expect(result.code_verifier).toBeTruthy()
    expect(result.state).toBeTruthy()
    expect(result.code_verifier.length).toBeGreaterThan(20)
    expect(result.state.length).toBe(32) // 16 bytes hex
  })

  it('includes code_challenge in URL', () => {
    const result = buildAuthorizationUrl(config, metadata)
    const url = new URL(result.url)

    expect(url.searchParams.get('code_challenge')).toBeTruthy()
  })

  it('generates unique state on each call', () => {
    const a = buildAuthorizationUrl(config, metadata)
    const b = buildAuthorizationUrl(config, metadata)

    expect(a.state).not.toBe(b.state)
  })
})
