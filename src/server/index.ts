// Core
export { discoverOidc, clearDiscoveryCache } from './discovery.js'
export { generatePkce } from './pkce.js'
export { verifyIdToken, decodeUser, clearJwksCache } from './jwt.js'
export { buildAuthorizationUrl } from './authorization.js'
export { exchangeCode } from './callback.js'
export { refreshAccessToken } from './token-refresh.js'
export { getSession } from './session.js'

// Middleware
export { requireAuth, optionalAuth } from './middleware.js'

// Routes
export { createAuthRoutes } from './routes.js'

// Logger
export { createLogger } from './logger.js'

// Re-export types
export type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'
export type { HubUser } from '../types/hub-user.js'
export type { TokenSet } from '../types/token-set.js'
export type { PkceChallenge } from './pkce.js'
export type { SessionData, SessionOptions } from './session.js'
export type { AuthorizationParams } from './authorization.js'
