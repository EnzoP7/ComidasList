// Registro de fuerza: series por ejercicio y progresión de cargas.
// En déficit, mantener o subir las cargas es la mejor señal de que el músculo se queda.

// Fuerza estimada a 1 repetición (Epley). Hasta 12 reps es razonablemente fiable.
export const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? (reps === 1 ? kg : kg * (1 + Math.min(reps, 12) / 30)) : 0)

export const exerciseKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ')

// Mejor serie de una lista: por 1RM estimado, o por repeticiones si es con peso corporal
export function bestSet(sets) {
  let best = null
  for (const s of sets) {
    const score = s.kg > 0 ? e1rm(s.kg, s.reps) : s.reps / 1000
    if (!best || score > best.score) best = { ...s, score, e1rm: e1rm(s.kg, s.reps) }
  }
  return best
}

const setsOf = (day) => (day?.training ?? []).flatMap((t) => t.sets ?? [])

/** Historial por ejercicio en las fechas dadas: [{ name, sessions: [{ day, sets, best, volume }] }] */
export function exerciseHistory(logs, keys) {
  const map = new Map()
  for (const day of keys) {
    const byEx = new Map()
    for (const s of setsOf(logs[day])) {
      if (!s.exercise) continue
      const k = exerciseKey(s.exercise)
      if (!byEx.has(k)) byEx.set(k, { name: s.exercise.trim(), sets: [] })
      byEx.get(k).sets.push(s)
    }
    for (const [k, { name, sets }] of byEx) {
      if (!map.has(k)) map.set(k, { name, sessions: [] })
      map.get(k).sessions.push({
        day, sets, best: bestSet(sets), volume: sets.reduce((v, s) => v + (s.kg || 0) * (s.reps || 0), 0),
      })
    }
  }
  return [...map.values()]
}

// Última sesión de un ejercicio antes de una fecha (para "la vez pasada hiciste…")
export function lastSession(logs, exercise, beforeKey) {
  const k = exerciseKey(exercise)
  const days = Object.keys(logs).filter((d) => d < beforeKey).sort().reverse()
  for (const day of days) {
    const sets = setsOf(logs[day]).filter((s) => s.exercise && exerciseKey(s.exercise) === k)
    if (sets.length) return { day, sets, best: bestSet(sets) }
  }
  return null
}

// Mejor marca histórica antes de una fecha
export function recordBefore(logs, exercise, beforeKey) {
  const k = exerciseKey(exercise)
  const sets = Object.keys(logs).filter((d) => d < beforeKey)
    .flatMap((d) => setsOf(logs[d]).filter((s) => s.exercise && exerciseKey(s.exercise) === k))
  return sets.length ? bestSet(sets) : null
}

/** Primera vs. última sesión de cada ejercicio en el período, más usado primero */
export function strengthProgress(logs, keys) {
  return exerciseHistory(logs, keys)
    .map(({ name, sessions }) => {
      const first = sessions[0].best, last = sessions.at(-1).best
      const weighted = first.kg > 0 && last.kg > 0
      const change = sessions.length < 2 ? null
        : weighted ? (last.e1rm - first.e1rm) / first.e1rm : (last.reps - first.reps) / Math.max(1, first.reps)
      return { name, sessions: sessions.length, first, last, firstDay: sessions[0].day, lastDay: sessions.at(-1).day, weighted, change }
    })
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
}

// Ejercicios usados alguna vez, del más frecuente al menos (para autocompletar)
export function knownExercises(logs) {
  const count = new Map()
  for (const day of Object.values(logs)) {
    for (const s of setsOf(day)) {
      if (!s.exercise) continue
      const k = exerciseKey(s.exercise)
      const prev = count.get(k)
      count.set(k, { name: prev?.name ?? s.exercise.trim(), n: (prev?.n ?? 0) + 1 })
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n).map((x) => x.name)
}

export const COMMON_EXERCISES = [
  'Sentadilla', 'Press banca', 'Peso muerto', 'Press militar', 'Remo con barra', 'Dominadas',
  'Peso muerto rumano', 'Hip thrust', 'Press inclinado mancuernas', 'Jalón al pecho', 'Remo en polea',
  'Prensa', 'Zancadas', 'Fondos', 'Curl de bíceps', 'Extensión de tríceps', 'Elevaciones laterales',
]
