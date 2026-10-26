// Claves de fecha en hora local: YYYY-MM-DD
export function toKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export const todayKey = () => toKey()

const longFmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

export const formatLong = (key) => longFmt.format(fromKey(key))
export const formatShort = (key) => shortFmt.format(fromKey(key)).replace('.', '')

export function lastNDays(n, end = todayKey()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i))
  return out
}

// Lunes de la semana ISO de una fecha
export function weekStart(key) {
  const d = fromKey(key)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toKey(d)
}
