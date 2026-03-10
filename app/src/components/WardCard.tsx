import { useState } from 'react'
import type { Ward } from '../types'

interface WardCardProps {
  ward: Ward
  index: number
}

export default function WardCard({ ward, index }: WardCardProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className="animate-in cursor-pointer group"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => setFlipped(!flipped)}
    >
      {!flipped ? (
        <div className="bg-white border border-washi-darker/60 p-5 transition-all duration-200 group-hover:border-sumi/15 group-hover:shadow-sm">
          <div className="aspect-[3/2] bg-washi flex items-center justify-center mb-4 border border-washi-dark/50">
            <img
              src={ward.flag_url}
              alt={`Flag of ${ward.name_en}`}
              className="max-w-[80%] max-h-[80%] object-contain"
              loading="lazy"
            />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-medium text-base">{ward.name_en}</h3>
            <span className="font-jp text-sm text-sumi shrink-0">{ward.name_ja}</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-washi-darker/60 p-5 animate-in">
          {/* Header with seal */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-washi-dark/50">
            <img
              src={ward.seal_url}
              alt={`Seal of ${ward.name_en}`}
              className="w-8 h-8 object-contain opacity-70"
              loading="lazy"
            />
            <div>
              <h3 className="font-medium text-base leading-tight">{ward.name_en}</h3>
              <span className="font-jp text-sm text-sumi">{ward.name_ja}</span>
            </div>
          </div>

          {/* Symbols */}
          <div className="space-y-2.5">
            <SymbolRow label="Tree" value={ward.tree.name_en} latin={ward.tree.species} />
            <SymbolRow label="Flower" value={ward.flower.name_en} latin={ward.flower.species} />
            {ward.bird && (
              <SymbolRow label="Bird" value={ward.bird.name_en} latin={ward.bird.species} />
            )}
          </div>

          {/* Meta */}
          <div className="mt-4 pt-3 border-t border-washi-dark/50">
            <div className="flex gap-4 text-xs text-sumi-light/40">
              <span>{ward.population.toLocaleString()} pop.</span>
              <span>{ward.area_km2} km²</span>
            </div>
            {ward.notable_districts.length > 0 && (
              <p className="text-xs text-sumi-light/40 mt-1.5">
                {ward.notable_districts.slice(0, 4).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SymbolRow({ label, value, latin }: { label: string; value: string; latin: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10px] uppercase tracking-widest text-sumi-light/30 w-12 shrink-0">{label}</span>
      <div className="min-w-0">
        <span className="text-sm font-medium">{value}</span>
        <span className="text-xs text-sumi-light/30 italic ml-2">{latin}</span>
      </div>
    </div>
  )
}
