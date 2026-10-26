import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// En desarrollo, /api/* corre las mismas funciones que Vercel (api/*.js), con las variables de .env.local
function vercelApiInDev() {
  return {
    name: 'vercel-api-in-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([\w-]+)/)
        if (!match) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`)
          const fn = mod[req.method]
          if (!fn) { res.statusCode = 405; return res.end() }
          const chunks = []
          for await (const c of req) chunks.push(c)
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
          })
          const response = await fn(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.config.logger.error(err.stack ?? String(err))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Error en la función local' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    vercelApiInDev(),
    react(),
    tailwindcss(),
    // Instalable en el celular y usable sin conexión (los datos ya viven en localStorage)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Recomp 2027',
        short_name: 'Recomp',
        description: 'Plan de recomposición corporal: tapers, macros, agua y progreso.',
        lang: 'es-UY',
        start_url: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#19211e',
        theme_color: '#19211e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // /api nunca se sirve desde la caché del service worker
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'], navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
})
