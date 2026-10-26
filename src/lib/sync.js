// Sincronización con la nube (Turso, a través de /api/sync). Las fotos no se suben.
//
// - El navegador sigue siendo la fuente inmediata: todo se guarda primero acá y funciona sin internet.
// - Cada clave (logs, recipes, settings…) tiene en la nube una versión que pone el servidor al guardarla
//   (su hora). Los relojes de cada dispositivo nunca se comparan.
// - Este navegador recuerda qué versión vio de cada clave. Al bajar: si la nube tiene una más nueva y acá
//   no hay cambios pendientes, se toma. Si acá hay cambios sin subir, se suben y, como llegan después, ganan.
// - Los cambios se suben solos a los pocos segundos; al abrir la app o volver a ella se baja lo nuevo.
import { useSyncExternalStore } from 'react'
import { LOCAL_CHANGE_EVENT, REMOTE_UPDATE_EVENT, STORAGE_KEYS, load, loadRaw, save, saveRaw } from './storage'

const ENDPOINT = '/api/sync'
const PUSH_DELAY_MS = 2500

// ── Estado (guardado en localStorage, fuera de la copia .json) ─────────────
const getPassword = () => load('sync:password', null)
const getSeen = () => load('sync:seen', {}) // { [clave]: versión de la nube que tiene este navegador }
const getDirty = () => load('sync:dirty', []) // claves con cambios sin subir
const setSeen = (m) => save('sync:seen', m)
const setDirty = (d) => save('sync:dirty', [...new Set(d)])
// Cuántas veces cambió cada clave en esta sesión (para no perder un cambio hecho mientras se subía)
const revs = {}

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
  return data
}

// Toma de la nube las claves con versión nueva, salvo las que tienen cambios pendientes acá
function applyRemote(items) {
  const seen = getSeen()
  const dirty = getDirty()
  const changed = []
  for (const [key, item] of Object.entries(items ?? {})) {
    if (!STORAGE_KEYS.includes(key) || dirty.includes(key)) continue
    if (item.updatedAt <= (seen[key] ?? 0)) continue
    saveRaw(key, item.value)
    seen[key] = item.updatedAt
    changed.push(key)
  }
  if (!changed.length) return []
  setSeen(seen)
  globalThis.dispatchEvent(new CustomEvent(REMOTE_UPDATE_EVENT, { detail: { keys: changed } }))
  return changed
}

async function pull() {
  const data = await api('GET')
  applyRemote(data.items)
  return data.items ?? {}
}

async function push() {
  const items = getDirty().map((key) => ({ key, value: loadRaw(key) })).filter((it) => it.value != null)
  if (!items.length) return setDirty([])
  const sent = Object.fromEntries(items.map((it) => [it.key, revs[it.key] ?? 0]))
  const data = await api('PUT', { items })
  setSeen({ ...getSeen(), ...data.saved })
  // Se quitan de pendientes solo las que no volvieron a cambiar mientras se subían
  setDirty(getDirty().filter((k) => !(k in sent) || (revs[k] ?? 0) !== sent[k]))
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
  revs[key] = (revs[key] ?? 0) + 1
  setDirty([...getDirty(), key])
  setStatus({})
  if (!getPassword()) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, PUSH_DELAY_MS)
}

// Se escucha desde que carga la página: ningún cambio se escapa, ni los del primer render
globalThis.addEventListener?.(LOCAL_CHANGE_EVENT, onLocalChange)

let started = false
export function startSync() {
  if (started) return
  started = true
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
  const local = STORAGE_KEYS.filter((k) => loadRaw(k) != null)
  setSeen({})
  // 'local': todo lo de acá queda pendiente de subir, así gana sobre la nube
  setDirty(mode === 'local' ? local : [])
  // 'connecting' mantiene la pantalla de entrada hasta terminar la primera sincronización:
  // si la app se mostrara antes, guardaría sus valores vacíos como cambios nuevos y pisaría la nube
  setStatus({ state: 'connecting', error: null })
  try {
    const remote = await pull()
    // 'cloud': lo que la nube no tiene se sube igual (no se pierde nada de acá)
    if (mode === 'cloud') setDirty(local.filter((k) => !(k in remote)))
    await push()
  } catch (err) {
    localStorage.removeItem('recomp:sync:password')
    setStatus({ state: 'off', error: null })
    throw err
  }
  const lastSync = Date.now()
  save('sync:last', lastSync)
  setStatus({ state: 'idle', lastSync, error: null })
}

export function disconnect(reason = null) {
  localStorage.removeItem('recomp:sync:password')
  clearTimeout(timer)
  setStatus({ state: 'off', error: reason })
}
