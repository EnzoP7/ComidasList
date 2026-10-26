// Exportación de plantillas a JSON, agrupadas por categoría y con su análisis completo.
import { foodStates, hasStates, stateLabel } from './foods'

export const TEMPLATE_CATEGORIES = [
  { kind: 'tupper', key: 'tapers', label: 'Tapers' },
  { kind: 'breakfast', key: 'desayunos', label: 'Desayunos' },
  { kind: 'snack', key: 'meriendas', label: 'Meriendas' },
  { kind: 'meal', key: 'comidas_libres', label: 'Comidas libres' },
]

const r1 = (n) => Math.round(n * 10) / 10
const r2 = (n) => Math.round(n * 100) / 100

/**
 * items: [{ fav, data }] donde data = resultado de computeRows (filled, total, priced).
 * Devuelve un objeto listo para JSON.stringify.
 */
export function buildTemplatesExport(items, now = new Date()) {
  const byKind = (kind) => items.filter((i) => i.fav.kind === kind)
  const template = ({ fav, data }) => ({
    id: fav.id,
    nombre: fav.name,
    ...(fav.kind === 'tupper' && { tapers_por_lote: fav.portions ?? 5 }),
    ingredientes: data.filled.map((r) => ({
      alimento: r.food.name,
      alimento_id: r.food.id,
      preparacion: hasStates(r.food) ? stateLabel(r.food, r.state) : null,
      cantidad: r1(r.g),
      unidad: r.food.liquid ? 'ml' : 'g',
      kcal: Math.round(r.n.kcal),
      proteina_g: r1(r.n.protein),
      carbohidratos_g: r1(r.n.carbs),
      grasas_g: r1(r.n.fat),
      fibra_g: r1(r.n.fiber),
      costo_uyu: r.cost != null ? r2(r.cost) : null,
    })),
    totales: {
      kcal: Math.round(data.total.kcal),
      proteina_g: r1(data.total.protein),
      carbohidratos_g: r1(data.total.carbs),
      grasas_g: r1(data.total.fat),
      fibra_g: r1(data.total.fiber),
      peso_g: Math.round(data.total.grams),
      costo_uyu: data.priced ? r2(data.total.cost) : null,
      costo_completo: data.priced === data.filled.length,
      ...(fav.kind === 'tupper' && data.priced && { costo_lote_uyu: r2(data.total.cost * (fav.portions ?? 5)) }),
    },
  })

  const categorias = Object.fromEntries(
    TEMPLATE_CATEGORIES.map((c) => [c.key, { nombre: c.label, cantidad: byKind(c.kind).length, plantillas: byKind(c.kind).map(template) }]),
  )
  return {
    app: 'recomp',
    tipo: 'plantillas',
    version: 1,
    exportado: now.toISOString(),
    moneda: 'UYU',
    total_plantillas: items.length,
    categorias,
  }
}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const KINDS = new Set(TEMPLATE_CATEGORIES.map((c) => c.kind))

/**
 * Lee un JSON exportado con buildTemplatesExport (o una lista cruda de plantillas de la app)
 * y devuelve plantillas listas para guardar. Los ingredientes se buscan por id y, si no, por nombre.
 * existing: plantillas ya guardadas, para no duplicar las idénticas.
 */
export function parseTemplatesImport(json, foods, existing = []) {
  const byId = new Map(foods.map((f) => [f.id, f]))
  const byName = new Map(foods.map((f) => [norm(f.name), f]))
  const out = { items: [], duplicates: 0, missing: [] }
  const sig = (t) => `${t.kind}|${norm(t.name)}|${t.rows.map((r) => `${r.foodId}:${r.state}:${Math.round(r.grams)}`).join(',')}`
  const seen = new Set(existing.map(sig))

  // Formato exportado: { categorias: { tapers: { plantillas: [...] } } }
  let raw = []
  if (json?.categorias && typeof json.categorias === 'object') {
    for (const c of TEMPLATE_CATEGORIES) {
      for (const p of json.categorias[c.key]?.plantillas ?? []) raw.push({ kind: c.kind, p, exported: true })
    }
  } else {
    const list = Array.isArray(json) ? json : Array.isArray(json?.favorites) ? json.favorites : null
    if (!list) throw new Error('El archivo no tiene plantillas de Recomp.')
    raw = list.map((p) => ({ kind: p.kind, p, exported: false }))
  }

  for (const { kind, p, exported } of raw) {
    if (!KINDS.has(kind)) continue
    const name = String((exported ? p.nombre : p.name) ?? '').trim() || 'Plantilla importada'
    const rows = []
    for (const ing of (exported ? p.ingredientes : p.rows) ?? []) {
      const id = exported ? ing.alimento_id : ing.foodId
      const food = byId.get(id) ?? (exported ? byName.get(norm(ing.alimento)) : null)
      const grams = Number(exported ? ing.cantidad : ing.grams)
      if (!food) { out.missing.push(exported ? ing.alimento ?? id : id); continue }
      if (!(grams > 0)) continue
      const state = exported
        ? (ing.preparacion ? foodStates(food).find((s) => norm(s.label) === norm(ing.preparacion))?.id : null) ?? 'raw'
        : (foodStates(food).some((s) => s.id === ing.state) ? ing.state : 'raw')
      rows.push({ foodId: food.id, state, grams })
    }
    if (!rows.length) continue
    const portions = Number(exported ? p.tapers_por_lote : p.portions)
    const t = { kind, name, rows, ...(kind === 'tupper' && { portions: portions > 0 ? Math.round(portions) : 5 }) }
    if (seen.has(sig(t))) { out.duplicates++; continue }
    seen.add(sig(t))
    out.items.push(t)
  }
  out.missing = [...new Set(out.missing)]
  return out
}
