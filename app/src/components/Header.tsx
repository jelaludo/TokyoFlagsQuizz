import type { AppMode } from '../App'

interface HeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
}

export default function Header({ mode, onModeChange }: HeaderProps) {
  return (
    <header className="pt-10 pb-8 px-6 mb-2">
      <div className="max-w-5xl mx-auto">
        {/* Title */}
        <div className="flex items-end gap-4 mb-8">
          <h1 className="text-3xl font-light tracking-tight leading-none">
            Tokyo <span className="font-medium">Quizz</span>
          </h1>
          <span className="font-jp text-sm text-sumi-light/50 pb-0.5">
            東京二十三区
          </span>
        </div>

        {/* Nav */}
        <nav className="flex gap-0 border-b border-washi-darker">
          <NavTab
            active={mode === 'explore'}
            onClick={() => onModeChange('explore')}
          >
            Explore
          </NavTab>
          <NavTab
            active={mode === 'quiz'}
            onClick={() => onModeChange('quiz')}
          >
            Quiz
          </NavTab>
        </nav>
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
      className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
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
