import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { db, latestWeight } from './db'
import { sumItems, zeroNutrients, addNutrients } from './nutrition'
import { resolveTargets, useSettings } from './settings'
import { toDateKey } from './date'

/** URL の ?date= を選択中の日付として扱う */
export function useSelectedDate(): [string, (d: string) => void] {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? toDateKey()
  const setDate = (d: string) => {
    const next = new URLSearchParams(params)
    if (d === toDateKey()) next.delete('date')
    else next.set('date', d)
    setParams(next, { replace: true })
  }
  return [date, setDate]
}

export function useDayData(date: string) {
  const settings = useSettings()
  const meals = useLiveQuery(() => db.meals.where('date').equals(date).sortBy('createdAt'), [date])
  const exercises = useLiveQuery(() => db.exercises.where('date').equals(date).toArray(), [date])
  const body = useLiveQuery(() => db.bodyLogs.get(date), [date])
  const weight = useLiveQuery(() => latestWeight(date), [date])

  const intake = (meals ?? []).reduce((acc, m) => addNutrients(acc, sumItems(m.items)), zeroNutrients())
  const burned = (exercises ?? []).reduce((acc, e) => acc + e.kcal, 0)
  const currentWeight = weight ?? settings.profile?.weight
  const targets = resolveTargets(settings, currentWeight)

  return {
    loading: meals === undefined,
    meals: meals ?? [],
    exercises: exercises ?? [],
    body,
    intake,
    burned,
    targets,
    currentWeight,
  }
}
