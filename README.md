# Recomp 2027

App personal para el plan de recomposición corporal (bajar los flancos): tapers de batch cooking, macros, agua, pasos, entrenamiento, progreso, compras y gastos en pesos uruguayos. Todo se guarda en el navegador (localStorage); no hay servidor ni cuenta.

## Usarla

```bash
npm install        # solo la primera vez
npm run dev        # abre en http://localhost:5173
```

### En el celular (misma red wifi)

```bash
npm run celu
```

Vite muestra una dirección tipo `http://192.168.x.x:5173`: abrila en el navegador del teléfono. Ojo: los datos del celular y los de la computadora son **independientes** (cada navegador guarda los suyos). Para pasarlos, usá **Ajustes → Exportar copia** e **Importar copia**.

### Instalarla como app

La app es una PWA: se puede instalar y funciona sin conexión. Los navegadores solo permiten instalarla desde `localhost` o desde una dirección **https**, así que para tenerla instalada en el celular hay que publicarla en algún hosting con https (por ejemplo Netlify, Vercel o GitHub Pages) con la carpeta `dist` que genera `npm run build`. Al publicarla, la página es accesible para quien tenga el link; tus datos igual quedan solo en tu teléfono.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run celu` | Servidor accesible desde otros dispositivos de la red |
| `npm run build` | Genera la versión final en `dist/` (con service worker) |
| `npm run preview:celu` | Compila y sirve la versión final en la red |
| `npm test` | Tests de los cálculos (nutrientes, plan, precios, chequeos) |

## Dónde está cada cosa

- `src/data/foodDatabase.js` — base de alimentos del mercado uruguayo (nutrientes por gramo y precios en $U). Para actualizar un precio, editá `uyu` o cambialo desde la app.
- `src/lib/` — lógica: plan (Mifflin-St Jeor, déficit, macros), alimentos, comidas, precios, copias de seguridad.
- `src/components/` — pantallas: Hoy, Crear, Mi heladera, Agua, Alimentos, Compras, Progreso, Gastos, Ajustes.
- `DESIGN.md` — el sistema visual "Pizarra de feria" (colores, tipografías, componentes, movimiento).
- `PRODUCT.md` — para qué es la app y sus principios.

## Copias de seguridad

Cada día que abrís la app se guarda una copia automática en el navegador (las últimas 7, en **Ajustes → Copias automáticas**). Igual conviene exportar una copia de vez en cuando: si borrás los datos del navegador, se pierden también las automáticas.
