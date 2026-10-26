import { useRef, useState } from 'react'
import { exportAll, importAll } from '../lib/storage'
import { listSnapshots, restoreSnapshot, snapshotSize } from '../lib/snapshots'
import { fromKey } from '../lib/date'
import { todayKey } from '../lib/date'
import { ACTIVITY_LEVELS, DEFAULT_SETTINGS, dayTotals, latestWeight, waterTotal } from '../lib/model'
import { Button, Card, Input, PageHeader, SectionTitle, fmt, num } from './ui'

const MACRO_COLORS = { protein: 'bg-sky-400', fat: 'bg-pink-400', carbs: 'bg-amber-400' }

export default function Settings({ settings, plan, logs, setSettings }) {
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }))
  const logged = latestWeight(logs, todayKey())

  const setNum = (key, raw, min = 0) => {
    const v = num(raw)
    if (v != null && v > min) set({ [key]: v })
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `recomp-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Historial diario en CSV (separador ; y coma decimal, como lo abre Excel en Uruguay)
  const downloadCsv = () => {
    const n = (v, d = 1) => (v == null || v === '' ? '' : String(Math.round(v * 10 ** d) / 10 ** d).replace('.', ','))
    const header = ['fecha', 'peso_kg', 'cintura_cm', 'cadera_cm', 'pecho_cm', 'brazo_cm', 'kcal', 'proteina_g', 'grasas_g', 'carbos_g', 'pasos', 'agua_l', 'entreno_min', 'sueno_h', 'hambre_1a5', 'energia_1a5']
    const rows = Object.keys(logs).sort().map((k) => {
      const d = logs[k]
      const t = dayTotals(d)
      const mins = (d.training ?? []).reduce((s, x) => s + (x.minutes || 0), 0)
      return [k, n(d.weight), n(d.waist), n(d.hips), n(d.chest), n(d.arm), n(t.kcal, 0), n(t.protein), n(t.fat), n(t.carbs), d.steps ?? '', n(waterTotal(d) / 1000, 2), mins || '', n(d.sleep, 2), d.hunger ?? '', d.energy ?? '']
    })
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `recomp-historial-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      importAll(JSON.parse(await file.text()))
      location.reload()
    } catch (err) {
      setMsg(err.message || 'No se pudo importar el archivo')
    }
  }

  const reset = () => {
    if (confirm('Esto borra TODOS tus registros, recetas y ajustes. ¿Seguro?')) {
      Object.keys(localStorage).filter((k) => k.startsWith('recomp:')).forEach((k) => localStorage.removeItem(k))
      location.reload()
    }
  }

  // Inputs que guardan al salir del campo; la key los resetea si el valor cambia desde fuera
  const field = (key, label, suffix, min) => (
    <Input
      key={`${key}-${settings[key]}`} label={label} suffix={suffix} type="number" inputMode="decimal"
      defaultValue={settings[key]} onBlur={(e) => setNum(key, e.target.value, min)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )

  const { macros } = plan
  const macroKcal = { protein: macros.protein * 4, fat: macros.fat * 9, carbs: macros.carbs * 4 }
  const lowCarbs = macros.carbs < 120

  return (
    <div className="space-y-4">
      <PageHeader title="Ajustes">Tus datos calculan el plan: mantenimiento, déficit para los flancos y macros diarios.</PageHeader>
      {/* 1. Datos base */}
      <Card>
        <SectionTitle>1 · Tus datos</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {field('age', 'Edad', 'años', 10)}
          {field('heightCm', 'Altura', 'cm', 100)}
          {field('startWeight', 'Peso de referencia', 'kg', 30)}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl bg-black/[0.16] px-3 py-2.5 text-sm">
          <input
            type="checkbox" className="h-4 w-4 accent-lime-400" checked={settings.useLoggedWeight}
            onChange={(e) => set({ useLoggedWeight: e.target.checked })}
          />
          <span className="flex-1">
            Usar mi último peso registrado
            <span className="block text-xs text-zinc-500">
              {logged ? `Último registro: ${fmt(logged, 1)} kg. El plan se actualiza solo cuando te pesás.` : 'Todavía no registraste peso: se usa el de referencia.'}
            </span>
          </span>
          <span className="text-sm font-medium">{fmt(plan.weight, 1)} kg</span>
        </label>

        <p className="mb-2 mt-4 text-xs text-zinc-400">Nivel de actividad</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {ACTIVITY_LEVELS.map((a) => (
            <button
              key={a.value} onClick={() => set({ activity: a.value })}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                settings.activity === a.value ? 'border-accent/70 bg-accent/10' : 'border-white/[0.06] bg-black/[0.16] hover:border-white/20'
              }`}
            >
              <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
                {a.label} <span className="text-xs font-normal text-zinc-500">×{a.value}</span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{a.detail}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 2. Gasto energético */}
      <Card>
        <SectionTitle>2 · Tu gasto energético</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/[0.16] p-4">
            <p className="text-xs text-zinc-500">Metabolismo basal (TMB)</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{fmt(plan.bmr)} <span className="text-sm font-normal text-zinc-500">kcal</span></p>
            <p className="mt-1 text-[11px] text-zinc-500">Lo que gastás en reposo absoluto</p>
          </div>
          <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
            <p className="text-xs text-zinc-400">Mantenimiento (TDEE)</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-accent">{fmt(plan.tdee)} <span className="text-sm font-normal text-zinc-500">kcal</span></p>
            <p className="mt-1 text-[11px] text-zinc-500">Comiendo esto, tu peso se mantiene</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Mifflin-St Jeor: 10 × {fmt(plan.weight, 1)} kg + 6,25 × {fmt(settings.heightCm, 1)} cm − 5 × {settings.age} años + 5 = {fmt(plan.bmr)} kcal ·
          × {settings.activity} de actividad = <span className="text-zinc-300">{fmt(plan.tdee)} kcal/día</span>.
        </p>
      </Card>

      {/* 3. Nivel de déficit */}
      <Card>
        <SectionTitle>3 · Nivel de déficit para los flotadores</SectionTitle>
        <div className="grid gap-2 md:grid-cols-3">
          {plan.levels.map((l) => {
            const active = settings.deficitLevel === l.id
            return (
              <div
                key={l.id} role="button" tabIndex={0}
                onClick={() => set({ deficitLevel: l.id })}
                onKeyDown={(e) => e.key === 'Enter' && set({ deficitLevel: l.id })}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  active ? 'border-accent/70 bg-accent/10' : 'border-white/[0.06] bg-black/[0.16] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{l.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${
                    l.id === 'recommended' ? 'bg-accent/15 text-accent' : l.id === 'aggressive' ? 'bg-rose-400/15 text-rose-300' : 'bg-sky-400/15 text-sky-300'
                  }`}>
                    −{fmt(l.pct * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight">{fmt(l.kcal)} <span className="text-sm font-normal text-zinc-500">kcal/día</span></p>
                <p className="mt-1 text-sm text-zinc-300">
                  ≈ <b>{fmt(l.weeklyKg, 2)} kg</b>/semana <span className="text-zinc-500">· {fmt(l.weeklyKg * 4.3, 1)} kg/mes</span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">Déficit de {fmt(l.deficit)} kcal/día · ritmo {l.pace.toLowerCase()}</p>
                <p className="mt-2 text-xs leading-snug text-zinc-500">{l.detail}</p>
                {l.id === 'aggressive' && active && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="range" min="0.2" max="0.25" step="0.01" value={settings.aggressivePct}
                      onChange={(e) => set({ aggressivePct: Number(e.target.value) })}
                      className="w-full accent-rose-400" aria-label="Porcentaje de déficit agresivo"
                    />
                    <div className="flex justify-between text-[11px] text-zinc-500"><span>20%</span><span>25%</span></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-black/[0.16] px-3 py-2.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio" className="accent-lime-400" checked={settings.deficitLevel === 'custom'}
              onChange={() => set({ deficitLevel: 'custom' })}
            />
            Personalizado
          </label>
          {settings.deficitLevel === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="w-36">{field('customCalories', '', 'kcal', 1000)}</div>
              <span className="text-xs text-zinc-500">
                {plan.deficit >= 0 ? `déficit ${fmt(plan.deficit)} kcal (${fmt(plan.deficitPct * 100)}%)` : `superávit ${fmt(-plan.deficit)} kcal`}
              </span>
            </div>
          )}
        </div>

        {plan.calorieGoal < plan.bmr && (
          <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            Tu objetivo está por debajo de tu metabolismo basal ({fmt(plan.bmr)} kcal). Es difícil sostenerlo y aumenta el riesgo de perder músculo.
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          La grasa de los flancos es de las últimas en irse: un déficit moderado y constante + fuerza + pasos funciona mejor que uno extremo.
        </p>
      </Card>

      {/* 4. Macros */}
      <Card>
        <SectionTitle>4 · Tus macros diarios</SectionTitle>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-zinc-400">Objetivo: <b className="text-zinc-100">{fmt(plan.calorieGoal)} kcal</b></p>
          <p className="text-xs text-zinc-500">Peso de cálculo: {fmt(plan.weight, 1)} kg</p>
        </div>

        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
          {['protein', 'fat', 'carbs'].map((k) => (
            <div key={k} className={MACRO_COLORS[k]} style={{ width: `${(macroKcal[k] / plan.calorieGoal) * 100}%` }} />
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MacroCard
            color="text-sky-300" dot={MACRO_COLORS.protein} label="Proteína" grams={macros.protein} kcal={macroKcal.protein} total={plan.calorieGoal}
            rule={`${fmt(settings.proteinPerKg, 1)} g por kg`}
          >
            <Slider value={settings.proteinPerKg} min={1.6} max={2.4} step={0.1} onChange={(v) => set({ proteinPerKg: v })} suffix="g/kg" accent="accent-sky-400" />
          </MacroCard>
          <MacroCard
            color="text-pink-300" dot={MACRO_COLORS.fat} label="Grasas" grams={macros.fat} kcal={macroKcal.fat} total={plan.calorieGoal}
            rule={`${fmt(settings.fatPerKg, 1)} g por kg`}
          >
            <Slider value={settings.fatPerKg} min={0.7} max={1.2} step={0.05} onChange={(v) => set({ fatPerKg: v })} suffix="g/kg" accent="accent-pink-400" />
          </MacroCard>
          <MacroCard
            color="text-amber-300" dot={MACRO_COLORS.carbs} label="Carbohidratos" grams={macros.carbs} kcal={macroKcal.carbs} total={plan.calorieGoal}
            rule="El resto de las calorías"
          >
            <p className="text-[11px] leading-snug text-zinc-500">Energía para entrenar fuerza. Se ajustan solos al cambiar el déficit.</p>
          </MacroCard>
        </div>

        {lowCarbs && (
          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Quedan pocos carbohidratos ({macros.carbs} g). Si notás que rendís menos entrenando, bajá un poco las grasas o elegí un déficit menor.
          </p>
        )}
      </Card>

      {/* 5. Otras metas */}
      <Card>
        <SectionTitle>5 · Otras metas</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {field('stepsGoal', 'Pasos (base)', 'pasos', 0)}
          {field('stepsStretch', 'Pasos (máxima)', 'pasos', 0)}
          {field('waterGoal', 'Agua', 'L', 0)}
          {field('sleepGoal', 'Sueño', 'h', 0)}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Dormir 7–9 h ayuda a controlar el hambre y a no perder músculo en el déficit.</p>
        {(() => {
          const rec = Math.round((plan.weight * 0.035) * 10) / 10
          return Math.abs(rec - settings.waterGoal) >= 0.2 ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              Para {fmt(plan.weight, 1)} kg con tu actividad se recomiendan unos <b className="text-zinc-200">{fmt(rec, 1)} L</b> de agua (35 ml por kg).
              <Button variant="ghost" size="sm" onClick={() => set({ waterGoal: rec })}>Usar {fmt(rec, 1)} L</Button>
            </p>
          ) : null
        })()}
      </Card>

      <Card>
        <SectionTitle>Copias automáticas</SectionTitle>
        <p className="mb-3 text-sm text-zinc-400">Cada día que abrís la app se guarda una copia en este navegador (las últimas 7). Si algo sale mal, volvé a una.</p>
        {listSnapshots().length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay copias.</p>
        ) : (
          <ul className="divide-y divide-dashed divide-white/[0.1]">
            {[...listSnapshots()].reverse().map((s) => (
              <li key={s.day} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-[15px] first-letter:uppercase">
                  {fromKey(s.day).toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <span className="tabular ml-2 text-xs text-zinc-500">{fmt(snapshotSize(s) / 1024)} KB</span>
                </span>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    if (!confirm('Vas a reemplazar tus datos actuales por los de esa copia. ¿Seguir?')) return
                    try { restoreSnapshot(s.day); location.reload() } catch (err) { setMsg(err.message) }
                  }}
                >
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>Datos</SectionTitle>
        <p className="mb-3 text-sm text-zinc-400">
          Todo se guarda en este navegador (localStorage). Exportá una copia de vez en cuando o para pasar tus datos a otro dispositivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={download}>Exportar copia (.json)</Button>
          <Button variant="ghost" onClick={downloadCsv}>Historial para Excel (.csv)</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>Importar copia</Button>
          <Button variant="ghost" onClick={() => setSettings(DEFAULT_SETTINGS)}>Restaurar ajustes</Button>
          <Button variant="danger" onClick={reset}>Borrar todo</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={upload} />
        </div>
        {msg && <p className="mt-3 text-sm text-rose-300">{msg}</p>}
      </Card>
    </div>
  )
}

function MacroCard({ color, dot, label, grams, kcal, total, rule, children }) {
  return (
    <div className="rounded-xl bg-black/[0.16] p-4">
      <p className="flex items-center gap-2 text-xs text-zinc-400"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${color}`}>{fmt(grams)} <span className="text-sm font-normal text-zinc-500">g</span></p>
      <p className="text-xs text-zinc-500">{fmt(kcal)} kcal · {fmt((kcal / total) * 100)}% · {rule}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Slider({ value, min, max, step, onChange, suffix, accent }) {
  return (
    <div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent}`}
      />
      <div className="flex justify-between text-[11px] text-zinc-500">
        <span>{min}</span><span className="text-zinc-300">{fmt(value, 2)} {suffix}</span><span>{max}</span>
      </div>
    </div>
  )
}
