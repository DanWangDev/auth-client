import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import http from 'node:http'
import type { Request, Response } from 'express'
import { verifyLogoutToken, createBackchannelLogoutHandler } from './backchannel-logout.js'
import { clearJwksCache } from './jwt.js'
import { clearRevocations, isRevoked } from './revocation-registry.js'

vi.mock('./logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('./discovery.js', () => ({
  discoverOidc: vi.fn().mockResolvedValue({
    issuer: 'https://hub.labf.app',
    authorization_endpoint: 'https://hub.labf.app/oidc/auth',
    token_endpoint: 'https://hub.labf.app/oidc/token',
    userinfo_endpoint: 'https://hub.labf.app/oidc/userinfo',
    jwks_uri: '',
  }),
}))

const BCL_EVENT = 'http://schemas.openid.net/event/backchannel-logout'
const ISSUER = 'https://hub.labf.app'
const CLIENT_ID = 'test-client'

let privateKey: CryptoKey
let jwksUri: string
let server: http.Server

async function setupJwks(): Promise<void> {
  const keyPair = await generateKeyPair('RS256', { extractable: true })
  privateKey = keyPair.privateKey
  const publicJwk = await exportJWK(keyPair.publicKey)
  publicJwk.kid = 'test-key-1'
  publicJwk.alg = 'RS256'
  publicJwk.use = 'sig'

  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ keys: [publicJwk] }))
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const addr = server.address() as { port: number }
  jwksUri = `http://127.0.0.1:${addr.port}/jwks`
}

async function signLogoutToken(claims: Record<string, unknown> = {}): Promise<string> {
  return new SignJWT({
    events: { [BCL_EVENT]: {} },
    sub: '42',
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(CLIENT_ID)
    .setJti(crypto.randomUUID())
    .setExpirationTime('5m')
    .sign(privateKey)
}

beforeAll(async () => {
  await setupJwks()
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

beforeEach(() => {
  clearJwksCache()
  clearRevocations()
})

describe('verifyLogoutToken', () => {
  it('returns sub for a valid logout token', async () => {
    const token = await signLogoutToken()

    const result = await verifyLogoutToken(token, jwksUri, ISSUER, CLIENT_ID)

    expect(result).toEqual({ sub: '42' })
  })

  it('throws if sub claim is missing', async () => {
    const token = await new SignJWT({
      events: { [BCL_EVENT]: {} },
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setExpirationTime('5m')
      .sign(privateKey)

    await expect(verifyLogoutToken(token, jwksUri, ISSUER, CLIENT_ID)).rejects.toThrow(
      'missing required sub claim',
    )
  })

  it('throws if events claim is missing', async () => {
    const token = await new SignJWT({
      sub: '42',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setExpirationTime('5m')
      .sign(privateKey)

    await expect(verifyLogoutToken(token, jwksUri, ISSUER, CLIENT_ID)).rejects.toThrow(
      'missing required backchannel-logout event',
    )
  })

  it('throws if nonce is present', async () => {
    const token = await signLogoutToken({ nonce: 'abc123' })

    await expect(verifyLogoutToken(token, jwksUri, ISSUER, CLIENT_ID)).rejects.toThrow(
      'must not contain a nonce claim',
    )
  })

  it('throws if events does not contain BCL event key', async () => {
    const token = await new SignJWT({
      sub: '42',
      events: { 'some-other-event': {} },
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setExpirationTime('5m')
      .sign(privateKey)

    await expect(verifyLogoutToken(token, jwksUri, ISSUER, CLIENT_ID)).rejects.toThrow(
      'missing required backchannel-logout event',
    )
  })

  it('throws for wrong issuer', async () => {
    const token = await signLogoutToken()

    await expect(
      verifyLogoutToken(token, jwksUri, 'https://wrong-issuer.com', CLIENT_ID),
    ).rejects.toThrow()
  })

  it('throws for wrong audience', async () => {
    const token = await signLogoutToken()

    await expect(verifyLogoutToken(token, jwksUri, ISSUER, 'wrong-client')).rejects.toThrow()
  })
})

describe('createBackchannelLogoutHandler', () => {
  const config = {
    issuer: ISSUER,
    clientId: CLIENT_ID,
    clientSecret: 'test-secret',
    redirectUri: 'https://app.labf.app/auth/callback',
    postLogoutRedirectUri: 'https://app.labf.app',
    sessionSecret: 'a-very-long-secret-that-is-at-least-32-chars',
  }

  function mockReqRes(body: Record<string, unknown> = {}) {
    const req = { body } as unknown as Request
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn(),
    } as unknown as Response
    return { req, res }
  }

  it('returns 200 and revokes subject for valid token', async () => {
    const { discoverOidc } = await import('./discovery.js')
    vi.mocked(discoverOidc).mockResolvedValue({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oidc/auth`,
      token_endpoint: `${ISSUER}/oidc/token`,
      userinfo_endpoint: `${ISSUER}/oidc/userinfo`,
      jwks_uri: jwksUri,
    })

    const token = await signLogoutToken({ sub: 'user-99' })
    const handler = createBackchannelLogoutHandler(config)
    const { req, res } = mockReqRes({ logout_token: token })

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
    expect(isRevoked('user-99')).toBe(true)
  })

  it('returns 400 when logout_token is missing', async () => {
    const handler = createBackchannelLogoutHandler(config)
    const { req, res } = mockReqRes({})

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'missing logout_token' })
  })

  it('returns 400 for invalid JWT', async () => {
    const { discoverOidc } = await import('./discovery.js')
    vi.mocked(discoverOidc).mockResolvedValue({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/oidc/auth`,
      token_endpoint: `${ISSUER}/oidc/token`,
      userinfo_endpoint: `${ISSUER}/oidc/userinfo`,
      jwks_uri: jwksUri,
    })

    const handler = createBackchannelLogoutHandler(config)
    const { req, res } = mockReqRes({ logout_token: 'not-a-valid-jwt' })

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid_token' })
  })
})
