import { isPlainObject, safeSpriteUrl } from './validate'

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const LS_KEY = 'pkmn_dex_index_v2'

const TYPE_ID_NAME = {
  1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground',
  6: 'rock', 7: 'bug', 8: 'ghost', 9: 'steel', 10: 'fire',
  11: 'water', 12: 'grass', 13: 'electric', 14: 'psychic', 15: 'ice',
  16: 'dragon', 17: 'dark', 18: 'fairy'
}

const TYPE_NAMES = new Set(Object.values(TYPE_ID_NAME))

let cache = null

function isValidEntry(v) {
  if (!isPlainObject(v)) return false
  const id = Number(v.id)
  if (!Number.isInteger(id) || id <= 0) return false
  if (typeof v.name !== 'string' || v.name.length === 0) return false
  if (!Array.isArray(v.types) || !v.types.every((t) => TYPE_NAMES.has(t))) return false
  if (!safeSpriteUrl(v.sprite)) return false
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
  if (!res.ok) throw new Error(`Dex CSV failed (${res.status})`)
  return res.text()
}

/**
 * Lightweight index of every pokemon id (base species + forms).
 * Returns a Map<id, { id, name, types, sprite }> so the search modal can
 * render all results at once without fetching each detail from the API.
 * Fetched once, then cached in memory + localStorage.
 */
export async function getDexIndex() {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (!isPlainObject(obj) || !Object.entries(obj).every(([, v]) => isValidEntry(v))) {
        throw new Error('Invalid dex cache')
      }
      cache = new Map(Object.entries(obj).map(([id, v]) => [Number(id), v]))
      return cache
    }
  } catch {
    // fall through to network
  }

  const [pokemonCsv, typesCsv] = await Promise.all([
    fetchCsv('pokemon.csv'),
    fetchCsv('pokemon_types.csv')
  ])

  const typesByPokemon = new Map()
  for (const r of parseCsv(typesCsv)) {
    const pid = Number(r.pokemon_id)
    const tname = TYPE_ID_NAME[r.type_id]
    if (!tname) continue
    if (!typesByPokemon.has(pid)) typesByPokemon.set(pid, [])
    const arr = typesByPokemon.get(pid)
    const slot = Number(r.slot)
    if (slot === 1) arr.unshift(tname)
    else arr.push(tname)
  }

  const map = new Map()
  for (const p of parseCsv(pokemonCsv)) {
    const id = Number(p.id)
    const types = typesByPokemon.get(id) ?? []
    map.set(id, {
      id,
      name: p.identifier,
      types,
      sprite: safeSpriteUrl(`${SPRITE_BASE}/${id}.png`)
    })
  }

  const compact = {}
  for (const [id, v] of map) {
    compact[id] = { id, name: v.name, types: v.types, sprite: v.sprite }
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(compact))
  } catch {
    // storage may be full/unavailable; ignore
  }

  cache = map
  return cache
}
