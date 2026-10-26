import { useEffect, useState } from 'react'
import { addDays, todayKey } from '../lib/date'
import { dayChecks, dayTotals } from '../lib/model'
import { daysBetween, startBreak } from '../lib/progress'
import { downloadBackup, lastExportAt, load, save } from '../lib/storage'
import { listPhotos } from '../lib/photos'
import { Button, Icon, fmt } from './ui'

// Avisos de la pantalla Hoy: resumen semanal, cocinada, primeros pasos, recordatorios y fase.

// Lunes y martes: cómo fue la semana anterior (lunes a domingo); se cierra por semana
export function WeekReport({ logs, settings, date }) {
  const dow = (new Date(`${date}T00:00`).getDay() + 6) % 7 // 0 = lunes
  const lastMonday = addDays(date, -dow - 7)
  const storeKey = `recomp:ui:weekReport:${lastMonday}`
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(storeKey) === 'closed' } catch { return false }
  })
  if (dow > 1 || hidden) return null
  const days = Array.from({ length: 7 }, (_, i) => addDays(lastMonday, i))
  const prevDays = Array.from({ length: 7 }, (_, i) => addDays(lastMonday, i - 7))
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const weights = (ds) => ds.map((k) => logs[k]?.weight).filter(Boolean)
  const w = avg(weights(days)), wPrev = avg(weights(prevDays))
  const waist = days.map((k) => logs[k]?.waist).filter(Boolean).at(-1)
  const waistPrev = [...prevDays, ...days.slice(0, -1)].map((k) => logs[k]?.waist).filter(Boolean).at(-1)
  const checks = days.map((k) => dayChecks(logs[k], settings))
  const logged = checks.filter((c) => c.logged).length
  if (!logged) return null
  const inPlan = checks.filter((c) => c.inPlan).length
  const proteinDays = days.map((k) => dayTotals(logs[k]).protein).filter((p) => p > 0)
  const close = () => {
    try { localStorage.setItem(storeKey, 'closed') } catch { /* sin almacenamiento */ }
    setHidden(true)
  }
  const delta = (a, b, unit) => (a != null && b != null ? `${a - b > 0 ? '+' : '−'}${fmt(Math.abs(a - b), 1)} ${unit}` : null)
  const rows = [
    { label: 'Peso medio', value: w ? `${fmt(w, 1)} kg` : '—', note: delta(w, wPrev, 'kg'), good: w != null && wPrev != null && w <= wPrev },
    { label: 'Cintura', value: waist ? `${fmt(waist, 1)} cm` : '—', note: waist !== waistPrev ? delta(waist, waistPrev, 'cm') : null, good: waist != null && waistPrev != null && waist <= waistPrev },
    { label: 'Días dentro del plan', value: `${inPlan} de 7`, note: `${logged} anotados`, good: inPlan >= 4 },
    { label: 'Proteína media', value: proteinDays.length ? `${fmt(avg(proteinDays))} g` : '—', note: `meta ${settings.proteinGoal} g`, good: avg(proteinDays) >= settings.proteinGoal * 0.95 },
  ]
  return (
    <section className="rounded-[14px] bg-ink-900 p-4 shadow-[inset_0_1px_0_rgb(238_237_230/0.05)]" aria-label="Resumen de la semana pasada">
      <div className="flex items-start justify-between gap-3">
        <p className="font-hand text-[26px] leading-none text-zinc-50">La semana pasada</p>
        <Button variant="plain" size="sm" onClick={close}>Cerrar</Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs text-zinc-500">{r.label}</dt>
            <dd className="mt-0.5 text-xl font-bold leading-none">{r.value}</dd>
            {r.note && <dd className={`mt-1 text-xs ${r.good ? 'text-accent' : 'text-zinc-500'}`}>{r.note}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 font-hand text-[21px] leading-snug text-zinc-300">
        {inPlan >= 5 ? 'Semana de pizarra limpia. Así se van los flancos.' : inPlan >= 3 ? 'Buena base. Esta semana, un día más dentro del plan.' : 'Semana floja: no pasa nada, la constancia se arma de nuevo hoy.'}
      </p>
    </section>
  )
}

