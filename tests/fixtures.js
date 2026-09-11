export const pokemon = [
  { id: 1, name: 'bulbasaur', types: [12, 4], generation: 1, stat: 50 },
  { id: 6, name: 'charizard', types: [10, 3], generation: 1, stat: 90 },
  { id: 25, name: 'pikachu', types: [13], generation: 1, stat: 55 },
  { id: 35, name: 'clefairy', types: [18], generation: 1, stat: 55 },
  { id: 81, name: 'magnemite', types: [13, 9], generation: 1, stat: 60 },
  { id: 94, name: 'gengar', types: [8, 4], generation: 1, stat: 85 },
  { id: 95, name: 'onix', types: [6, 5], generation: 1, stat: 65 },
  { id: 130, name: 'gyarados', types: [11, 3], generation: 1, stat: 90 },
  { id: 196, name: 'espeon', types: [14], generation: 2, stat: 85 },
  { id: 10008, speciesId: 479, name: 'rotom-heat', types: [13, 10], generation: 4, stat: 85 }
]
export const csv = {
  'pokemon.csv': 'id,identifier,species_id,is_default\n' + pokemon.map((p) => `${p.id},${p.name},${p.speciesId ?? p.id},${p.speciesId ? 0 : 1}`).join('\n'),
  'pokemon_types.csv': 'pokemon_id,type_id,slot\n' + pokemon.flatMap((p) => p.types.map((t, i) => `${p.id},${t},${i + 1}`)).join('\n'),
  'pokemon_species.csv': 'id,generation_id,is_legendary,is_mythical,evolves_from_species_id\n' + pokemon.map((p) => `${p.speciesId ?? p.id},${p.generation},0,0,`).join('\n'),
  'pokemon_types_past.csv': 'pokemon_id,generation_id,type_id,slot\n35,5,1,1\n81,1,13,1\n10008,4,13,1\n10008,4,8,2',
  'pokemon_stats.csv': 'pokemon_id,stat_id,base_stat\n' + pokemon.flatMap((p) => [1, 2, 3, 4, 5, 6].map((s) => `${p.id},${s},${p.stat}`)).join('\n'),
  'versions.csv': 'id,version_group_id,identifier\n1,1,red\n23,15,x\n40,25,scarlet\n47,30,legends-za',
  'pokedexes.csv': 'id,is_main_series\n1,1\n2,1\n12,1\n13,1\n31,1\n32,1',
  'pokedex_version_groups.csv': 'pokedex_id,version_group_id\n2,1\n12,15\n13,15\n31,25\n32,30',
  'pokemon_dex_numbers.csv': 'species_id,pokedex_id,pokedex_number\n1,2,1\n6,2,6\n25,2,25\n35,2,35\n81,2,81\n94,2,94\n95,2,95\n130,2,130\n25,12,1\n25,13,1\n35,13,2\n25,31,1\n35,31,2\n25,32,1',
  'pokemon_game_indices.csv': 'pokemon_id,version_id,game_index\n' + [1, 23, 40, 47].flatMap((v) => pokemon.filter((p) => p.id < 10000 && (v !== 1 || p.generation === 1)).map((p) => `${p.id},${v},${p.id}`)).join('\n')
}
export function pokemonResponse(id) {
  const p = pokemon.find((p) => String(p.id) === String(id))
  if (!p) return null
  return { id: p.id, stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name) => ({ stat: { name }, base_stat: p.stat })), sprites: { front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png` } }
}
