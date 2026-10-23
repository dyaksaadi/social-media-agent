'use client'

import { useEffect, useMemo, useState } from 'react'

export type OfficeVariant = 'modern' | 'wooden'

interface SceneCharacter {
  id: string
  name: string
  emoji?: string
  description?: string
  width: number
  height: number
  thumbnail?: string
  sprite?: string
  animations?: Record<string, string[]>
}

interface SceneSeat {
  id: string
  label?: string
  x: number
  y: number
  width?: number
  zIndex?: number
  character?: SceneCharacter
}

interface SceneBundle {
  office: {
    id: string
    name: string
    description?: string
    tone?: string
    width: number
    height: number
    background: string
  }
  seats: SceneSeat[]
}

const FRAME_MS = 150

export default function AgentOffice({ office = 'modern' }: { office?: OfficeVariant }) {
  const [scene, setScene] = useState<SceneBundle | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [tick, setTick] = useState(0)

  // Load scene bundle for the selected office
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setScene(null)
    setTick(0)

    fetch(`/office-studio/${office}-office.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load office scene (HTTP ${res.status})`)
        return res.json()
      })
      .then((data: SceneBundle) => {
        if (cancelled || !data?.office || !Array.isArray(data.seats)) {
          throw new Error('Invalid office scene data')
        }
        setScene(data)
        setStatus('ready')
        // Preload every sprite frame so the typing animation never flickers
        data.seats.forEach((seat) => {
          const frames = seat.character?.animations?.typing || []
          frames.forEach((src) => {
            const img = new Image()
            img.src = src
          })
        })
      })
      .catch((err) => {
        console.error('AgentOffice failed to load scene:', err)
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [office])

  const maxFrames = useMemo(() => {
    if (!scene) return 0
    return Math.max(1, ...scene.seats.map((s) => s.character?.animations?.typing?.length || 1))
  }, [scene])

  // Cycle frames for the typing animation
  useEffect(() => {
    if (status !== 'ready' || maxFrames <= 1) return
    const id = setInterval(() => setTick((t) => t + 1), FRAME_MS)
    return () => clearInterval(id)
  }, [status, maxFrames])

  if (status === 'loading') {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        style={{ aspectRatio: '3 / 2' }}
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="text-2xl">🏢</span>
          <p className="text-xs font-medium text-slate-500">Preparing the office…</p>
        </div>
      </div>
    )
  }

  if (status === 'error' || !scene) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        style={{ aspectRatio: '3 / 2' }}
      >
        <img
          src={`/offices/${office}-office.png`}
          alt="Office"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-white via-white/85 to-transparent px-4 pt-10 pb-4">
          <span className="text-sm">😕</span>
          <p className="text-xs font-semibold text-slate-600">
            Office scene unavailable — refresh to retry.
          </p>
        </div>
      </div>
    )
  }

  const { office: meta, seats } = scene

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      style={{ aspectRatio: `${meta.width} / ${meta.height}` }}
      aria-label={`${meta.name} scene with ${seats.length} AI agents`}
    >
      {/* Office background */}
      <img
        src={meta.background}
        alt={meta.name}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />

      {/* AI agent characters */}
      {seats.map((seat) => {
        const ch = seat.character
        if (!ch) return null
        const frames: string[] = ch.animations?.typing?.length
          ? ch.animations.typing
          : ([ch.thumbnail, ch.sprite].filter(Boolean) as string[])
        if (!frames.length) return null
        const src = frames[tick % frames.length]

        return (
          <div
            key={seat.id}
            className="group absolute"
            style={{
              left: `${(seat.x / meta.width) * 100}%`,
              top: `${(seat.y / meta.height) * 100}%`,
              width: `${(ch.width / meta.width) * 100}%`,
              height: `${(ch.height / meta.height) * 100}%`,
              zIndex: (seat.zIndex || 1) + 2,
            }}
          >
            {/* Popover: emoji + agent name, description appears on hover */}
            <div className="absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 flex-col items-center">
              {ch.description ? (
                <div className="mb-1.5 max-w-[170px] translate-y-1 rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-center text-[10px] font-medium leading-snug text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                  {ch.description}
                </div>
              ) : null}

              {/* Name pill */}
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/95 px-2.5 py-1.5 shadow-[0_8px_20px_-6px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 backdrop-blur-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-[0_12px_26px_-8px_rgba(37,99,235,0.4)]">
                <span className="text-[13px] leading-none">{ch.emoji || '🤖'}</span>
                <span className="whitespace-nowrap text-[11px] font-bold leading-none text-slate-700 transition-colors group-hover:text-blue-700">
                  {ch.name}
                </span>
              </div>

              {/* Caret pointing down to the agent */}
              <div className="-mt-1.5 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white [filter:drop-shadow(0_2px_2px_rgba(15,23,42,0.08))]" />
            </div>

            {/* Character sprite (typing animation) */}
            <img
              src={src}
              alt={ch.name}
              draggable={false}
              className="h-full w-full object-contain object-bottom select-none [filter:drop-shadow(0_6px_10px_rgba(15,23,42,0.18))]"
              onError={(e) => {
                const img = e.currentTarget
                if (ch.thumbnail && !img.src.endsWith(ch.thumbnail)) {
                  img.src = ch.thumbnail
                }
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
