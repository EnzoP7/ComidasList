import { useMemo, useRef, useState } from 'react'
import { useFoods } from '../lib/foodsContext'
import { recipeIcon } from '../lib/icons'
import { computeRows, mealEntry } from '../lib/meals'
import { uid } from '../lib/model'
import { money } from '../lib/prices'
import { buildTemplatesExport, parseTemplatesImport } from '../lib/templatesExport'
import MealSheet from './MealSheet'
import { MODES, adviceFor, batchRecipe, foodIconOf, groupFor } from './MealBuilder'
import { useToast } from './Toast'
import { Button, Icon, Input, PageHeader, fmt } from './ui'

const ORDER = ['tupper', 'breakfast', 'snack', 'meal']
const SECTION = { tupper: 'Tapers', breakfast: 'Desayunos', snack: 'Meriendas', meal: 'Comidas libres' }
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Todas las plantillas guardadas, separadas por categoría.
 * Tocar una abre su ficha completa; desde ahí se come, se cocina, se edita, se duplica o se borra.
 */
export default function Templates({ favorites, settings, prices, date, addMeal, saveRecipe, saveFavorite, removeFavorite, openInCreate, openCreate }) {
  const { foods, variants } = useFoods()
  const toast = useToast()
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)

  const targetFor = (mode) => ({
    kcal: settings.calorieGoal * mode.share,
    protein: settings.proteinGoal * mode.share,
    carbs: (settings.carbsGoal ?? 0) * mode.share,
    fat: (settings.fatGoal ?? 0) * mode.share,
  })

  // Mismos cálculos que en Crear: macros, costo, ícono y consejo de cada plantilla
  const analyzed = useMemo(() => favorites.map((fav) => {
    const mode = MODES[fav.kind] ?? MODES.meal
    const c = computeRows(fav.rows, byId, prices, variants)
    const rows = c.rows.map((r) => ({ ...r, group: groupFor(mode.groups, r.food) }))
    const icon = c.filled.length ? recipeIcon({ name: fav.name, ingredients: c.filled.map((r) => ({ name: r.variant.label })) }) : mode.icon
    return { fav, mode, data: { ...c, rows, name: fav.name, icon, advice: adviceFor(rows, c.total, targetFor(mode), mode) } }
  }), [favorites, byId, prices, variants, settings])

  const q = normalize(query.trim())
  const visible = analyzed.filter(({ fav, data }) =>
    (filter === 'all' || fav.kind === filter)
    && (!q || normalize(fav.name).includes(q) || data.filled.some((r) => normalize(r.food.name).includes(q))))
  const groups = ORDER.map((k) => ({ kind: k, items: visible.filter((a) => a.fav.kind === k) })).filter((g) => filter === 'all' ? g.items.length : g.kind === filter)
  const count = (k) => favorites.filter((f) => f.kind === k).length

  const act = ({ fav, mode, data }) => {
    if (mode.batch) {
      const n = fav.portions ?? 5
      saveRecipe(batchRecipe(fav.name, data, n), null)
      toast(`Lote de ${n} “${fav.name}” en tu heladera`)
    } else {
      addMeal(date, mealEntry({ name: fav.name, icon: data.icon, kind: fav.kind, total: data.total, priced: data.priced }))
      toast(`${fav.name} sumado a tu día`)
    }
  }

  // Descarga todas las plantillas, agrupadas por categoría y con su análisis (macros y costos)
  const exportJson = () => {
    const json = buildTemplatesExport(analyzed)
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `recomp-plantillas-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast(`Exportaste ${json.total_plantillas} ${json.total_plantillas === 1 ? 'plantilla' : 'plantillas'} en JSON`)
  }

  // Trae plantillas de un JSON exportado (de este celular o de otro); no duplica las idénticas
  const fileRef = useRef(null)
  const importJson = async (file) => {
    if (!file) return
    try {
      const res = parseTemplatesImport(JSON.parse(await file.text()), foods, favorites)
      res.items.slice().reverse().forEach((t) => saveFavorite(t, null))
      const n = res.items.length
      const parts = [n ? `Importaste ${n} ${n === 1 ? 'plantilla' : 'plantillas'}` : 'No había plantillas nuevas']
      if (res.duplicates) parts.push(`${res.duplicates} ya ${res.duplicates === 1 ? 'estaba' : 'estaban'}`)
      if (res.missing.length) parts.push(`sin encontrar: ${res.missing.slice(0, 3).join(', ')}${res.missing.length > 3 ? '…' : ''}`)
      toast(parts.join(' · '))
      if (n) setFilter('all')
    } catch (e) {
      toast(e instanceof SyntaxError ? 'Ese archivo no es un JSON válido' : e.message)
    }
  }

  const open = analyzed.find((a) => a.fav.id === openId)
  const sheetActions = open ? [
    { label: open.mode.batch ? `Cocinar lote de ${open.fav.portions ?? 5}` : 'Sumar a mi día', icon: open.mode.batch ? 'box' : 'check', variant: 'primary', primary: true,
      onClick: () => { act(open); setOpenId(null) } },
    { label: 'Editar en Crear', icon: 'edit', onClick: () => { setOpenId(null); openInCreate(open.fav) } },
    { label: 'Duplicar', icon: 'plus', onClick: () => {
      const id = uid()
      saveFavorite({ ...open.fav, id, name: `${open.fav.name} (copia)` }, null)
      setOpenId(id)
    } },
    { label: 'Eliminar', icon: 'trash', variant: 'danger', onClick: () => {
      if (confirm(`¿Eliminar la plantilla "${open.fav.name}"?`)) { removeFavorite(open.fav.id); setOpenId(null) }
    } },
  ] : []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plantillas"
        action={
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Icon name="plus" className="h-4 w-4" /> Importar JSON</Button>
            {favorites.length > 0 && (
              <Button variant="ghost" size="sm" onClick={exportJson}><Icon name="list" className="h-4 w-4" /> Exportar JSON</Button>
            )}
            <input
              ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de plantillas"
              onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = '' }}
            />
          </div>
        }
      >
        Todo lo que guardaste en Crear: tapers, desayunos, meriendas y comidas. Tocá una para ver su ficha completa.
      </PageHeader>

      {/* Filtro por categoría */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Categoría">
        {[{ id: 'all', label: 'Todas', n: favorites.length }, ...ORDER.map((k) => ({ id: k, label: SECTION[k], n: count(k) }))].map((c) => (
          <button
            key={c.id} onClick={() => setFilter(c.id)} aria-pressed={filter === c.id}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              filter === c.id ? 'border-accent/60 bg-accent/10 text-zinc-50' : 'border-dashed border-white/[0.18] text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {c.id !== 'all' && <span className="leading-none">{MODES[c.id].icon}</span>}
            {c.label}
            <span className="tabular text-xs text-zinc-500">{c.n}</span>
          </button>
        ))}
      </div>

      {favorites.length > 0 && (
        <Input prefix="🔎" placeholder="Buscar por nombre o ingrediente (ej. avena, pollo)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar plantillas" />
      )}

      {favorites.length === 0 ? (
        <section className="border-t border-dashed border-white/[0.18] pt-6 text-center">
          <p className="text-4xl">🗂️</p>
          <p className="mt-2 font-hand text-[26px] text-zinc-100">Todavía no guardaste plantillas</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">Armá un taper, un desayuno o una merienda en Crear y tocá “Guardar plantilla”: aparece acá. ¿Las tenés exportadas? Usá “Importar JSON”.</p>
          <Button className="mt-4" onClick={() => openCreate('tupper')}><Icon name="plus" className="h-4 w-4" /> Ir a Crear</Button>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="border-t border-dashed border-white/[0.18] pt-4" aria-label={SECTION[g.kind]}>
            <div className="mb-2 flex items-end justify-between gap-3">
              <h2 className="font-hand text-[26px] font-semibold leading-none text-zinc-100">
                {MODES[g.kind].icon} {SECTION[g.kind]} <span className="tabular font-sans text-sm font-normal text-zinc-500">{count(g.kind)}</span>
              </h2>
              <Button variant="plain" size="sm" onClick={() => openCreate(g.kind)}><Icon name="plus" className="h-3.5 w-3.5" /> Nueva</Button>
            </div>
            {g.items.length === 0 ? (
              <p className="py-3 text-sm text-zinc-500">
                {q ? 'Ninguna coincide con la búsqueda.' : `No tenés ${SECTION[g.kind].toLowerCase()} guardad${g.kind === 'breakfast' || g.kind === 'tupper' ? 'os' : 'as'} todavía.`}
              </p>
            ) : (
              <ul className="divide-y divide-dashed divide-white/[0.1]">
                {g.items.map((a) => {
                  const { fav, mode, data } = a
                  return (
                    <li key={fav.id} className="flex items-center gap-3 py-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-2xl leading-none">{data.icon}</span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(fav.id)} title="Ver la ficha completa">
                        <p className="truncate text-[15px] text-zinc-50">{fav.name}</p>
                        <p className="tabular text-xs text-zinc-500">
                          <b className="text-zinc-200">{fmt(data.total.kcal)}</b> kcal · <span className="text-sky-300">{fmt(data.total.protein)} g prot</span>
                          <span className="hidden sm:inline"> · <span className="text-amber-300">{fmt(data.total.carbs)} g carb</span> · <span className="text-pink-300">{fmt(data.total.fat)} g grasa</span></span>
                          {data.priced > 0 && <> · <span className="text-zinc-300">{money(data.total.cost)}</span></>}
                        </p>
                        <p className="truncate text-[11px] text-zinc-600">
                          {data.filled.map((r) => r.food.name.split(' (')[0]).join(', ')}
                          {mode.batch && ` · lote de ${fav.portions ?? 5}`}
                        </p>
                      </button>
                      <Button size="sm" onClick={() => act(a)}>{mode.batch ? 'Cocinar' : 'Comer'}</Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))
      )}

      {open && (
        <MealSheet
          data={open.data} mode={open.mode} target={targetFor(open.mode)} settings={settings} portions={open.fav.portions ?? 5}
          onRename={(name) => saveFavorite({ ...open.fav, name }, open.fav.id)}
          onClose={() => setOpenId(null)} actions={sheetActions} iconOf={foodIconOf}
        />
      )}
    </div>
  )
}
