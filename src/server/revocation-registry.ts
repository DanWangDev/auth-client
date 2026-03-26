/**
 * In-memory revocation set for back-channel logout.
 *
 * Tracks revoked subject identifiers (`sub` claims) with TTL-based expiry.
 * When the hub's OIDC provider sends a back-channel logout notification,
 * the subject is added here. Middleware checks this set before trusting
 * cookie-based sessions.
 */

const revoked = new Map<string, number>()

let lastPruneAt = 0
const PRUNE_INTERVAL_MS = 60_000

const DEFAULT_TTL_SECONDS = 604_800 // 7 days — matches session cookie maxAge

/**
 * Mark a subject as revoked. The entry expires after `ttlSeconds`.
 */
export function revokeSubject(sub: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): void {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  revoked.set(sub, expiresAt)
}

/**
 * Check whether a subject has been revoked and the revocation has not expired.
 */
export function isRevoked(sub: string): boolean {
  maybePrune()

  const expiresAt = revoked.get(sub)
  if (expiresAt === undefined) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  if (now >= expiresAt) {
    revoked.delete(sub)
    return false
  }

  return true
}

/**
 * Remove a subject from the revocation set (e.g. after re-login).
 */
export function unrevokeSubject(sub: string): void {
  revoked.delete(sub)
}

/**
 * Clear all revocations. Testing helper.
 */
export function clearRevocations(): void {
  revoked.clear()
  lastPruneAt = 0
}

function maybePrune(): void {
  const now = Date.now()
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) {
    return
  }
  lastPruneAt = now

  const nowSeconds = Math.floor(now / 1000)
  for (const [sub, expiresAt] of revoked) {
    if (nowSeconds >= expiresAt) {
      revoked.delete(sub)
    }
  }
}
