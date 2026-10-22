'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const { signInWithPassword, signInWithOAuth, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    try {
      await signInWithPassword(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError('')
      await signInWithOAuth('google')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">
          Welcome Back
        </h1>
        <p className="text-center text-slate-600 mb-8">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-300"></div>
          <span className="px-4 text-sm text-slate-500">or</span>
          <div className="flex-1 border-t border-slate-300"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        <p className="mt-6 text-center text-slate-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
