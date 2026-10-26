import { useEffect, useState } from 'react'
import { hasStates, stateLabel } from '../lib/foods'
import { money } from '../lib/prices'
import TargetBar from './TargetBar'
import { Button, ChalkNumber, Icon, fmt } from './ui'

/**
 * Ficha completa de un desayuno, merienda, comida o taper: pantalla limpia para analizarlo.
 * data: { name, icon, rows (con food, variant, g, n, cost), filled, total, priced, advice }
 */
export default function MealSheet({ data, mode, target, settings, portions, onRename, onClose, actions, iconOf }) {
  const [name, setName] = useState(data.name)
  useEffect(() => setName(data.name), [data.name])

  // Escape cierra; el fondo no se desplaza mientras la ficha está abierta
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const commitName = () => {
    const n = name.trim()
    if (n && n !== data.name) onRename(n)
    else setName(data.name)
  }

  const { total, filled, priced, advice } = data
  const kcalMacros = { protein: total.protein * 4, carbs: total.carbs * 4, fat: total.fat * 9 }
  const macroSum = kcalMacros.protein + kcalMacros.carbs + kcalMacros.fat
  const pctOf = (v) => (macroSum ? Math.round((v / macroSum) * 100) : 0)
  const word = mode.portionWord
  const missing = filled.filter((r) => r.cost == null).map((r) => r.food.name)
  const unitOf = (food) => (food.liquid ? 'ml' : 'g')

  return (
    <div className="drawer-in fixed inset-0 z-50 overflow-y-auto bg-ink-950" role="dialog" aria-modal="true" aria-label={`Ficha de ${data.name}`}>
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}><Icon name="left" className="h-4 w-4" /> Volver</Button>
          <span className="font-hand text-[21px] leading-none text-zinc-400">{mode.tab}</span>
        </div>

        {/* Nombre editable */}
        <div className="mt-6 flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/[0.05] text-3xl leading-none">{data.icon}</span>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="sr-only">Nombre</span>
              {/* Crece en alto con el texto (nombres largos se leen completos en el celular) */}
              <textarea
                value={name} rows={1} onChange={(e) => setName(e.target.value.replace(/\n/g, ''))} onBlur={commitName}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } if (e.key === 'Escape') { setName(data.name); e.currentTarget.blur() } }}
                style={{ fieldSizing: 'content' }}
                className="block w-full resize-none border-b border-dashed border-white/20 bg-transparent pb-1 font-hand text-[40px] font-bold leading-[1.05] text-zinc-50 outline-none focus:border-accent"
                aria-label="Nombre"
              />
            </label>
            <p className="mt-1.5 text-xs text-zinc-500">Tocá el nombre para cambiarlo · {filled.length} ingredientes{mode.batch && portions ? ` · lote de ${portions} tapers` : ''}</p>
          </div>
        </div>

        {/* Totales */}
        <section className="mt-7" aria-label="Totales">
          <p className="flex items-baseline gap-2">
            <ChalkNumber value={fmt(total.kcal)} className="text-[84px] font-bold leading-[0.82] text-zinc-50" />
            <span className="font-hand text-[26px] text-zinc-400">kcal por {word}</span>
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm">
            {priced > 0 ? (
              <>
                <b className="tabular text-2xl text-zinc-50">{money(total.cost)}</b>
                <span className="text-zinc-400">por {word}{missing.length ? ' (sin contar lo que no tiene precio)' : ''}</span>
                {mode.batch && portions > 1 && <span className="tabular text-zinc-500">· lote de {portions}: {money(total.cost * portions)}</span>}
              </>
            ) : (
              <span className="text-zinc-500">Sin precio: cargalo en Alimentos para ver cuánto cuesta.</span>
            )}
          </p>
          <dl className="mt-5 grid grid-cols-4 gap-3">
            {[
              ['Proteína', total.protein, 'text-sky-300'],
              ['Carbos', total.carbs, 'text-amber-300'],
              ['Grasas', total.fat, 'text-pink-300'],
              ['Fibra', total.fiber, 'text-lime-200'],
            ].map(([label, v, tone]) => (
              <div key={label}>
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className={`mt-0.5 text-[30px] font-bold leading-none ${tone}`}>{fmt(v, v < 10 ? 1 : 0)}<span className="text-sm font-normal text-zinc-500"> g</span></dd>
              </div>
            ))}
          </dl>

          {macroSum > 0 && (
            <div className="mt-5">
              <p className="mb-1.5 text-xs text-zinc-500">De dónde vienen las calorías</p>
              <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
                <div className="bg-data-protein" style={{ width: `${pctOf(kcalMacros.protein)}%` }} />
                <div className="bg-data-carbs" style={{ width: `${pctOf(kcalMacros.carbs)}%` }} />
                <div className="bg-data-fat" style={{ width: `${pctOf(kcalMacros.fat)}%` }} />
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-protein" />Proteína {pctOf(kcalMacros.protein)}%</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-carbs" />Carbohidratos {pctOf(kcalMacros.carbs)}%</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-data-fat" />Grasas {pctOf(kcalMacros.fat)}%</li>
              </ul>
            </div>
          )}
        </section>

        {/* Frente al plan */}
        <section className="mt-8 border-t border-dashed border-white/[0.18] pt-5">
          <h2 className="font-hand text-[26px] font-semibold leading-none text-zinc-100">Frente a tu plan</h2>
          <p className="mt-1 text-xs text-zinc-500">Lo ideal para {mode.g.un} {word} es cerca del {Math.round(mode.share * 100)}% de tu día.</p>
          <div className="mt-3 space-y-2.5">
            <TargetBar label="Calorías" value={total.kcal} target={target.kcal} unit="kcal" />
            <TargetBar label="Proteína" value={total.protein} target={target.protein} unit="g" />
            {target.carbs > 0 && <TargetBar label="Carbohidratos" value={total.carbs} target={target.carbs} unit="g" soft />}
            {target.fat > 0 && <TargetBar label="Grasas" value={total.fat} target={target.fat} unit="g" soft />}
          </div>
          <p className="tabular mt-3 text-sm text-zinc-300">
            Cubre el <b>{fmt((total.kcal / settings.calorieGoal) * 100)}%</b> de tus calorías y el <b className="text-sky-300">{fmt((total.protein / settings.proteinGoal) * 100)}%</b> de tu proteína del día.
            {total.protein > 0 && <span className="text-zinc-500"> · {fmt(total.kcal / total.protein, 1)} kcal por g de proteína</span>}
          </p>
          {advice && <p className={`mt-2 text-sm ${advice.ok ? 'text-accent' : 'text-amber-200'}`}>{advice.ok ? '✓ ' : '💡 '}{advice.text}</p>}
        </section>

        {/* Ingredientes */}
        <section className="mt-8 border-t border-dashed border-white/[0.18] pt-5">
          <h2 className="font-hand text-[26px] font-semibold leading-none text-zinc-100">Ingredientes</h2>
          <ul className="mt-3 divide-y divide-dashed divide-white/[0.1]">
            {filled.map((r) => (
              <li key={r.id ?? r.foodId + r.state} className="flex items-start gap-3 py-3">
                <span className="text-xl leading-none">{iconOf(r.food)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-zinc-100">
                    {r.food.name}
                    {hasStates(r.food) && <span className="text-zinc-500"> · {stateLabel(r.food, r.state)}</span>}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-zinc-500">
                    <b className="text-zinc-200">{fmt(r.g)} {unitOf(r.food)}</b>
                    {' · '}{fmt(r.n.kcal)} kcal · <span className="text-sky-300">{fmt(r.n.protein, 1)} g prot</span> · {fmt(r.n.carbs, 1)} g carb · {fmt(r.n.fat, 1)} g grasa
                  </p>
                </div>
                <span className="tabular shrink-0 text-right text-sm">
                  {r.cost != null ? (
                    <>
                      <span className="block text-zinc-100">{money(r.cost)}</span>
                      <span className="block text-[11px] text-zinc-500">{money((r.cost / r.g) * 1000)}/{r.food.liquid ? 'L' : 'kg'}</span>
                    </>
                  ) : (
                    <span className="block text-xs text-amber-300/80">sin precio</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="tabular mt-2 flex items-baseline justify-between border-t border-white/[0.14] pt-3 text-sm">
            <span className="font-hand text-[21px] text-zinc-300">Total</span>
            <span className="text-zinc-300">
              {fmt(total.grams)} g · <b className="text-zinc-50">{fmt(total.kcal)} kcal</b> · <b className="text-sky-300">{fmt(total.protein, 1)} g prot</b>
              {priced > 0 && <> · <b className="text-zinc-50">{money(total.cost)}</b></>}
            </span>
          </div>
        </section>

        {/* Costo */}
        <section className="mt-8 border-t border-dashed border-white/[0.18] pt-5">
          <h2 className="font-hand text-[26px] font-semibold leading-none text-zinc-100">Cuánto cuesta</h2>
          {priced > 0 ? (
            <dl className="mt-3 divide-y divide-dashed divide-white/[0.1] text-sm">
              {[
                [`Por ${word}`, total.cost, true],
                ...(mode.batch && portions > 1 ? [[`Lote de ${portions} tapers`, total.cost * portions]] : []),
                [`Si lo comés todos los días · semana`, total.cost * 7],
                [`Si lo comés todos los días · mes`, total.cost * 30],
                ...(total.protein > 0 ? [['Cada 10 g de proteína', (total.cost / total.protein) * 10]] : []),
                ...(total.kcal > 0 ? [['Cada 100 kcal', (total.cost / total.kcal) * 100]] : []),
              ].map(([label, value, big]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-zinc-400">{label}</dt>
                  <dd className={`tabular ${big ? 'text-2xl font-bold text-zinc-50' : 'text-zinc-200'}`}>{money(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Ningún ingrediente tiene precio todavía.</p>
          )}
          {missing.length > 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-amber-300/40 px-3 py-2.5 text-xs text-amber-200">
              Sin precio: {missing.join(', ')}. Ponéselo en Alimentos (ficha del alimento → Precio) y el costo se completa solo.
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">Precios de Alimentos o los tuyos de Gastos, en pesos uruguayos.</p>
        </section>
      </div>

      {/* Acciones fijas abajo */}
      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.08] bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap gap-2 px-4 py-3 sm:px-6">
          {actions.map((a) => (
            <Button key={a.label} variant={a.variant ?? 'ghost'} size="sm" className={a.primary ? 'h-10 flex-1 text-[15px]' : ''} onClick={a.onClick}>
              {a.icon && <Icon name={a.icon} className="h-4 w-4" />} {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
