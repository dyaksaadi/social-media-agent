'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CampaignRedirectGuard } from '@/lib/campaign-redirect-guard'
import insforge from '@/lib/insforge-client'

function DashboardContent() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [campaign, setCampaign] = useState<any>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!user) return

      try {
        const { data } = await insforge.database
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setCampaign(data)
      } catch (err) {
        console.error('Error fetching campaign:', err)
      }
    }

    if (user) {
      fetchCampaign()
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  async function handleSignOut() {
    await signOut()
    router.push('/signin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <nav className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Social Media AI Agent</h1>
            {campaign && <p className="text-sm text-slate-300">{campaign.icon} {campaign.name}</p>}
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome, {user.name || user.email}!
            </h2>
            <p className="text-slate-600">
              You're ready to manage your social media campaign.
            </p>
          </div>

          {campaign && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Campaign</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-600 text-sm mb-1">Campaign Name</p>
                  <p className="text-slate-900 font-semibold">{campaign.name}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm mb-1">Icon</p>
                  <p className="text-3xl">{campaign.icon}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-sm mb-1">Office</p>
                  <p className="text-slate-900 font-semibold">
                    {campaign.office_image?.includes('modern') ? 'Modern Office' : 'Wooden Office'}
                  </p>
                </div>
                <div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                    Edit Campaign
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
              <p className="text-slate-600 font-semibold">Posts</p>
              <p className="text-slate-500 text-sm mt-2">Total social media posts</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="text-4xl font-bold text-green-600 mb-2">0</div>
              <p className="text-slate-600 font-semibold">Engagements</p>
              <p className="text-slate-500 text-sm mt-2">Total likes and comments</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">0</div>
              <p className="text-slate-600 font-semibold">Followers</p>
              <p className="text-slate-500 text-sm mt-2">Across all platforms</p>
            </div>
          </div>

          <div className="mt-12 p-6 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">Email:</span>
                <span className="text-slate-900 font-semibold">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">Name:</span>
                <span className="text-slate-900 font-semibold">{user.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Member Since:</span>
                <span className="text-slate-900 font-semibold">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'Today'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

export default function DashboardPage() {
  return (
    <CampaignRedirectGuard>
      <DashboardContent />
    </CampaignRedirectGuard>
  )
}
