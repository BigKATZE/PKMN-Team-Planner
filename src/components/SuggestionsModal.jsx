import { useState } from 'react'
import { getTeamSuggestions, getPokemon } from '../lib/api'
import { useAsync, useAsyncAction } from '../hooks/useAsync'
import { DEFAULT_OPTS } from './RandomizerModal'
import TeamOptions from './TeamOptions'
import TypeBadge from './TypeBadge'
import Dialog from './Dialog'

export default function SuggestionsModal({ onClose, team, onPick, game, onGameChange }) {
  const [opts, setOpts] = useState(DEFAULT_OPTS)
  const options = { ...opts, game, regionalOnly: game != null && opts.regionalOnly }
  const { data, loading, error, retry } = useAsync(() => getTeamSuggestions({ ...options, team, count: opts.size }), [options, team], true, 150)
  const picking = useAsyncAction(onPick)
  const filled = team.filter(Boolean).length
  const change = ({ game: nextGame, ...rest }) => { setOpts(rest); if (nextGame !== game) onGameChange(nextGame) }
  return <Dialog title="TEAM SUGGESTIONS" onClose={onClose}>
    <div className="dialog-scroll space-y-5">
      <p className="muted">Suggestions balance shared weaknesses and new offensive coverage. Based on types, without abilities, items or movesets.</p>
      <details className="advanced-filters"><summary>Suggestion options</summary><div className="space-y-4 py-4"><TeamOptions value={options} onChange={change} countLabel="SUGGESTIONS TO SHOW" /></div></details>
      <p role="status">{filled}/6 slots filled{filled === 6 ? ' — remove a Pokémon to add a suggestion.' : ''}</p>
      {filled === 0 && <p className="notice">Add a Pokémon first so suggestions can complement your team.</p>}
      {(error || picking.error) && <p className="error-message" role="alert">{error || picking.error}</p>}
      {loading && filled > 0 && <p role="status">Finding complementary Pokémon…</p>}
      {!loading && filled > 0 && !error && data?.length === 0 && <p className="empty-message">No matches. Broaden your suggestion options.</p>}
      <ol className="suggestion-list">{data?.map((p) => <li key={p.id}>
        <div className="suggestion-heading"><img src={p.sprite} alt="" className="pixelated" loading="lazy" referrerPolicy="no-referrer" /><span className="pokemon-name">{p.name.replaceAll('-', ' ')}</span><span className="type-list">{p.candidateTypes.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</span></div>
        <ul className="suggestion-reasons">{p.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <button className="action-button primary" aria-label={`Add ${p.name}`} disabled={filled === 6 || picking.loading} onClick={() => picking.run(() => getPokemon(p.id))}>Add to team</button>
      </li>)}</ol>
      {picking.loading && <p role="status">Adding Pokémon…</p>}
    </div>
    <footer className="dialog-footer"><button className="action-button" disabled={loading || !filled} onClick={retry}>Refresh suggestions</button></footer>
  </Dialog>
}
