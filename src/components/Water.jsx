import { useState } from 'react'
import { formatShort, lastNDays, todayKey } from '../lib/date'
import { uid, waterTotal } from '../lib/model'
import DateNav from './DateNav'
import { useToast } from './Toast'
import { Button, Card, ChalkNumber, ChalkUnderline, Icon, Input, PageHeader, SectionTitle, Tally, erase, fmt, num } from './ui'

// Envases dibujados (mismo trazo que los íconos de la app)
const VESSELS = {
  glass: 'M7 4h10l-1.2 15.2a1 1 0 0 1-1 .8H9.2a1 1 0 0 1-1-.8L7 4Zm.4 5h9.2',
  bottle: 'M10 3h4v3l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3V3Zm-2 9h8',
  big: 'M9.5 2h5v3l3 3.5V21a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V8.5l3-3.5V2Zm-3 10h11',
  jug: 'M8 4h8v2l1.5 2.5V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V8.5L8 6V4Zm9.5 6h1.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-1.5',
}

export const WATER_PRESETS = [
  { ml: 250, label: 'Vaso', vessel: 'glass' },
  { ml: 500, label: 'Botella', vessel: 'bottle' },
  { ml: 750, label: 'Botella grande', vessel: 'big' },
  { ml: 1000, label: '1 litro', vessel: 'jug' },
]

const liters = (ml) => `${fmt(ml / 1000, 2)} L`

