import { useMemo, useState } from 'react'
import {
  FOOD_CATEGORIES, NUTRIENTS, PRICE_SOURCES, PRICES_UPDATED, categoryOf, foodPricePerGram, foodVariants,
  hasStates, isCookable, nutrientsFor, per100, pricePerKg, proteinCost, stateLabel, stateOf,
} from '../lib/foods'
import StatePicker from './StatePicker'
import { useFoods } from '../lib/foodsContext'
import { DEFAULT_ICON, detectIcon } from '../lib/icons'
import { uid } from '../lib/model'
import { CURRENCY, money } from '../lib/prices'
import { Button, Card, Icon, Input, SectionTitle, Select, fmt, num } from './ui'
import CustomFoodForm from './CustomFoodForm'
import BarcodeLookup from './Barcode'

const SORTS = [
  { value: 'name', label: 'Nombre' },
  { value: 'protein', label: 'Más proteína' },
  { value: 'cheapProtein', label: 'Proteína más barata' },
  { value: 'fiber', label: 'Más fibra' },
  { value: 'price', label: 'Precio por kg' },
]

// Porciones de la calculadora
const PORTIONS = [1, 20, 50, 100, 200, 250]

export const foodIcon = (food) => {
  const i = detectIcon(food.name)
  return i !== DEFAULT_ICON ? i : categoryOf(food.category).icon
}

// "1 huevo", "2 huevos", "2 × media palta"
const unitLabel = (label, k) =>
  k === 1 ? `1 ${label}` : label.includes(' ') ? `${k} × ${label}` : `${k} ${label}${label.endsWith('s') ? '' : 's'}`

// "$U 330 / maple 30"
const priceText = (food) => (food.price?.uyu ? `${money(food.price.uyu)} / ${food.price.per}` : 'Sin precio')

