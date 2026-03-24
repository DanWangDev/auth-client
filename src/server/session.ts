import { getIronSession } from 'iron-session'
import type { Request, Response } from 'express'
import type { TokenSet } from '../types/token-set.js'

export interface SessionData {
  tokens?: TokenSet
  /** PKCE code_verifier stored before redirect */
  code_verifier?: string
  /** CSRF state nonce stored before redirect */
  state?: string
  /** URL to redirect to after login */
  returnTo?: string
}

export interface SessionOptions {
  readonly password: string
  readonly cookieName: string
}

/**
 * Get the encrypted session from the request cookie.
 */
export async function getSession(
  req: Request,
  res: Response,
  options: SessionOptions,
): Promise<SessionData & { save(): Promise<void>; destroy(): void }> {
  const session = await getIronSession<SessionData>(req, res, {
    password: options.password,
    cookieName: options.cookieName,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    },
  })
  return session
}