export default function Water({ settings, logs, date, setDate, updateDay }) {
  const [custom, setCustom] = useState('')
  const entries = logs[date]?.water ?? []
  const total = waterTotal(logs[date])
  const goal = settings.waterGoal * 1000
  const ratio = goal ? Math.min(1, total / goal) : 0
  const left = Math.max(0, goal - total)
  const done = total >= goal

  const add = (ml) => updateDay(date, (day) => ({ water: [...(day.water ?? []), { id: uid(), at: Date.now(), ml }] }))
  const toast = useToast()
  const remove = (id) => {
    const entry = entries.find((w) => w.id === id)
    updateDay(date, (day) => ({ water: (day.water ?? []).filter((w) => w.id !== id) }))
    if (entry) toast(`Borraste ${entry.ml} ml de agua`, () => updateDay(date, (day) => ({ water: [...(day.water ?? []), entry].sort((a, b) => a.at - b.at) })))
  }

  const history = lastNDays(14, todayKey()).map((k) => ({ key: k, ml: waterTotal(logs[k]) }))
  const logged = history.filter((h) => h.ml > 0)
  const avg = logged.length ? logged.reduce((s, h) => s + h.ml, 0) / logged.length : 0
  let streak = 0
  // Racha: días seguidos cumpliendo la meta (hoy cuenta solo si ya la cumpliste)
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].ml >= goal) streak++
    else if (i !== history.length - 1) break
  }
  const maxMl = Math.max(goal * 1.15, ...history.map((h) => h.ml))

  return (
    <div className="space-y-6">
      <PageHeader title="Agua">Un vaso de 250 ml es un palito en la pizarra. Con tus pasos y el entrenamiento, apuntá a {fmt(settings.waterGoal, 1)} L.</PageHeader>
      <DateNav date={date} setDate={setDate} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex items-center gap-6" aria-label="Agua tomada">
          {/* Vaso a tiza que se llena (scaleY, nunca height) */}
          <div className="relative h-52 w-28 shrink-0 overflow-hidden rounded-b-[2rem] rounded-t-md border-2 border-dashed border-zinc-200/50">
            <div className="fill-y absolute inset-0 bg-data-water/80" style={{ transform: `scaleY(${ratio})` }} />
            {[25, 50, 75].map((m) => (
              <div key={m} className="absolute left-0 h-px w-3 bg-zinc-100/40" style={{ bottom: `${m}%` }} />
            ))}
          </div>
          <div className="min-w-0">
            <p className="font-hand text-[26px] leading-none text-zinc-400">tomaste</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="relative inline-block">
                <ChalkNumber value={fmt(total / 1000, 2)} className="text-[84px] font-bold leading-[0.85] text-zinc-50" />
                {done && <span className="absolute -bottom-2 inset-x-0"><ChalkUnderline className="text-accent" /></span>}
              </span>
              <span className="font-hand text-[26px] text-zinc-400">L</span>
            </p>
            <p className="tabular mt-2 text-sm text-zinc-400">de {fmt(settings.waterGoal, 1)} L · {fmt(ratio * 100)}%</p>
            <div className="mt-3"><Tally count={Math.round(total / 250)} max={Math.round(goal / 250)} className="text-aqua-300" /></div>
            <p className={`mt-3 text-sm ${done ? 'text-accent' : 'text-zinc-300'}`}>
              {done ? 'Meta de agua cumplida.' : <>Te faltan <b>{liters(left)}</b> · unos {Math.ceil(left / 250)} vasos</>}
            </p>
          </div>
        </section>

        <Card variant="ruled">
          <SectionTitle>Sumar agua</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {WATER_PRESETS.map((p) => (
              <button
                key={p.ml} onClick={() => add(p.ml)}
                className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.18] px-3 py-3 text-left transition-[border-color,transform] duration-150 hover:border-aqua-300/60 active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-aqua-300" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={VESSELS[p.vessel]} />
                </svg>
                <span>
                  <span className="block text-[15px] font-bold">+{p.ml >= 1000 ? `${p.ml / 1000} L` : `${p.ml} ml`}</span>
                  <span className="block text-xs text-zinc-500">{p.label}</span>
                </span>
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); const v = num(custom); if (v > 0) { add(Math.round(v)); setCustom('') } }}
          >
            <Input className="flex-1" type="number" inputMode="numeric" placeholder="Otra cantidad" suffix="ml" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Mililitros" />
            <Button type="submit" variant="ghost"><Icon name="plus" className="h-4 w-4" /> Sumar</Button>
          </form>
          {entries.length > 0 && (
            <Button variant="plain" size="sm" className="mt-2" onClick={() => remove(entries.at(-1).id)}>
              Deshacer el último ({entries.at(-1).ml} ml)
            </Button>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="ruled">
          <SectionTitle>Últimos 14 días</SectionTitle>
          <div className="relative flex h-36 items-end gap-[2px]" role="img" aria-label={`Agua de los últimos 14 días; media ${liters(avg)}`}>
            <div className="absolute inset-x-0 h-px bg-zinc-300" style={{ bottom: `${(goal / maxMl) * 100}%` }} />
            <span className="absolute right-0 text-[11px] text-zinc-500" style={{ bottom: `calc(${(goal / maxMl) * 100}% + 3px)` }}>meta {fmt(settings.waterGoal, 1)} L</span>
            {history.map((h) => (
              <div key={h.key} className="flex h-full flex-1 flex-col items-center justify-end" title={`${formatShort(h.key)}: ${liters(h.ml)}`}>
                <div
                  className={`w-full max-w-[18px] rounded-t-[4px] ${h.ml >= goal ? 'bg-data-water' : 'bg-data-water-low'} ${h.key === date ? 'outline outline-2 outline-offset-1 outline-zinc-100/70' : ''}`}
                  style={{ height: `${(h.ml / maxMl) * 100}%`, minHeight: h.ml ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
            <span>{formatShort(history[0].key)}</span><span>hoy</span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-water" />Meta cumplida</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-water-low" />Por debajo</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-zinc-300" />Meta diaria</li>
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-dashed border-white/[0.14] pt-3">
            <div>
              <dt className="text-xs text-zinc-500">Media por día anotado</dt>
              <dd className="mt-1 text-2xl font-bold">{avg ? liters(avg) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Racha cumpliendo la meta</dt>
              <dd className="mt-1 text-2xl font-bold">{streak} {streak === 1 ? 'día' : 'días'}</dd>
            </div>
          </dl>
        </Card>

        <Card variant="ruled">
          <SectionTitle>Lo que tomaste</SectionTitle>
          {entries.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">Todavía no anotaste agua este día. Empezá con un vaso.</p>
          ) : (
            <ul className="divide-y divide-dashed divide-white/[0.1]">
              {[...entries].reverse().map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-2">
                  <Icon name="drop" className="h-4 w-4 text-aqua-300" />
                  <span className="tabular flex-1 text-[15px]">{w.ml} ml</span>
                  <span className="tabular text-xs text-zinc-500">
                    {new Date(w.at).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Button
                    variant="plain" size="icon" aria-label={`Borrar ${w.ml} ml`}
                    onClick={(e) => erase(e.currentTarget.closest('li'), () => remove(w.id))}
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            Tomar agua también ayuda a manejar el hambre en déficit. El mate sin azúcar cuenta.
          </p>
        </Card>
      </div>
    </div>
  )
}
