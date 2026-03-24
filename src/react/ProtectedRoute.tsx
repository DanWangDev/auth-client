import type { ReactNode } from 'react'
import { useAuth } from './useAuth.js'

interface ProtectedRouteProps {
  readonly children: ReactNode
  /** Component to show while loading auth state */
  readonly fallback?: ReactNode
}

/**
 * Wraps children in an auth check.
 * Redirects to login if not authenticated.
 * Shows fallback (or nothing) while loading.
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth()

  if (isLoading) {
    return <>{fallback ?? null}</>
  }

  if (!isAuthenticated) {
    login(window.location.pathname)
    return <>{fallback ?? null}</>
  }

  return <>{children}</>
}
