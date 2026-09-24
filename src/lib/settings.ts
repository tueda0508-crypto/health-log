import { useSyncExternalStore } from 'react'
import type { Nutrients } from './nutrition'

export type Sex = 'male' | 'female'
export type Activity = 'low' | 'normal' | 'high' | 'veryHigh'
export type Goal = 'lose' | 'maintain' | 'gain'

export const ACTIVITY_OPTIONS: { value: Activity; label: string; factor: number }[] = [
  { value: 'low', label: 'ほぼ座って過ごす', factor: 1.2 },
  { value: 'normal', label: '軽い運動（週1〜3回）', factor: 1.375 },
  { value: 'high', label: '適度な運動（週3〜5回）', factor: 1.55 },
  { value: 'veryHigh', label: '激しい運動（ほぼ毎日）', factor: 1.725 },
]

export const GOAL_OPTIONS: { value: Goal; label: string; delta: number }[] = [
  { value: 'lose', label: '減量（−500kcal/日）', delta: -500 },
  { value: 'maintain', label: '維持', delta: 0 },
  { value: 'gain', label: '増量（+300kcal/日）', delta: 300 },
]

export type ModelId = 'claude-sonnet-5' | 'claude-haiku-4-5'

export const MODEL_OPTIONS: { value: ModelId; label: string }[] = [
  { value: 'claude-sonnet-5', label: 'Sonnet 5（標準・高精度）' },
  { value: 'claude-haiku-4-5', label: 'Haiku 4.5（安い・速い）' },
]

export interface Profile {
  sex: Sex
  age: number
  height: number // cm
  weight: number // kg（体重記録がない場合の初期値）
  activity: Activity
  goal: Goal
}

export type TargetKey = 'kcal' | 'protein' | 'fat' | 'carbs' | 'fiber' | 'salt'
export type Targets = Pick<Nutrients, TargetKey>

export interface Settings {
  profile: Profile | null
  /** 手動で上書きした目標値（未設定の項目は自動計算） */
  targetOverrides: Partial<Targets>
  apiKey: string
  model: ModelId
  lastExportAt: number | null
}

const KEY = 'health-log:settings'

const DEFAULTS: Settings = {
  profile: null,
  targetOverrides: {},
  apiKey: '',
  model: 'claude-sonnet-5',
  lastExportAt: null,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    // 読めない場合は初期値
  }
  return DEFAULTS
}

let current = load()
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // 保存できなくてもメモリ上の値で動かす
  }
  listeners.forEach((l) => l())
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

/** Mifflin-St Jeor 式による基礎代謝 */
export function bmr(p: Profile, weight: number): number {
  const base = 10 * weight + 6.25 * p.height - 5 * p.age
  return p.sex === 'male' ? base + 5 : base - 161
}

/** プロフィールから目標値を自動計算（PFC = 15:25:60） */
export function autoTargets(p: Profile, weight: number): Targets {
  const factor = ACTIVITY_OPTIONS.find((a) => a.value === p.activity)?.factor ?? 1.375
  const delta = GOAL_OPTIONS.find((g) => g.value === p.goal)?.delta ?? 0
  const kcal = Math.max(1200, Math.round(bmr(p, weight) * factor + delta))
  return {
    kcal,
    protein: Math.round((kcal * 0.15) / 4),
    fat: Math.round((kcal * 0.25) / 9),
    carbs: Math.round((kcal * 0.6) / 4),
    // 日本人の食事摂取基準（2025年版）の目標量を目安にする
    fiber: p.sex === 'male' ? 22 : 18,
    salt: p.sex === 'male' ? 7.5 : 6.5,
  }
}

export function resolveTargets(s: Settings, weight?: number): Targets | null {
  if (!s.profile) return null
  const auto = autoTargets(s.profile, weight ?? s.profile.weight)
  return { ...auto, ...s.targetOverrides }
}
