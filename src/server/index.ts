// Core
export { discoverOidc, clearDiscoveryCache } from './discovery.js'
export { generatePkce } from './pkce.js'
export { verifyIdToken, decodeUser, clearJwksCache } from './jwt.js'
export { buildAuthorizationUrl } from './authorization.js'
export { exchangeCode } from './callback.js'
export { refreshAccessToken } from './token-refresh.js'
export { getSession } from './session.js'

// Bearer-token JWT verification
export { JwtVerifier } from './jwt-verifier.js'

// Back-channel logout
export {
  revokeSubject,
  isRevoked,
  unrevokeSubject,
  clearRevocations,
} from './revocation-registry.js'
export { verifyLogoutToken, createBackchannelLogoutHandler } from './backchannel-logout.js'

// Middleware
export { requireAuth, optionalAuth } from './middleware.js'

// Routes
export { createAuthRoutes } from './routes.js'

// Logger
export { createLogger } from './logger.js'

// Re-export types
export type {
  AuthServerConfig,
  JwtVerifierConfig,
  OidcMetadata,
  OidcEndpoints,
} from '../types/auth-config.js'
export type { HubUser, HubTokenClaims } from '../types/hub-user.js'
export type { TokenSet } from '../types/token-set.js'
export type { PkceChallenge } from './pkce.js'
export type { SessionData, SessionOptions } from './session.js'
export type { AuthorizationParams } from './authorization.js'
