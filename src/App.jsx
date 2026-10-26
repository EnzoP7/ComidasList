import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { usePersistentState } from './lib/storage'
import { todayKey } from './lib/date'
import { DEFAULT_SETTINGS, computePlan, emptyDay, planWeight, recipeMacros, uid } from './lib/model'
import { recipeIcon } from './lib/icons'
import { recipeCost } from './lib/prices'
import { buildCatalog, catalogVariants } from './lib/foods'
import { FoodsContext } from './lib/foodsContext'
import { takeDailySnapshot } from './lib/snapshots'
import { useToast } from './components/Toast'
import { ChalkUnderline, Icon } from './components/ui'
import Dashboard from './components/Dashboard'
import BatchCooking from './components/BatchCooking'
const Stats = lazy(() => import('./components/Stats'))
const Settings = lazy(() => import('./components/Settings'))
const Spending = lazy(() => import('./components/Spending'))
import Create from './components/Create'
import { blankDraft, blankRow } from './components/MealBuilder'
const Foods = lazy(() => import('./components/Foods'))
import Water from './components/Water'
const ShoppingList = lazy(() => import('./components/ShoppingList'))
const Templates = lazy(() => import('./components/Templates'))

const TABS = [
  { id: 'today', label: 'Hoy', icon: 'today' },
  { id: 'build', label: 'Crear', icon: 'bowl' },
  { id: 'templates', label: 'Plantillas', icon: 'list' },
  { id: 'batch', label: 'Mi heladera', short: 'Heladera', icon: 'box' },
  { id: 'water', label: 'Agua', icon: 'drop' },
  { id: 'foods', label: 'Alimentos', icon: 'apple' },
  { id: 'shop', label: 'Compras', icon: 'cart' },
  { id: 'stats', label: 'Progreso', icon: 'chart' },
  { id: 'prices', label: 'Gastos', icon: 'wallet' },
  { id: 'settings', label: 'Ajustes', icon: 'gear' },
]
// En móvil: Hoy, Heladera, [Crear], Agua en el listón; el resto va en "Más"
const MOBILE_MAIN = ['today', 'build', 'batch', 'water']

