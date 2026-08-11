import { useMemo, useState } from 'react'
import TeamSlot from './components/TeamSlot'
import SearchModal from './components/SearchModal'
import RandomizerModal from './components/RandomizerModal'
import SuggestionsModal from './components/SuggestionsModal'
import TypeCoverage from './components/TypeCoverage'
import TeamStats from './components/TeamStats'
import StatsPanel from './components/StatsPanel'
import { GAMES } from './lib/gameIndex'
import { typesForGeneration, effectiveTypes } from './data/types'

const EMPTY_TEAM = Array(6).fill(null)

export default function App() {
  const [team, setTeam] = useState(EMPTY_TEAM)
  const [modalOpen, setModalOpen] = useState(false)
  const [randomOpen, setRandomOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [targetSlot, setTargetSlot] = useState(0)
  const [inspectIndex, setInspectIndex] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)

  const gamesByGen = useMemo(
    () =>
      GAMES.reduce((acc, g) => {
        ;(acc[g.generation] ??= []).push(g)
        return acc
      }, {}),
    []
  )

  const generation = selectedGame != null ? GAMES.find((g) => g.id === selectedGame)?.generation ?? null : null
  const availableTypes = useMemo(() => typesForGeneration(generation), [generation])

  const effectiveTeam = useMemo(
    () => team.map((p) => (p ? { ...p, types: effectiveTypes(p.types, availableTypes) } : null)),
    [team, availableTypes]
  )

  const filledCount = useMemo(() => team.filter(Boolean).length, [team])

  function openAdd(index) {
    setTargetSlot(index)
    setModalOpen(true)
  }

  function handleSelect(pokemon) {
    setTeam((prev) => {
      const next = prev.slice()
      next[targetSlot] = pokemon
      return next
    })
    setModalOpen(false)
  }

  function handleRemove(index) {
    setTeam((prev) => {
      const next = prev.slice()
      next[index] = null
      return next
    })
    if (inspectIndex === index) setInspectIndex(null)
  }

  function handleInspect(index) {
    setInspectIndex((prev) => (prev === index ? null : index))
  }

  function clearTeam() {
    setTeam(EMPTY_TEAM)
    setInspectIndex(null)
  }

  function handleRandomApply(pokemon) {
    const next = EMPTY_TEAM.slice()
    pokemon.forEach((p, i) => {
      if (i < 6) next[i] = p
    })
    setTeam(next)
    setInspectIndex(null)
    setRandomOpen(false)
  }

  function handleSuggestionPick(pokemon) {
    setTeam((prev) => {
      const next = prev.slice()
      const idx = next.findIndex((p) => p === null)
      if (idx !== -1) next[idx] = pokemon
      return next
    })
  }

  const inspected = inspectIndex === null ? null : effectiveTeam[inspectIndex]

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="pac-border flex flex-wrap items-center justify-between gap-4 bg-panel p-4">
          <div>
            <h1 className="font-pixel text-base leading-relaxed sm:text-lg">
              <span className="text-primary">PKMN</span>{' '}
              <span className="text-secondary">TEAM</span>{' '}
              <span className="text-white">PLANNER</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="font-pixel text-[8px] text-white/50">GAME:</span>
              <select
                value={selectedGame ?? ''}
                onChange={(e) => setSelectedGame(e.target.value === '' ? null : Number(e.target.value))}
                aria-label="Select game"
                className="h-11 border-2 border-dotted border-line bg-panel px-2 font-term text-sm text-white/85 focus:border-secondary focus:outline-none"
              >
                <option value="" className="bg-surface">
                  ANY GAME
                </option>
                {Object.keys(gamesByGen).map((gen) => (
                  <optgroup key={gen} label={`GEN ${gen}`} className="bg-surface">
                    {gamesByGen[gen].map((g) => (
                      <option key={g.id} value={g.id} className="bg-surface">
                        {g.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <span className="font-term text-base text-primary">
              {filledCount}/6
            </span>
            <button
              onClick={() => setSuggestOpen(true)}
              className="h-11 border-2 border-dotted border-primary px-3 font-pixel text-[8px] text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              SUGGEST
            </button>
            <button
              onClick={() => setRandomOpen(true)}
              className="h-11 border-2 border-dotted border-secondary px-3 font-pixel text-[8px] text-secondary transition-colors hover:bg-secondary hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              RANDOM
            </button>
            <button
              onClick={clearTeam}
              disabled={filledCount === 0}
              className="h-11 border-2 border-dotted border-danger px-3 font-pixel text-[8px] text-danger transition-colors hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-30 disabled:hover:bg-transparent"
            >
              CLEAR
            </button>
          </div>
        </header>

        <main className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="min-w-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {effectiveTeam.map((p, i) => (
                <TeamSlot
                  key={i}
                  index={i}
                  pokemon={p}
                  onAdd={openAdd}
                  onInspect={handleInspect}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <div className="mt-4">
              <StatsPanel
                pokemon={inspected}
                onClose={() => setInspectIndex(null)}
                availableTypes={availableTypes}
              />
              {!inspected && (
                <div className="pac-border-soft bg-panel/60 p-4 text-center">
                  <p className="font-pixel text-[9px] text-white/45">
                    CLICK A FILLED SLOT TO VIEW BASE STATS
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="min-w-0">
            <TypeCoverage team={effectiveTeam} availableTypes={availableTypes} />
            <TeamStats team={effectiveTeam} availableTypes={availableTypes} />
          </aside>
        </main>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 pb-4">
          <span className="font-term text-xs text-white/40">DATA: POKEAPI.CO</span>
        </footer>
      </div>

      <SearchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelect}
        game={selectedGame}
        onGameChange={setSelectedGame}
        availableTypes={availableTypes}
      />
      <RandomizerModal
        open={randomOpen}
        onClose={() => setRandomOpen(false)}
        onApply={handleRandomApply}
        game={selectedGame}
        onGameChange={setSelectedGame}
        availableTypes={availableTypes}
      />
      <SuggestionsModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        team={effectiveTeam}
        onPick={handleSuggestionPick}
        game={selectedGame}
        onGameChange={setSelectedGame}
        availableTypes={availableTypes}
      />
    </div>
  )
}
