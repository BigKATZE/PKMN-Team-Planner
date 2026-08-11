import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { searchPokemon, getPokemon, GENERATIONS } from '../lib/api'
import { GAMES } from '../lib/gameIndex'
import { TYPE_COLORS, effectiveTypes } from '../data/types'
import TypeBadge from './TypeBadge'

const BST_STEPS = [0, 400, 450, 500, 540, 600]
const STAGE_STEPS = [
  { id: null, label: 'ALL' },
  { id: 'unevolved', label: 'UNEVOLVED' },
  { id: 'evolved-once', label: 'EVOLVED ONCE' },
  { id: 'fully-evolved', label: 'FULLY EVOLVED' }
]

function toggleInArray(arr, item) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

const SORT_OPTIONS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'A-Z' },
  { id: 'bst', label: 'BST HIGH' },
  { id: 'bst-asc', label: 'BST LOW' }
]

export default function SearchModal({ open, onClose, onSelect, game, onGameChange, availableTypes }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState(null)
  const [generations, setGenerations] = useState([])
  const [sort, setSort] = useState('id')
  const [minBst, setMinBst] = useState(0)
  const [rarity, setRarity] = useState('all')
  const [stage, setStage] = useState(null)
  const [regionalOnly, setRegionalOnly] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [selecting, setSelecting] = useState(null)
  const inputRef = useRef(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await searchPokemon({
        query,
        type,
        generations,
        sort,
        minBst,
        rarity,
        stage,
        game,
        regionalOnly
      })
      setResults(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = useCallback(async (p) => {
    setSelecting(p.id)
    try {
      const detail = await getPokemon(p.id)
      onSelect(detail)
    } catch (e) {
      setError(e.message)
      setSelecting(null)
    }
  }, [onSelect])

  useEffect(() => {
    if (!open) return
    setSelecting(null)
    setError(null)
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const debounce = setTimeout(() => run(), 250)
    return () => clearTimeout(debounce)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, generations, sort, minBst, rarity, stage, game, regionalOnly, open])

  useEffect(() => {
    if (type != null && !availableTypes.includes(type)) setType(null)
  }, [availableTypes, type])

  useEffect(() => {
    if (game == null && regionalOnly) setRegionalOnly(false)
  }, [game, regionalOnly])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const resultGrid = useMemo(
    () =>
      results.map((p) => (
        <button
          key={p.id}
          onClick={() => handleSelect(p)}
          disabled={selecting === p.id}
          className="search-card pac-border-soft flex flex-col items-center gap-2 bg-panel p-3 transition-colors hover:border-primary hover:bg-panel2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
        >
          <span className="self-start font-term text-[11px] text-primary">
            #{String(p.id).padStart(3, '0')}
          </span>
          {p.sprite ? (
            <img
              src={p.sprite}
              alt={p.name}
              className="pixelated h-16 w-16 object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-pixel text-xl text-secondary">?</span>
          )}
          <span className="truncate font-pixel text-[8px] uppercase">{p.name}</span>
          <div className="flex gap-1">
            {effectiveTypes(p.types, availableTypes).map((t) => (
              <TypeBadge key={t} type={t} size="sm" />
            ))}
          </div>
        </button>
      )),
    [results, selecting, handleSelect, availableTypes]
  )

  if (!open) return null

  const chipBase = (active) =>
    active
      ? 'border-secondary bg-secondary text-black'
      : 'border-line text-white/70 hover:border-secondary hover:text-secondary'

  const gamesByGen = GAMES.reduce((acc, g) => {
    ;(acc[g.generation] ??= []).push(g)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search Pokémon"
      onClick={onClose}
    >
      <div
        className="pac-border flex max-h-[85vh] w-full max-w-4xl flex-col bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-dotted border-line px-4 py-3">
          <h2 className="font-pixel text-[12px] text-secondary">SELECT PKMN</h2>
          <span className="font-term text-sm text-primary">
            {total} HIT{total === 1 ? '' : 'S'}
          </span>
          <button
            onClick={onClose}
            className="h-11 w-11 border border-dotted border-line font-pixel text-[10px] transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-secondary"
            aria-label="Close search"
          >
            X
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 py-3">
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-pixel text-[10px] text-primary blink">
              &gt;
            </span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH BY NAME..."
              className="w-full border-2 border-dotted border-primary bg-panel py-3 pl-10 pr-3 font-term text-sm uppercase tracking-wider placeholder:text-white/30 focus:border-secondary focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-1.5" aria-label="Filter by type">
            <button
              onClick={() => setType(null)}
              className={`h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                type === null
              )}`}
            >
              ALL TYPES
            </button>
            {availableTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t === type ? null : t)}
                aria-pressed={type === t}
                className={`flex h-8 items-center gap-1 border px-1.5 font-pixel text-[7px] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${
                  type === t ? 'border-white text-black' : 'border-line text-white/70 hover:border-white'
                }`}
                style={type === t ? { backgroundColor: TYPE_COLORS[t] } : {}}
              >
                <img
                  src={`/types/${t}.png`}
                  alt=""
                  className="pixelated h-4 w-4 object-contain"
                  loading="lazy"
                />
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5" aria-label="Filter by generation">
            <button
              onClick={() => setGenerations([])}
              className={`h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                generations.length === 0
              )}`}
            >
              ALL GENS
            </button>
            {GENERATIONS.map((g) => (
              <button
                key={g.label}
                onClick={() => setGenerations((prev) => toggleInArray(prev, g))}
                aria-pressed={generations.includes(g)}
                className={`h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                  generations.includes(g)
                )}`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Sort results">
            <span className="font-pixel text-[7px] text-white/50">SORT:</span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                aria-pressed={sort === s.id}
                className={`h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                  sort === s.id
                )}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by minimum base stat total">
            <span className="font-pixel text-[7px] text-white/50">MIN BST:</span>
            {BST_STEPS.map((n) => (
              <button
                key={n}
                onClick={() => setMinBst(n)}
                aria-pressed={minBst === n}
                className={`h-8 border px-2 font-term text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                  minBst === n
                )}`}
              >
                {n === 0 ? 'ANY' : `≥${n}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by rarity">
            <span className="font-pixel text-[7px] text-white/50">RARITY:</span>
            {[
              { id: 'all', label: 'ALL' },
              { id: 'legendary', label: 'LEGENDARY' },
              { id: 'mythical', label: 'MYTHICAL' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRarity(r.id)}
                aria-pressed={rarity === r.id}
                className={`h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                  rarity === r.id
                )}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by evolution stage">
            <span className="font-pixel text-[7px] text-white/50">STAGE:</span>
            {STAGE_STEPS.map((s) => (
              <button
                key={s.id ?? 'any'}
                onClick={() => setStage(s.id)}
                aria-pressed={stage === s.id}
                className={`h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${chipBase(
                  stage === s.id
                )}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by game">
            <span className="font-pixel text-[7px] text-white/50">GAME:</span>
            <select
              value={game ?? ''}
              onChange={(e) => onGameChange(e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Select game"
              className="h-8 border border-line bg-panel px-2 font-term text-sm text-white/85 focus:border-secondary focus:outline-none"
            >
              <option value="" className="bg-surface">
                ANY GAME
              </option>
              {Object.keys(gamesByGen).map((gen) => (
                <optgroup key={gen} label={`GEN ${gen}`} className="bg-surface">
                  {gamesByGen[gen].map((g) => (
                    <option key={g.id} value={g.id} className="bg-surface">
                      {g.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label
              className={`flex cursor-pointer items-center gap-1.5 border px-2 py-1 font-term text-[10px] transition-colors ${
                game == null ? 'border-line text-white/30' : 'border-line text-white/70 hover:border-secondary hover:text-secondary'
              }`}
            >
              <input
                type="checkbox"
                checked={regionalOnly}
                disabled={game == null}
                onChange={(e) => setRegionalOnly(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              REGIONAL DEX ONLY
            </label>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto px-4 pb-4 sm:grid-cols-3 lg:grid-cols-4">
          {resultGrid}

          {!loading && results.length === 0 && (
            <p className="col-span-full py-8 text-center font-pixel text-[10px] text-white/50">
              NO PKMN FOUND
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-dotted border-line px-4 py-3">
          {loading && <span className="font-pixel text-[9px] text-secondary pac-pulse">FETCHING...</span>}
          {selecting != null && <span className="font-pixel text-[9px] text-secondary pac-pulse">LOADING...</span>}
          {error && <span className="font-pixel text-[9px] text-danger">{error}</span>}
        </div>
      </div>
    </div>
  )
}
