import { useEffect, useState } from 'react'
import { getTeamSuggestions, getPokemon } from '../lib/api'
import { effectiveTypes } from '../data/types'
import TeamOptions from './TeamOptions'
import TypeBadge from './TypeBadge'

const DEFAULT_OPTS = {
  size: 6,
  generations: [],
  uniqueTypes: false,
  noSharedTypes: false,
  baseOnly: true,
  stage: null,
  game: null,
  noLegendaryMythical: false,
  regionalOnly: false
}

export default function SuggestionsModal({ open, onClose, team, onPick, game, onGameChange, availableTypes }) {
  const [opts, setOpts] = useState(DEFAULT_OPTS)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const excludeIds = team.filter(Boolean).map((p) => p.id)

  function handleOptsChange(next) {
    setOpts(next)
    if (next.game !== game) onGameChange(next.game)
  }

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const list = await getTeamSuggestions({ team, count: opts.size, ...opts, excludeIds, availableTypes })
      setSuggestions(list)
    } catch (e) {
      setError(e.message)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const excludeKey = excludeIds.join(',')

  useEffect(() => {
    if (open && opts.game !== game) setOpts((prev) => ({ ...prev, game }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, game])

  useEffect(() => {
    if (!open) return
    if (opts.game !== game) return
    const t = setTimeout(() => run(), 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opts, excludeKey])

  if (!open) return null

  const filled = team.filter(Boolean).length
  const remaining = 6 - filled

  async function handlePick(s) {
    try {
      const detail = await getPokemon(s.id)
      onPick(detail)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Team suggestions"
      onClick={onClose}
    >
      <div
        className="pac-border-secondary flex max-h-[85vh] w-full max-w-xl flex-col bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-dotted border-secondary/60 px-4 py-3">
          <h2 className="font-pixel text-[12px] text-secondary">SUGGESTIONS</h2>
          <span className="font-pixel text-[8px] text-primary">{filled}/6 IN TEAM</span>
          <button
            onClick={onClose}
            className="h-11 w-11 border border-dotted border-line font-pixel text-[10px] transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-secondary"
            aria-label="Close suggestions"
          >
            X
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
          {filled === 0 && (
            <p className="border border-dotted border-danger/60 p-3 font-pixel text-[8px] leading-relaxed text-white/70">
              ADD POKéMON FIRST — SUGGESTIONS ARE SCORED AGAINST YOUR CURRENT TEAM'S
              TYPE MATCHUPS.
            </p>
          )}

          <TeamOptions value={opts} onChange={handleOptsChange} countLabel="SUGGESTIONS TO SHOW" />

          {error && <p className="font-pixel text-[9px] text-danger">{error}</p>}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-pixel text-[9px] text-white/70">TOP PICKS</h3>
              <span className="font-pixel text-[8px] text-secondary">
                {loading ? 'CALCULATING...' : 'PRESS START'}
              </span>
            </div>

            {loading ? (
              <p className="py-6 text-center font-pixel text-[8px] text-white/40">LOADING...</p>
            ) : suggestions.length === 0 ? (
              <p className="py-6 text-center font-term text-sm text-white/50">
                No suggestions found for these options.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {suggestions.map((s, i) => {
                  const disabled = remaining === 0
                  return (
                    <li
                      key={s.id}
                      className="pac-border-soft flex items-center gap-3 bg-panel p-2"
                    >
                      <span className="w-8 text-right font-term text-sm text-primary">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <img
                        src={s.sprite}
                        alt={s.name}
                        className="pixelated h-10 w-10 object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <span className="flex-1 truncate font-pixel text-[8px] uppercase text-white/85">
                        {s.name}
                      </span>
                      <div className="flex gap-1">
                        {effectiveTypes(s.types, availableTypes).map((t) => (
                          <TypeBadge key={t} type={t} size="sm" />
                        ))}
                      </div>
                      <button
                        onClick={() => handlePick(s)}
                        disabled={disabled}
                        className="h-8 border border-dotted border-primary px-2 font-pixel text-[8px] text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-30"
                        aria-label={`Add ${s.name}`}
                      >
                        ADD
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-dotted border-line px-4 py-3">
          <button
            onClick={run}
            disabled={loading}
            className="h-12 border-2 border-dotted border-secondary px-4 font-pixel text-[9px] text-secondary transition-colors hover:bg-secondary hover:text-black focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-40"
          >
            RE-RANK
          </button>
        </div>
      </div>
    </div>
  )
}
