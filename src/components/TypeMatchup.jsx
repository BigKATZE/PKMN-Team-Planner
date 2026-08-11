import { useEffect, useState } from 'react'
import { getTypeChart } from '../lib/typeChart'
import { TYPES } from '../data/types'

function Multiplier({ value, color }) {
  const label = value >= 4 ? '4X' : value > 1 ? '2X' : value === 1 ? '1X' : value >= 0.5 ? '0.5X' : '0.25X'
  return (
    <span
      className="inline-flex h-6 min-w-10 items-center justify-center px-1 font-term text-[10px] font-bold"
      style={{ color }}
      title={`${Math.round(value * 100)}% damage`}
    >
      {label}
    </span>
  )
}

export default function TypeMatchup({ types, availableTypes = TYPES }) {
  const [chart, setChart] = useState(null)

  useEffect(() => {
    let mounted = true
    getTypeChart().then((c) => {
      if (mounted) setChart(c)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (!chart) {
    return <p className="py-6 text-center font-pixel text-[8px] text-white/40">LOADING CHART...</p>
  }

  const multiplier = (attackTypes, defendTypes) => {
    let product = 1
    for (const atk of attackTypes) {
      for (const def of defendTypes) {
        product *= chart[atk]?.[def] ?? 1
      }
    }
    return product
  }

  const colorFor = (value) =>
    value >= 4 ? '#16a34a' : value >= 2 ? '#4ade80' : value === 1 ? 'rgba(255,255,255,0.45)' : value >= 0.5 ? '#f8d030' : '#dc2626'

  const renderRow = (title, rows) => (
    <div>
      <h4 className="mb-2 font-pixel text-[8px] text-white/70">{title}</h4>
      <div className="grid grid-cols-6 gap-1">
        {rows.map(({ type, value }) => (
          <div
            key={type}
            className="flex items-center gap-1"
            title={`${type}: ${Math.round(value * 100)}%`}
          >
            <img
              src={`/types/${type}.png`}
              alt={type}
              className="pixelated h-5 w-5 shrink-0 object-contain"
              loading="lazy"
            />
            <Multiplier value={value} color={colorFor(value)} />
          </div>
        ))}
      </div>
    </div>
  )

  const offensive = availableTypes.map((t) => ({ type: t, value: multiplier(types, [t]) }))
  const defensive = availableTypes.map((t) => ({ type: t, value: multiplier([t], types) }))

  return (
    <div className="mt-4 border-t border-dotted border-line pt-3">
      <h3 className="mb-3 font-pixel text-[10px] text-secondary">TYPE MATCHUPS</h3>
      {renderRow('OFFENSIVE (YOUR MOVES VS TARGET)', offensive)}
      <div className="mt-4">{renderRow('DEFENSIVE (ENEMY MOVES VS YOU)', defensive)}</div>
    </div>
  )
}
