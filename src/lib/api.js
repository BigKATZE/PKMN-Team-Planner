import { getStatsIndex } from './statsIndex'
import { getGameIndex } from './gameIndex'
import { getDexIndex } from './dexIndex'
import { getTypeChart } from './typeChart'
import { TYPES, effectiveTypes } from '../data/types'
import { isPlainObject, safeSpriteUrl } from './validate'

const detailCache = new Map()
const typeMembersCache = new Map()

const API = 'https://pokeapi.co/api/v2'

function extractId(url) {
  const parts = url.split('/').filter(Boolean)
  return Number(parts[parts.length - 1])
}

/**
 * PokeAPI responses are treated as untrusted external data. Validate the
 * fields the app actually uses (id, name, types, stats, sprite URL) before
 * they enter application logic or rendering, discarding malformed pieces.
 */
function validatePokemonData(data) {
  if (!isPlainObject(data)) throw new Error('PokeAPI returned an unexpected response')
  const id = Number(data.id)
  if (!Number.isInteger(id) || id <= 0) throw new Error('PokeAPI returned an invalid pokemon id')
  const name = typeof data.name === 'string' && data.name.length > 0 ? data.name : String(id)
  const types = Array.isArray(data.types)
    ? data.types
        .filter(
          (t) =>
            isPlainObject(t) &&
            isPlainObject(t.type) &&
            typeof t.type.name === 'string' &&
            TYPES.includes(t.type.name)
        )
        .sort((a, b) => (Number(a.slot) || 0) - (Number(b.slot) || 0))
        .map((t) => t.type.name)
    : []
  const stats = {}
  if (Array.isArray(data.stats)) {
    for (const s of data.stats) {
      if (isPlainObject(s) && isPlainObject(s.stat) && typeof s.stat.name === 'string') {
        const value = Number(s.base_stat)
        if (Number.isFinite(value)) stats[s.stat.name] = value
      }
    }
  }
  const sprite = safeSpriteUrl(data.sprites && data.sprites.front_default)
  return { id, name, types, stats, sprite }
}

export async function getPokemon(idOrName) {
  const key = String(idOrName).toLowerCase()
  if (detailCache.has(key)) return detailCache.get(key)

  const res = await fetch(`${API}/pokemon/${key}`)
  if (!res.ok) throw new Error(`PokeAPI failed for ${key} (${res.status})`)
  const data = await res.json()

  const pokemon = validatePokemonData(data)

  detailCache.set(key, pokemon)
  detailCache.set(String(pokemon.id), pokemon)
  return pokemon
}

/**
 * Fetch the full national-dex membership of a type once (Set of ids).
 */
