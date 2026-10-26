import { useState } from 'react'
import { Card, ChalkNumber, Input, ProgressBar, SectionTitle, fmt, num } from './ui'

const HOURS = [5, 6, 6.5, 7, 7.5, 8, 9]
const SCALES = [
  { key: 'hunger', label: 'Hambre', low: 'nada', high: 'muchísima', words: ['Nada de hambre', 'Poca', 'Normal', 'Bastante', 'Muchísima'] },
  { key: 'energy', label: 'Energía', low: 'fundido', high: 'a full', words: ['Fundido', 'Cansado', 'Normal', 'Bien', 'A full'] },
]

/**
 * Sueño, hambre y energía del día. Son tres toques: en Progreso se cruzan
 * para ver si las noches cortas traen más hambre o frenan el peso.
 */
export default function FeelCard({ day, settings, onChange, date }) {
  const sleep = day.sleep ?? null
  const goal = settings.sleepGoal ?? 7.5
  const set = (patch) => onChange(patch)

  return (
    <Card variant="ruled">
      <SectionTitle action={<span className="text-xs text-zinc-500">meta {fmt(goal, 1)} h</span>}>Cómo te sentís</SectionTitle>

      {/* Sueño */}
      <p className="flex items-baseline gap-2">
        {sleep
          ? <ChalkNumber value={fmt(sleep, 1)} className="text-5xl font-bold leading-none text-lilac-300" />
          : <span className="text-4xl font-bold leading-none text-zinc-600">—</span>}
        <span className="font-hand text-[26px] text-zinc-400">h dormidas</span>
      </p>
      <div className="mt-3"><ProgressBar value={sleep ?? 0} max={goal} tone="lilac" size="sm" /></div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {sleep == null ? 'Anotá cuánto dormiste anoche.'
          : sleep >= goal ? 'Noche completa: el hambre y el músculo te lo agradecen.'
          : sleep < 7 ? 'Con menos de 7 h suele subir el hambre: tené el taper a mano y no piques.'
          : `Te faltaron ${fmt((goal - sleep) * 60)} min para la meta.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Horas de sueño">
        {HOURS.map((h) => (
          <button
            key={h} onClick={() => set({ sleep: sleep === h ? null : h })} aria-pressed={sleep === h}
            className={`tabular h-10 min-w-11 rounded-lg border px-2.5 text-sm transition-colors ${
              sleep === h ? 'border-lilac-400/70 bg-lilac-400/15 text-zinc-50' : 'border-dashed border-white/[0.18] text-zinc-300 hover:text-zinc-50'
            }`}
          >
            {fmt(h, 1)}
          </button>
        ))}
        <HoursField key={`${date}-${sleep}`} value={sleep} onCommit={(v) => set({ sleep: v })} />
      </div>

      {/* Hambre y energía */}
      {SCALES.map((s) => {
        const v = day[s.key] ?? null
        return (
          <div key={s.key} className="mt-4 border-t border-dashed border-white/[0.12] pt-3">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-hand text-[21px] leading-none text-zinc-300">{s.label}</span>
              <span className="text-sm text-zinc-100">{v ? s.words[v - 1] : <span className="text-zinc-500">sin marcar</span>}</span>
            </p>
            <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label={`${s.label} de 1 a 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n} onClick={() => set({ [s.key]: v === n ? null : n })} aria-pressed={v === n} aria-label={`${s.label}: ${s.words[n - 1]}`}
                  className={`tabular h-10 rounded-lg border text-sm transition-colors ${
                    v === n ? 'border-lilac-400/70 bg-lilac-400/15 font-bold text-zinc-50'
                      : v != null && n < v ? 'border-white/[0.1] bg-white/[0.05] text-zinc-300'
                      : 'border-dashed border-white/[0.18] text-zinc-400 hover:text-zinc-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 flex justify-between text-[11px] text-zinc-500"><span>{s.low}</span><span>{s.high}</span></p>
          </div>
        )
      })}
    </Card>
  )
}

function HoursField({ value, onCommit }) {
  const [draft, setDraft] = useState(value != null && !HOURS.includes(value) ? value : '')
  const commit = () => {
    const v = num(draft)
    if (v == null) return
    const h = Math.min(16, Math.max(0, Math.round(v * 4) / 4))
    if (h !== value) onCommit(h || null)
  }
  return (
    <Input
      className="w-24" type="number" inputMode="decimal" step="0.25" placeholder="otra" suffix="h" value={draft}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label="Otras horas de sueño"
    />
  )
}
