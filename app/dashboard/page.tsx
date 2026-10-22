'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CampaignRedirectGuard } from '@/lib/campaign-redirect-guard'
import insforge from '@/lib/insforge-client'

function DashboardContent() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [campaign, setCampaign] = useState<any>(null)
  const [campaignLoading, setCampaignLoading] = useState(true)

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
      } finally {
        setCampaignLoading(false)
      }
    }

    if (user) {
      fetchCampaign()
    }
  }, [user])

  if (loading || campaignLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold flex items-center justify-center">
              AI
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Social Media AI Agent</h1>
              {campaign && <p className="text-xs text-slate-500">{campaign.icon} {campaign.name}</p>}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user.name || user.email.split('@')[0]}! 👋</h2>
          <p className="text-slate-600">Manage your social media campaigns with AI assistance</p>
        </div>

        {/* Active Campaign Card */}
        {campaign && (
          <div className="mb-8 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                {campaign.logo && (
                  <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.logo}
                      alt="Campaign logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Active Campaign</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">{campaign.icon}</span>
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900">{campaign.name}</h4>
                      <p className="text-slate-600 text-sm">
                        {campaign.office_image?.includes('modern') ? 'Modern Office' : 'Wooden Office'} Environment
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition">
                Edit
              </button>
            </div>

            {/* Campaign Stats Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-slate-600 text-xs font-medium mb-2">Campaign Status</p>
                <p className="text-2xl font-bold text-blue-600">Active</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-slate-600 text-xs font-medium mb-2">Total Posts</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-slate-600 text-xs font-medium mb-2">Total Engagement</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">📝</span>
              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg">This Month</span>
            </div>
            <p className="text-slate-600 text-sm mb-1">Total Posts</p>
            <p className="text-3xl font-bold text-slate-900">0</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">❤️</span>
              <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-lg">This Month</span>
            </div>
            <p className="text-slate-600 text-sm mb-1">Total Likes</p>
            <p className="text-3xl font-bold text-slate-900">0</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">💬</span>
              <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-lg">This Month</span>
            </div>
            <p className="text-slate-600 text-sm mb-1">Total Comments</p>
            <p className="text-3xl font-bold text-slate-900">0</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">👥</span>
              <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-lg">This Month</span>
            </div>
            <p className="text-slate-600 text-sm mb-1">New Followers</p>
            <p className="text-3xl font-bold text-slate-900">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <p className="text-2xl mb-2">✍️</p>
              <p className="font-semibold text-slate-900">Create Post</p>
              <p className="text-xs text-slate-600 mt-1">Draft new social media post</p>
            </button>
            <button className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <p className="text-2xl mb-2">📊</p>
              <p className="font-semibold text-slate-900">View Analytics</p>
              <p className="text-xs text-slate-600 mt-1">Check campaign performance</p>
            </button>
            <button className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <p className="text-2xl mb-2">⚙️</p>
              <p className="font-semibold text-slate-900">Settings</p>
              <p className="text-xs text-slate-600 mt-1">Manage campaign settings</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <CampaignRedirectGuard>
      <DashboardContent />
    </CampaignRedirectGuard>
  )
}
