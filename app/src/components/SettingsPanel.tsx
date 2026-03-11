import { useState, useEffect, useRef } from 'react'
import type { Settings } from '../hooks/useSettings'

interface SettingsPanelProps {
  settings: Settings
  onUpdate: (update: Partial<Settings>) => void
}

export default function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 text-sumi-light/40 hover:text-sumi transition-colors"
        aria-label="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M6.7 1.5h2.6l.4 1.6a5.5 5.5 0 0 1 1.3.7l1.6-.5 1.3 2.2-1.2 1.1a5.5 5.5 0 0 1 0 1.4l1.2 1.1-1.3 2.2-1.6-.5a5.5 5.5 0 0 1-1.3.7l-.4 1.6H6.7l-.4-1.6a5.5 5.5 0 0 1-1.3-.7l-1.6.5-1.3-2.2 1.2-1.1a5.5 5.5 0 0 1 0-1.4L2.1 5.5l1.3-2.2 1.6.5a5.5 5.5 0 0 1 1.3-.7l.4-1.6Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-washi-darker/60 shadow-sm px-4 py-3 w-56 z-50 animate-in">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-xs text-sumi">Show English reading</span>
            <input
              type="checkbox"
              checked={settings.showEnglishReading}
              onChange={e => onUpdate({ showEnglishReading: e.target.checked })}
              className="accent-sumi"
            />
          </label>
        </div>
      )}
    </div>
  )
}
