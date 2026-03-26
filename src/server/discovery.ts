import type { OidcMetadata } from '../types/auth-config.js'
import { createLogger } from './logger.js'

const logger = createLogger({ module: 'discovery' })

interface CachedMetadata {
  metadata: OidcMetadata
  fetchedAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

let cache: CachedMetadata | null = null

/**
 * Fetch and cache OIDC discovery metadata from the issuer.
 * Caches for 1 hour; returns stale data if refresh fails.
 */
export async function discoverOidc(
  issuer: string,
  internalIssuerOrFetch?: string | typeof fetch,
  fetchFnArg?: typeof fetch,
): Promise<OidcMetadata> {
  const internalIssuer =
    typeof internalIssuerOrFetch === 'string' ? internalIssuerOrFetch : undefined
  const fetchFn =
    typeof internalIssuerOrFetch === 'function' ? internalIssuerOrFetch : (fetchFnArg ?? fetch)

  const now = Date.now()

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.metadata
  }

  const fetchBase = internalIssuer ?? issuer
  const url = `${fetchBase}/oidc/.well-known/openid-configuration`

  try {
    const response = await fetchFn(url)
    if (!response.ok) {
      throw new Error(`Discovery fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as OidcMetadata
    if (!data.authorization_endpoint || !data.token_endpoint || !data.jwks_uri) {
      throw new Error('Invalid OIDC discovery response: missing required fields')
    }

    // When internalIssuer differs from issuer, the discovered metadata URLs
    // point to the internal hostname. Rewrite them:
    //   - Browser-facing endpoints (authorization, end_session) → public issuer
    //   - Server-to-server endpoints (token, jwks, userinfo) → internal issuer
    const resolved: OidcMetadata =
      internalIssuer && internalIssuer !== issuer
        ? {
            ...data,
            // Browser-facing: ensure they use the public issuer URL
            authorization_endpoint: data.authorization_endpoint.replace(internalIssuer, issuer),
            end_session_endpoint: data.end_session_endpoint?.replace(internalIssuer, issuer),
            // Server-to-server: ensure they use the internal issuer URL
            token_endpoint: data.token_endpoint.replace(issuer, internalIssuer),
            jwks_uri: data.jwks_uri.replace(issuer, internalIssuer),
          }
        : data

    cache = { metadata: resolved, fetchedAt: now }
    logger.info('OIDC metadata fetched', { issuer })
    return resolved
  } catch (error) {
    // Return stale cache if available
    if (cache) {
      logger.warn('OIDC discovery refresh failed, using stale cache', {
        issuer,
        error: error instanceof Error ? error.message : String(error),
        cacheAge: String(now - cache.fetchedAt),
      })
      return cache.metadata
    }
    throw error
  }
}

/**
 * Clear the discovery cache (useful for testing).
 */
export function clearDiscoveryCache(): void {
  cache = null
}
