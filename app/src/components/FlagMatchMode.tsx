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

function buildGridFlags(flags: FlagItem[]): FlagItem[] {
  return shuffle([...flags])
}

interface FlagMatchProps {
  settings: Settings
  practiceFlags: FlagItem[] | null
  onClearPractice: () => void
  onStartPractice: (flags: FlagItem[], targetMode: 'guess' | 'flagmatch') => void
}

type Difficulty = 'easy' | 'hard'
type GamePhase = 'intro' | 'playing' | 'results' | 'stats' | 'review'

interface MistakeRecord {
  flag: FlagItem
  count: number
}

interface FlagTiming {
  flag: FlagItem
  timeMs: number
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
  revealedByMistakeIds: Set<string> // flags revealed because they were wrongly clicked (easy mode)
  timings: FlagTiming[]
  questionStartTime: number
  phase: GamePhase
  difficulty: Difficulty
  total: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatMs(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

export default function FlagMatchMode({ settings, practiceFlags, onClearPractice, onStartPractice }: FlagMatchProps) {
  const flags = practiceFlags ?? allFlags
  const total = flags.length

  const [introGrid] = useState<FlagItem[]>(() => buildGridFlags(allFlags))

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
    revealedByMistakeIds: new Set(),
    timings: [],
    questionStartTime: 0,
    phase: 'intro',
    difficulty: 'easy',
    total,
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const practiceStarted = useRef(false)

  const startGame = useCallback((difficulty: Difficulty) => {
    const f = practiceFlags ?? allFlags
    const now = Date.now()
    setGame({
      queue: shuffle([...f]),
      gridFlags: buildGridFlags(f),
      currentIndex: 0,
      correct: 0,
      incorrect: 0,
      startTime: now,
      elapsedSeconds: 0,
      feedback: null,
      revealedIds: new Set(),
      guessedIds: new Set(),
      mistakes: new Map(),
      revealedByMistakeIds: new Set(),
      timings: [],
      questionStartTime: now,
      phase: 'playing',
      difficulty,
      total: f.length,
    })
  }, [practiceFlags])

  // Auto-start practice mode
  useEffect(() => {
    if (practiceFlags && !practiceStarted.current) {
      practiceStarted.current = true
      startGame('easy')
    }
  }, [practiceFlags, startGame])

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
        const timeMs = Date.now() - g.questionStartTime
        const newTimings = [...g.timings, { flag: current, timeMs }]
        return { ...g, correct: g.correct + 1, feedback: { id: flagId, type: 'correct' as const }, timings: newTimings }
      } else {
        const newMistakes = new Map(g.mistakes)
        const existing = newMistakes.get(current.id)
        if (existing) {
          newMistakes.set(current.id, { ...existing, count: existing.count + 1 })
        } else {
          newMistakes.set(current.id, { flag: current, count: 1 })
        }
        const newRevealedByMistake = new Set(g.revealedByMistakeIds)
        if (g.difficulty === 'easy') newRevealedByMistake.add(flagId)
        return { ...g, incorrect: g.incorrect + 1, mistakes: newMistakes, revealedByMistakeIds: newRevealedByMistake, feedback: { id: flagId, type: 'incorrect' as const } }
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
          return { ...g, currentIndex: nextIndex, feedback: null, guessedIds: newGuessed, questionStartTime: Date.now() }
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
          <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-0.5 sm:gap-1.5 py-2 opacity-20 blur-[1px]">
            {introGrid.map(flag => (
              <div key={flag.id} className="aspect-[4/3] bg-white border border-washi-darker/60 flex items-center justify-center px-1.5 py-0.5">
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
              <h3 className="text-xs uppercase tracking-widest text-sumi-light/30 mb-2 text-center">Mistakes</h3>
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

          <div className="flex gap-3 justify-center mb-3">
            <button onClick={() => startGame('easy')} className="bg-matsu text-white px-6 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors">Easy</button>
            <button onClick={() => startGame('hard')} className="bg-sumi text-washi px-6 py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors">Hard</button>
          </div>

          {!practiceFlags && game.timings.length > 0 && (
            <button
              onClick={() => setGame(g => ({ ...g, phase: 'stats' }))}
              className="text-xs text-sumi-light/40 hover:text-sumi transition-colors underline underline-offset-2"
            >
              View timing stats →
            </button>
          )}

          {practiceFlags && (
            <button onClick={onClearPractice} className="mt-1 text-xs text-sumi-light/40 hover:text-sumi transition-colors">
              ← Back to stats
            </button>
          )}
        </div>
      </div>
    )
  }

  // Stats
  if (game.phase === 'stats') {
    const errorIds = new Set([
      ...Array.from(game.mistakes.keys()),
      ...game.revealedByMistakeIds,
    ])
    const toReview = game.timings
      .filter(t => errorIds.has(t.flag.id))
      .sort((a, b) => b.timeMs - a.timeMs)
    const known = game.timings
      .filter(t => !errorIds.has(t.flag.id))
      .sort((a, b) => a.timeMs - b.timeMs)

    return (
      <div className="max-w-md mx-auto pt-2 sm:pt-6 flex-1 min-h-0 overflow-y-auto animate-in">
        <div className="bg-white border border-washi-darker/60 px-4 sm:px-6 py-5 sm:py-8">
          <h2 className="text-lg font-medium mb-1 text-center">Performance</h2>
          <p className="text-xs text-sumi-light/30 mb-5 uppercase tracking-widest text-center">Based on errors &amp; timing</p>

          {toReview.length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-widest text-ake/60 mb-2">To Review — {toReview.length} flag{toReview.length !== 1 ? 's' : ''}</h3>
              <div className="border border-washi-darker/60 mb-5">
                {toReview.map((t, i) => {
                  const mistakeEntry = game.mistakes.get(t.flag.id)
                  return (
                    <div key={t.flag.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-washi-darker/40' : ''}`}>
                      <img src={t.flag.flag_url} alt="" className="w-8 h-5 object-contain shrink-0" />
                      <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        <span className="font-kanji text-sm leading-tight">{t.flag.name_ja}</span>
                        <span className="text-xs text-sumi-light/40 truncate">{t.flag.name_en}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {mistakeEntry && (
                          <span className="text-[9px] text-ake font-medium">&times;{mistakeEntry.count}</span>
                        )}
                        {game.revealedByMistakeIds.has(t.flag.id) && !mistakeEntry && (
                          <span className="text-[9px] text-sumi-light/40">revealed</span>
                        )}
                        <span className="text-xs font-mono text-ake">{formatMs(t.timeMs)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {known.length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-widest text-matsu/60 mb-2">Known — {known.length} flag{known.length !== 1 ? 's' : ''}</h3>
              <div className="border border-washi-darker/60 mb-6">
                {known.slice(0, 10).map((t, i) => (
                  <div key={t.flag.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-washi-darker/40' : ''}`}>
                    <img src={t.flag.flag_url} alt="" className="w-8 h-5 object-contain shrink-0" />
                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                      <span className="font-kanji text-sm leading-tight">{t.flag.name_ja}</span>
                      <span className="text-xs text-sumi-light/40 truncate">{t.flag.name_en}</span>
                    </div>
                    <span className="text-xs font-mono text-matsu shrink-0">{formatMs(t.timeMs)}</span>
                  </div>
                ))}
                {known.length > 10 && (
                  <div className="px-3 py-1.5 text-[10px] text-sumi-light/30 text-center border-t border-washi-darker/40">
                    +{known.length - 10} more
                  </div>
                )}
              </div>
            </>
          )}

          {toReview.length >= 3 && (
            <button
              onClick={() => setGame(g => ({ ...g, phase: 'review' }))}
              className="w-full bg-washi border border-washi-darker/60 py-3 text-sm font-medium text-sumi hover:bg-washi-dark/50 transition-colors"
            >
              Learn the unfamiliar ones?
            </button>
          )}

          <button
            onClick={() => setGame(g => ({ ...g, phase: 'results' }))}
            className="w-full mt-2 py-2 text-xs text-sumi-light/40 hover:text-sumi transition-colors"
          >
            ← Back to results
          </button>
        </div>
      </div>
    )
  }

  // Review
  if (game.phase === 'review') {
    const errorIds = new Set([
      ...Array.from(game.mistakes.keys()),
      ...game.revealedByMistakeIds,
    ])
    const toReview = game.timings.filter(t => errorIds.has(t.flag.id))

    return (
      <div className="max-w-lg mx-auto pt-2 sm:pt-6 flex-1 min-h-0 overflow-y-auto animate-in">
        <div className="bg-white border border-washi-darker/60 px-4 sm:px-6 py-5 sm:py-8">
          <h2 className="text-lg font-medium mb-1 text-center">Review</h2>
          <p className="text-xs text-sumi-light/30 mb-5 text-center">Memorize these flags and their names</p>

          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
            {toReview.map(t => (
              <div key={t.flag.id} className="text-center">
                <div className="aspect-[4/3] bg-washi border border-washi-darker/60 flex items-center justify-center p-1 mb-1">
                  <img src={t.flag.flag_url} alt="" className="w-full h-full object-contain" draggable={false} />
                </div>
                <span className="font-kanji text-xs sm:text-sm leading-tight block">{t.flag.name_ja}</span>
                <span className="text-[8px] sm:text-[9px] text-sumi-light/40 leading-tight block">{t.flag.name_en}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-sumi-light/40 text-center mb-5">
            Ready? Start a quick quiz with only these {toReview.length} flags:
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onStartPractice(toReview.map(t => t.flag), 'flagmatch')}
              className="bg-matsu text-white px-5 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors"
            >
              Match
            </button>
            <button
              onClick={() => onStartPractice(toReview.map(t => t.flag), 'guess')}
              className="bg-sumi text-washi px-5 py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors"
            >
              Guess
            </button>
          </div>

          <button
            onClick={() => setGame(g => ({ ...g, phase: 'stats' }))}
            className="w-full mt-3 py-2 text-xs text-sumi-light/40 hover:text-sumi transition-colors"
          >
            ← Back to stats
          </button>
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
          {practiceFlags && (
            <button onClick={onClearPractice} className="text-[9px] sm:text-[10px] uppercase tracking-widest text-ake hover:text-ake/70 transition-colors">
              ← Back
            </button>
          )}
          <Stat label="Progress" value={`${game.currentIndex + 1}/${game.total}`} />
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
      <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-0.5 sm:gap-1.5 pb-1 content-start">
        {game.gridFlags.map(flag => {
          const isGuessed = game.guessedIds.has(flag.id)
          if (isGuessed) return <div key={flag.id} className="aspect-[4/3]" />

          const isRevealed = game.revealedIds.has(flag.id)
          if (isRevealed) {
            return (
              <div key={flag.id} className="aspect-[4/3] bg-washi border border-washi-darker/60 flex flex-col items-center justify-center p-0.5 animate-in">
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
              className={`aspect-[4/3] bg-white border ${borderStyle} ${extraClass} flex items-center justify-center p-1 sm:p-1.5 transition-colors cursor-pointer disabled:cursor-default`}
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