export default function Foods({ date, addMeal, addToBuilder, createLabel = 'taper', foodState, setFoodState, addCustomFood, goToBuilder }) {
  const { foods } = useFoods()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('name')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const norm = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const nq = norm(q)
    const filtered = foods.filter((f) => (cat === 'all' || f.category === cat)
      && (!q || norm(f.name).includes(nq) || (f.aliases ?? []).some((x) => norm(x).includes(nq))))
    const by = {
      name: (a, b) => a.name.localeCompare(b.name, 'es'),
      protein: (a, b) => b.perGram.protein - a.perGram.protein,
      cheapProtein: (a, b) => (proteinCost(a) ?? Infinity) - (proteinCost(b) ?? Infinity),
      fiber: (a, b) => b.perGram.fiber - a.perGram.fiber,
      price: (a, b) => (pricePerKg(a) ?? Infinity) - (pricePerKg(b) ?? Infinity),
    }
    return [...filtered].sort(by[sort])
  }, [foods, query, cat, sort])

  const selected = foods.find((f) => f.id === selectedId)

  const saveCustom = (food) => {
    setFoodState((s) => ({ ...s, custom: [...(s.custom ?? []), { ...food, id: `custom-${uid()}` }] }))
    setCreating(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-hand text-[40px] font-bold leading-[0.9] text-zinc-50">Alimentos</h1>
          <p className="text-xs text-zinc-500">{foods.length} alimentos · precios en {CURRENCY} · referencia {PRICES_UPDATED}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setScanning((s) => !s); setCreating(false) }}><Icon name="barcode" className="h-4 w-4" /> Código de barras</Button>
          <Button onClick={() => { setCreating(true); setScanning(false) }}><Icon name="plus" className="h-4 w-4" /> Nuevo alimento</Button>
        </div>
      </div>

      {scanning && (
        <BarcodeLookup
          foods={foods} onSave={addCustomFood} onUse={(f) => { setSelectedId(f.id); setQuery('') }} onClose={() => setScanning(false)} useLabel="Ver ficha"
        />
      )}

      <PriceAdjust factor={foodState.priceFactor ?? 1} setFoodState={setFoodState} />

      {creating && <CustomFoodForm onSave={saveCustom} onCancel={() => setCreating(false)} />}

      <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
        <Input prefix="🔎" placeholder="Buscar: cuadrada, pollo, avena…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ id: 'all', label: 'Todos', icon: '🍽️' }, ...FOOD_CATEGORIES].map((c) => (
          <button
            key={c.id} onClick={() => setCat(c.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              cat === c.id ? 'border-accent/50 bg-accent/10 text-zinc-100' : 'border-white/[0.06] bg-ink-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm leading-none">{c.icon}</span>{c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="!p-2">
          {list.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No hay alimentos que coincidan.</p>}
          <ul>
            {list.map((food) => {
              const p = per100(food)
              return (
                <li key={food.id}>
                  <button
                    onClick={() => setSelectedId(food.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                      selectedId === food.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl leading-none">{foodIcon(food)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {food.name}
                        {food.custom && <span className="ml-1.5 rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-zinc-400">propio</span>}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        100 g{hasStates(food) ? ` ${stateLabel(food, 'raw')}` : ''}: {fmt(p.kcal)} kcal · <span className="text-sky-300">{fmt(p.protein, 1)} g prot</span>
                        {p.fiber > 0 && <> · {fmt(p.fiber, 1)} g fibra</>}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{food.price?.uyu ? money(food.price.uyu) : '—'}</p>
                      <p className="max-w-24 truncate text-[11px] text-zinc-500">{food.price ? `/ ${food.price.per}` : ''}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {selected ? (
            <FoodDetail
              key={selected.id}
              food={selected}
              onClose={() => setSelectedId(null)}
              onAddToday={(meal) => addMeal(date, meal)}
              onAddToBuilder={addToBuilder}
              createLabel={createLabel}
              goToBuilder={goToBuilder}
              setFoodState={setFoodState}
            />
          ) : (
            <Card className="hidden text-center text-sm text-zinc-500 lg:block">
              <p className="text-3xl">🥗</p>
              <p className="mt-2">Elegí un alimento para calcular calorías, proteínas, grasas, carbohidratos y fibra de cualquier porción, en crudo o en cocido.</p>
            </Card>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-600">{PRICE_SOURCES} Nutrientes por gramo según USDA y tablas latinoamericanas.</p>
    </div>
  )
}

// Ajuste general de todos los precios de la base (inflación); no toca los precios editados a mano
function PriceAdjust({ factor, setFoodState }) {
  const [open, setOpen] = useState(false)
  const [pct, setPct] = useState('')
  const pctNow = Math.round((factor - 1) * 1000) / 10

  const apply = (e) => {
    e.preventDefault()
    const v = num(pct)
    if (v == null) return
    setFoodState((s) => ({ ...s, priceFactor: (s.priceFactor ?? 1) * (1 + v / 100) }))
    setPct('')
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/[0.16] px-3 py-2 text-xs text-zinc-400">
      <span>💱 Precios base {pctNow ? <b className="text-zinc-200">{pctNow > 0 ? '+' : ''}{fmt(pctNow, 1)}%</b> : 'sin ajustar'}</span>
      {open ? (
        <form onSubmit={apply} className="ml-auto flex items-center gap-2">
          <Input className="w-28" type="number" inputMode="decimal" placeholder="ej. 5" suffix="%" value={pct} onChange={(e) => setPct(e.target.value)} autoFocus />
          <Button size="sm" type="submit">Aplicar</Button>
          <Button size="sm" variant="plain" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
        </form>
      ) : (
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Ajustar precios</Button>
          {pctNow !== 0 && (
            <Button size="sm" variant="plain" onClick={() => setFoodState((s) => ({ ...s, priceFactor: 1 }))}>Restablecer</Button>
          )}
        </div>
      )}
    </div>
  )
}

function FoodDetail({ food, onClose, onAddToday, onAddToBuilder, createLabel, goToBuilder, setFoodState }) {
  const cookable = isCookable(food)
  const [state, setState] = useState('raw')
  const [grams, setGrams] = useState(String(food.unit?.grams ?? 100))
  const [editingPrice, setEditingPrice] = useState(false)
  const [price, setPrice] = useState(String(food.price?.uyu ?? ''))
  const [flash, setFlash] = useState('')

  const g = num(grams) ?? 0
  const n = nutrientsFor(food, g, state)
  const ppg = foodPricePerGram(food, state)
  const cost = ppg != null ? ppg * g : null
  const variant = foodVariants(food).find((v) => v.state === state) ?? foodVariants(food)[0]
  const macroKcal = { protein: n.protein * 4, carbs: n.carbs * 4, fat: n.fat * 9 }
  const macroTotal = macroKcal.protein + macroKcal.carbs + macroKcal.fat
  // Equivalencia crudo ↔ cocido (solo para esos dos estados)
  const showEquiv = cookable && (state === 'raw' || state === 'cooked')
  const otherGrams = showEquiv ? (state === 'raw' ? g * food.cook : g / food.cook) : null
  const stateTxt = hasStates(food) ? stateLabel(food, state) : ''
  const uw = food.liquid ? 'ml' : 'g'
  const stateNote = stateOf(food, state).note

  const notify = (t) => { setFlash(t); setTimeout(() => setFlash(''), 2500) }

  const savePrice = () => {
    const v = num(price)
    if (v == null || v < 0) return
    setFoodState((s) => food.custom
      ? { ...s, custom: s.custom.map((c) => (c.id === food.id ? { ...c, price: { ...c.price, uyu: v } } : c)) }
      : { ...s, edits: { ...s.edits, [food.id]: { uyu: v } } })
    setEditingPrice(false)
  }
  const resetPrice = () =>
    setFoodState((s) => {
      const { [food.id]: _, ...edits } = s.edits ?? {}
      return { ...s, edits }
    })
  const removeCustom = () => {
    if (!confirm(`¿Eliminar "${food.name}"?`)) return
    setFoodState((s) => ({ ...s, custom: s.custom.filter((c) => c.id !== food.id) }))
    onClose()
  }

  const addToday = () => {
    onAddToday({
      name: `${variant.label} · ${fmt(g)} ${uw}`, icon: foodIcon(food), kind: 'extra',
      kcal: Math.round(n.kcal), protein: Math.round(n.protein * 10) / 10,
      fat: Math.round(n.fat * 10) / 10, carbs: Math.round(n.carbs * 10) / 10, cost,
      foodRef: { foodId: food.id, state, grams: g },
    })
    notify('Añadido a tus comidas de hoy')
  }
  const addBuilder = () => {
    onAddToBuilder({ foodId: food.id, state, grams: String(Math.round(g)) })
    notify(`Añadido a tu ${createLabel} en Crear`)
  }

  const quick = [
    ...(food.unit ? [1, 2, 3].map((k) => ({ g: food.unit.grams * k, label: unitLabel(food.unit.label, k) })) : []),
    ...PORTIONS.map((x) => ({ g: x, label: `${x} ${uw}` })),
  ]

  return (
    // En móvil se abre a pantalla completa; en escritorio es un panel lateral
    <div className="drawer-in fixed inset-0 z-40 overflow-y-auto bg-ink-950 p-4 pb-10 lg:static lg:z-auto lg:animate-none lg:overflow-visible lg:bg-transparent lg:p-0">
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-2xl leading-none">{foodIcon(food)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-tight">{food.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{categoryOf(food.category).label} · {priceText(food)}</p>
            {food.aliases?.length > 0 && <p className="mt-0.5 text-xs text-zinc-500">También: {food.aliases.join(', ')}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><Icon name="x" className="h-4 w-4" /></Button>
        </div>

        {hasStates(food) && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs text-zinc-400">{cookable ? '¿Cómo lo pesás?' : 'Preparación'}</p>
            <StatePicker food={food} value={state} onChange={setState} />
            {stateNote && <p className="mt-1.5 text-xs text-zinc-500">{stateNote}</p>}
          </div>
        )}

        {/* Calculadora de porciones */}
        <div className="mt-4">
          <Input label="Peso de la porción" type="number" inputMode="decimal" suffix={`${uw} ${stateTxt}`} value={grams} onChange={(e) => setGrams(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1">
            {quick.map((q) => (
              <button
                key={q.label} onClick={() => setGrams(String(q.g))}
                className={`rounded-lg px-2 py-1 text-[11px] transition-colors ${g === q.g ? 'bg-white/[0.1] text-zinc-100' : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-200'}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Big value={fmt(n.kcal)} label="calorías (kcal)" />
          <Big value={`${fmt(n.protein, 1)} g`} label="proteínas" tone="text-sky-300" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Big value={`${fmt(n.fat, 1)} g`} label="grasas" small />
          <Big value={`${fmt(n.carbs, 1)} g`} label="carbohidratos" small />
          <Big value={`${fmt(n.fiber, 1)} g`} label="fibra" small tone="text-lime-200" />
        </div>

        {macroTotal > 0 && (
          <div className="mt-3">
            <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
              <div className="bg-sky-400" style={{ width: `${(macroKcal.protein / macroTotal) * 100}%` }} />
              <div className="bg-amber-400" style={{ width: `${(macroKcal.carbs / macroTotal) * 100}%` }} />
              <div className="bg-pink-400" style={{ width: `${(macroKcal.fat / macroTotal) * 100}%` }} />
            </div>
            <p className="mt-1.5 flex gap-3 text-[11px] text-zinc-500">
              <span><span className="text-sky-300">●</span> Prot {fmt((macroKcal.protein / macroTotal) * 100)}%</span>
              <span><span className="text-amber-300">●</span> Carb {fmt((macroKcal.carbs / macroTotal) * 100)}%</span>
              <span><span className="text-pink-300">●</span> Grasa {fmt((macroKcal.fat / macroTotal) * 100)}%</span>
            </p>
          </div>
        )}

        {showEquiv && g > 0 && (
          <p className="mt-3 rounded-xl bg-black/[0.16] px-3 py-2.5 text-sm text-zinc-300">
            {fmt(g)} g {stateLabel(food, state)} ≈ <b>{fmt(otherGrams)} g {stateLabel(food, state === 'raw' ? 'cooked' : 'raw')}</b>
            <span className="block text-xs text-zinc-500">Los nutrientes son los mismos; cambia el peso por el agua.</span>
          </p>
        )}

        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label={`Costo estimado de ${fmt(g)} ${uw}`} value={money(cost)} />
          <Row label="Cada 100 g de proteína cuestan" value={money(proteinCost(food))} />
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={addToday} disabled={g <= 0}><Icon name="check" className="h-4 w-4" /> Añadir a hoy</Button>
          <Button variant="ghost" onClick={addBuilder} disabled={g <= 0}><Icon name="bowl" className="h-4 w-4" /> A mi {createLabel}</Button>
        </div>
        {flash && (
          <p className="mt-2 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            <Icon name="check" className="h-4 w-4" /> {flash}
            {flash.includes('Crear') && <button className="ml-auto text-xs underline" onClick={goToBuilder}>Ver</button>}
          </p>
        )}
      </Card>

      <Card className="mt-4">
        <SectionTitle>Porciones comunes {stateTxt && `(${stateTxt})`}</SectionTitle>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead className="text-right text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-1 py-1.5 text-left font-normal">Peso</th>
                <th className="px-1 py-1.5 font-normal">kcal</th>
                <th className="px-1 py-1.5 font-normal">Prot</th>
                <th className="px-1 py-1.5 font-normal">Grasa</th>
                <th className="px-1 py-1.5 font-normal">Carb</th>
                <th className="px-1 py-1.5 font-normal">Fibra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-right">
              {PORTIONS.map((x) => {
                const r = nutrientsFor(food, x, state)
                const d = x === 1 ? 3 : 1
                return (
                  <tr key={x} onClick={() => setGrams(String(x))} className={`cursor-pointer hover:bg-white/[0.03] ${g === x ? 'text-accent' : ''}`}>
                    <td className="px-1 py-2 text-left text-zinc-400">{x} {uw}</td>
                    <td className="px-1 py-2">{fmt(r.kcal, x === 1 ? 2 : 0)}</td>
                    <td className="px-1 py-2 text-sky-300">{fmt(r.protein, d)}</td>
                    <td className="px-1 py-2">{fmt(r.fat, d)}</td>
                    <td className="px-1 py-2">{fmt(r.carbs, d)}</td>
                    <td className="px-1 py-2">{fmt(r.fiber, d)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500">La fila de 1 g es el valor base de la tabla: cualquier porción = valor × gramos.</p>
      </Card>

      <Card className="mt-4">
        <SectionTitle>Precio promedio en Uruguay</SectionTitle>
        {editingPrice ? (
          <div className="flex items-end gap-2">
            <Input className="flex-1" label={`Precio por ${food.price?.per ?? 'kg'}`} type="number" inputMode="decimal" suffix={CURRENCY} value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
            <Button onClick={savePrice}>Guardar</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <b>{priceText(food)}</b>
              {food.priceEdited && <span className="ml-2 text-xs text-amber-300/80">editado</span>}
              {food.price && (food.price.per !== 'kg' || food.price.grams !== 1000) && pricePerKg(food) && (
                <p className="text-xs text-zinc-500">≈ {money(pricePerKg(food))} por kg comestible</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingPrice(true)}><Icon name="edit" className="h-3.5 w-3.5" /> Cambiar</Button>
              {food.priceEdited && <Button variant="plain" size="sm" onClick={resetPrice}>Restaurar</Button>}
              {food.custom && <Button variant="danger" size="sm" onClick={removeCustom}>Eliminar</Button>}
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          {food.price?.ref && <>Referencia: {food.price.ref}. </>}
          {food.note && <>{food.note} </>}
          {food.barcode && <>Código {food.barcode} · datos de {food.source ?? 'Open Food Facts'}. </>}
          Este precio calcula el costo de tus tapers y lotes.
        </p>
      </Card>
    </div>
  )
}

function Big({ value, label, tone = 'text-zinc-50', small }) {
  return (
    <div className="rounded-xl bg-black/[0.16] p-3">
      <p className={`${small ? 'text-lg' : 'text-2xl'} font-bold tracking-tight ${tone}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
