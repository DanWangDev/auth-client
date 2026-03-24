import { useContext } from 'react'
import { AuthContext } from './AuthProvider.js'
import type { AuthContextValue } from './AuthProvider.js'

/**
 * Hook to access the auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
