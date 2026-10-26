import { useMemo, useRef, useState } from 'react'
import { categoryOf, findVariant, hasStates, nutrientsFor, stateLabel } from '../lib/foods'
import { useFoods } from '../lib/foodsContext'
import { DEFAULT_ICON, detectIcon, recipeIcon } from '../lib/icons'
import { computeRows, mealEntry } from '../lib/meals'
import { uid } from '../lib/model'
import { money } from '../lib/prices'
import StatePicker from './StatePicker'
import MealSheet from './MealSheet'
import TargetBar from './TargetBar'
import { Button, Card, Icon, Input, fmt, num } from './ui'

// Fila: referencia a un alimento de la base + estado (crudo, cocido, frito…) + gramos de UNA porción
export const blankRow = () => ({ id: uid(), foodId: null, state: 'raw', grams: '' })
export const blankDraft = () => ({ name: '', rows: [], portions: 5, editingId: null, templateId: null })

// ── Configuración de cada modo ───────────────────────────────────────────────
const MAIN_GROUPS = [
  { id: 'protein', label: 'Proteína', icon: '🍗', cats: ['meat', 'fish', 'dairy', 'supplements'], hint: 'La base · 130–180 g en crudo',
    suggest: ['pollo-pechuga', 'bola-lomo', 'cuadrada', 'carne-picada', 'cerdo-lomo', 'merluza', 'atun', 'huevo'] },
  { id: 'carbs', label: 'Carbohidrato', icon: '🍚', cats: ['carbs', 'legumes'], hint: 'Energía para entrenar · 60–90 g de arroz/fideos crudos o 150–250 g de papa/boniato',
    suggest: ['arroz-blanco', 'arroz-integral', 'boniato', 'papa', 'fideos', 'lentejas', 'garbanzos', 'quinoa'] },
  { id: 'veg', label: 'Verduras', icon: '🥦', cats: ['veg', 'fruit'], hint: 'Volumen y fibra · 100–200 g',
    suggest: ['brocoli', 'zapallito', 'zanahoria', 'morron', 'cebolla', 'chauchas', 'espinaca', 'lechuga'] },
  { id: 'extras', label: 'Extras', icon: '🥑', cats: ['fats', 'seeds', 'pantry'], hint: 'Con medida · aceite 5–10 g, palta, queso, semillas',
    suggest: ['aceite-oliva', 'palta', 'queso-rallado', 'pulpa-tomate', 'sesamo', 'girasol-semillas'] },
]

const BREAKFAST_GROUPS = [
  { id: 'protein', label: 'Proteína', icon: '🥚', cats: ['meat', 'fish', 'dairy', 'supplements'], hint: 'Arrancá el día con 30–40 g de proteína',
    suggest: ['huevo', 'clara', 'whey', 'yogur-desc', 'ricota', 'queso-magro', 'leche-desc'] },
  { id: 'carbs', label: 'Carbohidrato', icon: '🥣', cats: ['carbs', 'legumes'], hint: 'Avena 40–80 g, 2 rebanadas de pan o galletas',
    suggest: ['avena', 'pan-integral', 'galletas-arroz', 'boniato'] },
  { id: 'fruit', label: 'Fruta y verdura', icon: '🍌', cats: ['fruit', 'veg'], hint: '1 fruta o un poco de verdura',
    suggest: ['banana', 'manzana', 'naranja', 'mandarina', 'tomate', 'espinaca'] },
  { id: 'extras', label: 'Extras', icon: '🥜', cats: ['fats', 'seeds', 'pantry'], hint: 'Con medida · 1 cda de chía o pasta de maní, un puñado de frutos secos',
    suggest: ['chia', 'lino', 'pasta-mani', 'almendras', 'nueces', 'cacao', 'miel', 'granola'] },
  { id: 'drink', label: 'Bebida', icon: '☕', cats: ['drinks'], hint: 'Café, mate, té o jugo · contá también lo que tomás',
    suggest: ['cafe-manzanares', 'cafe-con-leche', 'cortado', 'mate', 'te', 'jugo-naranja'] },
]

// Comida libre: comida hecha o de afuera + los mismos grupos del taper + bebida
const MEAL_GROUPS = [
  { id: 'typical', label: 'Comida hecha o de afuera', icon: '🥪', cats: ['typical'], hint: 'Chivito, pizza, empanadas, asado: elegí la porción',
    suggest: ['chivito-pan', 'chivito-plato', 'milanesa-napolitana', 'pizza-muzzarella', 'faina', 'empanada-carne', 'asado-tira', 'vacio', 'chorizo-parrilla', 'papas-fritas'] },
  ...MAIN_GROUPS,
  { id: 'drink', label: 'Bebida', icon: '🥤', cats: ['drinks'], hint: 'Si tomaste algo con la comida, sumalo',
    suggest: ['refresco-zero', 'refresco', 'cerveza', 'vino-tinto', 'jugo-naranja', 'cafe-expreso'] },
]

