import { useState, useEffect, useCallback, useRef } from 'react'
import wardsData from '../data/wards.json'
import type { Ward } from '../types'

const wards = wardsData as Ward[]

interface FloatingIcon {
  id: number
  ward: Ward
  x: number
  y: number
  scale: number
  opacity: number
  phase: 'in' | 'out' | 'done'
}

export default function SplashScreen({ onDismiss }: { onDismiss: () => void }) {
  const [icons, setIcons] = useState<FloatingIcon[]>([])
  const [dismissed, setDismissed] = useState(false)
  const counterRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const dismiss = useCallback(() => {
    setDismissed(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimeout(onDismiss, 400)
  }, [onDismiss])

  // Spawn icons
  useEffect(() => {
    function spawn() {
      const ward = wards[Math.floor(Math.random() * wards.length)]
      const id = counterRef.current++
      const icon: FloatingIcon = {
        id,
        ward,
        x: 5 + Math.random() * 85,
        y: 5 + Math.random() * 85,
        scale: 0.6 + Math.random() * 0.8,
        opacity: 0.15 + Math.random() * 0.35,
        phase: 'in',
      }

      setIcons(prev => [...prev.slice(-20), icon])

      // Fade out after a moment
      setTimeout(() => {
        setIcons(prev => prev.map(i => i.id === id ? { ...i, phase: 'out' } : i))
      }, 300 + Math.random() * 400)

      // Remove
      setTimeout(() => {
        setIcons(prev => prev.filter(i => i.id !== id))
      }, 900)
    }

    // Burst a few immediately
    for (let i = 0; i < 4; i++) setTimeout(spawn, i * 80)

    intervalRef.current = setInterval(spawn, 120)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Dismiss on click or key
  useEffect(() => {
    const handleKey = () => dismiss()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dismiss])

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-50 cursor-pointer select-none transition-opacity duration-400 ${
        dismissed ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#F0EDE8' }}
    >
      {/* Floating icons */}
      {icons.map(icon => (
        <img
          key={icon.id}
          src={icon.ward.seal_url}
          alt=""
          className="absolute pointer-events-none"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            width: `${icon.scale * 64}px`,
            height: `${icon.scale * 64}px`,
            objectFit: 'contain',
            opacity: icon.phase === 'in' ? icon.opacity : 0,
            transform: `translate(-50%, -50%) scale(${icon.phase === 'in' ? 1 : 0.7})`,
            transition: icon.phase === 'in'
              ? 'opacity 0.15s ease-out, transform 0.15s ease-out'
              : 'opacity 0.5s ease-in, transform 0.5s ease-in',
          }}
        />
      ))}

      {/* Center title */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-light tracking-tight text-sumi/80">
          Tokyo <span className="font-medium">Quizz</span>
        </h1>
        <p className="font-jp text-lg text-sumi/60 mt-1">
          東京二十三区
        </p>
        <p className="text-[11px] text-sumi-light/30 mt-8 tracking-widest uppercase">
          tap to begin
        </p>
      </div>
    </div>
  )
}
