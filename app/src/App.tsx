import { useState } from 'react'
import type { AppMode } from './types'
import { useSettings } from './hooks/useSettings'
import Header from './components/Header'
import ExploreMode from './components/ExploreMode'
import FlagMatchMode from './components/FlagMatchMode'
import GuessMode from './components/GuessMode'
import SplashScreen from './components/SplashScreen'

function App() {
  const [mode, setMode] = useState<AppMode>('guess')
  const [showSplash, setShowSplash] = useState(true)
  const [settings, updateSettings] = useSettings()
  const [practiceFlags, setPracticeFlags] = useState<null | import('./types').FlagItem[]>(null)
  const isFullscreen = mode === 'flagmatch' || mode === 'guess'

  function startPractice(flags: import('./types').FlagItem[], targetMode: 'guess' | 'flagmatch') {
    setPracticeFlags(flags)
    setMode(targetMode)
  }

  function clearPractice() {
    setPracticeFlags(null)
  }

  return (
    <div className={`bg-washi ${isFullscreen ? 'h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen'}`}>
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      <Header mode={mode} onModeChange={(m) => { clearPractice(); setMode(m) }} settings={settings} onUpdateSettings={updateSettings} />
      <main className={`max-w-5xl mx-auto px-4 ${isFullscreen ? 'flex-1 min-h-0 flex flex-col' : 'pb-12 pt-2'}`}>
        {mode === 'guess' && <GuessMode practiceFlags={practiceFlags} onClearPractice={clearPractice} />}
        {mode === 'flagmatch' && <FlagMatchMode settings={settings} practiceFlags={practiceFlags} onClearPractice={clearPractice} onStartPractice={startPractice} />}
        {mode === 'explore' && <ExploreMode />}
      </main>
    </div>
  )
}

export default App
