import { useMemo, useState } from 'react'
import { hasStates, stateLabel } from '../lib/foods'
import { useFoods } from '../lib/foodsContext'
import { recipeIcon } from '../lib/icons'
import { recipeMacros, uid } from '../lib/model'
import { CURRENCY, money, recipeCost } from '../lib/prices'
import { foodIconOf } from './MealBuilder'
import { Button, Card, Icon, Input, fmt, num } from './ui'

const DAY = 864e5
const daysSince = (ts) => Math.floor((Date.now() - ts) / DAY)

// Conservación en heladera: hasta ~3-4 días; después conviene congelar o revisar
// Congelado: hasta ~3 meses. Descongelado: 1-2 días en la heladera.
function freshness(r) {
  if (r.frozenAt) {
    const d = daysSince(r.frozenAt)
    return d <= 90
      ? { label: `Congelado${d ? ` hace ${d} ${d === 1 ? 'día' : 'días'}` : ' hoy'}`, tone: 'bg-sky-400/15 text-sky-200' }
      : { label: `Congelado hace ${d} días · usar pronto`, tone: 'bg-amber-400/15 text-amber-300' }
  }
  if (r.thawedAt) {
    const d = daysSince(r.thawedAt)
    if (d <= 1) return { label: d === 0 ? 'Descongelado hoy' : 'Descongelado ayer', tone: 'bg-accent/15 text-accent' }
    return { label: `Descongelado hace ${d} días · revisar`, tone: 'bg-rose-400/15 text-rose-300' }
  }
  const days = daysSince(r.cookedAt)
  if (days <= 2) return { label: days === 0 ? 'Cocinado hoy' : `Hace ${days} ${days === 1 ? 'día' : 'días'}`, tone: 'bg-accent/15 text-accent' }
  if (days <= 4) return { label: `Hace ${days} días · comer pronto`, tone: 'bg-amber-400/15 text-amber-300' }
  return { label: `Hace ${days} días · revisar o congelar`, tone: 'bg-rose-400/15 text-rose-300' }
}

