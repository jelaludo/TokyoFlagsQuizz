import type { AppMode } from '../types'
import type { Settings } from '../hooks/useSettings'
import SettingsPanel from './SettingsPanel'

const logoUrl = import.meta.env.BASE_URL + 'logo.png'

interface HeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  settings: Settings
  onUpdateSettings: (update: Partial<Settings>) => void
}

export default function Header({ mode, onModeChange, settings, onUpdateSettings }: HeaderProps) {
  return (
    <header className="pt-2 sm:pt-4 pb-1 sm:pb-2 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Title + Nav inline */}
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logoUrl} alt="区旗クイズ — Tokyo Flags Quizz" className="h-7 sm:h-10" />
            <span className="font-jp text-xs sm:text-sm text-sumi hidden sm:inline">
              東京二十三区
            </span>
          </div>

          <div className="flex items-center gap-0">
            <nav className="flex gap-0">
              <NavTab
                active={mode === 'guess'}
                onClick={() => onModeChange('guess')}
              >
                Guess
              </NavTab>
              <NavTab
                active={mode === 'flagmatch'}
                onClick={() => onModeChange('flagmatch')}
              >
                Match
              </NavTab>
              <NavTab
                active={mode === 'explore'}
                onClick={() => onModeChange('explore')}
              >
                Explore
              </NavTab>
            </nav>
            <SettingsPanel settings={settings} onUpdate={onUpdateSettings} />
          </div>
        </div>
        <div className="rule-thin" />
      </div>
    </header>
  )
}

function NavTab({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors relative ${
        active
          ? 'text-sumi'
          : 'text-sumi-light/40 hover:text-sumi-light'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-sumi" />
      )}
    </button>
  )
}
