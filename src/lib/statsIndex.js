import { fetchCsv } from './csv.js'

export async function getStatsIndex() {
  const [stats, species, pokemon] = await Promise.all([
    fetchCsv('pokemon_stats.csv'), fetchCsv('pokemon_species.csv'), fetchCsv('pokemon.csv')
  ])
  const canEvolve = new Set(species.map((s) => Number(s.evolves_from_species_id)).filter(Boolean))
  const speciesMap = new Map(species.map((s) => [Number(s.id), {
    legendary: s.is_legendary === '1', mythical: s.is_mythical === '1',
    stage: !canEvolve.has(Number(s.id)) ? 'fully-evolved' : s.evolves_from_species_id ? 'evolved-once' : 'unevolved'
  }]))
  const totals = new Map()
  for (const s of stats) {
    if (Number(s.stat_id) <= 6) totals.set(Number(s.pokemon_id), (totals.get(Number(s.pokemon_id)) ?? 0) + Number(s.base_stat))
  }
  return new Map(pokemon.map((p) => [Number(p.id), { ...speciesMap.get(Number(p.species_id)), total: totals.get(Number(p.id)) ?? 0 }]))
}
