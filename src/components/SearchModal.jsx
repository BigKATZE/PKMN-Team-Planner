import { useState } from 'react'
import { searchPokemon, getPokemon, GENERATIONS } from '../lib/api'
import { GAMES, generationForGame } from '../lib/gameIndex'
import { pokemonTypes } from '../data/types'
import { useAsync, useAsyncAction } from '../hooks/useAsync'
import Dialog from './Dialog'
import TypeBadge from './TypeBadge'

export default function SearchModal({ onClose, onSelect, game, onGameChange, availableTypes }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [filters, setFilters] = useState({ sort: 'id', minBst: 0, rarity: 'all', stage: '', generation: '', regionalOnly: false })
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const options = { query, type: availableTypes.includes(type) ? type : null, ...filters,
    generations: filters.generation ? [GENERATIONS[Number(filters.generation) - 1]] : [],
    stage: filters.stage || null, game, regionalOnly: game != null && filters.regionalOnly }
  const { data, loading, error, retry } = useAsync(() => searchPokemon(options), [options], true, 250)
  const selection = useAsyncAction(onSelect)
  const activeCount = [filters.minBst > 0, filters.rarity !== 'all', !!filters.stage, !!filters.generation, game != null && filters.regionalOnly].filter(Boolean).length
  return (
    <Dialog title="SELECT PKMN" onClose={onClose} wide>
      <div className="dialog-scroll search-content">
        <div className="search-primary">
          <label className="field">Name or Pokédex number
            <input data-autofocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try Pikachu or #025" />
          </label>
          <label className="field">Type
            <select value={options.type ?? ''} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>{availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <details className="advanced-filters">
          <summary>More filters{activeCount > 0 ? ` (${activeCount} active)` : ''}</summary>
          <div className="filter-grid">
            <label className="field">Sort by<select value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="id">Pokédex order</option><option value="name">Name A–Z</option><option value="bst">Stats: high to low</option><option value="bst-asc">Stats: low to high</option>
            </select></label>
            <label className="field">Generation<select value={filters.generation} onChange={(e) => set({ generation: e.target.value })}>
              <option value="">All generations</option>{GENERATIONS.map((g, i) => <option key={g.label} value={i + 1}>{g.label}</option>)}
            </select></label>
            <label className="field">Minimum base stat total<select value={filters.minBst} onChange={(e) => set({ minBst: Number(e.target.value) })}>
              {[0, 400, 450, 500, 540, 600].map((n) => <option key={n} value={n}>{n ? `At least ${n}` : 'Any total'}</option>)}
            </select></label>
            <label className="field">Rarity<select value={filters.rarity} onChange={(e) => set({ rarity: e.target.value })}>
              <option value="all">All Pokémon</option><option value="legendary">Legendary</option><option value="mythical">Mythical</option>
            </select></label>
            <label className="field">Evolution stage<select value={filters.stage} onChange={(e) => set({ stage: e.target.value })}>
              <option value="">Any stage</option><option value="unevolved">Unevolved</option><option value="evolved-once">Evolved once</option><option value="fully-evolved">Fully evolved</option>
            </select></label>
            <label className="field">Game<select value={game ?? ''} onChange={(e) => onGameChange(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Any game</option>{GAMES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select></label>
            <label className="check-field"><input type="checkbox" checked={options.regionalOnly} disabled={game == null} onChange={(e) => set({ regionalOnly: e.target.checked })} />Regional Pokédex only</label>
            <button className="action-button" onClick={() => { setType(''); setFilters({ sort: 'id', minBst: 0, rarity: 'all', stage: '', generation: '', regionalOnly: false }) }}>Reset filters</button>
          </div>
          <p className="muted">Stats and evolution stages use current species data.</p>
        </details>
        <div className="results-heading" role="status">{loading ? 'Searching…' : `${data?.total ?? 0} Pokémon found`}{game != null && <span>{GAMES.find((g) => g.id === game)?.label}</span>}</div>
        {(error || selection.error) && <div className="error-message" role="alert">{error || selection.error} {error && <button onClick={retry} className="text-link">Try again</button>}</div>}
        {!loading && !error && data?.items.length === 0 && <p className="empty-message">No Pokémon match these filters. Try another name or broaden your filters.</p>}
        <div className="search-grid" aria-busy={loading || selection.loading}>
          {data?.items.map((p) => <button key={p.id} className="search-card" disabled={selection.loading} onClick={() => selection.run(() => getPokemon(p.id))}>
            <span className="dex-number">#{String(p.id).padStart(3, '0')}</span>
            <img src={p.sprite} alt="" className="pixelated" loading="lazy" referrerPolicy="no-referrer" />
            <span className="pokemon-name">{p.name.replaceAll('-', ' ')}</span>
            <span className="type-list">{pokemonTypes(p, generationForGame(game)).map((t) => <TypeBadge key={t} type={t} size="sm" />)}</span>
          </button>)}
        </div>
      </div>
      <footer className="dialog-footer" role="status">{selection.loading ? 'Adding Pokémon…' : 'Choose a Pokémon to fill this slot.'}</footer>
    </Dialog>
  )
}
