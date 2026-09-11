import { useMemo } from 'react'
import { TYPES } from '../data/types'
import { defenseCoverage, chartForGeneration } from '../data/typeChart'

export default function TypeCoverage({ team, availableTypes = TYPES, generation = null }) {
  const members = team.filter(Boolean)
  const rows = useMemo(() => Object.entries(defenseCoverage(team.filter(Boolean).map((p) => p.types), chartForGeneration(generation), availableTypes))
    .sort((a, b) => b[1].weak - a[1].weak || b[1].quad - a[1].quad || a[0].localeCompare(b[0])), [team, availableTypes, generation])
  const shared = rows.filter(([, r]) => r.weak >= 2)
  return <section className="pac-border bg-panel p-4" aria-labelledby="coverage-heading">
    <h2 id="coverage-heading" className="font-pixel text-xs text-primary">DEFENSIVE COVERAGE</h2>
    {!members.length ? <p className="empty-message">Add Pokémon to see shared weaknesses and safe switch-ins.</p> : <>
      <p className="coverage-summary">{shared.length ? `${shared.length} shared ${shared.length === 1 ? 'weakness' : 'weaknesses'} to consider` : 'No shared type weaknesses'}</p>
      <p className="muted">Number of team members affected by each attacking type.</p>
      <div className="coverage-table-wrap"><table className="coverage-table"><thead><tr><th scope="col">Type</th><th scope="col">Weak</th><th scope="col">Resist</th><th scope="col">Immune</th></tr></thead>
        <tbody>{rows.map(([type, r]) => <tr key={type} className={r.weak >= 2 ? 'shared-weakness' : ''}>
          <th scope="row"><span className="coverage-type"><img src={`/types/${type}.png`} alt="" className="pixelated" /><span>{type}</span></span></th>
          <td className={r.weak ? 'weak-count' : 'zero-count'} title={`${r.quad} take 4× damage`}>{r.weak}{r.quad > 0 && <span className="quad-note"> ({r.quad} ×4)</span>}</td>
          <td className={r.resist ? 'resist-count' : 'zero-count'}>{r.resist}</td><td className={r.immune ? 'immune-count' : 'zero-count'}>{r.immune}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="muted mt-3">Weak: ×2 or ×4. Resist: ×½ or ×¼. Immunity: ×0. Abilities and items are not included.</p>
    </>}
  </section>
}
