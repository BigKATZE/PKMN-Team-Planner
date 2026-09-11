import { STAT_LABELS, STAT_ORDER } from '../lib/api'
import TypeBadge from './TypeBadge'
import TypeMatchup from './TypeMatchup'

function statColor(value) {
  if (value >= 120) return '#66e397'
  if (value >= 80) return '#86efac'
  if (value >= 45) return '#f8d030'
  return '#ff9494'
}

export default function StatsPanel({ pokemon, onClose, availableTypes, generation }) {
  if (!pokemon) return null

  const total = STAT_ORDER.reduce((sum, k) => sum + (pokemon.stats[k] ?? 0), 0)
  const max = 255

  return (
    <div className="stats-panel pac-border flex flex-col bg-panel" role="region" aria-label={`${pokemon.name} stats`}>
      <div className="flex flex-col items-center justify-center gap-2 p-4 ">
        {pokemon.sprite ? (
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="pixelated h-32 w-32 object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-pixel text-4xl text-primary">?</span>
        )}
        <span className="font-term text-sm text-primary">
          #{String(pokemon.id).padStart(3, '0')}
        </span>
        <span className="text-center font-term text-base uppercase">{pokemon.name}</span>
        <div className="flex gap-1">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <div className="flex-1 border-t border-dotted border-line p-4 ">
        <div className="flex items-center justify-between">
          <h3 className="font-term text-sm text-secondary">BASE STATS</h3>
          <span className="font-term text-sm font-bold text-primary">TOTAL {total}</span>
          <button
            onClick={onClose}
            className="h-11 w-11 border border-dotted border-line font-term text-sm transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-secondary"
            aria-label="Close stats"
          >
            X
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {STAT_ORDER.map((key) => {
            const value = pokemon.stats[key] ?? 0
            const pct = Math.max(4, Math.round((value / max) * 100))
            const color = statColor(value)
            return (
              <li key={key} className="flex items-center gap-3">
                <span className="w-10 shrink-0 font-term text-xs text-white/70">
                  {STAT_LABELS[key]}
                </span>
                <div className="h-4 flex-1 border border-dotted border-line bg-black">
                  <div
                    className="meter-fill h-full"
                    style={{ width: `${pct}%`, color }}
                    role="meter"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={255}
                    aria-label={`${STAT_LABELS[key]} ${value}`}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-term text-sm" style={{ color }}>
                  {value}
                </span>
              </li>
            )
          })}
        </ul>

        <TypeMatchup types={pokemon.types} availableTypes={availableTypes} generation={generation} />
      </div>
    </div>
  )
}
