import test from 'node:test'
import assert from 'node:assert/strict'
import { defenseCoverage, chartForGeneration, defensiveMultiplier, offensiveMultiplier } from '../../src/data/typeChart.js'
import { pokemonTypes } from '../../src/data/types.js'
import { searchPokemon, getPokemon, getRandomTeam, rankSuggestions } from '../../src/lib/api.js'
import { getGameIndex, gameAvailability } from '../../src/lib/gameIndex.js'
import { validateTeam, parseSharedTeam, shareUrl, readDraft, readLibrary } from '../../src/lib/teamStorage.js'
import { csv, pokemonResponse } from '../fixtures.js'

globalThis.fetch = async (url) => {
  const name = url.split('/').at(-1)
  if (name.endsWith('.csv')) return new Response(csv[name], { status: csv[name] ? 200 : 404 })
  const data = pokemonResponse(name)
  return new Response(JSON.stringify(data), { status: data ? 200 : 404 })
}

test('one immunity does not hide other members’ weaknesses', () => {
  const r = defenseCoverage([['electric'], ['fire'], ['flying']]).ground
  assert.equal(r.weak, 2); assert.equal(r.immune, 1); assert.equal(r.resist, 0)
  assert.deepEqual(r.multipliers, [2, 2, 0])
})
test('dual defenders multiply; offensive STAB types are alternatives', () => {
  assert.equal(defensiveMultiplier('rock', ['fire', 'flying']), 4)
  assert.equal(offensiveMultiplier(['fire', 'flying'], ['grass']), 2)
  assert.equal(offensiveMultiplier(['normal'], ['ghost']), 0)
})
test('historical matchups apply only to their generation', () => {
  assert.equal(chartForGeneration(1).ghost.psychic, 0)
  assert.equal(chartForGeneration(1).bug.poison, 2)
  assert.equal(chartForGeneration(5).dark.steel, 0.5)
  assert.equal(chartForGeneration(6).dark.steel, 1)
  assert.equal(chartForGeneration().ghost.psychic, 2)
})
test('historical species and form typings restore without losing current types', async () => {
  const clefairy = await getPokemon(35)
  const magnet = await getPokemon(81)
  const rotom = await getPokemon(10008)
  assert.deepEqual(pokemonTypes(clefairy, 1), ['normal'])
  assert.deepEqual(pokemonTypes(clefairy, 6), ['fairy'])
  assert.deepEqual(pokemonTypes(magnet, 1), ['electric'])
  assert.deepEqual(pokemonTypes(magnet, 2), ['electric', 'steel'])
  assert.deepEqual(pokemonTypes(rotom, 4), ['electric', 'ghost'])
  assert.deepEqual(pokemonTypes(rotom, 5), ['electric', 'fire'])
})
test('alphabetical sorting combines with game, BST and rarity filters', async () => {
  const result = await searchPokemon({ game: 1, sort: 'name', minBst: 300 })
  const names = result.items.map((p) => p.name)
  assert.equal(names.length, 8)
  assert.deepEqual(names, [...names].sort())
  assert.deepEqual((await searchPokemon({ rarity: 'legendary', sort: 'name' })).items, [])
})
test('type search uses historical types, including converted fairy species', async () => {
  assert.deepEqual((await searchPokemon({ game: 1, type: 'normal' })).items.map((p) => p.id), [35])
  assert.equal((await searchPokemon({ game: 1, type: 'fairy' })).total, 0)
  assert.equal((await searchPokemon({ game: 1, type: 'steel' })).total, 0)
})
test('regional dex union deduplicates IDs and remains a subset of the roster', async () => {
  assert.deepEqual((await searchPokemon({ game: 23, regionalOnly: true })).items.map((p) => p.id), [25, 35])
  assert.ok((await searchPokemon({ game: 40 })).total > 0)
  const entry = (await getGameIndex()).get(1)
  assert.equal(gameAvailability(await getPokemon(196), entry, 1).status, 'unavailable')
  assert.equal(gameAvailability(await getPokemon(10008), entry, 4).status, 'unknown')
})
test('random teams honor constraints and keep canonical typings', async () => {
  const team = await getRandomTeam({ size: 6, game: 1, noSharedTypes: true, baseOnly: true })
  const types = team.flatMap((p) => pokemonTypes(p, 1))
  assert.equal(new Set(types).size, types.length)
  assert.equal(new Set(team.map((p) => p.id)).size, team.length)
  assert.ok(team.length <= 6 && team.length > 0)
  const fairy = await getRandomTeam({ size: 1, game: 1, query: 'clefairy' })
  assert.deepEqual(fairy[0].types, ['fairy'])
})
test('suggestion reasons count exposed members even with an immune teammate', () => {
  const team = [{ id: 1, types: ['electric'] }, { id: 2, types: ['fire'] }, { id: 3, types: ['flying'] }]
  const candidates = [{ id: 4, types: ['flying'], pastTypes: {} }, { id: 5, types: ['ground'], pastTypes: {} }]
  const results = rankSuggestions(candidates, team)
  assert.ok(results.find((p) => p.id === 4).reasons.some((r) => r.includes('ground: 2 team members')))
})
test('sharing round-trips holes, forms and the selected game', () => {
  const team = [{ id: 25 }, null, { id: 10008 }, null, null, null]
  const url = shareUrl(team, 23, 'https://example.com/planner')
  assert.deepEqual(parseSharedTeam(new URL(url).hash), { ids: [25, 0, 10008, 0, 0, 0], game: 23 })
  assert.throws(() => parseSharedTeam('#team=1,2&v=1'))
  assert.throws(() => parseSharedTeam('#team=1,0,0,0,0,0&game=999&v=1'))
})
test('draft validation rejects corrupted stats and unsafe image URLs', async () => {
  const p = await getPokemon(25)
  const draft = { version: 1, game: 1, team: [p, null, null, null, null, null] }
  assert.ok(validateTeam(draft))
  assert.equal(validateTeam({ ...draft, team: [{ ...p, stats: {} }, null, null, null, null, null] }), null)
  assert.equal(validateTeam({ ...draft, team: [{ ...p, sprite: 'javascript:alert(1)' }, null, null, null, null, null] }).team[0].sprite, null)
  const blocked = { getItem() { throw new Error('blocked') } }
  assert.equal(readDraft(blocked), null)
  assert.deepEqual(readLibrary(blocked), [])
})
