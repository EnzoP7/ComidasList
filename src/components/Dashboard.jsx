import { useMemo, useState } from 'react'
import { addDays, todayKey } from '../lib/date'
import { useFoods } from '../lib/foodsContext'
import { MEAL_KINDS, closeTheDay, computeRows, mealEntry } from '../lib/meals'
import { money } from '../lib/prices'
import { foodVariants, hasStates, stateLabel } from '../lib/foods'
import { FoodSearch, MODES, defaultGrams, foodIconOf } from './MealBuilder'
import StatePicker from './StatePicker'
import {
  BODY_MEASURES, TRAINING_TYPES, dayBurn, dayChecks, dayTotals, latestWeight, maintenance, quoteFor, recipeMacros, trainingKcal, trainingType, uid, waterTotal,
} from '../lib/model'
import DateNav from './DateNav'
import FeelCard from './FeelCard'
import { useToast } from './Toast'
import { detectIcon, recipeIcon } from '../lib/icons'
import { Button, Card, ChalkNumber, ChalkUnderline, Icon, Input, ProgressBar, SectionTitle, Tally, erase, fmt, num } from './ui'

// Atajos de un toque para suplementos habituales
const PRESETS = [
  { name: 'Batido whey (30 g)', icon: '🥤', kcal: 120, protein: 23.4, fat: 1.8, carbs: 2.4 },
  { name: 'Creatina (5 g)', icon: '⚡', kcal: 0, protein: 0, fat: 0, carbs: 0 },
  { name: 'Yogur descremado (250 g)', icon: '🧀', kcal: 100, protein: 10, fat: 0.3, carbs: 13.8 },
  { name: '3 claras + 1 huevo', icon: '🥚', kcal: 123, protein: 17.2, fat: 5.1, carbs: 1 },
].map((p) => ({ ...p, kind: 'extra' }))

