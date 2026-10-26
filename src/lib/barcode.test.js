import { describe, expect, it } from 'vitest'
import { cleanBarcode, guessCategory, guessCategoryText, isValidBarcode, lookupBarcode, productToDraft, quantityGrams, usdaToDraft } from './barcode'

describe('código de barras', () => {
  it('limpia lo escrito a mano', () => {
    expect(cleanBarcode(' 3017 6204-22003 ')).toBe('3017620422003')
  })

  it('valida el dígito de control', () => {
    expect(isValidBarcode('3017620422003')).toBe(true) // EAN-13
    expect(isValidBarcode('3017620422004')).toBe(false)
    expect(isValidBarcode('96385074')).toBe(true) // EAN-8
    expect(isValidBarcode('036000291452')).toBe(true) // UPC-A
    expect(isValidBarcode('12345')).toBe(false)
  })

  it('lee el contenido del envase', () => {
    expect(quantityGrams('400 g e')).toBe(400)
    expect(quantityGrams('1 kg')).toBe(1000)
    expect(quantityGrams('1,5 L')).toBe(1500)
    expect(quantityGrams('6 x 200 ml')).toBe(1200)
    expect(quantityGrams('500 gr')).toBe(500)
    expect(quantityGrams('sin dato')).toBeNull()
  })

  it('adivina la categoría', () => {
    expect(guessCategory(['en:dairies', 'en:milks', 'en:beverages'])).toBe('dairy')
    expect(guessCategory(['en:beverages', 'en:sodas'])).toBe('drinks')
    expect(guessCategory(['en:protein-powders'])).toBe('supplements')
    expect(guessCategory(['en:spreads'])).toBe('pantry')
    expect(guessCategory([])).toBe('pantry')
  })

  it('arma el alimento con los valores por 100 g', () => {
    const d = productToDraft({
      product_name: 'Nutella', brands: 'Nutella, Ferrero', quantity: '400 g',
      nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, fat_100g: 30.9, carbohydrates_100g: 57.5, fiber_100g: 0 },
      categories_tags: ['en:spreads'],
    }, '3017620422003')
    expect(d).toMatchObject({ name: 'Nutella', kcal: 539, protein: 6.3, fat: 30.9, carbs: 57.5, fiber: 0, category: 'pantry', liquid: false, missing: [] })
    expect(d.pack).toEqual({ per: '400 g', grams: 400 })
    expect(productToDraft({ quantity: '400 g e', nutriments: {} }, '1').quantity).toBe('400 g')
  })

  it('suma la marca al nombre, pasa kJ a kcal y marca lo que falta', () => {
    const d = productToDraft({
      product_name_es: 'Leche descremada', brands: 'Conaprole', quantity: '1 L', serving_quantity: 200, serving_size: '1 vaso (200 ml)',
      nutriments: { 'energy-kj_100g': 146, proteins_100g: 3.2 },
    }, '7730000000000')
    expect(d.name).toBe('Leche descremada Conaprole')
    expect(d.kcal).toBe(35)
    expect(d.liquid).toBe(true)
    expect(d.missing).toEqual(['fat', 'carbs'])
    expect(d.unit).toMatchObject({ label: 'porción', grams: 200 })
  })
})

describe('búsqueda en cadena', () => {
  const full = { name: 'Fideos', kcal: 350, protein: 12, fat: 1.5, carbs: 72, image: null }
  const photoOnly = { name: '', kcal: null, protein: null, image: 'foto.jpg' }
  const src = (label, fn) => ({ id: label, label, lookup: fn })

  it('si la primera no lo tiene, pasa a la siguiente', async () => {
    const r = await lookupBarcode('1', { sources: [src('A', async () => null), src('B', async () => full)] })
    expect(r.status).toBe('found')
    expect(r.draft.source).toBe('B')
    expect(r.tried.map((t) => t.result)).toEqual(['missing', 'found'])
  })

  it('una fuente con solo foto no corta la búsqueda y la foto se aprovecha', async () => {
    const r = await lookupBarcode('1', { sources: [src('A', async () => photoOnly), src('B', async () => full)] })
    expect(r.status).toBe('found')
    expect(r.draft.image).toBe('foto.jpg')
  })

  it('si ninguna tiene valores, devuelve lo parcial', async () => {
    const r = await lookupBarcode('1', { sources: [src('A', async () => photoOnly), src('B', async () => null)] })
    expect(r).toMatchObject({ status: 'partial', draft: { image: 'foto.jpg', source: 'A' } })
  })

  it('una fuente caída no frena las demás', async () => {
    const r = await lookupBarcode('1', { sources: [src('A', async () => { throw new Error('sin conexión') }), src('B', async () => full)] })
    expect(r.status).toBe('found')
    expect(r.tried[0]).toMatchObject({ result: 'error', detail: 'sin conexión' })
  })

  it('nada en ningún lado', async () => {
    const r = await lookupBarcode('1', { sources: [src('A', async () => null)] })
    expect(r.status).toBe('missing')
  })

  it('el producto de Open Food Facts con solo foto queda sin valores', () => {
    const d = productToDraft({ image_front_small_url: 'x.jpg', nutriments: {} }, '8445290114181')
    expect(d.kcal).toBeNull()
    expect(d.missing).toEqual(['kcal', 'protein', 'fat', 'carbs'])
  })
})

describe('USDA', () => {
  it('convierte un producto con sus nutrientes por 100 g', () => {
    const d = usdaToDraft({
      description: 'INSTANT COFFEE', brandName: 'NESCAFE', gtinUpc: '028000123456', foodCategory: 'Coffee',
      servingSize: 2, servingSizeUnit: 'g', packageWeight: '7 oz/200 g',
      foodNutrients: [
        { nutrientNumber: '208', value: 352 }, { nutrientNumber: '203', value: 12.2 },
        { nutrientNumber: '204', value: 0.5 }, { nutrientNumber: '205', value: 75.6 },
      ],
    }, '0028000123456')
    expect(d).toMatchObject({ name: 'Instant coffee Nescafe', kcal: 352, protein: 12.2, carbs: 75.6, category: 'drinks', missing: [] })
    expect(d.pack.grams).toBe(200)
  })

  it('categoría por texto en inglés o español', () => {
    expect(guessCategoryText('Pasta by Shape & Type')).toBe('carbs')
    expect(guessCategoryText('Atún en aceite')).toBe('fish')
    expect(guessCategoryText('Hongos secos')).toBe('veg')
  })
})
