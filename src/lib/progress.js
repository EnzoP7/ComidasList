// Lecturas del progreso real: mantenimiento medido, proyección de metas y fases de déficit.
import { addDays, fromKey } from './date'
import { dayTotals } from './model'

const KCAL_PER_KG = 7700
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5)

// Recta por mínimos cuadrados: pendiente (por día) y valor ajustado en un x dado
export function fitLine(points) {
  if (points.length < 2) return null
  const mx = mean(points.map((p) => p.x))
  const my = mean(points.map((p) => p.y))
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  if (!den) return null
  const slope = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / den
  return { slope, at: (x) => my + slope * (x - mx) }
}

// Días con menos de esto anotado se toman como registro incompleto (no cuentan para el promedio)
export const MIN_LOGGED_KCAL = 1000

/**
 * Mantenimiento medido: lo que comiste en promedio menos lo que cambió tu peso.
 * Si comiste 2.400 kcal/día y bajaste 0,35 kg/semana, gastás ≈ 2.400 + 0,35 × 7.700 / 7.
 * Usa los últimos `days` días hasta `endKey` (conviene ayer: hoy todavía no terminó).
 * Pide al menos 14 días con comida anotada y 6 pesajes separados por 10 días o más.
 */
export function adaptiveTdee(logs, endKey, days = 21) {
  const keys = Array.from({ length: days }, (_, i) => addDays(endKey, i - days + 1))
  const intake = keys
    .map((k) => (logs[k]?.meals?.length ? dayTotals(logs[k]).kcal : null))
    .filter((k) => k != null && k >= MIN_LOGGED_KCAL)
  const weights = keys.map((k, i) => ({ x: i, y: logs[k]?.weight })).filter((p) => p.y)
  const span = weights.length ? weights.at(-1).x - weights[0].x : 0
  const base = { intakeDays: intake.length, weighins: weights.length, need: { intakeDays: 14, weighins: 6 } }
  if (intake.length < 14 || weights.length < 6 || span < 10) return { status: 'waiting', ...base }
  const kgPerDay = fitLine(weights).slope
  const avgIntake = mean(intake)
  return {
    status: 'ok', ...base,
    intake: Math.round(avgIntake),
    kgPerWeek: kgPerDay * 7,
    tdee: Math.round((avgIntake - kgPerDay * KCAL_PER_KG) / 10) * 10,
  }
}

/**
 * Cuándo llegás a una meta (peso o cintura) al ritmo actual.
 * Ajusta una recta a los registros de las últimas `days` jornadas.
 */
export function projectGoal(logs, todayKey, field, goal, { days = 28, minPoints = 3 } = {}) {
  if (!goal) return { status: 'no-goal' }
  const keys = Array.from({ length: days }, (_, i) => addDays(todayKey, i - days + 1))
  const points = keys.map((k, i) => ({ x: i, y: logs[k]?.[field] })).filter((p) => p.y)
  const span = points.length ? points.at(-1).x - points[0].x : 0
  if (points.length < minPoints || span < 7) return { status: 'waiting', points: points.length, minPoints }
  const line = fitLine(points)
  const current = line.at(days - 1)
  const perWeek = line.slope * 7
  if (current <= goal) return { status: 'reached', current, perWeek }
  if (line.slope >= -0.0005) return { status: 'stalled', current, perWeek }
  const daysLeft = Math.ceil((current - goal) / -line.slope)
  return { status: 'ok', current, perWeek, daysLeft, date: addDays(todayKey, daysLeft) }
}

/**
 * Fase de déficit: semana actual y si toca una semana de mantenimiento.
 * El nivel agresivo se limita a 8 semanas.
 */
export function phaseStatus(settings, todayKey) {
  if (settings.breakUntil && todayKey <= settings.breakUntil) {
    return { status: 'break', until: settings.breakUntil, daysLeft: daysBetween(todayKey, settings.breakUntil) + 1 }
  }
  if (!settings.phaseStart || settings.phaseStart > todayKey) return { status: 'none' }
  const week = Math.floor(daysBetween(settings.phaseStart, todayKey) / 7) + 1
  const limit = settings.deficitLevel === 'aggressive' ? Math.min(settings.phaseWeeks ?? 12, 8) : settings.phaseWeeks ?? 12
  return { status: week > limit ? 'due' : 'active', week, limit, start: settings.phaseStart }
}

// Ajustes para empezar una semana de mantenimiento hoy; la fase nueva arranca al terminar
export const startBreak = (todayKey) => ({ breakUntil: addDays(todayKey, 6), phaseStart: addDays(todayKey, 7) })
