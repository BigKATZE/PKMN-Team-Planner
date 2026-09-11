import { GAMES } from './gameIndex.js'
import { TYPES } from '../data/types.js'
import { safeSpriteUrl, isPlainObject } from './validate.js'

export const DRAFT_KEY = 'pkmn_team_draft_v1'
export const LIBRARY_KEY = 'pkmn_saved_teams_v1'
const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const validGame = (game) => game === null || GAMES.some((g) => g.id === game)
const validTypes = (types) => Array.isArray(types) && types.length > 0 && types.length <= 2 && types.every((t) => TYPES.includes(t))

export function validateTeam(value) {
  if (!isPlainObject(value) || value.version !== 1 || !validGame(value.game) || !Array.isArray(value.team) || value.team.length !== 6) return null
  const team = []
  for (const p of value.team) {
    if (p === null) { team.push(null); continue }
    if (!isPlainObject(p) || !Number.isInteger(p.id) || p.id < 1 || p.id > 100000 ||
      typeof p.name !== 'string' || p.name.length > 100 || !validTypes(p.types) ||
      !isPlainObject(p.stats) || !stats.every((s) => Number.isFinite(p.stats[s]) && p.stats[s] >= 0 && p.stats[s] <= 255) ||
      !Number.isInteger(p.speciesId) || !Number.isInteger(p.generation) || typeof p.isDefault !== 'boolean' ||
      !isPlainObject(p.pastTypes) || !Object.entries(p.pastTypes).every(([g, types]) => /^[1-9]$/.test(g) && validTypes(types))) return null
    team.push({ id: p.id, name: p.name, types: p.types, stats: Object.fromEntries(stats.map((s) => [s, p.stats[s]])),
      speciesId: p.speciesId, generation: p.generation, isDefault: p.isDefault, pastTypes: p.pastTypes, sprite: safeSpriteUrl(p.sprite) })
  }
  return { version: 1, game: value.game, team }
}

export function readDraft(storage = globalThis.localStorage) {
  try { return validateTeam(JSON.parse(storage.getItem(DRAFT_KEY))) } catch { return null }
}

export function readLibrary(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(LIBRARY_KEY))
    if (!Array.isArray(value)) return []
    return value.filter((v) => v && typeof v.id === 'string' && typeof v.name === 'string' && v.name.length <= 60 && validateTeam(v))
      .map((v) => ({ ...validateTeam(v), id: v.id, name: v.name }))
  } catch { return [] }
}

export function parseSharedTeam(hash) {
  if (!hash.startsWith('#team=')) return null
  const params = new URLSearchParams(hash.slice(1))
  const raw = params.get('team')?.split(',')
  const gameText = params.get('game')
  const game = gameText === '' || gameText == null ? null : Number(gameText)
  if (params.get('v') !== '1' || raw?.length !== 6 || !validGame(game) || !raw.every((id) => /^(0|[1-9]\d{0,5})$/.test(id) && Number(id) <= 100000)) throw new Error('This team link is invalid. Your saved team has been kept.')
  return { ids: raw.map(Number), game }
}

export function shareUrl(team, game, href = globalThis.location.href) {
  const url = new URL(href)
  url.hash = new URLSearchParams({ team: team.map((p) => p?.id ?? 0).join(','), game: game ?? '', v: '1' }).toString()
  return url.href
}
