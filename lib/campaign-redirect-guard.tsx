'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'

export function CampaignRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    const checkCampaign = async () => {
      if (!user) return

      try {
        // Check if user has a campaign
        const { data, error } = await insforge.database
          .from('campaigns')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          // No campaign found, redirect to create campaign
          router.push('/campaigns/create')
        }
      } catch (err) {
        console.error('Error checking campaign:', err)
      }
    }

    if (!loading && user) {
      checkCampaign()
    }
  }, [user, loading, router])

  return <>{children}</>
}
