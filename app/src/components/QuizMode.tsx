import { useState, useCallback, useEffect } from 'react'
import wardsData from '../data/wards.json'
import type { Ward, QuizCategory, QuizQuestion, QuizFilter } from '../types'

const wards = wardsData as Ward[]
const wardsWithBirds = wards.filter(w => w.bird !== null)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[], n: number, exclude?: T): T[] {
  const filtered = exclude ? arr.filter(x => x !== exclude) : [...arr]
  return shuffle(filtered).slice(0, n)
}

function generateQuestion(quizFilter: QuizFilter): QuizQuestion {
  let categories: QuizCategory[]

  switch (quizFilter) {
    case 'flags':
      categories = ['flag']
      break
    case 'seals':
      categories = ['seal']
      break
    default:
      categories = ['flag', 'tree', 'flower', 'seal']
      if (wardsWithBirds.length >= 4) categories.push('bird')
  }

  const category = categories[Math.floor(Math.random() * categories.length)]
  const pool = category === 'bird' ? wardsWithBirds : wards
  const ward = pool[Math.floor(Math.random() * pool.length)]
  const distractors = pickRandom(pool, 3, ward)
  const options = shuffle([ward, ...distractors])
  const isImageQuestion = category === 'flag' || category === 'seal'

  return { category, ward, options, isImageQuestion }
}

function getQuestionText(q: QuizQuestion): string {
  switch (q.category) {
    case 'flag': return 'Which ward does this flag belong to?'
    case 'seal': return 'Which ward uses this emblem?'
    case 'tree': return `Which ward has ${q.ward.tree.name_en} as its official tree?`
    case 'flower': return `Which ward has ${q.ward.flower.name_en} as its official flower?`
    case 'bird': return `Which ward has ${q.ward.bird!.name_en} as its official bird?`
  }
}

function getCategoryLabel(cat: QuizCategory): string {
  switch (cat) {
    case 'flag': return 'Flag'
    case 'seal': return 'Emblem'
    case 'tree': return 'Tree'
    case 'flower': return 'Flower'
    case 'bird': return 'Bird'
  }
}

const quizOptions: { key: QuizFilter; label: string; sublabel: string }[] = [
  { key: 'flags', label: 'Flags', sublabel: 'Identify wards by their flag' },
  { key: 'seals', label: 'Emblems', sublabel: 'Identify wards by their seal' },
  { key: 'mixed', label: 'Mixed', sublabel: 'All categories combined' },
]

