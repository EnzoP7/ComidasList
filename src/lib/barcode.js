// Productos por código de barras. Se buscan en cadena: si una fuente no lo tiene
// (o lo tiene sin valores nutricionales) se pasa a la siguiente.
//  1. Open Food Facts — base mundial y abierta, la que más productos uruguayos tiene.
//  2. USDA FoodData Central (Branded Foods) — productos de EE. UU.: sirve para importados.
// Las dos son gratuitas y se pueden consultar desde el navegador.

// Deja solo los dígitos de un código escrito a mano
export const cleanBarcode = (s) => String(s ?? '').replace(/\D/g, '')

// EAN-8, UPC-A (12), EAN-13 y GTIN-14: el último dígito es de control
export function isValidBarcode(code) {
  if (![8, 12, 13, 14].includes(code.length)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop()
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

const TIMEOUT_MS = 7000

// fetch con tiempo máximo; respeta la cancelación de quien llama
async function fetchJson(url, signal) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), TIMEOUT_MS)
  const onAbort = () => ctrl.abort(signal.reason)
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return { status: res.status, json: res.ok || res.status === 404 ? await res.json().catch(() => null) : null }
  } catch (err) {
    if (signal?.aborted) throw err
    throw new Error(ctrl.signal.aborted ? 'no respondió a tiempo' : 'sin conexión')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

// ── 1. Open Food Facts ──────────────────────────────────────────────────────
const OFF_FIELDS = [
  'code', 'product_name', 'product_name_es', 'generic_name_es', 'brands', 'quantity', 'serving_size', 'serving_quantity',
  'nutriments', 'image_front_small_url', 'categories_tags',
].join(',')

export const offProductUrl = (code) => `https://world.openfoodfacts.org/product/${code}`

async function lookupOff(code, signal) {
  const { status, json } = await fetchJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, signal)
  if (status === 404 || json?.status === 0) return null
  if (status !== 200 || !json?.product) throw new Error(`error ${status}`)
  return productToDraft(json.product, code)
}

// ── 2. USDA FoodData Central ────────────────────────────────────────────────
// DEMO_KEY es la clave pública de prueba del USDA (unas 30 consultas por hora): alcanza para uso personal.
const USDA_KEY = 'DEMO_KEY'
const USDA_NUTRIENTS = { kcal: ['208'], kj: ['268'], protein: ['203'], fat: ['204'], carbs: ['205'], fiber: ['291'] }

// El USDA guarda UPC de 12 dígitos; un EAN-13 que empieza con 0 es el mismo código
const sameGtin = (a, b) => a && b && a.replace(/^0+/, '') === b.replace(/^0+/, '')

