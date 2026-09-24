import { addDays, formatDateJa, toDateKey } from '../lib/date'

export default function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = toDateKey()
  return (
    <div className="date-nav">
      <button className="icon-btn" onClick={() => onChange(addDays(date, -1))} aria-label="前の日">‹</button>
      <label className="date-label">
        {date === today ? '今日 ' : ''}
        {formatDateJa(date)}
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="日付を選ぶ"
        />
      </label>
      <button className="icon-btn" onClick={() => onChange(addDays(date, 1))} disabled={date >= today} aria-label="次の日">›</button>
    </div>
  )
}
