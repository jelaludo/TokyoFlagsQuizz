import { useState } from 'react'
import Header from './components/Header'
import ExploreMode from './components/ExploreMode'
import QuizMode from './components/QuizMode'
import SplashScreen from './components/SplashScreen'

export type AppMode = 'explore' | 'quiz'

function App() {
  const [mode, setMode] = useState<AppMode>('explore')
  const [showSplash, setShowSplash] = useState(true)

  return (
    <div className="min-h-screen bg-washi">
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      <Header mode={mode} onModeChange={setMode} />
      <main className="max-w-5xl mx-auto px-4 pb-12 pt-2">
        {mode === 'explore' ? <ExploreMode /> : <QuizMode />}
      </main>
    </div>
  )
}

export default App
