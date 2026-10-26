import { beforeEach, describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { createSyncHandler } from './_sync.js'

const PASS = 'clave-de-prueba'
let handle

beforeEach(() => {
  handle = createSyncHandler({ db: createClient({ url: ':memory:' }), password: PASS })
})

const call = async (method, body, password = PASS) => {
  const res = await handle(new Request('http://x/api/sync', {
    method,
    headers: { authorization: `Bearer ${password}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }))
  return { status: res.status, data: await res.json() }
}
const item = (key, value) => ({ key, value: JSON.stringify(value) })

describe('sincronización (servidor)', () => {
  it('rechaza sin la contraseña correcta', async () => {
    expect((await call('GET', null, 'otra')).status).toBe(401)
    expect((await call('GET', null, '')).status).toBe(401)
  })

  it('sin contraseña configurada no deja entrar a nadie', async () => {
    handle = createSyncHandler({ db: createClient({ url: ':memory:' }), password: undefined })
    expect((await call('GET', null, '')).status).toBe(500)
  })

  it('guarda y devuelve los datos', async () => {
    const put = await call('PUT', { items: [item('logs', { '2026-10-26': { weight: 82 } })] })
    const { data } = await call('GET')
    expect(JSON.parse(data.items.logs.value)['2026-10-26'].weight).toBe(82)
    expect(data.items.logs.updatedAt).toBe(put.data.saved.logs)
  })

  it('gana lo último que llega y la versión la pone el servidor', async () => {
    const first = await call('PUT', { items: [item('settings', { age: 23 })] })
    const second = await call('PUT', { items: [item('settings', { age: 24 })] })
    expect(second.data.saved.settings).toBeGreaterThan(first.data.saved.settings)
    const { data } = await call('GET')
    expect(JSON.parse(data.items.settings.value).age).toBe(24)
    expect(data.items.settings.updatedAt).toBe(second.data.saved.settings)
  })

  it('solo acepta las claves de datos (nunca fotos ni otras)', async () => {
    const r = await call('PUT', { items: [item('photos', [])] })
    expect(r.status).toBe(400)
    expect((await call('PUT', { items: [{ key: 'logs', value: 'no es json' }] })).status).toBe(400)
    expect(Object.keys((await call('GET')).data.items)).toEqual([])
  })

  it('un lote con un dato inválido no guarda nada', async () => {
    const r = await call('PUT', { items: [item('logs', {}), item('nope', {})] })
    expect(r.status).toBe(400)
    expect(Object.keys((await call('GET')).data.items)).toEqual([])
  })
})
