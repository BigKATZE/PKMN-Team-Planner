import { TYPES } from '../data/types'
import { chartForGeneration, defensiveMultiplier, offensiveMultiplier } from '../data/typeChart'

export default function TypeMatchup({ types, availableTypes = TYPES, generation = null }) {
  const chart = chartForGeneration(generation)
  return <div className="matchups">
    <h3 className="font-pixel text-xs text-secondary">TYPE MATCHUPS</h3>
    <p className="muted">Best STAB type against single-type targets. No abilities or items.</p>
    <div className="matchup-grid">{['Attack', 'Defense'].map((direction) => <section key={direction}>
      <h4>{direction === 'Attack' ? 'Attack · best own type' : 'Defense · damage taken'}</h4>
      <dl>{availableTypes.map((type) => {
        const value = direction === 'Attack' ? offensiveMultiplier(types, [type], chart) : defensiveMultiplier(type, types, chart)
        const good = direction === 'Attack' ? value > 1 : value < 1
        const bad = direction === 'Attack' ? value < 1 : value > 1
        return <div key={type}><dt><img src={`/types/${type}.png`} alt="" className="pixelated" />{type}</dt><dd className={good ? 'resist-count' : bad ? 'weak-count' : ''}>{value === 0 ? '0×' : `${value}×`}</dd></div>
      })}</dl>
    </section>)}</div>
  </div>
}
