import TypeBadge from './TypeBadge'

export default function TeamSlot({ index, pokemon, selected, availability, onAdd, onInspect, onRemove }) {
  if (!pokemon) return <button onClick={() => onAdd(index)} className="team-slot empty-slot" aria-label={`Add Pokémon to slot ${index + 1}`}>
    <span className="slot-index">SLOT {index + 1}</span><span className="slot-plus" aria-hidden="true">+</span><span>Add Pokémon</span>
  </button>
  return <div className={`team-slot filled-slot ${selected ? 'selected-slot' : ''}`} role="group" aria-label={`${pokemon.name} in slot ${index + 1}`}>
    <div className="slot-top"><span className="dex-number">#{String(pokemon.id).padStart(3, '0')}</span><button className="slot-remove" onClick={() => onRemove(index)} aria-label={`Remove ${pokemon.name}`}>×</button></div>
    <button className="slot-inspect" onClick={() => onInspect(index)} aria-pressed={selected} aria-label={`Inspect ${pokemon.name}`}>
      {pokemon.sprite ? <img className="pixelated" src={pokemon.sprite} alt="" referrerPolicy="no-referrer" /> : <span className="sprite-placeholder">?</span>}
      <span className="pokemon-name">{pokemon.name.replaceAll('-', ' ')}</span>
      <span className="type-list">{pokemon.types.map((type) => <TypeBadge key={type} type={type} size="sm" />)}</span>
      {selected && <span className="selected-label">Viewing stats</span>}
    </button>
    {availability && availability.status !== 'available' && <p className={`availability ${availability.status}`} role="status">{availability.label}</p>}
    <button className="slot-replace" onClick={() => onAdd(index)} aria-label={`Replace ${pokemon.name}`}>Replace</button>
  </div>
}
