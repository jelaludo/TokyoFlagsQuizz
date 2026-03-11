import { useState, useEffect, useCallback, useRef } from 'react'
import wardsData from '../data/wards.json'
import type { Ward, FlagItem } from '../types'
import type { Settings } from '../hooks/useSettings'
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

interface FlagMatchProps {
  settings: Settings
}

type Difficulty = 'easy' | 'hard'
type GamePhase = 'intro' | 'playing' | 'results'

interface MistakeRecord {
  flag: FlagItem
  count: number
}

interface GameState {
  queue: FlagItem[]
  gridFlags: FlagItem[]
  currentIndex: number
  correct: number
  incorrect: number
  startTime: number
  elapsedSeconds: number
  feedback: { id: string; type: 'correct' | 'incorrect' } | null
  revealedIds: Set<string>
  guessedIds: Set<string>
  mistakes: Map<string, MistakeRecord>
  phase: GamePhase
  difficulty: Difficulty
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function FlagMatchMode({ settings }: FlagMatchProps) {
  const [introGrid] = useState<FlagItem[]>(() => buildGridFlags())

  const [game, setGame] = useState<GameState>({
    queue: [],
    gridFlags: [],
    currentIndex: 0,
    correct: 0,
    incorrect: 0,
    startTime: 0,
    elapsedSeconds: 0,
    feedback: null,
    revealedIds: new Set(),
    guessedIds: new Set(),
    mistakes: new Map(),
    phase: 'intro',
    difficulty: 'easy',
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startGame = useCallback((difficulty: Difficulty) => {
    const now = Date.now()
    setGame({
      queue: shuffle([...allFlags]),
      gridFlags: buildGridFlags(),
      currentIndex: 0,
      correct: 0,
      incorrect: 0,
      startTime: now,
      elapsedSeconds: 0,
      feedback: null,
      revealedIds: new Set(),
      guessedIds: new Set(),
      mistakes: new Map(),
      phase: 'playing',
      difficulty,
    })
  }, [])

  // Timer
  useEffect(() => {
    if (game.phase === 'playing') {
      timerRef.current = setInterval(() => {
        setGame(g => ({
          ...g,
          elapsedSeconds: Math.floor((Date.now() - g.startTime) / 1000),
        }))
      }, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [game.phase, game.startTime])

  const currentFlag = game.queue[game.currentIndex] as FlagItem | undefined

  const handleFlagClick = useCallback((flagId: string) => {
    setGame(g => {
      if (g.phase !== 'playing' || g.feedback) return g
      const current = g.queue[g.currentIndex]
      if (!current) return g

      if (flagId === current.id) {
        return { ...g, correct: g.correct + 1, feedback: { id: flagId, type: 'correct' as const } }
      } else {
        const newMistakes = new Map(g.mistakes)
        const existing = newMistakes.get(current.id)
        if (existing) {
          newMistakes.set(current.id, { ...existing, count: existing.count + 1 })
        } else {
          newMistakes.set(current.id, { flag: current, count: 1 })
        }
        return { ...g, incorrect: g.incorrect + 1, mistakes: newMistakes, feedback: { id: flagId, type: 'incorrect' as const } }
      }
    })
  }, [])

  // Auto-advance after correct, handle incorrect
  useEffect(() => {
    if (!game.feedback) return

    if (game.feedback.type === 'correct') {
      const timeout = setTimeout(() => {
        setGame(g => {
          const newGuessed = new Set(g.guessedIds)
          newGuessed.add(g.feedback!.id)
          const nextIndex = g.currentIndex + 1
          if (nextIndex >= g.queue.length) {
            if (timerRef.current) clearInterval(timerRef.current)
            return { ...g, feedback: null, guessedIds: newGuessed, phase: 'results' }
          }
          return { ...g, currentIndex: nextIndex, feedback: null, guessedIds: newGuessed }
        })
      }, 500)
      return () => clearTimeout(timeout)
    } else {
      const wrongId = game.feedback.id
      const shakeTimeout = setTimeout(() => {
        if (game.difficulty === 'easy') {
          setGame(g => {
            const newRevealed = new Set(g.revealedIds)
            newRevealed.add(wrongId)
            return { ...g, feedback: null, revealedIds: newRevealed }
          })
          setTimeout(() => {
            setGame(g => {
              const newRevealed = new Set(g.revealedIds)
              newRevealed.delete(wrongId)
              return { ...g, revealedIds: newRevealed }
            })
          }, 3000)
        } else {
          setGame(g => ({ ...g, feedback: null }))
        }
      }, 400)
      return () => clearTimeout(shakeTimeout)
    }
  }, [game.feedback, game.difficulty])

  // Keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (timerRef.current) clearInterval(timerRef.current)
        setGame(g => ({ ...g, phase: 'intro', feedback: null }))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Intro
  if (game.phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2 py-2 opacity-20 blur-[1px]">
            {introGrid.map(flag => (
              <div key={flag.id} className="bg-white border border-washi-darker/60 flex items-center justify-center p-1">
                <img src={flag.flag_url} alt="" className="w-full h-full object-contain" draggable={false} />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white border border-washi-darker/60 shadow-lg px-6 sm:px-8 py-6 sm:py-8 max-w-sm w-full text-center animate-in">
              <h2 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">Flag Match</h2>
              <p className="text-xs sm:text-sm text-sumi-light/50 mb-1 leading-relaxed">
                24 flags. 24 names.
              </p>
              <p className="text-xs sm:text-sm text-sumi-light/50 mb-4 sm:mb-6 leading-relaxed">
                Match each kanji name to its flag. Correct flags disappear — the grid shrinks as you go.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => startGame('easy')} className="bg-matsu text-white px-6 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors">Easy</button>
                <button onClick={() => startGame('hard')} className="bg-sumi text-washi px-6 py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors">Hard</button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-sumi-light/30 mt-3 sm:mt-4">Easy: wrong flags flip to reveal their name</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results
  if (game.phase === 'results') {
    const accuracy = game.correct + game.incorrect > 0
      ? Math.round((game.correct / (game.correct + game.incorrect)) * 100) : 0
    const mistakesList = Array.from(game.mistakes.values()).sort((a, b) => b.count - a.count)

    return (
      <div className="max-w-md mx-auto pt-2 sm:pt-6 flex-1 min-h-0 overflow-y-auto animate-in">
        <div className="bg-white border border-washi-darker/60 px-4 sm:px-6 py-5 sm:py-8 text-center">
          <h2 className="text-lg font-medium mb-1">Round Complete</h2>
          <p className="text-xs text-sumi-light/30 mb-5 uppercase tracking-widest">{game.difficulty} mode</p>

          <div className="flex justify-center gap-8 mb-6">
            <ResultStat label="Correct" value={String(game.correct)} color="text-matsu" />
            <ResultStat label="Mistakes" value={String(game.incorrect)} color="text-ake" />
            <ResultStat label="Time" value={formatTime(game.elapsedSeconds)} />
            <ResultStat label="Accuracy" value={`${accuracy}%`} />
          </div>

          {mistakesList.length > 0 && (
            <div className="mb-6 text-left">
              <h3 className="text-xs uppercase tracking-widest text-sumi-light/30 mb-2 text-center">Review</h3>
              <div className="border border-washi-darker/60">
                {mistakesList.map((m, i) => (
                  <div key={m.flag.id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-washi-darker/40' : ''}`}>
                    <img src={m.flag.flag_url} alt="" className="w-9 h-6 object-contain shrink-0" />
                    <span className="text-ake text-xs font-mono shrink-0">&times;{m.count}</span>
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-kanji text-base leading-tight">{m.flag.name_ja}</span>
                      <span className="text-xs text-sumi-light/40 truncate">{m.flag.name_en}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => startGame('easy')} className="bg-matsu text-white px-6 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors">Easy</button>
            <button onClick={() => startGame('hard')} className="bg-sumi text-washi px-6 py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors">Hard</button>
          </div>
        </div>
      </div>
    )
  }

  // Playing
  return (
    <div className="max-w-2xl mx-auto animate-in flex-1 min-h-0 flex flex-col">
      {/* Score bar */}
      <div className="flex items-center justify-between mb-1 sm:mb-3 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <Stat label="Progress" value={`${game.currentIndex + 1}/${TOTAL}`} />
          <Stat label="Correct" value={String(game.correct)} />
          <Stat label="Mistakes" value={String(game.incorrect)} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-sumi-light/30">{game.difficulty}</span>
          <span className="text-xs sm:text-sm font-mono text-sumi-light/50">{formatTime(game.elapsedSeconds)}</span>
        </div>
      </div>

      {/* Kanji prompt */}
      {currentFlag && (
        <div className="text-center mb-1 sm:mb-4 shrink-0">
          {settings.showEnglishReading && (
            <p className="text-[10px] sm:text-xs text-sumi-light/40 mb-0.5">{currentFlag.name_en}</p>
          )}
          <p className="font-kanji text-3xl sm:text-6xl leading-none">{currentFlag.name_ja}</p>
        </div>
      )}

      {/* Flag grid */}
      <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-2 pb-2">
        {game.gridFlags.map(flag => {
          const isGuessed = game.guessedIds.has(flag.id)
          if (isGuessed) return <div key={flag.id} />

          const isRevealed = game.revealedIds.has(flag.id)
          if (isRevealed) {
            return (
              <div key={flag.id} className="bg-washi border border-washi-darker/60 flex flex-col items-center justify-center p-0.5 animate-in">
                <span className="font-kanji text-sm sm:text-lg leading-tight text-sumi">{flag.name_ja}</span>
                <span className="text-[8px] sm:text-[9px] text-sumi-light/40 leading-tight">{flag.name_en}</span>
              </div>
            )
          }

          let borderStyle = 'border-washi-darker/60 hover:border-sumi/30'
          let extraClass = ''
          if (game.feedback?.id === flag.id) {
            if (game.feedback.type === 'correct') {
              borderStyle = 'border-matsu border-2'
              extraClass = 'animate-pulse-correct'
            } else {
              borderStyle = 'border-ake border-2'
              extraClass = 'animate-shake'
            }
          }

          return (
            <button
              key={flag.id}
              onClick={() => handleFlagClick(flag.id)}
              disabled={!!game.feedback}
              className={`bg-white border ${borderStyle} ${extraClass} flex items-center justify-center p-1 sm:p-1.5 transition-colors cursor-pointer disabled:cursor-default`}
            >
              <img src={flag.flag_url} alt="" className="w-full h-full object-contain" draggable={false} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-sumi-light/30">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  )
}

function ResultStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-medium ${color ?? 'text-sumi'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-sumi-light/30 mt-1">{label}</div>
    </div>
  )
}
