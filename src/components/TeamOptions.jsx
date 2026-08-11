import { GENERATIONS } from '../lib/api'
import { GAMES } from '../lib/gameIndex'

function toggleInArray(arr, item) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

const chip = (active) =>
  `h-8 border px-2 font-pixel text-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${
    active
      ? 'border-primary bg-primary text-white'
      : 'border-line text-white/70 hover:border-secondary hover:text-secondary'
  }`

export default function TeamOptions({ value, onChange, countLabel = 'TEAM SIZE' }) {
  const gamesByGen = GAMES.reduce((acc, g) => {
    ;(acc[g.generation] ??= []).push(g)
    return acc
  }, {})

  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <>
      <fieldset>
        <legend className="mb-2 font-pixel text-[9px] text-white/70">{countLabel}</legend>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => set({ size: n })}
              aria-pressed={value.size === n}
              className={`h-11 w-11 border font-term text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-secondary ${
                value.size === n
                  ? 'border-primary bg-primary text-white'
                  : 'border-line text-white/70 hover:border-secondary hover:text-secondary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-pixel text-[9px] text-white/70">
          GENERATIONS <span className="text-white/40">(MULTI-SELECT)</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => set({ generations: [] })} className={chip(value.generations.length === 0)}>
            ALL GENS
          </button>
          {GENERATIONS.map((g) => (
            <button
              key={g.label}
              onClick={() => set({ generations: toggleInArray(value.generations, g) })}
              aria-pressed={value.generations.includes(g)}
              className={chip(value.generations.includes(g))}
            >
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-pixel text-[9px] text-white/70">EVOLUTION STAGE</legend>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: null, label: 'ANY STAGE' },
            { id: 'unevolved', label: 'UNEVOLVED' },
            { id: 'evolved-once', label: 'EVOLVED ONCE' },
            { id: 'fully-evolved', label: 'FULLY EVOLVED' }
          ].map((s) => (
            <button
              key={s.id ?? 'any'}
              onClick={() => set({ stage: s.id })}
              aria-pressed={value.stage === s.id}
              className={chip(value.stage === s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-pixel text-[9px] text-white/70">GAME ROSTER</legend>
        <select
          value={value.game ?? ''}
          onChange={(e) => set({ game: e.target.value === '' ? null : Number(e.target.value) })}
          aria-label="Select game"
          className="h-9 w-full border border-line bg-panel px-2 font-term text-sm text-white/85 focus:border-secondary focus:outline-none"
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
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-pixel text-[9px] text-white/70">OPTIONS</legend>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value.uniqueTypes}
            onChange={(e) => set({ uniqueTypes: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-term text-sm text-white/85">NO DUPLICATE TYPE COMBOS</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value.noSharedTypes}
            onChange={(e) => set({ noSharedTypes: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-term text-sm text-white/85">NO REPEATED TYPES ANYWHERE (EVERY TYPE ONCE)</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value.baseOnly}
            onChange={(e) => set({ baseOnly: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-term text-sm text-white/85">BASE SPECIES ONLY (NO FORMS)</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value.noLegendaryMythical}
            onChange={(e) => set({ noLegendaryMythical: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-term text-sm text-white/85">NO LEGENDARIES OR MYTHICALS</span>
        </label>

        <label className={`flex cursor-pointer items-center gap-3 ${value.game == null ? 'opacity-40' : ''}`}>
          <input
            type="checkbox"
            checked={value.regionalOnly}
            disabled={value.game == null}
            onChange={(e) => set({ regionalOnly: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="font-term text-sm text-white/85">SELECTED GAME'S REGIONAL DEX ONLY</span>
        </label>
      </fieldset>
    </>
  )
}
