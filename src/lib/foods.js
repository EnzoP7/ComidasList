// Cálculos sobre la base de alimentos (src/data/foodDatabase.js), cuyos nutrientes vienen por 1 gramo crudo.
import { FOOD_CATEGORIES, FOOD_DATABASE } from '../data/foodDatabase'

export { FOOD_CATEGORIES, FOOD_DATABASE, PRICE_SOURCES, PRICES_UPDATED } from '../data/foodDatabase'

export const NUTRIENTS = [
  { key: 'kcal', label: 'Calorías', unit: 'kcal' },
  { key: 'protein', label: 'Proteínas', unit: 'g' },
  { key: 'fat', label: 'Grasas', unit: 'g' },
  { key: 'carbs', label: 'Carbohidratos', unit: 'g' },
  { key: 'fiber', label: 'Fibra', unit: 'g' },
]

const ADJ = {
  m: ['crudo', 'cocido'], f: ['cruda', 'cocida'], mp: ['crudos', 'cocidos'], fp: ['crudas', 'cocidas'],
}
export const isCookable = (food) => Boolean(food.cook && food.cook !== 1)

/**
 * Formas en que se puede pesar/comer un alimento: crudo, cocido y preparaciones extra (huevo frito…).
 * raw = gramos de alimento crudo por gramo en ese estado; perGram propio si la preparación cambia los nutrientes.
 */
export function foodStates(food) {
  const adj = ADJ[food.forms ?? 'm']
  const states = [{ id: 'raw', label: adj[0], raw: 1 }]
  if (isCookable(food)) states.push({ id: 'cooked', label: adj[1], raw: 1 / food.cook })
  return [...states, ...(food.preps ?? [])]
}
export const hasStates = (food) => foodStates(food).length > 1
export const stateOf = (food, state) => foodStates(food).find((s) => s.id === state) ?? foodStates(food)[0]
export const stateLabel = (food, state) => stateOf(food, state).label

// Gramos de alimento crudo que corresponden a una porción (para comprar y para el precio)
export const rawGrams = (food, grams, state = 'raw') => grams * stateOf(food, state).raw
export const categoryOf = (id) => FOOD_CATEGORIES.find((c) => c.id === id) ?? FOOD_CATEGORIES[0]

// Alimentos propios guardados con la versión anterior (valores por 100 g y precio por kg)
function migrateCustom(c) {
  if (c.perGram) return c
  return {
    ...c,
    perGram: { kcal: c.kcal / 100, protein: c.protein / 100, fat: (c.fat ?? 0) / 100, carbs: (c.carbs ?? 0) / 100, fiber: 0 },
    price: c.price ? { uyu: c.price, per: 'kg', grams: 1000 } : null,
  }
}

// Precio editado por el usuario; las ediciones antiguas eran $U por kg
function editedUyu(food, edit) {
  if (edit?.uyu != null) return edit.uyu
  if (typeof edit?.price === 'number') return (edit.price * food.price.grams) / 1000
  return null
}

/**
 * Catálogo activo: base + ajuste general de precios + precios editados + alimentos propios.
 * state = { custom: Food[], edits: { [id]: { uyu } }, priceFactor: number }
 */
export function buildCatalog(state) {
  const factor = state?.priceFactor ?? 1
  const edits = state?.edits ?? {}
  const base = FOOD_DATABASE.map((food) => {
    const uyu = editedUyu(food, edits[food.id])
    return {
      ...food,
      price: { ...food.price, uyu: uyu ?? Math.round(food.price.uyu * factor) },
      priceEdited: uyu != null,
    }
  })
  return [...base, ...(state?.custom ?? []).map((c) => ({ ...migrateCustom(c), custom: true }))]
}

// Nutrientes totales de una porción en gramos, en el estado elegido
export function nutrientsFor(food, grams, state = 'raw') {
  const st = stateOf(food, state)
  const base = st.perGram ?? food.perGram
  const k = st.perGram ? grams : grams * st.raw
  return Object.fromEntries(NUTRIENTS.map(({ key }) => [key, (base[key] ?? 0) * k]))
}

export const per100 = (food, state = 'raw') => nutrientsFor(food, 100, state)

// $U por gramo en el estado pedido (cocido es más barato por gramo porque pesa más)
export function foodPricePerGram(food, state = 'raw') {
  if (!food.price?.uyu || !food.price.grams) return null
  return (food.price.uyu / food.price.grams) * stateOf(food, state).raw
}

export const pricePerKg = (food) => {
  const ppg = foodPricePerGram(food)
  return ppg == null ? null : ppg * 1000
}

// $U por cada 100 g de proteína (cocinar no cambia la proteína total)
export function proteinCost(food) {
  const ppg = foodPricePerGram(food)
  return ppg != null && food.perGram.protein ? (ppg * 100) / food.perGram.protein : null
}

// Nombres seleccionables: "Arroz blanco (crudo)", "Huevo entero (frito)", "Avena"
export function foodVariants(food) {
  const multi = hasStates(food)
  return foodStates(food).map((st) => {
    const p = per100(food, st.id)
    return {
      label: multi ? `${food.name} (${st.label})` : food.name,
      food,
      state: st.id,
      kcal: Math.round(p.kcal),
      protein: Math.round(p.protein * 10) / 10,
      pricePerGram: foodPricePerGram(food, st.id),
    }
  })
}

export const catalogVariants = (foods) => foods.flatMap(foodVariants)

// Busca por nombre exacto; si solo coincide el nombre base (ej. "Huevo entero"), usa el estado crudo
export function findVariant(name, variants) {
  const n = (name ?? '').trim().toLowerCase()
  if (!n) return null
  return variants.find((v) => v.label.toLowerCase() === n)
    ?? variants.find((v) => v.state === 'raw' && v.food.name.toLowerCase() === n)
    ?? null
}
