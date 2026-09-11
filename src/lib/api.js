import { getStatsIndex } from './statsIndex.js'
import { getGameIndex, generationForGame, gameAvailability } from './gameIndex.js'
import { getDexIndex } from './dexIndex.js'
import { chartForGeneration, defensiveMultiplier, offensiveMultiplier, defenseCoverage } from '../data/typeChart.js'
import { typesForGeneration, pokemonTypes } from '../data/types.js'
import { isPlainObject, safeSpriteUrl } from './validate.js'

const detailCache = new Map()
const API = 'https://pokeapi.co/api/v2'

export async function getPokemon(idOrName) {
  const key = String(idOrName).toLowerCase()
  if (detailCache.has(key)) return detailCache.get(key)
  const promise = (async () => {
    const [res, dex] = await Promise.all([
      fetch(`${API}/pokemon/${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(20000) }), getDexIndex()
    ])
    if (!res.ok) throw new Error(`Could not load Pokémon (${res.status}). Please try again.`)
    const data = await res.json()
    if (!isPlainObject(data) || !dex.has(data.id)) throw new Error('Invalid Pokémon response.')
    const stats = Object.fromEntries(STAT_ORDER.map((name) => {
      const value = data.stats?.find((s) => s.stat?.name === name)?.base_stat
      if (!Number.isFinite(value) || value < 0 || value > 255) throw new Error('Invalid Pokémon stats.')
      return [name, value]
    }))
    return { ...dex.get(data.id), stats, sprite: safeSpriteUrl(data.sprites?.front_default) ?? dex.get(data.id).sprite }
  })()
  detailCache.set(key, promise)
  promise.catch(() => detailCache.delete(key))
  return promise
}

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SPA',
  'special-defense': 'SPD',
  speed: 'SPE'
}

export const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']

export const GENERATIONS = [
  { label: 'GEN I', min: 1, max: 151 },
  { label: 'GEN II', min: 152, max: 251 },
  { label: 'GEN III', min: 252, max: 386 },
  { label: 'GEN IV', min: 387, max: 493 },
  { label: 'GEN V', min: 494, max: 649 },
  { label: 'GEN VI', min: 650, max: 721 },
  { label: 'GEN VII', min: 722, max: 809 },
  { label: 'GEN VIII', min: 810, max: 905 },
  { label: 'GEN IX', min: 906, max: 1025 }
]

export async function searchPokemon({
  query = '', type = null, generations = [], sort = 'id', minBst = 0,
  rarity = 'all', stage = null, game = null, regionalOnly = false,
  baseOnly = false, noLegendaryMythical = false
} = {}) {
  const needsStats = sort.startsWith('bst') || minBst > 0 || rarity !== 'all' || stage != null || noLegendaryMythical
  const [dex, stats, games] = await Promise.all([
    getDexIndex(), needsStats ? getStatsIndex() : null, game != null ? getGameIndex() : null
  ])
  const entry = games?.get(game)
  if (game != null && !entry?.hasData) throw new Error('Game roster unavailable. Choose another game or try again later.')
  const generation = generationForGame(game)
  const q = query.trim().toLowerCase()
  let items = [...dex.values()].filter((p) => {
    const meta = stats?.get(p.id)
    if (q && !p.name.includes(q) && String(p.id) !== q.replace(/^#/, '')) return false
    if (type && !pokemonTypes(p, generation).includes(type)) return false
    if (generations.length && !generations.some((g) => p.speciesId >= g.min && p.speciesId <= g.max)) return false
    if (baseOnly && !p.isDefault) return false
    if (entry && gameAvailability(p, entry, generation).status !== 'available') return false
    if (entry && regionalOnly && !entry.regional.has(p.speciesId)) return false
    if (needsStats && !meta) return false
    if (minBst && meta.total < minBst) return false
    if (rarity === 'legendary' && !meta.legendary) return false
    if (rarity === 'mythical' && !meta.mythical) return false
    if (noLegendaryMythical && (meta.legendary || meta.mythical)) return false
    return stage == null || meta.stage === stage
  })
  const rank = new Map(entry?.roster.map((id, i) => [id, i]) ?? [])
  items.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'bst' || sort === 'bst-asc') return (stats.get(a.id).total - stats.get(b.id).total) * (sort === 'bst' ? -1 : 1) || a.id - b.id
    return (entry ? (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) : 0) || a.id - b.id
  })
  return { items, total: items.length }
}

export async function getRandomTeam({ size = 6, uniqueTypes = false, noSharedTypes = false, ...opts } = {}) {
  const { items } = await searchPokemon(opts)
  // Shuffle once and sample without replacement: bounded even with restrictive filters.
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const generation = generationForGame(opts.game)
  const combos = new Set(), usedTypes = new Set(), picked = []
  for (const p of pool) {
    const types = pokemonTypes(p, generation)
    const combo = [...types].sort().join('+')
    if (uniqueTypes && combos.has(combo)) continue
    if (noSharedTypes && types.some((t) => usedTypes.has(t))) continue
    picked.push(p)
    combos.add(combo)
    types.forEach((t) => usedTypes.add(t))
    if (picked.length >= size) break
  }
  // Preserve original types so changing games later can restore them.
  return Promise.all(picked.map((p) => getPokemon(p.id)))
}

export function rankSuggestions(candidates, team, { count = 6, generation = null, uniqueTypes = false, noSharedTypes = false } = {}) {
  const chart = chartForGeneration(generation)
  const types = typesForGeneration(generation)
  const members = team.filter(Boolean)
  if (!members.length) return []
  const coverage = defenseCoverage(members.map((p) => p.types), chart, types)
  const uncovered = types.filter((def) => !members.some((p) => offensiveMultiplier(p.types, [def], chart) > 1))
  const threats = types.filter((t) => coverage[t].weak > 0).sort((a, b) => coverage[b].weak - coverage[a].weak)
  const teamIds = new Set(members.map((p) => p.id))
  const scored = candidates.filter((p) => !teamIds.has(p.id)).map((p) => {
    const candidateTypes = pokemonTypes(p, generation)
    let score = 0
    const reasons = []
    for (const type of threats) {
      const m = defensiveMultiplier(type, candidateTypes, chart)
      const exposure = coverage[type].weak
      score += exposure * (1 - m)
      if (m < 1) reasons.push(`${m === 0 ? 'Immune to' : 'Resists'} ${type}: ${exposure} team ${exposure === 1 ? 'member is' : 'members are'} weak to it.`)
    }
    const added = uncovered.filter((t) => offensiveMultiplier(candidateTypes, [t], chart) > 1)
    score += added.length * 1.5
    if (added.length) reasons.push(`Adds super-effective STAB coverage against ${added.join(', ')}.`)
    if (!reasons.length) reasons.push('No new type coverage; an alternative under your current filters.')
    return { ...p, score, reasons: reasons.slice(0, 3), combo: [...candidateTypes].sort().join('+'), candidateTypes }
  }).sort((a, b) => b.score - a.score || a.id - b.id)
  const combos = new Set(members.map((p) => [...p.types].sort().join('+')))
  const used = new Set(members.flatMap((p) => p.types))
  const result = []
  for (const p of scored) {
    if (uniqueTypes && combos.has(p.combo)) continue
    if (noSharedTypes && p.candidateTypes.some((t) => used.has(t))) continue
    result.push(p)
    combos.add(p.combo)
    p.candidateTypes.forEach((t) => used.add(t))
    if (result.length >= count) break
  }
  return result
}

export async function getTeamSuggestions({ team = [], count = 6, uniqueTypes = false, noSharedTypes = false, ...opts } = {}) {
  if (!team.some(Boolean)) return []
  const { items } = await searchPokemon(opts)
  return rankSuggestions(items, team, { count, uniqueTypes, noSharedTypes, generation: generationForGame(opts.game) })
}
