import { useState } from 'react'
import wardsData from '../data/wards.json'
import type { Ward } from '../types'
import WardCard from './WardCard'

const wards = wardsData as Ward[]

type Filter = 'all' | 'has-bird' | 'cherry' | 'azalea'

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'has-bird', label: 'Has bird' },
  { key: 'cherry', label: 'Cherry tree' },
  { key: 'azalea', label: 'Azalea flower' },
]

export default function ExploreMode() {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const filtered = wards.filter(w => {
    if (search) {
      const q = search.toLowerCase()
      return (
        w.name_en.toLowerCase().includes(q) ||
        w.name_ja.includes(q) ||
        w.tree.name_en.toLowerCase().includes(q) ||
        w.flower.name_en.toLowerCase().includes(q) ||
        (w.bird?.name_en.toLowerCase().includes(q) ?? false) ||
        w.notable_districts.some(d => d.toLowerCase().includes(q))
      )
    }
    switch (filter) {
      case 'has-bird': return w.bird !== null
      case 'cherry': return w.tree.name_en.toLowerCase().includes('cherry')
      case 'azalea': return w.flower.name_en.toLowerCase().includes('azalea')
      default: return true
    }
  })

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search wards, trees, flowers, districts..."
          value={search}
          onChange={e => { setSearch(e.target.value); setFilter('all') }}
          className="w-full px-4 py-2.5 bg-white border border-washi-darker/60 text-sm placeholder:text-sumi-light/30 focus:outline-none focus:border-sumi/30 transition-colors"
        />
      </div>

      {/* Filters */}
      {!search && (
        <div className="flex gap-1 mb-6">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                filter === f.key
                  ? 'bg-sumi text-washi'
                  : 'text-sumi-light/50 hover:text-sumi'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-[11px] uppercase tracking-widest text-sumi-light/30 mb-5">
        {filtered.length} ward{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-washi-darker/40">
        {filtered.map((ward, i) => (
          <WardCard key={ward.id} ward={ward} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-sumi-light/30">
          <p className="text-sm">No results</p>
        </div>
      )}
    </div>
  )
}
