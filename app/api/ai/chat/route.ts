import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const DEFAULT_BASE_URL = 'https://opencode.ai/inference/openai/v1'
const DEFAULT_MODEL = 'glm-5.3'

export async function POST(req: NextRequest) {
  let body: { messages?: { role: string; content: string }[]; model?: string; prompt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const apiKey = process.env.OPENCODE_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENCODE_API_KEY is not configured' }, { status: 500 })
  }

  const baseUrl = (process.env.OPENCODE_API_URL || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const model = body.model || process.env.OPENCODE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL

  const messages = Array.isArray(body.messages)
    ? body.messages
    : body.prompt
      ? [{ role: 'user', content: body.prompt }]
      : null

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'messages or prompt is required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const message = data?.error?.message || data?.message || `OpenCode API error (${res.status})`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'No content in OpenCode response' }, { status: 502 })
    }

    return NextResponse.json({ content, model })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reach OpenCode API' },
      { status: 502 },
    )
  }
}
