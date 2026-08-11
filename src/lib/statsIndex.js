import { isPlainObject } from './validate'

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const LS_KEY = 'pkmn_stats_index_v3'

const STAT_ID_MAP = {
  1: 'hp',
  2: 'attack',
  3: 'defense',
  4: 'special-attack',
  5: 'special-defense',
  6: 'speed'
}

const STAGE_CACHE = {}

const STAGES = new Set(['unevolved', 'evolved-once', 'fully-evolved'])

function isValidEntry(v) {
  if (!isPlainObject(v)) return false
  if (typeof v.total !== 'number' || !Number.isFinite(v.total) || v.total < 0) return false
  if (typeof v.legendary !== 'boolean' || typeof v.mythical !== 'boolean') return false
  return STAGES.has(v.stage)
}

function toInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Evolution category derived from the evolves-from chain.
 *  'unevolved'    — stage 1 that evolves further (bulbasaur, charmander)
 *  'evolved-once' — stage 2 that evolves further (ivysaur, charmeleon)
 *  'fully-evolved'— no further evolution: stage 3 finals (charizard)
 *                   AND single-stage species that never evolve (tauros)
 *
 * canEvolve: Set of ids that have at least one descendant (evolves further).
 */
function computeCategory(id, evolvesFrom, canEvolve) {
  if (STAGE_CACHE[id] != null) return STAGE_CACHE[id]
  const seen = new Set()
  let current = id
  let stage = 1
  while (evolvesFrom[current] != null) {
    if (seen.has(current)) break
    seen.add(current)
    current = evolvesFrom[current]
    stage++
  }
  let category
  if (stage >= 3) {
    category = 'fully-evolved'
  } else if (stage === 2) {
    category = canEvolve.has(id) ? 'evolved-once' : 'fully-evolved'
  } else if (!canEvolve.has(id)) {
    category = 'fully-evolved'
  } else {
    category = 'unevolved'
  }
  STAGE_CACHE[id] = category
  return category
}

let cache = null

function parseCsv(text) {
  const lines = text.trim().split('\n')
  const header = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row = {}
    header.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
}

async function fetchCsv(name) {
  const res = await fetch(`${CSV_BASE}/${name}`)
  if (!res.ok) throw new Error(`Stats CSV failed (${res.status})`)
  return res.text()
}

/**
 * Build a Map<id, { total, legendary, mythical, stage }> for base species (1..1025).
 * stage: 'unevolved' | 'evolved-once' | 'fully-evolved'
 * Fetched once, then cached in memory + localStorage.
 */
export async function getStatsIndex() {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (!isPlainObject(obj) || !Object.entries(obj).every(([, v]) => isValidEntry(v))) {
        throw new Error('Invalid stats cache')
      }
      cache = new Map(Object.entries(obj).map(([id, v]) => [Number(id), v]))
      return cache
    }
  } catch {
    // fall through to network
  }

  const [statsCsv, speciesCsv] = await Promise.all([
    fetchCsv('pokemon_stats.csv'),
    fetchCsv('pokemon_species.csv')
  ])

  const map = new Map()
  const evolvesFrom = {}
  const canEvolve = new Set()
  for (const s of parseCsv(speciesCsv)) {
    const id = Number(s.id)
    map.set(id, {
      total: 0,
      legendary: s.is_legendary === '1',
      mythical: s.is_mythical === '1',
      stage: 'fully-evolved'
    })
    const pre = toInt(s.evolves_from_species_id)
    evolvesFrom[id] = pre
    if (pre != null) canEvolve.add(pre)
  }

  for (const id of map.keys()) {
    map.get(id).stage = computeCategory(id, evolvesFrom, canEvolve)
  }

  const totals = {}
  for (const r of parseCsv(statsCsv)) {
    const id = Number(r.pokemon_id)
    const stat = STAT_ID_MAP[r.stat_id]
    if (!stat) continue
    totals[id] = (totals[id] ?? 0) + Number(r.base_stat)
  }
  for (const [id, entry] of map) {
    entry.total = totals[id] ?? 0
  }

  const compact = {}
  for (const [id, entry] of map) {
    compact[id] = {
      total: entry.total,
      legendary: entry.legendary,
      mythical: entry.mythical,
      stage: entry.stage
    }
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(compact))
  } catch {
    // storage may be full/unavailable; ignore
  }

  cache = map
  return cache
}