export default function BatchCooking({ recipes, setRecipes, eatTupper, date, prices, editRecipe, newBatch, goToShop }) {
  const { foods, variants } = useFoods()
  const [quick, setQuick] = useState(null) // null | 'new' | recipe (lote con macros a mano)
  const [eaten, setEaten] = useState(null)

  const inFridge = recipes.filter((r) => r.remaining > 0)
  const finished = recipes.filter((r) => r.remaining === 0)
  const totals = inFridge.reduce(
    (acc, r) => {
      const m = recipeMacros(r)
      const c = recipeCost(r, prices, variants)
      acc.tapers += r.remaining
      acc.protein += m.protein * r.remaining
      acc.value += (c?.perPortion ?? 0) * r.remaining
      return acc
    },
    { tapers: 0, protein: 0, value: 0 },
  )

  const update = (id, fn) => setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...fn(r) } : r)))
  const adjust = (id, delta) => update(id, (r) => ({ remaining: Math.max(0, Math.min(r.portions, r.remaining + delta)) }))
  const restock = (id) => update(id, (r) => ({ remaining: r.portions, cookedAt: Date.now(), frozenAt: null, thawedAt: null }))
  const toggleFreeze = (id) => update(id, (r) => (r.frozenAt ? { frozenAt: null, thawedAt: Date.now() } : { frozenAt: Date.now(), thawedAt: null }))
  const remove = (r) => {
    if (confirm(`¿Eliminar "${r.name}"? Las comidas ya registradas se mantienen.`)) setRecipes((prev) => prev.filter((x) => x.id !== r.id))
  }
  const eat = (r) => {
    eatTupper(date, r)
    setEaten(r.id)
    setTimeout(() => setEaten(null), 1800)
  }
  const edit = (r) => (r.mode === 'manual' ? setQuick(r) : editRecipe(r))

  const saveQuick = (data) => {
    if (quick === 'new') setRecipes((prev) => [{ ...data, id: uid(), remaining: data.portions, cookedAt: Date.now() }, ...prev])
    else update(quick.id, (r) => ({ ...data, remaining: Math.min(r.remaining, data.portions) }))
    setQuick(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-hand text-[40px] font-bold leading-[0.9] text-zinc-50">Mi heladera</h1>
          <p className="text-xs text-zinc-500">Tus lotes de batch cooking. Tocá “Comer 1” y se suma solo a tu día.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={goToShop}><Icon name="cart" className="h-4 w-4" /> Compras</Button>
          <Button variant="ghost" onClick={() => setQuick('new')}>Lote rápido</Button>
          <Button onClick={newBatch}><Icon name="plus" className="h-4 w-4" /> Nuevo lote</Button>
        </div>
      </div>

      {quick && <QuickBatchForm initial={quick === 'new' ? null : quick} onSave={saveQuick} onCancel={() => setQuick(null)} />}

      {recipes.length === 0 && !quick ? (
        <Card className="py-10 text-center">
          <p className="text-4xl">🥡</p>
          <p className="mt-3 font-medium">Tu heladera está vacía</p>
          <div className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm text-zinc-400">
            <p><b className="text-zinc-200">1.</b> Armá el taper en <b className="text-zinc-200">Crear taper</b> (o usá una plantilla).</p>
            <p><b className="text-zinc-200">2.</b> Elegí cuántos vas a cocinar y guardá el lote.</p>
            <p><b className="text-zinc-200">3.</b> Cada vez que comés uno, tocá <b className="text-zinc-200">Comer 1</b>: se suma a tu día.</p>
          </div>
          <Button className="mt-6" onClick={newBatch}><Icon name="bowl" className="h-4 w-4" /> Crear mi primer lote</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Tapers en la heladera" value={fmt(totals.tapers)} />
            <Summary label="Días cubiertos (2 por día)" value={fmt(totals.tapers / 2, 1)} />
            <Summary label="Proteína guardada" value={`${fmt(totals.protein)} g`} />
            <Summary label="Valor en comida" value={totals.value ? money(totals.value) : '—'} />
          </div>

          {inFridge.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {inFridge.map((r) => (
                <RecipeCard
                  key={r.id} recipe={r} foods={foods} prices={prices} variants={variants} justAte={eaten === r.id}
                  onEat={() => eat(r)} onAdjust={(d) => adjust(r.id, d)} onEdit={() => edit(r)} onRemove={() => remove(r)}
                  onFreeze={() => toggleFreeze(r.id)}
                />
              ))}
            </div>
          )}

          {finished.length > 0 && (
            <Card>
              <p className="mb-2 font-hand text-[26px] font-semibold leading-none text-zinc-100">Terminados · para volver a cocinar</p>
              <ul className="divide-y divide-white/[0.05]">
                {finished.map((r) => {
                  const m = recipeMacros(r)
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-xl leading-none opacity-60">{recipeIcon(r)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-300">{r.name}</p>
                        <p className="text-xs text-zinc-500">{r.portions} tapers · {fmt(m.kcal)} kcal · {fmt(m.protein, 1)} g prot c/u</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => restock(r.id)}><Icon name="refresh" className="h-3.5 w-3.5" /> Cociné otra vez</Button>
                      <Button variant="plain" size="icon" onClick={() => edit(r)} aria-label="Editar"><Icon name="edit" className="h-4 w-4" /></Button>
                      <Button variant="plain" size="icon" onClick={() => remove(r)} aria-label="Eliminar"><Icon name="trash" className="h-4 w-4" /></Button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function RecipeCard({ recipe: r, foods, prices, variants, justAte, onEat, onAdjust, onEdit, onRemove, onFreeze }) {
  const [open, setOpen] = useState(false)
  const [potOpen, setPotOpen] = useState(false)
  const [pot, setPot] = useState('')
  const m = recipeMacros(r)
  const cost = recipeCost(r, prices, variants)
  const fresh = freshness(r)
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])

  // Ingredientes de UN taper (desde las filas guardadas o dividiendo el lote)
  const perTaper = r.rows
    ? r.rows.flatMap((row) => {
        const food = byId.get(row.foodId)
        if (!food) return []
        return [{ key: row.foodId + row.state, icon: foodIconOf(food), name: food.name, state: hasStates(food) ? stateLabel(food, row.state) : '', grams: row.grams }]
      })
    : (r.ingredients ?? []).map((i) => ({ key: i.name, icon: '•', name: i.name, state: '', grams: i.grams / Math.max(1, r.portions) }))

  return (
    <Card className={`flex flex-col transition-colors ${justAte ? 'border-accent/50' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-2xl leading-none">{recipeIcon(r)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{r.name}</h3>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${fresh.tone}`}>{fresh.label}</span>
            <button className="text-[11px] text-zinc-400 underline decoration-dashed underline-offset-4 hover:text-zinc-100" onClick={onFreeze}>
              {r.frozenAt ? 'Descongelar' : 'Congelar'}
            </button>
          </span>
        </div>
        <div className="flex shrink-0">
          <Button variant="plain" size="icon" onClick={onEdit} aria-label="Editar"><Icon name="edit" className="h-4 w-4" /></Button>
          <Button variant="plain" size="icon" onClick={onRemove} aria-label="Eliminar"><Icon name="trash" className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="mt-3 text-sm">
        <b>{fmt(m.kcal)}</b> <span className="text-zinc-500">kcal</span>
        <span className="mx-1.5 text-zinc-600">·</span>
        <b className="text-sky-300">{fmt(m.protein, 1)} g</b> <span className="text-zinc-500">proteína</span>
        {cost && <><span className="mx-1.5 text-zinc-600">·</span><span className="text-zinc-300">{money(cost.perPortion)}</span></>}
        <span className="text-zinc-500"> por taper</span>
        {m.carbs != null && (
          <span className="tabular mt-0.5 block text-xs text-zinc-500">
            <span className="text-amber-300">{fmt(m.carbs)} g carbos</span> · <span className="text-pink-300">{fmt(m.fat, 1)} g grasas</span>
          </span>
        )}
      </p>

      {/* Tapers que quedan, como casillas */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-1">
          {Array.from({ length: Math.min(r.portions, 20) }, (_, i) => (
            <span
              key={i}
              className={`h-5 w-5 rounded-md border text-[11px] leading-none ${
                i < r.remaining ? 'border-accent/40 bg-accent/20' : 'border-white/[0.06] bg-transparent'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100" onClick={() => onAdjust(-1)} aria-label="Quitar uno">
            <Icon name="minus" className="h-3.5 w-3.5" />
          </button>
          <span className="whitespace-nowrap"><b>{r.remaining}</b><span className="text-zinc-500"> de {r.portions}</span></span>
          <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-100" onClick={() => onAdjust(1)} aria-label="Añadir uno">
            <Icon name="plus" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Button className="mt-4 h-11 w-full" onClick={onEat}>
        <Icon name="check" className="h-4 w-4" /> {justAte ? '¡Sumado a tu día!' : 'Comer 1'}
      </Button>

      {/* Porcionar la olla: peso total cocido ÷ tapers */}
      <div className="mt-3">
        <button className="text-xs text-zinc-400 underline decoration-dashed underline-offset-4 hover:text-zinc-100" onClick={() => setPotOpen((v) => !v)}>
          {potOpen ? 'Cerrar' : 'Porcionar la olla'}
        </button>
        {potOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Input className="w-36" type="number" inputMode="numeric" placeholder="peso total" suffix="g" value={pot} onChange={(e) => setPot(e.target.value)} aria-label="Peso total cocido" />
            {num(pot) > 0 ? (
              <p className="text-sm">
                <b className="tabular text-xl">{fmt(num(pot) / r.portions)} g</b> <span className="text-zinc-400">por taper ({r.portions} tapers)</span>
              </p>
            ) : (
              <p className="text-xs text-zinc-500">Pesá todo lo cocinado (sin la olla) y repartilo parejo.</p>
            )}
          </div>
        )}
      </div>

      {perTaper.length > 0 && (
        <div className="mt-3">
          <button className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setOpen((v) => !v)}>
            {open ? 'Ocultar ingredientes' : `Ver ingredientes (${perTaper.length})`}
          </button>
          {open && (
            <ul className="mt-2 space-y-1 rounded-xl bg-black/[0.16] px-3 py-2 text-sm">
              {perTaper.map((i) => (
                <li key={i.key} className="flex justify-between gap-2">
                  <span className="truncate text-zinc-300">{i.icon} {i.name}{i.state && <span className="text-zinc-500"> · {i.state}</span>}</span>
                  <span className="shrink-0 text-zinc-400">{fmt(i.grams)} g</span>
                </li>
              ))}
              <li className="pt-1 text-[11px] text-zinc-500">Cantidades por taper</li>
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

function Summary({ label, value }) {
  return (
    <Card className="!p-3.5">
      <p className="text-[11px] leading-tight text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
    </Card>
  )
}

// Lote con macros escritos a mano (ej. una comida que no está en la base)
function QuickBatchForm({ initial, onSave, onCancel }) {
  const s = (v) => (v == null ? '' : String(v))
  const [d, setD] = useState({
    name: initial?.name ?? '', portions: s(initial?.portions ?? 4),
    kcal: s(initial?.kcalPerPortion), protein: s(initial?.proteinPerPortion), cost: s(initial?.costPerPortion),
  })
  const set = (patch) => setD((prev) => ({ ...prev, ...patch }))
  const valid = d.name.trim() && num(d.kcal) > 0

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSave({
      name: d.name.trim(), portions: Math.max(1, Math.round(num(d.portions) ?? 1)), mode: 'manual', icon: null,
      kcalPerPortion: num(d.kcal), proteinPerPortion: num(d.protein) ?? 0, costPerPortion: num(d.cost), ingredients: [],
    })
  }

  return (
    <Card className="border-accent/20">
      <p className="font-medium">{initial ? 'Editar lote rápido' : 'Lote rápido'}</p>
      <p className="mt-0.5 text-xs text-zinc-500">Para comidas que no armaste con la base (ej. una receta familiar). Escribí los valores de un taper.</p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <div className="grid grid-cols-[1fr_100px] gap-2">
          <Input label="Nombre" placeholder="Guiso de lentejas de mamá" value={d.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          <Input label="Tapers" type="number" inputMode="numeric" value={d.portions} onChange={(e) => set({ portions: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input label="kcal por taper" type="number" inputMode="numeric" value={d.kcal} onChange={(e) => set({ kcal: e.target.value })} />
          <Input label="Proteína" suffix="g" type="number" inputMode="decimal" value={d.protein} onChange={(e) => set({ protein: e.target.value })} />
          <Input label="Costo (opcional)" suffix={CURRENCY} type="number" inputMode="decimal" value={d.cost} onChange={(e) => set({ cost: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={!valid}>Guardar</Button>
        </div>
      </form>
    </Card>
  )
}
