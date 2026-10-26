import { useEffect, useRef, useState } from 'react'
import { cleanBarcode, isValidBarcode, lookupBarcode, offProductUrl } from '../lib/barcode'
import CustomFoodForm from './CustomFoodForm'
import { Button, Card, Icon, Input, fmt } from './ui'

/**
 * Buscar un producto por código de barras (escaneado con la cámara o escrito a mano).
 * 1. Si ya lo guardaste antes, se usa el tuyo (sin internet).
 * 2. Si no, se busca en cadena (Open Food Facts → USDA) y se guarda como alimento propio con sus valores.
 * 3. Si ninguna lo tiene, se carga a mano desde la etiqueta (con lo que se haya encontrado: nombre, foto)
 *    y queda guardado con su código.
 */
export default function BarcodeLookup({ foods, onSave, onUse, onClose, useLabel = 'Usar' }) {
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [state, setState] = useState({ status: 'idle' })
  const abortRef = useRef(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const lookup = async (raw) => {
    const c = cleanBarcode(raw)
    setCode(c)
    setScanning(false)
    if (!isValidBarcode(c)) {
      setState({ status: 'error', error: 'Ese código no parece válido: revisá los números (son 8, 12 o 13 dígitos debajo de las barras).' })
      return
    }
    const local = foods.find((f) => f.barcode === c)
    if (local) return setState({ status: 'local', food: local })
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ status: 'loading', source: '' })
    try {
      const r = await lookupBarcode(c, { signal: ctrl.signal, onSource: (source) => setState({ status: 'loading', source }) })
      setState({ ...r, code: c })
    } catch {
      // búsqueda cancelada (se cerró o se buscó otro código)
    }
  }

  const save = (food) => {
    const saved = onSave(food)
    onUse?.(saved)
    onClose()
  }

  return (
    <div className="drawer-in mt-2 space-y-3 rounded-xl border border-dashed border-white/[0.18] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-hand text-[21px] leading-none text-zinc-100">Código de barras</p>
        <Button variant="plain" size="icon" onClick={onClose} aria-label="Cerrar"><Icon name="x" className="h-4 w-4" /></Button>
      </div>

      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); lookup(code) }}>
        <Input
          className="min-w-0 flex-1" prefix="▥" placeholder="Escribí los números: 7730…" inputMode="numeric" autoComplete="off"
          value={code} onChange={(e) => setCode(e.target.value)} aria-label="Número del código de barras"
        />
        <Button type="submit" disabled={cleanBarcode(code).length < 8}>Buscar</Button>
        <Button type="button" variant="ghost" onClick={() => setScanning((s) => !s)}>
          {scanning ? 'Cerrar cámara' : 'Escanear con cámara'}
        </Button>
      </form>

      {scanning && <Scanner onDetected={lookup} onError={(error) => { setScanning(false); setState({ status: 'error', error }) }} />}

      {state.status === 'loading' && <p className="text-sm text-zinc-400">Buscando{state.source && ` en ${state.source}`}…</p>}

      {state.status === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-rose-300">{state.error}</p>
          {state.code && <Button variant="ghost" size="sm" onClick={() => setState({ status: 'missing', code: state.code, tried: [] })}>Cargarlo de la etiqueta</Button>}
        </div>
      )}

      {state.status === 'local' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-black/[0.16] px-3 py-2.5">
          <p className="min-w-0 flex-1 text-sm text-zinc-300">Ya lo tenés guardado: <b className="text-zinc-100">{state.food.name}</b></p>
          {onUse && <Button size="sm" onClick={() => { onUse(state.food); onClose() }}>{useLabel}</Button>}
        </div>
      )}

      {state.status === 'found' && (
        <>
          <ProductCard draft={state.draft} />
          <CustomFoodForm
            key={state.draft.barcode} initial={state.draft} missing={state.draft.missing}
            title="Guardar como alimento" onSave={save} onCancel={() => setState({ status: 'idle' })}
            note={
              <p className="-mt-1.5 mb-3 text-xs text-zinc-500">
                Datos de <b className="text-zinc-400">{state.draft.source}</b>. Revisalos contra la etiqueta antes de guardar: estas bases las cargan usuarios o marcas y pueden tener errores.
                {state.draft.missing.length > 0 && <span className="text-amber-300"> Faltan algunos datos: completalos.</span>}
              </p>
            }
          />
        </>
      )}

      {(state.status === 'missing' || state.status === 'partial') && (
        <>
          {state.status === 'partial' && <ProductCard draft={state.draft} />}
          <CustomFoodForm
            key={`m-${state.code}`}
            initial={{ ...(state.draft ?? { category: 'pantry' }), barcode: state.code, source: 'etiqueta' }}
            missing={['kcal', 'protein', 'fat', 'carbs']}
            title={state.status === 'partial' ? 'Está, pero sin valores: completalos de la etiqueta' : 'No está en ninguna base: cargalo de la etiqueta'}
            onSave={save} onCancel={() => setState({ status: 'idle' })}
            note={<Tried tried={state.tried} code={state.code} partial={state.status === 'partial'} />}
          />
        </>
      )}

      {state.status === 'idle' && !scanning && (
        <p className="text-xs text-zinc-500">
          Primero busco entre tus alimentos, después en <b className="text-zinc-400">Open Food Facts</b> (base mundial y abierta) y después en la del <b className="text-zinc-400">USDA</b> (productos importados). Si ninguna lo tiene, lo cargás una vez desde la etiqueta y queda guardado.
        </p>
      )}
    </div>
  )
}

