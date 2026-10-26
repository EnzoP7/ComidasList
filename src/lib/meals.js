// Cálculo de comidas armadas con ingredientes de la base (tapers, desayunos y comidas libres)
import { foodVariants, hasStates, nutrientsFor, rawGrams } from './foods'
import { pricePerGram } from './prices'

const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, grams: 0, cost: 0 }

/**
 * rows: [{ foodId, state, grams }] → filas enriquecidas con nutrientes y costo + total.
 * Ignora alimentos que ya no existen en el catálogo.
 */
export function computeRows(rows, byId, prices, variants) {
  const out = (rows ?? []).flatMap((r) => {
    const food = byId.get(r.foodId)
    if (!food) return []
    const state = hasStates(food) ? r.state ?? 'raw' : 'raw'
    const g = Number(r.grams) || 0
    const variant = foodVariants(food).find((v) => v.state === state) ?? foodVariants(food)[0]
    const ppg = pricePerGram(variant.label, prices, variants)
    return [{ ...r, food, state, g, variant, n: nutrientsFor(food, g, state), cost: ppg != null ? ppg * g : null, raw: rawGrams(food, g, state) }]
  })
  const filled = out.filter((r) => r.g > 0)
  const total = filled.reduce(
    (t, r) => ({
      kcal: t.kcal + r.n.kcal, protein: t.protein + r.n.protein, fat: t.fat + r.n.fat, carbs: t.carbs + r.n.carbs,
      fiber: t.fiber + r.n.fiber, grams: t.grams + r.g, cost: t.cost + (r.cost ?? 0),
    }),
    { ...ZERO },
  )
  return { rows: out, filled, total, priced: filled.filter((r) => r.cost != null).length }
}

const r1 = (n) => Math.round(n * 10) / 10

// Entrada para el registro diario a partir de un total calculado
export const mealEntry = ({ name, icon, kind, total, priced }) => ({
  name, icon, kind,
  kcal: Math.round(total.kcal), protein: r1(total.protein), fat: r1(total.fat), carbs: r1(total.carbs), fiber: r1(total.fiber ?? 0),
  cost: priced ? total.cost : null,
})

export const MEAL_KINDS = {
  tupper: { label: 'tupper', tone: 'bg-accent/10 text-accent' },
  breakfast: { label: 'desayuno', tone: 'bg-amber-400/10 text-amber-300' },
  snack: { label: 'merienda', tone: 'bg-pink-400/10 text-pink-300' },
  meal: { label: 'comida', tone: 'bg-sky-400/10 text-sky-300' },
  extra: { label: 'extra', tone: 'bg-white/[0.06] text-zinc-400' },
}

/**
 * Sugerencia para cerrar el día: hasta 2 opciones (tapers, plantillas, batido) que acerquen
 * la proteína a la meta sin pasarse de las calorías que quedan (+5% de margen).
 * candidates: [{ id, label, kcal, protein }]
 */
export function closeTheDay(candidates, kcalLeft, proteinLeft) {
  if (kcalLeft < 250 || proteinLeft < 15) return null
  const limit = kcalLeft * 1.05
  const fits = candidates.filter((c) => c.kcal > 0 && c.kcal <= limit)
  let best = null
  const score = (items) => {
    const kcal = items.reduce((s, i) => s + i.kcal, 0)
    const protein = items.reduce((s, i) => s + i.protein, 0)
    if (kcal > limit) return -Infinity
    // Prioriza cubrir la proteína que falta; a igualdad, usar mejor las calorías
    return Math.min(protein, proteinLeft) * 10 + Math.min(kcal, kcalLeft) / 100 - items.length
  }
  for (let i = 0; i < fits.length; i++) {
    const one = [fits[i]]
    if (!best || score(one) > score(best)) best = one
    for (let j = i + 1; j < fits.length; j++) {
      const two = [fits[i], fits[j]]
      if (score(two) > score(best)) best = two
    }
  }
  if (!best) return null
  return {
    items: best,
    kcal: best.reduce((s, i) => s + i.kcal, 0),
    protein: best.reduce((s, i) => s + i.protein, 0),
  }
}
