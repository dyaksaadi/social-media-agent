'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import insforge from '@/lib/insforge-client'

interface User {
  id: string
  email: string
  name?: string
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (error) {
        setUser(null)
      } else if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.profile?.name,
          createdAt: data.user.createdAt,
        })
      }
    } catch (err) {
      console.error('Session check failed:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email: string, password: string, name: string) {
    setLoading(true)
    try {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
      })

      if (error) throw error

      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.profile?.name || name,
          createdAt: data.user.createdAt,
        })

        // Save user to database
        await saveUserToDatabase({
          id: data.user.id,
          email: data.user.email || '',
          name,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function signInWithPassword(email: string, password: string) {
    setLoading(true)
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.profile?.name,
          createdAt: data.user.createdAt,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  async function signInWithOAuth(provider: string) {
    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : 'http://localhost:3000/auth/callback'
      
      console.log('OAuth redirect URL:', redirectUrl)
      
      const { error } = await insforge.auth.signInWithOAuth({
        provider: provider as 'google' | 'github',
        redirectTo: redirectUrl,
      })

      if (error) throw error
    } catch (err) {
      console.error('OAuth sign in failed:', err)
      throw err
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      const { error } = await insforge.auth.signOut()
      if (error) throw error
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function saveUserToDatabase(userData: {
    id: string
    email: string
    name: string
  }) {
    try {
      // Check if profile exists
      const { data: existing } = await insforge.database
        .from('profiles')
        .select('id')
        .eq('email', userData.email)

      if (!existing || existing.length === 0) {
        // Create new profile record
        await insforge.database.from('profiles').insert([
          {
            id: userData.id,
            name: userData.name,
            email: userData.email,
          },
        ])
      }
    } catch (err) {
      console.error('Failed to save profile to database:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signInWithPassword,
        signInWithOAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
