// Fotos de progreso: se guardan comprimidas en IndexedDB de este navegador.
import { STORES, idbAll, idbClear, idbDelete, idbPut } from './idb'
import { uid } from './model'

export const POSES = [
  { id: 'front', label: 'Frente' },
  { id: 'side', label: 'Perfil' },
  { id: 'back', label: 'Espalda' },
]

const MAX_SIDE = 1080

// Achica la foto a 1080 px de lado mayor en JPEG (unos 100–200 KB)
async function compress(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))), 'image/jpeg', 0.82))
}

export async function addPhoto(day, pose, file) {
  const blob = await compress(file)
  // Una foto por pose y día: la nueva reemplaza a la anterior
  const existing = (await listPhotos()).filter((p) => p.day === day && p.pose === pose)
  for (const p of existing) await idbDelete(STORES.photos, p.id)
  const photo = { id: uid(), day, pose, blob, at: Date.now() }
  await idbPut(STORES.photos, photo)
  return photo
}

export const listPhotos = async () => (await idbAll(STORES.photos)).sort((a, b) => a.day.localeCompare(b.day))
export const deletePhoto = (id) => idbDelete(STORES.photos, id)
export const clearPhotos = () => idbClear(STORES.photos)

const toDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(r.error)
  r.readAsDataURL(blob)
})

// Copia aparte para las fotos (la copia .json de datos no las incluye por tamaño)
export async function exportPhotos() {
  const photos = await listPhotos()
  return {
    app: 'recomp-fotos', version: 1, exportedAt: new Date().toISOString(),
    photos: await Promise.all(photos.map(async ({ blob, ...p }) => ({ ...p, data: await toDataUrl(blob) }))),
  }
}

export async function importPhotos(json) {
  if (json?.app !== 'recomp-fotos' || !Array.isArray(json.photos)) throw new Error('No es una copia de fotos de Recomp')
  let n = 0
  for (const p of json.photos) {
    if (!p?.id || !/^\d{4}-\d{2}-\d{2}$/.test(p.day ?? '') || !String(p.data).startsWith('data:image/')) continue
    const blob = await (await fetch(p.data)).blob()
    await idbPut(STORES.photos, { id: p.id, day: p.day, pose: p.pose, at: p.at, blob })
    n++
  }
  return n
}
