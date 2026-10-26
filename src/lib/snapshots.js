// Copias de seguridad automáticas: una por día, se guardan las últimas 7 en este navegador.
import { exportAll, importAll } from './storage'

const KEY = 'recomp-snapshots' // fuera del prefijo "recomp:" para no exportarse a sí misma
const KEEP = 7

export function listSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function write(list) {
  // Si no entra en el almacenamiento, se descartan las más viejas hasta que entre
  let items = list
  while (items.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
      return
    } catch {
      items = items.slice(1)
    }
  }
}

// Guarda la copia del día si todavía no existe
export function takeDailySnapshot(todayKey) {
  const list = listSnapshots()
  if (list.at(-1)?.day === todayKey) return
  write([...list, { day: todayKey, at: Date.now(), backup: exportAll() }].slice(-KEEP))
}

export function restoreSnapshot(day) {
  const snap = listSnapshots().find((s) => s.day === day)
  if (!snap) throw new Error('No se encontró esa copia')
  importAll(snap.backup)
}

export const snapshotSize = (s) => JSON.stringify(s.backup).length
