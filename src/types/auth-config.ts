/**
 * Configuration for the server-side auth module (Express middleware).
 */
export interface AuthServerConfig {
  /** Hub OIDC issuer URL, e.g. "https://hub.labf.app" */
  readonly issuer: string
  /** Internal URL for OIDC discovery/JWKS fetch in Docker networks.
   *  Falls back to `issuer` if not provided. */
  readonly internalIssuer?: string
  /** OIDC client ID registered in the hub */
  readonly clientId: string
  /** OIDC client secret */
  readonly clientSecret: string
  /** Callback URL for OIDC code exchange, e.g. "https://app.labf.app/auth/callback" */
  readonly redirectUri: string
  /** Where to redirect after logout */
  readonly postLogoutRedirectUri: string
  /** OIDC scopes to request (default: ['openid', 'profile', 'email', 'hub']) */
  readonly scopes?: readonly string[]
  /** Secret for encrypting the session cookie (min 32 chars) */
  readonly sessionSecret: string
  /** Session cookie name (default: '__labf_session') */
  readonly cookieName?: string
  /** Base path for auth routes (default: '/auth') */
  readonly basePath?: string
  /** URL to redirect to when the hub denies access (entitlement check).
   *  Defaults to `${postLogoutRedirectUri}?error=access_denied`. */
  readonly accessDeniedUrl?: string
}

/**
 * Configuration for the React auth module.
 */
export interface AuthClientConfig {
  /** Base path for auth API routes (default: '/auth'), must match server basePath */
  readonly basePath?: string
}

/**
 * Configuration for Bearer-token JWT verification (non-session apps).
 * Used by apps that verify hub JWTs directly rather than using
 * session-based OIDC routes.
 */
export interface JwtVerifierConfig {
  /** Hub OIDC issuer URL, e.g. "https://hub.labf.app" */
  readonly issuer: string
  /** Internal URL for JWKS fetch in Docker networks.
   *  Falls back to `issuer` if not provided. */
  readonly internalIssuer?: string
  /** OIDC client_id for this application */
  readonly clientId: string
  /** OIDC client_secret for this application */
  readonly clientSecret: string
  /** Where the hub redirects after login */
  readonly redirectUri: string
  /** App slug used for entitlement checks (e.g. "writing-buddy") */
  readonly appSlug: string
  /** JWKS cache TTL in milliseconds (default: 10 minutes) */
  readonly jwksCacheTtlMs?: number
}

/**
 * OIDC discovery metadata (subset of fields we use).
 */
export interface OidcMetadata {
  readonly issuer: string
  readonly authorization_endpoint: string
  readonly token_endpoint: string
  readonly userinfo_endpoint: string
  readonly jwks_uri: string
  readonly end_session_endpoint?: string
}

/**
 * Manually constructed OIDC endpoints (for apps that don't use discovery).
 */
export interface OidcEndpoints {
  readonly authorization: string
  readonly token: string
  readonly userinfo: string
  readonly jwks: string
  readonly endSession: string
}
