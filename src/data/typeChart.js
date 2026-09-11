import { TYPES } from './types.js'

// Rows are attacker types; columns align to TYPES order (defender types).
const ROWS = {
  normal: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5, 1],
  fire: [1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5, 1, 2, 1],
  water: [1, 2, 0.5, 1, 0.5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 0.5, 1, 1, 1],
  electric: [1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 0.5, 1, 1, 1],
  grass: [1, 0.5, 2, 1, 0.5, 1, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 0.5, 1, 0.5, 1],
  ice: [1, 0.5, 0.5, 1, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 0.5, 1],
  fighting: [2, 1, 1, 1, 1, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1, 2, 2, 0.5],
  poison: [1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 0, 2],
  ground: [1, 2, 1, 2, 0.5, 1, 1, 2, 1, 0, 1, 0.5, 2, 1, 1, 1, 2, 1],
  flying: [1, 1, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 0.5, 1],
  psychic: [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 0, 0.5, 1],
  bug: [1, 0.5, 1, 1, 2, 1, 0.5, 0.5, 1, 0.5, 2, 1, 1, 0.5, 1, 2, 0.5, 0.5],
  rock: [1, 2, 1, 1, 1, 2, 0.5, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 0.5, 1],
  ghost: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 1],
  dragon: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0.5, 0],
  dark: [1, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 0.5],
  steel: [1, 0.5, 0.5, 0.5, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0.5, 2],
  fairy: [1, 0.5, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 1, 2, 2, 0.5, 1]
}

export const TYPE_CHART = Object.fromEntries(
  TYPES.map((atk, i) => [atk, Object.fromEntries(TYPES.map((def, j) => [def, ROWS[atk][j]]))])
)

// Historical overrides from PokeAPI type_efficacy_past.csv (last affected generation).
export function chartForGeneration(generation = null) {
  const chart = Object.fromEntries(Object.entries(TYPE_CHART).map(([type, row]) => [type, { ...row }]))
  if (generation != null && generation <= 5) {
    chart.ghost.steel = 0.5
    chart.dark.steel = 0.5
  }
  if (generation === 1) {
    chart.poison.bug = 2
    chart.bug.poison = 2
    chart.ghost.psychic = 0
    chart.ice.fire = 1
  }
  return chart
}

export function defensiveMultiplier(attackType, defendTypes, chart = TYPE_CHART) {
  return defendTypes.reduce((mult, type) => mult * (chart[attackType]?.[type] ?? 1), 1)
}

// A move has one attacking type. Choose the best available STAB type.
export function offensiveMultiplier(attackTypes, defendTypes, chart = TYPE_CHART) {
  return attackTypes.length ? Math.max(...attackTypes.map((type) => defensiveMultiplier(type, defendTypes, chart))) : 1
}

export function defenseCoverage(teamTypes, chart = TYPE_CHART, availableTypes = TYPES) {
  return Object.fromEntries(availableTypes.map((type) => {
    const multipliers = teamTypes.map((types) => defensiveMultiplier(type, types, chart))
    return [type, {
      weak: multipliers.filter((m) => m > 1).length,
      quad: multipliers.filter((m) => m === 4).length,
      resist: multipliers.filter((m) => m > 0 && m < 1).length,
      immune: multipliers.filter((m) => m === 0).length,
      neutral: multipliers.filter((m) => m === 1).length,
      multipliers
    }]
  }))
}
