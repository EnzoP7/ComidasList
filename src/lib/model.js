import { fromKey } from './date'

export const DEFAULT_SETTINGS = {
  // Perfil
  age: 23,
  heightCm: 189.5,
  startWeight: 83.5,
  useLoggedWeight: true, // usar el último peso registrado para los cálculos
  activity: 1.55, // 10-12k pasos + fuerza 3-4 días
  // Plan
  deficitLevel: 'recommended', // conservative | recommended | aggressive | custom
  aggressivePct: 0.22, // entre 0,20 y 0,25
  customCalories: 2400,
  proteinPerKg: 2,
  fatPerKg: 0.9,
  // Otras metas
  stepsGoal: 10000,
  stepsStretch: 12000,
  waterGoal: 3, // litros (~35 ml/kg)
  sleepGoal: 7.5, // horas
  monthlyBudget: null, // $U; null = usar la estimación de Presupuesto
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentario', detail: 'Menos de 5.000 pasos, sin entrenar' },
  { value: 1.375, label: 'Ligera', detail: '5-8k pasos o fuerza 1-2 días' },
  { value: 1.55, label: 'Moderada', detail: '10-12k pasos + fuerza 3-4 días' },
  { value: 1.725, label: 'Alta', detail: '12k+ pasos + fuerza 5-6 días' },
]

export const DEFICIT_LEVELS = [
  { id: 'conservative', label: 'Conservador', pace: 'Lento', pct: 0.1, detail: 'Sostenible a largo plazo, casi sin hambre.' },
  { id: 'recommended', label: 'Recomendado', pace: 'Óptimo', pct: 0.15, detail: 'Protege el músculo y quema grasa de forma constante.' },
  { id: 'aggressive', label: 'Agresivo', pace: 'Rápido', pct: null, detail: 'Fases cortas (4-8 semanas) con mucho control.' },
]

const KCAL_PER_KG_FAT = 7700
const round10 = (n) => Math.round(n / 10) * 10

// Mifflin-St Jeor (hombre): TMB = 10·peso + 6,25·altura − 5·edad + 5
export const bmrOf = (settings, weight) =>
  10 * (weight ?? settings.startWeight) + 6.25 * settings.heightCm - 5 * settings.age + 5

// Gasto energético total (mantenimiento) = TMB × factor de actividad
export const maintenance = (settings, weight) => round10(bmrOf(settings, weight) * settings.activity)

// Peso para los cálculos: el último registrado o el de referencia
export const planWeight = (settings, logs, uptoKey) =>
  (settings.useLoggedWeight && latestWeight(logs, uptoKey)) || settings.startWeight

/**
 * Plan completo: TMB, mantenimiento, niveles de déficit, objetivo calórico y macros.
 * Proteína fija por kg, grasas por kg y carbohidratos = el resto de las calorías.
 */
export function computePlan(settings, weight) {
  const bmr = bmrOf(settings, weight)
  const tdee = maintenance(settings, weight)
  const levels = DEFICIT_LEVELS.map((l) => {
    const pct = l.id === 'aggressive' ? settings.aggressivePct : l.pct
    const kcal = round10(tdee * (1 - pct))
    const deficit = tdee - kcal
    return { ...l, pct, kcal, deficit, weeklyKg: (deficit * 7) / KCAL_PER_KG_FAT }
  })
  const chosen = levels.find((l) => l.id === settings.deficitLevel)
  const calorieGoal = chosen ? chosen.kcal : settings.customCalories
  const deficit = tdee - calorieGoal

  const protein = Math.round(weight * settings.proteinPerKg)
  const fat = Math.round(weight * settings.fatPerKg)
  const carbs = Math.max(0, Math.round((calorieGoal - protein * 4 - fat * 9) / 4))
  return {
    weight, bmr: Math.round(bmr), tdee, levels, calorieGoal, deficit,
    deficitPct: tdee ? deficit / tdee : 0,
    weeklyKg: (deficit * 7) / KCAL_PER_KG_FAT,
    macros: { protein, fat, carbs },
  }
}

// ── Calorías quemadas por actividad ──────────────────────────────────────────
// Entrenamientos con su MET (equivalente metabólico). Se cuenta solo lo que suma
// sobre el reposo: (MET − 1) × kg × horas.
export const TRAINING_TYPES = [
  { id: 'strength', label: 'Fuerza', icon: '🏋️', met: 5 },
  { id: 'cardio', label: 'Cardio moderado', icon: '🏃', met: 7 },
  { id: 'hiit', label: 'HIIT', icon: '🔥', met: 8 },
  { id: 'sport', label: 'Fútbol / deporte', icon: '⚽', met: 7 },
  { id: 'bike', label: 'Bici / caminata rápida', icon: '🚴', met: 4.5 },
]
export const trainingType = (id) => TRAINING_TYPES.find((t) => t.id === id) ?? TRAINING_TYPES[0]

export const trainingKcal = (session, weight) =>
  ((trainingType(session.type).met - 1) * weight * (session.minutes || 0)) / 60

