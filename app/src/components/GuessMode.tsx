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

function buildGridFlags(flags: FlagItem[]): FlagItem[] {
  return shuffle([...flags])
}

interface GuessProps {
  practiceFlags: FlagItem[] | null
  onClearPractice: () => void
  onStartPractice: (flags: FlagItem[], targetMode: 'guess' | 'flagmatch') => void
}

type Difficulty = 'easy' | 'hard'
type Phase = 'intro' | 'playing' | 'results' | 'stats' | 'review'

interface FlagTiming {
  flag: FlagItem
  timeMs: number
}

interface GuessState {
  gridFlags: FlagItem[]
  names: FlagItem[]
  selectedId: string | null
  revealedIds: Set<string>
  flippedIds: Set<string>
  wrongId: string | null
  mistakes: number
  startTime: number
  elapsedSeconds: number
  difficulty: Difficulty
  phase: Phase
  total: number
  timings: FlagTiming[]
  selectionTime: number // when the user selected the current name
  perFlagMistakes: Set<string>      // flags where user guessed wrong trying to find them
  revealedByMistakeIds: Set<string> // flags revealed because they were wrongly clicked (easy mode)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatMs(ms: number): string {
  return (ms / 1000).toFixed(1) + 's'
}

export default function GuessMode({ practiceFlags, onClearPractice, onStartPractice }: GuessProps) {
  const [introGrid] = useState<FlagItem[]>(() => buildGridFlags(allFlags))
  const [game, setGame] = useState<GuessState>({
    gridFlags: [],
    names: [],
    selectedId: null,
    revealedIds: new Set(),
    flippedIds: new Set(),
    wrongId: null,
    mistakes: 0,
    startTime: 0,
    elapsedSeconds: 0,
    difficulty: 'easy',
    phase: 'intro',
    total: allFlags.length,
    timings: [],
    selectionTime: 0,
    perFlagMistakes: new Set(),
    revealedByMistakeIds: new Set(),
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const practiceStarted = useRef(false)

  const startGame = useCallback((difficulty: Difficulty) => {
    const f = practiceFlags ?? allFlags
    setGame({
      gridFlags: buildGridFlags(f),
      names: shuffle([...f]),
      selectedId: null,
      revealedIds: new Set(),
      flippedIds: new Set(),
      wrongId: null,
      mistakes: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      difficulty,
      phase: 'playing',
      total: f.length,
      timings: [],
      selectionTime: 0,
      perFlagMistakes: new Set(),
      revealedByMistakeIds: new Set(),
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
        setGame(g => ({ ...g, elapsedSeconds: Math.floor((Date.now() - g.startTime) / 1000) }))
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [game.phase, game.startTime])

  const selectName = useCallback((id: string) => {
    setGame(g => {
      if (g.phase !== 'playing' || g.revealedIds.has(id)) return g
      if (g.selectedId === id) return { ...g, selectedId: null, selectionTime: 0 }
      return { ...g, selectedId: id, selectionTime: Date.now() }
    })
  }, [])

  const clickFlag = useCallback((flagId: string) => {
    setGame(g => {
      if (g.phase !== 'playing' || !g.selectedId || g.wrongId) return g
      if (g.revealedIds.has(flagId)) return g

      if (flagId === g.selectedId) {
        const newRevealed = new Set(g.revealedIds)
        newRevealed.add(flagId)
        const allDone = newRevealed.size === g.total
        if (allDone && timerRef.current) clearInterval(timerRef.current)

        // Record timing: time from selection to correct match
        const matchedFlag = g.names.find(f => f.id === flagId)
        const timeMs = g.selectionTime > 0 ? Date.now() - g.selectionTime : 0
        const newTimings = matchedFlag && timeMs > 0
          ? [...g.timings, { flag: matchedFlag, timeMs }]
          : g.timings

        return {
          ...g,
          revealedIds: newRevealed,
          selectedId: null,
          selectionTime: 0,
          phase: allDone ? 'results' : 'playing',
          timings: newTimings,
        }
      } else {
        const newPerFlagMistakes = new Set(g.perFlagMistakes)
        newPerFlagMistakes.add(g.selectedId!)
        const newRevealedByMistake = new Set(g.revealedByMistakeIds)
        if (g.difficulty === 'easy') newRevealedByMistake.add(flagId)
        return {
          ...g, wrongId: flagId, mistakes: g.mistakes + 1,
          perFlagMistakes: newPerFlagMistakes,
          revealedByMistakeIds: newRevealedByMistake,
        }
      }
    })
  }, [])

  // Handle wrong guess: shake then flip in easy mode
  useEffect(() => {
    if (!game.wrongId) return
    const wrongId = game.wrongId

    const shakeTimeout = setTimeout(() => {
      if (game.difficulty === 'easy') {
        setGame(g => {
          const newFlipped = new Set(g.flippedIds)
          newFlipped.add(wrongId)
          return { ...g, wrongId: null, flippedIds: newFlipped }
        })
        setTimeout(() => {
          setGame(g => {
            const newFlipped = new Set(g.flippedIds)
            newFlipped.delete(wrongId)
            return { ...g, flippedIds: newFlipped }
          })
        }, 3000)
      } else {
        setGame(g => ({ ...g, wrongId: null }))
      }
    }, 400)
    return () => clearTimeout(shakeTimeout)
  }, [game.wrongId, game.difficulty])

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

  const remaining = game.total - game.revealedIds.size

  // Intro
  if (game.phase === 'intro') {
    return (
      <div className="max-w-5xl mx-auto flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-0.5 sm:gap-1.5 py-2 opacity-20 blur-[1px]">
            {introGrid.map(flag => (
              <div key={flag.id} className="aspect-[4/3] bg-white border border-washi-darker/60 flex items-center justify-center p-1">
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
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => startGame('easy')}
                  className="bg-matsu text-white px-6 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors"
                >
                  Easy
                </button>
                <button
                  onClick={() => startGame('hard')}
                  className="bg-sumi text-washi px-6 py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors"
                >
                  Hard
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-sumi-light/30 mt-3 sm:mt-4">
                Easy: wrong flags flip to reveal their name
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results
  if (game.phase === 'results') {
    const accuracy = game.total + game.mistakes > 0
      ? Math.round((game.total / (game.total + game.mistakes)) * 100) : 0

    return (
      <div className="max-w-md mx-auto pt-2 sm:pt-6 flex-1 min-h-0 overflow-y-auto animate-in">
        <div className="bg-white border border-washi-darker/60 px-4 sm:px-6 py-5 sm:py-8 text-center">
          <h2 className="text-lg font-medium mb-1">All Matched!</h2>
          <p className="text-xs text-sumi-light/30 mb-5 uppercase tracking-widest">{game.difficulty} mode</p>

          <div className="flex justify-center gap-8 mb-6">
            <ResultStat label="Matched" value={String(game.total)} color="text-matsu" />
            <ResultStat label="Mistakes" value={String(game.mistakes)} color="text-ake" />
            <ResultStat label="Time" value={formatTime(game.elapsedSeconds)} />
            <ResultStat label="Accuracy" value={`${accuracy}%`} />
          </div>

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
    const errorIds = new Set([...game.perFlagMistakes, ...game.revealedByMistakeIds])
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
                {toReview.map((t, i) => (
                  <div key={t.flag.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-washi-darker/40' : ''}`}>
                    <img src={t.flag.flag_url} alt="" className="w-8 h-5 object-contain shrink-0" />
                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                      <span className="font-kanji text-sm leading-tight">{t.flag.name_ja}</span>
                      <span className="text-xs text-sumi-light/40 truncate">{t.flag.name_en}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {game.perFlagMistakes.has(t.flag.id) && (
                        <span className="text-[9px] text-ake font-medium">miss</span>
                      )}
                      {game.revealedByMistakeIds.has(t.flag.id) && !game.perFlagMistakes.has(t.flag.id) && (
                        <span className="text-[9px] text-sumi-light/40">revealed</span>
                      )}
                      <span className="text-xs font-mono text-ake">{formatMs(t.timeMs)}</span>
                    </div>
                  </div>
                ))}
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
    const errorIds = new Set([...game.perFlagMistakes, ...game.revealedByMistakeIds])
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
              onClick={() => onStartPractice(toReview.map(t => t.flag), 'guess')}
              className="bg-matsu text-white px-5 py-2.5 text-sm font-medium hover:bg-matsu-light transition-colors"
            >
              Guess
            </button>
            <button
              onClick={() => onStartPractice(toReview.map(t => t.flag), 'flagmatch')}
              className="bg-sumi text-washi px-5 py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors"
            >
              Match
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
    <div className="max-w-5xl mx-auto flex-1 min-h-0 flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-1 sm:mb-2 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          {practiceFlags && (
            <button onClick={onClearPractice} className="text-[9px] sm:text-[10px] uppercase tracking-widest text-ake hover:text-ake/70 transition-colors">
              ← Back
            </button>
          )}
          <Stat label="Remaining" value={`${remaining}/${game.total}`} />
          <Stat label="Mistakes" value={String(game.mistakes)} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-sumi-light/30">{game.difficulty}</span>
          <span className="text-xs sm:text-sm font-mono text-sumi-light/50">{formatTime(game.elapsedSeconds)}</span>
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
        <div className="flex-1 min-h-0 grid grid-cols-4 sm:grid-cols-6 gap-0.5 sm:gap-1.5 content-start">
          {game.gridFlags.map(flag => {
            const isRevealed = game.revealedIds.has(flag.id)
            const isWrong = game.wrongId === flag.id
            const isFlipped = game.flippedIds.has(flag.id)

            if (isRevealed) {
              return (
                <div key={flag.id} className="aspect-[4/3] border-2 border-matsu bg-matsu/5 flex flex-col items-center justify-center p-0.5 animate-in">
                  <img src={flag.flag_url} alt="" className="w-3/4 h-1/2 object-contain opacity-30" draggable={false} />
                  <span className="font-kanji text-[10px] sm:text-sm leading-tight text-matsu mt-0.5">{flag.name_ja}</span>
                </div>
              )
            }

            if (isFlipped) {
              return (
                <div key={flag.id} className="aspect-[4/3] bg-washi border border-washi-darker/60 flex flex-col items-center justify-center p-0.5 animate-in">
                  <span className="font-kanji text-sm sm:text-lg leading-tight text-sumi">{flag.name_ja}</span>
                  <span className="text-[8px] sm:text-[9px] text-sumi-light/40 leading-tight">{flag.name_en}</span>
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
                className={`aspect-[4/3] bg-white border ${borderStyle} ${extraClass} flex items-center justify-center p-1 transition-colors ${
                  game.selectedId ? 'cursor-pointer' : 'cursor-default'
                } disabled:cursor-default`}
              >
                <img src={flag.flag_url} alt="" className="w-full h-full object-contain" draggable={false} />
              </button>
            )
          })}
        </div>
      </div>
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

function ResultStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-medium ${color ?? 'text-sumi'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-sumi-light/30 mt-1">{label}</div>
    </div>
  )
}
