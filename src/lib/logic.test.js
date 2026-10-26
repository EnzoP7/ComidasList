import { describe, expect, it } from 'vitest'
import { buildCatalog, catalogVariants, findVariant, foodPricePerGram, foodStates, nutrientsFor, rawGrams } from './foods'
import { computeRows, mealEntry } from './meals'
import { DEFAULT_SETTINGS, computePlan, dayChecks, maintenance, recipeMacros, trainingKcal, waterTotal } from './model'
import { monthlyCost, money, pricePerGram, recipeCost } from './prices'

const foods = buildCatalog({})
const byId = new Map(foods.map((f) => [f.id, f]))
const variants = catalogVariants(foods)
const food = (id) => byId.get(id)

describe('alimentos', () => {
  it('calcula nutrientes por gramo en crudo y en cocido', () => {
    const arroz = food('arroz-blanco')
    expect(nutrientsFor(arroz, 100).kcal).toBeCloseTo(360)
    // 280 g cocido = 100 g crudo: mismos nutrientes
    expect(nutrientsFor(arroz, 280, 'cooked').kcal).toBeCloseTo(360)
    expect(rawGrams(arroz, 280, 'cooked')).toBeCloseTo(100)
  })

  it('usa los valores propios de cada preparación del huevo', () => {
    const huevo = food('huevo')
    expect(foodStates(huevo).map((s) => s.id)).toEqual(['raw', 'boiled', 'poached', 'fried', 'scrambled', 'omelette'])
    expect(nutrientsFor(huevo, 100, 'fried').kcal).toBeCloseTo(196)
    expect(nutrientsFor(huevo, 100, 'fried').kcal).toBeGreaterThan(nutrientsFor(huevo, 100, 'raw').kcal)
  })

  it('encuentra variantes por nombre y por nombre base', () => {
    expect(findVariant('Pechuga de pollo (cruda)', variants)?.food.id).toBe('pollo-pechuga')
    expect(findVariant('huevo entero', variants)?.state).toBe('raw')
    expect(findVariant('no existe', variants)).toBeNull()
  })

  it('precio por gramo según la unidad de compra (maple de 30)', () => {
    expect(foodPricePerGram(food('huevo')) * 1500).toBeCloseTo(330)
  })

  it('aplica ajuste general y precios editados', () => {
    const c = buildCatalog({ priceFactor: 1.1, edits: { cuadrada: { uyu: 500 } } })
    expect(c.find((f) => f.id === 'whey').price.uyu).toBe(Math.round(2300 * 1.1))
    expect(c.find((f) => f.id === 'cuadrada').price.uyu).toBe(500)
  })
})

describe('comidas', () => {
  it('suma filas y arma la entrada del día con macros completos', () => {
    const c = computeRows([{ foodId: 'pollo-pechuga', state: 'raw', grams: 150 }, { foodId: 'arroz-blanco', state: 'raw', grams: 70 }], byId, [], variants)
    expect(c.total.protein).toBeCloseTo(34.5 + 4.9, 1)
    const e = mealEntry({ name: 'x', icon: '🍗', kind: 'tupper', total: c.total, priced: c.priced })
    expect(e.kcal).toBe(Math.round(165 + 252))
    expect(e.cost).toBeGreaterThan(0)
  })

  it('ignora alimentos que ya no existen', () => {
    expect(computeRows([{ foodId: 'borrado', grams: 100 }], byId, [], variants).rows).toHaveLength(0)
  })

  it('usa los macros por taper guardados', () => {
    expect(recipeMacros({ perTaper: { kcal: 500, protein: 40, fat: 8, carbs: 60 } }).fat).toBe(8)
  })
})

describe('plan', () => {
  const plan = computePlan(DEFAULT_SETTINGS, 83.5)
  it('Mifflin-St Jeor × actividad', () => {
    expect(plan.bmr).toBe(Math.round(10 * 83.5 + 6.25 * 189.5 - 5 * 23 + 5))
    expect(maintenance(DEFAULT_SETTINGS, 83.5)).toBe(2960)
  })
  it('niveles de déficit y macros que cierran con el objetivo', () => {
    expect(plan.levels.map((l) => l.kcal)).toEqual([2660, 2520, 2310])
    const { protein, fat, carbs } = plan.macros
    expect(protein * 4 + fat * 9 + carbs * 4).toBeGreaterThan(plan.calorieGoal - 10)
    expect(protein).toBe(167)
  })
  it('calorías de entrenamiento netas sobre el reposo', () => {
    expect(trainingKcal({ type: 'strength', minutes: 60 }, 83.5)).toBeCloseTo(334)
  })
})

