import { useEffect, useRef, useState } from 'react'
import { POSES, addPhoto, deletePhoto, exportPhotos, importPhotos, listPhotos } from '../lib/photos'
import { downloadJson } from '../lib/storage'
import { formatShort, todayKey } from '../lib/date'
import { Button, Card, Icon, SectionTitle } from './ui'

/**
 * Fotos de progreso: frente, perfil y espalda, una vez cada una o dos semanas.
 * Se comparan dos fechas lado a lado. Viven solo en este navegador (IndexedDB).
 */
export default function Photos() {
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState('')
  const [pose, setPose] = useState('front')
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const [busy, setBusy] = useState(false)
  const importRef = useRef(null)

  const reload = () => listPhotos().then(setPhotos, () => { setPhotos([]); setError('Este navegador no permite guardar fotos.') })
  useEffect(() => { reload() }, [])

  // URLs de las imágenes; se liberan al cambiar la lista o al salir
  const [urls, setUrls] = useState(() => new Map())
  useEffect(() => {
    const map = new Map((photos ?? []).map((p) => [p.id, URL.createObjectURL(p.blob)]))
    setUrls(map)
    return () => map.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  const ofPose = (photos ?? []).filter((p) => p.pose === pose)
  const days = ofPose.map((p) => p.day)
  const beforeDay = before && days.includes(before) ? before : days[0]
  const afterDay = after && days.includes(after) ? after : days.at(-1)
  const find = (day) => ofPose.find((p) => p.day === day)
  const today = todayKey()
  const todayPoses = new Set((photos ?? []).filter((p) => p.day === today).map((p) => p.pose))

  const upload = async (poseId, file) => {
    if (!file) return
    setBusy(true); setError('')
    try {
      await addPhoto(today, poseId, file)
      setPose(poseId)
      setAfter(today)
      await reload()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la foto')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p) => {
    if (!confirm(`¿Borrar la foto de ${POSES.find((x) => x.id === p.pose)?.label.toLowerCase()} del ${formatShort(p.day)}?`)) return
    await deletePhoto(p.id)
    reload()
  }

  const doExport = async () => {
    setBusy(true)
    try { downloadJson(await exportPhotos(), `recomp-fotos-${today}.json`) } finally { setBusy(false) }
  }
  const doImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    try {
      const n = await importPhotos(JSON.parse(await file.text()))
      await reload()
      setError(n ? '' : 'El archivo no tenía fotos válidas.')
    } catch (err) {
      setError(err.message || 'No se pudo importar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card variant="ruled">
      <SectionTitle action={photos?.length ? <span className="text-xs text-zinc-500">{new Set(photos.map((p) => p.day)).size} fechas</span> : null}>Fotos de progreso</SectionTitle>
      <p className="-mt-1.5 mb-3 text-xs text-zinc-500">
        Para los flancos, el espejo dice más que la balanza. Misma luz, misma distancia, en ayunas, cada 2 semanas.
      </p>

      <div className="flex flex-wrap gap-2">
        {POSES.map((p) => (
          <label key={p.id} className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed px-3.5 text-sm transition-colors ${todayPoses.has(p.id) ? 'border-accent/60 text-accent' : 'border-white/[0.18] text-zinc-200 hover:border-white/30'} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            <Icon name={todayPoses.has(p.id) ? 'check' : 'plus'} className="h-4 w-4" />
            {p.label} de hoy
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { upload(p.id, e.target.files?.[0]); e.target.value = '' }} />
          </label>
        ))}
      </div>

      {photos == null ? (
        <p className="mt-4 text-sm text-zinc-500">Cargando fotos…</p>
      ) : photos.length === 0 ? (
        <div className="mt-4 grid h-32 place-items-center rounded-xl border border-dashed border-white/[0.16] px-4 text-center text-sm text-zinc-400">
          Sacate la primera tanda (frente y perfil). En unas semanas vas a poder ponerlas al lado de las nuevas.
        </div>
      ) : (
        <>
          <div className="mt-4 flex rounded-xl border border-dashed border-white/[0.18] p-0.5 text-xs" role="group" aria-label="Pose">
            {POSES.map((p) => (
              <button
                key={p.id} onClick={() => setPose(p.id)} aria-pressed={pose === p.id}
                className={`flex-1 rounded-lg px-2.5 py-1.5 transition-colors ${pose === p.id ? 'bg-white/[0.1] text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {days.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No hay fotos de esta pose todavía.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[['Antes', beforeDay, setBefore], ['Ahora', afterDay, setAfter]].map(([label, day, setDay]) => {
                const p = find(day)
                return (
                  <figure key={label} className="min-w-0">
                    <select
                      value={day} onChange={(e) => setDay(e.target.value)} aria-label={`Fecha ${label.toLowerCase()}`}
                      className="mb-2 h-9 w-full rounded-lg border border-white/[0.1] bg-black/[0.18] px-2 text-sm outline-none focus:border-accent/70"
                    >
                      {days.map((d) => <option key={d} value={d}>{label} · {formatShort(d)}</option>)}
                    </select>
                    {p && (
                      <div className="relative">
                        <img src={urls.get(p.id)} alt={`${POSES.find((x) => x.id === pose).label} del ${formatShort(day)}`} className="aspect-[3/4] w-full rounded-xl bg-black/30 object-cover" />
                        <button
                          onClick={() => remove(p)} aria-label="Borrar foto"
                          className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-zinc-200 hover:text-rose-200"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </figure>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="flex-1">Las fotos no van en la copia .json de datos: tienen su propia copia.</span>
        {photos?.length > 0 && <Button variant="ghost" size="sm" onClick={doExport} disabled={busy}>Exportar fotos</Button>}
        <Button variant="ghost" size="sm" onClick={() => importRef.current?.click()} disabled={busy}>Importar fotos</Button>
        <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={doImport} />
      </div>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </Card>
  )
}
