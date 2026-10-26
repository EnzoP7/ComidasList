import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { addDays, formatShort, lastNDays, todayKey, weekStart } from '../lib/date'
import { dayChecks, dayTotals, measureChanges, planAdvice, sleepInsight } from '../lib/model'
import { Button, Card, PageHeader, SectionTitle, fmt } from './ui'

const RANGES = [
  { weeks: 4, label: '4 sem' },
  { weeks: 8, label: '8 sem' },
  { weeks: 12, label: '12 sem' },
  { weeks: 26, label: '6 meses' },
]

// Ejes y grilla recesivos sobre la pizarra; los datos usan la paleta validada (dataviz)
const C = {
  grid: '#2d3933', tick: '#959b92', chalk: '#eeede6', dot: '#aeb3a9', surface: '#202a26',
  protein: '#369dd1', proteinLow: '#497b98', good: '#3eab5e', sleep: '#866ec5', sleepLow: '#80789a',
}
const axis = { stroke: C.tick, fontSize: 11, tickLine: false, axisLine: false, fontFamily: 'Atkinson Hyperlegible' }
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export default function Stats({ logs, settings, plan, setSettings }) {
  const [weeks, setWeeks] = useState(8)

  const data = useMemo(() => {
    const days = lastNDays(weeks * 7).map((key) => {
      const d = logs[key]
      const t = dayTotals(d)
      return {
        key,
        label: formatShort(key),
        weight: d?.weight ?? null,
        waist: d?.waist ?? null,
        protein: d?.meals?.length ? Math.round(t.protein) : null,
        kcal: d?.meals?.length ? Math.round(t.kcal) : null,
        carbs: d?.meals?.length ? Math.round(t.carbs) : null,
        fat: d?.meals?.length ? Math.round(t.fat) : null,
        steps: d?.steps ?? null,
        sleep: d?.sleep ?? null,
        hunger: d?.hunger ?? null,
        energy: d?.energy ?? null,
      }
    })
    // Media móvil de 7 días del peso (suaviza retención de líquidos)
    days.forEach((day, i) => {
      const w = days.slice(Math.max(0, i - 6), i + 1).map((x) => x.weight).filter(Boolean)
      day.trend = w.length ? Math.round(avg(w) * 10) / 10 : null
    })
    return days
  }, [logs, weeks])

  const weekly = useMemo(() => {
    const groups = new Map()
    for (const d of data) {
      const wk = weekStart(d.key)
      if (!groups.has(wk)) groups.set(wk, [])
      groups.get(wk).push(d)
    }
    const rows = [...groups.entries()].map(([wk, ds]) => ({
      wk,
      weight: avg(ds.map((d) => d.weight).filter(Boolean)),
      protein: avg(ds.map((d) => d.protein).filter((x) => x != null)),
      kcal: avg(ds.map((d) => d.kcal).filter((x) => x != null)),
      carbs: avg(ds.map((d) => d.carbs).filter((x) => x != null)),
      fat: avg(ds.map((d) => d.fat).filter((x) => x != null)),
      steps: avg(ds.map((d) => d.steps).filter((x) => x != null)),
      sleep: avg(ds.map((d) => d.sleep).filter((x) => x != null)),
      hunger: avg(ds.map((d) => d.hunger).filter((x) => x != null)),
    }))
    rows.forEach((r, i) => {
      const prev = rows.slice(0, i).reverse().find((x) => x.weight != null)
      r.delta = r.weight != null && prev ? r.weight - prev.weight : null
    })
    return rows.reverse()
  }, [data])

  const proteinDays = data.filter((d) => d.protein != null)
  const hit = proteinDays.filter((d) => d.protein >= settings.proteinGoal * 0.95).length
  const stepDays = data.filter((d) => d.steps != null)
  const stepsHit = stepDays.filter((d) => d.steps >= settings.stepsGoal).length
  const weights = data.filter((d) => d.weight)
  const weightChange = weights.length >= 2 ? weights.at(-1).trend - weights[0].trend : null

  const waists = data.filter((d) => d.waist)
  const waistChange = waists.length >= 2 ? waists.at(-1).waist - waists[0].waist : null
  const waistDomain = waists.length
    ? [Math.floor(Math.min(...waists.map((d) => d.waist)) - 1), Math.ceil(Math.max(...waists.map((d) => d.waist)) + 1)]
    : [80, 95]

  // Calendario de constancia: días dentro del plan (siempre las últimas 12 semanas)
  const calendar = useMemo(() => {
    const days = lastNDays(84).map((key) => ({ key, ...dayChecks(logs[key], settings) }))
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].inPlan) streak++
      else if (i !== days.length - 1) break
    }
    return { days, streak, inPlan: days.filter((d) => d.inPlan).length, logged: days.filter((d) => d.logged).length }
  }, [logs, settings])

  const hasWeight = weights.length > 0
  const sleepGoal = settings.sleepGoal ?? 7.5
  const insight = useMemo(() => sleepInsight(logs, data.map((d) => d.key)), [logs, data])
  const measures = useMemo(() => measureChanges(logs, data.map((d) => d.key)), [logs, data])
  const domain = hasWeight
    ? [Math.floor(Math.min(...weights.map((d) => d.weight)) - 1), Math.ceil(Math.max(...weights.map((d) => d.weight)) + 1)]
    : [75, 90]

  const last = weights.at(-1)
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : null)
  const proteinAvg = proteinDays.length ? avg(proteinDays.map((d) => d.protein)) : null
  const carbsAvg = proteinDays.length ? avg(proteinDays.map((d) => d.carbs ?? 0)) : null
  const fatAvg = proteinDays.length ? avg(proteinDays.map((d) => d.fat ?? 0)) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progreso"
        action={
          <div className="flex rounded-xl border border-dashed border-white/[0.18] p-0.5 text-xs" role="group" aria-label="Período">
            {RANGES.map((r) => (
              <button
                key={r.weeks} onClick={() => setWeeks(r.weeks)} aria-pressed={weeks === r.weeks}
                className={`rounded-lg px-2.5 py-1.5 transition-colors ${weeks === r.weeks ? 'bg-white/[0.1] text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      >
        La tendencia manda: el peso de un día sube y baja con el agua y la sal.
      </PageHeader>

      <PlanAdvice advice={plan ? planAdvice(logs, plan, todayKey(), addDays) : null} setSettings={setSettings} />

      {/* Cifras del período */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-dashed border-white/[0.14] py-4 md:grid-cols-4">
        <Figure
          label="Cambio de cintura"
          value={waistChange == null ? '—' : `${waistChange > 0 ? '+' : '−'}${fmt(Math.abs(waistChange), 1)} cm`}
          tone={waistChange == null ? '' : waistChange <= 0 ? 'text-accent' : 'text-amber-300'}
          note={waistChange == null ? 'Medila en Hoy, una vez por semana' : 'la medida de los flancos'}
        />
        <Figure
          label="Cambio de peso (tendencia)"
          value={weightChange == null ? '—' : `${weightChange > 0 ? '+' : '−'}${fmt(Math.abs(weightChange), 1)} kg`}
          tone={weightChange == null ? '' : weightChange <= 0 ? 'text-accent' : 'text-amber-300'}
          note={weightChange == null ? 'Registrá tu peso al menos 2 días' : weightChange <= 0 ? 'bajando ▼' : 'subiendo ▲'}
        />
        <Figure label="Días con proteína cumplida" value={pct(hit, proteinDays.length) == null ? '—' : `${pct(hit, proteinDays.length)}%`} note={`${hit} de ${proteinDays.length} días anotados`} />
        <Figure label="Proteína media" value={proteinAvg == null ? '—' : `${fmt(proteinAvg)} g`} note={`meta ${settings.proteinGoal} g`} />
        <Figure label="Carbohidratos medios" value={carbsAvg == null ? '—' : `${fmt(carbsAvg)} g`} note={`meta ${settings.carbsGoal} g`} />
        <Figure label="Grasas medias" value={fatAvg == null ? '—' : `${fmt(fatAvg)} g`} note={`meta ${settings.fatGoal} g`} />
        <Figure label="Días con pasos cumplidos" value={pct(stepsHit, stepDays.length) == null ? '—' : `${pct(stepsHit, stepDays.length)}%`} note={stepDays.length ? `media ${fmt(avg(stepDays.map((d) => d.steps)))}` : 'sin pasos anotados'} />
      </dl>

      <Card variant="ruled">
        <SectionTitle>Peso · media de 7 días</SectionTitle>
        {hasWeight ? (
          <>
            <div className="h-64" role="img" aria-label={`Peso de los últimos ${weeks} semanas; último promedio ${last ? fmt(last.trend, 1) : '—'} kg`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 12, right: 64, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis {...axis} domain={domain} tickFormatter={(v) => fmt(v)} width={44} />
                  <Tooltip content={<Tip unit="kg" />} cursor={{ stroke: C.tick, strokeWidth: 1 }} />
                  <Line
                    dataKey="weight" name="Peso del día" stroke="none" isAnimationActive={false}
                    dot={{ r: 4, fill: C.dot, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 5, fill: C.chalk, stroke: C.surface, strokeWidth: 2 }}
                  />
                  <Line
                    dataKey="trend" name="Tendencia" stroke={C.chalk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    dot={false} activeDot={{ r: 5, fill: C.chalk, stroke: C.surface, strokeWidth: 2 }} connectNulls type="monotone"
                    label={<EndLabel last={data.length - 1 - [...data].reverse().findIndex((d) => d.trend != null)} unit=" kg" />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: 'Tendencia (media 7 días)', line: C.chalk }, { label: 'Peso del día', dot: C.dot }]} />
          </>
        ) : (
          <Empty text="Anotá tu peso en Hoy (en ayunas) y acá vas a ver la tendencia." />
        )}
      </Card>

      <Card variant="ruled">
        <SectionTitle>Cintura</SectionTitle>
        {waists.length >= 2 ? (
          <div className="h-48" role="img" aria-label={`Cintura: de ${fmt(waists[0].waist, 1)} a ${fmt(waists.at(-1).waist, 1)} cm`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={waists} margin={{ top: 12, right: 64, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
                <YAxis {...axis} domain={waistDomain} tickFormatter={(v) => fmt(v)} width={44} />
                <Tooltip content={<Tip unit="cm" />} cursor={{ stroke: C.tick, strokeWidth: 1 }} />
                <Line
                  dataKey="waist" name="Cintura" stroke={C.chalk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  dot={{ r: 4, fill: C.chalk, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 5, fill: C.chalk, stroke: C.surface, strokeWidth: 2 }}
                  isAnimationActive={false} label={<EndLabel last={waists.length - 1} unit=" cm" />}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty text="Con dos medidas de cintura (una por semana) vas a ver acá si los flancos están bajando." />
        )}
      </Card>

      <MeasuresCard measures={measures} />

      <Card variant="ruled">
        <SectionTitle action={<span className="tabular text-xs text-zinc-400">racha: <b className="text-zinc-100">{calendar.streak}</b> {calendar.streak === 1 ? 'día' : 'días'}</span>}>Días dentro del plan</SectionTitle>
        <p className="-mt-1.5 mb-3 text-xs text-zinc-500">
          Calorías entre 90% y 105% del objetivo y al menos 3 de 4 chequeos (calorías, proteína, pasos, agua). {calendar.inPlan} de {calendar.logged} días anotados en 12 semanas.
        </p>
        <div className="max-w-md"><PlanCalendar days={calendar.days} /></div>
      </Card>

      <Card variant="ruled">
        <SectionTitle>Proteína diaria</SectionTitle>
        {proteinDays.length ? (
          <>
            <div className="h-56" role="img" aria-label={`Proteína diaria; ${hit} de ${proteinDays.length} días cumplieron la meta de ${settings.proteinGoal} g`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: -18 }} barCategoryGap="18%">
                  <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis {...axis} width={44} />
                  <Tooltip content={<Tip unit="g" />} cursor={{ fill: 'rgba(238,237,230,0.05)' }} />
                  <ReferenceLine
                    y={settings.proteinGoal} stroke={C.good} strokeWidth={1}
                    label={{ value: `meta ${settings.proteinGoal} g`, position: 'insideTopLeft', fill: '#cdd0c6', fontSize: 11 }}
                  />
                  <Bar dataKey="protein" name="Proteína" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.protein >= settings.proteinGoal * 0.95 ? C.protein : C.proteinLow} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: 'Meta cumplida', swatch: C.protein }, { label: 'Por debajo de la meta', swatch: C.proteinLow }, { label: 'Meta diaria', line: C.good }]} />
          </>
        ) : (
          <Empty text="Comé un taper o anotá comidas y acá vas a ver tu constancia con la proteína." />
        )}
        <ConsistencyStrip data={data.slice(-28)} goal={settings.proteinGoal} />
      </Card>

      <Card variant="ruled">
        <SectionTitle>Calorías diarias</SectionTitle>
        {data.some((d) => d.kcal != null) ? (
          <>
            <div className="h-48" role="img" aria-label={`Calorías diarias frente al objetivo de ${settings.calorieGoal} kcal`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: -10 }} barCategoryGap="18%">
                  <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis {...axis} width={48} tickFormatter={(v) => (v >= 1000 ? `${fmt(v / 1000, 1)}k` : v)} />
                  <Tooltip content={<Tip unit="kcal" />} cursor={{ fill: 'rgba(238,237,230,0.05)' }} />
                  <ReferenceLine y={settings.calorieGoal} stroke="#cdd0c6" strokeWidth={1} label={{ value: `objetivo ${fmt(settings.calorieGoal)}`, position: 'insideTopLeft', fill: '#cdd0c6', fontSize: 11 }} />
                  <Bar dataKey="kcal" name="Calorías" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.kcal > settings.calorieGoal * 1.05 ? '#e2685a' : '#866ec5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: 'Dentro o por debajo', swatch: '#866ec5' }, { label: 'Más de 5% arriba', swatch: '#e2685a' }, { label: 'Objetivo', line: '#cdd0c6' }]} />
          </>
        ) : (
          <Empty text="Cuando anotes comidas vas a ver acá tus calorías de cada día contra el objetivo." />
        )}
      </Card>

      <Card variant="ruled">
        <SectionTitle>Pasos diarios</SectionTitle>
        {stepDays.length ? (
          <>
            <div className="h-48" role="img" aria-label={`Pasos diarios; meta ${settings.stepsGoal}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: -10 }} barCategoryGap="18%">
                  <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis {...axis} width={48} tickFormatter={(v) => (v >= 1000 ? `${fmt(v / 1000)}k` : v)} />
                  <Tooltip content={<Tip unit="pasos" />} cursor={{ fill: 'rgba(238,237,230,0.05)' }} />
                  <ReferenceLine y={settings.stepsGoal} stroke={C.good} strokeWidth={1} label={{ value: `meta ${fmt(settings.stepsGoal)}`, position: 'insideTopLeft', fill: '#cdd0c6', fontSize: 11 }} />
                  <Bar dataKey="steps" name="Pasos" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.steps >= settings.stepsGoal ? '#b18e15' : '#86722a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: 'Meta cumplida', swatch: '#b18e15' }, { label: 'Por debajo', swatch: '#86722a' }, { label: 'Meta diaria', line: C.good }]} />
          </>
        ) : (
          <Empty text="Anotá tus pasos en Hoy y vas a ver acá cuántos días llegás a la meta." />
        )}
      </Card>

      <Card variant="ruled">
        <SectionTitle action={<span className="text-xs text-zinc-500">meta {fmt(sleepGoal, 1)} h</span>}>Sueño, hambre y energía</SectionTitle>
        {insight.nights ? (
          <>
            <div className="h-48" role="img" aria-label={`Horas de sueño por noche; media ${fmt(insight.avgSleep, 1)} h, meta ${fmt(sleepGoal, 1)} h`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: -18 }} barCategoryGap="18%">
                  <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis {...axis} width={44} domain={[0, (max) => Math.max(10, Math.ceil(max))]} />
                  <Tooltip content={<SleepTip />} cursor={{ fill: 'rgba(238,237,230,0.05)' }} />
                  <ReferenceLine y={sleepGoal} stroke={C.good} strokeWidth={1} label={{ value: `meta ${fmt(sleepGoal, 1)} h`, position: 'insideTopLeft', fill: '#cdd0c6', fontSize: 11 }} />
                  <Bar dataKey="sleep" name="Sueño" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                    {data.map((d) => <Cell key={d.key} fill={d.sleep >= sleepGoal ? C.sleep : C.sleepLow} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: 'Meta cumplida', swatch: C.sleep }, { label: 'Por debajo', swatch: C.sleepLow }, { label: 'Meta', line: C.good }]} />
            <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-dashed border-white/[0.12] pt-4">
              <Figure label="Sueño medio" value={`${fmt(insight.avgSleep, 1)} h`} note={`${insight.nights} ${insight.nights === 1 ? 'noche' : 'noches'}`} />
              <Figure label="Hambre media" value={insight.avgHunger == null ? '—' : `${fmt(insight.avgHunger, 1)}/5`} note="1 nada · 5 muchísima" />
              <Figure label="Energía media" value={insight.avgEnergy == null ? '—' : `${fmt(insight.avgEnergy, 1)}/5`} note="1 fundido · 5 a full" />
            </dl>
            <SleepVerdict insight={insight} />
          </>
        ) : (
          <Empty text="Anotá en Hoy cuánto dormiste y cómo estuvo tu hambre: acá vas a ver si las noches cortas te dan más hambre o frenan el peso." />
        )}
      </Card>

      <Card variant="ruled">
        <SectionTitle>Semana a semana</SectionTitle>
        <div className="-mx-1 overflow-x-auto">
          <table className="tabular w-full text-sm">
            <thead className="text-left text-xs text-zinc-500">
              <tr className="border-b border-dashed border-white/[0.14]">
                <th className="px-1 py-2 font-normal">Semana del</th>
                <th className="px-1 py-2 text-right font-normal">Peso medio</th>
                <th className="px-1 py-2 text-right font-normal">Cambio</th>
                <th className="hidden px-1 py-2 text-right font-normal sm:table-cell">kcal/día</th>
                <th className="px-1 py-2 text-right font-normal">Proteína</th>
                <th className="hidden px-1 py-2 text-right font-normal md:table-cell">Carbos</th>
                <th className="hidden px-1 py-2 text-right font-normal md:table-cell">Grasas</th>
                <th className="hidden px-1 py-2 text-right font-normal sm:table-cell">Pasos</th>
                <th className="hidden px-1 py-2 text-right font-normal sm:table-cell">Sueño</th>
                <th className="hidden px-1 py-2 text-right font-normal lg:table-cell">Hambre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-white/[0.08]">
              {weekly.map((w) => (
                <tr key={w.wk}>
                  <td className="px-1 py-2.5 text-zinc-400">{formatShort(w.wk)}</td>
                  <td className="px-1 py-2.5 text-right text-zinc-100">{fmt(w.weight, 1)}</td>
                  <td className={`px-1 py-2.5 text-right ${w.delta == null ? 'text-zinc-600' : w.delta <= 0 ? 'text-accent' : 'text-amber-300'}`}>
                    {w.delta == null ? '—' : `${w.delta > 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(w.delta), 1)}`}
                  </td>
                  <td className="hidden px-1 py-2.5 text-right sm:table-cell">{fmt(w.kcal)}</td>
                  <td className="px-1 py-2.5 text-right">{w.protein == null ? '—' : `${fmt(w.protein)} g`}</td>
                  <td className="hidden px-1 py-2.5 text-right md:table-cell">{w.carbs == null ? '—' : `${fmt(w.carbs)} g`}</td>
                  <td className="hidden px-1 py-2.5 text-right md:table-cell">{w.fat == null ? '—' : `${fmt(w.fat)} g`}</td>
                  <td className="hidden px-1 py-2.5 text-right sm:table-cell">{fmt(w.steps)}</td>
                  <td className={`hidden px-1 py-2.5 text-right sm:table-cell ${w.sleep != null && w.sleep < 7 ? 'text-amber-300' : ''}`}>{w.sleep == null ? '—' : `${fmt(w.sleep, 1)} h`}</td>
                  <td className="hidden px-1 py-2.5 text-right lg:table-cell">{w.hunger == null ? '—' : fmt(w.hunger, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Ritmo sano para recomposición: bajar 0,25 a 0,5 kg por semana. Más rápido suele costar músculo.
        </p>
      </Card>
    </div>
  )
}

// Consejo de ajuste según el ritmo real de las últimas dos semanas
function PlanAdvice({ advice, setSettings }) {
  if (!advice) return null
  const rate = advice.rate != null ? `${advice.rate > 0 ? '+' : '−'}${fmt(Math.abs(advice.rate), 2)} kg/semana` : null
  const text = {
    waiting: `Para sugerirte ajustes necesito unos pesajes más en estas dos semanas (faltan ${advice.need}).`,
    ok: 'Vas a un ritmo sano para bajar los flancos sin perder músculo. No cambies nada.',
    stalled: `El peso no está bajando. Probá recortar 150 kcal (objetivo ${fmt(advice.target)} kcal) o sumar 2.000 pasos por día.`,
    'stalled-floor': 'El peso no está bajando, pero ya estás cerca de tu metabolismo basal: mejor sumá 2.000 pasos por día que comer menos.',
    fast: `Estás bajando muy rápido: sumá 150 kcal (objetivo ${fmt(advice.target)} kcal) para proteger el músculo.`,
  }[advice.status]
  const tone = advice.status === 'ok' ? 'text-accent' : advice.status === 'waiting' ? 'text-zinc-300' : 'text-amber-200'
  return (
    <div className="rounded-[14px] bg-ink-900 p-4 shadow-[inset_0_1px_0_rgb(238_237_230/0.05)]">
      <p className="font-hand text-[26px] leading-none text-zinc-100">Cómo vas</p>
      {rate && <p className="tabular mt-1.5 text-xs text-zinc-500">Ritmo de las últimas 2 semanas: <b className="text-zinc-200">{rate}</b></p>}
      <p className={`mt-2 text-[15px] ${tone}`}>{text}</p>
      {advice.delta && setSettings && (
        <Button
          className="mt-3" size="sm"
          onClick={() => setSettings((s) => ({ ...s, deficitLevel: 'custom', customCalories: advice.target }))}
        >
          Aplicar: objetivo {fmt(advice.target)} kcal
        </Button>
      )}
    </div>
  )
}

// 12 semanas en columnas (lunes arriba); verde más intenso = más chequeos cumplidos
function PlanCalendar({ days }) {
  const lead = (new Date(`${days[0].key}T00:00`).getDay() + 6) % 7
  const cells = [...Array(lead).fill(null), ...days]
  const tone = (d) => {
    if (!d) return 'bg-transparent'
    if (!d.logged) return 'bg-ink-800'
    if (d.inPlan) return d.passed === 4 ? 'bg-data-good' : 'bg-[#2f7d47]'
    return d.passed >= 2 ? 'bg-[#2a4a36]' : 'bg-[#26352d]'
  }
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.ceil(cells.length / 7)}, minmax(0, 1fr))` }}>
        {cells.map((d, i) => (
          <div
            key={d?.key ?? `x${i}`}
            className={`aspect-square max-h-6 rounded-[3px] ${tone(d)}`}
            title={d ? `${formatShort(d.key)}: ${d.logged ? `${d.passed}/4${d.inPlan ? ' · dentro del plan' : ''}` : 'sin datos'}` : undefined}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-good" />4 de 4</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#2f7d47]" />dentro del plan</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#2a4a36]" />cerca</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#26352d]" />lejos</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink-800" />sin datos</li>
      </ul>
    </div>
  )
}

function Figure({ label, value, note, tone = 'text-zinc-50' }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-[30px] font-bold leading-none ${tone}`}>{value}</dd>
      {note && <dd className="mt-1 text-xs text-zinc-500">{note}</dd>}
    </div>
  )
}

