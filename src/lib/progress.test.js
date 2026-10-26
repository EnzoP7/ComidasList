import { describe, expect, it } from 'vitest'
import { addDays } from './date'
import { mealEntry } from './meals'
import { DEFAULT_SETTINGS, computePlan, dayChecks, goalsFor, goalsOf, sameGoals } from './model'
import { adaptiveTdee, fitLine, phaseStatus, projectGoal, startBreak } from './progress'
import { SCHEMA_VERSION, validateBackup } from './storage'
import { bestSet, e1rm, knownExercises, lastSession, recordBefore, strengthProgress } from './strength'

const TODAY = '2026-10-26'
const back = (n) => addDays(TODAY, -n)

describe('copias de seguridad', () => {
  const ok = { app: 'recomp', version: 1, data: { settings: { age: 23 }, logs: { '2026-10-01': { weight: 83 } }, recipes: [] } }

  it('acepta una copia válida de la versión anterior', () => {
    const data = validateBackup(ok)
    expect(data.settings.age).toBe(23)
    expect(data.logs['2026-10-01'].weight).toBe(83)
    expect(data.prices).toBeUndefined()
  })

  it('rechaza archivos que no son de la app', () => {
    expect(() => validateBackup({ foo: 1 })).toThrow(/no es una copia/)
    expect(() => validateBackup(null)).toThrow()
  })

  it('rechaza copias de una versión más nueva', () => {
    expect(() => validateBackup({ ...ok, version: SCHEMA_VERSION + 1 })).toThrow(/más nueva/)
  })

  it('rechaza datos con forma incorrecta sin escribir nada', () => {
    expect(() => validateBackup({ ...ok, data: { ...ok.data, recipes: {} } })).toThrow(/recipes/)
    expect(() => validateBackup({ ...ok, data: { logs: { ayer: {} } } })).toThrow(/ayer/)
  })
})

describe('metas por día', () => {
  const settings = { ...DEFAULT_SETTINGS, calorieGoal: 2400, proteinGoal: 165, stepsGoal: 10000, waterGoal: 3 }
  const meals = [{ kcal: 2300, protein: 170 }]

  it('un día se juzga con las metas que tenía, no con las de hoy', () => {
    const day = { meals, steps: 11000, water: [{ ml: 3000 }], goals: goalsOf(settings) }
    expect(dayChecks(day, settings).inPlan).toBe(true)
    // Bajar el objetivo a 2.000 kcal no saca del plan un día viejo
    expect(dayChecks(day, { ...settings, calorieGoal: 2000 }).inPlan).toBe(true)
    // Un día sin metas guardadas sí usa las actuales
    expect(dayChecks({ ...day, goals: undefined }, { ...settings, calorieGoal: 2000 }).inPlan).toBe(false)
  })

  it('compara y combina metas', () => {
    expect(sameGoals(goalsOf(settings), goalsOf({ ...settings }))).toBe(true)
    expect(sameGoals(goalsOf(settings), goalsOf({ ...settings, proteinGoal: 160 }))).toBe(false)
    expect(goalsFor({ goals: { proteinGoal: 150 } }, settings).proteinGoal).toBe(150)
  })
})

describe('plan', () => {
  it('en la semana de mantenimiento el objetivo es el mantenimiento', () => {
    const plan = computePlan(DEFAULT_SETTINGS, 83.5, { onBreak: true })
    expect(plan.calorieGoal).toBe(plan.tdee)
    expect(plan.deficit).toBe(0)
  })

  it('usa el mantenimiento medido si se eligió', () => {
    const plan = computePlan({ ...DEFAULT_SETTINGS, maintenanceSource: 'measured', measuredTdee: 3000 }, 83.5)
    expect(plan.tdee).toBe(3000)
    expect(plan.calorieGoal).toBe(Math.round((3000 * 0.85) / 10) * 10)
    expect(plan.formulaTdee).not.toBe(3000)
  })

  it('calcula la meta de fibra según las calorías', () => {
    const plan = computePlan(DEFAULT_SETTINGS, 83.5)
    expect(plan.fiber).toBe(Math.round((plan.calorieGoal / 1000) * 14))
  })

  it('las comidas guardan la fibra', () => {
    expect(mealEntry({ name: 'x', kind: 'meal', total: { kcal: 500, protein: 30, fat: 10, carbs: 60, fiber: 8.44 }, priced: 0 }).fiber).toBe(8.4)
  })
})

describe('mantenimiento medido', () => {
  // 21 días comiendo 2.400 kcal y bajando 0,5 kg por semana → mantenimiento ≈ 2.400 + 550
  const logs = {}
  for (let i = 0; i < 21; i++) {
    const k = back(21 - i)
    logs[k] = { meals: [{ kcal: 2400, protein: 160 }], weight: i % 2 === 0 ? 85 - (0.5 / 7) * i : null }
  }

  it('estima el gasto con ingesta y cambio de peso', () => {
    const r = adaptiveTdee(logs, back(1))
    expect(r.status).toBe('ok')
    expect(r.intake).toBe(2400)
    expect(r.kgPerWeek).toBeCloseTo(-0.5, 2)
    expect(r.tdee).toBe(2950)
  })

  it('espera si faltan datos o los días están incompletos', () => {
    const partial = Object.fromEntries(Object.entries(logs).map(([k, d]) => [k, { ...d, meals: [{ kcal: 600 }] }]))
    const r = adaptiveTdee(partial, back(1))
    expect(r.status).toBe('waiting')
    expect(r.intakeDays).toBe(0)
  })
})

