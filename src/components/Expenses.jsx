import { useMemo, useState } from 'react'
import { fromKey, todayKey } from '../lib/date'
import { uid } from '../lib/model'
import { CURRENCY, money, monthlyCost } from '../lib/prices'
import { Button, Card, Icon, Input, SectionTitle, erase, fmt, num } from './ui'
import { useToast } from './Toast'

export const EXPENSE_CATEGORIES = [
  { id: 'market', label: 'Súper / Feria', icon: '🛒', color: '#3eab5e' },
  { id: 'butcher', label: 'Carnicería', icon: '🥩', color: '#c25485' },
  { id: 'supplements', label: 'Suplementos', icon: '💊', color: '#369dd1' },
  { id: 'gym', label: 'Gimnasio', icon: '🏋️', color: '#866ec5' },
  { id: 'drinks', label: 'Café y bebidas', icon: '☕', color: '#b18e15' },
  { id: 'other', label: 'Otros', icon: '📦', color: '#959b92' },
]
const categoryOf = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES.at(-1)

// Meses como 'YYYY-MM'
const monthOf = (dateKey) => dateKey.slice(0, 7)
const shiftMonth = (month, n) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthFmt = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' })
const monthShortFmt = new Intl.DateTimeFormat('es-UY', { month: 'short' })
const dayFmt = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
export const monthLabel = (month) => cap(monthFmt.format(fromKey(`${month}-01`)))
const monthShort = (month) => cap(monthShortFmt.format(fromKey(`${month}-01`)).replace('.', ''))

const blankForm = () => ({ description: '', amount: '', date: todayKey(), month: '', category: 'market', recurring: false })

