'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MessageCircle,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Send,
  Bot,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import insforge from '@/lib/insforge-client'
import { resolveAgentRole, type AgentRole } from '@/lib/agents/registry'

export interface Agent {
  id: string
  /** Canonical role used by the backend agents API. */
  role: AgentRole
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
  pending?: boolean
  error?: boolean
}

/** Conversations are kept per agent so switching agents preserves context. */
type Conversations = Record<string, ChatMessage[]>

async function streamAgentReply({
  agentRole,
  history,
  signal,
  onDelta,
}: {
  agentRole: AgentRole
  history: { role: 'user' | 'assistant'; content: string }[]
  signal?: AbortSignal
  onDelta: (chunk: string) => void
}): Promise<void> {
  const token = await insforge.getHttpClient().getValidAccessToken()
  if (!token) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  const response = await fetch('/api/agents/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ agentRole, messages: history }),
    signal,
  })

  if (!response.ok || !response.body) {
    let message = `Request failed (${response.status})`
    try {
      const data = await response.json()
      if (data?.error) message = data.error
    } catch {
      // Keep the default message.
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data: ')) continue
      let payload: { type?: string; delta?: string; error?: string }
      try {
        payload = JSON.parse(line.slice(6))
      } catch {
        continue
      }
      if (payload.type === 'delta' && payload.delta) {
        onDelta(payload.delta)
      } else if (payload.type === 'error') {
        throw new Error(payload.error || 'The agent failed to respond.')
      }
    }
  }
}

export default function AgentPanel({ agent }: { agent: Agent | null }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'settings'>('chat')
  const [conversations, setConversations] = useState<Conversations>({})
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [settings, setSettings] = useState({ autoReply: true, notify: true })
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const messages = agent ? (conversations[agent.id] ?? []) : []

  // Reset transient state when switching agents (history stays per agent).
  useEffect(() => {
    setInput('')
    setActiveTab('chat')
  }, [agent?.id])

  // Auto-scroll the chat to the latest message.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isStreaming])

  // Abort any in-flight stream when the component unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  if (!agent) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <Bot size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="font-semibold text-slate-900">No agent selected</p>
        <p className="text-sm text-slate-500 mt-1">Click an agent in the office to start chatting.</p>
      </div>
    )
  }

  const updateMessage = (agentId: string, messageId: string, patch: Partial<ChatMessage>) => {
    setConversations((prev) => ({
      ...prev,
      [agentId]: (prev[agentId] ?? []).map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
    }))
  }

  const appendToMessage = (agentId: string, messageId: string, chunk: string) => {
    setConversations((prev) => ({
      ...prev,
      [agentId]: (prev[agentId] ?? []).map((m) =>
        m.id === messageId ? { ...m, text: m.text + chunk } : m
      ),
    }))
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    const agentId = agent.id
    // Fall back to resolving the role from the agent's name so a missing
    // `role` (e.g. an agent list built elsewhere) never sends an invalid request.
    const agentRole: AgentRole | null = agent.role ?? resolveAgentRole({ name: agent.name })

    if (!agentRole) {
      setConversations((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] ?? []),
          {
            id: `a-${Date.now()}`,
            role: 'agent' as const,
            text: `${agent.name} is not linked to an AI agent yet.`,
            ts: Date.now(),
            error: true,
          },
        ],
      }))
      return
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text, ts: Date.now() }
    const replyId = `a-${Date.now()}`
    const replyMsg: ChatMessage = { id: replyId, role: 'agent', text: '', ts: Date.now(), pending: true }

    const history = [...(conversations[agentId] ?? []), userMsg]
    setConversations((prev) => ({ ...prev, [agentId]: [...history, replyMsg] }))
    setInput('')
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamAgentReply({
        agentRole,
        signal: controller.signal,
        // Send the full per-agent history so the agent keeps context.
        history: history.map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        })),
        onDelta: (chunk) => appendToMessage(agentId, replyId, chunk),
      })
      updateMessage(agentId, replyId, { pending: false })
    } catch (err) {
      if (controller.signal.aborted) {
        // User navigated away / component unmounted — drop the placeholder.
        setConversations((prev) => ({
          ...prev,
          [agentId]: (prev[agentId] ?? []).filter((m) => m.id !== replyId),
        }))
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        updateMessage(agentId, replyId, {
          pending: false,
          error: true,
          text: message,
        })
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsStreaming(false)
    }
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
        {isStreaming && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-600">
            <Loader2 size={12} className="animate-spin" /> Thinking…
          </span>
        )}
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
            <div
              ref={listRef}
              className="h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2"
            >
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
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : m.error
                            ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      {m.pending && !m.text ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                          <Loader2 size={13} className="animate-spin" /> …
                        </span>
                      ) : (
                        m.text
                      )}
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
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={isStreaming}
                placeholder={`Message ${agent.name}...`}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl flex items-center gap-1.5 text-sm font-semibold transition shadow-sm"
              >
                {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {agent.name} answers with its own role instructions and remembers this conversation.
            </p>
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
                    <p className="text-sm text-slate-800 truncate">{m.text || '…'}</p>
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
