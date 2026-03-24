import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'
import type { TokenSet } from '../types/token-set.js'
import { createLogger } from './logger.js'

const logger = createLogger({ module: 'token-refresh' })

interface TokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type: string
  expires_in?: number
}

// Simple mutex to prevent concurrent refresh attempts
let refreshPromise: Promise<TokenSet> | null = null

/**
 * Refresh the access token using a refresh token.
 * Uses a mutex to prevent concurrent refresh attempts.
 */
export async function refreshAccessToken(
  currentTokens: TokenSet,
  config: AuthServerConfig,
  metadata: OidcMetadata,
  fetchFn: typeof fetch = fetch,
): Promise<TokenSet> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = doRefresh(currentTokens, config, metadata, fetchFn)

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function doRefresh(
  currentTokens: TokenSet,
  config: AuthServerConfig,
  metadata: OidcMetadata,
  fetchFn: typeof fetch,
): Promise<TokenSet> {
  if (!currentTokens.refresh_token) {
    throw new Error('No refresh token available')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: currentTokens.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const response = await fetchFn(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('token refresh failed', {
      status: String(response.status),
      body: errorBody,
    })
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data = (await response.json()) as TokenResponse

  const refreshed: TokenSet = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? currentTokens.refresh_token,
    id_token: data.id_token ?? currentTokens.id_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 900),
  }

  logger.info('token refreshed successfully')
  return refreshed
}
