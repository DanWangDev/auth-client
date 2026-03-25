import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose'
import type { JWTVerifyGetKey } from 'jose'
import type { HubUser } from '../types/hub-user.js'

const jwksSets = new Map<string, JWTVerifyGetKey>()

/**
 * Get or create a cached JWKS key set for the given URI.
 */
function getJwks(jwksUri: string): JWTVerifyGetKey {
  let jwks = jwksSets.get(jwksUri)
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri))
    jwksSets.set(jwksUri, jwks)
  }
  return jwks
}

/**
 * Verify an ID token's signature and claims.
 */
export async function verifyIdToken(
  idToken: string,
  jwksUri: string,
  issuer: string,
  clientId: string,
): Promise<HubUser> {
  const jwks = getJwks(jwksUri)
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: clientId,
  })

  return extractUser(payload)
}

/**
 * Decode user claims from an ID token without verification.
 * Only use this after the token has already been verified.
 */
export function decodeUser(idToken: string): HubUser {
  const payload = decodeJwt(idToken)
  return extractUser(payload)
}

function extractUser(payload: Record<string, unknown>): HubUser {
  return {
    sub: String(payload.sub ?? ''),
    username: String(payload.username ?? ''),
    display_name: String(payload.display_name ?? ''),
    email: String(payload.email ?? ''),
    email_verified: Boolean(payload.email_verified),
    role: String(payload.role ?? 'student'),
    plan: String(payload.plan ?? 'free'),
    features: Array.isArray(payload.features) ? (payload.features as string[]) : [],
    apps: Array.isArray(payload.apps) ? (payload.apps as string[]) : [],
    expires_at: typeof payload.expires_at === 'string' ? payload.expires_at : null,
  }
}

/**
 * Clear cached JWKS sets (useful for testing).
 */
export function clearJwksCache(): void {
  jwksSets.clear()
}
