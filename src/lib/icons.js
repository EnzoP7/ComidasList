// Iconos de comida asignados automáticamente por palabras clave del nombre.
// El orden importa: las reglas más específicas van primero.
export const FOOD_ICONS = [
  { icon: '🥪', label: 'Sándwich', keys: ['chivito', 'refuerzo', 'sándwich', 'sandwich', 'milanesa al pan'] },
  { icon: '🌭', label: 'Embutidos', keys: ['pancho', 'choripán', 'choripan', 'chorizo', 'morcilla', 'salchicha'] },
  { icon: '🍕', label: 'Pizza', keys: ['pizza', 'fainá', 'faina'] },
  { icon: '🥟', label: 'Empanada', keys: ['empanada'] },
  { icon: '🥐', label: 'Panadería', keys: ['bizcocho', 'medialuna', 'torta frita', 'croissant'] },
  { icon: '🍪', label: 'Alfajor', keys: ['alfajor'] },
  { icon: '🍮', label: 'Dulce de leche', keys: ['dulce de leche'] },
  { icon: '🍦', label: 'Helado', keys: ['helado'] },
  { icon: '🍟', label: 'Papas fritas', keys: ['papas fritas'] },
  { icon: '🥗', label: 'Ensalada rusa', keys: ['ensalada rusa'] },
  { icon: '🥧', label: 'Tarta', keys: ['pascualina', 'tarta'] },
  { icon: '⚡', label: 'Creatina', keys: ['creatina', 'creatine'] },
  { icon: '🥤', label: 'Proteína en polvo', keys: ['whey', 'proteina en polvo', 'proteína en polvo', 'batido', 'caseina', 'caseína', 'isolate', 'shake'] },
  { icon: '☕', label: 'Café', keys: ['café', 'cafe', 'cortado', 'expreso', 'espresso', 'capuchino'] },
  { icon: '🧉', label: 'Mate', keys: ['mate', 'yerba'] },
  { icon: '🍵', label: 'Té', keys: ['té', 'infusión', 'infusion'] },
  { icon: '🍺', label: 'Cerveza', keys: ['cerveza'] },
  { icon: '🍷', label: 'Vino', keys: ['vino'] },
  { icon: '🧃', label: 'Jugo', keys: ['jugo', 'bebida deportiva'] },
  { icon: '🥤', label: 'Refresco', keys: ['refresco', 'gaseosa', 'cola'] },
  { icon: '🌱', label: 'Semillas', keys: ['chía', 'chia', 'lino', 'linaza', 'sésamo', 'sesamo', 'semilla', 'pepitas'] },
  { icon: '🌰', label: 'Frutos secos', keys: ['almendra', 'castaña', 'cajú', 'caju', 'avellana', 'pistacho', 'nuez', 'nueces', 'maní', 'mani', 'cacahuete'] },
  { icon: '🍇', label: 'Pasas y dátiles', keys: ['pasas', 'dátil', 'datil', 'uva'] },
  { icon: '🥥', label: 'Coco', keys: ['coco'] },
  { icon: '🍯', label: 'Miel', keys: ['miel'] },
  { icon: '🌾', label: 'Harinas', keys: ['harina', 'salvado', 'amaranto'] },
  { icon: '🍗', label: 'Pollo', keys: ['pollo', 'pechuga', 'muslo', 'contramuslo', 'chicken'] },
  { icon: '🦃', label: 'Pavo', keys: ['pavo'] },
  { icon: '🐄', label: 'Vaca / ternera', keys: ['ternera', 'vaca', 'carne de res', 'vacuno', 'buey', 'picada', 'molida', 'hamburguesa', 'bife', 'asado'] },
  { icon: '🥩', label: 'Carne', keys: ['carne', 'cerdo', 'lomo', 'solomillo', 'filete', 'chuleta', 'cordero', 'steak'] },
  { icon: '🐟', label: 'Pescado', keys: ['salmón', 'salmon', 'merluza', 'atún', 'atun', 'pescado', 'bacalao', 'dorada', 'lubina', 'sardina'] },
  { icon: '🦐', label: 'Marisco', keys: ['gamba', 'langostino', 'marisco', 'camarón', 'camaron'] },
  { icon: '🥚', label: 'Huevo', keys: ['huevo', 'clara', 'tortilla'] },
  { icon: '🥛', label: 'Leche', keys: ['leche'] },
  { icon: '🧀', label: 'Lácteo / queso', keys: ['queso', 'yogur', 'skyr', 'requesón', 'kefir'] },
  { icon: '🫘', label: 'Legumbres', keys: ['lenteja', 'garbanzo', 'frijol', 'alubia', 'poroto', 'tofu', 'soja', 'edamame'] },
  { icon: '🍚', label: 'Arroz', keys: ['arroz', 'rice'] },
  { icon: '🍝', label: 'Pasta', keys: ['pasta', 'espagueti', 'macarr', 'fideo', 'noodle'] },
  { icon: '🥔', label: 'Patata / boniato', keys: ['patata', 'papa', 'boniato', 'batata', 'camote'] },
  { icon: '🥣', label: 'Avena / cereal', keys: ['avena', 'quinoa', 'cereal', 'granola', 'cuscús', 'cuscus'] },
  { icon: '🍞', label: 'Pan', keys: ['pan', 'tostada', 'tortita', 'wrap', 'arepa'] },
  { icon: '🥦', label: 'Vegetales', keys: ['brócoli', 'brocoli', 'verdura', 'vegetal', 'calabac', 'pimiento', 'espinaca', 'judías verdes', 'judias verdes', 'ensalada', 'lechuga', 'coliflor', 'champiñ', 'zanahoria', 'cebolla', 'tomate', 'berenjena', 'espárrago', 'esparrago', 'pepino'] },
  { icon: '🥑', label: 'Grasas', keys: ['aguacate', 'palta', 'aceite', 'frutos secos', 'mantequilla'] },
  { icon: '🍌', label: 'Fruta', keys: ['plátano', 'platano', 'banana', 'manzana', 'fruta', 'fresa', 'arándano', 'naranja', 'kiwi'] },
  { icon: '🍫', label: 'Snack', keys: ['barrita', 'chocolate', 'cacao', 'snack', 'galleta'] },
  { icon: '🍽️', label: 'Comida', keys: [] },
]

export const DEFAULT_ICON = '🍽️'

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RULES = FOOD_ICONS.map(({ icon, keys }) => ({
  icon,
  // Coincide al inicio de palabra: "res" no salta con "fresa"
  re: keys.length ? new RegExp(`(^|[^a-záéíóúñü])(${keys.map(escape).join('|')})`, 'i') : null,
}))

export function detectIcon(name = '') {
  const n = name.toLowerCase()
  if (!n.trim()) return DEFAULT_ICON
  return RULES.find((r) => r.re?.test(n))?.icon ?? DEFAULT_ICON
}

// Icono de una receta: el elegido, el del nombre, o el ingrediente más prioritario
// (las proteínas van antes en FOOD_ICONS, así un lote de pollo con arroz sale 🍗)
export function recipeIcon(recipe) {
  if (recipe.icon) return recipe.icon
  const byName = detectIcon(recipe.name)
  if (byName !== DEFAULT_ICON) return byName
  const rank = (icon) => FOOD_ICONS.findIndex((f) => f.icon === icon)
  return (recipe.ingredients ?? [])
    .map((i) => detectIcon(i.name))
    .filter((i) => i !== DEFAULT_ICON)
    .sort((x, y) => rank(x) - rank(y))[0] ?? DEFAULT_ICON
}