describe('chequeos del día', () => {
  const settings = { ...DEFAULT_SETTINGS, calorieGoal: 2500, proteinGoal: 167 }
  it('un día completo está dentro del plan', () => {
    const day = { meals: [{ kcal: 2400, protein: 170 }], steps: 11000, water: Array(12).fill({ ml: 250 }) }
    const r = dayChecks(day, settings)
    expect(r.passed).toBe(4)
    expect(r.inPlan).toBe(true)
    expect(waterTotal(day)).toBe(3000)
  })
  it('pasarse de calorías saca del plan aunque el resto esté bien', () => {
    const r = dayChecks({ meals: [{ kcal: 3000, protein: 170 }], steps: 11000, water: Array(12).fill({ ml: 250 }) }, settings)
    expect(r.inPlan).toBe(false)
  })
  it('un día vacío no cuenta como anotado', () => {
    expect(dayChecks(undefined, settings).logged).toBe(false)
  })
})

describe('precios', () => {
  it('costo mensual de producto y de cuota', () => {
    expect(monthlyCost({ type: 'subscription', price: 1900, period: 'month' })).toBe(1900)
    expect(monthlyCost({ type: 'product', price: 1000, packSize: 1, packUnit: 'kg', usage: 100, usageUnit: 'g', usagePeriod: 'day' })).toBeCloseTo(3044)
  })
  it('Gastos tiene prioridad sobre el catálogo', () => {
    const own = [{ name: 'Brócoli (crudo)', type: 'product', price: 300, packSize: 1, packUnit: 'kg' }]
    expect(pricePerGram('Brócoli (crudo)', own, variants) * 1000).toBeCloseTo(300)
  })
  it('costo del lote con ingredientes del catálogo', () => {
    const r = recipeCost({ mode: 'ingredients', portions: 2, ingredients: [{ name: 'Pechuga de pollo (cruda)', grams: 1000 }] }, [], variants)
    expect(r.batch).toBeCloseTo(460)
    expect(r.perPortion).toBeCloseTo(230)
  })
  it('formato en pesos uruguayos', () => {
    expect(money(1900)).toBe('$U 1.900')
    expect(money(92.4)).toBe('$U 92,40')
  })
})

describe('ajuste del plan', async () => {
  const { planAdvice } = await import('./model')
  const { addDays } = await import('./date')
  const plan = { calorieGoal: 2500, bmr: 1900 }
  const build = (fn) => Object.fromEntries(Array.from({ length: 14 }, (_, i) => [addDays('2026-10-23', -i), { weight: fn(i) }]))
  it('espera hasta tener pesajes suficientes', () => {
    expect(planAdvice({}, plan, '2026-10-23', addDays).status).toBe('waiting')
  })
  it('estancado: sugiere recortar 150 kcal', () => {
    const r = planAdvice(build(() => 84), plan, '2026-10-23', addDays)
    expect(r).toMatchObject({ status: 'stalled', delta: -150, target: 2350 })
  })
  it('bajando muy rápido: sugiere sumar 150 kcal', () => {
    const r = planAdvice(build((i) => (i < 7 ? 83 : 84)), plan, '2026-10-23', addDays)
    expect(r.status).toBe('fast')
  })
  it('ritmo sano: no cambia nada', () => {
    expect(planAdvice(build((i) => (i < 7 ? 83.6 : 84)), plan, '2026-10-23', addDays).status).toBe('ok')
  })
})

describe('cerrar el día', async () => {
  const { closeTheDay } = await import('./meals')
  const cands = [
    { id: 'taper', label: 'Taper pollo', kcal: 500, protein: 43 },
    { id: 'whey', label: 'Batido', kcal: 120, protein: 23 },
    { id: 'fideos', label: 'Fideos', kcal: 700, protein: 20 },
  ]
  it('elige la combinación que más proteína suma sin pasarse', () => {
    const r = closeTheDay(cands, 700, 70)
    expect(r.items.map((i) => i.id).sort()).toEqual(['taper', 'whey'])
    expect(r.kcal).toBe(620)
  })
  it('con pocas calorías elige lo que entra', () => {
    expect(closeTheDay(cands, 300, 40).items.map((i) => i.id)).toEqual(['whey'])
  })
  it('no sugiere nada si el día ya está cerrado', () => {
    expect(closeTheDay(cands, 150, 10)).toBeNull()
  })
})

describe('milanesas y nombres alternativos', () => {
  it('la pechuga se reconoce como suprema', () => {
    expect(food('pollo-pechuga').aliases).toContain('suprema')
  })
  it('milanesa de pollo: frita aporta más grasa que al horno', () => {
    const m = food('milanesa-pollo')
    expect(foodStates(m).map((s) => s.id)).toEqual(['raw', 'baked', 'fried'])
    expect(nutrientsFor(m, 150, 'fried').fat).toBeGreaterThan(nutrientsFor(m, 150, 'baked').fat)
    // 150 g al horno vienen de ~187 g crudos
    expect(rawGrams(m, 150, 'baked')).toBeCloseTo(187.5)
  })
})

