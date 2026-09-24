import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Chart as ChartJS,
  BarController,
  LineController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { db } from '../lib/db'
import { addDays, formatShort, toDateKey } from '../lib/date'
import { addNutrients, sumItems, zeroNutrients, type Nutrients } from '../lib/nutrition'
import { resolveTargets, useSettings } from '../lib/settings'

// 棒グラフに目標の折れ線を重ねるため、両方のコントローラーを登録する
ChartJS.register(BarController, LineController, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

const COLORS = {
  kcal: '#16a34a',
  target: '#9ca3af',
  protein: '#e11d48',
  fat: '#f59e0b',
  carbs: '#2563eb',
  weight: '#16a34a',
  bodyFat: '#f59e0b',
  systolic: '#e11d48',
  diastolic: '#2563eb',
}

const PERIODS = [
  { days: 7, label: '1週間' },
  { days: 30, label: '1か月' },
  { days: 90, label: '3か月' },
]

function cssColor(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export default function ChartsPage() {
  const [days, setDays] = useState(7)
  const settings = useSettings()
  const end = toDateKey()
  const start = addDays(end, -(days - 1))
  const keys = Array.from({ length: days }, (_, i) => addDays(start, i))
  const labels = keys.map(formatShort)
  const textColor = cssColor('--muted', '#6b7280')
  const gridColor = cssColor('--border', '#e5e7eb')

  const data = useLiveQuery(async () => {
    const [meals, bodyLogs] = await Promise.all([
      db.meals.where('date').between(start, end, true, true).toArray(),
      db.bodyLogs.where('date').between(start, end, true, true).toArray(),
    ])
    const byDay = new Map<string, Nutrients>()
    for (const m of meals) byDay.set(m.date, addNutrients(byDay.get(m.date) ?? zeroNutrients(), sumItems(m.items)))
    const bodyByDay = new Map(bodyLogs.map((b) => [b.date, b]))
    return { byDay, bodyByDay }
  }, [start, end])

  if (!data) return <div className="page"><p className="muted center">読み込み中…</p></div>

  const { byDay, bodyByDay } = data
  const intake = keys.map((k) => byDay.get(k))
  const targets = resolveTargets(settings)
  const recorded = intake.filter(Boolean) as Nutrients[]
  const avg = (key: keyof Nutrients) => (recorded.length ? recorded.reduce((a, n) => a + n[key], 0) / recorded.length : 0)

  const weights = keys.map((k) => bodyByDay.get(k)?.weight ?? null)
  const fats = keys.map((k) => bodyByDay.get(k)?.bodyFat ?? null)
  const sys = keys.map((k) => bodyByDay.get(k)?.systolic ?? null)
  const dia = keys.map((k) => bodyByDay.get(k)?.diastolic ?? null)
  const hasBody = weights.some((v) => v != null) || fats.some((v) => v != null)
  const hasBp = sys.some((v) => v != null)

  const base: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { labels: { color: textColor, boxWidth: 12 } } },
    scales: {
      x: { ticks: { color: textColor, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } },
    },
  }

  return (
    <div className="page">
      <h1 className="page-title">グラフ</h1>
      <div className="segmented">
        {PERIODS.map((p) => (
          <button key={p.days} className={days === p.days ? 'seg active' : 'seg'} onClick={() => setDays(p.days)}>{p.label}</button>
        ))}
      </div>

      <section className="card">
        <h2>摂取カロリー</h2>
        <p className="muted small">記録した日の平均 {Math.round(avg('kcal')).toLocaleString()} kcal（{recorded.length}日分）</p>
        <div className="chart">
          <Bar
            options={base as ChartOptions<'bar'>}
            data={{
              labels,
              datasets: [
                { type: 'bar' as const, label: '摂取', data: intake.map((n) => (n ? Math.round(n.kcal) : null)), backgroundColor: COLORS.kcal, borderRadius: 4 },
                ...(targets
                  ? [{ type: 'line' as const, label: '目標', data: keys.map(() => targets.kcal), borderColor: COLORS.target, borderDash: [4, 4], pointRadius: 0, borderWidth: 1.5 }]
                  : []),
              ] as never,
            }}
          />
        </div>
      </section>

      <section className="card">
        <h2>PFC（g）</h2>
        <p className="muted small">
          平均 P {Math.round(avg('protein'))} / F {Math.round(avg('fat'))} / C {Math.round(avg('carbs'))} g ・ 塩分 {avg('salt').toFixed(1)} g
        </p>
        <div className="chart">
          <Bar
            options={{ ...(base as ChartOptions<'bar'>), scales: { ...base.scales, x: { ...base.scales!.x, stacked: true }, y: { ...base.scales!.y, stacked: true } } } as ChartOptions<'bar'>}
            data={{
              labels,
              datasets: [
                { label: 'たんぱく質', data: intake.map((n) => (n ? Math.round(n.protein) : null)), backgroundColor: COLORS.protein },
                { label: '脂質', data: intake.map((n) => (n ? Math.round(n.fat) : null)), backgroundColor: COLORS.fat },
                { label: '炭水化物', data: intake.map((n) => (n ? Math.round(n.carbs) : null)), backgroundColor: COLORS.carbs },
              ],
            }}
          />
        </div>
      </section>

      <section className="card">
        <h2>体重・体脂肪率</h2>
        {hasBody ? (
          <div className="chart">
            <Line
              options={{
                ...(base as ChartOptions<'line'>),
                spanGaps: true,
                scales: {
                  x: base.scales!.x,
                  y: { ...base.scales!.y, position: 'left', title: { display: true, text: 'kg', color: textColor } },
                  y1: { ticks: { color: textColor }, position: 'right', grid: { display: false }, title: { display: true, text: '%', color: textColor } },
                },
              } as ChartOptions<'line'>}
              data={{
                labels,
                datasets: [
                  { label: '体重', data: weights, borderColor: COLORS.weight, backgroundColor: COLORS.weight, yAxisID: 'y', tension: 0.3 },
                  { label: '体脂肪率', data: fats, borderColor: COLORS.bodyFat, backgroundColor: COLORS.bodyFat, yAxisID: 'y1', tension: 0.3 },
                ],
              }}
            />
          </div>
        ) : (
          <p className="muted small">この期間の記録がありません</p>
        )}
      </section>

      <section className="card">
        <h2>血圧</h2>
        {hasBp ? (
          <div className="chart">
            <Line
              options={{ ...(base as ChartOptions<'line'>), spanGaps: true }}
              data={{
                labels,
                datasets: [
                  { label: '上', data: sys, borderColor: COLORS.systolic, backgroundColor: COLORS.systolic, tension: 0.3 },
                  { label: '下', data: dia, borderColor: COLORS.diastolic, backgroundColor: COLORS.diastolic, tension: 0.3 },
                ],
              }}
            />
          </div>
        ) : (
          <p className="muted small">この期間の記録がありません</p>
        )}
      </section>
    </div>
  )
}
