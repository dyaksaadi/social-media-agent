'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'
import AgentOffice from '@/components/dashboard/agent-office'
import type { OfficeVariant } from '@/components/dashboard/agent-office'
import AgentPanel, { type Agent } from '@/components/dashboard/agent-panel'
import { Sparkles, Bot } from 'lucide-react'

export default function AiAgentPage() {
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<any>(null)
  const [officeVariant, setOfficeVariant] = useState<OfficeVariant>('modern')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
        const variant: OfficeVariant = String(data?.office_image || '').includes('wooden') ? 'wooden' : 'modern'
        setOfficeVariant(variant)
      } catch (err) {
        console.error('Error fetching campaign:', err)
      }
    }
    if (user) fetchCampaign()
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
        if (list.length > 0) setSelectedAgentId((prev) => prev || list[0].id)
      })
      .catch((err) => console.error('Failed to load agents:', err))
      .finally(() => setLoading(false))
    return () => {
      cancelled = true
    }
  }, [officeVariant])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id)
  }

  const AGENT_COLORS = ['bg-purple-100 text-purple-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600']

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-24">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT HALF */}
      <div className="space-y-6">
        <div>
          <p className="text-purple-500 text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles size={14} /> AI Agent Workspace
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2">Chat with your AI team</h1>
          <p className="text-slate-500 text-sm max-w-lg">Select an agent to chat, review history, or adjust settings.</p>
        </div>

        {/* Agents row */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Agents</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {agents.map((agent, idx) => {
              const active = agent.id === selectedAgentId
              const color = AGENT_COLORS[idx % AGENT_COLORS.length]
              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition min-w-[92px] ${
                    active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${color} ${active ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                    {agent.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={agent.thumbnail} alt={agent.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      agent.emoji || <Bot size={20} />
                    )}
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                    {agent.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <AgentPanel agent={selectedAgent} />
      </div>

      {/* RIGHT HALF */}
      <div className="lg:sticky lg:top-6 self-start">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-lg">
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm leading-tight">AI Agent Office</h2>
                <p className="text-[11px] text-slate-500">Click a character to select</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-[11px] font-semibold text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="p-3">
            <AgentOffice office={officeVariant} selectedAgentId={selectedAgentId} onAgentSelect={handleSelectAgent} />
          </div>
        </div>
      </div>
    </div>
  )
}