async function getTypeMembers(type) {
  if (typeMembersCache.has(type)) return typeMembersCache.get(type)
  const res = await fetch(`${API}/type/${type}`)
  if (!res.ok) throw new Error(`PokeAPI type failed for ${type} (${res.status})`)
  const data = await res.json()
  const members = new Set(
    (Array.isArray(data.pokemon) ? data.pokemon : [])
      .map((p) =>
        isPlainObject(p) && isPlainObject(p.pokemon) && typeof p.pokemon.url === 'string'
          ? extractId(p.pokemon.url)
          : NaN
      )
      .filter((id) => Number.isInteger(id) && id > 0)
  )
  typeMembersCache.set(type, members)
  return members
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

function applyGenerations(entry, generations) {
  if (!generations || generations.length === 0) return true
  return generations.some((g) => entry.id >= g.min && entry.id <= g.max)
}

/**
 * Search the national dex with name/type/generation/stat/stage/game filters.
 * Returns all matching items at once (no pagination) using a lightweight index.
 * sort: 'id' | 'name' | 'bst' | 'bst-asc'
 * rarity: 'all' | 'legendary' | 'mythical'
 * stage: null (any) | 'unevolved' | 'evolved-once' | 'fully-evolved'
 * game: null (any) | version id from GAMES
 * regionalOnly: restrict to the selected game's regional dex
 */
export async function searchPokemon({
  query = '',
  type = null,
  generations = [],
  sort = 'id',
  minBst = 0,
  rarity = 'all',
  stage = null,
  game = null,
  regionalOnly = false
} = {}) {
  const dex = await getDexIndex()
  const q = query.trim().toLowerCase()

  let candidates = [...dex.values()]
  if (generations.length > 0) {
    candidates = candidates.filter((e) => applyGenerations(e, generations))
  }
  if (q) {
    candidates = candidates.filter((e) => e.name.includes(q))
  }
  if (type) {
    const members = await getTypeMembers(type)
    candidates = candidates.filter((e) => members.has(e.id))
  }

  let gameEntry = null
  if (game != null) {
    const gIndex = await getGameIndex()
    gameEntry = gIndex.get(game)
  }

  const needsStats =
    sort.startsWith('bst') || minBst > 0 || rarity !== 'all' || stage != null
  if (gameEntry || needsStats) {
    const stats = needsStats ? await getStatsIndex() : null
    const allowed = gameEntry && regionalOnly ? gameEntry.regional : gameEntry?.members ?? null
    candidates = candidates.filter((e) => {
      if (allowed && !allowed.has(e.id)) return false
      if (!stats) return true
      const meta = stats.get(e.id)
      if (!meta) return false
      if (minBst > 0 && meta.total < minBst) return false
      if (rarity === 'legendary' && !meta.legendary) return false
      if (rarity === 'mythical' && !meta.mythical) return false
      if (stage != null && meta.stage !== stage) return false
      return true
    })
    if (sort === 'bst') {
      candidates = candidates.slice().sort((a, b) => (stats.get(b.id)?.total ?? 0) - (stats.get(a.id)?.total ?? 0))
    } else if (sort === 'bst-asc') {
      candidates = candidates.slice().sort((a, b) => (stats.get(a.id)?.total ?? 0) - (stats.get(b.id)?.total ?? 0))
    } else if (sort === 'id' && gameEntry) {
      const rank = new Map(gameEntry.roster.map((sid, i) => [sid, i]))
      candidates = candidates.slice().sort(
        (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      )
    }
  } else if (sort === 'name') {
    candidates = candidates.slice().sort((a, b) => a.name.localeCompare(b.name))
  }

  return {
    items: candidates,
    total: candidates.length
  }
}

/**
 * Generate a random team.
 * @param {object} opts
 * @param {number} opts.size target team size (1-6)
 * @param {object[]} opts.generations selected GENERATIONS entries
 * @param {boolean} opts.uniqueTypes avoid sharing a type combo within the team
 * @param {boolean} opts.noSharedTypes avoid repeating any individual type
 *        anywhere in the team (stronger than uniqueTypes)
 * @param {boolean} opts.baseOnly restrict to national-dex base species (id <= 1025)
 * @param {number|null} opts.stage only pick species by evolution category
 *        (null | 'unevolved' | 'evolved-once' | 'fully-evolved')
 * @param {number|null} opts.game only pick species available in this game (version id | null)
 * @param {boolean} opts.noLegendaryMythical exclude legendary and mythical species
 * @param {boolean} opts.regionalOnly restrict to the selected game's regional dex
 * @param {string[]} opts.availableTypes types that exist in the selected generation
 */
export async function getRandomTeam({
  size = 6,
  generations = [],
  uniqueTypes = false,
  noSharedTypes = false,
  baseOnly = true,
  stage = null,
  game = null,
  noLegendaryMythical = false,
  regionalOnly = false,
  availableTypes = TYPES
} = {}) {
  const dex = await getDexIndex()
  let pool = [...dex.values()]
  if (baseOnly) pool = pool.filter((e) => e.id <= 1025)
  if (generations.length > 0) {
    pool = pool.filter((e) => applyGenerations(e, generations))
  }
  if (game != null) {
    const gameIndex = await getGameIndex()
    const entry = gameIndex.get(game)
    if (entry) {
      const allowed = regionalOnly ? entry.regional : entry.members
      pool = pool.filter((e) => allowed.has(e.id))
    }
  }
  if (stage != null || noLegendaryMythical) {
    const index = await getStatsIndex()
    pool = pool.filter((e) => {
      const meta = index.get(e.id)
      if (!meta) return false
      if (stage != null && meta.stage !== stage) return false
      if (noLegendaryMythical && (meta.legendary || meta.mythical)) return false
      return true
    })
  }
  if (pool.length === 0) return []

  const picked = []
  const seenIds = new Set()
  const seenTypeCombos = new Set()
  const usedTypes = new Set()
  const maxTries = pool.length * 3

  for (let attempt = 0; attempt < maxTries && picked.length < size; attempt++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)]
    if (seenIds.has(candidate.id)) continue
    let detail
    try {
      detail = await getPokemon(candidate.id)
    } catch {
      continue
    }
    const combo = effectiveTypes(detail.types, availableTypes).slice().sort().join('+')
    if (uniqueTypes && seenTypeCombos.has(combo)) continue
    const eff = effectiveTypes(detail.types, availableTypes)
    if (noSharedTypes && eff.some((t) => usedTypes.has(t))) continue
    seenIds.add(candidate.id)
    seenTypeCombos.add(combo)
    eff.forEach((t) => usedTypes.add(t))
    picked.push({ ...detail, types: eff })
  }

  return picked
}

/**
 * Score a candidate's defensive profile against a list of threatening types.
 * Lower is better: counts how much damage the candidate would take from each
 * attacking type, weighted by the current team's exposure to that type.
 */
function defensiveScore(candidateTypes, threatMult, chart, availableTypes = TYPES) {
  let score = 0
  for (const atk of availableTypes) {
    const t = threatMult[atk] ?? 1
    if (t <= 1) continue
    let m = 1
    for (const ct of candidateTypes) m *= chart[atk]?.[ct] ?? 1
    score += t * m
  }
  return score
}

