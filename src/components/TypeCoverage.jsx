import { useMemo } from 'react'
import { TYPES } from '../data/types'
import { defenseCoverage } from '../data/typeChart'

function severity(m) {
  if (m === 0) return 'immune'
  if (m >= 4) return 'quad'
  if (m === 2) return 'weak'
  if (m <= 0.25) return 'resist4'
  if (m === 0.5) return 'resist'
  return 'neutral'
}

const STYLE = {
  immune: { color: '#2a3fe5', label: 'IMMUNE' },
  quad: { color: '#dc2626', label: 'x4 WEAK' },
  weak: { color: '#f87171', label: 'x2 WEAK' },
  resist4: { color: '#4ade80', label: 'x0.25' },
  resist: { color: '#16a34a', label: 'x0.5' },
  neutral: { color: 'rgba(255,255,255,0.55)', label: 'x1' }
}

export default function TypeCoverage({ team, availableTypes = TYPES }) {
  const coverage = useMemo(() => {
    const types = team.filter(Boolean).map((p) => p.types)
    if (types.length === 0) return null
    return defenseCoverage(types)
  }, [team])

  const rows = useMemo(() => {
    if (!coverage) return []
    return availableTypes
      .map((t) => ({ type: t, mult: coverage[t], sev: severity(coverage[t]) }))
      .sort((a, b) => b.mult - a.mult)
  }, [coverage, availableTypes])

  if (!coverage) {
    return (
      <div className="pac-border bg-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-primary">TYPE COVERAGE</h2>
          <span className="font-pixel text-[8px] text-white/40">{availableTypes.length} TYPES</span>
        </div>
        <p className="mt-4 font-term text-sm text-white/50">
          Add Pokémon to your party to compute defensive coverage.
        </p>
      </div>
    )
  }

  const counts = rows.reduce(
    (acc, r) => {
      if (r.sev === 'immune') acc.immune++
      else if (r.sev === 'quad' || r.sev === 'weak') acc.weak++
      else if (r.sev === 'resist' || r.sev === 'resist4') acc.resist++
      return acc
    },
    { weak: 0, resist: 0, immune: 0 }
  )

  return (
    <div className="pac-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-[10px] text-primary">TYPE COVERAGE</h2>
        <span className="font-pixel text-[8px] text-secondary blink">LIVE</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="pac-border-soft bg-panel2 p-2 text-center">
          <div className="font-term text-base text-danger">{counts.weak}</div>
          <div className="mt-1 font-pixel text-[7px] text-white/60">WEAK</div>
        </div>
        <div className="pac-border-soft bg-panel2 p-2 text-center">
          <div className="font-term text-base text-success">{counts.resist}</div>
          <div className="mt-1 font-pixel text-[7px] text-white/60">RESIST</div>
        </div>
        <div className="pac-border-soft bg-panel2 p-2 text-center">
          <div className="font-term text-base text-primary">{counts.immune}</div>
          <div className="mt-1 font-pixel text-[7px] text-white/60">IMMUNE</div>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {rows.map(({ type, mult, sev }) => {
          const s = STYLE[sev]
          return (
            <li
              key={type}
              className="flex items-center gap-3 border-b border-dotted border-line pb-1.5"
            >
              <img
                src={`/types/${type}.png`}
                alt={type}
                className="pixelated h-4 w-4 shrink-0 object-contain"
                loading="lazy"
              />
              <span className="w-16 font-pixel text-[8px] uppercase text-white/85">{type}</span>
              <span className="flex-1" />
              <span className="font-term text-sm" style={{ color: s.color }}>
                {s.label}
              </span>
              <span className="w-14 text-right font-term text-xs text-white/40">
                x{mult}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
