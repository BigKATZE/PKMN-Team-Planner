import { useState } from 'react'
import { LIBRARY_KEY, readLibrary, shareUrl } from '../lib/teamStorage'

export default function TeamLibrary({ team, game, onLoad, onNotice }) {
  const [saved, setSaved] = useState(() => readLibrary())
  const [name, setName] = useState('')
  const [selected, setSelected] = useState('')
  const [link, setLink] = useState('')
  const filled = team.some(Boolean)
  function persist(next) {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); setSaved(next); return true }
    catch { onNotice('Could not save this team. Browser storage may be full or blocked. You can still copy a share link.'); return false }
  }
  function save(e) {
    e.preventDefault()
    const title = name.trim()
    if (!title || !filled) return
    const id = crypto.randomUUID()
    if (persist([...saved, { id, name: title, version: 1, game, team }])) {
      setSelected(id); setName(''); onNotice(`Saved “${title}” in this browser.`)
    }
  }
  async function share() {
    const url = shareUrl(team, game)
    setLink(url)
    try { await navigator.clipboard.writeText(url); onNotice('Team link copied. It includes all six slots and your selected game.') }
    catch { onNotice('Select and copy the team link below.') }
  }
  return <section className="team-library" aria-label="Save and share teams">
    <div className="library-actions"><button className="action-button" disabled={!filled} onClick={share}>Copy team link</button>
      <details className="saved-teams"><summary>Saved teams ({saved.length})</summary>
        <div className="library-panel">
          <form onSubmit={save} className="library-row"><label className="field">Save a new team<input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Give this team a name" required /></label><button className="action-button primary" disabled={!filled || !name.trim()}>Save team</button></form>
          {saved.length > 0 ? <div className="library-row"><label className="field">Your teams<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a saved team</option>{saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <button className="action-button" disabled={!selected} onClick={() => { const entry = saved.find((s) => s.id === selected); if (entry) { onLoad(entry); onNotice(`Loaded “${entry.name}”.`) } }}>Load team</button>
            <button className="action-button danger" disabled={!selected} onClick={() => { const entry = saved.find((s) => s.id === selected); if (persist(saved.filter((s) => s.id !== selected))) { setSelected(''); onNotice(`Deleted saved team “${entry?.name}”. The current team is unchanged.`) } }}>Delete saved team</button>
          </div> : <p className="muted">Save a named copy to return to it later. Your current draft is saved automatically.</p>}
        </div>
      </details>
    </div>
    {link && <label className="field share-link">Team link<input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Team sharing link" /><button className="text-link" onClick={() => setLink('')}>Hide link</button></label>}
  </section>
}
