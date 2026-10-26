import { foodStates, hasStates } from '../lib/foods'

// Elige cómo se pesa/come el alimento: crudo, cocido, frito, hervido…
export default function StatePicker({ food, value, onChange, size = 'md' }) {
  if (!hasStates(food)) return null
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-dashed border-white/[0.16] p-0.5">
      {foodStates(food).map((s) => (
        <button
          key={s.id} type="button" onClick={() => onChange(s.id)}
          className={`rounded-lg transition-colors ${pad} ${value === s.id ? 'bg-white/[0.1] text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
