import { TYPE_COLORS } from '../data/types'

export default function TypeBadge({ type, size = 'md' }) {
  const color = TYPE_COLORS[type] || '#888'
  const box = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  return (
    <span
      className={'inline-flex items-center justify-center border ' + box}
      title={type}
      aria-label={type}
      style={{
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderColor: color,
        boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.35)'
      }}
    >
      <img
        src={`/types/${type}.png`}
        alt={type}
        className={`pixelated ${icon} object-contain`}
        loading="lazy"
      />
    </span>
  )
}
