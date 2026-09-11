import { useEffect, useRef } from 'react'

export default function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    const overflow = document.body.style.overflow
    dialog.showModal()
    dialog.querySelector('[data-autofocus]')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className={`planner-dialog ${wide ? 'planner-dialog-wide' : ''}`} aria-label={title}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose() } }}>
      <div className="dialog-layout">
        <header className="dialog-header">
          <h2 className="font-pixel text-sm text-secondary">{title}</h2>
          <button className="action-button close-button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>×</button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
