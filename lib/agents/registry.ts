/**
 * Client-safe registry of the AI agents.
 *
 * This module intentionally has NO server-only imports (no OpenAI client, no
 * API keys) so it can be safely imported by React components. The server-side
 * Agent definitions live in `lib/agents/definitions.ts`.
 */

export const AGENT_ROLES = ['research', 'content', 'scheduling', 'analytics'] as const

export type AgentRole = (typeof AGENT_ROLES)[number]

export interface AgentMeta {
  role: AgentRole
  /** Display name shown in the Chat UI. */
  name: string
  emoji: string
  description: string
}

/** Canonical metadata for each agent role. */
export const AGENT_REGISTRY: Record<AgentRole, AgentMeta> = {
  research: {
    role: 'research',
    name: 'Research Agent',
    emoji: '🔍',
    description: 'Finds trending topics and insights',
  },
  content: {
    role: 'content',
    name: 'Creator Agent',
    emoji: '✍️',
    description: 'Writes and designs your posts',
  },
  scheduling: {
    role: 'scheduling',
    name: 'Scheduler Agent',
    emoji: '📅',
    description: 'Plans the best time to publish',
  },
  analytics: {
    role: 'analytics',
    name: 'Analytics Agent',
    emoji: '📊',
    description: 'Tracks performance and reports insights',
  },
}

/**
 * Maps the character ids used by the office scene bundles
 * (`public/office-studio/*-office.json`) to canonical agent roles, so both
 * office variants resolve to the same backend agent.
 */
export const CHARACTER_ROLE_MAP: Record<string, AgentRole> = {
  data_agent_4: 'research', // Research Agent 🔍
  spritesheetAgent: 'content', // Creator Agent ✍️
  data_agent_7: 'scheduling', // Scheduler Agent 📅
}

/** Resolves an agent role from office-scene seat data. */
export function resolveAgentRole(params: {
  characterId?: string
  name?: string
}): AgentRole | null {
  const { characterId, name } = params

  if (characterId && CHARACTER_ROLE_MAP[characterId]) {
    return CHARACTER_ROLE_MAP[characterId]
  }

  if (name) {
    const normalised = name.toLowerCase()
    if (normalised.includes('research')) return 'research'
    if (normalised.includes('creator') || normalised.includes('content')) return 'content'
    if (normalised.includes('schedul')) return 'scheduling'
    if (normalised.includes('analytic')) return 'analytics'
  }

  return null
}

/** Type guard used by the API route to whitelist incoming agent roles. */
export function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === 'string' && (AGENT_ROLES as readonly string[]).includes(value)
}
