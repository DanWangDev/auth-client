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
}
