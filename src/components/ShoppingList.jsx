import { useMemo, useState } from 'react'
import { todayKey } from '../lib/date'
import { FOOD_CATEGORIES, foodVariants, rawGrams } from '../lib/foods'
import { useFoods } from '../lib/foodsContext'
import { uid } from '../lib/model'
import { money, pricePerGram } from '../lib/prices'
import { foodIconOf } from './MealBuilder'
import { useToast } from './Toast'
import { Button, Card, Icon, Input, PageHeader, SectionTitle, erase, fmt } from './ui'

const KIND_LABEL = { tupper: 'Lotes de tapers', breakfast: 'Desayunos', snack: 'Meriendas', meal: 'Comidas' }
const KIND_UNIT = { tupper: ['lote', 'lotes'], breakfast: ['vez', 'veces'], snack: ['vez', 'veces'], meal: ['vez', 'veces'] }

// Cantidad legible: kg/g (o L/ml) y, si el alimento se compra por unidad chica, también en unidades
function quantity(food, grams) {
  const big = grams >= 1000
  const amount = food.liquid
    ? big ? `${fmt(grams / 1000, 2)} L` : `${fmt(grams)} ml`
    : big ? `${fmt(grams / 1000, 2)} kg` : `${fmt(grams)} g`
  const unit = food.unit && food.unit.grams <= 60 ? food.unit : null
  return unit ? `${amount} · ≈ ${Math.ceil(grams / unit.grams)} ${unit.label}${Math.ceil(grams / unit.grams) > 1 && !unit.label.endsWith('s') ? 's' : ''}` : amount
}

