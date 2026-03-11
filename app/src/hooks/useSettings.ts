import { useState, useCallback } from 'react'

export interface Settings {
  showEnglishReading: boolean
}

const STORAGE_KEY = 'tokyoquizz-settings'

const defaultSettings: Settings = {
  showEnglishReading: true,
}

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch {
    // ignore
  }
  return defaultSettings
}

export function useSettings(): [Settings, (update: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const updateSettings = useCallback((update: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...update }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return [settings, updateSettings]
}
