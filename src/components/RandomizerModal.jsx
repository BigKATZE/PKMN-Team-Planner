import { useState } from 'react'
import { getRandomTeam } from '../lib/api'
import { generationForGame } from '../lib/gameIndex'
import { pokemonTypes } from '../data/types'
import { useAsync } from '../hooks/useAsync'
import TeamOptions from './TeamOptions'
import TypeBadge from './TypeBadge'
import Dialog from './Dialog'

export const DEFAULT_OPTS = { size: 6, generations: [], uniqueTypes: false, noSharedTypes: false, baseOnly: true, stage: null, noLegendaryMythical: false, regionalOnly: false }

export default function RandomizerModal({ onClose, onApply, game, onGameChange }) {
  const [opts, setOpts] = useState(DEFAULT_OPTS)
  const options = { ...opts, game, regionalOnly: game != null && opts.regionalOnly }
  const { data: team, loading, error, retry } = useAsync(() => getRandomTeam(options), [options], true, 150)
  const change = ({ game: nextGame, ...rest }) => { setOpts(rest); if (nextGame !== game) onGameChange(nextGame) }
  return <Dialog title="RANDOM TEAM" onClose={onClose}>
    <div className="dialog-scroll space-y-5">
      <TeamOptions value={options} onChange={change} />
      <h3 className="font-pixel text-xs text-secondary">PREVIEW</h3>
      {loading && <p role="status">Building your team…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && team?.length < opts.size && <p className="notice">Found {team.length} of {opts.size} requested Pokémon. Broaden your filters or reroll to try another combination.</p>}
      <ol className="preview-list">{team?.map((p) => <li key={p.id}>
        <img className="pixelated" src={p.sprite} alt="" referrerPolicy="no-referrer" />
        <span className="pokemon-name">{p.name.replaceAll('-', ' ')}</span>
        <span className="type-list">{pokemonTypes(p, generationForGame(game)).map((t) => <TypeBadge key={t} type={t} size="sm" />)}</span>
      </li>)}</ol>
    </div>
    <footer className="dialog-footer"><button className="action-button" disabled={loading} onClick={retry}>Reroll</button><button className="action-button primary" disabled={loading || !team?.length} onClick={() => onApply(team)}>Apply team</button></footer>
  </Dialog>
}
