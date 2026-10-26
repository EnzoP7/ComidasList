import { useMemo, useState } from 'react'
import { findVariant } from '../lib/foods'
import { useFoods } from '../lib/foodsContext'
import { DEFAULT_ICON, detectIcon } from '../lib/icons'
import { uid } from '../lib/model'
import { lastNDays } from '../lib/date'
import {
  CATEGORIES, CURRENCY, PERIODS, SAMPLE_PRICES, UNITS, categoryOf, compatibleUnits, money, monthlyCost,
  periodOf, unitOf, unitPrice,
} from '../lib/prices'
import { Button, Card, Icon, Input, SectionTitle, Select, fmt, num } from './ui'

const itemIcon = (item) => {
  const i = detectIcon(item.name)
  return i !== DEFAULT_ICON ? i : categoryOf(item.category).icon
}

export default function Prices({ prices, setPrices, logs }) {
  const { variants } = useFoods()
  const [editing, setEditing] = useState(null) // null | 'new' | item.id

  const total = prices.reduce((s, p) => s + monthlyCost(p), 0)
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    items: prices.filter((p) => p.category === c.id),
    monthly: prices.filter((p) => p.category === c.id).reduce((s, p) => s + monthlyCost(p), 0),
  }))

  // Gasto real en tuppers comidos en los últimos 30 días (coste guardado al comerlos)
  const tupperSpend = lastNDays(30).reduce(
    (s, k) => s + (logs[k]?.meals ?? []).reduce((a, m) => a + (m.cost || 0), 0),
    0,
  )

  // Ranking de proteína más barata: precio por 100 g de proteína
  const proteinRank = useMemo(
    () =>
      prices
        .map((p) => {
          const v = findVariant(p.name, variants)
          const up = unitPrice(p)
          if (!v?.protein || up == null || unitOf(p.packUnit).base !== 'g') return null
          return { id: p.id, name: p.name, icon: itemIcon(p), per100: up * (100 / (v.protein / 100)) }
        })
        .filter(Boolean)
        .sort((a, b) => a.per100 - b.per100),
    [prices, variants],
  )

  const save = (item) => {
    if (editing === 'new') setPrices((prev) => [...prev, { ...item, id: uid() }])
    else setPrices((prev) => prev.map((p) => (p.id === editing ? { ...p, ...item } : p)))
    setEditing(null)
  }

  const remove = (id) => {
    if (confirm('¿Eliminar este gasto?')) setPrices((prev) => prev.filter((p) => p.id !== id))
  }

  const loadSamples = () => setPrices((prev) => [...prev, ...SAMPLE_PRICES.map((p) => ({ ...p, id: uid() }))])

  return (
    <div className="space-y-4">
      {/* Resumen mensual */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">Presupuesto mensual estimado</p>
            <p className="mt-1 text-5xl font-bold tracking-tight">{money(total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-5 text-right text-sm">
            <div><p className="text-[11px] text-zinc-500">Por día</p><p className="font-medium">{money(total / 30.44)}</p></div>
            <div><p className="text-[11px] text-zinc-500">Por año</p><p className="font-medium">{money(total * 12)}</p></div>
          </div>
        </div>

        {total > 0 && (
          <>
            <div className="mt-5 flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
              {byCategory.filter((c) => c.monthly > 0).map((c) => (
                <div key={c.id} style={{ width: `${(c.monthly / total) * 100}%`, background: c.color }} title={c.label} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {byCategory.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="truncate text-zinc-400">{c.label}</span>
                  <span className="ml-auto font-medium">{money(c.monthly)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="mt-4 text-xs text-zinc-500">
          Se calcula con el precio de cada producto y lo que consumes (por día, semana o mes), más las cuotas fijas.
          {tupperSpend > 0 && <> Coste real de los tuppers comidos en los últimos 30 días: <span className="text-zinc-300">{money(tupperSpend)}</span>.</>}
        </p>
      </Card>

      {editing ? (
        <PriceForm
          key={editing}
          initial={prices.find((p) => p.id === editing)}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing('new')}><Icon name="plus" className="h-4 w-4" /> Añadir producto o cuota</Button>
          {prices.length === 0 && <Button variant="ghost" onClick={loadSamples}>Cargar ejemplos</Button>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {prices.length === 0 && !editing && (
            <Card className="text-center text-sm text-zinc-400">
              Añade lo que compras (pollo, arroz, whey, creatina…) y tus cuotas (gimnasio, apps).
              <p className="mt-1 text-xs text-zinc-500">Si usas el mismo nombre que en tus recetas, cada tupper mostrará su coste.</p>
            </Card>
          )}

          {byCategory.filter((c) => c.items.length).map((c) => (
            <Card key={c.id}>
              <SectionTitle action={<span className="text-sm font-medium text-zinc-300">{money(c.monthly)}/mes</span>}>
                {c.icon} {c.label}
              </SectionTitle>
              <ul className="divide-y divide-white/[0.05]">
                {c.items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl leading-none">{itemIcon(p)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-zinc-500">{describe(p)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{money(monthlyCost(p))}</p>
                      <p className="text-[11px] text-zinc-500">al mes</p>
                    </div>
                    <div className="flex shrink-0">
                      <Button variant="plain" size="icon" onClick={() => setEditing(p.id)} aria-label="Editar"><Icon name="edit" className="h-4 w-4" /></Button>
                      <Button variant="plain" size="icon" onClick={() => remove(p.id)} aria-label="Eliminar"><Icon name="trash" className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {proteinRank.length > 0 && (
          <Card className="h-fit">
            <SectionTitle>Proteína más barata</SectionTitle>
            <p className="-mt-1 mb-3 text-xs text-zinc-500">Precio por cada 100 g de proteína</p>
            <ol className="space-y-2">
              {proteinRank.map((r, i) => (
                <li key={r.id} className="flex items-center gap-2.5 text-sm">
                  <span className="w-4 text-xs text-zinc-600">{i + 1}</span>
                  <span className="text-base leading-none">{r.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{r.name}</span>
                  <span className={`font-medium ${i === 0 ? 'text-accent' : ''}`}>{money(r.per100)}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  )
}

function describe(p) {
  if (p.type === 'subscription') return `${money(p.price)} / ${periodOf(p.period).label}`
  const pack = `${money(p.price)} · ${fmt(p.packSize, 2)} ${unitOf(p.packUnit).label}`
  const up = unitPrice(p)
  const base = unitOf(p.packUnit).base
  const perUnit = base === 'ud' ? `${money(up)}/ud` : `${money(up * 1000)}/${base === 'g' ? 'kg' : 'L'}`
  const usage = p.usage ? ` · usas ${fmt(p.usage, 2)} ${unitOf(p.usageUnit).label}/${periodOf(p.usagePeriod).label}` : ' · sin consumo definido'
  return `${pack} (${perUnit})${usage}`
}

const s = (v) => (v == null ? '' : String(v))

function PriceForm({ initial, onSave, onCancel }) {
  const { variants } = useFoods()
  const [d, setD] = useState(() => ({
    name: initial?.name ?? '',
    category: initial?.category ?? 'food',
    type: initial?.type ?? 'product',
    price: s(initial?.price),
    packSize: s(initial?.packSize ?? 1),
    packUnit: initial?.packUnit ?? 'kg',
    usage: s(initial?.usage),
    usageUnit: initial?.usageUnit ?? 'g',
    usagePeriod: initial?.usagePeriod ?? 'week',
    period: initial?.period ?? 'month',
  }))
  const set = (patch) => setD((prev) => ({ ...prev, ...patch }))

  const setPackUnit = (packUnit) => {
    const ok = compatibleUnits(packUnit).some((u) => u.id === d.usageUnit)
    set({ packUnit, usageUnit: ok ? d.usageUnit : compatibleUnits(packUnit).at(-1).id })
  }

  const item = {
    name: d.name.trim(),
    category: d.category,
    type: d.type,
    price: num(d.price) ?? 0,
    ...(d.type === 'product'
      ? { packSize: num(d.packSize) ?? 1, packUnit: d.packUnit, usage: num(d.usage), usageUnit: d.usageUnit, usagePeriod: d.usagePeriod }
      : { period: d.period }),
  }
  const valid = item.name && item.price > 0 && (d.type === 'subscription' || item.packSize > 0)
  const icon = detectIcon(d.name)

  return (
    <Card className="border-accent/20">
      <SectionTitle>{initial ? 'Editar gasto' : 'Nuevo gasto'}</SectionTitle>
      <form onSubmit={(e) => { e.preventDefault(); if (valid) onSave(item) }} className="space-y-4">
        <div className="inline-flex rounded-xl border border-dashed border-white/[0.16] p-1 text-sm">
          {[['product', 'Producto (paquete)'], ['subscription', 'Cuota fija']].map(([id, label]) => (
            <button
              key={id} type="button"
              onClick={() => set({ type: id, category: id === 'subscription' && d.category === 'food' ? 'gym' : d.category })}
              className={`rounded-lg px-3 py-1.5 transition-colors ${d.type === id ? 'bg-white/[0.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
          <Input
            label="Nombre" list="price-foods" autoFocus
            prefix={icon !== DEFAULT_ICON ? icon : categoryOf(d.category).icon}
            placeholder={d.type === 'product' ? 'Pechuga de pollo (cruda)' : 'Cuota del gimnasio'}
            value={d.name} onChange={(e) => set({ name: e.target.value })}
          />
          <Select
            label="Categoría" value={d.category} onChange={(e) => set({ category: e.target.value })}
            options={CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon} ${c.label}` }))}
          />
          <datalist id="price-foods">{variants.map((v) => <option key={v.label} value={v.label} />)}</datalist>
        </div>

        {d.type === 'product' ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Input label="Precio del paquete" type="number" inputMode="decimal" suffix={CURRENCY} value={d.price} onChange={(e) => set({ price: e.target.value })} />
              <Input label="Contenido" type="number" inputMode="decimal" value={d.packSize} onChange={(e) => set({ packSize: e.target.value })} />
              <Select label="Unidad" value={d.packUnit} onChange={(e) => setPackUnit(e.target.value)} options={UNITS.map((u) => ({ value: u.id, label: u.label }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input label="Consumo" type="number" inputMode="decimal" placeholder="opcional" value={d.usage} onChange={(e) => set({ usage: e.target.value })} />
              <Select label="Unidad" value={d.usageUnit} onChange={(e) => set({ usageUnit: e.target.value })} options={compatibleUnits(d.packUnit).map((u) => ({ value: u.id, label: u.label }))} />
              <Select label="Cada" value={d.usagePeriod} onChange={(e) => set({ usagePeriod: e.target.value })} options={PERIODS.slice(0, 3).map((p) => ({ value: p.id, label: p.label }))} />
            </div>
            <p className="text-xs text-zinc-500">
              Ej.: whey $U 2.400 por 1 kg, consumo 30 g cada día. Usa el mismo nombre que el ingrediente de tus recetas para calcular el coste por tupper.
            </p>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Input label="Importe" type="number" inputMode="decimal" suffix={CURRENCY} value={d.price} onChange={(e) => set({ price: e.target.value })} />
            <Select label="Cada" value={d.period} onChange={(e) => set({ period: e.target.value })} options={PERIODS.map((p) => ({ value: p.id, label: p.label }))} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/[0.16] px-4 py-3">
          <p className="text-sm">
            <span className="text-zinc-500">Al mes: </span>
            <b>{money(monthlyCost(item))}</b>
            {d.type === 'product' && unitPrice(item) != null && unitOf(d.packUnit).base !== 'ud' && (
              <span className="text-zinc-500"> · {money(unitPrice(item) * 1000)}/{unitOf(d.packUnit).base === 'g' ? 'kg' : 'L'}</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={!valid}>Guardar</Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