// Dónde se buscó y qué pasó en cada fuente, más el aviso de que queda guardado
function Tried({ tried = [], code, partial }) {
  const word = { found: 'lo tiene', incomplete: 'lo tiene sin valores', missing: 'no lo tiene', error: 'no respondió' }
  return (
    <div className="-mt-1.5 mb-3 space-y-1 text-xs text-zinc-500">
      {tried.length > 0 && (
        <p>Busqué en: {tried.map((t) => `${t.source} (${word[t.result]})`).join(' · ')}.</p>
      )}
      <p>
        Queda guardado con el código {code}: la próxima vez que lo escanees aparece solo.
        {' '}Si querés que esté para todos, podés {partial ? 'completarlo' : 'agregarlo'} en{' '}
        <a href={offProductUrl(code)} target="_blank" rel="noreferrer" className="text-accent underline decoration-dashed underline-offset-4">Open Food Facts</a>.
      </p>
    </div>
  )
}

// Ficha del producto encontrado: foto, marca, contenido y valores por 100 g
function ProductCard({ draft: d }) {
  const unit = d.liquid ? 'ml' : 'g'
  return (
    <Card className="flex gap-3 !p-3">
      {d.image && <img src={d.image} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-white object-contain" />}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-zinc-100">{d.name || 'Producto sin nombre cargado'}</p>
        <p className="text-xs text-zinc-500">{[d.brand, d.quantity, `código ${d.barcode}`].filter(Boolean).join(' · ')}</p>
        {d.kcal == null && d.protein == null ? (
          <p className="mt-1.5 text-xs text-amber-300">En {d.source} está{d.image ? ' con foto' : ''}, pero sin valores nutricionales.</p>
        ) : (
        <p className="tabular mt-1.5 text-xs text-zinc-300">
          100 {unit}: <b>{d.kcal == null ? '?' : fmt(d.kcal)}</b> kcal · <span className="text-sky-300">{d.protein == null ? '?' : fmt(d.protein, 1)} g prot</span>
          {' '}· {d.carbs == null ? '?' : fmt(d.carbs, 1)} g carb · {d.fat == null ? '?' : fmt(d.fat, 1)} g grasa
          {d.fiber != null && <> · {fmt(d.fiber, 1)} g fibra</>}
        </p>
        )}
        {d.unit && <p className="text-xs text-zinc-500">Porción sugerida: {d.unit.text || `${d.unit.grams} ${unit}`}</p>}
      </div>
    </Card>
  )
}

// Cámara + lector ZXing (funciona en Chrome, Edge, Firefox y Safari). Para apenas lee un código.
function Scanner({ onDetected, onError }) {
  const videoRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let controls = null
    let cancelled = false
    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError('Este navegador no permite usar la cámara acá. Escribí el número del código.')
        return
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]]])
        const reader = new BrowserMultiFormatReader(hints)
        if (cancelled) return
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment', width: { ideal: 1280 } } },
          videoRef.current,
          (result, _err, ctrl) => {
            if (!result || cancelled) return
            cancelled = true
            ctrl.stop()
            onDetected(result.getText())
          },
        )
        if (cancelled) controls.stop()
        else setReady(true)
      } catch (err) {
        if (cancelled) return
        onError(err?.name === 'NotAllowedError'
          ? 'No diste permiso para usar la cámara. Habilitalo en el candado de la barra de direcciones o escribí el número.'
          : err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError'
            ? 'No se encontró ninguna cámara. Escribí el número del código.'
            : 'No se pudo abrir la cámara. Escribí el número del código.')
      }
    })()
    return () => { cancelled = true; controls?.stop() }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[38%] -translate-y-1/2 rounded-lg border-2 border-accent/80" />
      <p className="absolute inset-x-0 bottom-2 text-center text-xs text-zinc-200 drop-shadow">
        {ready ? 'Poné el código de barras dentro del recuadro, bien iluminado' : 'Abriendo la cámara…'}
      </p>
    </div>
  )
}