export default function Dashboard({
  settings, logs, recipes, prices, favorites = [], date, setDate, updateDay, addMeal, removeMeal, scaleMeal, repeatMeals, eatTupper,
  goToBatch, goToWater, goToSettings, goToShop, openCreate,
}) {
  const { foods, variants } = useFoods()
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const day = logs[date] ?? { meals: [] }
  const { kcal, protein, fat, carbs } = dayTotals(day)
  const isToday = date === todayKey()

  const prevWeight = latestWeight(logs, addDays(date, -1))
  const currentWeight = day.weight ?? latestWeight(logs, date)
  const weight = currentWeight ?? settings.startWeight
  const tdee = maintenance(settings, weight)
  const remaining = settings.calorieGoal - kcal
  const plannedDeficit = tdee - settings.calorieGoal
  const burn = dayBurn(day, settings, weight)
  const balance = kcal - burn.total
  const steps = day.steps ?? 0

  const available = recipes.filter((r) => r.remaining > 0)
  const water = waterTotal(day)
  const addWater = (ml) =>
    updateDay(date, (d) => ({ water: [...(d.water ?? []), { id: uid(), at: Date.now(), ml }] }))

  const over = remaining < 0
  const [openMeal, setOpenMeal] = useState(null)
  const yesterday = addDays(date, -1)
  const yesterdayMeals = logs[yesterday]?.meals ?? []
  const plan = dayChecks(day, settings)
  // Última cintura registrada antes de este día (para comparar)
  const prevWaistKey = Object.keys(logs).filter((k) => k < date && logs[k]?.waist).sort().at(-1)
  const prevWaist = prevWaistKey ? logs[prevWaistKey].waist : null
  const glasses = Math.round(water / 250)
  const glassesGoal = Math.round((settings.waterGoal * 1000) / 250)

  return (
    <div className="space-y-7">
      <DateNav date={date} setDate={setDate} />

      <FirstSteps logs={logs} recipes={recipes} favorites={favorites} goToSettings={goToSettings} openCreate={openCreate} />
      {isToday && <WeekReport logs={logs} settings={settings} date={date} />}
      {isToday && <CookReminder recipes={recipes} date={date} goToShop={goToShop} openCreate={openCreate} />}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
      <div className="space-y-7">
      {/* La cifra del día, escrita grande a tiza */}
      <section aria-label="Calorías del día">
        <p className="font-hand text-[26px] leading-none text-zinc-400">{over ? 'te pasaste por' : 'te quedan'}</p>
        <p className="mt-1 flex items-baseline gap-3">
          <ChalkNumber value={fmt(Math.abs(remaining))} className={`text-[84px] font-bold leading-[0.82] sm:text-[104px] ${over ? 'text-rose-300' : 'text-zinc-50'}`} />
          <span className="font-hand text-[26px] text-zinc-400">kcal</span>
        </p>
        <div className="mt-4 max-w-xl"><ProgressBar value={kcal} max={settings.calorieGoal} tone={over ? 'rose' : 'accent'} /></div>
        <p className="tabular mt-2.5 text-sm text-zinc-400">
          comiste <b className="text-zinc-100">{fmt(kcal)}</b>
          <span className="mx-1.5 text-zinc-700">·</span>objetivo <b className="text-zinc-100">{fmt(settings.calorieGoal)}</b>
          <span className="mx-1.5 text-zinc-700">·</span>quemaste <b className="text-orange-300">{fmt(burn.active)}</b>
        </p>
        <p className="tabular mt-1 text-sm text-zinc-400">
          objetivo de hoy: <span className="text-sky-300">{settings.proteinGoal} g prot</span>
          {' '}<span className="mx-1 text-zinc-700">·</span>{' '}<span className="text-amber-300">{settings.carbsGoal} g carbos</span>
          {' '}<span className="mx-1 text-zinc-700">·</span>{' '}<span className="text-pink-300">{settings.fatGoal} g grasas</span>
        </p>
        <p className={`mt-1 text-sm ${balance <= 0 ? 'text-accent' : 'text-rose-300'}`}>
          {balance <= 0 ? 'Déficit' : 'Superávit'} real hoy: <b className="tabular">{fmt(Math.abs(balance))} kcal</b>
          <span className="text-zinc-500"> · gasto estimado {fmt(burn.total)}</span>
        </p>

        {/* Chequeos del plan: cuatro marcas a tiza */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Chequeos del plan">
          {plan.checks.map((c) => (
            <span key={c.id} className={`flex items-center gap-1.5 text-sm ${c.ok ? 'text-zinc-100' : 'text-zinc-500'}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-md border ${c.ok ? 'border-accent bg-accent text-ink-950' : 'border-dashed border-white/25'}`}>
                {c.ok && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />}
              </span>
              {c.label}
            </span>
          ))}
          {plan.inPlan && (
            <span className="relative font-hand text-[21px] leading-none text-accent">
              día dentro del plan
              <span className="absolute -bottom-2 inset-x-0"><ChalkUnderline className="text-accent" /></span>
            </span>
          )}
        </div>
      </section>

      {/* Renglones fijos de la pizarra */}
      <section className="border-y border-dashed border-white/[0.14]" aria-label="Metas del día">
        <Renglon
          label="Proteína" value={fmt(protein)} unit={`/ ${settings.proteinGoal} g`}
          ratio={protein / settings.proteinGoal} tone="sky" done={protein >= settings.proteinGoal}
          note={protein >= settings.proteinGoal ? 'cumplida: el músculo se queda' : `faltan ${fmt(settings.proteinGoal - protein)} g`}
        />
        <Renglon
          label="Pasos" value={fmt(steps)} unit={`/ ${fmt(settings.stepsGoal)}`}
          ratio={steps / settings.stepsStretch} marker={settings.stepsGoal / settings.stepsStretch} tone="amber" done={steps >= settings.stepsGoal}
          note={steps >= settings.stepsStretch ? 'meta máxima superada' : steps >= settings.stepsGoal ? `base cumplida · ${fmt(settings.stepsStretch - steps)} para ${fmt(settings.stepsStretch)}` : `faltan ${fmt(settings.stepsGoal - steps)}`}
          action={
            <div className="flex items-center gap-1">
              <NumberField
                key={`steps-${date}`} value={day.steps} placeholder="total"
                onCommit={(v) => updateDay(date, { steps: v == null ? null : Math.round(v) })}
                className="w-[84px]" aria-label="Pasos totales"
              />
              <Button variant="ghost" size="sm" onClick={() => updateDay(date, { steps: steps + 1000 })}>+1k</Button>
            </div>
          }
        />
        <Renglon
          label="Agua" value={fmt(water / 1000, 2)} unit={`/ ${fmt(settings.waterGoal, 1)} L`}
          ratio={water / (settings.waterGoal * 1000)} tone="aqua" done={water >= settings.waterGoal * 1000}
          note={<Tally count={glasses} max={glassesGoal} className="text-aqua-300" />}
          action={
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => addWater(250)} aria-label="Sumar un vaso de 250 ml">+ vaso</Button>
              <Button variant="plain" size="icon" onClick={goToWater} aria-label="Ver agua"><Icon name="right" className="h-4 w-4" /></Button>
            </div>
          }
        />
      </section>

      {isToday && (
        <CloseTheDay
          kcalLeft={remaining} proteinLeft={settings.proteinGoal - protein}
          available={available} favorites={favorites} byId={byId} prices={prices} variants={variants}
          onEatTupper={(r) => eatTupper(date, r)} onAdd={(entry) => addMeal(date, entry)}
        />
      )}

      {/* En el celular, lo que hay para comer va justo debajo de las metas */}
      <Fridge available={available} date={date} eatTupper={eatTupper} goToBatch={goToBatch} className="lg:hidden" />

      {/* Carbos y grasas, en segundo plano */}
      <div className="grid max-w-xl grid-cols-2 gap-5">
        <MacroMini label="Carbohidratos" value={carbs} goal={settings.carbsGoal} color="amber" />
        <MacroMini label="Grasas" value={fat} goal={settings.fatGoal} color="pink" />
      </div>

      {/* Nota del día, a tiza en la esquina */}
      <p className="max-w-xl font-hand text-[21px] leading-snug text-zinc-300">
        <span className="text-accent">Flancos:</span> {quoteFor(date)}
      </p>

      {/* Peso */}
      <Card variant="ruled">
        <SectionTitle>Peso</SectionTitle>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="flex items-baseline gap-1.5">
              {day.weight
                ? <ChalkNumber value={fmt(day.weight, 1)} className="text-5xl font-bold leading-none text-zinc-50" />
                : <span className="text-4xl font-bold leading-none text-zinc-600">sin dato</span>}
              <span className="font-hand text-[26px] text-zinc-400">kg</span>
            </p>
            {day.weight && prevWeight && (
              <p className={`mt-1.5 text-xs ${day.weight <= prevWeight ? 'text-accent' : 'text-amber-300'}`}>
                {day.weight - prevWeight > 0 ? '+' : ''}{fmt(day.weight - prevWeight, 1)} kg vs. el último registro
              </p>
            )}
          </div>
          <NumberField
            key={`w-${date}`} value={day.weight} placeholder="82,5" step="0.1"
            onCommit={(v) => updateDay(date, { weight: v })} className="w-28" suffix="kg" aria-label="Peso de hoy"
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">En ayunas, después de ir al baño. Mirá la tendencia en Progreso, no el dato suelto.</p>

        {/* Cintura: la medida que mejor sigue a los flancos */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-white/[0.12] pt-4">
          <div>
            <p className="font-hand text-[21px] leading-none text-zinc-400">Cintura</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold leading-none text-zinc-50">{day.waist ? fmt(day.waist, 1) : '—'}</span>
              <span className="text-sm text-zinc-500">cm</span>
            </p>
            {day.waist && prevWaist ? (
              <p className={`mt-1 text-xs ${day.waist <= prevWaist ? 'text-accent' : 'text-amber-300'}`}>
                {day.waist - prevWaist > 0 ? '+' : ''}{fmt(day.waist - prevWaist, 1)} cm vs. la medida anterior
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">{prevWaist ? `Última: ${fmt(prevWaist, 1)} cm` : 'Medila una vez por semana'}</p>
            )}
          </div>
          <NumberField
            key={`waist-${date}`} value={day.waist} placeholder="88" step="0.5"
            onCommit={(v) => updateDay(date, { waist: v })} className="w-28" suffix="cm" aria-label="Cintura"
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">A la altura del ombligo, relajado y sin apretar la cinta, mismo día y hora cada semana.</p>
        <MoreMeasures logs={logs} date={date} day={day} onCommit={(patch) => updateDay(date, patch)} />
      </Card>
      </div>

      <div className="space-y-7">
        <Fridge available={available} date={date} eatTupper={eatTupper} goToBatch={goToBatch} className="hidden lg:block" />
        <QuickMeals
          favorites={favorites} byId={byId} prices={prices} variants={variants}
          onEat={(entry) => addMeal(date, entry)} openCreate={openCreate}
        />
        <FeelCard day={day} settings={settings} date={date} onChange={(patch) => updateDay(date, patch)} />
        <ActivityCard day={day} weight={weight} burn={burn} onChange={(patch) => updateDay(date, patch)} />
      </div>
      </div>


      {/* Lo comido hoy */}
      <Card variant="ruled">
        <SectionTitle
          action={yesterdayMeals.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => repeatMeals(yesterday, date)}>
              <Icon name="refresh" className="h-3.5 w-3.5" /> Repetir lo de ayer ({yesterdayMeals.length})
            </Button>
          )}
        >
          {isToday ? 'Lo que comiste hoy' : 'Lo que comiste ese día'}
        </SectionTitle>
        <QuickFood byId={byId} foods={foods} prices={prices} variants={variants} logs={logs} date={date} onAdd={(meal) => addMeal(date, meal)} />
        <QuickAdd onAdd={(meal) => addMeal(date, meal)} />
        {day.meals.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Todavía nada anotado. Comé un taper, cargá un desayuno guardado o sumá algo arriba.</p>
        ) : (
          <ul className="mt-4 divide-y divide-dashed divide-white/[0.1]">
            {day.meals.map((m) => {
              const k = MEAL_KINDS[m.kind ?? (m.recipeId ? 'tupper' : 'extra')]
              return (
                <li key={m.id} className="py-2.5">
                  <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{m.icon ?? detectIcon(m.name)}</span>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpenMeal(openMeal === m.id ? null : m.id)} aria-expanded={openMeal === m.id}>
                    <p className="truncate text-[15px]">{m.name || 'Comida'}</p>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      <span className={`rounded px-1 py-px ${k.tone}`}>{k.label}</span>
                      {m.factor && m.factor !== 1 && <span className="ml-1.5 normal-case tracking-normal text-zinc-400">× {fmt(m.factor, 2)}</span>}
                      <span className="ml-1.5 normal-case tracking-normal text-zinc-600">{openMeal === m.id ? 'cerrar' : 'porción'}</span>
                    </p>
                  </button>
                  <span className="tabular shrink-0 text-right text-sm">
                    <span className="block text-zinc-100">{fmt(m.kcal)} kcal</span>
                    <span className="block text-xs text-sky-300">{fmt(m.protein, 1)} g prot</span>
                  </span>
                  <Button
                    variant="plain" size="icon" aria-label={`Borrar ${m.name}`}
                    onClick={(e) => erase(e.currentTarget.closest('li'), () => removeMeal(date, m.id))}
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </Button>
                  </div>
                  {openMeal === m.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9" role="group" aria-label="Porción">
                      {[0.5, 1, 1.5, 2].map((f) => (
                        <button
                          key={f} onClick={() => scaleMeal(date, m.id, f)}
                          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${(m.factor ?? 1) === f ? 'border-accent/70 bg-accent/10 text-zinc-50' : 'border-dashed border-white/[0.18] text-zinc-400 hover:text-zinc-100'}`}
                        >
                          {f === 0.5 ? '½' : f === 1.5 ? '1½' : f} porción
                        </button>
                      ))}
                      {(m.fat != null || m.carbs != null) && (
                        <span className="tabular ml-1 text-xs text-zinc-500">{fmt(m.carbs ?? 0)} g carb · {fmt(m.fat ?? 0, 1)} g grasa</span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

// Lunes y martes: cómo fue la semana anterior (lunes a domingo); se cierra por semana
function WeekReport({ logs, settings, date }) {
  const dow = (new Date(`${date}T00:00`).getDay() + 6) % 7 // 0 = lunes
  const lastMonday = addDays(date, -dow - 7)
  const storeKey = `recomp:ui:weekReport:${lastMonday}`
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(storeKey) === 'closed' } catch { return false }
  })
  if (dow > 1 || hidden) return null
  const days = Array.from({ length: 7 }, (_, i) => addDays(lastMonday, i))
  const prevDays = Array.from({ length: 7 }, (_, i) => addDays(lastMonday, i - 7))
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const weights = (ds) => ds.map((k) => logs[k]?.weight).filter(Boolean)
  const w = avg(weights(days)), wPrev = avg(weights(prevDays))
  const waist = days.map((k) => logs[k]?.waist).filter(Boolean).at(-1)
  const waistPrev = [...prevDays, ...days.slice(0, -1)].map((k) => logs[k]?.waist).filter(Boolean).at(-1)
  const checks = days.map((k) => dayChecks(logs[k], settings))
  const logged = checks.filter((c) => c.logged).length
  if (!logged) return null
  const inPlan = checks.filter((c) => c.inPlan).length
  const proteinDays = days.map((k) => dayTotals(logs[k]).protein).filter((p) => p > 0)
  const close = () => {
    try { localStorage.setItem(storeKey, 'closed') } catch { /* sin almacenamiento */ }
    setHidden(true)
  }
  const delta = (a, b, unit) => (a != null && b != null ? `${a - b > 0 ? '+' : '−'}${fmt(Math.abs(a - b), 1)} ${unit}` : null)
  const rows = [
    { label: 'Peso medio', value: w ? `${fmt(w, 1)} kg` : '—', note: delta(w, wPrev, 'kg'), good: w != null && wPrev != null && w <= wPrev },
    { label: 'Cintura', value: waist ? `${fmt(waist, 1)} cm` : '—', note: waist !== waistPrev ? delta(waist, waistPrev, 'cm') : null, good: waist != null && waistPrev != null && waist <= waistPrev },
    { label: 'Días dentro del plan', value: `${inPlan} de 7`, note: `${logged} anotados`, good: inPlan >= 4 },
    { label: 'Proteína media', value: proteinDays.length ? `${fmt(avg(proteinDays))} g` : '—', note: `meta ${settings.proteinGoal} g`, good: avg(proteinDays) >= settings.proteinGoal * 0.95 },
  ]
  return (
    <section className="rounded-[14px] bg-ink-900 p-4 shadow-[inset_0_1px_0_rgb(238_237_230/0.05)]" aria-label="Resumen de la semana pasada">
      <div className="flex items-start justify-between gap-3">
        <p className="font-hand text-[26px] leading-none text-zinc-50">La semana pasada</p>
        <Button variant="plain" size="sm" onClick={close}>Cerrar</Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs text-zinc-500">{r.label}</dt>
            <dd className="mt-0.5 text-xl font-bold leading-none">{r.value}</dd>
            {r.note && <dd className={`mt-1 text-xs ${r.good ? 'text-accent' : 'text-zinc-500'}`}>{r.note}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 font-hand text-[21px] leading-snug text-zinc-300">
        {inPlan >= 5 ? 'Semana de pizarra limpia. Así se van los flancos.' : inPlan >= 3 ? 'Buena base. Esta semana, un día más dentro del plan.' : 'Semana floja: no pasa nada, la constancia se arma de nuevo hoy.'}
      </p>
    </section>
  )
}

// Aviso de cocinada: pocos tapers en la heladera (o fin de semana con la heladera floja)
function CookReminder({ recipes, date, goToShop, openCreate }) {
  const left = recipes.filter((r) => !r.frozenAt).reduce((s, r) => s + r.remaining, 0)
  const frozen = recipes.filter((r) => r.frozenAt).reduce((s, r) => s + r.remaining, 0)
  const dow = new Date(`${date}T00:00`).getDay() // 0 domingo, 6 sábado
  const weekend = dow === 0 || dow === 6
  if (!recipes.length || left > (weekend ? 5 : 2)) return null
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-amber-300/40 px-3.5 py-3" aria-label="Aviso de cocinada">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-[21px] leading-none text-amber-300">{left === 0 ? 'Heladera vacía' : 'Se vacía la heladera'}</p>
        <p className="mt-1 text-sm text-zinc-300">
          {left === 0 ? 'No quedan tapers listos.' : `Quedan ${left} ${left === 1 ? 'taper' : 'tapers'}.`}
          {frozen > 0 && ` Tenés ${frozen} en el freezer.`} {weekend ? 'Buen momento para la cocinada de la semana.' : 'Planificá la próxima cocinada.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={goToShop}><Icon name="cart" className="h-3.5 w-3.5" /> Lista de compras</Button>
        <Button size="sm" onClick={() => openCreate('tupper')}>Crear lote</Button>
      </div>
    </section>
  )
}

// Guía de primeros pasos: solo mientras la app está vacía; se puede cerrar
function FirstSteps({ logs, recipes, favorites, goToSettings, openCreate }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('recomp:ui:firstSteps') === 'done' } catch { return false }
  })
  const anyWeight = Object.values(logs).some((d) => d?.weight)
  const anyMeal = Object.values(logs).some((d) => d?.meals?.length)
  const steps = [
    { done: false, label: 'Revisá tu plan', note: 'Edad, altura, peso y nivel de déficit', action: goToSettings, cta: 'Ajustes' },
    { done: recipes.length > 0 || favorites.length > 0, label: 'Armá tu primer taper', note: 'O un desayuno de siempre', action: () => openCreate('tupper'), cta: 'Crear' },
    { done: anyWeight, label: 'Anotá tu peso', note: 'Abajo, en Peso: en ayunas' },
    { done: anyMeal, label: 'Anotá lo que comés', note: 'Un taper, un desayuno guardado o un alimento' },
  ]
  if (hidden || (anyMeal && anyWeight && recipes.length > 0)) return null
  const close = () => {
    try { localStorage.setItem('recomp:ui:firstSteps', 'done') } catch { /* sin almacenamiento */ }
    setHidden(true)
  }
  return (
    <section className="rounded-[14px] bg-ink-900 p-4 shadow-[inset_0_1px_0_rgb(238_237_230/0.05)]" aria-label="Primeros pasos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-hand text-[26px] leading-none text-zinc-50">Primeros pasos</p>
          <p className="mt-1 text-sm text-zinc-400">Cuatro cosas y la pizarra empieza a trabajar para vos.</p>
        </div>
        <Button variant="plain" size="sm" onClick={close}>Cerrar</Button>
      </div>
      <ol className="mt-3 divide-y divide-dashed divide-white/[0.1]">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3 py-2.5">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? 'bg-accent text-ink-950' : 'border border-dashed border-white/30 text-zinc-400'}`}>
              {s.done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] ${s.done ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{s.label}</span>
              <span className="block text-xs text-zinc-500">{s.note}</span>
            </span>
            {s.action && !s.done && <Button variant="ghost" size="sm" onClick={s.action}>{s.cta}</Button>}
          </li>
        ))}
      </ol>
    </section>
  )
}

// Sugerencia para cerrar el día con lo que ya tenés (tapers, plantillas, batido)
function CloseTheDay({ kcalLeft, proteinLeft, available, favorites, byId, prices, variants, onEatTupper, onAdd }) {
  const candidates = [
    ...available.map((r) => {
      const m = recipeMacros(r)
      return { id: `r-${r.id}`, label: r.name, kcal: m.kcal, protein: m.protein, eat: () => onEatTupper(r) }
    }),
    ...favorites.filter((f) => f.kind !== 'tupper').map((f) => {
      const c = computeRows(f.rows, byId, prices, variants)
      const icon = c.filled[0] ? recipeIcon({ name: f.name, ingredients: c.filled.map((x) => ({ name: x.variant.label })) }) : '🍽️'
      return { id: `f-${f.id}`, label: f.name, kcal: Math.round(c.total.kcal), protein: c.total.protein, eat: () => onAdd(mealEntry({ name: f.name, icon, kind: f.kind, total: c.total, priced: c.priced })) }
    }),
    { id: 'whey', label: PRESETS[0].name, kcal: PRESETS[0].kcal, protein: PRESETS[0].protein, eat: () => onAdd(PRESETS[0]) },
  ]
  const s = closeTheDay(candidates, kcalLeft, proteinLeft)
  if (!s) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-accent/40 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-[21px] leading-none text-accent">Para cerrar el día</p>
        <p className="mt-1 text-[15px] text-zinc-100">{s.items.map((i) => i.label).join(' + ')}</p>
        <p className="tabular text-xs text-zinc-500">{fmt(s.kcal)} kcal · <span className="text-sky-300">{fmt(s.protein)} g prot</span> de los {fmt(Math.max(0, proteinLeft))} g que faltan</p>
      </div>
      <Button size="sm" onClick={() => s.items.forEach((i) => i.eat())}>Anotar {s.items.length > 1 ? 'las dos' : ''}</Button>
    </div>
  )
}

// Tapers en la heladera, para comer con un toque
function Fridge({ available, date, eatTupper, goToBatch, className = '' }) {
  return (
    <Card variant="ruled" className={className}>
      <SectionTitle action={<Button variant="plain" size="sm" onClick={goToBatch}>Ver heladera</Button>}>En la heladera</SectionTitle>
      {available.length === 0 ? (
        <button onClick={goToBatch} className="w-full rounded-xl border border-dashed border-white/[0.16] p-4 text-left text-sm text-zinc-400 hover:border-white/30">
          No hay tapers. <span className="text-accent">Cociná un lote</span> y aparecen acá para comerlos con un toque.
        </button>
      ) : (
        <ul className="divide-y divide-dashed divide-white/[0.1]">
          {available.map((r) => {
            const m = recipeMacros(r)
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="text-2xl leading-none">{recipeIcon(r)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{r.name}</p>
                  <p className="tabular text-xs text-zinc-500">{fmt(m.kcal)} kcal · <span className="text-sky-300">{fmt(m.protein, 1)} g prot</span> · quedan {r.remaining}</p>
                </div>
                <Button size="sm" onClick={() => eatTupper(date, r)}>Comer 1</Button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// Renglón fijo de la pizarra: etiqueta a tiza arriba, cifra y meta, barra y acción rápida
function Renglon({ label, value, unit, ratio, marker, tone, done, note, action }) {
  return (
    <div className="flex items-center gap-3 border-b border-dashed border-white/[0.14] py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-hand text-[21px] leading-none text-zinc-400">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="relative inline-block">
            <span key={value} className="rechalk text-[30px] font-bold leading-none tracking-[-0.02em] text-zinc-50">{value}</span>
            {done && <span className="absolute -bottom-2 inset-x-0"><ChalkUnderline className="text-accent" /></span>}
          </span>
          <span className="tabular whitespace-nowrap text-sm text-zinc-500">{unit}</span>
        </p>
        <div className="relative mt-2.5 max-w-sm">
          <ProgressBar value={Math.min(1, ratio)} max={1} tone={done ? 'accent' : tone} size="sm" />
          {marker != null && <span className="absolute -top-0.5 h-2.5 w-0.5 bg-zinc-100/60" style={{ left: `${marker * 100}%` }} />}
        </div>
        <div className={`mt-1.5 text-xs ${done ? 'text-accent' : 'text-zinc-500'}`}>{note}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function MacroMini({ label, value, goal, color }) {
  const left = goal - value
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-hand text-[21px] leading-none text-zinc-300">{label}</span>
        <span className="tabular whitespace-nowrap text-xs text-zinc-500"><b className="text-zinc-200">{fmt(value)}</b> / {fmt(goal)} g</span>
      </div>
      <ProgressBar value={value} max={goal} tone={color} size="sm" />
      <p className={`mt-1.5 text-xs ${left < -goal * 0.1 ? 'text-rose-300' : 'text-zinc-500'}`}>
        {left >= 0 ? `faltan ${fmt(left)} g` : `te pasaste ${fmt(-left)} g`}
      </p>
    </div>
  )
}

// Desayunos y comidas guardados en Crear: se cargan al día con un toque
function QuickMeals({ favorites, byId, prices, variants, onEat, openCreate }) {
  const [done, setDone] = useState(null)
  const sections = [
    { kind: 'breakfast', title: 'Desayunos', empty: 'Guardá tu desayuno habitual en Crear' },
    { kind: 'snack', title: 'Meriendas', empty: 'Guardá tu merienda de siempre en Crear' },
    { kind: 'meal', title: 'Comidas guardadas', empty: 'Guardá una comida libre como plantilla' },
  ]
  const eat = (fav) => {
    const c = computeRows(fav.rows, byId, prices, variants)
    const icon = c.filled[0] ? recipeIcon({ name: fav.name, ingredients: c.filled.map((r) => ({ name: r.variant.label })) }) : '🍽️'
    onEat(mealEntry({ name: fav.name, icon, kind: fav.kind, total: c.total, priced: c.priced }))
    setDone(fav.id)
    setTimeout(() => setDone(null), 1500)
  }

  return (
    <Card variant="ruled">
      <SectionTitle>Cargar con un toque</SectionTitle>
      <p className="-mt-1.5 mb-3 text-xs text-zinc-500">Tus plantillas de desayuno y comida: un toque y se suman al día.</p>
      <div className="space-y-3">
        {sections.map((sec) => {
          const items = favorites.filter((f) => f.kind === sec.kind)
          return (
            <div key={sec.kind}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-hand text-[21px] leading-none text-zinc-300">{sec.title}</p>
                <button className="text-xs text-zinc-400 hover:text-zinc-100" onClick={() => openCreate(sec.kind)}>+ Crear</button>
              </div>
              {items.length === 0 ? (
                <button
                  onClick={() => openCreate(sec.kind)}
                  className="w-full rounded-xl border border-dashed border-white/[0.16] px-3 py-2.5 text-left text-xs text-zinc-400 hover:border-white/30 hover:text-zinc-200"
                >
                  {sec.empty} →
                </button>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {items.map((fav) => {
                    const c = computeRows(fav.rows, byId, prices, variants)
                    return (
                      <button
                        key={fav.id} onClick={() => eat(fav)}
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                          done === fav.id ? 'border-accent/70 bg-accent/10' : 'border-dashed border-white/[0.18] hover:border-accent/50'
                        }`}
                      >
                        <span className="block text-sm">{done === fav.id ? '✓ Sumado' : fav.name}</span>
                        <span className="tabular block text-[11px] text-zinc-500">
                          {fmt(c.total.kcal)} kcal · <span className="text-sky-300">{fmt(c.total.protein)} g prot</span>
                          {c.priced > 0 && <> · {money(c.total.cost)}</>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Entrenamientos del día + kcal activas opcionales del reloj
function ActivityCard({ day, weight, burn, onChange }) {
  const [type, setType] = useState('strength')
  const [minutes, setMinutes] = useState('60')
  const sessions = day.training ?? []
  const toast = useToast()
  const removeSession = (s) => {
    onChange({ training: sessions.filter((x) => x.id !== s.id) })
    toast(`Quitaste ${trainingType(s.type).label} · ${s.minutes} min`, () => onChange({ training: [...sessions] }))
  }

  const add = (t, m) => {
    if (!m) return
    onChange({ training: [...sessions, { id: uid(), type: t, minutes: m }] })
  }

  return (
    <Card variant="ruled">
      <SectionTitle action={<span className="text-xs text-zinc-500">{burn.manual != null ? 'según tu reloj' : 'estimación'}</span>}>Actividad</SectionTitle>
      <p className="flex items-baseline gap-2">
        <ChalkNumber value={fmt(burn.active)} className="text-5xl font-bold leading-none text-orange-300" />
        <span className="font-hand text-[26px] text-zinc-400">kcal quemadas</span>
      </p>
      <p className="tabular mt-1.5 text-xs text-zinc-500">pasos {fmt(burn.steps)} kcal · entrenamiento {fmt(burn.training)} kcal</p>

      {sessions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {sessions.map((s) => {
            const t = trainingType(s.type)
            return (
              <li key={s.id} className="flex items-center gap-2 border-b border-dashed border-white/[0.1] py-1.5 text-sm last:border-b-0">
                <span className="text-base leading-none">{t.icon}</span>
                <span className="flex-1">{t.label} · {s.minutes} min</span>
                <span className="tabular text-xs text-orange-300">{fmt(trainingKcal(s, weight))} kcal</span>
                <button onClick={(e) => erase(e.currentTarget.closest('li'), () => removeSession(s))} className="grid h-8 w-8 place-items-center text-zinc-500 hover:text-zinc-100" aria-label={`Quitar ${t.label}`}>
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[['strength', 45], ['strength', 60], ['strength', 75], ['cardio', 30]].map(([t, m]) => (
          <Button key={`${t}${m}`} variant="ghost" size="sm" onClick={() => add(t, m)}>
            {trainingType(t).label.split(' ')[0]} {m}′
          </Button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(type, Math.round(num(minutes) ?? 0)) }}>
        <select
          value={type} onChange={(e) => setType(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/[0.18] px-2 text-sm outline-none focus:border-accent/70" aria-label="Tipo de entrenamiento"
        >
          {TRAINING_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <Input className="w-24" type="number" inputMode="numeric" suffix="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minutos" />
        <Button type="submit" variant="ghost" size="icon" className="h-10 w-10" aria-label="Añadir entrenamiento"><Icon name="plus" className="h-4 w-4" /></Button>
      </form>

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer select-none hover:text-zinc-300">¿Tenés reloj o app de actividad?</summary>
        <div className="mt-2 flex items-end gap-2">
          <NumberField
            key={`active-${day.activeKcal}`} value={day.activeKcal} placeholder="kcal activas" suffix="kcal"
            onCommit={(v) => onChange({ activeKcal: v == null ? null : Math.round(v) })} className="flex-1"
          />
          {day.activeKcal != null && <Button variant="plain" size="sm" onClick={() => onChange({ activeKcal: null })}>Usar estimación</Button>}
        </div>
        <p className="mt-1.5">Si lo cargás, reemplaza la estimación por pasos y entrenamiento.</p>
      </details>
    </Card>
  )
}

// Input numérico que guarda al salir del campo o al pulsar Enter
// Cadera, pecho y brazo: opcionales, una vez cada dos semanas alcanza
function MoreMeasures({ logs, date, day, onCommit }) {
  const extra = BODY_MEASURES.filter((m) => m.key !== 'waist')
  const prevOf = (key) => {
    const k = Object.keys(logs).filter((x) => x < date && logs[x]?.[key]).sort().at(-1)
    return k ? logs[k][key] : null
  }
  const any = extra.some((m) => day[m.key])
  return (
    <details className="group mt-4 border-t border-dashed border-white/[0.12] pt-3" open={any || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm text-zinc-300 hover:text-zinc-50">
        <span>Más medidas <span className="text-zinc-500">· cadera, pecho, brazo</span></span>
        <Icon name="right" className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {extra.map((m) => {
          const prev = prevOf(m.key)
          const v = day[m.key]
          return (
            <div key={m.key} className="min-w-0">
              <NumberField
                key={`${m.key}-${date}`} label={m.label} value={v} placeholder={prev ? fmt(prev, 1) : '—'} step="0.5"
                onCommit={(x) => onCommit({ [m.key]: x })} suffix="cm"
              />
              <p className={`mt-1 truncate text-[11px] ${v && prev ? (m.key === 'hips' ? (v <= prev ? 'text-accent' : 'text-amber-300') : 'text-zinc-400') : 'text-zinc-500'}`}>
                {v && prev ? `${v - prev > 0 ? '+' : ''}${fmt(v - prev, 1)} cm` : prev ? `última ${fmt(prev, 1)}` : m.hint.split(',')[0]}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-500">Pecho y brazo que se mantienen mientras baja la cintura = estás perdiendo grasa, no músculo.</p>
    </details>
  )
}

function NumberField({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(value ?? '')
  const commit = () => {
    const v = num(draft)
    if (v !== (value ?? null)) onCommit(v)
  }
  return (
    <Input
      type="number" inputMode="decimal" value={draft}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      {...props}
    />
  )
}

// Buscar un alimento de la base y anotarlo por gramos, sin salir de Hoy
function QuickFood({ foods, byId, prices, variants, logs, date, onAdd }) {
  const [picked, setPicked] = useState(null)
  const [grams, setGrams] = useState('')
  const [state, setState] = useState('raw')
  const g = num(grams) ?? 0
  const c = picked ? computeRows([{ foodId: picked.id, state, grams: g }], byId, prices, variants) : null
  const unit = picked?.liquid ? 'ml' : 'g'

  const pick = (food) => {
    setPicked(food)
    setGrams(String(defaultGrams(food)))
    setState('raw')
  }
  const add = () => {
    if (!picked || g <= 0) return
    const v = foodVariants(picked).find((x) => x.state === state) ?? foodVariants(picked)[0]
    onAdd({ ...mealEntry({ name: `${v.label} · ${fmt(g)} ${unit}`, icon: foodIconOf(picked), kind: 'extra', total: c.total, priced: c.priced }), foodRef: { foodId: picked.id, state, grams: g } })
    setPicked(null)
  }

  return (
    <div className="mb-3">
      <FoodSearch foods={foods} groups={MODES.meal.groups} onPick={pick} placeholder="Buscar en Alimentos y anotar por gramos…" />
      {!picked && <RecentFoods logs={logs} date={date} byId={byId} prices={prices} variants={variants} onAdd={onAdd} />}
      {picked && (
        <div className="drawer-in mt-2 rounded-xl border border-dashed border-white/[0.18] p-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none">{foodIconOf(picked)}</span>
            <p className="min-w-0 flex-1 truncate text-[15px]">{picked.name}</p>
            <Button variant="plain" size="icon" onClick={() => setPicked(null)} aria-label="Cancelar"><Icon name="x" className="h-4 w-4" /></Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input className="w-28" type="number" inputMode="decimal" suffix={unit} value={grams} onChange={(e) => setGrams(e.target.value)} aria-label="Cantidad" />
            {hasStates(picked) && <StatePicker food={picked} value={state} onChange={setState} size="sm" />}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="tabular text-sm text-zinc-400">
              <b className="text-zinc-100">{fmt(c.total.kcal)}</b> kcal · <b className="text-sky-300">{fmt(c.total.protein, 1)}</b> g prot
              {hasStates(picked) && <span className="text-zinc-500"> · {stateLabel(picked, state)}</span>}
            </p>
            <Button size="sm" onClick={add} disabled={g <= 0}><Icon name="plus" className="h-4 w-4" /> Anotar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Alimentos anotados por gramos en los últimos 14 días: se repiten con un toque
function RecentFoods({ logs, date, byId, prices, variants, onAdd }) {
  const recent = []
  const seen = new Set()
  for (let i = 0; i < 14 && recent.length < 6; i++) {
    const meals = logs[addDays(date, -i)]?.meals ?? []
    for (const m of [...meals].reverse()) {
      const ref = m.foodRef
      const key = ref && `${ref.foodId}|${ref.state}|${ref.grams}`
      if (!ref || seen.has(key) || !byId.has(ref.foodId)) continue
      seen.add(key)
      recent.push({ key, ref, name: m.name, icon: m.icon })
      if (recent.length >= 6) break
    }
  }
  if (!recent.length) return null
  const add = (r) => {
    const c = computeRows([r.ref], byId, prices, variants)
    onAdd({ ...mealEntry({ name: r.name, icon: r.icon, kind: 'extra', total: c.total, priced: c.priced }), foodRef: r.ref })
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="font-hand text-[21px] leading-none text-zinc-500">recientes:</span>
      {recent.map((r) => (
        <button
          key={r.key} onClick={() => add(r)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-white/[0.18] py-1 pl-1.5 pr-2.5 text-xs text-zinc-300 transition-colors hover:border-accent/50 hover:text-zinc-100"
        >
          <span className="text-sm leading-none">{r.icon}</span>{r.name}
        </button>
      ))}
    </div>
  )
}

function QuickAdd({ onAdd }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const k = num(kcal) ?? 0
    const p = num(protein) ?? 0
    if (!k && !p) return
    const n = name.trim() || 'Extra'
    onAdd({ name: n, icon: detectIcon(n), kind: 'extra', kcal: k, protein: p })
    setName(''); setKcal(''); setProtein('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name} type="button" onClick={() => onAdd(p)}
            className="flex items-center gap-2 rounded-full border border-dashed border-white/[0.18] py-1.5 pl-2 pr-3 text-xs text-zinc-300 transition-colors hover:border-accent/50 hover:text-zinc-100"
          >
            <span className="text-sm leading-none">{p.icon}</span>
            {p.name}
            {p.protein > 0 && <span className="text-sky-300">{p.protein} g</span>}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
        <Input
          className="col-span-2 sm:col-span-1" prefix={detectIcon(name)}
          placeholder="Algo suelto (ej. un alfajor, un batido…)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Qué comiste"
        />
        <Input type="number" inputMode="numeric" placeholder="kcal" suffix="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
        <Input type="number" inputMode="decimal" placeholder="prot" suffix="g" value={protein} onChange={(e) => setProtein(e.target.value)} />
        <Button type="submit" className="col-span-2 sm:col-span-1"><Icon name="plus" className="h-4 w-4" />Anotar</Button>
      </form>
    </div>
  )
}
