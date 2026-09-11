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

export const TYPE_ID_NAME = {
  1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground',
  6: 'rock', 7: 'bug', 8: 'ghost', 9: 'steel', 10: 'fire',
  11: 'water', 12: 'grass', 13: 'electric', 14: 'psychic', 15: 'ice',
  16: 'dragon', 17: 'dark', 18: 'fairy'
}

export function pokemonTypes(pokemon, generation = null) {
  if (!pokemon) return []
  if (generation != null) {
    const lastGeneration = Object.keys(pokemon.pastTypes ?? {})
      .map(Number).filter((g) => g >= generation).sort((a, b) => a - b)[0]
    if (lastGeneration != null) return pokemon.pastTypes[lastGeneration]
  }
  return pokemon.types
}

export function effectiveTypes(types, availableTypes = TYPES) {
  return types.filter((t) => availableTypes.includes(t))
}
