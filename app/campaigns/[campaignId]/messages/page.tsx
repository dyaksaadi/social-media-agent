'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'

export default function CampaignMessagesPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const campaignId = params?.campaignId as string

  const [campaign, setCampaign] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchCampaignAndMessages = async () => {
      if (!campaignId || !user) return

      try {
        const { data: campaignData } = await insforge.database
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .eq('user_id', user.id)
          .single()

        setCampaign(campaignData)

        const { data: messagesData } = await insforge.database
          .from('messages')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })

        setMessages(messagesData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaignAndMessages()
  }, [campaignId, user, router])

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true
    return msg.status === filter
  })

  const stats = {
    total: messages.length,
    draft: messages.filter(m => m.status === 'draft').length,
    scheduled: messages.filter(m => m.status === 'scheduled').length,
    posted: messages.filter(m => m.status === 'posted').length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-700'
      case 'posted':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading campaign...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2"
          >
            ← Dashboard
          </button>
          <h1 className="text-lg font-bold text-slate-900">Campaign Messages</h1>
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/messages/create`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + New Message
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Campaign Info */}
        {campaign && (
          <div className="mb-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
            {campaign.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.logo}
                alt="Campaign"
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{campaign.name}</h2>
              <p className="text-slate-600 text-sm">Created {new Date(campaign.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', count: stats.total, color: 'from-slate-100 to-slate-200', textColor: 'text-slate-700' },
            { label: 'Drafts', count: stats.draft, color: 'from-slate-100 to-slate-200', textColor: 'text-slate-700' },
            { label: 'Scheduled', count: stats.scheduled, color: 'from-yellow-100 to-yellow-200', textColor: 'text-yellow-700' },
            { label: 'Posted', count: stats.posted, color: 'from-green-100 to-green-200', textColor: 'text-green-700' },
          ].map((stat, idx) => (
            <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-xl p-4`}>
              <p className="text-xs text-slate-600 font-medium mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          {['all', 'draft', 'scheduled', 'posted'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-3 font-medium transition border-b-2 ${
                filter === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
              <p className="text-slate-600 font-medium mb-4">No messages yet</p>
              <button
                onClick={() => router.push(`/campaigns/${campaignId}/messages/create`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Create First Message
              </button>
            </div>
          ) : (
            filteredMessages.map(message => (
              <div key={message.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium line-clamp-2">{message.content}</p>
                    <p className="text-sm text-slate-500 mt-2">
                      {message.character_count} characters • {message.platforms.join(', ')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(message.status)}`}>
                    {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                  </span>
                </div>

                {/* Media Preview */}
                {message.media_urls && message.media_urls.length > 0 && (
                  <div className="mb-4 flex gap-2">
                    {message.media_urls.slice(0, 3).map((url: string, idx: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={url}
                        alt="Media"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ))}
                    {message.media_urls.length > 3 && (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        +{message.media_urls.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(message.created_at).toLocaleDateString()}</span>
                  {message.scheduled_at && (
                    <span>📅 {new Date(message.scheduled_at).toLocaleString()}</span>
                  )}
                  {message.posted_at && (
                    <span>✓ Posted {new Date(message.posted_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
