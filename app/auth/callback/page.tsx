'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import insforge from '@/lib/insforge-client'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600">Authenticating...</p>
      </div>
    </div>
  )
}

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Callback page loaded')
        console.log('Current URL:', window.location.href)

        // Get current user (session should be set by SDK)
        const { data: userData, error: userError } = await insforge.auth.getCurrentUser()

        console.log('Get current user result:', { userData, userError })

        if (userError || !userData?.user) {
          console.error('User not authenticated:', userError)
          router.push('/signin')
          return
        }

        const user = userData.user
        console.log('User authenticated:', user.email)

        // Save user to database
        try {
          console.log('Checking if profile exists')
          const { data: existing, error: checkError } = await insforge.database
            .from('profiles')
            .select('id')
            .eq('email', user.email || '')

          console.log('Check result:', { existing, checkError })

          if (!checkError && (!existing || existing.length === 0)) {
            console.log('Saving new profile to database')
            const { error: insertError } = await insforge.database.from('profiles').insert([
              {
                id: user.id,
                name: user.profile?.name || user.email?.split('@')[0] || 'User',
                email: user.email || '',
              },
            ])

            if (insertError) {
              console.error('Insert error:', insertError)
            } else {
              console.log('Profile saved to database')
            }
          } else {
            console.log('Profile already exists in database')
          }
        } catch (dbErr) {
          console.error('Database error:', dbErr)
        }

        // Redirect to dashboard
        console.log('Redirecting to dashboard')
        router.push('/dashboard')
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/signin')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return <LoadingScreen />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CallbackContent />
    </Suspense>
  )
}
