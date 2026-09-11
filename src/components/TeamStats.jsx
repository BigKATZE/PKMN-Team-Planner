import { useMemo } from 'react'
import { STAT_LABELS, STAT_ORDER } from '../lib/api'
import { TYPES, TYPE_COLORS } from '../data/types'
import { chartForGeneration, offensiveMultiplier } from '../data/typeChart'

function statColor(value) {
  if (value >= 120) return '#66e397'
  if (value >= 80) return '#86efac'
  if (value >= 45) return '#f8d030'
  return '#ff9494'
}

export default function TeamStats({ team, availableTypes = TYPES, generation = null }) {
  const stats = useMemo(() => {
    const chart = chartForGeneration(generation)
    const members = team.filter(Boolean)
    if (members.length === 0) return null

    const avg = {}
    let sumBst = 0
    const memberBsts = members.map((m) => {
      const bst = STAT_ORDER.reduce((s, k) => s + (m.stats[k] ?? 0), 0)
      sumBst += bst
      return { name: m.name, bst }
    })
    for (const k of STAT_ORDER) {
      avg[k] = Math.round(members.reduce((s, m) => s + (m.stats[k] ?? 0), 0) / members.length)
    }

    const strongest = memberBsts.reduce((a, b) => (b.bst > a.bst ? b : a))
    const weakest = memberBsts.reduce((a, b) => (b.bst < a.bst ? b : a))

    const typeSet = new Set()
    members.forEach((m) => m.types.forEach((t) => typeSet.add(t)))

    let bestStat = { key: STAT_ORDER[0], value: -1 }
    for (const k of STAT_ORDER) {
      if (avg[k] > bestStat.value) bestStat = { key: k, value: avg[k] }
    }

    // Offensive coverage: types the team can hit for super-effective damage
    // using each member's own (STAB) types as the attacking type.
    const offense = {}
    for (const def of availableTypes) {
      let best = 0
      for (const m of members) {
        for (const atk of m.types) {
          best = Math.max(best, offensiveMultiplier([atk], [def], chart))
        }
      }
      offense[def] = best
    }
    const offenseHit = availableTypes.filter((t) => offense[t] >= 2).length

    return {
      avg,
      avgBst: Math.round(sumBst / members.length),
      strongest,
      weakest,
      typeCount: typeSet.size,
      bestStat,
      offense,
      offenseHit
    }
  }, [team, availableTypes, generation])

  if (!stats) {
    return (
      <div className="pac-border mt-4 bg-panel p-4">
        <h2 className="font-term text-sm text-primary">TEAM STATS</h2>
        <p className="mt-3 font-term text-sm text-white/65">
          Add Pokémon to see team averages.
        </p>
      </div>
    )
  }

  return (
    <div className="pac-border mt-4 bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-term text-sm text-primary">TEAM STATS</h2>
        <span className="font-term text-sm text-secondary">AVG BST {stats.avgBst}</span>
      </div>

      <ul className="mt-4 space-y-2">
        {STAT_ORDER.map((key) => {
          const value = stats.avg[key]
          const pct = Math.max(4, Math.round((value / 255) * 100))
          const color = statColor(value)
          return (
            <li key={key} className="flex items-center gap-3">
              <span className="w-12 shrink-0 font-term text-[11px] tracking-wide text-white/70">
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
                  aria-label={`${STAT_LABELS[key]} average ${value}`}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-term text-sm" style={{ color }}>
                {value}
              </span>
            </li>
          )
        })}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-2 font-term text-xs">
        <div className="pac-border-soft bg-panel2 p-2">
          <dt className="text-white/65">STRONGEST</dt>
          <dd className="mt-1 font-term text-[12px] uppercase text-success">
            {stats.strongest.name} · {stats.strongest.bst}
          </dd>
        </div>
        <div className="pac-border-soft bg-panel2 p-2">
          <dt className="text-white/65">WEAKEST</dt>
          <dd className="mt-1 font-term text-[12px] uppercase text-danger">
            {stats.weakest.name} · {stats.weakest.bst}
          </dd>
        </div>
        <div className="pac-border-soft bg-panel2 p-2">
          <dt className="text-white/65">TYPE DIVERSITY</dt>
          <dd className="mt-1 font-term text-[12px] text-primary">{stats.typeCount}/{availableTypes.length}</dd>
        </div>
        <div className="pac-border-soft bg-panel2 p-2">
          <dt className="text-white/65">BEST STAT</dt>
          <dd className="mt-1 font-term text-[12px] uppercase text-secondary">
            {STAT_LABELS[stats.bestStat.key]} · {stats.bestStat.value}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-term text-xs text-white/70">OFFENSIVE COVERAGE</h3>
          <span className="font-term text-sm text-success">{stats.offenseHit}/{availableTypes.length}</span>
        </div>
        <p className="mt-1 font-term text-[11px] text-white/65">
          Super-effective vs these types (STAB):
        </p>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {availableTypes.map((t) => {
            const mult = stats.offense[t]
            const covered = mult >= 2
            return (
              <div
                key={t}
                title={`${t} (x${mult})`}
                className="flex h-7 items-center justify-center border"
                style={{
                  backgroundColor: covered ? TYPE_COLORS[t] : 'rgba(0,0,0,0.35)',
                  borderColor: covered ? TYPE_COLORS[t] : 'rgba(255,255,255,0.18)'
                }}
              >
                <img
                  src={`/types/${t}.png`}
                  alt={t}
                  className={`pixelated h-5 w-5 object-contain ${covered ? '' : 'opacity-35'}`}
                  loading="lazy"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