describe('semillas y dietética', () => {
  it('1 cucharada de chía (12 g) aporta unas 58 kcal y 4 g de fibra', () => {
    const chia = food('chia')
    expect(chia.category).toBe('seeds')
    expect(nutrientsFor(chia, 12).kcal).toBeCloseTo(58.3, 0)
    expect(nutrientsFor(chia, 12).fiber).toBeCloseTo(4.1, 0)
  })
  it('lino se encuentra como linaza', () => {
    expect(food('lino').aliases).toContain('linaza')
  })
})

describe('quesos', () => {
  it('hay quesos uruguayos con precio por kg', () => {
    for (const id of ['queso-colonia', 'queso-cuartirolo', 'queso-danbo', 'queso-sbrinz', 'queso-provolone', 'queso-parmesano', 'queso-brie']) {
      expect(food(id)?.category).toBe('dairy')
      expect(food(id).price.uyu).toBeGreaterThan(0)
    }
  })
  it('una feta de Colonia (20 g) ronda 72 kcal y 5 g de proteína', () => {
    const n = nutrientsFor(food('queso-colonia'), 20)
    expect(n.kcal).toBeCloseTo(72, 0)
    expect(n.protein).toBeCloseTo(5, 0)
  })
  it('el magro sigue siendo el de menos grasa entre los semiduros', () => {
    expect(food('queso-magro').perGram.fat).toBeLessThan(food('queso-danbo').perGram.fat)
  })
})

describe('café negro Manzanares', () => {
  it('una taza casi no tiene calorías y cuesta unos $20', () => {
    const c = food('cafe-manzanares')
    expect(nutrientsFor(c, 200).kcal).toBeLessThan(5)
    expect(foodPricePerGram(c) * 200).toBeCloseTo(19.7, 0)
    expect(c.aliases).toContain('café negro')
  })
})

describe('exportar plantillas', async () => {
  const { buildTemplatesExport } = await import('./templatesExport')
  const mk = (fav) => ({ fav, data: computeRows(fav.rows, byId, [], variants) })
  const out = buildTemplatesExport([
    mk({ id: 't1', kind: 'tupper', name: 'Pollo con arroz', portions: 6, rows: [{ foodId: 'pollo-pechuga', state: 'raw', grams: 150 }, { foodId: 'arroz-blanco', state: 'cooked', grams: 200 }] }),
    mk({ id: 'b1', kind: 'breakfast', name: 'Avena con whey', rows: [{ foodId: 'avena', state: 'raw', grams: 60 }] }),
  ], new Date('2026-10-24T12:00:00Z'))
  it('agrupa por categoría con todas las categorías presentes', () => {
    expect(Object.keys(out.categorias)).toEqual(['tapers', 'desayunos', 'meriendas', 'comidas_libres'])
    expect(out.categorias.tapers.cantidad).toBe(1)
    expect(out.categorias.meriendas.plantillas).toEqual([])
    expect(out.total_plantillas).toBe(2)
  })
  it('incluye ingredientes con preparación, macros y costos', () => {
    const t = out.categorias.tapers.plantillas[0]
    expect(t.tapers_por_lote).toBe(6)
    expect(t.ingredientes[1]).toMatchObject({ alimento: 'Arroz blanco', preparacion: 'cocido', cantidad: 200, unidad: 'g' })
    expect(t.totales.kcal).toBe(422) // 150 g pollo crudo (165) + 200 g arroz cocido (257)
    expect(t.totales.costo_lote_uyu).toBeCloseTo(t.totales.costo_uyu * 6, 1)
  })
})

