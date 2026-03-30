import { useState, useCallback } from 'react'
import { isAuthenticated, signIn as authSignIn, signOut as authSignOut } from '../utils/auth'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState<boolean>(isAuthenticated)

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      await authSignIn(email, password)
      setAuthenticated(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
    setAuthenticated(false)
  }, [])

  return { isAuthenticated: authenticated, signIn, signOut, loading }
}