// Valor al final de la línea de tendencia (etiqueta directa, solo el último punto)
function EndLabel({ x, y, index, value, last, unit }) {
  if (index !== last || value == null) return null
  return <text x={x + 8} y={y + 4} fill="#eeede6" fontSize={12} fontWeight={700}>{fmt(value, 1)}{unit}</text>
}

function Legend({ items }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-400">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.line && <span className="h-0.5 w-4 rounded-full" style={{ background: i.line }} />}
          {i.dot && <span className="h-2 w-2 rounded-full" style={{ background: i.dot }} />}
          {i.swatch && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.swatch }} />}
          {i.label}
        </li>
      ))}
    </ul>
  )
}

// Últimos 28 días: escala de un solo tono (más oscuro = menos proteína)
function ConsistencyStrip({ data, goal }) {
  const level = (p) => (p == null ? 'bg-ink-800' : p >= goal * 0.95 ? 'bg-data-protein' : p >= goal * 0.75 ? 'bg-sky-700' : 'bg-sky-950')
  return (
    <div className="mt-5">
      <p className="mb-2 font-hand text-[21px] leading-none text-zinc-300">Últimos 28 días</p>
      <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[2px]">
        {data.map((d) => (
          <div key={d.key} title={`${d.label}: ${d.protein ?? 'sin datos'}${d.protein != null ? ' g' : ''}`} className={`aspect-square rounded-[3px] ${level(d.protein)}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-protein" />≥ 95% de la meta</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-700" />75–95%</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-950" />menos de 75%</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink-800" />sin datos</li>
      </ul>
    </div>
  )
}

function Tip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null)
  if (!rows.length) return null
  return (
    <div className="rounded-lg bg-ink-800 px-3 py-2 text-xs shadow-[0_10px_24px_-10px_rgb(0_0_0/0.7)]">
      <p className="mb-1 text-zinc-400">{label}</p>
      {rows.map((p) => (
        <p key={p.dataKey} className="tabular text-zinc-100">
          {p.name}: <b>{fmt(p.value, 1)} {unit}</b>
        </p>
      ))}
    </div>
  )
}

const HUNGER = ['nada', 'poca', 'normal', 'bastante', 'muchísima']
const ENERGY = ['fundido', 'cansado', 'normal', 'bien', 'a full']

function SleepTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (d.sleep == null && d.hunger == null && d.energy == null) return null
  return (
    <div className="rounded-lg bg-ink-800 px-3 py-2 text-xs shadow-[0_10px_24px_-10px_rgb(0_0_0/0.7)]">
      <p className="mb-1 text-zinc-400">{label}</p>
      <p className="tabular text-zinc-100">Sueño: <b>{d.sleep == null ? '—' : `${fmt(d.sleep, 1)} h`}</b></p>
      {d.hunger != null && <p className="text-zinc-100">Hambre: <b>{d.hunger}/5</b> · {HUNGER[d.hunger - 1]}</p>}
      {d.energy != null && <p className="text-zinc-100">Energía: <b>{d.energy}/5</b> · {ENERGY[d.energy - 1]}</p>}
    </div>
  )
}

// La conclusión en palabras: ¿dormir poco te da más hambre o frena el peso?
function SleepVerdict({ insight: s }) {
  const lines = []
  if (!s.enough) {
    lines.push({ text: `Para comparar necesito al menos 3 noches de menos de 7 h y 3 de 7 h o más (tenés ${s.short} y ${s.long}). Seguí anotando sueño y hambre.` })
  } else {
    if (s.hungerGap != null) {
      const h = `${fmt(s.hungerShort, 1)} contra ${fmt(s.hungerLong, 1)}`
      lines.push(s.hungerGap >= 0.5
        ? { warn: true, text: `Dormir menos de 7 h te da más hambre: ${h} de 5. Dormir bien es la forma más barata de bajar el hambre (y no picar).` }
        : s.hungerGap <= -0.5
          ? { text: `Curioso: con menos de 7 h tenés menos hambre (${h}). Por ahora el sueño no te está jugando en contra.` }
          : { text: `Tu hambre casi no cambia con el sueño (${h} de 5).` })
    }
    if (s.energyGap != null && s.energyGap <= -0.5) {
      lines.push({ warn: true, text: `Las noches cortas te bajan la energía: ${fmt(s.energyShort, 1)} contra ${fmt(s.energyLong, 1)} de 5. Ojo con el entrenamiento esos días.` })
    }
  }
  if (s.weeks >= 2) {
    const d = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), 1)} kg`
    lines.push(s.changeWorst - s.changeBest >= 0.2
      ? { warn: true, text: `En tus semanas de peor sueño el peso cambió ${d(s.changeWorst)}; en las de mejor sueño, ${d(s.changeBest)}. Las semanas que dormís poco coinciden con el peso estancado.` }
      : { text: `En las semanas de peor sueño el peso cambió ${d(s.changeWorst)} y en las mejores ${d(s.changeBest)}: por ahora el sueño no frena el progreso.` })
  }
  return (
    <ul className="mt-4 space-y-2 text-sm">
      {lines.map((l) => (
        <li key={l.text} className={`border-l-2 pl-3 ${l.warn ? 'border-amber-300/70 text-zinc-100' : 'border-white/[0.18] text-zinc-300'}`}>{l.text}</li>
      ))}
    </ul>
  )
}

// Primera y última medida de cada parte, con el cambio
function MeasuresCard({ measures }) {
  const any = measures.some((m) => m.count)
  return (
    <Card variant="ruled">
      <SectionTitle>Medidas</SectionTitle>
      {any ? (
        <>
          <table className="tabular w-full text-sm">
            <thead className="text-left text-xs text-zinc-500">
              <tr className="border-b border-dashed border-white/[0.14]">
                <th className="px-1 py-2 font-normal">Medida</th>
                <th className="px-1 py-2 text-right font-normal">Primera</th>
                <th className="px-1 py-2 text-right font-normal">Última</th>
                <th className="px-1 py-2 text-right font-normal">Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-white/[0.08]">
              {measures.map((m) => {
                // Cintura y cadera: bajar es bueno. Pecho y brazo: mantener o subir es bueno.
                const good = m.change == null ? null : m.key === 'waist' || m.key === 'hips' ? m.change <= 0 : m.change >= -0.5
                return (
                  <tr key={m.key}>
                    <td className="px-1 py-2.5 text-zinc-200">{m.label}</td>
                    <td className="px-1 py-2.5 text-right text-zinc-400">{m.first == null ? '—' : <>{fmt(m.first, 1)} <span className="block text-[11px] text-zinc-500 sm:inline">{formatShort(m.firstKey)}</span></>}</td>
                    <td className="px-1 py-2.5 text-right text-zinc-100">{m.last == null ? '—' : <>{fmt(m.last, 1)} <span className="block text-[11px] text-zinc-500 sm:inline">{formatShort(m.lastKey)}</span></>}</td>
                    <td className={`px-1 py-2.5 text-right ${good == null ? 'text-zinc-600' : good ? 'text-accent' : 'text-amber-300'}`}>
                      {m.change == null ? '—' : `${m.change > 0 ? '+' : m.change < 0 ? '−' : ''}${fmt(Math.abs(m.change), 1)} cm`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500">En recomposición querés cintura y cadera bajando, y pecho y brazo quietos o subiendo.</p>
        </>
      ) : (
        <Empty text="Medí cintura (y si querés cadera, pecho y brazo) en Hoy → Peso. Acá vas a ver cuánto cambió cada una." />
      )}
    </Card>
  )
}

function Empty({ text }) {
  return <div className="grid h-40 place-items-center rounded-xl border border-dashed border-white/[0.16] px-4 text-center text-sm text-zinc-400">{text}</div>
}
