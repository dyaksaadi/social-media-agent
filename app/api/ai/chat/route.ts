import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')
  const model = body.model || process.env.OPENAI_MODEL || 'openai/gpt-oss-20b'

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
      const message = data?.error?.message || data?.message || `API error (${res.status})`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'No content in response' }, { status: 502 })
    }

    return NextResponse.json({ content, model })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reach API' },
      { status: 502 },
    )
  }
}