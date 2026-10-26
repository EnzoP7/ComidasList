import { useEffect, useState } from 'react'

const PREFIX = 'recomp:'
export const SCHEMA_VERSION = 2

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

// Si el guardado falla (almacenamiento lleno o bloqueado) se avisa con un evento:
// la app muestra un cartel para que se exporte una copia antes de perder datos.
export const SAVE_ERROR_EVENT = 'recomp:save-error'
// Un dato cambió de verdad en este navegador (la sincronización lo sube)
export const LOCAL_CHANGE_EVENT = 'recomp:local-change'
// Llegaron datos más nuevos de la nube (los estados de React se recargan)
export const REMOTE_UPDATE_EVENT = 'recomp:remote-update'

export function save(key, value) {
  try {
    const raw = JSON.stringify(value)
    // Sin cambios no se escribe ni se avisa: así abrir la app no cuenta como una edición
    if (localStorage.getItem(PREFIX + key) === raw) return true
    localStorage.setItem(PREFIX + key, raw)
    if (STORAGE_KEYS.includes(key)) globalThis.dispatchEvent?.(new CustomEvent(LOCAL_CHANGE_EVENT, { detail: { key } }))
    return true
  } catch (err) {
    globalThis.dispatchEvent?.(new CustomEvent(SAVE_ERROR_EVENT, { detail: { key, error: err } }))
    return false
  }
}

// Estado de React persistido en localStorage
export function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))
  useEffect(() => { save(key, value) }, [key, value])
  // Si la sincronización trae una versión más nueva de esta clave, se toma
  useEffect(() => {
    const onRemote = (e) => { if (e.detail?.keys?.includes(key)) setValue(load(key, fallback)) }
    globalThis.addEventListener?.(REMOTE_UPDATE_EVENT, onRemote)
    return () => globalThis.removeEventListener?.(REMOTE_UPDATE_EVENT, onRemote)
  }, [key])
  return [value, setValue]
}

// Acceso directo al texto guardado (la sincronización lo sube y baja tal cual)
export const loadRaw = (key) => localStorage.getItem(PREFIX + key)
export const saveRaw = (key, raw) => localStorage.setItem(PREFIX + key, raw)

// Pide al navegador que no borre los datos de la app cuando necesite espacio
export async function requestPersistence() {
  try {
    if (await navigator.storage?.persisted?.()) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export const STORAGE_KEYS = ['settings', 'logs', 'recipes', 'prices', 'foods', 'favorites', 'expenses', 'shopping']

// Forma esperada de cada clave: objeto o lista
const SHAPES = {
  settings: 'object', logs: 'object', recipes: 'array', prices: 'array',
  foods: 'object', favorites: 'array', expenses: 'array', shopping: 'object',
}
const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v)

export function exportAll() {
  const data = {}
  for (const k of STORAGE_KEYS) data[k] = load(k, null)
  return { app: 'recomp', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }
}

/**
 * Revisa una copia antes de tocar nada. Devuelve los datos listos para guardar
 * (ya migrados a la versión actual) o lanza un error que se puede mostrar.
 */
export function validateBackup(json) {
  if (!json || json.app !== 'recomp' || !isObject(json.data)) throw new Error('Archivo no válido: no es una copia de Recomp')
  const version = json.version ?? 1
  if (version > SCHEMA_VERSION) throw new Error('Esa copia es de una versión más nueva de la app')
  const data = {}
  for (const k of STORAGE_KEYS) {
    const v = json.data[k]
    if (v == null) continue
    const ok = SHAPES[k] === 'array' ? Array.isArray(v) : isObject(v)
    if (!ok) throw new Error(`Archivo dañado: "${k}" no tiene el formato esperado`)
    data[k] = v
  }
  if (data.logs) {
    for (const [key, day] of Object.entries(data.logs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isObject(day)) throw new Error(`Archivo dañado: el día "${key}" no es válido`)
    }
  }
  return migrate(data, version)
}

// Migraciones de datos entre versiones de la copia
export function migrate(data, fromVersion) {
  const out = { ...data }
  if (fromVersion < 2 && out.logs) {
    // v2: comidas y días mantienen su forma; solo se limpian días sin contenido
    out.logs = Object.fromEntries(Object.entries(out.logs).filter(([, d]) => d && Object.keys(d).length))
  }
  return out
}

export function importAll(json) {
  const data = validateBackup(json)
  // Se valida todo primero y recién después se escribe: nunca queda una copia a medias
  for (const k of Object.keys(data)) {
    if (!save(k, data[k])) throw new Error('No hay espacio en el navegador para importar la copia')
  }
}

// Última vez que se descargó una copia (para recordarlo)
export const lastExportAt = () => load('ui:lastExport', null)

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function downloadBackup() {
  downloadJson(exportAll(), `recomp-backup-${new Date().toISOString().slice(0, 10)}.json`)
  save('ui:lastExport', Date.now())
}
