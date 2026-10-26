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
const item = (key, value, updatedAt) => ({ key, value: JSON.stringify(value), updatedAt })

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
    await call('PUT', { items: [item('logs', { '2026-10-26': { weight: 82 } }, 1000)] })
    const { data } = await call('GET')
    expect(JSON.parse(data.items.logs.value)['2026-10-26'].weight).toBe(82)
    expect(data.items.logs.updatedAt).toBe(1000)
  })

  it('gana la edición más nueva y avisa si la nube tenía algo más nuevo', async () => {
    await call('PUT', { items: [item('settings', { age: 23 }, 2000)] })
    const old = await call('PUT', { items: [item('settings', { age: 99 }, 1500)] })
    expect(old.data.newer.settings.updatedAt).toBe(2000)
    expect(JSON.parse((await call('GET')).data.items.settings.value).age).toBe(23)
    await call('PUT', { items: [item('settings', { age: 24 }, 3000)] })
    expect(JSON.parse((await call('GET')).data.items.settings.value).age).toBe(24)
  })

  it('solo acepta las claves de datos (nunca fotos ni otras)', async () => {
    const r = await call('PUT', { items: [item('photos', [], 1)] })
    expect(r.status).toBe(400)
    expect((await call('PUT', { items: [{ key: 'logs', value: 'no es json', updatedAt: 1 }] })).status).toBe(400)
    expect(Object.keys((await call('GET')).data.items)).toEqual([])
  })

  it('un lote con un dato inválido no guarda nada', async () => {
    const r = await call('PUT', { items: [item('logs', {}, 1), item('nope', {}, 1)] })
    expect(r.status).toBe(400)
    expect(Object.keys((await call('GET')).data.items)).toEqual([])
  })
})
