import { useEffect, useState } from 'react'
import { getRandomTeam } from '../lib/api'
import { effectiveTypes } from '../data/types'
import TeamOptions from './TeamOptions'
import TypeBadge from './TypeBadge'

function TeamRow({ pokemon, index, availableTypes }) {
  return (
    <div className="pac-border-soft flex items-center gap-3 bg-panel p-2">
      <span className="w-10 font-term text-sm text-primary">
        {String(index + 1).padStart(2, '0')}
      </span>
      {pokemon?.sprite ? (
        <img
          src={pokemon.sprite}
          alt={pokemon?.name}
          className="pixelated h-10 w-10 object-contain"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="h-10 w-10 font-pixel text-lg text-white/30">?</span>
      )}
      <span className="flex-1 truncate font-pixel text-[8px] uppercase text-white/85">
        {pokemon?.name ?? 'EMPTY'}
      </span>
      <div className="flex gap-1">
        {effectiveTypes(pokemon?.types ?? [], availableTypes).map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
    </div>
  )
}

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

export default function RandomizerModal({ open, onClose, onApply, game, onGameChange, availableTypes }) {
  const [opts, setOpts] = useState(DEFAULT_OPTS)
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function roll() {
    setLoading(true)
    setError(null)
    try {
      const t = await getRandomTeam({ ...opts, availableTypes })
      setTeam(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleOptsChange(next) {
    setOpts(next)
    if (next.game !== game) onGameChange(next.game)
  }

  useEffect(() => {
    if (open && opts.game !== game) setOpts((prev) => ({ ...prev, game }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, game])

  useEffect(() => {
    if (!open) return
    if (opts.game !== game) return
    const t = setTimeout(() => roll(), 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opts])

  if (!open) return null

  const slots = Array.from({ length: 6 }, (_, i) => team[i] ?? null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Random team"
      onClick={onClose}
    >
      <div
        className="pac-border-secondary flex max-h-[85vh] w-full max-w-xl flex-col bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-dotted border-secondary/60 px-4 py-3">
          <h2 className="font-pixel text-[12px] text-secondary">RANDOM TEAM</h2>
          <span className="font-pixel text-[8px] text-primary pac-pulse">ROLLING...</span>
          <button
            onClick={onClose}
            className="h-11 w-11 border border-dotted border-line font-pixel text-[10px] transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-secondary"
            aria-label="Close randomizer"
          >
            X
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
          <TeamOptions value={opts} onChange={handleOptsChange} />

          {error && <p className="font-pixel text-[9px] text-danger">{error}</p>}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-pixel text-[9px] text-white/70">PREVIEW</h3>
              <span className="font-pixel text-[8px] text-secondary">PRESS START</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {slots.map((p, i) => (
                <TeamRow key={i} pokemon={p} index={i} availableTypes={availableTypes} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 border-t border-dotted border-line px-4 py-3">
          <button
            onClick={roll}
            disabled={loading}
            className="h-12 border-2 border-dotted border-secondary px-4 font-pixel text-[9px] text-secondary transition-colors hover:bg-secondary hover:text-black focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-40"
          >
            REROLL
          </button>
          <button
            onClick={() => onApply(team.filter(Boolean))}
            disabled={loading || team.length === 0}
            className="h-12 border-2 border-dotted border-primary px-4 font-pixel text-[9px] text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-40"
          >
            APPLY TEAM
          </button>
        </div>
      </div>
    </div>
  )
}
