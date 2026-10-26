// Copias de seguridad automáticas: una por día, se guardan las últimas 14 en IndexedDB
// (aparte de localStorage, así no le quitan espacio a los datos de la app).
import { exportAll, importAll } from './storage'
import { STORES, idbAll, idbDelete, idbPut } from './idb'

const LEGACY_KEY = 'recomp-snapshots' // versión anterior: vivían en localStorage
const KEEP = 14

// Pasa las copias viejas de localStorage a IndexedDB y libera ese espacio
async function migrateLegacy() {
  let legacy
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null') } catch { legacy = null }
  if (!Array.isArray(legacy)) return
  for (const s of legacy) if (s?.day && s.backup) await idbPut(STORES.snapshots, s)
  localStorage.removeItem(LEGACY_KEY)
}

export async function listSnapshots() {
  try {
    await migrateLegacy()
    return (await idbAll(STORES.snapshots)).sort((a, b) => a.day.localeCompare(b.day))
  } catch {
    return []
  }
}

// Guarda la copia del día si todavía no existe y descarta las más viejas
export async function takeDailySnapshot(todayKey) {
  const list = await listSnapshots()
  if (list.at(-1)?.day === todayKey) return
  try {
    await idbPut(STORES.snapshots, { day: todayKey, at: Date.now(), backup: exportAll() })
    for (const old of list.slice(0, Math.max(0, list.length + 1 - KEEP))) await idbDelete(STORES.snapshots, old.day)
  } catch {
    // sin IndexedDB: se sigue sin copias automáticas (queda el exportar manual)
  }
}

export async function restoreSnapshot(day) {
  const snap = (await listSnapshots()).find((s) => s.day === day)
  if (!snap) throw new Error('No se encontró esa copia')
  importAll(snap.backup)
}

export const snapshotSize = (s) => JSON.stringify(s.backup).length
