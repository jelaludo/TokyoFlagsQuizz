import { useState } from 'react'
import type { AppMode } from './types'
import { useSettings } from './hooks/useSettings'
import Header from './components/Header'
import ExploreMode from './components/ExploreMode'
import FlagMatchMode from './components/FlagMatchMode'
import MapMode from './components/MapMode'
import SplashScreen from './components/SplashScreen'

function App() {
  const [mode, setMode] = useState<AppMode>('map')
  const [showSplash, setShowSplash] = useState(true)
  const [settings, updateSettings] = useSettings()

  const isFullscreen = mode === 'flagmatch' || mode === 'map'

  return (
    <div className={`bg-washi ${isFullscreen ? 'h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen'}`}>
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      <Header mode={mode} onModeChange={setMode} settings={settings} onUpdateSettings={updateSettings} />
      <main className={`max-w-5xl mx-auto px-4 ${isFullscreen ? 'flex-1 min-h-0 flex flex-col' : 'pb-12 pt-2'}`}>
        {mode === 'map' && <MapMode />}
        {mode === 'flagmatch' && <FlagMatchMode settings={settings} />}
        {mode === 'explore' && <ExploreMode />}
      </main>
    </div>
  )
}

export default App
