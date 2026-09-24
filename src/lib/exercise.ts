export const EXERCISE_PRESETS: { name: string; mets: number }[] = [
  { name: 'ウォーキング（普通）', mets: 3.5 },
  { name: 'ウォーキング（速歩き）', mets: 4.3 },
  { name: 'ジョギング', mets: 7.0 },
  { name: 'ランニング', mets: 9.8 },
  { name: 'サイクリング', mets: 6.8 },
  { name: '水泳', mets: 6.0 },
  { name: '筋トレ', mets: 5.0 },
  { name: 'ヨガ', mets: 2.5 },
  { name: 'ストレッチ', mets: 2.3 },
  { name: '階段昇り', mets: 8.8 },
  { name: '家事（掃除など）', mets: 3.3 },
]

/** 消費カロリー（kcal）= METs × 体重(kg) × 時間(h) × 1.05 */
export function exerciseKcal(mets: number, weightKg: number, minutes: number): number {
  return Math.round(mets * weightKg * (minutes / 60) * 1.05)
}