const SNACK_GROUPS = [
  { id: 'protein', label: 'Proteína', icon: '🧀', cats: ['meat', 'fish', 'dairy', 'supplements'], hint: 'Que la merienda también sume: 15–25 g de proteína',
    suggest: ['yogur-desc', 'ricota', 'queso-magro', 'huevo', 'whey', 'leche-desc', 'atun'] },
  { id: 'carbs', label: 'Base', icon: '🍞', cats: ['carbs', 'legumes', 'typical'], hint: '1–2 rebanadas, unas galletas o un poco de avena',
    suggest: ['pan-integral', 'galletas-arroz', 'avena', 'bizcocho', 'torta-frita'] },
  { id: 'fruit', label: 'Fruta', icon: '🍎', cats: ['fruit', 'veg'], hint: 'Una fruta de estación',
    suggest: ['banana', 'manzana', 'mandarina', 'naranja', 'tomate'] },
  { id: 'extras', label: 'Extras', icon: '🥜', cats: ['fats', 'seeds', 'pantry'], hint: 'Con medida · 1 cda de chía o pasta de maní, un puñado de frutos secos',
    suggest: ['chia', 'pasta-mani', 'almendras', 'castanas-caju', 'nueces', 'granola', 'pasas'] },
  { id: 'drink', label: 'Bebida', icon: '🧉', cats: ['drinks'], hint: 'Mate, café o té: sin azúcar no suman',
    suggest: ['mate', 'cafe-manzanares', 'cafe-con-leche', 'cortado', 'te'] },
]

export const MODES = {
  tupper: {
    id: 'tupper', tab: 'Taper', icon: '🥡', title: 'Crear taper',
    subtitle: 'Armalo como un plato: proteína + carbohidrato + verduras. Se guarda como lote en tu heladera.',
    groups: MAIN_GROUPS, share: 0.3, portionWord: 'taper', batch: true, quickAction: 'Cocinar', g: { un: 'un', del: 'del', o: 'o' },
    templates: [
      { name: 'Pollo con arroz y brócoli', items: [['pollo-pechuga', 150], ['arroz-blanco', 70], ['brocoli', 120], ['aceite-oliva', 5]] },
      { name: 'Bola de lomo con boniato y zapallito', items: [['bola-lomo', 150], ['boniato', 200], ['zapallito', 150]] },
      { name: 'Merluza con papa y chauchas', items: [['merluza', 180], ['papa', 200], ['chauchas', 120], ['aceite-oliva', 5]] },
      { name: 'Lentejas con arroz y verduras', items: [['lentejas', 70], ['arroz-blanco', 40], ['zanahoria', 60], ['cebolla', 50], ['morron', 50]] },
      { name: 'Carne picada con fideos', items: [['carne-picada', 150], ['fideos', 70], ['pulpa-tomate', 100], ['cebolla', 50]] },
      { name: 'Cerdo con arroz integral y repollo', items: [['cerdo-lomo', 150], ['arroz-integral', 70], ['repollo', 120]] },
    ],
  },
  breakfast: {
    id: 'breakfast', tab: 'Desayuno', icon: '☕', title: 'Crear desayuno',
    subtitle: 'Armá tus desayunos habituales una vez y cargalos al día con un toque.',
    groups: BREAKFAST_GROUPS, share: 0.25, portionWord: 'desayuno', quickAction: 'Comer', g: { un: 'un', del: 'del', o: 'o' },
    templates: [
      { name: 'Avena con whey y banana', items: [['avena', 60], ['whey', 30], ['banana', 120], ['leche-desc', 200]] },
      { name: 'Huevos revueltos con tostadas', items: [['huevo', 150, 'scrambled'], ['pan-integral', 60], ['tomate', 80]] },
      { name: 'Yogur con avena, manzana y nueces', items: [['yogur-desc', 250], ['avena', 40], ['manzana', 150], ['nueces', 15]] },
      { name: 'Tostadas con ricota y huevo duro', items: [['pan-integral', 60], ['ricota', 80], ['huevo', 100, 'boiled']] },
      { name: 'Omelette de claras con queso', items: [['clara', 165], ['huevo', 50, 'omelette'], ['queso-magro', 20], ['espinaca', 50]] },
      { name: 'Batido proteico', items: [['whey', 30], ['leche-desc', 300], ['banana', 120], ['pasta-mani', 16]] },
      { name: 'Yogur con chía, avena y banana', items: [['yogur-desc', 250], ['chia', 12], ['avena', 40], ['banana', 120]] },
      { name: 'Café con leche, tostadas y huevo', items: [['cafe-con-leche', 250], ['pan-integral', 60], ['huevo', 100, 'boiled'], ['queso-magro', 20]] },
    ],
  },
  snack: {
    id: 'snack', tab: 'Merienda', icon: '🧉', title: 'Crear merienda',
    subtitle: 'La merienda de todos los días (mate incluido), armada una vez y cargada con un toque.',
    groups: SNACK_GROUPS, share: 0.15, portionWord: 'merienda', quickAction: 'Comer', g: { un: 'una', del: 'de la', o: 'a' },
    templates: [
      { name: 'Yogur con banana y avena', items: [['yogur-desc', 170], ['banana', 120], ['avena', 30]] },
      { name: 'Tostadas con queso magro y tomate', items: [['pan-integral', 60], ['queso-magro', 40], ['tomate', 80]] },
      { name: 'Mate con galletas de arroz y pasta de maní', items: [['mate', 1000], ['galletas-arroz', 27], ['pasta-mani', 16]] },
      { name: 'Batido de whey con leche', items: [['whey', 30], ['leche-desc', 250]] },
      { name: 'Ricota con manzana y nueces', items: [['ricota', 100], ['manzana', 150], ['nueces', 15]] },
      { name: 'Huevo duro y mandarinas', items: [['huevo', 100, 'boiled'], ['mandarina', 200]] },
      { name: 'Yogur con granola y chía', items: [['yogur-desc', 170], ['granola', 30], ['chia', 12]] },
      { name: 'Puñado de almendras y una manzana', items: [['almendras', 30], ['manzana', 150]] },
    ],
  },
  meal: {
    id: 'meal', tab: 'Comida libre', icon: '🍽️', title: 'Comida libre',
    subtitle: 'Para lo que cocinás en el momento, una cena improvisada o una comida afuera. Registralo directo en el día.',
    groups: MEAL_GROUPS, share: 0.3, portionWord: 'plato', quickAction: 'Comer', g: { un: 'un', del: 'del', o: 'o' },
    templates: [
      { name: 'Bife con papa y ensalada', items: [['bife-lomo', 180], ['papa', 200], ['lechuga', 80], ['tomate', 100], ['aceite-oliva', 10]] },
      { name: 'Omelette con verduras', items: [['huevo', 150, 'omelette'], ['morron', 60], ['cebolla', 50], ['queso-magro', 20]] },
      { name: 'Fideos con atún', items: [['fideos', 90], ['atun', 120], ['pulpa-tomate', 100]] },
      { name: 'Ensalada completa con pollo', items: [['pollo-pechuga', 120, 'cooked'], ['lechuga', 100], ['tomate', 100], ['palta', 75], ['choclo', 100]] },
      { name: 'Salmón con boniato y brócoli', items: [['salmon', 150], ['boniato', 200], ['brocoli', 100]] },
      { name: 'Huevos fritos con papas al horno', items: [['huevo', 100, 'fried'], ['papa', 250], ['aceite-oliva', 5]] },
      { name: 'Chivito al plato', items: [['chivito-plato', 700]] },
      { name: '2 porciones de pizza y fainá', items: [['pizza-muzzarella', 280], ['faina', 100]] },
      { name: 'Asado: vacío, chorizo y ensalada', items: [['vacio', 200], ['chorizo-parrilla', 100], ['lechuga', 80], ['tomate', 100]] },
      { name: '3 empanadas de carne', items: [['empanada-carne', 360]] },
    ],
  },
}

