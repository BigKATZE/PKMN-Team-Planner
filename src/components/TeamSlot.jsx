import TypeBadge from './TypeBadge'

export default function TeamSlot({ index, pokemon, onAdd, onInspect, onRemove }) {
  const isFilled = Boolean(pokemon)

  if (!isFilled) {
    return (
      <button
        onClick={() => onAdd(index)}
        className="pac-border flex min-h-36 w-full flex-col items-center justify-center gap-3 bg-panel p-4 text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        aria-label={`Add Pokémon to slot ${index + 1}`}
      >
        <span className="pac-pulse select-none font-pixel text-2xl leading-none">[+]</span>
        <span className="font-pixel text-[9px] tracking-wider">ADD PKMN</span>
        <span className="font-term text-[10px] tracking-widest text-secondary/70">SLOT {String(index + 1).padStart(2, '0')}</span>
      </button>
    )
  }

  return (
    <div
      className="pac-border relative flex min-h-36 flex-col bg-panel p-3"
      role="group"
      aria-label={`${pokemon.name} in slot ${index + 1}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-term text-[10px] text-secondary">#{String(pokemon.id).padStart(3, '0')}</span>
        <button
          onClick={() => onRemove(index)}
          className="h-11 w-8 border border-danger/70 font-pixel text-[9px] text-danger transition-colors hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          aria-label={`Remove ${pokemon.name}`}
        >
          X
        </button>
      </div>

      <button
        onClick={() => onInspect(index)}
        className="flex flex-1 flex-col items-center justify-center py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        aria-label={`Inspect ${pokemon.name}`}
      >
        {pokemon.sprite ? (
          <img
            src={pokemon.sprite}
            alt={pokemon.name}
            className="pixelated h-20 w-20 object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-pixel text-2xl text-primary">?</span>
        )}
        <span className="mt-2 truncate font-pixel text-[9px] uppercase">{pokemon.name}</span>
      </button>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
    </div>
  )
}
