import { fetchCsv } from './csv.js'

export const GAMES = [
  { id: 1, label: 'Red', generation: 1 },
  { id: 2, label: 'Blue', generation: 1 },
  { id: 3, label: 'Yellow', generation: 1 },
  { id: 4, label: 'Gold', generation: 2 },
  { id: 5, label: 'Silver', generation: 2 },
  { id: 6, label: 'Crystal', generation: 2 },
  { id: 7, label: 'Ruby', generation: 3 },
  { id: 8, label: 'Sapphire', generation: 3 },
  { id: 9, label: 'Emerald', generation: 3 },
  { id: 10, label: 'FireRed', generation: 3 },
  { id: 11, label: 'LeafGreen', generation: 3 },
  { id: 12, label: 'Diamond', generation: 4 },
  { id: 13, label: 'Pearl', generation: 4 },
  { id: 14, label: 'Platinum', generation: 4 },
  { id: 15, label: 'HeartGold', generation: 4 },
  { id: 16, label: 'SoulSilver', generation: 4 },
  { id: 17, label: 'Black', generation: 5 },
  { id: 18, label: 'White', generation: 5 },
  { id: 21, label: 'Black 2', generation: 5 },
  { id: 22, label: 'White 2', generation: 5 },
  { id: 23, label: 'X', generation: 6 },
  { id: 24, label: 'Y', generation: 6 },
  { id: 25, label: 'Omega Ruby', generation: 6 },
  { id: 26, label: 'Alpha Sapphire', generation: 6 },
  { id: 27, label: 'Sun', generation: 7 },
  { id: 28, label: 'Moon', generation: 7 },
  { id: 29, label: 'Ultra Sun', generation: 7 },
  { id: 30, label: 'Ultra Moon', generation: 7 },
  { id: 31, label: "Let's Go Pikachu", generation: 7 },
  { id: 32, label: "Let's Go Eevee", generation: 7 },
  { id: 33, label: 'Sword', generation: 8 },
  { id: 34, label: 'Shield', generation: 8 },
  { id: 37, label: 'Brilliant Diamond', generation: 8 },
  { id: 38, label: 'Shining Pearl', generation: 8 },
  { id: 39, label: 'Legends: Arceus', generation: 8 },
  { id: 40, label: 'Scarlet', generation: 9 },
  { id: 41, label: 'Violet', generation: 9 },
  { id: 47, label: 'Legends: Z-A', generation: 9 }
]

export function generationForGame(game) {
  return GAMES.find((g) => g.id === game)?.generation ?? null
}

export async function getGameIndex() {
  const [versions, dexGroups, dexNumbers, gameIndices, dexes] = await Promise.all([
    fetchCsv('versions.csv'), fetchCsv('pokedex_version_groups.csv'),
    fetchCsv('pokemon_dex_numbers.csv'), fetchCsv('pokemon_game_indices.csv'), fetchCsv('pokedexes.csv')
  ])
  const mainDexes = new Set(dexes.filter((d) => d.is_main_series === '1' && d.id !== '1').map((d) => d.id))
  return new Map(GAMES.map((game) => {
    const group = versions.find((v) => Number(v.id) === game.id)?.version_group_id
    const dexIds = new Set(dexGroups.filter((d) => d.version_group_id === group && mainDexes.has(d.pokedex_id)).map((d) => d.pokedex_id))
    // Unioning species IDs naturally removes overlapping sub-dex entries.
    const regional = new Set(dexNumbers.filter((d) => dexIds.has(d.pokedex_id))
      .sort((a, b) => Number(a.pokedex_id) - Number(b.pokedex_id) || Number(a.pokedex_number) - Number(b.pokedex_number))
      .map((d) => Number(d.species_id)))
    const members = new Set(gameIndices.filter((r) => Number(r.version_id) === game.id).map((r) => Number(r.pokemon_id)))
    const roster = [...regional].filter((id) => members.has(id))
    roster.push(...[...members].filter((id) => !regional.has(id)).sort((a, b) => a - b))
    return [game.id, { roster, members, regional, hasData: members.size > 0 }]
  }))
}

export function gameAvailability(pokemon, entry, generation) {
  if (!entry) return { status: 'unknown', label: 'Game data unavailable' }
  if (pokemon.generation > generation) return { status: 'unavailable', label: 'Introduced in a later generation' }
  if (entry.members.has(pokemon.id)) return { status: 'available', label: 'In game roster' }
  if (!pokemon.isDefault) return { status: 'unknown', label: 'Form availability unverified' }
  if (!entry.hasData) return { status: 'unknown', label: 'Game roster unavailable' }
  return { status: 'unavailable', label: 'Not in game roster' }
}
