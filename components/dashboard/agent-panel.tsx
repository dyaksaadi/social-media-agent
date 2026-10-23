'use client'

import { useEffect, useState } from 'react'
import {
  MessageCircle,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Send,
  Bot,
  CheckCircle2,
} from 'lucide-react'

export interface Agent {
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

export default function AgentPanel({ agent }: { agent: Agent | null }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'settings'>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [settings, setSettings] = useState({ autoReply: true, notify: true })

  useEffect(() => {
    setMessages([])
    setInput('')
    setSettings({ autoReply: true, notify: true })
    setActiveTab('chat')
  }, [agent?.id])

  if (!agent) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <Bot size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="font-semibold text-slate-900">No agent selected</p>
        <p className="text-sm text-slate-500 mt-1">Click an agent in the office to start chatting.</p>
      </div>
    )
  }

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: input.trim(), ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    const currentInput = input.trim()
    setInput('')
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: `${agent.name}: I've noted "${currentInput}". I'll work on it and get back to you shortly.`,
        ts: Date.now(),
      }
      setMessages((prev) => [...prev, reply])
    }, 700)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Profile header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        {agent.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.thumbnail}
            alt={agent.name}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
            {agent.emoji || <Bot size={18} />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm leading-tight">{agent.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{agent.description}</p>
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
                  active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === 'chat' && (
          <div className="flex flex-col gap-3">
            <div className="h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Bot size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Start a conversation</p>
                  <p className="text-xs text-slate-500">Ask {agent.name} anything.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                placeholder={`Message ${agent.name}...`}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <button
                onClick={handleSend}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 text-sm font-semibold transition shadow-sm"
              >
                <Send size={14} /> Send
              </button>
            </div>
            <p className="text-[11px] text-slate-400">AI replies are simulated — InsForge AI requires a paid plan.</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <HistoryIcon size={26} className="text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-700">No history yet</p>
                <p className="text-xs text-slate-500">Your conversations will appear here.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {m.role === 'user' ? 'U' : agent.emoji || <Bot size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{m.role === 'user' ? 'You' : agent.name}</p>
                    <p className="text-sm text-slate-800 truncate">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Agent name</label>
              <input value={agent.name} disabled className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
              <textarea
                value={agent.description || ''}
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
                onClick={() => setSettings((s) => ({ ...s, autoReply: !s.autoReply }))}
                className={`w-10 h-6 rounded-full transition ${settings.autoReply ? 'bg-blue-600' : 'bg-slate-200'} relative`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${settings.autoReply ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Notifications</p>
                <p className="text-xs text-slate-500">Get notified when this agent completes a task.</p>
              </div>
              <button
                onClick={() => setSettings((s) => ({ ...s, notify: !s.notify }))}
                className={`w-10 h-6 rounded-full transition ${settings.notify ? 'bg-blue-600' : 'bg-slate-200'} relative`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${settings.notify ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
            {settings.autoReply && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 size={12} /> Settings saved locally
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