describe('proyección de metas', () => {
  it('recta por mínimos cuadrados', () => {
    const line = fitLine([{ x: 0, y: 10 }, { x: 1, y: 8 }, { x: 2, y: 6 }])
    expect(line.slope).toBeCloseTo(-2)
    expect(line.at(3)).toBeCloseTo(4)
  })

  it('estima la fecha para llegar a la meta', () => {
    // Cintura: 90 → baja 0,5 cm por semana, medida cada 7 días
    const logs = {}
    for (let w = 0; w < 4; w++) logs[back(21 - w * 7)] = { waist: 90 - 0.5 * w }
    const p = projectGoal(logs, TODAY, 'waist', 85, { days: 28, minPoints: 3 })
    expect(p.status).toBe('ok')
    expect(p.perWeek).toBeCloseTo(-0.5, 2)
    expect(p.current).toBeCloseTo(88.5, 1)
    expect(p.daysLeft).toBe(49) // 3,5 cm a 0,5 cm por semana
    expect(p.date > TODAY).toBe(true)
  })

  it('avisa si no se acerca o si ya llegó', () => {
    const flat = { [back(20)]: { waist: 90 }, [back(10)]: { waist: 90 }, [back(0)]: { waist: 90 } }
    expect(projectGoal(flat, TODAY, 'waist', 85).status).toBe('stalled')
    expect(projectGoal(flat, TODAY, 'waist', 92).status).toBe('reached')
    expect(projectGoal(flat, TODAY, 'waist', null).status).toBe('no-goal')
    expect(projectGoal({}, TODAY, 'waist', 85).status).toBe('waiting')
  })
})

describe('fases de déficit', () => {
  it('cuenta las semanas y avisa al terminar', () => {
    expect(phaseStatus({ ...DEFAULT_SETTINGS, phaseStart: back(14) }, TODAY)).toMatchObject({ status: 'active', week: 3, limit: 12 })
    expect(phaseStatus({ ...DEFAULT_SETTINGS, phaseStart: back(84) }, TODAY).status).toBe('due')
    expect(phaseStatus(DEFAULT_SETTINGS, TODAY).status).toBe('none')
  })

  it('el agresivo se limita a 8 semanas', () => {
    expect(phaseStatus({ ...DEFAULT_SETTINGS, deficitLevel: 'aggressive', phaseStart: back(56) }, TODAY).status).toBe('due')
  })

  it('la semana de mantenimiento dura 7 días y después arranca una fase nueva', () => {
    const s = { ...DEFAULT_SETTINGS, ...startBreak(TODAY) }
    expect(phaseStatus(s, TODAY)).toMatchObject({ status: 'break', daysLeft: 7 })
    expect(phaseStatus(s, addDays(TODAY, 6)).status).toBe('break')
    expect(phaseStatus(s, addDays(TODAY, 7))).toMatchObject({ status: 'active', week: 1 })
  })
})

describe('fuerza', () => {
  const day = (sets) => ({ training: [{ id: 't', type: 'strength', minutes: 60, sets }] })
  const logs = {
    [back(14)]: day([{ exercise: 'Sentadilla', kg: 80, reps: 8 }, { exercise: 'Dominadas', kg: 0, reps: 6 }]),
    [back(7)]: day([{ exercise: 'sentadilla ', kg: 80, reps: 10 }, { exercise: 'Dominadas', kg: 0, reps: 8 }]),
    [TODAY]: day([{ exercise: 'Sentadilla', kg: 85, reps: 8 }, { exercise: 'Sentadilla', kg: 85, reps: 6 }]),
  }

  it('1RM estimado con Epley', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(80, 8)).toBeCloseTo(101.33, 1)
    expect(e1rm(0, 10)).toBe(0)
  })

  it('elige la mejor serie', () => {
    expect(bestSet([{ kg: 85, reps: 6 }, { kg: 85, reps: 8 }]).reps).toBe(8)
    expect(bestSet([{ kg: 0, reps: 6 }, { kg: 0, reps: 9 }]).reps).toBe(9)
  })

  it('encuentra la vez pasada y el récord ignorando mayúsculas y espacios', () => {
    expect(lastSession(logs, 'SENTADILLA', TODAY).day).toBe(back(7))
    expect(recordBefore(logs, 'Sentadilla', TODAY).reps).toBe(10)
    expect(lastSession(logs, 'Press banca', TODAY)).toBeNull()
  })

  it('progresión del período: con peso por 1RM, sin peso por reps', () => {
    const rows = strengthProgress(logs, [back(14), back(7), TODAY])
    const squat = rows.find((r) => r.name === 'Sentadilla')
    expect(squat.sessions).toBe(3)
    expect(squat.change).toBeCloseTo(e1rm(85, 8) / e1rm(80, 8) - 1, 3)
    const pull = rows.find((r) => r.name === 'Dominadas')
    expect(pull.weighted).toBe(false)
    expect(pull.change).toBeCloseTo(2 / 6, 3)
  })

  it('lista los ejercicios usados, el más frecuente primero', () => {
    expect(knownExercises(logs)).toEqual(['Sentadilla', 'Dominadas'])
  })
})
