import crypto from 'node:crypto'
import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'
import { generatePkce } from './pkce.js'

export interface AuthorizationParams {
  /** Full authorization URL to redirect the user to */
  readonly url: string
  /** PKCE code verifier to store in session */
  readonly code_verifier: string
  /** CSRF state nonce to store in session */
  readonly state: string
}

/**
 * Build the OIDC authorization redirect URL with PKCE.
 */
export function buildAuthorizationUrl(
  config: AuthServerConfig,
  metadata: OidcMetadata,
): AuthorizationParams {
  const { code_verifier, code_challenge } = generatePkce()
  const state = crypto.randomBytes(16).toString('hex')
  const scopes = config.scopes ?? ['openid', 'profile', 'email', 'hub']

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge,
    code_challenge_method: 'S256',
  })

  return {
    url: `${metadata.authorization_endpoint}?${params.toString()}`,
    code_verifier,
    state,
  }
}