// ~0,0005 kcal por paso y kg (≈ 0,42 kcal/paso a 83 kg → 10.000 pasos ≈ 420 kcal)
export const stepsKcal = (steps, weight) => (steps || 0) * weight * 0.0005

/**
 * Gasto del día: base (TMB × 1,15, incluye digestión y movimiento mínimo) + actividad.
 * Si el usuario carga las kcal activas de su reloj, se usan en lugar de la estimación.
 */
export function dayBurn(day, settings, weight) {
  const base = bmrOf(settings, weight) * 1.15
  const steps = stepsKcal(day?.steps, weight)
  const training = (day?.training ?? []).reduce((s, t) => s + trainingKcal(t, weight), 0)
  const manual = day?.activeKcal ?? null
  const active = manual ?? steps + training
  return { base, steps, training, manual, active, total: base + active }
}

export const emptyDay = () => ({
  weight: null, waist: null, hips: null, chest: null, arm: null, steps: null, meals: [], water: [], training: [], activeKcal: null,
  sleep: null, hunger: null, energy: null, // horas · escala 1–5 · escala 1–5
})

export const waterTotal = (day) => (day?.water ?? []).reduce((s, w) => s + w.ml, 0)

/**
 * Chequeos del día contra el plan. Calorías: entre 90% y 105% del objetivo (solo si se anotó comida).
 * Un día está "dentro del plan" con calorías bien y al menos 3 de 4 chequeos cumplidos.
 */
