import type { AuthClientConfig } from '../types/auth-config.js'

/**
 * Create a fetch wrapper that includes credentials and handles 401 redirects.
 */
export function createAuthFetch(config?: AuthClientConfig) {
  const basePath = config?.basePath ?? '/auth'

  return async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, {
      ...init,
      credentials: 'include',
    })

    if (response.status === 401) {
      const returnTo = encodeURIComponent(window.location.pathname)
      window.location.href = `${basePath}/login?returnTo=${returnTo}`
    }

    return response
  }
}
