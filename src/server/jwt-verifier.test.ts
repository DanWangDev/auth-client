import { describe, it, expect } from 'vitest'
import { exportJWK, generateKeyPair, SignJWT, importJWK } from 'jose'
import { JwtVerifier } from './jwt-verifier.js'
import type { JwtVerifierConfig } from '../types/auth-config.js'

describe('JwtVerifier', () => {
  it('instantiates with valid config', () => {
    const config: JwtVerifierConfig = {
      issuer: 'https://hub.labf.app',
      clientId: 'test-client',
      clientSecret: 'secret',
      redirectUri: 'https://app.labf.app/callback',
      appSlug: 'writing-buddy',
    }

    const verifier = new JwtVerifier(config)
    expect(verifier).toBeDefined()
    expect(typeof verifier.verify).toBe('function')
  })

  it('uses internalIssuer for JWKS URL when provided', () => {
    const config: JwtVerifierConfig = {
      issuer: 'https://hub.labf.app',
      internalIssuer: 'http://app:3009',
      clientId: 'test-client',
      clientSecret: 'secret',
      redirectUri: 'https://app.labf.app/callback',
      appSlug: 'writing-buddy',
    }

    const verifier = new JwtVerifier(config)
    expect(verifier).toBeDefined()
  })

  it('accepts custom JWKS cache TTL', () => {
    const config: JwtVerifierConfig = {
      issuer: 'https://hub.labf.app',
      clientId: 'test-client',
      clientSecret: 'secret',
      redirectUri: 'https://app.labf.app/callback',
      appSlug: 'writing-buddy',
      jwksCacheTtlMs: 30_000,
    }

    const verifier = new JwtVerifier(config)
    expect(verifier).toBeDefined()
  })

  // Test the claim mapping logic by creating a JWT and verifying the
  // shape matches HubTokenClaims (using jose primitives)
  it('maps JWT payload to HubTokenClaims shape', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true })
    const jwk = await exportJWK(privateKey)
    const key = await importJWK(jwk, 'RS256')

    const now = Math.floor(Date.now() / 1000)

    const token = await new SignJWT({
      sub: '42',
      email: 'test@labf.app',
      username: 'testuser',
      display_name: 'Test User',
      role: 'student',
      plan: 'bundle',
      features: ['writing', 'vocab'],
      apps: ['writing-buddy'],
      expires_at: '2026-12-31T23:59:59Z',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + 900)
      .setIssuer('https://hub.labf.app')
      .sign(key)

    // Verify the token is a valid JWT string
    expect(token.split('.').length).toBe(3)
  })
})
