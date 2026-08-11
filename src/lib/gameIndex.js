import { isPlainObject } from './validate'

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const LS_KEY = 'pkmn_game_index_v3'

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

const NATIONAL_DEX_ID = 1

let cache = null

function isValidIdList(arr) {
  return (
    Array.isArray(arr) &&
    arr.every((n) => Number.isInteger(Number(n)) && Number(n) > 0)
  )
}

function isValidEntry(v) {
  // Legacy format: the entry itself was the roster array.
  if (Array.isArray(v)) return isValidIdList(v)
  if (!isPlainObject(v)) return false
  if (!isValidIdList(v.roster)) return false
  if (v.regional != null && !isValidIdList(v.regional)) return false
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
  if (!res.ok) throw new Error(`Game CSV failed (${res.status})`)
  return res.text()
}

function toInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Drop sub-dexes that are strict subsets of another regional dex in the same
 * version group (e.g. Alola island dexes are contained in the combined dex).
 */
function pruneSubsets(pokedexes) {
  const sets = pokedexes.map((p) => new Set(p.species))
  return pokedexes.filter((p, i) => {
    for (let j = 0; j < pokedexes.length; j++) {
      if (i === j) continue
      const other = sets[j]
      if (other.size < sets[i].size) continue
      if ([...sets[i]].every((s) => other.has(s))) return false
    }
    return true
  })
}

/**
 * Build a Map<versionId, { roster, members, regional }>.
 * roster: ordered base-species ids — regional (in-game) dex first, then the
 *         remaining national-dex additions (post-game) sorted by id.
 * members: Set of base-species ids available in the game.
 * regional: Set of base-species ids in the game's regional dex.
 * Fetched once, then cached in memory + localStorage.
 */
export async function getGameIndex() {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (
        !isPlainObject(obj) ||
        !Object.entries(obj).every(
          ([vid, entry]) => Number.isInteger(Number(vid)) && Number(vid) > 0 && isValidEntry(entry)
        )
      ) {
        throw new Error('Invalid game cache')
      }
      cache = new Map()
      for (const [vid, entry] of Object.entries(obj)) {
        const roster = entry.roster ?? entry
        cache.set(Number(vid), {
          roster,
          members: new Set(roster),
          regional: new Set(entry.regional ?? roster)
        })
      }
      return cache
    }
  } catch {
    // fall through to network
  }

  const [versionsCsv, pokedexesCsv, dexGroupCsv, dexNumbersCsv, gameIndicesCsv] =
    await Promise.all([
      fetchCsv('versions.csv'),
      fetchCsv('pokedexes.csv'),
      fetchCsv('pokedex_version_groups.csv'),
      fetchCsv('pokemon_dex_numbers.csv'),
      fetchCsv('pokemon_game_indices.csv')
    ])

  const versionGroupOf = new Map()
  for (const v of parseCsv(versionsCsv)) {
    versionGroupOf.set(Number(v.id), toInt(v.version_group_id))
  }

  const mainSeriesDex = new Set(
    parseCsv(pokedexesCsv)
      .filter((d) => d.is_main_series === '1' && Number(d.id) !== NATIONAL_DEX_ID)
      .map((d) => Number(d.id))
  )

  const groupPokedexes = new Map()
  for (const d of parseCsv(dexGroupCsv)) {
    const gid = toInt(d.version_group_id)
    const pid = toInt(d.pokedex_id)
    if (gid == null || pid == null || !mainSeriesDex.has(pid)) continue
    if (!groupPokedexes.has(gid)) groupPokedexes.set(gid, [])
    groupPokedexes.get(gid).push(pid)
  }

  const dexSpecies = new Map()
  for (const d of parseCsv(dexNumbersCsv)) {
    const pid = toInt(d.pokedex_id)
    const sid = toInt(d.species_id)
    const num = toInt(d.pokedex_number)
    if (pid == null || sid == null || num == null) continue
    if (!dexSpecies.has(pid)) dexSpecies.set(pid, [])
    dexSpecies.get(pid).push({ sid, num })
  }

  const regionalOrderByGroup = new Map()
  for (const [gid, pids] of groupPokedexes) {
    const dexes = pids
      .map((pid) => ({
        pid,
        species: (dexSpecies.get(pid) ?? []).slice().sort((a, b) => a.num - b.num)
      }))
      .filter((d) => d.species.length > 0)
    const pruned = pruneSubsets(dexes)
    const seen = new Set()
    const ordered = []
    for (const dex of pruned.sort((a, b) => a.pid - b.pid)) {
      for (const { sid } of dex.species) {
        if (!seen.has(sid)) {
          seen.add(sid)
          ordered.push(sid)
        }
      }
    }
    regionalOrderByGroup.set(gid, ordered)
  }

  const gameMembers = new Map()
  for (const r of parseCsv(gameIndicesCsv)) {
    const vid = toInt(r.version_id)
    const pid = toInt(r.pokemon_id)
    if (vid == null || pid == null) continue
    if (!gameMembers.has(vid)) gameMembers.set(vid, new Set())
    gameMembers.get(vid).add(pid)
  }

  const index = new Map()
  for (const game of GAMES) {
    const vid = game.id
    const members = gameMembers.get(vid) ?? new Set()
    const gid = versionGroupOf.get(vid)
    const regional = (gid != null ? regionalOrderByGroup.get(gid) : []) ?? []
    const regionalSet = new Set(regional)

    const roster = [
      ...regional.filter((sid) => members.has(sid)),
      ...[...members].filter((sid) => !regionalSet.has(sid)).sort((a, b) => a - b)
    ]

    index.set(vid, { roster, members, regional: regionalSet })
  }

  const compact = {}
  for (const [vid, { roster, regional }] of index) {
    compact[vid] = { roster, regional: [...regional] }
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(compact))
  } catch {
    // storage may be full/unavailable; ignore
  }

  cache = index
  return cache
}
