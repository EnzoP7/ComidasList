// Sincronización con la nube (Turso, a través de /api/sync). Las fotos no se suben.
//
// - El navegador sigue siendo la fuente inmediata: todo se guarda primero acá y funciona sin internet.
// - Cada clave (logs, recipes, settings…) lleva la hora de su último cambio. Al sincronizar
//   gana la versión más nueva de cada clave (en la nube y en el navegador).
// - Los cambios se suben solos a los pocos segundos; al abrir la app o volver a ella se baja lo nuevo.
import { useSyncExternalStore } from 'react'
import { LOCAL_CHANGE_EVENT, REMOTE_UPDATE_EVENT, STORAGE_KEYS, load, loadRaw, save, saveRaw } from './storage'

const ENDPOINT = '/api/sync'
const PUSH_DELAY_MS = 2500

// ── Estado (guardado en localStorage, fuera de la copia .json) ─────────────
const getPassword = () => load('sync:password', null)
const getMeta = () => load('sync:meta', {}) // { [clave]: hora del último cambio }
const getDirty = () => load('sync:dirty', []) // claves con cambios sin subir
const setMeta = (m) => save('sync:meta', m)
const setDirty = (d) => save('sync:dirty', [...new Set(d)])

// Diferencia de reloj con el servidor: las horas de cambio se guardan en hora del servidor
let clockOffset = load('sync:offset', 0)
const now = () => Date.now() + clockOffset

let status = { state: getPassword() ? 'idle' : 'off', lastSync: load('sync:last', null), error: null, pending: getDirty().length }
const listeners = new Set()
function setStatus(patch) {
  status = { ...status, pending: getDirty().length, ...patch }
  listeners.forEach((l) => l())
}
export const useSyncStatus = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => status)
export const isConnected = () => Boolean(getPassword())

// ── Red ─────────────────────────────────────────────────────────────────────
async function api(method, body, password = getPassword()) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method,
      headers: { authorization: `Bearer ${password}`, ...(body && { 'content-type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('Sin conexión: los cambios quedan guardados acá y se suben cuando vuelva internet.'), { offline: true })
  }
  const data = await res.json().catch(() => null)
  if (res.status === 401) throw Object.assign(new Error('Contraseña incorrecta'), { auth: true })
  if (res.status === 404) throw new Error('No se encontró el servidor de sincronización: funciona en la versión publicada en Vercel (o con npm run dev y .env.local).')
  if (!res.ok) throw new Error(data?.error ?? `El servidor respondió con error ${res.status}`)
  if (data?.serverTime) {
    clockOffset = data.serverTime - Date.now()
    save('sync:offset', clockOffset)
  }
  return data
}

// Toma de la nube lo que sea más nuevo que lo de este navegador y avisa a la app
function applyRemote(items) {
  const meta = getMeta()
  const dirty = getDirty()
  const changed = []
  for (const [key, item] of Object.entries(items ?? {})) {
    if (!STORAGE_KEYS.includes(key)) continue
    if (item.updatedAt <= (meta[key] ?? 0)) continue // lo de acá es igual o más nuevo
    saveRaw(key, item.value)
    meta[key] = item.updatedAt
    changed.push(key)
  }
  if (!changed.length) return []
  setMeta(meta)
  setDirty(dirty.filter((k) => !changed.includes(k)))
  globalThis.dispatchEvent(new CustomEvent(REMOTE_UPDATE_EVENT, { detail: { keys: changed } }))
  return changed
}

async function pull() {
  const data = await api('GET')
  return applyRemote(data.items)
}

async function push() {
  const dirty = getDirty()
  if (!dirty.length) return
  const meta = getMeta()
  const items = dirty
    .map((key) => ({ key, value: loadRaw(key), updatedAt: meta[key] ?? now() }))
    .filter((it) => it.value != null)
  const data = await api('PUT', { items })
  // Se quitan de pendientes solo las que no volvieron a cambiar mientras se subían
  const after = getMeta()
  setDirty(getDirty().filter((k) => !items.some((it) => it.key === k && after[k] === it.updatedAt)))
  applyRemote(data.newer)
}

// ── Ciclo de sincronización ────────────────────────────────────────────────
let running = null
let again = false

export function syncNow() {
  if (!getPassword()) return Promise.resolve()
  if (running) { again = true; return running }
  running = (async () => {
    setStatus({ state: 'syncing', error: null })
    try {
      do {
        again = false
        await pull()
        await push()
      } while (again)
      const lastSync = Date.now()
      save('sync:last', lastSync)
      setStatus({ state: 'idle', lastSync, error: null })
    } catch (err) {
      setStatus({ state: err.offline ? 'offline' : 'error', error: err.message })
      if (err.auth) disconnect('La contraseña cambió: volvé a conectar.')
    } finally {
      running = null
    }
  })()
  return running
}

let timer = null
function onLocalChange(e) {
  const key = e.detail?.key
  if (!STORAGE_KEYS.includes(key)) return
  setMeta({ ...getMeta(), [key]: now() })
  setDirty([...getDirty(), key])
  setStatus({})
  if (!getPassword()) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, PUSH_DELAY_MS)
}

let started = false
export function startSync() {
  if (started) return
  started = true
  globalThis.addEventListener(LOCAL_CHANGE_EVENT, onLocalChange)
  globalThis.addEventListener('online', syncNow)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  // Antes de cerrar la pestaña, intenta subir lo pendiente
  globalThis.addEventListener('pagehide', () => { if (getDirty().length && getPassword()) { clearTimeout(timer); syncNow() } })
  syncNow()
}

// ── Conectar y desconectar ─────────────────────────────────────────────────
/**
 * Prueba la contraseña y mira qué hay en la nube. No cambia nada todavía.
 * Devuelve { cloudKeys, cloudUpdatedAt, localHasData } para decidir qué hacer.
 */
export async function probe(password) {
  const data = await api('GET', null, password)
  const items = data.items ?? {}
  const times = Object.values(items).map((i) => i.updatedAt)
  return {
    cloudKeys: Object.keys(items).length,
    cloudUpdatedAt: times.length ? Math.max(...times) : null,
    localHasData: hasOwnData(),
  }
}

// ¿Este navegador tiene datos propios? Los ajustes por defecto que se guardan al abrir no cuentan.
function hasOwnData() {
  const parsed = (k, fallback) => { try { return JSON.parse(loadRaw(k)) ?? fallback } catch { return fallback } }
  return Object.keys(parsed('logs', {})).length > 0
    || ['recipes', 'favorites', 'expenses', 'prices'].some((k) => parsed(k, []).length > 0)
    || (parsed('foods', {}).custom ?? []).length > 0
}

/**
 * Conecta este navegador.
 * mode 'cloud': se usan los datos de la nube (los de acá se reemplazan; queda la copia automática).
 * mode 'local': se suben los datos de este navegador y reemplazan a los de la nube.
 */
export async function connect(password, mode) {
  save('sync:password', password)
  const keys = STORAGE_KEYS.filter((k) => loadRaw(k) != null)
  // 'cloud': lo local queda como "lo más viejo posible": la nube gana en todo lo que tenga,
  // y lo que la nube no tenga se sube igual. 'local': lo de acá pasa a ser lo más nuevo.
  const t = mode === 'cloud' ? 1 : now() + 1000
  setMeta(Object.fromEntries(keys.map((k) => [k, t])))
  setDirty(keys)
  setStatus({ state: 'idle', error: null })
  await syncNow()
}

export function disconnect(reason = null) {
  localStorage.removeItem('recomp:sync:password')
  clearTimeout(timer)
  setStatus({ state: 'off', error: reason })
}