async function lookupUsda(code, signal) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&dataType=Branded&pageSize=5&query=${code}`
  const { status, json } = await fetchJson(url, signal)
  if (status !== 200) throw new Error(`error ${status}`)
  const food = (json?.foods ?? []).find((f) => sameGtin(f.gtinUpc, code))
  return food ? usdaToDraft(food, code) : null
}

export function usdaToDraft(f, code) {
  const value = (key) => {
    const n = (f.foodNutrients ?? []).find((x) => USDA_NUTRIENTS[key].includes(String(x.nutrientNumber)))
    return number(n?.value)
  }
  const kj = value('kj')
  const unit = String(f.servingSizeUnit ?? '').toLowerCase()
  const liquid = unit === 'ml' || /\b(fl\.? ?oz|ml|l)\b/i.test(f.packageWeight ?? '')
  return finish({
    barcode: code,
    name: sentenceCase(f.description ?? ''),
    brand: sentenceCase(f.brandName || f.brandOwner || ''),
    quantity: f.packageWeight ?? '',
    liquid,
    image: null,
    category: guessCategoryText(`${f.foodCategory ?? ''} ${f.description ?? ''}`),
    kcal: round(value('kcal') ?? (kj != null ? kj / 4.184 : null), 0),
    protein: round(value('protein')),
    fat: round(value('fat')),
    carbs: round(value('carbs')),
    fiber: round(value('fiber')),
    unit: f.servingSize && ['g', 'ml', 'grm', 'mlt'].includes(unit) ? { label: 'porción', grams: round(f.servingSize, 0), text: f.householdServingFullText } : null,
    pack: quantityGrams(f.packageWeight ?? '') ? { per: f.packageWeight, grams: quantityGrams(f.packageWeight) } : null,
  })
}

// ── Cadena de fuentes ───────────────────────────────────────────────────────
export const SOURCES = [
  { id: 'off', label: 'Open Food Facts', lookup: lookupOff },
  { id: 'usda', label: 'USDA (EE. UU.)', lookup: lookupUsda },
]

// Tiene lo mínimo para guardarlo: calorías y proteínas
export const hasNutrients = (d) => d?.kcal != null && d?.protein != null

/**
 * Consulta todas las fuentes a la vez (no se suman las esperas) y elige por orden de prioridad:
 * la primera que lo tenga con valores gana; al encontrarlo se cancelan las demás.
 * - found:   { status: 'found', draft, tried }
 * - partial: alguna fuente lo tiene sin valores (nombre, foto…) → { status: 'partial', draft, tried }
 * - missing: ninguna lo tiene → { status: 'missing', tried }
 * tried: [{ source, result: 'found' | 'incomplete' | 'missing' | 'error', detail? }]
 */
export async function lookupBarcode(code, { signal, onSource, sources = SOURCES } = {}) {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort(signal.reason)
  signal?.addEventListener('abort', onAbort)
  onSource?.(sources.map((s) => s.label).join(' y '))
  const pending = sources.map((s) => s.lookup(code, ctrl.signal).then((draft) => ({ draft }), (error) => ({ error })))
  const tried = []
  let partial = null
  try {
    for (const [i, s] of sources.entries()) {
      const { draft, error } = await pending[i]
      if (signal?.aborted) throw signal.reason ?? new DOMException('cancelado', 'AbortError')
      if (error) {
        tried.push({ source: s.label, result: 'error', detail: error.message })
        continue
      }
      if (hasNutrients(draft)) {
        tried.push({ source: s.label, result: 'found' })
        ctrl.abort() // ya está: no hace falta esperar a las demás
        // Si una fuente anterior tenía foto o nombre y esta no, se completan
        return { status: 'found', draft: { ...draft, image: draft.image ?? partial?.image ?? null, source: s.label }, tried }
      }
      tried.push({ source: s.label, result: draft ? 'incomplete' : 'missing' })
      if (draft && !partial) partial = { ...draft, source: s.label }
    }
    return partial ? { status: 'partial', draft: partial, tried } : { status: 'missing', tried }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

// ── Conversión de Open Food Facts ───────────────────────────────────────────
// Categoría de la app según las categorías del producto (la primera regla que coincide)
const CATEGORY_RULES = [
  ['supplements', ['dietary-supplements', 'bodybuilding-supplements', 'protein-powders', 'whey']],
  ['dairy', ['dairies', 'milks', 'yogurts', 'cheeses', 'eggs', 'creams', 'dairy-desserts']],
  ['fish', ['fishes', 'seafood', 'canned-fishes', 'tunas']],
  ['meat', ['meats', 'poultries', 'hams', 'sausages', 'prepared-meats']],
  ['legumes', ['legumes', 'pulses', 'beans', 'lentils', 'chickpeas', 'tofu']],
  ['fats', ['fats', 'vegetable-oils', 'olive-oils', 'butters', 'mayonnaises']],
  ['seeds', ['nuts', 'seeds', 'dried-fruits', 'cereal-bars', 'chocolates']],
  ['drinks', ['beverages', 'coffees', 'teas', 'juices', 'sodas', 'waters', 'alcoholic-beverages']],
  ['fruit', ['fruits', 'fruit-based-foods']],
  ['veg', ['vegetables', 'vegetable-based-foods', 'canned-vegetables', 'frozen-vegetables', 'mushrooms']],
  ['carbs', ['cereals-and-potatoes', 'breads', 'pastas', 'rices', 'breakfast-cereals', 'flours', 'biscuits', 'crackers', 'potatoes']],
  ['pantry', ['sweeteners', 'condiments', 'sauces', 'spreads', 'sweets', 'snacks', 'jams', 'sugars', 'salts', 'spices']],
]

export function guessCategory(tags = []) {
  const names = tags.map((t) => t.replace(/^[a-z]{2}:/, ''))
  for (const [cat, keys] of CATEGORY_RULES) if (names.some((n) => keys.includes(n))) return cat
  return 'pantry'
}

// Categoría a partir de texto libre (USDA: "Coffee", "Pasta by Shape & Type"…), en inglés o español
const TEXT_RULES = [
  ['supplements', ['protein powder', 'supplement', 'whey']],
  ['dairy', ['milk', 'yogurt', 'cheese', 'leche', 'yogur', 'queso']],
  ['fish', ['fish', 'tuna', 'seafood', 'sardine', 'atún', 'atun', 'pescado']],
  ['meat', ['meat', 'chicken', 'beef', 'pork', 'sausage', 'ham', 'carne', 'pollo']],
  ['drinks', ['beverage', 'coffee', 'tea', 'juice', 'soda', 'water', 'café', 'cafe', 'bebida', 'jugo']],
  ['carbs', ['pasta', 'bread', 'cereal', 'rice', 'cracker', 'flour', 'fideo', 'arroz', 'pan ', 'harina']],
  ['veg', ['vegetable', 'mushroom', 'hongo', 'verdura']],
  ['fruit', ['fruit', 'fruta']],
  ['seeds', ['nut', 'seed', 'chocolate']],
  ['fats', ['oil', 'butter', 'aceite', 'manteca']],
]
export function guessCategoryText(text) {
  const t = ` ${text.toLowerCase()} `
  for (const [cat, keys] of TEXT_RULES) if (keys.some((k) => t.includes(k))) return cat
  return 'pantry'
}

const round = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d)
const number = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
const sentenceCase = (s) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s).trim()

// Nombre con marca y lista de nutrientes que faltan (la fibra no es obligatoria)
function finish(d) {
  const name = d.brand && d.name && !d.name.toLowerCase().includes(d.brand.toLowerCase()) ? `${d.name} ${d.brand}` : d.name || d.brand
  const missing = ['kcal', 'protein', 'fat', 'carbs'].filter((k) => d[k] == null)
  return { ...d, name, missing }
}

/**
 * Producto de Open Food Facts → borrador de alimento propio (valores por 100 g, como la etiqueta).
 * missing: nutrientes que el producto no trae y hay que completar a mano.
 */
export function productToDraft(product, code) {
  const n = product.nutriments ?? {}
  const kj = number(n['energy-kj_100g']) ?? (n.energy_unit === 'kJ' ? number(n.energy_100g) : null)
  // "400 g e": la e (℮) es el símbolo europeo de cantidad estimada
  const quantity = (product.quantity ?? '').replace(/\s+[e℮]$/i, '').trim()
  const packGrams = quantityGrams(quantity)
  const servingGrams = number(product.serving_quantity)
  return finish({
    barcode: code,
    name: (product.product_name_es || product.product_name || product.generic_name_es || '').trim(),
    brand: (product.brands ?? '').split(',')[0].trim(),
    quantity,
    liquid: /\b\d+([.,]\d+)?\s*(ml|cl|l|lt|litros?)\b/i.test(quantity),
    image: product.image_front_small_url ?? null,
    category: guessCategory(product.categories_tags),
    kcal: round(number(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null), 0),
    protein: round(number(n.proteins_100g)),
    fat: round(number(n.fat_100g)),
    carbs: round(number(n.carbohydrates_100g)),
    fiber: round(number(n.fiber_100g)),
    unit: servingGrams ? { label: 'porción', grams: round(servingGrams, 0), text: product.serving_size } : null,
    pack: packGrams ? { per: quantity, grams: packGrams } : null,
  })
}

// "500 g" → 500 · "1 kg" → 1000 · "1,5 L" → 1500 (1 ml ≈ 1 g) · "6 x 200 ml" → 1200
export function quantityGrams(q) {
  const m = String(q).toLowerCase().replace(',', '.').match(/(?:(\d+)\s*x\s*)?(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|cl|l|lt)\b/)
  if (!m) return null
  const k = { kg: 1000, g: 1, gr: 1, ml: 1, cl: 10, l: 1000, lt: 1000 }[m[3]]
  return Math.round((m[1] ? Number(m[1]) : 1) * Number(m[2]) * k)
}