export function dayChecks(day, settings) {
  const meals = day?.meals ?? []
  const kcal = meals.reduce((s, m) => s + (m.kcal || 0), 0)
  const protein = meals.reduce((s, m) => s + (m.protein || 0), 0)
  const water = waterTotal(day)
  const checks = [
    { id: 'kcal', label: 'Calorías', ok: meals.length > 0 && kcal >= settings.calorieGoal * 0.9 && kcal <= settings.calorieGoal * 1.05, logged: meals.length > 0 },
    { id: 'protein', label: 'Proteína', ok: protein >= settings.proteinGoal * 0.95, logged: meals.length > 0 },
    { id: 'steps', label: 'Pasos', ok: (day?.steps ?? 0) >= settings.stepsGoal, logged: day?.steps != null },
    { id: 'water', label: 'Agua', ok: water >= settings.waterGoal * 1000, logged: water > 0 },
  ]
  const passed = checks.filter((c) => c.ok).length
  const logged = checks.some((c) => c.logged)
  return { checks, passed, logged, inPlan: checks[0].ok && passed >= 3 }
}

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function dayTotals(day) {
  const meals = day?.meals ?? []
  return {
    kcal: meals.reduce((s, m) => s + (m.kcal || 0), 0),
    protein: meals.reduce((s, m) => s + (m.protein || 0), 0),
    fat: meals.reduce((s, m) => s + (m.fat || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
  }
}

// Último peso registrado en o antes de una fecha
export function latestWeight(logs, uptoKey) {
  const keys = Object.keys(logs).filter((k) => k <= uptoKey && logs[k]?.weight).sort()
  return keys.length ? logs[keys.at(-1)].weight : null
}

export function recipeMacros(recipe) {
  // Lotes creados en Crear taper guardan sus macros completos por taper
  if (recipe.perTaper) return recipe.perTaper
  if (recipe.mode === 'manual') {
    return { kcal: recipe.kcalPerPortion || 0, protein: recipe.proteinPerPortion || 0 }
  }
  const total = (recipe.ingredients ?? []).reduce(
    (acc, ing) => {
      const g = ing.grams || 0
      acc.kcal += (g * (ing.kcal || 0)) / 100
      acc.protein += (g * (ing.protein || 0)) / 100
      return acc
    },
    { kcal: 0, protein: 0 },
  )
  const p = Math.max(1, recipe.portions || 1)
  return { kcal: Math.round(total.kcal / p), protein: Math.round((total.protein / p) * 10) / 10 }
}

const QUOTES = [
  'Los flotadores no se van con abdominales: se van con déficit, proteína y pasos. Hoy cuenta.',
  'La grasa de los flancos es la última en irse. Por eso la constancia gana a la intensidad.',
  '165 g de proteína hoy = músculo que se queda mientras la cintura se reduce.',
  'Cada 10.000 pasos son ~400 kcal que salen de algún sitio. Que sea de los costados.',
  'No necesitas un día perfecto. Necesitas otro día dentro del plan.',
  'El tupper ya está hecho. La decisión difícil la tomaste el domingo.',
  'Medir la cintura cada semana dice más que la báscula cada día.',
  'Déficit ligero, fuerza pesada. Así se esculpe, no se encoge.',
  'La recomposición es lenta y silenciosa… hasta que un día te ves en el espejo.',
  'Duerme 7-8 h: el cortisol alto también ama los flotadores.',
]

export function quoteFor(key) {
  const d = fromKey(key)
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5)
  return QUOTES[dayOfYear % QUOTES.length]
}

/**
 * Ajuste sugerido del plan según el ritmo real: promedio de peso de los últimos 7 días
 * contra los 7 anteriores (mínimo 3 pesajes en cada semana).
 *  - bajando menos de 0,1 kg/semana → recortar 150 kcal (o sumar pasos si ya está cerca del basal)
 *  - bajando más de 0,75 kg/semana → sumar 150 kcal para cuidar el músculo
 */
export function planAdvice(logs, plan, todayKey, addDaysFn) {
  const weightsIn = (from, to) => {
    const out = []
    for (let i = from; i <= to; i++) {
      const w = logs[addDaysFn(todayKey, -i)]?.weight
      if (w) out.push(w)
    }
    return out
  }
  const recent = weightsIn(0, 6)
  const before = weightsIn(7, 13)
  if (recent.length < 3 || before.length < 3) {
    return { status: 'waiting', need: Math.max(0, 3 - recent.length) + Math.max(0, 3 - before.length) }
  }
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  const rate = avg(recent) - avg(before) // kg por semana (negativo = bajando)
  if (rate > -0.1) {
    const target = plan.calorieGoal - 150
    return target >= plan.bmr
      ? { status: 'stalled', rate, delta: -150, target }
      : { status: 'stalled-floor', rate }
  }
  if (rate < -0.75) return { status: 'fast', rate, delta: 150, target: plan.calorieGoal + 150 }
  return { status: 'ok', rate }
}

// ── Sueño, hambre y energía ─────────────────────────────────────────────────
export const BODY_MEASURES = [
  { key: 'waist', label: 'Cintura', hint: 'A la altura del ombligo, relajado' },
  { key: 'hips', label: 'Cadera', hint: 'En la parte más ancha de la cola' },
  { key: 'chest', label: 'Pecho', hint: 'A la altura de los pezones, sin inflar' },
  { key: 'arm', label: 'Brazo', hint: 'Bíceps relajado, en la parte más ancha' },
]

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/**
 * Cruza el sueño con el hambre, la energía y el peso.
 * Compara los días que dormiste menos de 7 h con los de 7 h o más (mínimo 3 de cada uno),
 * y las semanas con peor sueño contra las mejores en cuánto bajó el peso.
 */
export function sleepInsight(logs, keys) {
  const days = keys.map((k) => ({ k, d: logs[k] })).filter((x) => x.d?.sleep)
  const short = days.filter((x) => x.d.sleep < 7)
  const long = days.filter((x) => x.d.sleep >= 7)
  const avgOf = (xs, f) => mean(xs.map((x) => x.d[f]).filter((v) => v != null))
  const out = {
    nights: days.length,
    avgSleep: mean(days.map((x) => x.d.sleep)),
    avgHunger: mean(keys.map((k) => logs[k]?.hunger).filter((v) => v != null)),
    avgEnergy: mean(keys.map((k) => logs[k]?.energy).filter((v) => v != null)),
    short: short.length, long: long.length,
    hungerShort: avgOf(short, 'hunger'), hungerLong: avgOf(long, 'hunger'),
    energyShort: avgOf(short, 'energy'), energyLong: avgOf(long, 'energy'),
  }
  out.enough = short.length >= 3 && long.length >= 3
  out.hungerGap = out.enough && out.hungerShort != null && out.hungerLong != null ? out.hungerShort - out.hungerLong : null
  out.energyGap = out.enough && out.energyShort != null && out.energyLong != null ? out.energyShort - out.energyLong : null

  // Semanas de 7 días: sueño medio y cambio de peso (primer vs último pesaje)
  const weeks = []
  for (let i = 0; i + 7 <= keys.length; i += 7) {
    const wk = keys.slice(i, i + 7)
    const sl = mean(wk.map((k) => logs[k]?.sleep).filter(Boolean))
    const ws = wk.map((k) => logs[k]?.weight).filter(Boolean)
    if (sl != null && ws.length >= 2) weeks.push({ sleep: sl, change: ws.at(-1) - ws[0] })
  }
  if (weeks.length >= 2) {
    const sorted = [...weeks].sort((a, b) => a.sleep - b.sleep)
    const half = Math.floor(sorted.length / 2)
    out.weeks = weeks.length
    out.changeWorst = mean(sorted.slice(0, half).map((w) => w.change))
    out.changeBest = mean(sorted.slice(-half).map((w) => w.change))
  }
  return out
}

/** Primera y última medida de cada parte del cuerpo dentro de las fechas dadas. */
export function measureChanges(logs, keys) {
  return BODY_MEASURES.map((m) => {
    const vals = keys.filter((k) => logs[k]?.[m.key]).map((k) => ({ k, v: logs[k][m.key] }))
    if (!vals.length) return { ...m, first: null, last: null, change: null, count: 0 }
    const first = vals[0], last = vals.at(-1)
    return { ...m, first: first.v, firstKey: first.k, last: last.v, lastKey: last.k, change: vals.length > 1 ? last.v - first.v : null, count: vals.length }
  })
}
