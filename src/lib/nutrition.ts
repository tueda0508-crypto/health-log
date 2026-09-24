export interface Nutrients {
  kcal: number
  protein: number // g
  fat: number // g
  carbs: number // g（炭水化物 = 糖質 + 食物繊維）
  sugar: number // g（糖質）
  fiber: number // g
  salt: number // g（食塩相当量）
}

export const NUTRIENT_KEYS = ['kcal', 'protein', 'fat', 'carbs', 'sugar', 'fiber', 'salt'] as const
export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

export const NUTRIENT_LABELS: Record<NutrientKey, { label: string; unit: string }> = {
  kcal: { label: 'エネルギー', unit: 'kcal' },
  protein: { label: 'たんぱく質', unit: 'g' },
  fat: { label: '脂質', unit: 'g' },
  carbs: { label: '炭水化物', unit: 'g' },
  sugar: { label: '糖質', unit: 'g' },
  fiber: { label: '食物繊維', unit: 'g' },
  salt: { label: '塩分', unit: 'g' },
}

/** 食事の1品目。base は baseAmount あたりの栄養値で、量を変えると比例計算する */
export interface FoodItem {
  name: string
  amount: number
  unit: string
  baseAmount: number
  base: Nutrients
}

export const zeroNutrients = (): Nutrients => ({
  kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0,
})

export function scaleNutrients(n: Nutrients, ratio: number): Nutrients {
  const out = zeroNutrients()
  for (const k of NUTRIENT_KEYS) out[k] = n[k] * ratio
  return out
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = zeroNutrients()
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k]
  return out
}

export function itemNutrients(item: FoodItem): Nutrients {
  if (item.baseAmount <= 0) return scaleNutrients(item.base, 0)
  return scaleNutrients(item.base, item.amount / item.baseAmount)
}

export function sumItems(items: FoodItem[]): Nutrients {
  return items.reduce((acc, it) => addNutrients(acc, itemNutrients(it)), zeroNutrients())
}

export function fmt(v: number, key: NutrientKey | 'g' = 'g'): string {
  if (key === 'kcal') return Math.round(v).toLocaleString()
  return (Math.round(v * 10) / 10).toFixed(1)
}