export default function ShoppingList({ favorites, prices, shopping, setShopping, setExpenses }) {
  const { foods, variants } = useFoods()
  const toast = useToast()
  const [extra, setExtra] = useState('')
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const plan = shopping.plan ?? {}
  const checked = shopping.checked ?? {}
  const extras = shopping.extras ?? []

  const set = (patch) => setShopping((s) => ({ ...s, ...patch }))
  const setTimes = (id, n) => set({ plan: { ...plan, [id]: Math.max(0, n) } })

  // Suma en crudo por alimento de todo lo planificado
  const items = useMemo(() => {
    const totals = new Map()
    for (const fav of favorites) {
      const times = plan[fav.id] ?? 0
      if (!times) continue
      const mult = fav.kind === 'tupper' ? (fav.portions ?? 5) * times : times
      for (const r of fav.rows) {
        const food = byId.get(r.foodId)
        if (!food) continue
        totals.set(food.id, (totals.get(food.id) ?? 0) + rawGrams(food, Number(r.grams) || 0, r.state ?? 'raw') * mult)
      }
    }
    return [...totals.entries()].map(([id, grams]) => {
      const food = byId.get(id)
      const ppg = pricePerGram(foodVariants(food)[0].label, prices, variants)
      return { id, food, grams, cost: ppg != null ? ppg * grams : null }
    })
  }, [favorites, plan, byId, prices, variants])

  const groups = FOOD_CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.food.category === c.id).sort((a, b) => a.food.name.localeCompare(b.food.name, 'es')) }))
    .filter((g) => g.items.length)
  const total = items.reduce((s, i) => s + (i.cost ?? 0), 0)
  const pending = items.filter((i) => !checked[i.id]).length + extras.filter((e) => !e.done).length

  const toggle = (id) => set({ checked: { ...checked, [id]: !checked[id] } })

  const copy = async () => {
    const lines = [
      `Lista de compras · Recomp 2027`,
      ...groups.flatMap((g) => [`\n${g.label}`, ...g.items.map((i) => `${checked[i.id] ? '✔' : '☐'} ${i.food.name.split(' (')[0]}: ${quantity(i.food, i.grams)}`)]),
      ...(extras.length ? ['\nOtros', ...extras.map((e) => `${e.done ? '✔' : '☐'} ${e.name}`)] : []),
      total ? `\nEstimado: ${money(total)}` : '',
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim())
      toast('Lista copiada: pegala en WhatsApp o en notas')
    } catch {
      toast('No se pudo copiar en este navegador')
    }
  }

  const registerExpense = () => {
    const expense = { id: uid(), createdAt: Date.now(), description: 'Compra semanal (lista)', amount: Math.round(total), date: todayKey(), month: todayKey().slice(0, 7), category: 'market' }
    setExpenses((prev) => [expense, ...prev])
    toast(`Gasto registrado: ${money(expense.amount)} (podés editarlo en Gastos)`, () => setExpenses((prev) => prev.filter((e) => e.id !== expense.id)))
  }

  const kinds = ['tupper', 'breakfast', 'snack', 'meal'].map((k) => ({ kind: k, items: favorites.filter((f) => f.kind === k) })).filter((k) => k.items.length)

  return (
    <div className="space-y-6">
      <PageHeader title="Compras">Elegí qué vas a preparar esta semana y la lista se arma sola, en crudo y con el costo estimado.</PageHeader>

      {kinds.length === 0 ? (
        <Card variant="ruled">
          <p className="text-sm text-zinc-400">Primero guardá plantillas en <b className="text-zinc-200">Crear</b> (tapers, desayunos o comidas). Después elegís acá cuántas veces las vas a preparar.</p>
        </Card>
      ) : (
        <Card variant="ruled">
          <SectionTitle>Qué vas a preparar</SectionTitle>
          <div className="space-y-4">
            {kinds.map(({ kind, items: favs }) => (
              <div key={kind}>
                <p className="mb-1.5 font-hand text-[21px] leading-none text-zinc-400">{KIND_LABEL[kind]}</p>
                <ul className="divide-y divide-dashed divide-white/[0.1]">
                  {favs.map((f) => {
                    const n = plan[f.id] ?? 0
                    return (
                      <li key={f.id} className="flex items-center gap-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] ${n ? 'text-zinc-50' : 'text-zinc-400'}`}>{f.name}</span>
                          {kind === 'tupper' && <span className="text-xs text-zinc-500">{f.portions ?? 5} tapers por lote</span>}
                        </span>
                        <div className="flex items-center rounded-xl border border-white/[0.1] bg-black/[0.18]">
                          <button className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-100" onClick={() => setTimes(f.id, n - 1)} aria-label={`Menos ${f.name}`}><Icon name="minus" className="h-4 w-4" /></button>
                          <span className="tabular w-8 text-center text-[15px] font-bold">{n}</span>
                          <button className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-100" onClick={() => setTimes(f.id, n + 1)} aria-label={`Más ${f.name}`}><Icon name="plus" className="h-4 w-4" /></button>
                        </div>
                        <span className="w-12 text-xs text-zinc-500">{KIND_UNIT[kind][n === 1 ? 0 : 1]}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card variant="ruled">
        <SectionTitle action={items.length > 0 && <span className="tabular text-xs text-zinc-400">{pending} por comprar</span>}>Lista</SectionTitle>
        {items.length === 0 && extras.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no planificaste nada. Sumá lotes o desayunos arriba.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.id}>
                <p className="mb-1 font-hand text-[21px] leading-none text-zinc-400">{g.label}</p>
                <ul className="divide-y divide-dashed divide-white/[0.1]">
                  {g.items.map((i) => (
                    <li key={i.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-2.5">
                        <input type="checkbox" className="h-5 w-5 shrink-0 accent-lime-400" checked={Boolean(checked[i.id])} onChange={() => toggle(i.id)} />
                        <span className="text-lg leading-none">{foodIconOf(i.food)}</span>
                        <span className={`min-w-0 flex-1 ${checked[i.id] ? 'text-zinc-600 line-through decoration-zinc-500' : ''}`}>
                          <span className="block truncate text-[15px]">{i.food.name.split(' (')[0]}</span>
                          <span className="tabular block text-xs text-zinc-500">{quantity(i.food, i.grams)}</span>
                        </span>
                        <span className="tabular shrink-0 text-sm text-zinc-300">{i.cost != null ? money(i.cost) : '—'}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {extras.length > 0 && (
              <div>
                <p className="mb-1 font-hand text-[21px] leading-none text-zinc-400">Otros</p>
                <ul className="divide-y divide-dashed divide-white/[0.1]">
                  {extras.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox" className="h-5 w-5 shrink-0 accent-lime-400" checked={e.done} aria-label={e.name}
                        onChange={() => set({ extras: extras.map((x) => (x.id === e.id ? { ...x, done: !x.done } : x)) })}
                      />
                      <span className={`min-w-0 flex-1 truncate text-[15px] ${e.done ? 'text-zinc-600 line-through' : ''}`}>{e.name}</span>
                      <Button variant="plain" size="icon" aria-label={`Quitar ${e.name}`} onClick={(ev) => erase(ev.currentTarget.closest('li'), () => set({ extras: extras.filter((x) => x.id !== e.id) }))}>
                        <Icon name="x" className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (extra.trim()) { set({ extras: [...extras, { id: uid(), name: extra.trim(), done: false }] }); setExtra('') } }}
        >
          <Input className="flex-1" placeholder="Agregar algo más (ej. papel de cocina)" value={extra} onChange={(e) => setExtra(e.target.value)} aria-label="Otro producto" />
          <Button type="submit" variant="ghost"><Icon name="plus" className="h-4 w-4" /> Sumar</Button>
        </form>

        {(items.length > 0 || extras.length > 0) && (
          <div className="mt-5 border-t border-dashed border-white/[0.14] pt-4">
            {total > 0 && (
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-hand text-[26px] text-zinc-300">Estimado</span>
                <span className="tabular text-2xl font-bold">{money(total)}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={copy}><Icon name="check" className="h-4 w-4" /> Copiar lista</Button>
              {total > 0 && <Button variant="ghost" onClick={registerExpense}><Icon name="wallet" className="h-4 w-4" /> Registrar el gasto</Button>}
              <Button variant="plain" onClick={() => set({ checked: {}, extras: extras.map((e) => ({ ...e, done: false })) })}>Destildar todo</Button>
              <Button variant="plain" onClick={() => set({ plan: {}, checked: {}, extras: [] })}>Empezar de cero</Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Precios orientativos de Alimentos (o los tuyos de Gastos). Ajustá el gasto real después de pagar.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
