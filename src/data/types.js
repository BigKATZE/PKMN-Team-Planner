export const TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy'
]

export const TYPE_COLORS = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  electric: '#f8d030',
  grass: '#78c850',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac'
}

export const ABSENT_TYPES_BY_GEN = {
  1: ['dark', 'steel', 'fairy'],
  2: ['fairy'],
  3: ['fairy'],
  4: ['fairy'],
  5: ['fairy']
}

export function typesForGeneration(gen) {
  const absent = ABSENT_TYPES_BY_GEN[gen]
  if (!absent) return TYPES
  return TYPES.filter((t) => !absent.includes(t))
}

/**
 * Filter a pokemon's type list to the types that exist in the selected
 * generation (via the available-types list). Types absent in that generation
 * are dropped — e.g. Magnemite (electric/steel) becomes pure electric in Gen 1,
 * Azumarill (water/fairy) becomes pure water before Gen 6. If every type is
 * absent (a pure-fairy species pre-Gen-6, which were previously Normal), fall
 * back to 'normal'.
 */
export function effectiveTypes(types, availableTypes = TYPES) {
  const filtered = types.filter((t) => availableTypes.includes(t))
  return filtered.length > 0 ? filtered : ['normal']
}
