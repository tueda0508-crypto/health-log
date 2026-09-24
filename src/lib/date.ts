/** ローカル時刻の YYYY-MM-DD */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function formatDateJa(key: string): string {
  const d = fromDateKey(key)
  const w = '日月火水木金土'[d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日（${w}）`
}

export function formatShort(key: string): string {
  const d = fromDateKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
