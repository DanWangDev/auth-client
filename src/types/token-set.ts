/**
 * Token set returned from the OIDC token endpoint.
 */
export interface TokenSet {
  readonly access_token: string
  readonly refresh_token: string
  readonly id_token: string
  /** Unix epoch seconds when the access token expires */
  readonly expires_at: number
}
