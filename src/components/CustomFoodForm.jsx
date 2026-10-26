import { useState } from 'react'
import { FOOD_CATEGORIES, NUTRIENTS } from '../lib/foods'
import { detectIcon } from '../lib/icons'
import { CURRENCY } from '../lib/prices'
import { Button, Card, Input, SectionTitle, Select, num } from './ui'

const FORMS = [
  { value: 'm', label: 'crudo / cocido' },
  { value: 'f', label: 'cruda / cocida' },
  { value: 'mp', label: 'crudos / cocidos' },
  { value: 'fp', label: 'crudas / cocidas' },
]

const str = (v) => (v == null ? '' : String(v).replace('.', ','))

/**
 * Alimento propio con valores por 100 g (como la etiqueta). `initial` permite precargarlo,
 * por ejemplo desde un código de barras; `missing` marca los valores que hay que completar.
 */
export default function CustomFoodForm({ onSave, onCancel, initial = {}, title = 'Nuevo alimento', missing = [], note }) {
  const [d, setD] = useState({
    name: initial.name ?? '', category: initial.category ?? 'meat',
    kcal: str(initial.kcal), protein: str(initial.protein), fat: str(initial.fat), carbs: str(initial.carbs), fiber: str(initial.fiber),
    cook: '', forms: 'm',
    uyu: '', per: initial.pack?.per ?? 'kg', grams: str(initial.pack?.grams ?? 1000),
    unitLabel: initial.unit?.label ?? '', unitGrams: str(initial.unit?.grams),
  })
  const set = (patch) => setD((prev) => ({ ...prev, ...patch }))
  const valid = d.name.trim() && num(d.kcal) != null && num(d.protein) != null
  const unitWord = initial.liquid ? 'ml' : 'g'

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    // El formulario pide valores por 100 g (como la etiqueta) y se guardan por 1 g
    const perGram = Object.fromEntries(NUTRIENTS.map(({ key }) => [key, (num(d[key]) ?? 0) / 100]))
    onSave({
      name: d.name.trim(), category: d.category, forms: d.forms, cook: num(d.cook), perGram,
      price: num(d.uyu) ? { uyu: num(d.uyu), per: d.per.trim() || 'kg', grams: num(d.grams) ?? 1000, ref: 'precio propio' } : null,
      unit: d.unitLabel.trim() && num(d.unitGrams) ? { label: d.unitLabel.trim(), grams: num(d.unitGrams) } : undefined,
      ...(initial.liquid && { liquid: true }),
      ...(initial.barcode && { barcode: initial.barcode, source: initial.source ?? 'Open Food Facts' }),
    })
  }

  return (
    <Card className="border-accent/20">
      <SectionTitle>{title}</SectionTitle>
      {note}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
          <Input label="Nombre (sin crudo/cocido)" prefix={detectIcon(d.name)} placeholder="Ej. Muslo de pollo" value={d.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!initial.name} />
          <Select label="Categoría" value={d.category} onChange={(e) => set({ category: e.target.value })}
            options={FOOD_CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon} ${c.label}` }))} />
        </div>
        <p className="text-xs text-zinc-500">Valores por 100 {unitWord} tal como lo comprás (en crudo), como en la etiqueta. La app los guarda por gramo.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {NUTRIENTS.map(({ key, label, unit }) => (
            <div key={key}>
              <Input label={label} suffix={unit} type="text" inputMode="decimal" value={d[key]} onChange={(e) => set({ [key]: e.target.value })} />
              {missing.includes(key) && !d[key] && <p className="mt-1 text-[11px] text-amber-300">falta: copialo de la etiqueta</p>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input label="Precio" suffix={CURRENCY} type="number" inputMode="decimal" value={d.uyu} onChange={(e) => set({ uyu: e.target.value })} />
          <Input label="Por (unidad)" placeholder="kg, litro, pack…" value={d.per} onChange={(e) => set({ per: e.target.value })} />
          <Input label="Gramos que trae" suffix="g" type="text" inputMode="decimal" value={d.grams} onChange={(e) => set({ grams: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input label="Factor de cocción" placeholder="ej. 2,8" type="text" inputMode="decimal" value={d.cook} onChange={(e) => set({ cook: e.target.value })} />
          <Input label="Porción (nombre)" placeholder="ej. scoop" value={d.unitLabel} onChange={(e) => set({ unitLabel: e.target.value })} />
          <Input label="Porción (gramos)" suffix={unitWord} type="text" inputMode="decimal" value={d.unitGrams} onChange={(e) => set({ unitGrams: e.target.value })} />
        </div>
        {num(d.cook) != null && (
          <Select label="Se dice" value={d.forms} onChange={(e) => set({ forms: e.target.value })} options={FORMS} />
        )}
        <p className="text-xs text-zinc-500">
          Factor de cocción = peso cocido ÷ peso crudo. Arroz ≈ 2,8 · fideos ≈ 2,3 · lentejas ≈ 2,5 · pollo y carne ≈ 0,75. Vacío si no se cocina.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={!valid}>Guardar alimento</Button>
        </div>
      </form>
    </Card>
  )
}
