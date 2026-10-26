import { useState } from 'react'
import { connect, disconnect, probe, syncNow, useSyncStatus } from '../lib/sync'
import { Button, Card, Icon, Input, SectionTitle } from './ui'

const when = (t) => (t ? new Date(t).toLocaleString('es-UY', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—')

// Pantalla de entrada: la app solo se muestra con la contraseña. Cada navegador la pide una vez.
export function LoginScreen() {
  return (
    <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
      <div className="w-full">
        <p className="font-hand text-[44px] font-bold leading-none text-zinc-50">Recomp 2027</p>
        <p className="mt-1 text-sm text-zinc-500">Adiós flotadores, un día a la vez</p>
        <div className="mt-8"><ConnectForm /></div>
        <p className="mt-6 text-xs text-zinc-600">
          Tus datos se guardan en este navegador y en tu base de Turso. Las fotos de progreso quedan solo en este navegador.
        </p>
      </div>
    </div>
  )
}

// Contraseña → probar → decidir qué datos quedan si hay en los dos lados
function ConnectForm() {
  const status = useSyncStatus()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [choice, setChoice] = useState(null) // { cloudUpdatedAt } cuando hay datos en los dos lados

  const run = async (fn) => {
    setBusy(true); setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const tryConnect = (e) => {
    e.preventDefault()
    if (!password) return
    run(async () => {
      const p = await probe(password)
      if (!p.cloudKeys) return connect(password, 'local') // nube vacía: se suben los datos de acá
      if (!p.localHasData) return connect(password, 'cloud') // navegador vacío: se bajan los de la nube
      setChoice(p)
    })
  }
  const choose = (mode) => run(async () => { await connect(password, mode); setChoice(null); setPassword('') })

  return (
    <>
      {choice ? (
        <div className="space-y-3 rounded-xl border border-dashed border-amber-300/40 p-3.5">
          <p className="text-sm text-zinc-200">
            Hay datos en la nube (último cambio: {when(choice.cloudUpdatedAt)}) y también en este navegador. ¿Con cuáles te quedás?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => choose('cloud')} disabled={busy}>Usar los de la nube</Button>
            <Button variant="ghost" onClick={() => choose('local')} disabled={busy}>Subir los de este navegador</Button>
            <Button variant="plain" onClick={() => setChoice(null)} disabled={busy}>Cancelar</Button>
          </div>
          <p className="text-xs text-zinc-500">Lo que se reemplace queda en las copias automáticas de este navegador, por si te equivocás.</p>
        </div>
      ) : (
        <form className="flex items-end gap-2" onSubmit={tryConnect}>
          <Input
            className="min-w-0 flex-1" label="Contraseña" type="password" autoComplete="current-password" autoFocus
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy || !password}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        </form>
      )}
      {(error || status.error) && <p className="mt-3 text-sm text-rose-300">{error || status.error}</p>}
    </>
  )
}

// Ajustes → Nube: estado de la sincronización y cerrar sesión
export default function CloudSync() {
  const status = useSyncStatus()
  const [busy, setBusy] = useState(false)
  const syncAndWait = async () => { setBusy(true); try { await syncNow() } finally { setBusy(false) } }

  return (
    <Card>
      <SectionTitle action={<SyncBadge status={status} />}>Nube</SectionTitle>
      <p className="text-sm text-zinc-300">
        Los cambios se suben solos a tu base de Turso a los pocos segundos y, al abrir la app, se baja lo que hayas cambiado en otro lado. Las fotos no se suben.
      </p>
      <p className="mt-1.5 text-xs text-zinc-500">
        Última sincronización: {when(status.lastSync)}
        {status.pending > 0 && ` · ${status.pending} ${status.pending === 1 ? 'cambio' : 'cambios'} sin subir`}
      </p>
      {status.error && <p className="mt-2 text-sm text-amber-300">{status.error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={syncAndWait} disabled={busy || status.state === 'syncing'}>
          <Icon name="refresh" className="h-3.5 w-3.5" /> Sincronizar ahora
        </Button>
        <Button
          variant="plain" size="sm"
          onClick={() => {
            const warn = status.pending ? ` Hay ${status.pending} ${status.pending === 1 ? 'cambio' : 'cambios'} sin subir: se suben cuando vuelvas a entrar.` : ''
            if (confirm(`Vas a cerrar la sesión en este navegador y se va a pedir la contraseña de nuevo.${warn} ¿Seguir?`)) disconnect()
          }}
        >
          Cerrar sesión en este navegador
        </Button>
      </div>
    </Card>
  )
}

// Estado corto: al día, guardando, sin conexión, error
export function SyncBadge({ status, className = '' }) {
  const look = {
    idle: status.pending ? ['text-amber-300', 'con cambios sin subir'] : ['text-accent', 'al día'],
    syncing: ['text-zinc-400', 'sincronizando…'],
    offline: ['text-amber-300', 'sin conexión'],
    error: ['text-rose-300', 'error al sincronizar'],
  }[status.state]
  if (!look) return null
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${look[0]} ${className}`} title={status.error ?? undefined}>
      <Icon name="cloud" className="h-3.5 w-3.5" /> {look[1]}
    </span>
  )
}
