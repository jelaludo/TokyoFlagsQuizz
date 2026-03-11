import { useState, useEffect, useCallback, useRef } from 'react'
import wardsData from '../data/wards.json'
import type { Ward, FlagItem } from '../types'
import { shuffle } from '../utils'
import { tokyoMetro } from '../data/tokyo-metro'

const wards = wardsData as Ward[]

const allFlags: FlagItem[] = [
  ...wards.map(w => ({ id: w.id, name_en: w.name_en, name_ja: w.name_ja, flag_url: w.flag_url })),
  tokyoMetro,
]
const TOTAL = allFlags.length // 24

function buildGridFlags(): FlagItem[] {
  return shuffle([...allFlags])
}

type Phase = 'intro' | 'playing' | 'complete'

interface MapState {
  gridFlags: FlagItem[]
  names: FlagItem[]
  selectedId: string | null
  revealedIds: Set<string>
  wrongId: string | null
  mistakes: number
  startTime: number
  elapsedSeconds: number
  phase: Phase
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MapMode() {
  const [introGrid] = useState<FlagItem[]>(() => buildGridFlags())
  const [game, setGame] = useState<MapState>(() => ({
    gridFlags: [],
    names: [],
    selectedId: null,
    revealedIds: new Set(),
    wrongId: null,
    mistakes: 0,
    startTime: 0,
    elapsedSeconds: 0,
    phase: 'intro',
  }))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startGame = useCallback(() => {
    setGame({
      gridFlags: buildGridFlags(),
      names: shuffle([...allFlags]),
      selectedId: null,
      revealedIds: new Set(),
      wrongId: null,
      mistakes: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      phase: 'playing',
    })
  }, [])

  const reset = useCallback(() => {
    startGame()
  }, [startGame])

  // Timer
  useEffect(() => {
    if (game.phase === 'playing') {
      timerRef.current = setInterval(() => {
        setGame(g => ({ ...g, elapsedSeconds: Math.floor((Date.now() - g.startTime) / 1000) }))
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [game.phase, game.startTime])

  const selectName = useCallback((id: string) => {
    setGame(g => {
      if (g.phase !== 'playing' || g.revealedIds.has(id)) return g
      return { ...g, selectedId: g.selectedId === id ? null : id }
    })
  }, [])

  const clickFlag = useCallback((flagId: string) => {
    setGame(g => {
      if (g.phase !== 'playing' || !g.selectedId || g.wrongId) return g
      if (g.revealedIds.has(flagId)) return g

      if (flagId === g.selectedId) {
        const newRevealed = new Set(g.revealedIds)
        newRevealed.add(flagId)
        const allDone = newRevealed.size === TOTAL
        if (allDone && timerRef.current) clearInterval(timerRef.current)
        return {
          ...g,
          revealedIds: newRevealed,
          selectedId: null,
          phase: allDone ? 'complete' : 'playing',
        }
      } else {
        return { ...g, wrongId: flagId, mistakes: g.mistakes + 1 }
      }
    })
  }, [])

  // Clear wrong flash
  useEffect(() => {
    if (!game.wrongId) return
    const t = setTimeout(() => {
      setGame(g => ({ ...g, wrongId: null }))
    }, 400)
    return () => clearTimeout(t)
  }, [game.wrongId])

  // Keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setGame(g => ({ ...g, selectedId: null }))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const remaining = TOTAL - game.revealedIds.size

  // Intro: modal over greyed-out grid
  if (game.phase === 'intro') {
    return (
      <div className="max-w-5xl mx-auto flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-1.5 py-2 opacity-20 blur-[1px]">
            {introGrid.map(flag => (
              <div key={flag.id} className="aspect-square bg-white border border-washi-darker/60 flex items-center justify-center p-1">
                <img src={flag.flag_url} alt="" className="w-full h-full object-contain" draggable={false} />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white border border-washi-darker/60 shadow-lg px-6 sm:px-8 py-6 sm:py-8 max-w-sm w-full text-center animate-in">
              <h2 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">Link the Ward name to its flag!</h2>
              <p className="text-xs sm:text-sm text-sumi-light/50 mb-5 sm:mb-6 leading-relaxed">
                How well do you know Tokyo? Start with those you know best!
              </p>
              <button
                onClick={startGame}
                className="bg-matsu text-white px-8 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex-1 min-h-0 flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-1 sm:mb-2 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <Stat label="Remaining" value={`${remaining}/${TOTAL}`} />
          <Stat label="Mistakes" value={String(game.mistakes)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-mono text-sumi-light/50">{formatTime(game.elapsedSeconds)}</span>
          {game.phase === 'complete' && (
            <button onClick={reset} className="bg-matsu text-white px-3 py-1 text-xs font-medium hover:bg-matsu-light transition-colors">
              Again
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-1.5 sm:gap-3 pb-2">
        {/* Names bucket */}
        <div className="shrink-0 sm:w-44 overflow-y-auto">
          <div className="flex flex-wrap sm:flex-col gap-0.5 sm:gap-0.5">
            {game.names.map(flag => {
              const isRevealed = game.revealedIds.has(flag.id)
              const isSelected = game.selectedId === flag.id

              if (isRevealed) {
                return (
                  <span key={flag.id} className="px-1.5 py-0.5 sm:py-1 text-[9px] sm:text-xs text-sumi-light/20 line-through">
                    {flag.name_ja}
                  </span>
                )
              }

              return (
                <button
                  key={flag.id}
                  onClick={() => selectName(flag.id)}
                  className={`px-1.5 py-0.5 sm:py-1 text-[9px] sm:text-xs font-medium transition-colors text-left border ${
                    isSelected
                      ? 'border-matsu bg-matsu/10 text-matsu'
                      : 'border-transparent hover:bg-washi-dark/50 text-sumi'
                  }`}
                >
                  <span className="font-jp">{flag.name_ja}</span>
                  <span className="text-sumi-light/40 ml-1">{flag.name_en}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Flag grid */}
        <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-1.5 content-start">
          {game.gridFlags.map(flag => {
            const isRevealed = game.revealedIds.has(flag.id)
            const isWrong = game.wrongId === flag.id

            if (isRevealed) {
              return (
                <div key={flag.id} className="aspect-square border-2 border-matsu bg-matsu/5 flex flex-col items-center justify-center p-0.5 animate-in">
                  <img src={flag.flag_url} alt="" className="w-3/4 h-1/2 object-contain opacity-30" draggable={false} />
                  <span className="font-kanji text-[10px] sm:text-sm leading-tight text-matsu mt-0.5">{flag.name_ja}</span>
                </div>
              )
            }

            let borderStyle = 'border-washi-darker/60'
            let extraClass = ''
            if (isWrong) {
              borderStyle = 'border-ake border-2'
              extraClass = 'animate-shake'
            } else if (game.selectedId) {
              borderStyle = 'border-washi-darker/60 hover:border-matsu/50'
            }

            return (
              <button
                key={flag.id}
                onClick={() => clickFlag(flag.id)}
                disabled={!game.selectedId || !!game.wrongId}
                className={`aspect-square bg-white border ${borderStyle} ${extraClass} flex items-center justify-center p-1 transition-colors ${
                  game.selectedId ? 'cursor-pointer' : 'cursor-default'
                } disabled:cursor-default`}
              >
                <img src={flag.flag_url} alt="" className="w-full h-full object-contain" draggable={false} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Complete overlay */}
      {game.phase === 'complete' && (
        <div className="fixed inset-0 z-40 bg-sumi/20 flex items-center justify-center p-4" onClick={reset}>
          <div className="bg-white border border-washi-darker/60 shadow-lg px-8 py-8 max-w-xs text-center animate-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-medium mb-3">All Matched!</h2>
            <div className="flex justify-center gap-6 mb-5">
              <div className="text-center">
                <div className="text-xl font-medium text-ake">{game.mistakes}</div>
                <div className="text-[10px] uppercase tracking-widest text-sumi-light/30 mt-0.5">Mistakes</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-medium">{formatTime(game.elapsedSeconds)}</div>
                <div className="text-[10px] uppercase tracking-widest text-sumi-light/30 mt-0.5">Time</div>
              </div>
            </div>
            <button onClick={reset} className="bg-matsu text-white px-6 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-sumi-light/30">{label}</span>
      <span className="font-medium text-xs sm:text-sm">{value}</span>
    </div>
  )
}
