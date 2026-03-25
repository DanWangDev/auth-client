/**
 * User claims decoded from the Hub's OIDC ID token / access token.
 * Matches the claims issued by the hub's account finder (hub scope).
 */
export interface HubUser {
  readonly sub: string
  readonly username: string
  readonly display_name: string
  readonly email: string
  readonly email_verified: boolean
  readonly role: string
  readonly plan: string
  readonly features: readonly string[]
  readonly apps: readonly string[]
  /** ISO 8601 subscription expiry, or null if no expiry */
  readonly expires_at: string | null
}

/**
 * Claims extracted from a hub-issued JWT access token.
 *
 * Similar to HubUser but uses camelCase for display_name and includes
 * JWT-specific timestamps (iat, exp). Used by apps that verify Bearer
 * tokens directly via JwtVerifier rather than session-based auth.
 */
export interface HubTokenClaims {
  /** Hub user ID (numeric string, e.g. "42") */
  readonly sub: string
  /** User email */
  readonly email: string
  /** Hub username */
  readonly username: string
  /** Display name */
  readonly displayName: string
  /** User role on the hub */
  readonly role: string
  /** Subscription plan: free | writing | vocab | bundle | family */
  readonly plan: string
  /** Feature entitlements from subscription */
  readonly features: readonly string[]
  /** App slugs the user has access to */
  readonly apps: readonly string[]
  /** ISO 8601 subscription expiry, or null if no expiry */
  readonly expiresAt: string | null
  /** Issued-at timestamp (seconds) */
  readonly iat: number
  /** Expiration timestamp (seconds) */
  readonly exp: number
}