/**
 * Suggest Pokémon that fill the current team's defensive and offensive gaps.
 * Candidates are scored by:
 *  - how little damage they'd take from the types the team is currently weak to
 *  - how well they cover types the team can't hit super-effectively
 * @param {object} opts
 * @param {object[]} opts.team current team (array of pokemon detail objects)
 * @param {number} opts.count number of suggestions to return
 * @param {object[]} opts.generations selected GENERATIONS entries
 * @param {boolean} opts.uniqueTypes avoid suggesting the same type combo twice
 * @param {boolean} opts.noSharedTypes avoid repeating any individual type already
 *        on the team or among the suggestions (stronger than uniqueTypes)
 * @param {boolean} opts.baseOnly restrict to national-dex base species (id <= 1025)
 * @param {number|null} opts.stage only pick species by evolution category
 * @param {number|null} opts.game only pick species available in this game (version id | null)
 * @param {boolean} opts.noLegendaryMythical exclude legendary and mythical species
 * @param {boolean} opts.regionalOnly restrict to the selected game's regional dex
 * @param {string[]} opts.excludeIds ids already on the team
 * @param {string[]} opts.availableTypes types that exist in the selected generation
 */
export async function getTeamSuggestions({
  team = [],
  count = 6,
  generations = [],
  uniqueTypes = false,
  noSharedTypes = false,
  baseOnly = true,
  stage = null,
  game = null,
  noLegendaryMythical = false,
  regionalOnly = false,
  excludeIds = [],
  availableTypes = TYPES
} = {}) {
  const members = team.filter(Boolean)
  if (members.length === 0) return []

  const chart = await getTypeChart()

  // Current team's defensive exposure per attacking type.
  const threatMult = {}
  for (const atk of availableTypes) {
    let m = 1
    for (const p of members) {
      for (const t of p.types) m *= chart[atk]?.[t] ?? 1
    }
    threatMult[atk] = m
  }

  // Offensive coverage: types no team member hits for super-effective damage.
  const uncovered = []
  for (const def of availableTypes) {
    const hasHit = members.some((p) =>
      p.types.some((atk) => (chart[atk]?.[def] ?? 1) >= 2)
    )
    if (!hasHit) uncovered.push(def)
  }

  const [dex, stats, gameIndex] = await Promise.all([
    getDexIndex(),
    getStatsIndex(),
    getGameIndex()
  ])

  let candidates = [...dex.values()]
  const excluded = new Set(excludeIds)
  candidates = candidates.filter((e) => !excluded.has(e.id))
  if (baseOnly) candidates = candidates.filter((e) => e.id <= 1025)
  if (generations.length > 0) {
    candidates = candidates.filter((e) => applyGenerations(e, generations))
  }
  if (game != null) {
    const entry = gameIndex.get(game)
    if (entry) {
      const allowed = regionalOnly ? entry.regional : entry.members
      candidates = candidates.filter((e) => allowed.has(e.id))
    }
  }
  if (stage != null || noLegendaryMythical) {
    candidates = candidates.filter((e) => {
      const meta = stats.get(e.id)
      if (!meta) return false
      if (stage != null && meta.stage !== stage) return false
      if (noLegendaryMythical && (meta.legendary || meta.mythical)) return false
      return true
    })
  }

  const scored = []
  const seenCombos = new Set()
  const teamCombos = new Set(
    members.map((p) => p.types.slice().sort().join('+'))
  )
  const usedTypes = new Set()
  if (noSharedTypes) {
    members.forEach((p) => p.types.forEach((t) => usedTypes.add(t)))
  }

  for (const e of candidates) {
    if (e.types.length === 0) continue
    const eff = effectiveTypes(e.types, availableTypes)
    const combo = eff.slice().sort().join('+')
    if (uniqueTypes && (seenCombos.has(combo) || teamCombos.has(combo))) continue
    if (noSharedTypes && eff.some((t) => usedTypes.has(t))) continue

    const def = defensiveScore(eff, threatMult, chart, availableTypes)
    // Offensive bonus: types this candidate can hit for SE that the team can't.
    let offBonus = 0
    for (const u of uncovered) {
      if (eff.some((atk) => (chart[atk]?.[u] ?? 1) >= 2)) offBonus++
    }
    // Prefer candidates that aren't weak to types the team already fears.
    let penalty = 0
    for (const ct of eff) {
      for (const atk of availableTypes) {
        if ((threatMult[atk] ?? 1) >= 2 && (chart[atk]?.[ct] ?? 1) >= 2) penalty += 0.5
      }
    }

    const score = offBonus - def - penalty
    scored.push({ entry: e, combo, score })
    seenCombos.add(combo)
  }

  scored.sort((a, b) => b.score - a.score)

  const suggestions = []
  const usedIds = new Set()
  for (const { entry } of scored) {
    if (suggestions.length >= count) break
    if (usedIds.has(entry.id)) continue
    const eff = effectiveTypes(entry.types, availableTypes)
    if (noSharedTypes && eff.some((t) => usedTypes.has(t))) continue
    usedIds.add(entry.id)
    eff.forEach((t) => usedTypes.add(t))
    suggestions.push({
      id: entry.id,
      name: entry.name,
      types: eff,
      sprite: entry.sprite
    })
  }
  return suggestions
}