describe('comidas típicas uruguayas', async () => {
  const { detectIcon } = await import('./icons')
  it('tienen porción real, precio en pesos y categoría propia', () => {
    const chivito = food('chivito-pan')
    expect(chivito.category).toBe('typical')
    expect(chivito.unit).toEqual({ label: 'chivito', grams: 450 })
    expect(chivito.price.uyu).toBeGreaterThan(0)
    expect(nutrientsFor(chivito, 450).kcal).toBeCloseTo(1170)
    for (const id of ['milanesa-napolitana', 'pizza-muzzarella', 'faina', 'empanada-carne', 'vacio', 'chorizo-parrilla', 'morcilla', 'torta-frita', 'bizcocho', 'alfajor-maicena', 'dulce-de-leche']) {
      expect(food(id)?.category, id).toBe('typical')
    }
  })
  it('una comida de afuera suma su costo por porción', () => {
    const c = computeRows([{ foodId: 'empanada-carne', state: 'raw', grams: 360 }], byId, [], variants)
    expect(c.priced).toBe(1)
    expect(c.total.cost).toBeCloseTo(270) // 3 empanadas a $U 90
  })
  it('se encuentran por su nombre de todos los días', () => {
    expect(food('chivito-pan').aliases).toContain('chivito')
    expect(findVariant('Chivito canadiense al pan', variants)?.food.id).toBe('chivito-pan')
    expect(detectIcon('Chivito al plato')).toBe('🥪')
    expect(detectIcon('Pizza de muzzarella')).toBe('🍕')
    expect(detectIcon('Empanada de carne')).toBe('🥟')
  })
})

describe('sueño, hambre y medidas', async () => {
  const { sleepInsight, measureChanges } = await import('./model')
  const keys = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
  // Semana 1: duerme poco, mucha hambre, peso quieto. Semana 2: duerme bien, menos hambre, baja.
  const logs = Object.fromEntries(keys.map((k, i) => [k, i < 7
    ? { sleep: 6, hunger: 4, energy: 2, weight: 84 }
    : { sleep: 8, hunger: 2, energy: 4, weight: 84 - (i - 6) * 0.1 }]))
  logs['2026-10-01'].waist = 90
  logs['2026-10-14'].waist = 88.5
  logs['2026-10-01'].arm = 37

  it('compara el hambre de las noches cortas contra las buenas', () => {
    const s = sleepInsight(logs, keys)
    expect(s.nights).toBe(14)
    expect(s.avgSleep).toBeCloseTo(7)
    expect(s.enough).toBe(true)
    expect(s.hungerGap).toBeCloseTo(2)
    expect(s.energyGap).toBeCloseTo(-2)
  })
  it('detecta que las semanas de peor sueño frenan el peso', () => {
    const s = sleepInsight(logs, keys)
    expect(s.weeks).toBe(2)
    expect(s.changeWorst).toBeCloseTo(0)
    expect(s.changeBest).toBeCloseTo(-0.6)
  })
  it('pide más datos si faltan noches de un tipo', () => {
    const s = sleepInsight(logs, keys.slice(7))
    expect(s.enough).toBe(false)
    expect(s.hungerGap).toBeNull()
  })
  it('calcula primera, última y cambio de cada medida', () => {
    const m = Object.fromEntries(measureChanges(logs, keys).map((x) => [x.key, x]))
    expect(m.waist).toMatchObject({ first: 90, last: 88.5, count: 2 })
    expect(m.waist.change).toBeCloseTo(-1.5)
    expect(m.arm).toMatchObject({ first: 37, last: 37, change: null })
    expect(m.chest.count).toBe(0)
  })
})

describe('importar plantillas', async () => {
  const { buildTemplatesExport, parseTemplatesImport } = await import('./templatesExport')
  const favs = [
    { id: 't1', kind: 'tupper', name: 'Pollo con arroz', portions: 6, rows: [{ foodId: 'pollo-pechuga', state: 'raw', grams: 150 }, { foodId: 'arroz-blanco', state: 'cooked', grams: 200 }] },
    { id: 'b1', kind: 'breakfast', name: 'Huevos fritos', rows: [{ foodId: 'huevo', state: 'fried', grams: 100 }] },
  ]
  const exported = JSON.parse(JSON.stringify(buildTemplatesExport(favs.map((fav) => ({ fav, data: computeRows(fav.rows, byId, [], variants) })))))
  const strip = ({ id, ...t }) => t

  it('recupera las plantillas exportadas con su preparación y tapers por lote', () => {
    const res = parseTemplatesImport(exported, foods)
    expect(res.items).toEqual(favs.map(strip))
    expect(res.missing).toEqual([])
  })
  it('no duplica las que ya tenés y avisa de alimentos que no existen', () => {
    exported.categorias.meriendas.plantillas.push({ nombre: 'Rara', ingredientes: [{ alimento: 'Fruta inventada', alimento_id: 'nope', cantidad: 50 }] })
    const res = parseTemplatesImport(exported, foods, [favs[0]])
    expect(res.items.map((t) => t.name)).toEqual(['Huevos fritos'])
    expect(res.duplicates).toBe(1)
    expect(res.missing).toEqual(['Fruta inventada'])
  })
  it('acepta también la lista cruda de plantillas y rechaza otros archivos', () => {
    expect(parseTemplatesImport(favs, foods).items).toHaveLength(2)
    expect(() => parseTemplatesImport({ hola: 1 }, foods)).toThrow()
  })
})
