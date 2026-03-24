import type { Request, Response, NextFunction } from 'express'
import type { AuthServerConfig, OidcMetadata } from '../types/auth-config.js'
import type { HubUser } from '../types/hub-user.js'
import { getSession } from './session.js'
import { decodeUser } from './jwt.js'
import { refreshAccessToken } from './token-refresh.js'
import { createLogger } from './logger.js'

const logger = createLogger({ module: 'middleware' })

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: HubUser
    }
  }
}

interface MiddlewareOptions {
  readonly config: AuthServerConfig
  readonly metadata: OidcMetadata
}

/**
 * Middleware that requires authentication.
 * Attaches req.user if valid session exists, returns 401 otherwise.
 * Attempts silent token refresh if access token is expired.
 */
export function requireAuth({ config, metadata }: MiddlewareOptions) {
  const cookieName = config.cookieName ?? '__labf_session'

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await getSession(req, res, {
        password: config.sessionSecret,
        cookieName,
      })

      if (!session.tokens) {
        res.status(401).json({ success: false, error: 'Not authenticated' })
        return
      }

      const now = Math.floor(Date.now() / 1000)

      // Check if access token is expired and try to refresh
      if (session.tokens.expires_at <= now) {
        try {
          const refreshed = await refreshAccessToken(session.tokens, config, metadata)
          session.tokens = refreshed
          await session.save()
          logger.info('token refreshed via middleware')
        } catch {
          session.destroy()
          res.status(401).json({ success: false, error: 'Session expired' })
          return
        }
      }

      // Decode user from ID token
      if (session.tokens.id_token) {
        req.user = decodeUser(session.tokens.id_token)
      }

      next()
    } catch (error) {
      logger.error('auth middleware error', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(401).json({ success: false, error: 'Authentication failed' })
    }
  }
}

/**
 * Middleware that optionally attaches user if authenticated.
 * Continues regardless of auth state — never returns 401.
 */
export function optionalAuth({ config, metadata }: MiddlewareOptions) {
  const cookieName = config.cookieName ?? '__labf_session'

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await getSession(req, res, {
        password: config.sessionSecret,
        cookieName,
      })

      if (session.tokens) {
        const now = Math.floor(Date.now() / 1000)

        if (session.tokens.expires_at <= now && session.tokens.refresh_token) {
          try {
            const refreshed = await refreshAccessToken(session.tokens, config, metadata)
            session.tokens = refreshed
            await session.save()
          } catch {
            // Silently continue without user
          }
        }

        if (session.tokens.id_token) {
          req.user = decodeUser(session.tokens.id_token)
        }
      }
    } catch {
      // Silently continue without user
    }

    next()
  }
}
