import { jwtVerify } from 'jose'
import type { Request, Response } from 'express'
import type { AuthServerConfig } from '../types/auth-config.js'
import { getJwks } from './jwt.js'
import { discoverOidc } from './discovery.js'
import { revokeSubject } from './revocation-registry.js'
import { createLogger } from './logger.js'

const logger = createLogger({ module: 'backchannel-logout' })

const BCL_EVENT = 'http://schemas.openid.net/event/backchannel-logout'

/**
 * Verify a back-channel logout token JWT per the OIDC BCL spec.
 *
 * Validates signature, issuer, audience, the required `events` claim,
 * the presence of `sub`, and the absence of `nonce`.
 */
export async function verifyLogoutToken(
  token: string,
  jwksUri: string,
  issuer: string,
  clientId: string,
): Promise<{ sub: string }> {
  const jwks = getJwks(jwksUri)
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: clientId,
  })

  // OIDC BCL spec: nonce MUST NOT be present in logout tokens
  if ('nonce' in payload) {
    throw new Error('logout_token must not contain a nonce claim')
  }

  // Validate events claim
  const events = payload.events as Record<string, unknown> | undefined
  if (!events || !(BCL_EVENT in events)) {
    throw new Error('logout_token missing required backchannel-logout event')
  }

  // Extract sub
  const sub = payload.sub
  if (typeof sub !== 'string' || sub === '') {
    throw new Error('logout_token missing required sub claim')
  }

  return { sub }
}

/**
 * Create an Express handler for the back-channel logout endpoint.
 *
 * Expects `application/x-www-form-urlencoded` body with `logout_token` field.
 * The route should have `urlencoded({ extended: false })` middleware applied.
 */
export function createBackchannelLogoutHandler(
  config: AuthServerConfig,
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const logoutToken = req.body?.logout_token as string | undefined

      if (!logoutToken) {
        res.status(400).json({ error: 'missing logout_token' })
        return
      }

      const metadata = await discoverOidc(config.issuer, config.internalIssuer)
      const { sub } = await verifyLogoutToken(
        logoutToken,
        metadata.jwks_uri,
        config.issuer,
        config.clientId,
      )

      revokeSubject(sub)
      logger.info('back-channel logout processed', { sub })

      res.status(200).end()
    } catch (error) {
      logger.error('back-channel logout failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(400).json({ error: 'invalid_token' })
    }
  }
}
