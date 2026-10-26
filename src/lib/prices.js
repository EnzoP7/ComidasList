import { findVariant } from './foods'

// Gestión de precios: productos (precio por paquete + consumo) y cuotas fijas (gimnasio, etc.)
export const CATEGORIES = [
  { id: 'food', label: 'Comida', icon: '🛒', color: '#3eab5e' },
  { id: 'supplements', label: 'Suplementos', icon: '💊', color: '#369dd1' },
  { id: 'gym', label: 'Gimnasio / ejercicio', icon: '🏋️', color: '#866ec5' },
  { id: 'other', label: 'Otros', icon: '📦', color: '#959b92' },
]

export const UNITS = [
  { id: 'kg', label: 'kg', base: 'g', factor: 1000 },
  { id: 'g', label: 'g', base: 'g', factor: 1 },
  { id: 'l', label: 'L', base: 'ml', factor: 1000 },
  { id: 'ml', label: 'ml', base: 'ml', factor: 1 },
  { id: 'ud', label: 'ud', base: 'ud', factor: 1 },
]

export const PERIODS = [
  { id: 'day', label: 'día', perMonth: 30.44 },
  { id: 'week', label: 'semana', perMonth: 4.345 },
  { id: 'month', label: 'mes', perMonth: 1 },
  { id: 'year', label: 'año', perMonth: 1 / 12 },
]

export const unitOf = (id) => UNITS.find((u) => u.id === id) ?? UNITS[0]
export const periodOf = (id) => PERIODS.find((p) => p.id === id) ?? PERIODS[2]
export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[3]

// Unidades compatibles con la del paquete (para expresar el consumo)
export const compatibleUnits = (packUnit) => UNITS.filter((u) => u.base === unitOf(packUnit).base)

// Precio por unidad base (g, ml o ud)
export function unitPrice(item) {
  if (item.type !== 'product' || !item.packSize) return null
  return item.price / (item.packSize * unitOf(item.packUnit).factor)
}

export function monthlyCost(item) {
  if (item.type === 'subscription') return (item.price || 0) * periodOf(item.period).perMonth
  const up = unitPrice(item)
  if (up == null || !item.usage) return 0
  return up * item.usage * unitOf(item.usageUnit).factor * periodOf(item.usagePeriod).perMonth
}

// Busca el precio de un ingrediente (en gramos) por nombre exacto en la lista de precios
export function findPriceFor(name, prices) {
  const n = (name ?? '').trim().toLowerCase()
  if (!n) return null
  return prices.find(
    (p) => p.type === 'product' && unitOf(p.packUnit).base === 'g' && p.name.trim().toLowerCase() === n,
  ) ?? null
}

// $U por gramo: primero lo que registraste en Gastos, si no el precio del catálogo de Alimentos
export function pricePerGram(name, prices, variants = []) {
  const own = findPriceFor(name, prices)
  if (own) return unitPrice(own)
  return findVariant(name, variants)?.pricePerGram ?? null
}

// Coste del lote y por tupper. `missing` = ingredientes sin precio
export function recipeCost(recipe, prices, variants = []) {
  if (recipe.mode === 'manual') {
    return recipe.costPerPortion
      ? { batch: recipe.costPerPortion * recipe.portions, perPortion: recipe.costPerPortion, missing: [] }
      : null
  }
  let batch = 0
  const missing = []
  for (const ing of recipe.ingredients ?? []) {
    const ppg = pricePerGram(ing.name, prices, variants)
    if (ppg != null) batch += ppg * (ing.grams || 0)
    else if (ing.name) missing.push(ing.name)
  }
  if (batch === 0) return null
  return { batch, perPortion: batch / Math.max(1, recipe.portions), missing }
}

export function money(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const digits = Math.abs(n) < 100 ? 2 : 0
  return `$U ${n.toLocaleString('es-UY', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export const CURRENCY = '$U'

// Ejemplos para empezar (precios orientativos en Uruguay, editables)
export const SAMPLE_PRICES = [
  { name: 'Pechuga de pollo (cruda)', category: 'food', type: 'product', price: 460, packSize: 1, packUnit: 'kg', usage: 1.8, usageUnit: 'kg', usagePeriod: 'week' },
  { name: 'Arroz blanco (crudo)', category: 'food', type: 'product', price: 75, packSize: 1, packUnit: 'kg', usage: 800, usageUnit: 'g', usagePeriod: 'week' },
  { name: 'Brócoli (crudo)', category: 'food', type: 'product', price: 180, packSize: 1, packUnit: 'kg', usage: 1.5, usageUnit: 'kg', usagePeriod: 'week' },
  { name: 'Proteína whey en polvo', category: 'supplements', type: 'product', price: 2400, packSize: 1, packUnit: 'kg', usage: 30, usageUnit: 'g', usagePeriod: 'day' },
  { name: 'Creatina monohidrato', category: 'supplements', type: 'product', price: 800, packSize: 300, packUnit: 'g', usage: 5, usageUnit: 'g', usagePeriod: 'day' },
  { name: 'Cuota del gimnasio', category: 'gym', type: 'subscription', price: 1900, period: 'month' },
]
