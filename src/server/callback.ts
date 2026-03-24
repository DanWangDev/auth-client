import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'
import type { TokenSet } from '../types/token-set.js'
import { verifyIdToken } from './jwt.js'
import { createLogger } from './logger.js'
import type { HubUser } from '../types/hub-user.js'

const logger = createLogger({ module: 'callback' })

interface TokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type: string
  expires_in?: number
}

interface CallbackResult {
  readonly tokens: TokenSet
  readonly user: HubUser
}

/**
 * Exchange an authorization code for tokens at the hub's token endpoint.
 */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
  config: AuthServerConfig,
  metadata: OidcMetadata,
  fetchFn: typeof fetch = fetch,
): Promise<CallbackResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
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
    logger.error('token exchange failed', {
      status: String(response.status),
      body: errorBody,
    })
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  const data = (await response.json()) as TokenResponse

  if (!data.access_token) {
    throw new Error('Token response missing access_token')
  }

  const tokens: TokenSet = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    id_token: data.id_token ?? '',
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 900),
  }

  // Verify the ID token if present
  let user: HubUser
  if (tokens.id_token) {
    user = await verifyIdToken(tokens.id_token, metadata.jwks_uri, metadata.issuer, config.clientId)
  } else {
    // Fallback: minimal user from access token
    user = {
      sub: '',
      username: '',
      display_name: '',
      email: '',
      email_verified: false,
      role: 'student',
      plan: 'free',
      features: [],
      apps: [],
    }
  }

  logger.info('token exchange successful', { sub: user.sub })
  return { tokens, user }
}
