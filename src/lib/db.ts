import Dexie, { type EntityTable } from 'dexie'
import type { FoodItem } from './nutrition'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
]

export const mealLabel = (t: MealType) => MEAL_TYPES.find((m) => m.value === t)?.label ?? t

export interface Meal {
  id?: number
  date: string // YYYY-MM-DD
  type: MealType
  items: FoodItem[]
  thumbnail?: string // 縮小した JPEG の data URL
  createdAt: number
}

export interface Favorite {
  id?: number
  name: string
  items: FoodItem[]
  createdAt: number
}

/** 1日1件の体の記録 */
export interface BodyLog {
  date: string
  weight?: number // kg
  bodyFat?: number // %
  systolic?: number // mmHg
  diastolic?: number // mmHg
  pulse?: number // bpm
}

export interface Exercise {
  id?: number
  date: string
  name: string
  minutes: number
  mets?: number
  kcal: number
  createdAt: number
}

export const db = new Dexie('health-log') as Dexie & {
  meals: EntityTable<Meal, 'id'>
  favorites: EntityTable<Favorite, 'id'>
  bodyLogs: EntityTable<BodyLog, 'date'>
  exercises: EntityTable<Exercise, 'id'>
}

db.version(1).stores({
  meals: '++id, date, type, createdAt',
  favorites: '++id, name, createdAt',
  bodyLogs: 'date',
  exercises: '++id, date',
})

/** 指定日以前で最も新しい体重 */
export async function latestWeight(beforeOrOn: string): Promise<number | undefined> {
  const logs = await db.bodyLogs.where('date').belowOrEqual(beforeOrOn).reverse().toArray()
  return logs.find((l) => l.weight != null)?.weight
}
