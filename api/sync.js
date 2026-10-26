// Función de Vercel: /api/sync. Las credenciales viven en variables de entorno, nunca en el código:
//   TURSO_DATABASE_URL  libsql://<base>-<usuario>.turso.io
//   TURSO_AUTH_TOKEN    token de la base (Turso → Database → Create token)
//   APP_PASSWORD        la contraseña con la que entrás desde la app
import { createClient } from '@libsql/client'
import { createSyncHandler } from './_sync.js'

let handler = null
function getHandler() {
  if (!process.env.TURSO_DATABASE_URL) {
    return async () => Response.json({ error: 'Falta configurar TURSO_DATABASE_URL en el servidor' }, { status: 500 })
  }
  handler ??= createSyncHandler({
    db: createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }),
    password: process.env.APP_PASSWORD,
  })
  return handler
}

export const GET = (request) => getHandler()(request)
export const PUT = (request) => getHandler()(request)
