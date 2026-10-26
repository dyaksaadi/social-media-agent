/**
 * POST /api/agents/chat
 *
 * Streams a chat completion from one of the four OpenAI Agents SDK agents
 * (Research, Content Creation, Scheduling, Analytics) using Server-Sent Events.
 *
 * Security:
 * - Requires a valid InsForge access token (Bearer) — validated server-side.
 * - Per-user in-memory rate limiting.
 * - The OpenAI API key never leaves the server; agent roles are whitelisted,
 *   so clients cannot inject arbitrary agents or instructions.
 */

import { NextRequest } from 'next/server'
import { run } from '@openai/agents'
import { z } from 'zod'
import { createServerClient } from '@insforge/sdk/ssr'
import { getAgent } from '@/lib/agents/definitions'
import { AGENT_ROLES, type AgentRole } from '@/lib/agents/registry'

// The Agents SDK uses Node APIs (streams, crypto); keep this on the Node runtime.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_HISTORY_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 8000
const MAX_TURNS = 3
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20

const chatRequestSchema = z.object({
  agentRole: z.enum(AGENT_ROLES),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
      })
    )
    .min(1)
    .max(MAX_HISTORY_MESSAGES),
})

type ChatRequest = z.infer<typeof chatRequestSchema>

/* -------------------------------------------------------------------------- */
/*                               Auth & rate limit                            */
/* -------------------------------------------------------------------------- */

const userCache = new Map<string, { userId: string; expiresAt: number }>()
const AUTH_CACHE_TTL_MS = 60_000
const AUTH_CACHE_MAX_ENTRIES = 500

async function authenticate(bearerToken: string): Promise<string | null> {
  const now = Date.now()
  const cached = userCache.get(bearerToken)
  if (cached && cached.expiresAt > now) return cached.userId

  try {
    const serverClient = createServerClient({ accessToken: bearerToken })
    const { data } = await serverClient.auth.getCurrentUser()
    const userId = data?.user?.id
    if (!userId) return null

    if (userCache.size >= AUTH_CACHE_MAX_ENTRIES) userCache.clear()
    userCache.set(bearerToken, { userId, expiresAt: now + AUTH_CACHE_TTL_MS })
    return userId
  } catch {
    return null
  }
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>()
const RATE_BUCKETS_MAX_ENTRIES = 5_000

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(userId)

  if (!bucket || bucket.resetAt <= now) {
    if (rateBuckets.size >= RATE_BUCKETS_MAX_ENTRIES) rateBuckets.clear()
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > RATE_LIMIT_MAX_REQUESTS
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Converts validated chat history into Agents SDK input items. */
function toInputItems(messages: ChatRequest['messages']) {
  return messages.map((message) =>
    message.role === 'user'
      ? {
          type: 'message' as const,
          role: 'user' as const,
          content: [{ type: 'input_text' as const, text: message.content }],
        }
      : {
          type: 'message' as const,
          role: 'assistant' as const,
          status: 'completed' as const,
          content: [{ type: 'output_text' as const, text: message.content }],
        }
  )
}

function sse(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

/* -------------------------------------------------------------------------- */
/*                                  Handler                                   */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  // ---- Authentication ------------------------------------------------------
  const authHeader = request.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!bearerToken) {
    return jsonError('Missing Authorization header.', 401)
  }

  const userId = await authenticate(bearerToken)
  if (!userId) {
    return jsonError('Invalid or expired session.', 401)
  }

  // ---- Rate limiting -------------------------------------------------------
  if (isRateLimited(userId)) {
    return jsonError('Too many requests. Please slow down and try again shortly.', 429)
  }

  // ---- Input validation ----------------------------------------------------
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Request body must be valid JSON.', 400)
  }

  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Invalid request: check agentRole and messages.', 400)
  }

  const { agentRole, messages } = parsed.data

  // ---- Run the agent (streamed) -------------------------------------------
  let encoder: TextEncoder

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      encoder = new TextEncoder()
      try {
        const agent = getAgent(agentRole as AgentRole)

        // `request.signal` aborts the run if the browser disconnects mid-stream.
        const result = await run(agent, toInputItems(messages), {
          stream: true,
          maxTurns: MAX_TURNS,
          signal: request.signal,
        })

        for await (const event of result) {
          if (
            event.type === 'raw_model_stream_event' &&
            event.data.type === 'output_text_delta'
          ) {
            controller.enqueue(
              encoder.encode(sse({ type: 'delta', delta: event.data.delta }))
            )
          }
        }

        await result.completed
        controller.enqueue(encoder.encode(sse({ type: 'done', agentRole })))
      } catch (error) {
        // Never leak internals (or the API key) to the client.
        console.error(`[agents/chat] Run failed for role "${agentRole}":`, error)
        const message =
          error instanceof Error && /OPENAI_API_KEY/i.test(error.message)
            ? 'The AI service is not configured on the server.'
            : 'The agent failed to respond. Please try again.'
        controller.enqueue(encoder!.encode(sse({ type: 'error', error: message })))
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed/errored.
        }
      }
    },
    // No custom `cancel()` needed: if the browser disconnects, `request.signal`
    // aborts the underlying agent run and the loop above throws.
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
