const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const pending = new Map()
const MAX_AGE = 24 * 60 * 60 * 1000

export function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/)
  const keys = header.split(',')
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, i) => [keys[i], value])))
}

export function fetchCsv(name) {
  if (pending.has(name)) return pending.get(name)
  const request = (async () => {
    const key = `pkmn_csv_v1_${name}`
    try {
      const cached = JSON.parse(localStorage.getItem(key))
      if (cached && Date.now() - cached.at < MAX_AGE && typeof cached.text === 'string') return parseCsv(cached.text)
    } catch { /* Storage is optional. */ }
    const res = await fetch(`${BASE}/${name}`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`Could not load Pokémon data (${res.status}). Please try again.`)
    const text = await res.text()
    if (!text.includes('\n') || text.startsWith('<')) throw new Error('Invalid Pokémon data. Please try again.')
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), text })) } catch { /* Storage is optional. */ }
    return parseCsv(text)
  })()
  pending.set(name, request)
  request.catch(() => pending.delete(name))
  return request
}
