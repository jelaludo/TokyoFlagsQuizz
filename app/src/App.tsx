import { useState } from 'react'
import Header from './components/Header'
import ExploreMode from './components/ExploreMode'
import QuizMode from './components/QuizMode'

export type AppMode = 'explore' | 'quiz'

function App() {
  const [mode, setMode] = useState<AppMode>('explore')

  return (
    <div className="min-h-screen bg-washi">
      <Header mode={mode} onModeChange={setMode} />
      <main className="max-w-5xl mx-auto px-4 pb-12 pt-2">
        {mode === 'explore' ? <ExploreMode /> : <QuizMode />}
      </main>
    </div>
  )
}

export default App