// Aviso de cocinada: pocos tapers en la heladera (o fin de semana con la heladera floja)
export function CookReminder({ recipes, date, goToShop, openCreate }) {
  const left = recipes.filter((r) => !r.frozenAt).reduce((s, r) => s + r.remaining, 0)
  const frozen = recipes.filter((r) => r.frozenAt).reduce((s, r) => s + r.remaining, 0)
  const dow = new Date(`${date}T00:00`).getDay() // 0 domingo, 6 sábado
  const weekend = dow === 0 || dow === 6
  if (!recipes.length || left > (weekend ? 5 : 2)) return null
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-amber-300/40 px-3.5 py-3" aria-label="Aviso de cocinada">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-[21px] leading-none text-amber-300">{left === 0 ? 'Heladera vacía' : 'Se vacía la heladera'}</p>
        <p className="mt-1 text-sm text-zinc-300">
          {left === 0 ? 'No quedan tapers listos.' : `Quedan ${left} ${left === 1 ? 'taper' : 'tapers'}.`}
          {frozen > 0 && ` Tenés ${frozen} en el freezer.`} {weekend ? 'Buen momento para la cocinada de la semana.' : 'Planificá la próxima cocinada.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={goToShop}><Icon name="cart" className="h-3.5 w-3.5" /> Lista de compras</Button>
        <Button size="sm" onClick={() => openCreate('tupper')}>Crear lote</Button>
      </div>
    </section>
  )
}

// Guía de primeros pasos: solo mientras la app está vacía; se puede cerrar
export function FirstSteps({ logs, recipes, favorites, goToSettings, openCreate }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('recomp:ui:firstSteps') === 'done' } catch { return false }
  })
  const anyWeight = Object.values(logs).some((d) => d?.weight)
  const anyMeal = Object.values(logs).some((d) => d?.meals?.length)
  const steps = [
    { done: false, label: 'Revisá tu plan', note: 'Edad, altura, peso y nivel de déficit', action: goToSettings, cta: 'Ajustes' },
    { done: recipes.length > 0 || favorites.length > 0, label: 'Armá tu primer taper', note: 'O un desayuno de siempre', action: () => openCreate('tupper'), cta: 'Crear' },
    { done: anyWeight, label: 'Anotá tu peso', note: 'Abajo, en Peso: en ayunas' },
    { done: anyMeal, label: 'Anotá lo que comés', note: 'Un taper, un desayuno guardado o un alimento' },
  ]
  if (hidden || (anyMeal && anyWeight && recipes.length > 0)) return null
  const close = () => {
    try { localStorage.setItem('recomp:ui:firstSteps', 'done') } catch { /* sin almacenamiento */ }
    setHidden(true)
  }
  return (
    <section className="rounded-[14px] bg-ink-900 p-4 shadow-[inset_0_1px_0_rgb(238_237_230/0.05)]" aria-label="Primeros pasos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-hand text-[26px] leading-none text-zinc-50">Primeros pasos</p>
          <p className="mt-1 text-sm text-zinc-400">Cuatro cosas y la pizarra empieza a trabajar para vos.</p>
        </div>
        <Button variant="plain" size="sm" onClick={close}>Cerrar</Button>
      </div>
      <ol className="mt-3 divide-y divide-dashed divide-white/[0.1]">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3 py-2.5">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? 'bg-accent text-ink-950' : 'border border-dashed border-white/30 text-zinc-400'}`}>
              {s.done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] ${s.done ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{s.label}</span>
              <span className="block text-xs text-zinc-500">{s.note}</span>
            </span>
            {s.action && !s.done && <Button variant="ghost" size="sm" onClick={s.action}>{s.cta}</Button>}
          </li>
        ))}
      </ol>
    </section>
  )
}


