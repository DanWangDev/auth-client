import { Router } from 'express'
import type { Request, Response } from 'express'
import type { AuthServerConfig } from '../types/auth-config.js'
import { discoverOidc } from './discovery.js'
import { buildAuthorizationUrl } from './authorization.js'
import { exchangeCode } from './callback.js'
import { getSession } from './session.js'
import { decodeUser } from './jwt.js'
import { createLogger } from './logger.js'

const logger = createLogger({ module: 'routes' })

/**
 * Create an Express Router with OIDC auth routes:
 *   GET  {basePath}/login    — redirect to hub login
 *   GET  {basePath}/callback — handle OIDC callback
 *   POST {basePath}/logout   — clear session, redirect to hub logout
 *   GET  {basePath}/me       — return current user claims as JSON
 */
export function createAuthRoutes(config: AuthServerConfig): Router {
  const router = Router()
  const basePath = config.basePath ?? '/auth'
  const cookieName = config.cookieName ?? '__labf_session'

  // GET /auth/login — redirect to hub authorization endpoint
  router.get(`${basePath}/login`, async (req: Request, res: Response) => {
    try {
      const metadata = await discoverOidc(config.issuer, config.internalIssuer)
      const { url, code_verifier, state } = buildAuthorizationUrl(config, metadata)

      const session = await getSession(req, res, {
        password: config.sessionSecret,
        cookieName,
      })
      session.code_verifier = code_verifier
      session.state = state
      session.returnTo = (req.query.returnTo as string) ?? '/'
      await session.save()

      logger.info('redirecting to hub login', { state })
      res.redirect(url)
    } catch (error) {
      logger.error('login redirect failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(500).json({ success: false, error: 'Failed to initiate login' })
    }
  })

  // GET /auth/callback — handle OIDC callback
  router.get(`${basePath}/callback`, async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query as Record<string, string>

      if (error) {
        logger.warn('OIDC callback error', { error, error_description })

        if (error === 'access_denied') {
          const deniedUrl =
            config.accessDeniedUrl ?? `${config.postLogoutRedirectUri}?error=access_denied`
          res.redirect(deniedUrl)
          return
        }

        res.status(400).json({
          success: false,
          error: error_description ?? error,
        })
        return
      }

      if (!code || !state) {
        res.status(400).json({ success: false, error: 'Missing code or state' })
        return
      }

      const session = await getSession(req, res, {
        password: config.sessionSecret,
        cookieName,
      })

      // Validate CSRF state
      if (state !== session.state) {
        logger.warn('OIDC callback state mismatch', {
          expected: session.state ?? 'none',
          received: state,
        })
        res.status(400).json({ success: false, error: 'Invalid state parameter' })
        return
      }

      if (!session.code_verifier) {
        res.status(400).json({ success: false, error: 'Missing PKCE code verifier' })
        return
      }

      const metadata = await discoverOidc(config.issuer, config.internalIssuer)
      const { tokens } = await exchangeCode(code, session.code_verifier, config, metadata)

      // Store tokens in session, clear PKCE state
      const returnTo = session.returnTo ?? '/'
      session.tokens = tokens
      session.code_verifier = undefined
      session.state = undefined
      session.returnTo = undefined
      await session.save()

      logger.info('OIDC callback successful')
      res.redirect(returnTo)
    } catch (error) {
      logger.error('OIDC callback failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(500).json({ success: false, error: 'Authentication failed' })
    }
  })

  // POST /auth/logout — clear session and redirect to hub logout
  router.post(`${basePath}/logout`, async (req: Request, res: Response) => {
    try {
      const session = await getSession(req, res, {
        password: config.sessionSecret,
        cookieName,
      })

      const idToken = session.tokens?.id_token
      session.destroy()

      // If hub has an end_session_endpoint, redirect there
      try {
        const metadata = await discoverOidc(config.issuer, config.internalIssuer)
        if (metadata.end_session_endpoint) {
          const params = new URLSearchParams({
            post_logout_redirect_uri: config.postLogoutRedirectUri,
          })
          if (idToken) {
            params.set('id_token_hint', idToken)
          }
          res.redirect(`${metadata.end_session_endpoint}?${params.toString()}`)
          return
        }
      } catch {
        // Fall through to local redirect
      }

      logger.info('user logged out')
      res.redirect(config.postLogoutRedirectUri)
    } catch (error) {
      logger.error('logout failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.redirect(config.postLogoutRedirectUri)
    }
  })

  // GET /auth/me — return current user claims
  router.get(`${basePath}/me`, async (req: Request, res: Response) => {
    try {
      const session = await getSession(req, res, {
        password: config.sessionSecret,
        cookieName,
      })

      if (!session.tokens?.id_token) {
        res.status(401).json({ success: false, error: 'Not authenticated' })
        return
      }

      const user = decodeUser(session.tokens.id_token)
      res.json({ success: true, data: user })
    } catch (error) {
      logger.error('get user failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(401).json({ success: false, error: 'Not authenticated' })
    }
  })

  return router
}
