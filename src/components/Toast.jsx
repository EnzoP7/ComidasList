import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './ui'

// Aviso breve sobre el listón, con "Deshacer" opcional
const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((text, undo) => {
    clearTimeout(timer.current)
    setToast({ text, undo, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), undo ? 6000 : 3000)
  }, [])

  const doUndo = () => {
    toast?.undo?.()
    clearTimeout(timer.current)
    setToast(null)
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status" aria-live="polite"
        className="sheet fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-ink-950 shadow-[0_14px_30px_-10px_rgb(0_0_0/0.7)] sm:bottom-6"
        data-open={Boolean(toast)}
      >
        <Icon name="check" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm">{toast?.text}</span>
        {toast?.undo && (
          <button onClick={doUndo} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold underline decoration-dashed underline-offset-4">
            Deshacer
          </button>
        )}
      </div>
    </ToastContext.Provider>
  )
}
