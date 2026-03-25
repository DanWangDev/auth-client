# @labf/auth-client

OIDC client SDK for authenticating with the [11plus-hub](https://github.com/DanWangDev/11plus-hub) identity provider.

Provides two auth patterns:

- **Session-based**: Full OIDC flow with server-side sessions (Express routes + React components)
- **Bearer-token**: JWT verification for API-first apps using `Authorization: Bearer <token>`

## Install

```bash
npm install @labf/auth-client --registry=https://npm.pkg.github.com
```

## Entry Points

| Entry Point                      | Environment | Purpose                                           |
| -------------------------------- | ----------- | ------------------------------------------------- |
| `@labf/auth-client/server`       | Node.js     | Express middleware, OIDC routes, JWT verification |
| `@labf/auth-client/react`        | Browser     | React auth context, protected routes, auth fetch  |
| `@labf/auth-client/types`        | Both        | Shared TypeScript types                           |
| `@labf/auth-client/test-helpers` | Test        | Mock claims, test token generation                |

## Server Usage

### Session-Based Auth (Full OIDC Flow)

```typescript
import { createAuthRoutes, requireAuth, optionalAuth, discoverOidc } from '@labf/auth-client/server'
import type { AuthServerConfig } from '@labf/auth-client/server'

const config: AuthServerConfig = {
  issuer: process.env.HUB_URL,
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  redirectUri: process.env.OIDC_REDIRECT_URI,
  postLogoutRedirectUri: process.env.POST_LOGOUT_URI,
  sessionSecret: process.env.SESSION_SECRET,
}

// Mount OIDC routes (login, callback, logout, me)
app.use(createAuthRoutes(config))

// Use middleware on protected routes
const metadata = await discoverOidc(config.issuer)
app.get('/api/protected', requireAuth({ config, metadata }), (req, res) => {
  res.json({ user: req.user })
})
```

### Bearer-Token Auth (JWT Verification)

```typescript
import { JwtVerifier } from '@labf/auth-client/server'
import type { JwtVerifierConfig } from '@labf/auth-client/types'

const verifier = new JwtVerifier({
  issuer: process.env.HUB_URL,
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  redirectUri: process.env.OIDC_REDIRECT_URI,
  appSlug: 'writing-buddy',
})

// Verify a Bearer token
const claims = await verifier.verify(token)
// claims: HubTokenClaims { sub, email, username, displayName, role, plan, ... }
```

## React Usage

```tsx
import { AuthProvider, useAuth, ProtectedRoute } from '@labf/auth-client/react'

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute fallback={<Loading />}>
        <Dashboard />
      </ProtectedRoute>
    </AuthProvider>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div>
      <p>Welcome, {user?.display_name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Auth-Aware Fetch

```typescript
import { createAuthFetch } from '@labf/auth-client/react'

const authFetch = createAuthFetch()
// Automatically includes credentials and redirects to login on 401
const response = await authFetch('/api/data')
```

## Types

### HubUser (Session-Based)

Claims from the hub's OIDC tokens, used with session-based auth:

| Field            | Type       | Description               |
| ---------------- | ---------- | ------------------------- |
| `sub`            | `string`   | Hub user ID               |
| `username`       | `string`   | Hub username              |
| `display_name`   | `string`   | Display name              |
| `email`          | `string`   | User email                |
| `email_verified` | `boolean`  | Email verification status |
| `role`           | `string`   | User role                 |
| `plan`           | `string`   | Subscription plan         |
| `features`       | `string[]` | Feature entitlements      |
| `apps`           | `string[]` | App slugs with access     |

### HubTokenClaims (Bearer-Token)

Claims from JWT verification via `JwtVerifier`, includes timestamps:

| Field         | Type       | Description                    |
| ------------- | ---------- | ------------------------------ |
| `sub`         | `string`   | Hub user ID                    |
| `email`       | `string`   | User email                     |
| `username`    | `string`   | Hub username                   |
| `displayName` | `string`   | Display name (camelCase)       |
| `role`        | `string`   | User role                      |
| `plan`        | `string`   | Subscription plan              |
| `features`    | `string[]` | Feature entitlements           |
| `apps`        | `string[]` | App slugs with access          |
| `iat`         | `number`   | Issued-at timestamp (seconds)  |
| `exp`         | `number`   | Expiration timestamp (seconds) |

## Testing

```typescript
import { mockHubClaims } from '@labf/auth-client/test-helpers'

const claims = mockHubClaims({ sub: '42', plan: 'writing' })
```

For integration tests that need signed JWTs:

```typescript
import { generateTestKeyPair, signTestToken } from '@labf/auth-client/test-helpers'

const keyPair = await generateTestKeyPair()
const token = await signTestToken(keyPair, { sub: '42', plan: 'bundle' })
```

## Publishing

Published to GitHub Packages on every push to `main` via CI. Bump `version` in `package.json` before merging to publish a new version.