export default function App() {
  const [tab, setTab] = usePersistentState('ui:tab', 'today')
  const [settingsRaw, setSettings] = usePersistentState('settings', DEFAULT_SETTINGS)
  const [logs, setLogs] = usePersistentState('logs', {})
  const [recipes, setRecipes] = usePersistentState('recipes', [])
  const [prices, setPrices] = usePersistentState('prices', [])
  const [expenses, setExpenses] = usePersistentState('expenses', [])
  const [foodState, setFoodState] = usePersistentState('foods', { custom: [], edits: {} })
  const [builderDraft, setBuilderDraft] = usePersistentState('ui:builder', blankDraft())
  const [breakfastDraft, setBreakfastDraft] = usePersistentState('ui:builder:breakfast', blankDraft())
  const [snackDraft, setSnackDraft] = usePersistentState('ui:builder:snack', blankDraft())
  const [mealDraft, setMealDraft] = usePersistentState('ui:builder:meal', blankDraft())
  const [createMode, setCreateMode] = usePersistentState('ui:createMode', 'tupper')
  const [favorites, setFavorites] = usePersistentState('favorites', [])
  const [shopping, setShopping] = usePersistentState('shopping', { plan: {}, checked: {}, extras: [] })
  const [date, setDate] = useState(todayKey)
  const [moreOpen, setMoreOpen] = useState(false)
  const toast = useToast()

  // Copia de seguridad automática del día (se guardan las últimas 7)
  useEffect(() => { takeDailySnapshot(todayKey()) }, [])

  // Las metas de calorías y macros salen del plan calculado en Ajustes
  const baseSettings = { ...DEFAULT_SETTINGS, ...settingsRaw }
  const plan = computePlan(baseSettings, planWeight(baseSettings, logs, todayKey()))
  const settings = {
    ...baseSettings,
    calorieGoal: plan.calorieGoal,
    proteinGoal: plan.macros.protein,
    fatGoal: plan.macros.fat,
    carbsGoal: plan.macros.carbs,
  }
  const foodsValue = useMemo(() => {
    const foods = buildCatalog(foodState)
    return { foods, variants: catalogVariants(foods) }
  }, [foodState])

  const go = (id) => { setTab(id); setMoreOpen(false); window.scrollTo({ top: 0 }) }

  const updateDay = useCallback(
    (key, patch) =>
      setLogs((prev) => {
        const day = { ...emptyDay(), ...prev[key] }
        return { ...prev, [key]: { ...day, ...(typeof patch === 'function' ? patch(day) : patch) } }
      }),
    [setLogs],
  )

  const addMeal = (key, meal) =>
    updateDay(key, (day) => ({ meals: [...day.meals, { id: uid(), at: Date.now(), ...meal }] }))

  const bumpRecipe = (id, delta) =>
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, remaining: Math.max(0, Math.min(r.portions, r.remaining + delta)) } : r)))

  const removeMeal = (key, mealId) => {
    const meals = logs[key]?.meals ?? []
    const index = meals.findIndex((m) => m.id === mealId)
    const meal = meals[index]
    if (!meal) return
    updateDay(key, (day) => ({ meals: day.meals.filter((m) => m.id !== mealId) }))
    // Devuelve el tupper a la heladera si la receta sigue existiendo
    if (meal.recipeId) bumpRecipe(meal.recipeId, 1)
    toast(`Borraste ${meal.name}`, () => {
      updateDay(key, (day) => {
        const next = [...day.meals]
        next.splice(Math.min(index, next.length), 0, meal)
        return { meals: next }
      })
      if (meal.recipeId) bumpRecipe(meal.recipeId, -1)
    })
  }

  // Escala una comida ya anotada (½, 1½, 2…) partiendo de sus valores base
  const scaleMeal = (key, mealId, factor) =>
    updateDay(key, (day) => ({
      meals: day.meals.map((m) => {
        if (m.id !== mealId) return m
        const prev = m.factor ?? 1
        const base = m.base ?? { kcal: m.kcal / prev, protein: m.protein / prev, fat: (m.fat ?? 0) / prev, carbs: (m.carbs ?? 0) / prev, cost: m.cost != null ? m.cost / prev : null }
        const r1 = (n) => Math.round(n * 10) / 10
        return {
          ...m, base, factor,
          kcal: Math.round(base.kcal * factor), protein: r1(base.protein * factor), fat: r1(base.fat * factor), carbs: r1(base.carbs * factor),
          cost: base.cost != null ? base.cost * factor : null,
        }
      }),
    }))

  // Copia las comidas de otro día; los tapers se comen de la heladera si quedan
  const repeatMeals = (fromKey, toKey) => {
    const source = logs[fromKey]?.meals ?? []
    if (!source.length) return
    const prevDay = logs[toKey]
    const prevRecipes = recipes
    const left = new Map(recipes.map((r) => [r.id, r.remaining]))
    const copies = source.map((m) => {
      const { id, at, base, factor, ...rest } = m
      const copy = { ...rest, ...(base && { base, factor }), id: uid(), at: Date.now() }
      if (m.recipeId && left.get(m.recipeId) > 0) {
        left.set(m.recipeId, left.get(m.recipeId) - 1)
        return copy
      }
      const { recipeId, ...plain } = copy
      return plain
    })
    updateDay(toKey, (day) => ({ meals: [...day.meals, ...copies] }))
    setRecipes((prev) => prev.map((r) => (left.has(r.id) ? { ...r, remaining: left.get(r.id) } : r)))
    toast(`Copiaste ${copies.length} ${copies.length === 1 ? 'comida' : 'comidas'} de ayer`, () => {
      setLogs((prev) => {
        const next = { ...prev }
        if (prevDay) next[toKey] = prevDay
        else delete next[toKey]
        return next
      })
      setRecipes(prevRecipes)
    })
  }

  const eatTupper = (key, recipe) => {
    const { kcal, protein, fat, carbs } = recipeMacros(recipe)
    const cost = recipeCost(recipe, prices, foodsValue.variants)?.perPortion ?? null
    addMeal(key, { recipeId: recipe.id, kind: 'tupper', name: recipe.name, icon: recipeIcon(recipe), kcal, protein, fat, carbs, cost })
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, remaining: Math.max(0, r.remaining - 1) } : r)))
  }

  // Guarda un lote desde Crear taper: nuevo, o actualiza el que se estaba editando
  const saveRecipe = (data, editingId) => {
    if (!editingId) {
      setRecipes((prev) => [{ ...data, id: uid(), remaining: data.portions, cookedAt: Date.now() }, ...prev])
      return
    }
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== editingId) return r
        const remaining = Math.max(0, Math.min(data.portions, r.remaining + data.portions - r.portions))
        return { ...r, ...data, remaining }
      }),
    )
  }

  // Abre un lote guardado en Crear taper para editarlo (cantidades por taper)
  const editRecipe = (recipe) => {
    const rows = recipe.rows
      ? recipe.rows.map((r) => ({ ...blankRow(), ...r, grams: String(r.grams) }))
      : (recipe.ingredients ?? []).map((i) => ({ ...blankRow(), name: i.name, grams: String(Math.round(i.grams / recipe.portions)) }))
    setBuilderDraft({ name: recipe.name, portions: recipe.portions, editingId: recipe.id, rows })
    openCreate('tupper')
  }

  const openCreate = (mode) => { setCreateMode(mode); go('build') }

  // Abre una plantilla guardada en su modo de Crear para ajustarla

  const newBatch = () => {
    if (builderDraft.editingId) setBuilderDraft(blankDraft())
    openCreate('tupper')
  }

  // Plantillas de Crear (tapers, desayunos y comidas)
  const saveFavorite = (data, editingId) =>
    setFavorites((prev) => (editingId
      ? prev.map((f) => (f.id === editingId ? { ...f, ...data } : f))
      : [{ id: uid(), ...data, createdAt: Date.now() }, ...prev]))
  const removeFavorite = (id) => setFavorites((prev) => prev.filter((f) => f.id !== id))

  const openInCreate = (fav) => {
    setDrafts[fav.kind]?.({
      ...blankDraft(), name: fav.name, portions: fav.portions ?? 5, templateId: fav.id,
      rows: fav.rows.map((r) => ({ ...blankRow(), ...r, grams: String(r.grams) })),
    })
    openCreate(fav.kind)
  }

  const drafts = { tupper: builderDraft, breakfast: breakfastDraft, snack: snackDraft, meal: mealDraft }
  const setDrafts = { tupper: setBuilderDraft, breakfast: setBreakfastDraft, snack: setSnackDraft, meal: setMealDraft }

  // Desde Alimentos: suma un ingrediente a lo que se está creando ({ foodId, state, grams })
  const addToBuilder = (row) =>
    setDrafts[createMode]((prev) => {
      const rows = (prev.rows ?? []).filter((r) => r.foodId)
      const same = rows.find((r) => r.foodId === row.foodId && r.state === row.state)
      return {
        ...prev,
        rows: same
          ? rows.map((r) => (r === same ? { ...r, grams: String((Number(r.grams) || 0) + Number(row.grams)) } : r))
          : [...rows, { ...blankRow(), ...row }],
      }
    })

  const shared = { settings, plan, logs, recipes, prices, date }
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <FoodsContext.Provider value={foodsValue}>
      <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-32 pt-5 sm:px-6 sm:pb-14 sm:pt-6">
        <header className="mb-6 space-y-5">
          <div className="flex items-end justify-between gap-4">
            <button className="text-left" onClick={() => go('today')}>
              <p className="font-hand text-[30px] font-bold leading-none text-zinc-50">Recomp 2027</p>
              <p className="mt-0.5 text-xs text-zinc-500">Adiós flotadores, un día a la vez</p>
            </button>
          </div>

          {/* Listón de madera: navegación en escritorio */}
          <nav className="wood-ledge hidden items-stretch gap-0.5 overflow-x-auto rounded-[4px] p-1 sm:flex" aria-label="Secciones">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`relative flex shrink-0 flex-col items-center justify-center whitespace-nowrap rounded-lg px-2 pb-2 pt-1.5 text-sm transition-colors md:flex-1 ${
                  tab === t.id ? 'bg-black/25 text-zinc-50' : 'text-[#e9d9c4]/75 hover:text-zinc-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon name={t.icon} className="h-4 w-4" />
                  <span className="hidden md:inline lg:hidden">{t.short ?? t.label}</span>
                  <span className="hidden lg:inline">{t.label}</span>
                </span>
                {tab === t.id && <span className="absolute inset-x-3 bottom-0.5"><ChalkUnderline className="text-zinc-100" /></span>}
              </button>
            ))}
          </nav>
        </header>

        <main>
          <Suspense fallback={<p className="py-16 text-center font-hand text-[26px] text-zinc-500">Borrando la pizarra…</p>}>
          {tab === 'today' && (
            <Dashboard
              {...shared}
              setDate={setDate}
              updateDay={updateDay}
              addMeal={addMeal}
              removeMeal={removeMeal}
              scaleMeal={scaleMeal}
              repeatMeals={repeatMeals}
              eatTupper={eatTupper}
              favorites={favorites}
              goToBatch={() => go('batch')}
              goToWater={() => go('water')}
              goToSettings={() => go('settings')}
              goToShop={() => go('shop')}
              openCreate={openCreate}
            />
          )}
          {tab === 'templates' && (
            <Templates
              favorites={favorites} settings={settings} prices={prices} date={todayKey()}
              addMeal={addMeal} saveRecipe={saveRecipe} saveFavorite={saveFavorite} removeFavorite={removeFavorite}
              openInCreate={openInCreate} openCreate={openCreate}
            />
          )}
          {tab === 'build' && (
            <Create
              {...shared}
              mode={createMode}
              setMode={setCreateMode}
              drafts={drafts}
              setDrafts={setDrafts}
              favorites={favorites}
              saveFavorite={saveFavorite}
              removeFavorite={removeFavorite}
              addMeal={addMeal}
              saveRecipe={saveRecipe}
              goToBatch={() => go('batch')}
              goToToday={() => { setDate(todayKey()); go('today') }}
              goToFoods={() => go('foods')}
              goToTemplates={() => go('templates')}
            />
          )}
          {tab === 'batch' && (
            <BatchCooking {...shared} setRecipes={setRecipes} eatTupper={eatTupper} editRecipe={editRecipe} newBatch={newBatch} goToShop={() => go('shop')} />
          )}
          {tab === 'water' && <Water {...shared} setDate={setDate} updateDay={updateDay} />}
          {tab === 'foods' && (
            <Foods
              date={date}
              addMeal={addMeal}
              addToBuilder={addToBuilder}
              createLabel={{ tupper: 'taper', breakfast: 'desayuno', snack: 'merienda', meal: 'comida' }[createMode]}
              foodState={foodState}
              setFoodState={setFoodState}
              goToBuilder={() => go('build')}
            />
          )}
          {tab === 'shop' && (
            <ShoppingList favorites={favorites} prices={prices} shopping={shopping} setShopping={setShopping} setExpenses={setExpenses} />
          )}
          {tab === 'stats' && (
            <Stats {...shared} setSettings={setSettings} />
          )}
          {tab === 'prices' && (
            <Spending {...shared} setPrices={setPrices} expenses={expenses} setExpenses={setExpenses} setSettings={setSettings} />
          )}
          {tab === 'settings' && <Settings settings={baseSettings} plan={plan} logs={logs} setSettings={setSettings} />}
          </Suspense>
        </main>

        {/* Menú "Más" en móvil: panel que sube desde el listón */}
        <div className="scrim fixed inset-0 z-20 bg-black/60 sm:hidden" data-open={moreOpen} onClick={() => setMoreOpen(false)} />
        <div
          className="sheet fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 rounded-2xl bg-ink-850 p-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] sm:hidden"
          data-open={moreOpen} aria-hidden={!moreOpen}
        >
          <p className="px-2 pb-1 pt-1 font-hand text-[21px] text-zinc-400">Más secciones</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TABS.filter((t) => !MOBILE_MAIN.includes(t.id)).map((t) => (
              <button
                key={t.id} onClick={() => go(t.id)} tabIndex={moreOpen ? 0 : -1}
                className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] transition-colors ${
                  tab === t.id ? 'bg-white/[0.08] text-zinc-50' : 'text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <Icon name={t.icon} className="h-5 w-5 text-zinc-400" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listón de madera: navegación inferior en móvil, con Crear destacado */}
        <nav className="wood-ledge fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Secciones">
          <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1.5">
            {[...TABS.filter((t) => MOBILE_MAIN.includes(t.id) && t.id !== 'build').slice(0, 2), null, ...TABS.filter((t) => MOBILE_MAIN.includes(t.id) && t.id !== 'build').slice(2)].map((t, i) => {
              if (!t) {
                // Crear: la tiza verde apoyada en el centro del listón
                const active = tab === 'build' && !moreOpen
                return (
                  <button key="build" onClick={() => go('build')} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-1 pb-2">
                    <span className={`-mt-5 grid h-12 w-12 place-items-center rounded-2xl text-ink-950 shadow-[0_6px_16px_-6px_rgb(0_0_0/0.7)] transition-transform active:scale-95 ${active ? 'bg-lime-200' : 'bg-accent'}`}>
                      <Icon name="plus" className="h-6 w-6" strokeWidth={2.4} />
                    </span>
                    <span className={`text-[11px] ${active ? 'text-zinc-50' : 'text-[#e9d9c4]/80'}`}>Crear</span>
                  </button>
                )
              }
              const active = tab === t.id && !moreOpen
              return (
                <button
                  key={t.id + i}
                  onClick={() => go(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center gap-1 pb-2 pt-1.5 text-[11px] transition-colors ${active ? 'text-zinc-50' : 'text-[#e9d9c4]/75'}`}
                >
                  <Icon name={t.icon} className="h-5 w-5" />
                  {t.short ?? t.label}
                  {active && <span className="absolute inset-x-4 bottom-0.5"><ChalkUnderline className="text-zinc-100" /></span>}
                </button>
              )
            })}
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className={`relative flex flex-col items-center gap-1 pb-2 pt-1.5 text-[11px] transition-colors ${
                moreOpen || !MOBILE_MAIN.includes(tab) ? 'text-zinc-50' : 'text-[#e9d9c4]/75'
              }`}
            >
              <Icon name={moreOpen ? 'x' : 'more'} className="h-5 w-5" />
              {MOBILE_MAIN.includes(tab) || moreOpen ? 'Más' : current.label}
              {!MOBILE_MAIN.includes(tab) && !moreOpen && <span className="absolute inset-x-4 bottom-0.5"><ChalkUnderline className="text-zinc-100" /></span>}
            </button>
          </div>
        </nav>
      </div>
    </FoodsContext.Provider>
  )
}
