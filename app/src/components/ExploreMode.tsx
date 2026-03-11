import { useState } from 'react'
import wardsData from '../data/wards.json'
import type { Ward, FlagItem } from '../types'
import { tokyoMetro } from '../data/tokyo-metro'

const wards = wardsData as Ward[]
const wardsByPopulation = [...wards].sort((a, b) => b.population - a.population)

const gridFlags: FlagItem[] = [
  ...wardsByPopulation.map(w => ({
    id: w.id,
    name_en: w.name_en,
    name_ja: w.name_ja,
    flag_url: w.flag_url,
  })),
  tokyoMetro,
]

const wardMap = new Map<string, Ward>(wards.map(w => [w.id, w]))
const flagMap = new Map<string, FlagItem>(gridFlags.map(f => [f.id, f]))

export default function ExploreMode() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedWard = selectedId ? wardMap.get(selectedId) ?? null : null
  const selectedFlag = selectedId ? flagMap.get(selectedId) ?? null : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Flag grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2 py-2">
        {gridFlags.map(flag => (
          <button
            key={flag.id}
            onClick={() => setSelectedId(flag.id)}
            className="aspect-square bg-white border border-washi-darker/60 hover:border-sumi/30 flex items-center justify-center p-1.5 transition-colors cursor-pointer"
          >
            <img
              src={flag.flag_url}
              alt={flag.name_en}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </button>
        ))}
      </div>

      <p className="text-[10px] text-sumi-light/30 text-center mt-2">
        Sorted by population — tap a flag to learn more
      </p>

      {/* Card modal */}
      {selectedId && (
        <div
          className="fixed inset-0 z-40 bg-sumi/30 flex items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white border border-washi-darker/60 shadow-lg max-w-sm w-full animate-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Flag */}
            <div className="aspect-[3/2] bg-washi flex items-center justify-center border-b border-washi-dark/50">
              <img
                src={(selectedWard ?? selectedFlag)!.flag_url}
                alt={`Flag of ${(selectedWard ?? selectedFlag)!.name_en}`}
                className="max-w-[70%] max-h-[70%] object-contain"
              />
            </div>

            <div className="p-5">
              {selectedWard ? (
                <>
                  {/* Header with seal */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-washi-dark/50">
                    <img
                      src={selectedWard.seal_url}
                      alt={`Seal of ${selectedWard.name_en}`}
                      className="w-8 h-8 object-contain opacity-70"
                    />
                    <div>
                      <h3 className="font-medium text-base leading-tight">{selectedWard.name_en}</h3>
                      <span className="font-jp text-sm text-sumi">{selectedWard.name_ja}</span>
                    </div>
                  </div>

                  {/* Symbols */}
                  <div className="space-y-2.5">
                    <SymbolRow label="Tree" value={selectedWard.tree.name_en} latin={selectedWard.tree.species} />
                    <SymbolRow label="Flower" value={selectedWard.flower.name_en} latin={selectedWard.flower.species} />
                    {selectedWard.bird && (
                      <SymbolRow label="Bird" value={selectedWard.bird.name_en} latin={selectedWard.bird.species} />
                    )}
                  </div>

                  {/* Meta */}
                  <div className="mt-4 pt-3 border-t border-washi-dark/50">
                    <div className="flex gap-4 text-xs text-sumi-light/40">
                      <span>{selectedWard.population.toLocaleString()} pop.</span>
                      <span>{selectedWard.area_km2} km²</span>
                    </div>
                    {selectedWard.notable_districts.length > 0 && (
                      <p className="text-xs text-sumi-light/40 mt-1.5">
                        {selectedWard.notable_districts.slice(0, 4).join(' · ')}
                      </p>
                    )}
                  </div>
                </>
              ) : selectedFlag && (
                <div className="text-center py-2">
                  <h3 className="font-medium text-base">{selectedFlag.name_en}</h3>
                  <span className="font-jp text-lg text-sumi">{selectedFlag.name_ja}</span>
                </div>
              )}
            </div>

            {/* Close */}
            <button
              onClick={() => setSelectedId(null)}
              className="w-full border-t border-washi-darker/60 py-2.5 text-xs text-sumi-light/40 hover:text-sumi transition-colors"
            >
              Close
            </button>
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
