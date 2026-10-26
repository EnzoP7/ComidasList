import MealBuilder, { MODES } from './MealBuilder'
import { PageHeader } from './ui'

// Sección "Crear": mismo constructor para tapers (lotes), desayunos y comidas libres
export default function Create({ mode, setMode, drafts, setDrafts, favorites, ...props }) {
  return (
    <div className="space-y-4">
      <PageHeader title="Crear">Armá un taper para la semana, tu desayuno o tu merienda de siempre, o lo que comés hoy fuera del plan.</PageHeader>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 rounded-2xl border border-dashed border-white/[0.16] p-1">
        {Object.values(MODES).map((m) => (
          <button
            key={m.id} onClick={() => setMode(m.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm transition-colors ${
              mode === m.id ? 'bg-white/[0.1] text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <span className="truncate">{m.tab}</span>
          </button>
        ))}
      </div>

      <MealBuilder
        key={mode}
        mode={mode}
        draft={drafts[mode]}
        setDraft={setDrafts[mode]}
        favorites={favorites.filter((f) => f.kind === mode)}
        {...props}
      />
    </div>
  )
}
