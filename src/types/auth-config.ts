/**
 * Configuration for the server-side auth module (Express middleware).
 */
export interface AuthServerConfig {
  /** Hub OIDC issuer URL, e.g. "https://hub.labf.app" */
  readonly issuer: string
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
}

/**
 * Configuration for the React auth module.
 */
export interface AuthClientConfig {
  /** Base path for auth API routes (default: '/auth'), must match server basePath */
  readonly basePath?: string
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
