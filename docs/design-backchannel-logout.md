# Design: Back-Channel Logout Support

**Status:** Proposed
**Date:** 2026-03-26
**Affects:** `@danwangdev/auth-client` v0.3.0
**Related:** Hub OIDC Self-Client & Back-Channel Logout (`11plus-hub/docs/oidc-self-client-and-back-channel-logout.md`)

---

## Problem

When a user logs out at the hub, client apps (vocab-master, writing-buddy) keep
stale sessions for up to 15 minutes (token expiry). A user switching accounts at
the hub sees the previous user's data in client apps until the token expires.

## Solution

Add a `POST /auth/backchannel-logout` endpoint to the auth-client SDK. The hub's
OIDC provider sends a `logout_token` JWT to this endpoint when a user logs out.
The SDK verifies the token, extracts the `sub`, and marks that user as revoked.
Middleware and routes check the revocation set before trusting sessions.

## Design Decision: In-Memory Revocation Set

**Constraint:** iron-session stores sessions as encrypted cookies. There is no
server-side session store to look up and destroy by `sub`.

**Approach:** An in-memory `Map<string, number>` maps revoked `sub` values to
their expiry timestamps. This is acceptable because:

- The design doc explicitly says BCL is "best-effort"
- Server restart clears it, but sessions re-validate on token expiry (15 min)
- Memory is negligible (string + number per entry)
- Zero overhead when BCL is not enabled (empty map)

## Changes

### 1. `src/server/revocation-registry.ts` (new)

In-memory revocation set with TTL-based expiry:

- `revokeSubject(sub, ttlSeconds?)` -- add sub with expiry (default 7 days)
- `isRevoked(sub)` -- check if revoked and not expired
- `unrevokeSubject(sub)` -- remove sub (used after re-login via callback)
- `clearRevocations()` -- testing helper
- Lazy pruning on each `isRevoked` call (at most once per 60 seconds)

### 2. `src/server/backchannel-logout.ts` (new)

`verifyLogoutToken(token, jwksUri, issuer, clientId)` -- verifies the
`logout_token` JWT per OIDC Back-Channel Logout spec:

- Signature via JWKS
- Issuer and audience validation
- `events` claim contains `http://schemas.openid.net/event/backchannel-logout`
- `sub` claim exists and is non-empty
- `nonce` claim is NOT present (spec requirement)

`createBackchannelLogoutHandler(config)` -- Express handler factory:

- Parses `logout_token` from urlencoded body
- Discovers OIDC metadata for JWKS URI
- Verifies token and revokes subject
- Returns 200 on success, 400 on invalid token

### 3. `src/server/routes.ts` (modify)

- Conditional BCL route when `config.backchannelLogout` is true
- Revocation check in `/me` endpoint
- Unrevoke subject in `/callback` after successful re-login

### 4. `src/server/middleware.ts` (modify)

- `requireAuth`: check revocation after decoding user, destroy session + 401
- `optionalAuth`: check revocation, destroy session, clear user, continue

### 5. `src/types/auth-config.ts` (modify)

- Add `backchannelLogout?: boolean` to `AuthServerConfig`
- Add `backchannel_logout_supported?` and `backchannel_logout_session_supported?` to `OidcMetadata`

### 6. Version bump

0.2.0 -> 0.3.0

## Backwards Compatibility

All changes are additive. `backchannelLogout` defaults to `false`. Existing apps
work without config changes. The revocation set is empty when BCL is not enabled,
adding zero overhead to middleware checks.

## Known Limitations

- **Horizontal scaling:** The in-memory revocation set is per-process. In multi-
  instance deployments, a BCL POST hits one instance but subsequent requests may
  hit another. The user falls back to token expiry (15 min). A shared store
  (Redis) could be added as a future enhancement.
- **Server restart:** Clears the revocation set. Sessions re-validate on token
  expiry. Acceptable for "best-effort" design.
