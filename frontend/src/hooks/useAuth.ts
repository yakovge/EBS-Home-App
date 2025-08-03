/**
 * Custom hook for accessing authentication context.
 * Provides convenient access to auth state and methods.
 */

import { useAuthContext } from '@/contexts/AuthContext'

export const useAuth = () => {
  return useAuthContext()
}