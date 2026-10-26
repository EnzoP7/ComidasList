import { useId, useMemo, useState } from 'react'
import { TRAINING_TYPES, trainingKcal, trainingType, uid } from '../lib/model'
import { COMMON_EXERCISES, bestSet, e1rm, exerciseKey, knownExercises, lastSession, recordBefore } from '../lib/strength'
import { formatShort } from '../lib/date'
import { useToast } from './Toast'
import { Button, Card, ChalkNumber, Icon, Input, NumberField, SectionTitle, erase, fmt, num } from './ui'

// Entrenamientos del día + series de fuerza + kcal activas opcionales del reloj
export default function ActivityCard({ day, date, logs, weight, burn, onChange }) {
  const [type, setType] = useState('strength')
  const [minutes, setMinutes] = useState('60')
  const [openId, setOpenId] = useState(null)
  const sessions = day.training ?? []
  const toast = useToast()
  const removeSession = (s) => {
    onChange({ training: sessions.filter((x) => x.id !== s.id) })
    toast(`Quitaste ${trainingType(s.type).label} · ${s.minutes} min`, () => onChange({ training: [...sessions] }))
  }

  const add = (t, m) => {
    if (!m) return
    const id = uid()
    onChange({ training: [...sessions, { id, type: t, minutes: m, ...(t === 'strength' && { sets: [] }) }] })
    if (t === 'strength') setOpenId(id)
  }
  const setSets = (id, sets) => onChange({ training: sessions.map((s) => (s.id === id ? { ...s, sets } : s)) })

  return (
    <Card variant="ruled">
      <SectionTitle action={<span className="text-xs text-zinc-500">{burn.manual != null ? 'según tu reloj' : 'estimación'}</span>}>Actividad</SectionTitle>
      <p className="flex items-baseline gap-2">
        <ChalkNumber value={fmt(burn.active)} className="text-5xl font-bold leading-none text-orange-300" />
        <span className="font-hand text-[26px] text-zinc-400">kcal quemadas</span>
      </p>
      <p className="tabular mt-1.5 text-xs text-zinc-500">pasos {fmt(burn.steps)} kcal · entrenamiento {fmt(burn.training)} kcal</p>

      {sessions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {sessions.map((s) => {
            const t = trainingType(s.type)
            const strength = s.type === 'strength'
            const open = openId === s.id
            return (
              <li key={s.id} className="border-b border-dashed border-white/[0.1] py-1.5 text-sm last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{t.icon}</span>
                  <span className="flex-1">
                    {t.label} · {s.minutes} min
                    {strength && (
                      <button
                        className="ml-2 text-xs text-accent underline decoration-dashed underline-offset-4"
                        onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}
                      >
                        {open ? 'cerrar series' : s.sets?.length ? `${s.sets.length} ${s.sets.length === 1 ? 'serie' : 'series'}` : 'anotar series'}
                      </button>
                    )}
                  </span>
                  <span className="tabular text-xs text-orange-300">{fmt(trainingKcal(s, weight))} kcal</span>
                  <button onClick={(e) => erase(e.currentTarget.closest('li'), () => removeSession(s))} className="grid h-8 w-8 place-items-center text-zinc-500 hover:text-zinc-100" aria-label={`Quitar ${t.label}`}>
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </button>
                </div>
                {strength && open && <StrengthSets sets={s.sets ?? []} logs={logs} date={date} onChange={(sets) => setSets(s.id, sets)} />}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[['strength', 45], ['strength', 60], ['strength', 75], ['cardio', 30]].map(([t, m]) => (
          <Button key={`${t}${m}`} variant="ghost" size="sm" onClick={() => add(t, m)}>
            {trainingType(t).label.split(' ')[0]} {m}′
          </Button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(type, Math.round(num(minutes) ?? 0)) }}>
        <select
          value={type} onChange={(e) => setType(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/[0.18] px-2 text-sm outline-none focus:border-accent/70" aria-label="Tipo de entrenamiento"
        >
          {TRAINING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <Input className="w-24" type="number" inputMode="numeric" suffix="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minutos" />
        <Button type="submit" variant="ghost" size="icon" className="h-10 w-10" aria-label="Añadir entrenamiento"><Icon name="plus" className="h-4 w-4" /></Button>
      </form>

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer select-none hover:text-zinc-300">¿Tenés reloj o app de actividad?</summary>
        <div className="mt-2 flex items-end gap-2">
          <NumberField
            key={`active-${day.activeKcal}`} value={day.activeKcal} placeholder="kcal activas" suffix="kcal"
            onCommit={(v) => onChange({ activeKcal: v == null ? null : Math.round(v) })} className="flex-1"
          />
          {day.activeKcal != null && <Button variant="plain" size="sm" onClick={() => onChange({ activeKcal: null })}>Usar estimación</Button>}
        </div>
        <p className="mt-1.5">Si lo cargás, reemplaza la estimación por pasos y entrenamiento.</p>
      </details>
    </Card>
  )
}

const setText = (s) => (s.kg > 0 ? `${fmt(s.kg, 1)}×${s.reps}` : `${s.reps} reps`)

// Próximo objetivo: con 10+ reps se sube el peso; si no, una repetición más
function nextTarget(best) {
  if (!best) return null
  if (!(best.kg > 0)) return `${best.reps + 1} reps`
  return best.reps >= 10 ? `${fmt(best.kg + 2.5, 1)} kg × ${Math.max(6, best.reps - 3)}` : `${fmt(best.kg, 1)} kg × ${best.reps + 1}`
}

// Series de una sesión de fuerza, agrupadas por ejercicio, con la vez pasada y récords
function StrengthSets({ sets, logs, date, onChange }) {
  const listId = useId()
  const [exercise, setExercise] = useState(sets.at(-1)?.exercise ?? '')
  const [kg, setKg] = useState(sets.at(-1)?.kg ? String(sets.at(-1).kg) : '')
  const [reps, setReps] = useState(sets.at(-1)?.reps ? String(sets.at(-1).reps) : '')
  const suggestions = useMemo(() => {
    const known = knownExercises(logs)
    const seen = new Set(known.map(exerciseKey))
    return [...known, ...COMMON_EXERCISES.filter((e) => !seen.has(exerciseKey(e)))]
  }, [logs])

  const groups = []
  for (const s of sets) {
    const k = exerciseKey(s.exercise)
    let g = groups.find((x) => x.key === k)
    if (!g) groups.push((g = { key: k, name: s.exercise, sets: [] }))
    g.sets.push(s)
  }

  const typed = exercise.trim()
  const previous = typed ? lastSession(logs, typed, date) : null

  const submit = (e) => {
    e.preventDefault()
    const r = Math.round(num(reps) ?? 0)
    if (!typed || r <= 0) return
    onChange([...sets, { id: uid(), exercise: typed, kg: num(kg) ?? 0, reps: r }])
  }

  return (
    <div className="drawer-in mt-2 rounded-xl border border-dashed border-white/[0.16] p-3">
      {groups.length > 0 && (
        <ul className="mb-3 space-y-2.5">
          {groups.map((g) => {
            const best = bestSet(g.sets)
            const record = recordBefore(logs, g.name, date)
            const isPr = record && best.kg > 0 && best.e1rm > record.e1rm
            const prev = lastSession(logs, g.name, date)
            return (
              <li key={g.key}>
                <p className="flex items-center gap-2 text-[15px] text-zinc-100">
                  {g.name}
                  {isPr && <span className="rounded bg-accent/15 px-1.5 py-px text-[11px] font-bold uppercase text-accent">récord</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {g.sets.map((s) => (
                    <button
                      key={s.id} onClick={() => onChange(sets.filter((x) => x.id !== s.id))}
                      className="tabular rounded-lg border border-white/[0.12] px-2 py-0.5 text-xs text-zinc-200 hover:border-rose-300/50 hover:text-rose-200"
                      aria-label={`Borrar serie ${setText(s)}`} title="Tocar para borrar"
                    >
                      {setText(s)}
                    </button>
                  ))}
                </div>
                {prev && (
                  <p className="tabular mt-1 text-[11px] text-zinc-500">
                    la vez pasada ({formatShort(prev.day)}): {prev.sets.map(setText).join(', ')}
                    {best.kg > 0 && prev.best.kg > 0 && (
                      <span className={best.e1rm >= prev.best.e1rm ? 'text-accent' : 'text-amber-300'}>
                        {' '}· {best.e1rm >= prev.best.e1rm ? '▲' : '▼'} {fmt(Math.abs(best.e1rm - prev.best.e1rm), 1)} kg de 1RM estimado
                      </span>
                    )}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)_80px_72px_auto] items-end gap-2">
        <Input label="Ejercicio" list={listId} value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Sentadilla" />
        <Input label="Peso" type="number" inputMode="decimal" step="0.5" suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="0" />
        <Input label="Reps" type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8" />
        <Button type="submit" variant="ghost" size="icon" className="h-10 w-10" aria-label="Añadir serie"><Icon name="plus" className="h-4 w-4" /></Button>
        <datalist id={listId}>{suggestions.map((e) => <option key={e} value={e} />)}</datalist>
      </form>
      {previous && !groups.some((g) => g.key === exerciseKey(typed)) && (
        <p className="tabular mt-2 text-xs text-zinc-400">
          La vez pasada: {previous.sets.map(setText).join(', ')} · <span className="text-accent">hoy probá {nextTarget(previous.best)}</span>
        </p>
      )}
      <p className="mt-2 text-[11px] text-zinc-500">
        El formulario queda cargado: tocá + otra vez para repetir la serie. Sin peso = ejercicio con tu cuerpo (cuentan las reps).
        {previous?.best?.kg > 0 && <> 1RM estimado la vez pasada: {fmt(e1rm(previous.best.kg, previous.best.reps), 1)} kg.</>}
      </p>
    </div>
  )
}
