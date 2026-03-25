import { exportJWK, generateKeyPair, SignJWT, importJWK } from 'jose'

export interface TestKeyPair {
  readonly privateKey: CryptoKey
  readonly publicJwk: Record<string, unknown>
}

/**
 * Generates an RSA key pair for test JWT signing.
 * Call once per test suite and reuse the result.
 */
export async function generateTestKeyPair(): Promise<TestKeyPair> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    extractable: true,
  })

  const publicJwk = await exportJWK(publicKey)

  return {
    privateKey: privateKey as CryptoKey,
    publicJwk: {
      ...publicJwk,
      kid: 'test-key-1',
      use: 'sig',
      alg: 'RS256',
    },
  }
}

export interface TestTokenOptions {
  /** Hub user ID (default: "1") */
  readonly sub?: string
  readonly email?: string
  readonly username?: string
  readonly displayName?: string
  readonly role?: string
  readonly plan?: string
  readonly features?: readonly string[]
  readonly apps?: readonly string[]
  /** Token expiration in seconds from now (default: 900 = 15 min) */
  readonly expiresInSeconds?: number
  readonly issuer?: string
}

/**
 * Signs a test JWT with hub-format claims.
 */
export async function signTestToken(
  keyPair: TestKeyPair,
  options: TestTokenOptions = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = options.expiresInSeconds ?? 900

  const key = await importJWK(await exportJWK(keyPair.privateKey), 'RS256')

  const token = await new SignJWT({
    sub: options.sub ?? '1',
    email: options.email ?? 'test@example.com',
    username: options.username ?? 'testuser',
    display_name: options.displayName ?? 'Test User',
    role: options.role ?? 'student',
    plan: options.plan ?? 'free',
    features: options.features ?? [],
    apps: options.apps ?? ['writing-buddy'],
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setIssuer(options.issuer ?? 'http://localhost:3000')
    .sign(key)

  return token
}
