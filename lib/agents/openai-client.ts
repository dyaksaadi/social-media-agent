/**
 * Reusable OpenAI client for the whole app.
 *
 * A single lazily-initialised `OpenAI` instance is shared by every agent run.
 * It is registered with the Agents SDK as the SDK-wide default client, so
 * string model names on any `Agent` resolve through this one client.
 *
 * SECURITY: this module reads `OPENAI_API_KEY` from the server environment and
 * must never be imported from a client component ('use client').
 */

import OpenAI from 'openai'
import { setDefaultOpenAIClient, setOpenAIAPI } from '@openai/agents'

let client: OpenAI | null = null

/**
 * Returns the shared OpenAI client, creating it on first use.
 * Throws a descriptive error when the API key is not configured, instead of
 * letting the OpenAI SDK fail with a generic message deep inside a run.
 */
export function getOpenAIClient(): OpenAI {
  if (client) return client

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Add it to your .env.local file (see .env.example) and restart the dev server.'
    )
  }

  // Free OpenAI-compatible providers (Groq, OpenRouter, Cerebras, Gemini, …)
  // speak the Chat Completions API, not the Responses API. Set
  // OPENAI_API_MODE=chat_completions to use them.
  const apiMode = (process.env.OPENAI_API_MODE || 'responses').toLowerCase()
  setOpenAIAPI(apiMode === 'chat_completions' ? 'chat_completions' : 'responses')

  client = new OpenAI({
    apiKey,
    // Optional: point at a compatible gateway/proxy (e.g. for self-hosted routers).
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })

  // Let the Agents SDK resolve string model names (e.g. "gpt-6-astra")
  // through this same shared client instance.
  setDefaultOpenAIClient(client)

  return client
}

/** Model used by the agents. Override with OPENAI_MODEL without code changes. */
export function getAgentModelName(): string {
  return process.env.OPENAI_MODEL || 'gpt-6-astra'
}