// Recordatorios dentro de la app (es web: no hay notificaciones del sistema). Se cierran por día.
export function Reminders({ logs, date, goToStats }) {
  // Una sola clave: los cerrados valen solo para el día en que se cerraron
  const [closed, setClosed] = useState(() => {
    const stored = load('ui:reminders', null)
    return stored?.date === date ? stored.closed : []
  })
  const [lastPhoto, setLastPhoto] = useState(undefined)
  useEffect(() => {
    listPhotos().then((ps) => setLastPhoto(ps.at(-1)?.day ?? null), () => setLastPhoto(null))
  }, [])
  if (date !== todayKey()) return null
  const close = (id) => {
    const next = [...closed, id]
    save('ui:reminders', { date, closed: next })
    setClosed(next)
  }

  const loggedDays = Object.values(logs).filter((d) => d?.meals?.length || d?.weight).length
  const hour = new Date().getHours()
  const day = logs[date]
  const lastWaist = Object.keys(logs).filter((k) => k <= date && logs[k]?.waist).sort().at(-1)
  const exported = lastExportAt()
  const exportDays = exported ? Math.floor((Date.now() - exported) / 864e5) : null
  const items = []

  if (!day?.weight && hour < 13) items.push({ id: 'weight', text: 'Pesate en ayunas y anotalo abajo, en Peso.' })
  if (loggedDays >= 3 && (!lastWaist || daysBetween(lastWaist, date) >= 7)) {
    items.push({ id: 'waist', text: lastWaist ? `Toca medir la cintura: la última fue hace ${daysBetween(lastWaist, date)} días.` : 'Medí la cintura: es la medida que mejor sigue a los flancos.' })
  }
  if (hour >= 20 && !day?.meals?.length) items.push({ id: 'meals', text: 'Todavía no anotaste comidas hoy. Cargalas antes de dormir para que el día cuente.' })
  if (lastPhoto !== undefined && loggedDays >= 3 && (!lastPhoto || daysBetween(lastPhoto, date) >= 14)) {
    items.push({ id: 'photos', text: lastPhoto ? `Pasaron ${daysBetween(lastPhoto, date)} días desde tus últimas fotos de progreso.` : 'Sacate las primeras fotos de progreso: frente y perfil.', cta: 'Fotos', action: goToStats })
  }
  if (loggedDays >= 3 && (exportDays == null || exportDays >= 7)) {
    items.push({
      id: 'backup', text: exportDays == null ? 'Nunca descargaste una copia de tus datos: si se borra el navegador, se pierde todo.' : `Hace ${exportDays} días que no descargás una copia de tus datos.`,
      cta: 'Exportar', action: () => { downloadBackup(); close('backup') },
    })
  }

  const visible = items.filter((i) => !closed.includes(i.id))
  if (!visible.length) return null
  return (
    <section aria-label="Recordatorios" className="space-y-1.5">
      {visible.map((i) => (
        <div key={i.id} className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.16] px-3.5 py-2">
          <p className="min-w-0 flex-1 text-sm text-zinc-300">{i.text}</p>
          {i.action && <Button variant="ghost" size="sm" onClick={i.action}>{i.cta}</Button>}
          <Button variant="plain" size="icon" className="h-8 w-8" onClick={() => close(i.id)} aria-label="Cerrar recordatorio"><Icon name="x" className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
    </section>
  )
}

// Fase de déficit: avisa cuando toca una semana de mantenimiento y la muestra mientras dura
export function PhaseNotice({ phase, date, setSettings }) {
  if (date !== todayKey()) return null
  if (phase.status === 'break') {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-sky-300/40 px-3.5 py-3" aria-label="Semana de mantenimiento">
        <div className="min-w-0 flex-1">
          <p className="font-hand text-[21px] leading-none text-sky-200">Semana de mantenimiento</p>
          <p className="mt-1 text-sm text-zinc-300">
            El objetivo de calorías es tu mantenimiento. {phase.daysLeft === 1 ? 'Hoy es el último día' : `Quedan ${phase.daysLeft} días`}; después vuelve el déficit solo.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSettings((s) => ({ ...s, breakUntil: null, phaseStart: date }))}>Volver al déficit ya</Button>
      </section>
    )
  }
  if (phase.status !== 'due') return null
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-amber-300/40 px-3.5 py-3" aria-label="Fin de fase">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-[21px] leading-none text-amber-300">Llevás {phase.week - 1} semanas en déficit</p>
        <p className="mt-1 text-sm text-zinc-300">
          Una semana comiendo en mantenimiento baja el hambre y el cansancio, y ayuda a sostener el plan sin perder lo logrado.
          {phase.limit < 12 && ' Con el déficit agresivo conviene no pasar de 8 semanas.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSettings((s) => ({ ...s, phaseWeeks: phase.week + 1 }))}>2 semanas más</Button>
        <Button size="sm" onClick={() => setSettings((s) => ({ ...s, ...startBreak(date) }))}>Empezar mantenimiento</Button>
      </div>
    </section>
  )
}
