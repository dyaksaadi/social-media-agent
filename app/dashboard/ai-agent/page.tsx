'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'
import AgentOffice from '@/components/dashboard/agent-office'
import type { OfficeVariant } from '@/components/dashboard/agent-office'
import {
  MessageCircle,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Send,
  Sparkles,
  Bot,
  CheckCircle2,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  emoji?: string
  description?: string
  thumbnail?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  ts: number
}

const AGENT_COLORS = ['bg-purple-100 text-purple-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600']

export default function AiAgentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<any>(null)
  const [officeVariant, setOfficeVariant] = useState<OfficeVariant>('modern')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'settings'>('chat')
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  // Agent settings (local UI state)
  const [settings, setSettings] = useState<Record<string, { autoReply: boolean; notify: boolean }>>({})

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
        if (list.length > 0) {
          setSelectedAgentId((prev) => prev || list[0].id)
        }
        const initSettings: Record<string, { autoReply: boolean; notify: boolean }> = {}
        list.forEach((a) => {
          initSettings[a.id] = { autoReply: true, notify: true }
        })
        setSettings((prev) => ({ ...initSettings, ...prev }))
      })
      .catch((err) => console.error('Failed to load agents:', err))
      .finally(() => setLoading(false))

    return () => {
      cancelled = true
    }
  }, [officeVariant])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null
  const selectedChats = selectedAgentId ? chats[selectedAgentId] || [] : []

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id)
    setActiveTab('chat')
  }

  const handleSend = () => {
    if (!input.trim() || !selectedAgentId || !selectedAgent) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      ts: Date.now(),
    }
    setChats((prev) => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] || []), userMsg],
    }))
    const currentInput = input.trim()
    setInput('')
    // Simulated agent reply (InsForge AI requires paid plan)
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: `${selectedAgent.name}: I've noted "${currentInput}". I'll work on it and get back to you shortly.`,
        ts: Date.now(),
      }
      setChats((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), reply],
      }))
    }, 700)
  }

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
        {/* Header */}
        <div>
          <p className="text-purple-500 text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles size={14} /> AI Agent Workspace
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2">
            Chat with your AI team
          </h1>
          <p className="text-slate-500 text-sm max-w-lg">
            Select an agent to chat, review history, or adjust settings.
          </p>
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
                    active
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${color} ${active ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                    {agent.emoji || <Bot size={20} />}
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                    {agent.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected agent tabs */}
        {selectedAgent ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Agent header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${AGENT_COLORS[agents.findIndex((a) => a.id === selectedAgent.id) % AGENT_COLORS.length]}`}>
                {selectedAgent.emoji || <Bot size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm leading-tight">{selectedAgent.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{selectedAgent.description}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pt-3">
              <div className="flex gap-1 border-b border-slate-100">
                {[
                  { key: 'chat' as const, label: 'Chat', icon: MessageCircle },
                  { key: 'history' as const, label: 'History', icon: HistoryIcon },
                  { key: 'settings' as const, label: 'Settings', icon: SettingsIcon },
                ].map((t) => {
                  const Icon = t.icon
                  const active = activeTab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                        active
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={14} /> {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-5">
              {activeTab === 'chat' && (
                <div className="flex flex-col gap-3">
                  <div className="h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                    {selectedChats.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <Bot size={28} className="text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-700">Start a conversation</p>
                        <p className="text-xs text-slate-500">Ask {selectedAgent.name} anything.</p>
                      </div>
                    ) : (
                      selectedChats.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                              m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSend()
                      }}
                      placeholder={`Message ${selectedAgent.name}...`}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                    <button
                      onClick={handleSend}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 text-sm font-semibold transition shadow-sm"
                    >
                      <Send size={14} /> Send
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AI replies are simulated — InsForge AI requires a paid plan.
                  </p>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2">
                  {selectedChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <HistoryIcon size={26} className="text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-700">No history yet</p>
                      <p className="text-xs text-slate-500">Your conversations will appear here.</p>
                    </div>
                  ) : (
                    selectedChats.map((m) => (
                      <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {m.role === 'user' ? 'U' : selectedAgent.emoji || <Bot size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">{m.role === 'user' ? 'You' : selectedAgent.name}</p>
                          <p className="text-sm text-slate-800 truncate">{m.text}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Agent name</label>
                    <input
                      value={selectedAgent.name}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
                    <textarea
                      value={selectedAgent.description || ''}
                      disabled
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Auto-reply</p>
                      <p className="text-xs text-slate-500">Agent responds automatically to new messages.</p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          [selectedAgent.id]: {
                            ...prev[selectedAgent.id],
                            autoReply: !prev[selectedAgent.id]?.autoReply,
                          },
                        }))
                      }
                      className={`w-10 h-6 rounded-full transition ${settings[selectedAgent.id]?.autoReply ? 'bg-blue-600' : 'bg-slate-200'} relative`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${settings[selectedAgent.id]?.autoReply ? 'left-4' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Notifications</p>
                      <p className="text-xs text-slate-500">Get notified when this agent completes a task.</p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          [selectedAgent.id]: {
                            ...prev[selectedAgent.id],
                            notify: !prev[selectedAgent.id]?.notify,
                          },
                        }))
                      }
                      className={`w-10 h-6 rounded-full transition ${settings[selectedAgent.id]?.notify ? 'bg-blue-600' : 'bg-slate-200'} relative`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${settings[selectedAgent.id]?.notify ? 'left-4' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                  {settings[selectedAgent.id]?.autoReply && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 size={12} /> Settings saved locally
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <Bot size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-900">No agents available</p>
            <p className="text-sm text-slate-500 mt-1">Load an office scene to see your agents.</p>
          </div>
        )}
      </div>

      {/* ============ RIGHT HALF: OFFICE PREVIEW ============ */}
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
            <AgentOffice
              office={officeVariant}
              selectedAgentId={selectedAgentId}
              onAgentSelect={handleSelectAgent}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
