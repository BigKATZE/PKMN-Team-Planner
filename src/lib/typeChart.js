import { isPlainObject } from './validate'

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const LS_KEY = 'pkmn_type_chart_v2'

const TYPE_ID_NAME = {
  1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground',
  6: 'rock', 7: 'bug', 8: 'ghost', 9: 'steel', 10: 'fire',
  11: 'water', 12: 'grass', 13: 'electric', 14: 'psychic', 15: 'ice',
  16: 'dragon', 17: 'dark', 18: 'fairy'
}

const TYPE_NAMES = new Set(Object.values(TYPE_ID_NAME))

let cache = null

function isValidChart(chart) {
  if (!isPlainObject(chart)) return false
  for (const [atk, row] of Object.entries(chart)) {
    if (!TYPE_NAMES.has(atk) || !isPlainObject(row)) return false
    for (const value of Object.values(row)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return false
    }
  }
  return true
}

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
  if (!res.ok) throw new Error(`Type CSV failed (${res.status})`)
  return res.text()
}

/**
 * Damage chart keyed by type name.
 * Returns { [attackName]: { [defendName]: multiplier } } where multiplier
 * is 0.25 | 0.5 | 1 | 2 | 4.
 * Fetched once, then cached.
 */
export async function getTypeChart() {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!isValidChart(parsed)) throw new Error('Invalid type chart cache')
      cache = parsed
      return cache
    }
  } catch {
    // fall through to network
  }

  const csv = await fetchCsv('type_efficacy.csv')
  const chart = {}
  for (const r of parseCsv(csv)) {
    const atkName = TYPE_ID_NAME[r.damage_type_id]
    const defName = TYPE_ID_NAME[r.target_type_id]
    if (!atkName || !defName) continue
    if (!chart[atkName]) chart[atkName] = {}
    chart[atkName][defName] = Number(r.damage_factor) / 100
  }

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(chart))
  } catch {
    // storage may be full/unavailable; ignore
  }

  cache = chart
  return cache
}

/**
 * Combined multiplier when attacking with `attackTypes` against a defender
 * whose types are `defendTypes` (product of each matchup).
 */
export async function typeMultiplier(attackTypes, defendTypes) {
  const chart = await getTypeChart()
  let product = 1
  for (const atk of attackTypes) {
    for (const def of defendTypes) {
      product *= chart[atk]?.[def] ?? 1
    }
  }
  return product
}
