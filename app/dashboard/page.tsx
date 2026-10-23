'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'

export default function OverviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<any>(null)
  const [messageStats, setMessageStats] = useState({ total: 0, posted: 0, scheduled: 0, draft: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        const { data } = await insforge.database
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setCampaign(data)

        if (data) {
          const { data: messagesData } = await insforge.database
            .from('messages')
            .select('status')
            .eq('campaign_id', data.id)

          const msgs = messagesData || []
          setMessageStats({
            total: msgs.length,
            posted: msgs.filter((m: any) => m.status === 'posted').length,
            scheduled: msgs.filter((m: any) => m.status === 'scheduled').length,
            draft: msgs.filter((m: any) => m.status === 'draft').length,
          })
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">
          Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-slate-600">Here's what's happening with your campaigns today.</p>
      </div>

      {/* Active Campaign Card */}
      {campaign && (
        <div className="mb-8 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              {campaign.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={campaign.logo}
                  alt="Campaign logo"
                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Active Campaign
                </h3>
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
            <button
              onClick={() => router.push(`/campaigns/${campaign.id}/messages`)}
              className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition"
            >
              View Messages →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <p className="text-slate-600 text-xs font-medium mb-2">Total Posts</p>
              <p className="text-2xl font-bold text-blue-600">{messageStats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <p className="text-slate-600 text-xs font-medium mb-2">Posted</p>
              <p className="text-2xl font-bold text-green-600">{messageStats.posted}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl">
              <p className="text-slate-600 text-xs font-medium mb-2">Scheduled</p>
              <p className="text-2xl font-bold text-yellow-600">{messageStats.scheduled}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Posts', count: messageStats.total, icon: '📝', badge: 'All Time', badgeBg: 'bg-blue-50 text-blue-600' },
          { label: 'Posted', count: messageStats.posted, icon: '✅', badge: 'Published', badgeBg: 'bg-green-50 text-green-600' },
          { label: 'Scheduled', count: messageStats.scheduled, icon: '📅', badge: 'Upcoming', badgeBg: 'bg-yellow-50 text-yellow-600' },
          { label: 'Drafts', count: messageStats.draft, icon: '💾', badge: 'Unpublished', badgeBg: 'bg-slate-100 text-slate-600' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{stat.icon}</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${stat.badgeBg}`}>
                {stat.badge}
              </span>
            </div>
            <p className="text-slate-600 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '✍️', title: 'Create Post', desc: 'Draft a new social media post', action: () => campaign && router.push(`/campaigns/${campaign.id}/messages/create`) },
            { icon: '📊', title: 'View Analytics', desc: 'Check campaign performance', action: () => router.push('/dashboard/analytics') },
            { icon: '⚙️', title: 'Settings', desc: 'Manage campaign settings', action: () => router.push('/dashboard/settings') },
          ].map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className="p-5 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition text-left group"
            >
              <p className="text-3xl mb-3">{action.icon}</p>
              <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition">{action.title}</p>
              <p className="text-xs text-slate-600 mt-1">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
