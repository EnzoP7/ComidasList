// Lógica del endpoint de sincronización (Turso / libSQL). Vercel no expone archivos con "_" como rutas.
//
// GET  /api/sync            → { items: { [key]: { value, updatedAt } }, serverTime }
// PUT  /api/sync  { items } → guarda cada clave solo si es más nueva que la de la nube
//                             (gana la última edición) y devuelve las que la nube tenía más nuevas.
// Todas las llamadas piden "Authorization: Bearer <contraseña>".
import { timingSafeEqual, createHash } from 'node:crypto'

// Solo estas claves se sincronizan (las mismas que la copia .json; nunca fotos)
export const SYNC_KEYS = ['settings', 'logs', 'recipes', 'prices', 'foods', 'favorites', 'expenses', 'shopping']
const MAX_VALUE_BYTES = 3_000_000

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

// Comparación en tiempo constante (sobre los hash, así el largo tampoco se filtra)
function passwordOk(given, expected) {
  if (!expected || typeof given !== 'string') return false
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// La tabla se crea sola la primera vez (una vez por conexión)
const schemaReady = new WeakMap()
function ensureSchema(db) {
  if (!schemaReady.has(db)) {
    schemaReady.set(db, db.execute(
      'CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)',
    ).catch((err) => { schemaReady.delete(db); throw err }))
  }
  return schemaReady.get(db)
}

export function createSyncHandler({ db, password }) {
  return async function handle(request) {
    if (!password) return json({ error: 'Falta configurar APP_PASSWORD en el servidor' }, 500)
    const auth = request.headers.get('authorization') ?? ''
    if (!passwordOk(auth.replace(/^Bearer\s+/i, ''), password)) {
      await sleep(800) // frena los intentos de adivinar la contraseña
      return json({ error: 'Contraseña incorrecta' }, 401)
    }
    try {
      await ensureSchema(db)
      if (request.method === 'GET') return json({ items: await readAll(db), serverTime: Date.now() })
      if (request.method === 'PUT') return json(await writeItems(db, await request.json()))
      return json({ error: 'Método no permitido' }, 405)
    } catch (err) {
      return json({ error: err.status ? err.message : 'Error de la base de datos' }, err.status ?? 500)
    }
  }
}

async function readAll(db) {
  const rs = await db.execute('SELECT key, value, updated_at FROM app_data')
  return Object.fromEntries(rs.rows.map((r) => [r.key, { value: r.value, updatedAt: Number(r.updated_at) }]))
}

const badRequest = (message) => Object.assign(new Error(message), { status: 400 })

async function writeItems(db, body) {
  const items = body?.items
  if (!Array.isArray(items)) throw badRequest('Falta la lista de datos')
  for (const it of items) {
    if (!SYNC_KEYS.includes(it?.key)) throw badRequest(`Clave no permitida: ${it?.key}`)
    if (typeof it.value !== 'string' || it.value.length > MAX_VALUE_BYTES) throw badRequest(`Valor inválido en ${it.key}`)
    try { JSON.parse(it.value) } catch { throw badRequest(`El valor de ${it.key} no es JSON`) }
    if (!Number.isFinite(it.updatedAt)) throw badRequest(`Fecha inválida en ${it.key}`)
  }
  // Gana la última edición: solo se pisa si lo que llega es más nuevo que lo guardado
  await db.batch(items.map((it) => ({
    sql: `INSERT INTO app_data (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
          WHERE excluded.updated_at > app_data.updated_at`,
    args: [it.key, it.value, Math.round(it.updatedAt)],
  })), 'write')
  // Lo que la nube tenía más nuevo vuelve para que el navegador lo tome
  const all = await readAll(db)
  const newer = Object.fromEntries(items
    .filter((it) => all[it.key] && all[it.key].updatedAt > it.updatedAt)
    .map((it) => [it.key, all[it.key]]))
  return { ok: true, newer, serverTime: Date.now() }
}
