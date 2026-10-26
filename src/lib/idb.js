// IndexedDB mínimo: copias automáticas y fotos de progreso (no entran en localStorage).
const DB_NAME = 'recomp'
const VERSION = 1
export const STORES = { snapshots: 'snapshots', photos: 'photos' }

let dbPromise = null

function open() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Este navegador no tiene IndexedDB'))
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORES.snapshots)) db.createObjectStore(STORES.snapshots, { keyPath: 'day' })
      if (!db.objectStoreNames.contains(STORES.photos)) {
        db.createObjectStore(STORES.photos, { keyPath: 'id' }).createIndex('day', 'day')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { dbPromise = null; reject(req.error) }
  })
  return dbPromise
}

const done = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

async function tx(store, mode, fn) {
  const db = await open()
  const t = db.transaction(store, mode)
  const result = await fn(t.objectStore(store))
  await new Promise((resolve, reject) => {
    t.oncomplete = resolve
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error ?? new Error('Operación cancelada'))
  })
  return result
}

export const idbAll = (store) => tx(store, 'readonly', (s) => done(s.getAll()))
export const idbGet = (store, key) => tx(store, 'readonly', (s) => done(s.get(key)))
export const idbPut = (store, value) => tx(store, 'readwrite', (s) => done(s.put(value)))
export const idbDelete = (store, key) => tx(store, 'readwrite', (s) => done(s.delete(key)))
export const idbClear = (store) => tx(store, 'readwrite', (s) => done(s.clear()))