export default function Expenses({ expenses, setExpenses, prices, logs, settings, setSettings }) {
  const [month, setMonth] = useState(monthOf(todayKey()))
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [catFilter, setCatFilter] = useState('all')

  // Meses con movimientos + el actual, del más nuevo al más viejo
  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => e.month))
    set.add(monthOf(todayKey()))
    set.add(month)
    return [...set].sort().reverse()
  }, [expenses, month])

  const totalOf = (m) => expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0)
  const inMonth = expenses.filter((e) => e.month === month)
  const total = inMonth.reduce((s, e) => s + e.amount, 0)
  const prevTotal = totalOf(shiftMonth(month, -1))
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: inMonth.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // Presupuesto: el fijado a mano o la estimación de la pestaña Presupuesto
  const estimate = prices.reduce((s, p) => s + monthlyCost(p), 0)
  const budget = settings.monthlyBudget ?? (estimate || null)
  // Costo real de los tuppers/comidas registrados en el día durante el mes
  const eatenCost = Object.entries(logs)
    .filter(([k]) => monthOf(k) === month)
    .reduce((s, [, d]) => s + (d.meals ?? []).reduce((a, m) => a + (m.cost || 0), 0), 0)

  // Promedio diario y proyección del mes en curso
  const isCurrent = month === monthOf(todayKey())
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const dayNow = isCurrent ? new Date().getDate() : daysInMonth
  const projection = isCurrent && total ? (total / dayNow) * daysInMonth : null

  // Gastos fijos: el último registro de cada descripción marcada como fija, si todavía no está en este mes
  const recurringMissing = useMemo(() => {
    const latest = new Map()
    for (const e of [...expenses].filter((x) => x.recurring && x.month < month).sort((a, b) => a.month.localeCompare(b.month))) {
      latest.set(e.description.trim().toLowerCase(), e)
    }
    const here = new Set(inMonth.map((e) => e.description.trim().toLowerCase()))
    return [...latest.entries()].filter(([k]) => !here.has(k)).map(([, e]) => e)
  }, [expenses, month, inMonth])

  const addRecurring = () => {
    const day = month === monthOf(todayKey()) ? todayKey() : `${month}-01`
    const added = recurringMissing.map((e) => ({ ...e, id: uid(), createdAt: Date.now(), date: day, month }))
    setExpenses((prev) => [...added, ...prev])
    toast(`Cargaste ${added.length} ${added.length === 1 ? 'gasto fijo' : 'gastos fijos'}`, () => setExpenses((prev) => prev.filter((e) => !added.some((a) => a.id === e.id))))
  }

  const visible = inMonth
    .filter((e) => catFilter === 'all' || e.category === catFilter)
    .sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
  const byDay = visible.reduce((acc, e) => {
    ;(acc[e.date] ??= []).push(e)
    return acc
  }, {})

  // Descripciones frecuentes para cargar rápido
  const frequent = useMemo(() => {
    const count = new Map()
    for (const e of expenses) {
      const k = e.description.trim()
      const prev = count.get(k)
      count.set(k, { n: (prev?.n ?? 0) + 1, category: e.category, amount: e.amount })
    }
    return [...count.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6)
  }, [expenses])

  const history = Array.from({ length: 6 }, (_, i) => shiftMonth(monthOf(todayKey()), -5 + i)).map((mm) => ({ month: mm, total: totalOf(mm) }))
  const maxHist = Math.max(1, ...history.map((h) => h.total), budget ?? 0)

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }))
  const amount = num(form.amount)
  const targetMonth = form.month || monthOf(form.date)
  const valid = form.description.trim() && amount > 0 && form.date

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    const data = { description: form.description.trim(), amount, date: form.date, month: targetMonth, category: form.category, recurring: form.recurring }
    if (editingId) setExpenses((prev) => prev.map((x) => (x.id === editingId ? { ...x, ...data } : x)))
    else setExpenses((prev) => [{ ...data, id: uid(), createdAt: Date.now() }, ...prev])
    setMonth(targetMonth)
    setForm({ ...blankForm(), category: form.category, date: form.date })
    setEditingId(null)
  }

  const startEdit = (x) => {
    setEditingId(x.id)
    setForm({ description: x.description, amount: String(x.amount), date: x.date, month: x.month === monthOf(x.date) ? '' : x.month, category: x.category, recurring: Boolean(x.recurring) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toast = useToast()
  const remove = (x) => {
    setExpenses((prev) => prev.filter((e) => e.id !== x.id))
    toast(`Borraste ${x.description} (${money(x.amount)})`, () => setExpenses((prev) => [x, ...prev]))
  }

  return (
    <div className="space-y-4">
      {/* Selector de mes */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior"><Icon name="left" className="h-4 w-4" /></Button>
        <select
          value={month} onChange={(e) => setMonth(e.target.value)}
          className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-ink-900 px-3 text-center text-[15px] font-medium outline-none focus:border-accent/60"
          aria-label="Mes"
        >
          {months.map((mm) => <option key={mm} value={mm}>{monthLabel(mm)}{totalOf(mm) ? ` · ${money(totalOf(mm))}` : ''}</option>)}
        </select>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Mes siguiente"><Icon name="right" className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Resumen del mes */}
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">Gastado en {monthLabel(month).toLowerCase()}</p>
                <p className="mt-1 text-5xl font-bold tracking-tight">{money(total)}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {inMonth.length} {inMonth.length === 1 ? 'compra' : 'compras'}
                  {prevTotal > 0 && (
                    <> · <span className={total <= prevTotal ? 'text-accent' : 'text-amber-300'}>
                      {total <= prevTotal ? '▼' : '▲'} {fmt(Math.abs((total - prevTotal) / prevTotal) * 100)}%
                    </span> vs. mes anterior</>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-5 text-right text-sm">
                <div><p className="text-[11px] text-zinc-500">Promedio por día</p><p className="font-medium">{money(total / dayNow)}</p></div>
                <div><p className="text-[11px] text-zinc-500">{projection ? 'Proyección del mes' : 'Días del mes'}</p><p className="font-medium">{projection ? money(projection) : daysInMonth}</p></div>
              </div>
            </div>

            {/* Presupuesto */}
            <div className="mt-5 rounded-xl border border-white/[0.06] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-zinc-400">
                  Presupuesto {settings.monthlyBudget == null && budget ? <span className="text-xs text-zinc-500">(estimado en Presupuesto)</span> : ''}
                </span>
                {editingBudget ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => { e.preventDefault(); const v = num(new FormData(e.currentTarget).get('b')); setSettings((s) => ({ ...s, monthlyBudget: v > 0 ? v : null })); setEditingBudget(false) }}
                  >
                    <Input name="b" className="w-32" type="number" inputMode="numeric" suffix={CURRENCY} defaultValue={budget ? Math.round(budget) : ''} autoFocus />
                    <Button size="sm" type="submit">OK</Button>
                  </form>
                ) : (
                  <button className="font-medium hover:text-accent" onClick={() => setEditingBudget(true)}>
                    {budget ? money(budget) : 'Definir presupuesto'} <Icon name="edit" className="ml-1 inline h-3.5 w-3.5 text-zinc-500" />
                  </button>
                )}
              </div>
              {budget > 0 && (
                <>
                  <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${total > budget ? 'bg-rose-400' : total > budget * 0.85 ? 'bg-amber-400' : 'bg-accent'}`}
                      style={{ width: `${Math.min(100, (total / budget) * 100)}%` }}
                    />
                    {projection && projection < budget * 1.5 && (
                      <div className="absolute top-0 h-full w-0.5 bg-zinc-100/50" style={{ left: `${Math.min(100, (projection / budget) * 100)}%` }} title="Proyección" />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {total <= budget
                      ? <>Te quedan <b className="text-zinc-300">{money(budget - total)}</b> · {fmt((total / budget) * 100)}% usado</>
                      : <span className="text-rose-300">Te pasaste por {money(total - budget)}</span>}
                    {projection && <> · al ritmo actual cerrás en {money(projection)}</>}
                  </p>
                </>
              )}
              {eatenCost > 0 && (
                <p className="mt-1.5 text-xs text-zinc-500">🥡 Costo de lo que comiste según tus tuppers y comidas: <span className="text-zinc-300">{money(eatenCost)}</span></p>
              )}
            </div>

            {/* Desglose por categoría */}
            {byCategory.length > 0 && (
              <div className="mt-5">
                <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
                  {byCategory.map((c) => <div key={c.id} style={{ width: `${(c.amount / total) * 100}%`, background: c.color }} title={c.label} />)}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {byCategory.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${catFilter === c.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span>{c.icon}</span>
                        <span className="flex-1 text-left text-zinc-300">{c.label}</span>
                        <span className="text-xs text-zinc-500">{fmt((c.amount / total) * 100)}%</span>
                        <span className="w-24 text-right font-medium">{money(c.amount)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Movimientos del mes */}
          <Card>
            <SectionTitle action={catFilter !== 'all' && (
              <button className="text-xs text-accent" onClick={() => setCatFilter('all')}>Ver todas las categorías</button>
            )}>
              Movimientos {catFilter !== 'all' && `· ${categoryOf(catFilter).label}`}
            </SectionTitle>
            {recurringMissing.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-white/[0.18] px-3 py-2.5 text-sm">
                <span className="text-zinc-300">
                  Faltan {recurringMissing.length} {recurringMissing.length === 1 ? 'gasto fijo' : 'gastos fijos'} de este mes
                  <span className="tabular text-zinc-500"> · {money(recurringMissing.reduce((t, e) => t + e.amount, 0))}</span>
                </span>
                <Button size="sm" onClick={addRecurring}>Cargarlos</Button>
              </div>
            )}
            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                Sin gastos en {monthLabel(month).toLowerCase()}. Cargá tu primera compra en el formulario.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(byDay).map(([dateKey, items]) => (
                  <div key={dateKey}>
                    <div className="mb-1 flex justify-between text-xs text-zinc-500">
                      <span>{cap(dayFmt.format(fromKey(dateKey)))}</span>
                      <span>{money(items.reduce((s, x) => s + x.amount, 0))}</span>
                    </div>
                    <ul className="divide-y divide-white/[0.05] rounded-xl bg-black/[0.16]">
                      {items.map((x) => {
                        const c = categoryOf(x.category)
                        return (
                          <li key={x.id} className={`flex items-center gap-3 px-3 py-2.5 ${editingId === x.id ? 'bg-sky-400/10' : ''}`}>
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-lg leading-none">{c.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm leading-snug">{x.description}</p>
                              <p className="text-[11px] text-zinc-500">
                                {c.label}{x.recurring && ' · fijo'}
                                {x.month !== monthOf(x.date) && <> · asignado a {monthLabel(x.month).toLowerCase()}</>}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-medium">{money(x.amount)}</span>
                            <div className="flex shrink-0">
                              <Button variant="plain" size="icon" onClick={() => startEdit(x)} aria-label="Editar"><Icon name="edit" className="h-4 w-4" /></Button>
                              <Button variant="plain" size="icon" onClick={(e) => erase(e.currentTarget.closest('li'), () => remove(x))} aria-label={`Borrar ${x.description}`}><Icon name="trash" className="h-4 w-4" /></Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Formulario */}
          <Card className={editingId ? 'border-sky-400/30' : ''}>
            <SectionTitle action={editingId && (
              <button className="text-xs text-zinc-400 underline" onClick={() => { setEditingId(null); setForm(blankForm()) }}>Cancelar</button>
            )}>
              {editingId ? 'Editar gasto' : 'Nuevo gasto'}
            </SectionTitle>
            <form onSubmit={submit} className="space-y-3">
              <Input
                label="Descripción" placeholder="Compra de pollo y verduras" value={form.description}
                onChange={(e) => setF({ description: e.target.value })}
              />
              {!editingId && frequent.length > 0 && !form.description && (
                <div className="flex flex-wrap gap-1.5">
                  {frequent.map(([desc, info]) => (
                    <button
                      key={desc} type="button"
                      onClick={() => setF({ description: desc, category: info.category, amount: String(info.amount) })}
                      className="rounded-full border border-dashed border-white/[0.16] px-2.5 py-1 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    >
                      {categoryOf(info.category).icon} {desc}
                    </button>
                  ))}
                </div>
              )}
              <Input
                label="Monto" type="number" inputMode="decimal" placeholder="0" suffix={CURRENCY}
                value={form.amount} onChange={(e) => setF({ amount: e.target.value })}
              />

              <div>
                <span className="mb-1.5 block text-xs text-zinc-400">Categoría</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <button
                      key={c.id} type="button" onClick={() => setF({ category: c.id })}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors ${
                        form.category === c.id ? 'border-accent/70 bg-accent/10 text-zinc-100' : 'border-white/[0.06] bg-black/[0.16] text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <span>{c.icon}</span><span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input label="Fecha" type="date" value={form.date} max={todayKey()} onChange={(e) => setF({ date: e.target.value || todayKey() })} />
                <label className="block">
                  <span className="mb-1.5 block text-xs text-zinc-400">Mes asignado</span>
                  <select
                    value={form.month} onChange={(e) => setF({ month: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.1] bg-black/[0.18] px-2 text-sm outline-none focus:border-accent/60"
                  >
                    <option value="">Automático ({monthShort(monthOf(form.date))})</option>
                    {[-1, 0, 1].map((n) => {
                      const mm = shiftMonth(monthOf(form.date), n)
                      return <option key={mm} value={mm}>{monthLabel(mm)}</option>
                    })}
                  </select>
                </label>
              </div>
              {form.month && form.month !== monthOf(form.date) && (
                <p className="text-xs text-amber-200/80">Se contará en {monthLabel(form.month).toLowerCase()} (ej. una compra grande a fin de mes para el siguiente).</p>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
                <input type="checkbox" className="h-4 w-4 accent-lime-400" checked={form.recurring} onChange={(e) => setF({ recurring: e.target.checked })} />
                Gasto fijo de todos los meses (gimnasio, suplementos…)
              </label>
              <Button type="submit" className="h-11 w-full" disabled={!valid}>
                <Icon name={editingId ? 'check' : 'plus'} className="h-4 w-4" /> {editingId ? 'Guardar cambios' : `Agregar ${amount ? money(amount) : 'gasto'}`}
              </Button>
            </form>
          </Card>

          {/* Últimos 6 meses */}
          <Card>
            <SectionTitle>Últimos 6 meses</SectionTitle>
            <div className="relative flex h-32 items-end gap-2">
              {budget > 0 && (
                <div className="absolute inset-x-0 h-px bg-data-good" style={{ bottom: `${(budget / maxHist) * 100}%` }} title="Presupuesto" />
              )}
              {history.map((h) => (
                <button key={h.month} onClick={() => setMonth(h.month)} className="flex h-full flex-1 flex-col justify-end" title={`${monthLabel(h.month)}: ${money(h.total)}`}>
                  <div
                    className={`mx-auto w-full max-w-[24px] rounded-t-[4px] transition-colors ${h.month === month ? 'bg-zinc-100' : budget && h.total > budget ? 'bg-rose-400/70' : 'bg-white/[0.22] hover:bg-white/35'}`}
                    style={{ height: `${(h.total / maxHist) * 100}%`, minHeight: h.total ? 4 : 0 }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2 text-center text-[11px] text-zinc-500">
              {history.map((h) => <span key={h.month} className={`flex-1 ${h.month === month ? 'text-zinc-200' : ''}`}>{monthShort(h.month)}</span>)}
            </div>
            {history.some((h) => h.total) && (
              <p className="mt-3 text-xs text-zinc-500">
                Promedio mensual: <span className="text-zinc-300">{money(history.filter((h) => h.total).reduce((s, h) => s + h.total, 0) / history.filter((h) => h.total).length)}</span>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