// Porción sugerida al agregar un alimento (en crudo)
const DEFAULT_GRAMS = { meat: 150, fish: 150, dairy: 100, supplements: 30, legumes: 60, carbs: 70, veg: 100, fruit: 120, fats: 10, seeds: 15, drinks: 250, typical: 150 }
export const defaultGrams = (food) => food.unit?.grams ?? DEFAULT_GRAMS[food.category] ?? 100

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const shortName = (food) => food.name.split(' (')[0]
export const foodIconOf = (food) => {
  const i = detectIcon(food.name)
  return i !== DEFAULT_ICON ? i : categoryOf(food.category).icon
}
export const groupFor = (groups, food) => groups.find((g) => g.cats.includes(food.category)) ?? groups.at(-1)

/**
 * Constructor de comidas con la misma experiencia para tapers, desayunos y comidas libres.
 * Las acciones dependen del modo: lotes para la heladera o registro directo + favoritos.
 */
export default function MealBuilder({
  mode: modeId, settings, prices, date, draft, setDraft, addMeal,
  saveRecipe, favorites = [], saveFavorite, removeFavorite, goToBatch, goToToday, goToFoods, goToTemplates,
}) {
  const mode = MODES[modeId]
  const { foods, variants } = useFoods()
  const [flash, setFlash] = useState(null)
  const [showList, setShowList] = useState(false)
  const [sheet, setSheet] = useState(null) // null | { type: 'draft' } | { type: 'fav', id }
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])

  // Borradores antiguos guardaban el nombre: se convierten a la referencia de la base
  const draftRows = (draft.rows ?? []).flatMap((r) => {
    if (r.foodId) return byId.has(r.foodId) ? [r] : []
    const v = findVariant(r.name, variants)
    return v ? [{ id: r.id, foodId: v.food.id, state: v.state, grams: r.grams }] : []
  })
  const portions = Math.max(1, Math.round(num(draft.portions) ?? 5))

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }))
  const setRows = (fn) => setDraft((prev) => ({ ...prev, rows: fn(draftRows) }))
  const setRow = (id, patch) => setRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = (id) => setRows((rows) => rows.filter((r) => r.id !== id))

  const addFood = (food) => {
    // Si ya está, suma otra porción en lugar de duplicar la fila
    const existing = draftRows.find((r) => r.foodId === food.id)
    if (existing) setRow(existing.id, { grams: String((num(existing.grams) ?? 0) + defaultGrams(food)) })
    else setRows((rows) => [...rows, { ...blankRow(), foodId: food.id, grams: String(defaultGrams(food)) }])
  }

  const applyTemplate = (t) =>
    set({
      name: t.name,
      rows: t.items.filter(([id]) => byId.has(id)).map(([foodId, grams, state]) => ({ ...blankRow(), foodId, state: state ?? 'raw', grams: String(grams) })),
    })

  // Cálculo automático
  const { rows: computed, filled, total, priced } = computeRows(draftRows, byId, prices, variants)
  const rows = computed.map((r) => ({ ...r, group: groupFor(mode.groups, r.food) }))
  const autoName = filled.slice(0, 3).map((r) => shortName(r.food)).join(', ')
  const name = draft.name.trim() || autoName || mode.title.replace('Crear ', 'Mi ')
  const ingredients = filled.map((r) => ({ name: r.variant.label, grams: r.g, kcal: r.variant.kcal, protein: r.variant.protein }))
  const icon = filled.length ? recipeIcon({ name: draft.name, ingredients }) : mode.icon
  const savedRows = filled.map(({ foodId, state, g }) => ({ foodId, state, grams: g }))

  const target = {
    kcal: settings.calorieGoal * mode.share,
    protein: settings.proteinGoal * mode.share,
    carbs: (settings.carbsGoal ?? 0) * mode.share,
    fat: (settings.fatGoal ?? 0) * mode.share,
  }
  const advice = adviceFor(rows, total, target, mode)

  const notify = (text, go) => {
    setFlash({ text, go })
    setTimeout(() => setFlash(null), 3000)
  }

  const eatNow = () => {
    addMeal(date, mealEntry({ name, icon, kind: mode.id, total, priced }))
    notify(`${mode.portionWord[0].toUpperCase() + mode.portionWord.slice(1)} sumad${mode.g.o} a tu día`, goToToday)
  }

  const saveBatch = () => {
    saveRecipe(batchRecipe(name, computeRows(draftRows, byId, prices, variants), portions), draft.editingId)
    notify(draft.editingId ? 'Cambios guardados' : `Lote de ${portions} tapers guardado`, goToBatch)
    if (draft.editingId) set({ editingId: null })
  }

  // Analiza filas (de una plantilla) con los mismos cálculos que el armado en vivo
  const analyze = (rowsIn, fallbackName) => {
    const c = computeRows(rowsIn, byId, prices, variants)
    const withGroups = c.rows.map((r) => ({ ...r, group: groupFor(mode.groups, r.food) }))
    const ing = c.filled.map((r) => ({ name: r.variant.label }))
    return {
      ...c, rows: withGroups, name: fallbackName,
      icon: c.filled.length ? recipeIcon({ name: fallbackName, ingredients: ing }) : mode.icon,
      advice: adviceFor(withGroups, c.total, target, mode),
    }
  }

  // Plantilla: guarda la receta (ingredientes, gramos y cantidad de tapers) para reutilizarla
  const currentTemplate = favorites.find((f) => f.id === draft.templateId)
  const saveTemplate = (asNew = false) => {
    const updating = Boolean(currentTemplate) && !asNew
    const id = updating ? currentTemplate.id : uid()
    saveFavorite({ id, kind: mode.id, name, rows: savedRows, ...(mode.batch && { portions }) }, updating ? id : null)
    set({ templateId: id, name })
    notify(updating ? 'Plantilla actualizada' : `Plantilla “${name}” guardada`, () => setSheet({ type: 'fav', id }))
  }

  const useTemplate = (fav) =>
    setDraft({
      ...blankDraft(), name: fav.name, portions: fav.portions ?? 5, templateId: fav.id,
      rows: fav.rows.map((r) => ({ ...blankRow(), ...r, grams: String(r.grams) })),
    })

  // Acción rápida desde la lista: comer (desayuno/comida) o cocinar el lote (taper) sin abrirla
  const quickFromTemplate = (fav, c) => {
    if (mode.batch) {
      const n = fav.portions ?? 5
      saveRecipe(batchRecipe(fav.name, c, n), null)
      notify(`Lote de ${n} “${fav.name}” en tu heladera`, goToBatch)
    } else {
      addMeal(date, mealEntry({ name: fav.name, icon: c.icon, kind: mode.id, total: c.total, priced: c.priced }))
      notify(`${fav.name} sumado a tu día`, goToToday)
    }
  }

  const sheetFav = sheet?.type === 'fav' ? favorites.find((f) => f.id === sheet.id) : null
  const sheetData = sheet?.type === 'draft'
    ? { rows, filled, total, priced, advice, icon, name }
    : sheetFav ? analyze(sheetFav.rows, sheetFav.name) : null
  const closeSheet = () => setSheet(null)
  const sheetActions = sheet?.type === 'draft'
    ? [
        mode.batch
          ? { label: draft.editingId ? 'Guardar cambios' : `Guardar lote de ${portions}`, icon: 'box', variant: 'primary', primary: true, onClick: () => { saveBatch(); closeSheet() } }
          : { label: 'Sumar a mi día', icon: 'check', variant: 'primary', primary: true, onClick: () => { eatNow(); closeSheet() } },
        { label: currentTemplate ? 'Actualizar plantilla' : 'Guardar plantilla', icon: 'check', onClick: () => saveTemplate() },
        { label: 'Seguir editando', icon: 'edit', onClick: closeSheet },
      ]
    : sheetFav
      ? [
          { label: mode.batch ? `Cocinar lote de ${sheetFav.portions ?? 5}` : 'Sumar a mi día', icon: mode.batch ? 'box' : 'check', variant: 'primary', primary: true,
            onClick: () => { quickFromTemplate(sheetFav, sheetData); closeSheet() } },
          { label: 'Editar', icon: 'edit', onClick: () => { useTemplate(sheetFav); closeSheet() } },
          { label: 'Duplicar', icon: 'plus', onClick: () => {
            const id = uid()
            saveFavorite({ ...sheetFav, id, name: `${sheetFav.name} (copia)` }, null)
            setSheet({ type: 'fav', id })
          } },
          { label: 'Eliminar', icon: 'trash', variant: 'danger', onClick: () => {
            if (confirm(`¿Eliminar la plantilla "${sheetFav.name}"?`)) { removeFavorite(sheetFav.id); closeSheet() }
          } },
        ]
      : []
  const renameSheet = (newName) => {
    if (sheet?.type === 'draft') set({ name: newName })
    else if (sheetFav) {
      saveFavorite({ ...sheetFav, name: newName }, sheetFav.id)
      if (draft.templateId === sheetFav.id) set({ name: newName })
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
      <div className="space-y-4">
        {draft.editingId && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-sm text-sky-100">
            <Icon name="edit" className="h-4 w-4 shrink-0" />
            <span className="flex-1">{mode.batch ? 'Editando un lote de tu heladera' : `Editando ${mode.g.un} ${mode.portionWord} guardad${mode.g.o}`}</span>
            <button className="text-xs underline" onClick={() => setDraft(blankDraft())}>Cancelar edición</button>
          </div>
        )}

        {currentTemplate && !draft.editingId && (
          <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-lime-100">
            <Icon name="bolt" className="h-4 w-4 shrink-0" />
            <span className="flex-1">Usando la plantilla <b>{currentTemplate.name}</b>. Si cambiás algo, tocá “Actualizar plantilla”.</span>
            <button className="text-xs underline" onClick={() => setDraft(blankDraft())}>Cerrar</button>
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-hand text-[30px] font-bold leading-none text-zinc-50">{mode.title}</h2>
              <p className="text-xs text-zinc-500">{mode.subtitle}</p>
            </div>
            {draftRows.length > 0 && <Button variant="plain" size="sm" onClick={() => setDraft(blankDraft())}>Vaciar</Button>}
          </div>
          <div className="mt-4">
            <FoodSearch foods={foods} groups={mode.groups} onPick={addFood} />
          </div>
        </Card>

        <MyTemplates
          items={favorites} activeId={draft.templateId} mode={mode} byId={byId} prices={prices} variants={variants}
          onUse={useTemplate} onQuick={quickFromTemplate} onRemove={removeFavorite} onView={(fav) => setSheet({ type: 'fav', id: fav.id })} onSeeAll={goToTemplates}
        />

        {draftRows.length === 0 && (
          <Card>
            <p className="mb-3 font-hand text-[26px] font-semibold leading-none text-zinc-100">Ideas para empezar</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {mode.templates.map((t) => {
                const tc = computeRows(t.items.map(([foodId, grams, state]) => ({ foodId, grams, state })), byId, prices, variants)
                const first = tc.filled[0]?.food
                return (
                  <button
                    key={t.name} onClick={() => applyTemplate(t)}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.16] px-3 py-3 text-left transition-colors hover:border-accent/40"
                  >
                    <span className="text-2xl leading-none">{first ? foodIconOf(first) : mode.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{t.name}</span>
                      <span className="block text-xs text-zinc-500">
                        {fmt(tc.total.kcal)} kcal · <span className="text-sky-300">{fmt(tc.total.protein)} g prot</span>
                        {tc.priced > 0 && <> · <span className="text-zinc-300">{money(tc.total.cost)}</span></>}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              O elegí ingredientes abajo, grupo por grupo. Los valores salen de{' '}
              <button className="text-accent hover:underline" onClick={goToFoods}>Alimentos</button>.
            </p>
          </Card>
        )}

        {mode.groups.map((group, gi) => (
          <GroupSection
            key={group.id} step={gi + 1} group={group}
            rows={rows.filter((r) => r.group.id === group.id)}
            suggestions={group.suggest.map((id) => byId.get(id)).filter(Boolean)}
            onAdd={addFood}
            onGrams={(id, grams) => setRow(id, { grams })}
            onState={(id, state) => setRow(id, { state })}
            onRemove={removeRow}
          />
        ))}
      </div>

      {/* Resumen y guardado */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-2xl leading-none">{icon}</span>
            <Input
              className="flex-1" label={`Nombre ${mode.g.del} ${mode.portionWord}`} placeholder={autoName || `Ej. ${mode.templates[0]?.name ?? ''}`}
              value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-label="Nombre"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/[0.16] p-3">
              <p className="text-2xl font-bold tracking-tight">{fmt(total.kcal)}</p>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">kcal</p>
            </div>
            <div className="rounded-xl bg-black/[0.16] p-3">
              <p className="text-2xl font-bold tracking-tight text-sky-300">{fmt(total.protein, 1)} g</p>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">proteína</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Mini label="carbos" value={`${fmt(total.carbs)} g`} tone="text-amber-300" />
            <Mini label="grasas" value={`${fmt(total.fat, 1)} g`} tone="text-pink-300" />
            <Mini label="fibra" value={`${fmt(total.fiber, 1)} g`} />
          </div>
          {(priced > 0 || total.grams > 0) && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              {fmt(total.grams)} g{priced > 0 && <> · <span className="text-zinc-300">{money(total.cost)}</span></>}
            </p>
          )}

          {/* Guía: cómo va frente a lo ideal para tu plan */}
          <div className="mt-4 space-y-2.5 rounded-xl border border-white/[0.06] p-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ideal por {mode.portionWord} para tu plan</p>
            <TargetBar label="Calorías" value={total.kcal} target={target.kcal} unit="kcal" />
            <TargetBar label="Proteína" value={total.protein} target={target.protein} unit="g" />
            {target.carbs > 0 && <TargetBar label="Carbohidratos" value={total.carbs} target={target.carbs} unit="g" soft />}
            {target.fat > 0 && <TargetBar label="Grasas" value={total.fat} target={target.fat} unit="g" soft />}
            {advice && <p className={`text-xs ${advice.ok ? 'text-accent' : 'text-amber-200'}`}>{advice.ok ? '✓ ' : '💡 '}{advice.text}</p>}
          </div>
          {filled.length > 0 && (
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setSheet({ type: 'draft' })}>
              <Icon name="chart" className="h-4 w-4" /> Ver ficha completa
            </Button>
          )}
        </Card>

        <Card>
          {mode.batch ? (
            <>
              <p className="text-sm font-medium">¿Cuántos tapers vas a cocinar?</p>
              <div className="mt-2 flex items-center gap-3">
                <Stepper value={portions} onChange={(v) => set({ portions: v })} />
                <p className="text-xs text-zinc-500">≈ {fmt(portions / 2, 1)} días<br />con 2 por día</p>
              </div>
              <Button className="mt-4 h-12 w-full text-base" disabled={!filled.length} onClick={saveBatch}>
                <Icon name="box" className="h-5 w-5" /> {draft.editingId ? 'Guardar cambios' : `Guardar lote de ${portions}`}
              </Button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TemplateButton disabled={!filled.length} updating={Boolean(currentTemplate)} onSave={() => saveTemplate()} />
                <Button variant="ghost" disabled={!filled.length} onClick={eatNow}>
                  <Icon name="check" className="h-4 w-4" /> Comer 1 ahora
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button className="h-12 w-full text-base" disabled={!filled.length} onClick={eatNow}>
                <Icon name="check" className="h-5 w-5" /> Sumar a mi día
              </Button>
              <div className="mt-2 grid">
                <TemplateButton disabled={!filled.length} updating={Boolean(currentTemplate)} onSave={() => saveTemplate()} />
              </div>
            </>
          )}
          {currentTemplate && filled.length > 0 && (
            <button className="mt-2 w-full text-center text-xs text-zinc-500 hover:text-zinc-200" onClick={() => saveTemplate(true)}>
              o guardar como plantilla nueva
            </button>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            💾 La plantilla guarda ingredientes y gramos{mode.batch ? ' (y cuántos tapers)' : ''} en <b className="text-zinc-400">Mis plantillas</b>
            {mode.batch ? ', para volver a cocinar el lote con un toque.' : ', y también aparece en Hoy para cargarla con un toque.'}
          </p>

          {mode.batch && filled.length > 0 && (
            <div className="mt-4">
              <button className="flex w-full items-center justify-between text-sm text-zinc-300" onClick={() => setShowList((v) => !v)}>
                🛒 Lista de compra para {portions} tapers
                <Icon name={showList ? 'minus' : 'plus'} className="h-4 w-4 text-zinc-500" />
              </button>
              {showList && (
                <ul className="mt-2 space-y-1 rounded-xl bg-black/[0.16] px-3 py-2.5 text-sm">
                  {filled.map((r) => {
                    // Se compra en crudo: se convierte desde el estado en que se pesó
                    const buy = r.raw * portions
                    return (
                      <li key={r.id} className="flex justify-between gap-2">
                        <span className="truncate text-zinc-300">{foodIconOf(r.food)} {shortName(r.food)}</span>
                        <span className="shrink-0 text-zinc-400">{buy >= 1000 ? `${fmt(buy / 1000, 2)} kg` : `${fmt(buy)} g`}</span>
                      </li>
                    )
                  })}
                  {priced > 0 && <li className="pt-1 text-right text-xs text-zinc-500">≈ {money(total.cost * portions)} el lote</li>}
                </ul>
              )}
            </div>
          )}

          {flash && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              <Icon name="check" className="h-4 w-4" /> {flash.text}
              {flash.go && <button className="ml-auto text-xs underline" onClick={flash.go}>Ver</button>}
            </p>
          )}
        </Card>

      </div>

      {sheetData && (
        <MealSheet
          data={sheetData} mode={mode} target={target} settings={settings}
          portions={sheet?.type === 'fav' ? sheetFav?.portions ?? 5 : portions}
          onRename={renameSheet} onClose={closeSheet} actions={sheetActions} iconOf={foodIconOf}
        />
      )}

      {/* Resumen fijo en móvil */}
      {filled.length > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-ink-800/95 px-4 py-2.5 shadow-2xl backdrop-blur lg:hidden">
          <span className="text-xl leading-none">{icon}</span>
          <p className="flex-1 text-sm">
            <b>{fmt(total.kcal)}</b> <span className="text-zinc-500">kcal</span>
            <span className="mx-1.5 text-zinc-600">·</span>
            <b className="text-sky-300">{fmt(total.protein, 1)} g</b> <span className="text-zinc-500">prot</span>
          </p>
          {mode.batch
            ? <Button size="sm" onClick={saveBatch}>{draft.editingId ? 'Guardar' : `Guardar ${portions}`}</Button>
            : <Button size="sm" onClick={eatNow}>Sumar al día</Button>}
        </div>
      )}
    </div>
  )
}

// Lote para la heladera a partir de filas calculadas (por taper) y una cantidad de tapers
export function batchRecipe(name, computed, portions) {
  const { filled, total } = computed
  const r1 = (n) => Math.round(n * 10) / 10
  return {
    name, portions, mode: 'ingredients', icon: null,
    // Total de cada ingrediente del lote (para costos) + filas por taper (para editar)
    ingredients: filled.map((r) => ({ name: r.variant.label, grams: r.g * portions, kcal: r.variant.kcal, protein: r.variant.protein })),
    rows: filled.map(({ foodId, state, g }) => ({ foodId, state, grams: g })),
    perTaper: { kcal: Math.round(total.kcal), protein: r1(total.protein), fat: r1(total.fat), carbs: r1(total.carbs), fiber: r1(total.fiber) },
    kcalPerPortion: 0, proteinPerPortion: 0, costPerPortion: null,
  }
}

function TemplateButton({ disabled, updating, onSave }) {
  return (
    <Button variant="ghost" className="border-accent/30 text-lime-100" disabled={disabled} onClick={onSave}>
      <Icon name="check" className="h-4 w-4" /> {updating ? 'Actualizar plantilla' : 'Guardar plantilla'}
    </Button>
  )
}

// Plantillas guardadas del modo: usar (cargar para ajustar) o acción rápida (comer / cocinar lote)
function MyTemplates({ items, activeId, mode, byId, prices, variants, onUse, onQuick, onRemove, onView, onSeeAll }) {
  const [done, setDone] = useState(null)
  if (!items.length) return null
  return (
    <Card>
      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="font-hand text-[26px] font-semibold leading-none text-zinc-100">💾 Mis plantillas · {items.length}</p>
        {onSeeAll && <button className="text-xs text-zinc-400 underline decoration-dashed underline-offset-4 hover:text-zinc-100" onClick={onSeeAll}>Ver todas</button>}
      </div>
      <ul className="space-y-2">
        {items.map((fav) => {
          const c = computeRows(fav.rows, byId, prices, variants)
          const icon = c.filled[0] ? recipeIcon({ name: fav.name, ingredients: c.filled.map((r) => ({ name: r.variant.label })) }) : mode.icon
          const active = fav.id === activeId
          return (
            <li key={fav.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${active ? 'bg-accent/10 ring-1 ring-accent/40' : 'bg-black/[0.16]'}`}>
              <span className="text-xl leading-none">{icon}</span>
              <button className="min-w-0 flex-1 text-left" onClick={() => onView(fav)} title="Ver la ficha completa">
                <p className="truncate text-sm font-medium">{fav.name}</p>
                <p className="text-xs text-zinc-500">
                  {fmt(c.total.kcal)} kcal · <span className="text-sky-300">{fmt(c.total.protein, 1)} g prot</span>
                  {c.priced > 0 && <> · <span className="text-zinc-300">{money(c.total.cost)}</span></>}
                  {mode.batch && <> · {fav.portions ?? 5} tapers</>}
                </p>
              </button>
              <Button variant="ghost" size="sm" onClick={() => onUse(fav)}>{active ? 'Abierta' : 'Usar'}</Button>
              <Button
                size="sm"
                onClick={() => { onQuick(fav, { ...c, icon }); setDone(fav.id); setTimeout(() => setDone(null), 1500) }}
              >
                {done === fav.id ? '✓' : mode.quickAction}
              </Button>
              <Button variant="plain" size="icon" onClick={() => confirm(`¿Eliminar la plantilla "${fav.name}"?`) && onRemove(fav.id)} aria-label="Eliminar">
                <Icon name="trash" className="h-4 w-4" />
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] text-zinc-500">
        “Usar” la carga para ajustarla · “{mode.quickAction}” {mode.batch ? 'crea el lote directo en tu heladera' : 'la suma a tu día sin abrirla'}.
      </p>
    </Card>
  )
}

// Consejo concreto según cómo quedó la comida
export function adviceFor(rows, total, target, mode) {
  if (!rows.length) return null
  const has = (id) => rows.some((r) => r.group.id === id && r.g > 0)
  // Una comida hecha (chivito, empanadas, asado) ya trae su proteína
  if (!has('protein') && !has('typical')) return { text: 'Agregá una proteína: es la base para cuidar el músculo.' }
  if (total.protein < target.protein * 0.85) {
    const p = rows.find((r) => r.group.id === 'protein' && r.g > 0)
    if (!p) return { text: 'Le falta proteína: sumá algo magro (pollo, atún, huevo o un batido) en la próxima comida.' }
    const grams = (target.protein - total.protein) / (p.n.protein / p.g)
    const unit = p.food.unit?.grams <= 60 ? p.food.unit : null
    // Alimentos por unidad (huevo, scoop) se sugieren en unidades
    const count = unit ? Math.ceil(grams / unit.grams) : 0
    const amount = unit
      ? `${count} ${unit.label}${count > 1 && !unit.label.endsWith('s') ? 's' : ''} más`
      : `~${Math.ceil(grams / 10) * 10} g más de ${shortName(p.food).toLowerCase()}`
    return { text: `Le falta proteína: sumá ${amount}.` }
  }
  if (total.kcal > target.kcal * 1.15) {
    const c = rows.find((r) => r.group.id === 'carbs' && r.g > 0) ?? rows.find((r) => r.group.id === 'extras' && r.g > 0)
    if (c) {
      const less = Math.ceil((total.kcal - target.kcal) / (c.n.kcal / c.g) / 10) * 10
      return { text: `Se pasa de calorías: bajá ~${Math.min(less, c.g)} g de ${shortName(c.food).toLowerCase()}.` }
    }
    return { text: `Se pasa de calorías para ${mode.g.un} ${mode.portionWord}: reducí alguna porción.` }
  }
  if (mode.id !== 'breakfast' && mode.id !== 'snack' && !has('veg')) return { text: 'Sumá verduras: dan volumen y saciedad casi sin calorías.' }
  if (total.kcal < target.kcal * 0.7) return { text: 'Quedó liviano: podés sumar algo de carbohidrato para entrenar mejor.' }
  return { ok: true, text: `${mode.portionWord[0].toUpperCase() + mode.portionWord.slice(1)} bien armad${mode.g.o} para tu objetivo.` }
}

function Stepper({ value, onChange }) {
  return (
    <div className="flex items-center rounded-xl border border-white/[0.1] bg-black/[0.18]">
      <button className="grid h-11 w-11 place-items-center text-zinc-400 hover:text-zinc-100" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Menos">
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className="w-10 text-center text-xl font-bold">{value}</span>
      <button className="grid h-11 w-11 place-items-center text-zinc-400 hover:text-zinc-100" onClick={() => onChange(value + 1)} aria-label="Más">
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  )
}

function GroupSection({ step, group, rows, suggestions, onAdd, onGrams, onState, onRemove }) {
  const inMeal = new Set(rows.map((r) => r.foodId))
  const sub = rows.reduce((s, r) => ({ kcal: s.kcal + r.n.kcal, protein: s.protein + r.n.protein }), { kcal: 0, protein: 0 })
  const done = rows.some((r) => r.g > 0)
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-accent text-ink-950' : 'bg-white/[0.06] text-zinc-400'}`}>
          {done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{group.icon} {group.label}</p>
          <p className="truncate text-xs text-zinc-500">{group.hint}</p>
        </div>
        {done && <p className="shrink-0 text-xs text-zinc-400">{fmt(sub.kcal)} kcal · <span className="text-sky-300">{fmt(sub.protein, 1)} g</span></p>}
      </div>

      {rows.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <IngredientRow key={r.id} row={r} onGrams={(g) => onGrams(r.id, g)} onState={(s) => onState(r.id, s)} onRemove={() => onRemove(r.id)} />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.filter((f) => !inMeal.has(f.id)).map((food) => (
          <button
            key={food.id} onClick={() => onAdd(food)}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-white/[0.16] py-1 pl-1.5 pr-2.5 text-xs text-zinc-300 transition-colors hover:border-accent/40 hover:text-zinc-100"
          >
            <span className="text-sm leading-none">{foodIconOf(food)}</span>
            {shortName(food)}
            <Icon name="plus" className="h-3 w-3 text-zinc-500" />
          </button>
        ))}
      </div>
    </Card>
  )
}

// Buscador con resultados en vivo (sin tildes, por cualquier parte del nombre)
export function FoodSearch({ foods, groups, onPick, placeholder = 'Buscar cualquier alimento: pollo, avena, huevo…' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const query = normalize(q.trim())
  // Relevancia: el nombre empieza con lo buscado → lo contiene → un alias → la categoría
  const rank = (f) => {
    const name = normalize(f.name)
    if (name.startsWith(query)) return 0
    if (name.includes(` ${query}`)) return 1
    if (name.includes(query)) return 2 + name.indexOf(query) / 100
    if ((f.aliases ?? []).some((x) => normalize(x).includes(query))) return 5
    return normalize(categoryOf(f.category).label).includes(query) ? 9 : null
  }
  const results = query
    ? foods
        .map((f) => ({ f, r: rank(f) }))
        .filter((x) => x.r != null)
        .sort((a, b) => a.r - b.r || a.f.name.length - b.f.name.length)
        .slice(0, 8)
        .map((x) => x.f)
    : []

  const pick = (food) => {
    onPick(food)
    setQ('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        prefix="🔎"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) { e.preventDefault(); pick(results[0]) }
          if (e.key === 'Escape') setQ('')
        }}
      />
      {open && query && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-white/[0.08] bg-ink-800 p-1 shadow-2xl">
          {results.length === 0 && <li className="px-3 py-2.5 text-sm text-zinc-500">Sin resultados. Podés crearlo en Alimentos.</li>}
          {results.map((f) => {
            const p = nutrientsFor(f, 100)
            return (
              <li key={f.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(f)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.06]"
                >
                  <span className="text-lg leading-none">{foodIconOf(f)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {f.name}
                      {!normalize(f.name).includes(query) && (f.aliases ?? []).find((x) => normalize(x).includes(query)) && (
                        <span className="text-zinc-500"> · {(f.aliases ?? []).find((x) => normalize(x).includes(query))}</span>
                      )}
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      {groupFor(groups, f).label} · 100 g{hasStates(f) ? ` ${stateLabel(f, 'raw')}` : ''}: {fmt(p.kcal)} kcal · {fmt(p.protein, 1)} g prot
                    </span>
                  </span>
                  <span className="text-xs text-accent">+ {defaultGrams(f)} {f.liquid ? 'ml' : 'g'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function IngredientRow({ row, onGrams, onState, onRemove }) {
  const { food, g, n, cost, state } = row
  const unitG = food.unit?.grams
  // Unidades chicas (huevo, scoop, cucharada) suman de a una; el resto de a 5-10 g
  const step = unitG && unitG <= 60 ? unitG : g < 30 ? 5 : 10

  return (
    <li className="rounded-xl border border-dashed border-white/[0.16]/60 p-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">{foodIconOf(food)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{food.name}</p>
          <p className="text-xs text-zinc-500">
            <b className="text-zinc-200">{fmt(n.kcal)}</b> kcal · <b className="text-sky-300">{fmt(n.protein, 1)}</b> g prot
            <span className="hidden sm:inline"> · {fmt(n.carbs)} g carb · {fmt(n.fat, 1)} g grasa</span>
            {cost != null && <> · {money(cost)}</>}
          </p>
        </div>
        <Button variant="plain" size="icon" onClick={onRemove} aria-label="Quitar ingrediente"><Icon name="trash" className="h-4 w-4" /></Button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-white/[0.1] bg-black/[0.18]">
          <button className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-100" onClick={() => onGrams(String(Math.max(0, g - step)))} aria-label="Menos">
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <input
            type="number" inputMode="decimal" value={row.grams} onChange={(e) => onGrams(e.target.value)}
            className="h-9 w-14 bg-transparent text-center text-[15px] font-medium outline-none"
            aria-label="Gramos"
          />
          <span className="pr-1 text-xs text-zinc-500">{food.liquid ? 'ml' : 'g'}</span>
          <button className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-100" onClick={() => onGrams(String(g + step))} aria-label="Más">
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
        {unitG && g > 0 && <span className="text-xs text-zinc-500">≈ {fmt(g / unitG, 1)} {food.unit.label}{g / unitG >= 1.5 && !food.unit.label.endsWith('s') ? 's' : ''}</span>}
        <StatePicker food={food} value={state} onChange={onState} size="sm" />
      </div>
    </li>
  )
}

function Mini({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl bg-black/[0.16] px-2 py-2">
      <p className={`text-sm font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  )
}
