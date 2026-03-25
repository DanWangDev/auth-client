import crypto from 'node:crypto'

export interface PkceChallenge {
  readonly code_verifier: string
  readonly code_challenge: string
}

/**
 * Generate a PKCE code verifier and S256 code challenge.
 */
export function generatePkce(): PkceChallenge {
  const code_verifier = crypto.randomBytes(32).toString('base64url')
  const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url')

  return { code_verifier, code_challenge }
}
