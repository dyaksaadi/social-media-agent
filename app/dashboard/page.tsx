'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'
import AgentOffice from '@/components/dashboard/agent-office'
import AgentPanel, { type Agent } from '@/components/dashboard/agent-panel'
import {
  CalendarDays,
  Activity,
  Plus,
  ArrowRight,
  FileText,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react'

interface MessageRow {
  id: string
  content: string
  status: string
  platforms: string[]
  scheduled_at?: string | null
  posted_at?: string | null
  created_at: string
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getActivityMeta(status: string) {
  switch (status) {
    case 'posted':
      return { title: 'Post published', icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' }
    case 'scheduled':
      return { title: 'Post scheduled', icon: CalendarClock, bg: 'bg-blue-50', color: 'text-blue-600' }
    default:
      return { title: 'Draft created', icon: FileText, bg: 'bg-slate-100', color: 'text-slate-500' }
  }
}

export default function OverviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<any>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [officeVariant, setOfficeVariant] = useState<'modern' | 'wooden'>('modern')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        const { data: campaignData } = await insforge.database
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setCampaign(campaignData)
        setOfficeVariant(String(campaignData?.office_image || '').includes('wooden') ? 'wooden' : 'modern')

        if (campaignData) {
          const { data: messagesData } = await insforge.database
            .from('messages')
            .select('id, content, status, platforms, scheduled_at, posted_at, created_at')
            .eq('campaign_id', campaignData.id)
            .order('created_at', { ascending: false })

          setMessages(messagesData || [])
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

  useEffect(() => {
    let cancelled = false
    fetch(`/office-studio/${officeVariant}-office.json`)
      .then((r) => r.json())
      .then((data: any) => {
        if (cancelled) return
        const list: Agent[] = (data?.seats || [])
          .filter((s: any) => s?.character)
          .map((s: any) => ({
            id: s.id,
            name: s.character.name,
            emoji: s.character.emoji,
            description: s.character.description,
            thumbnail: s.character.thumbnail,
          }))
        setAgents(list)
      })
      .catch((err) => console.error('Failed to load agents:', err))
    return () => {
      cancelled = true
    }
  }, [officeVariant])

  // Derived data
  const scheduledPosts = messages
    .filter((m) => m.status === 'scheduled' && m.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
    .slice(0, 4)

  const recentActivity = [...messages]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const totalPosts = messages.length
  const postedPosts = messages.filter((m) => m.status === 'posted').length
  const progress = totalPosts > 0 ? Math.round((postedPosts / totalPosts) * 100) : 0

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-24">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* ============ LEFT HALF ============ */}
      <div className="space-y-6">
        {selectedAgent ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedAgentId(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              ← Back to overview
            </button>
            <AgentPanel agent={selectedAgent} />
          </div>
        ) : (
          <>
        <div>
          <p className="text-orange-500 text-sm font-semibold mb-2">
            {getGreeting()}, {firstName} 👋
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2">
            Your AI Creative Team is on it.
          </h1>
          <p className="text-slate-500 text-sm max-w-lg">
            From trends to content to posting, your agents work together to turn ideas into
            real growth.
          </p>
        </div>

        {/* Campaign Status Card */}
        {campaign ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                {campaign.icon || '🚀'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 truncate">{campaign.name}</p>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    In Progress
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  Research, writing, and scheduling posts to grow your brand.
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-slate-900">{progress}%</p>
                <p className="text-[11px] text-slate-500 font-medium">Complete</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-3">🚀</div>
            <p className="font-semibold text-slate-900">No active campaign</p>
            <p className="text-sm text-slate-500 mt-1">Create a campaign to get started.</p>
          </div>
        )}

        {/* Upcoming Posts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Upcoming Posts</h2>
            <button
              onClick={() => router.push('/dashboard/calendar')}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              View Calendar <ArrowRight size={14} />
            </button>
          </div>

          {scheduledPosts.length > 0 ? (
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => campaign && router.push(`/campaigns/${campaign.id}/messages`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <CalendarDays size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{post.content}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(post.scheduled_at!).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {post.platforms.join(', ')}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-500 transition flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <CalendarDays size={30} className="text-blue-500" />
              </div>
              <p className="font-bold text-slate-900">No posts scheduled yet</p>
              <p className="text-sm text-slate-500 mt-1">Schedule your first post to get started.</p>
              <button
                onClick={() => campaign && router.push(`/campaigns/${campaign.id}/messages/create`)}
                className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition shadow-sm hover:shadow-md"
              >
                <Plus size={16} /> Create post
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Recent Activity</h2>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((act) => {
                const meta = getActivityMeta(act.status)
                return (
                  <div key={act.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                      <meta.icon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{meta.title}</p>
                      <p className="text-xs text-slate-500 truncate">{act.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(act.created_at)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Activity size={26} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-900">No recent activity</p>
              <p className="text-sm text-slate-500 mt-1">Your campaign activity will appear here.</p>
            </div>
          )}
        </div>
          </>
        )}
      </div>
      {/* ============ RIGHT HALF: AI AGENT OFFICE ============ */}
      <div className="lg:sticky lg:top-6 self-start">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg">
                🏢
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm leading-tight">AI Agent Office</h2>
                <p className="text-[11px] text-slate-500">Your team at work, live</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-[11px] font-semibold text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live
            </span>
          </div>

          {/* Office scene */}
          <div className="p-3">
            <AgentOffice office={officeVariant} selectedAgentId={selectedAgentId} onAgentSelect={setSelectedAgentId} />
          </div>
        </div>
      </div>
    </div>
  )
}