export default function QuizMode() {
  const [quizFilter, setQuizFilter] = useState<QuizFilter | null>(null)
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [, setBestStreak] = useState(0)
  const [showResult, setShowResult] = useState(false)

  const isCorrect = selected === question?.ward.id

  const startQuiz = useCallback((filter: QuizFilter) => {
    setQuizFilter(filter)
    setQuestion(generateQuestion(filter))
    setScore(0)
    setTotal(0)
    setStreak(0)
    setBestStreak(0)
    setSelected(null)
    setShowResult(false)
  }, [])

  const handleSelect = useCallback((wardId: string) => {
    if (showResult || !question) return
    setSelected(wardId)
    setShowResult(true)
    setTotal(t => t + 1)

    if (wardId === question.ward.id) {
      setScore(s => s + 1)
      setStreak(s => {
        const next = s + 1
        setBestStreak(b => Math.max(b, next))
        return next
      })
    } else {
      setStreak(0)
    }
  }, [showResult, question])

  const nextQuestion = useCallback(() => {
    if (!quizFilter) return
    setQuestion(generateQuestion(quizFilter))
    setSelected(null)
    setShowResult(false)
  }, [quizFilter])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && quizFilter) {
        setQuizFilter(null)
        setQuestion(null)
        return
      }
      if (e.key === 'Enter' && showResult) nextQuestion()
      if (!showResult && question && e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1
        if (question.options[idx]) handleSelect(question.options[idx].id)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showResult, question, handleSelect, nextQuestion, quizFilter])

  // Quiz selector
  if (!quizFilter || !question) {
    return (
      <div className="max-w-lg mx-auto pt-4">
        <h2 className="text-lg font-medium mb-1">Choose a quiz</h2>
        <p className="text-sm text-sumi-light/40 mb-6">Test your knowledge of Tokyo's 23 wards</p>

        <div className="space-y-px bg-washi-darker/40">
          {quizOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => startQuiz(opt.key)}
              className="w-full bg-white px-5 py-4 text-left transition-colors hover:bg-washi group flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-sumi-light/40 mt-0.5">{opt.sublabel}</div>
              </div>
              <span className="text-sumi-light/20 group-hover:text-sumi-light/50 transition-colors text-lg">&rarr;</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Score bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { setQuizFilter(null); setQuestion(null) }}
          className="text-xs text-sumi-light/40 hover:text-sumi transition-colors"
        >
          &larr; Back
        </button>
        <div className="flex items-center gap-6 text-sm">
          <Stat label="Score" value={`${score}/${total}`} />
          <Stat label="Streak" value={String(streak)} />
          {total > 0 && (
            <span className="text-sumi-light/40">
              {Math.round((score / total) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Question card with overlay result */}
      <div className="relative bg-white border border-washi-darker/60 animate-in" key={question.ward.id + question.category}>
        {/* Category + question */}
        <div className="px-5 pt-4 pb-3">
          <span className="text-[10px] uppercase tracking-widest text-sumi-light/30">
            {getCategoryLabel(question.category)}
          </span>
          <h2 className="text-sm font-medium leading-relaxed mt-1">
            {getQuestionText(question)}
          </h2>
        </div>

        {/* Image */}
        {question.isImageQuestion && (
          <div className="mx-5 mb-4 bg-washi border border-washi-dark/50 flex justify-center py-5">
            <img
              src={question.category === 'flag' ? question.ward.flag_url : question.ward.seal_url}
              alt="Identify this symbol"
              className="max-h-28 object-contain"
            />
          </div>
        )}

        {/* Options */}
        <div className="px-5 pb-5">
          <div className="space-y-1.5">
            {question.options.map((opt, i) => {
              let style = 'border-washi-darker/60 hover:border-sumi/20 hover:bg-washi/50'

              if (showResult) {
                if (opt.id === question.ward.id) {
                  style = 'border-matsu bg-matsu/5 text-matsu'
                } else if (opt.id === selected && !isCorrect) {
                  style = 'border-ake bg-ake/5 text-ake animate-shake'
                } else {
                  style = 'border-washi-darker/40 opacity-35'
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={showResult}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-all ${style}`}
                >
                  <span className="text-[11px] text-sumi-light/25 font-mono w-3 shrink-0">{i + 1}</span>
                  <span className="font-medium text-sm">{opt.name_en}</span>
                  <span className="font-jp text-sm text-current ml-auto">{opt.name_ja}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Result overlay — covers the options area */}
        {showResult && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm border-t border-washi-darker/60 px-5 py-5 animate-in">
            {isCorrect ? (
              <p className="text-sm text-matsu font-medium text-center">
                Correct — {question.ward.name_en}
                <span className="font-jp ml-2 font-normal">{question.ward.name_ja}</span>
              </p>
            ) : (
              <p className="text-sm text-center">
                <span className="text-ake">Incorrect</span>
                <span className="text-sumi-light/50"> — the answer was </span>
                <span className="font-medium">{question.ward.name_en}</span>
                <span className="font-jp ml-1 text-sm">{question.ward.name_ja}</span>
              </p>
            )}

            <button
              onClick={nextQuestion}
              className="w-full mt-3 bg-sumi text-washi py-2.5 text-sm font-medium hover:bg-sumi-light transition-colors"
            >
              Next
            </button>
            <p className="text-center text-[11px] text-sumi-light/25 mt-1.5">
              Enter
            </p>
          </div>
        )}
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
