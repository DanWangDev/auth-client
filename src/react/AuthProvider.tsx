import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { HubUser } from '../types/hub-user.js'
import type { AuthClientConfig } from '../types/auth-config.js'

export interface AuthContextValue {
  readonly user: HubUser | null
  readonly isAuthenticated: boolean
  readonly isLoading: boolean
  readonly isAccessDenied: boolean
  /** ISO 8601 subscription expiry from hub claims, or null */
  readonly expiresAt: string | null
  login(returnTo?: string): void
  logout(): void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  readonly config?: AuthClientConfig
  readonly children: ReactNode
}

export function AuthProvider({ config, children }: AuthProviderProps) {
  const basePath = config?.basePath ?? '/auth'
  const [user, setUser] = useState<HubUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchUser() {
      try {
        const res = await fetch(`${basePath}/me`, { credentials: 'include' })
        if (res.ok) {
          const data = (await res.json()) as { success: boolean; data: HubUser }
          if (!cancelled && data.success) {
            setUser(data.data)
          }
        }
      } catch {
        // Not authenticated
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchUser()

    return () => {
      cancelled = true
    }
  }, [basePath])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'access_denied') {
      setAccessDenied(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const login = useCallback(
    (returnTo?: string) => {
      const params = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
      window.location.href = `${basePath}/login${params}`
    },
    [basePath],
  )

  const logout = useCallback(() => {
    // POST to logout endpoint via form submission
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = `${basePath}/logout`
    document.body.appendChild(form)
    form.submit()
  }, [basePath])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isAccessDenied: accessDenied,
    expiresAt: user?.expires_at ?? null,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
