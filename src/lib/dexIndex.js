import { fetchCsv } from './csv.js'
import { TYPE_ID_NAME } from '../data/types.js'

export async function getDexIndex() {
  const [pokemon, types, species, history] = await Promise.all([
    fetchCsv('pokemon.csv'), fetchCsv('pokemon_types.csv'),
    fetchCsv('pokemon_species.csv'), fetchCsv('pokemon_types_past.csv')
  ])
  const speciesMap = new Map(species.map((s) => [Number(s.id), s]))
  const typesById = new Map()
  for (const row of types) {
    if (!TYPE_ID_NAME[row.type_id]) continue
    const id = Number(row.pokemon_id)
    if (!typesById.has(id)) typesById.set(id, [])
    typesById.get(id)[Number(row.slot) - 1] = TYPE_ID_NAME[row.type_id]
  }
  const pastById = new Map()
  for (const row of history) {
    const id = Number(row.pokemon_id)
    if (!pastById.has(id)) pastById.set(id, {})
    const past = pastById.get(id)
    ;(past[row.generation_id] ??= [])[Number(row.slot) - 1] = TYPE_ID_NAME[row.type_id]
  }
  return new Map(pokemon.map((p) => {
    const id = Number(p.id)
    const speciesId = Number(p.species_id)
    return [id, {
      id, speciesId, name: p.identifier,
      generation: Number(speciesMap.get(speciesId)?.generation_id),
      isDefault: p.is_default === '1',
      types: (typesById.get(id) ?? []).filter(Boolean),
      pastTypes: pastById.get(id) ?? {},
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
    }]
  }))
}
