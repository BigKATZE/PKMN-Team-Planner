import { useEffect, useMemo, useState } from 'react'
import TeamSlot from './components/TeamSlot'
import SearchModal from './components/SearchModal'
import RandomizerModal from './components/RandomizerModal'
import SuggestionsModal from './components/SuggestionsModal'
import TypeCoverage from './components/TypeCoverage'
import TeamStats from './components/TeamStats'
import StatsPanel from './components/StatsPanel'
import TeamLibrary from './components/TeamLibrary'
import { GAMES, generationForGame, getGameIndex, gameAvailability } from './lib/gameIndex'
import { getPokemon } from './lib/api'
import { typesForGeneration, pokemonTypes } from './data/types'
import { DRAFT_KEY, readDraft, parseSharedTeam } from './lib/teamStorage'
import { useAsync } from './hooks/useAsync'

const emptyTeam = () => Array(6).fill(null)

export default function App() {
  const [initial] = useState(() => readDraft())
  const [team, setTeam] = useState(initial?.team ?? emptyTeam)
  const [selectedGame, setSelectedGame] = useState(initial?.game ?? null)
  const [modal, setModal] = useState(null)
  const [targetSlot, setTargetSlot] = useState(0)
  const [inspectIndex, setInspectIndex] = useState(null)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [sharedLoading, setSharedLoading] = useState(() => location.hash.startsWith('#team='))
  const [sharedError, setSharedError] = useState(false)
  const [shareRevision, setShareRevision] = useState(0)
  const generation = generationForGame(selectedGame)
  const availableTypes = useMemo(() => typesForGeneration(generation), [generation])
  const effectiveTeam = useMemo(() => team.map((p) => p ? { ...p, types: pokemonTypes(p, generation) } : null), [team, generation])
  const gameData = useAsync(getGameIndex, [], selectedGame != null)
  const gameEntry = gameData.data?.get(selectedGame)
  const statuses = team.map((p) => p && selectedGame != null && !gameData.loading ? gameAvailability(p, gameEntry, generation) : null)
  const filledCount = team.filter(Boolean).length
  const inspected = inspectIndex == null ? null : effectiveTeam[inspectIndex]

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, team, game: selectedGame })); setSaveError(false) }
    catch { setSaveError(true) }
  }, [team, selectedGame])

  useEffect(() => {
    let active = true
    async function loadShared() {
      try {
        const shared = parseSharedTeam(location.hash)
        if (!shared) { setSharedLoading(false); return }
        setSharedLoading(true); setSharedError(false)
        const next = await Promise.all(shared.ids.map((id) => id ? getPokemon(id) : null))
        if (!active) return
        setTeam(next); setSelectedGame(shared.game); setInspectIndex(null)
        setNotice('Shared team loaded and saved as your current draft.')
        history.replaceState(null, '', location.pathname + location.search)
      } catch (e) {
        if (active) { setNotice(`Could not open the shared team. ${e.message}`); setSharedError(true) }
      } finally { if (active) setSharedLoading(false) }
    }
    loadShared()
    return () => { active = false }
  }, [shareRevision])
  useEffect(() => {
    const changed = () => setShareRevision((r) => r + 1)
    window.addEventListener('hashchange', changed)
    return () => window.removeEventListener('hashchange', changed)
  }, [])

  function openAdd(index) { setTargetSlot(index); setModal('search') }
  function handleSelect(pokemon) {
    setTeam((prev) => prev.map((p, i) => i === targetSlot ? pokemon : p))
    setInspectIndex(targetSlot); setModal(null); setNotice(`Added ${pokemon.name.replaceAll('-', ' ')}.`)
  }
  function handleRemove(index) {
    setTeam((prev) => prev.map((p, i) => i === index ? null : p))
    if (inspectIndex === index) setInspectIndex(null)
  }
  function applyTeam(next) { setTeam(Array.from({ length: 6 }, (_, i) => next[i] ?? null)); setInspectIndex(null); setModal(null) }
  function pickSuggestion(pokemon) {
    setTeam((prev) => {
      const index = prev.findIndex((p) => p === null)
      if (index === -1 || prev.some((p) => p?.id === pokemon.id)) return prev
      return prev.map((p, i) => i === index ? pokemon : p)
    })
  }

  return <div className="app-shell">
    <a className="skip-link" href="#team-builder">Skip to team</a>
    <header className="app-header">
      <div><h1 className="font-pixel"><span className="text-primary">PKMN</span> TEAM PLANNER</h1><p>Build a party. Find its strengths. Cover its weaknesses.</p></div>
      <label className="field game-field">Plan for a game<select value={selectedGame ?? ''} disabled={sharedLoading} onChange={(e) => setSelectedGame(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Any game · current types</option>
        {[...new Set(GAMES.map((g) => g.generation))].map((gen) => <optgroup key={gen} label={`Generation ${gen}`}>{GAMES.filter((g) => g.generation === gen).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</optgroup>)}
      </select></label>
    </header>
    <div className="status-line" role="status" aria-live="polite">{sharedLoading ? 'Opening shared team…' : notice || (saveError ? 'Automatic saving is unavailable in this browser.' : 'Your current team is saved automatically in this browser.')}</div>
    {saveError && notice && <p className="error-message">Automatic saving is unavailable. Copy a team link to keep your draft.</p>}
    {sharedError && <button className="action-button" onClick={() => setShareRevision((r) => r + 1)}>Retry shared team</button>}
    <fieldset className="builder-fieldset" disabled={sharedLoading}>
      <div className="team-toolbar"><div><h2 id="team-heading" className="font-pixel text-sm">YOUR TEAM <span className="text-secondary">{filledCount}/6</span></h2></div>
        <div className="toolbar-actions"><button className="action-button primary" disabled={!filledCount || filledCount === 6} onClick={() => setModal('suggest')}>Suggest a teammate</button><button className="action-button" onClick={() => setModal('random')}>Random team</button><button className="action-button danger" disabled={!filledCount} onClick={() => { applyTeam([]); setNotice('Current team cleared. Named saved teams are still available.') }}>Clear</button></div>
      </div>
      <TeamLibrary team={team} game={selectedGame} onNotice={setNotice} onLoad={(saved) => { applyTeam(saved.team); setSelectedGame(saved.game) }} />
      {selectedGame != null && <details className="game-note">
        <summary>{GAMES.find((g) => g.id === selectedGame)?.label} · Gen {generation} type rules{gameData.loading ? " · checking roster…" : gameData.error ? " · roster unavailable" : ""}</summary>
        <p>Game rosters can include trading, transfers and events. Regional Pokédex filters narrow the list; neither list describes encounter locations. Unlisted forms are unverified.</p>
        {generation === 1 && <p>Base stats use current data, including separate Special Attack and Special Defense.</p>}
        {gameData.loading && <p role="status">Checking your team against the game roster…</p>}
        {gameData.error && <p className="error-message">Game availability could not be checked. <button className="text-link" onClick={gameData.retry}>Try again</button></p>}
      </details>}
      <main id="team-builder" className="planner-main">
        <section aria-labelledby="team-heading" className="team-area">
          <div className="team-grid">{effectiveTeam.map((p, i) => <TeamSlot key={i} index={i} pokemon={p} selected={inspectIndex === i} availability={statuses[i]} onAdd={openAdd} onInspect={(index) => setInspectIndex((current) => current === index ? null : index)} onRemove={handleRemove} />)}</div>
          {inspected ? <StatsPanel pokemon={inspected} generation={generation} availableTypes={availableTypes} onClose={() => setInspectIndex(null)} /> : <div className="team-hint"><p>{filledCount ? 'Select a team member to inspect stats and type matchups.' : 'Start with a favorite Pokémon, or generate a random team.'}</p></div>}
        </section>
        <aside className="analysis-area"><TypeCoverage team={effectiveTeam} generation={generation} availableTypes={availableTypes} /><TeamStats team={effectiveTeam} generation={generation} availableTypes={availableTypes} /></aside>
      </main>
    </fieldset>
    <footer className="app-footer"><a href="https://pokeapi.co/" target="_blank" rel="noreferrer">Data from PokéAPI</a><span>Type-based planning · current base stats · saved on this device</span></footer>
    {modal === 'search' && <SearchModal onClose={() => setModal(null)} onSelect={handleSelect} game={selectedGame} onGameChange={setSelectedGame} availableTypes={availableTypes} />}
    {modal === 'random' && <RandomizerModal onClose={() => setModal(null)} onApply={applyTeam} game={selectedGame} onGameChange={setSelectedGame} />}
    {modal === 'suggest' && <SuggestionsModal onClose={() => setModal(null)} team={effectiveTeam} onPick={pickSuggestion} game={selectedGame} onGameChange={setSelectedGame} />}
  </div>
}
