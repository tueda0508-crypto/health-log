import { fmt, NUTRIENT_LABELS, type Nutrients } from '../lib/nutrition'
import type { Targets } from '../lib/settings'

type Row = { key: keyof Nutrients; limit?: boolean }

const ROWS: Row[] = [
  { key: 'protein' },
  { key: 'fat' },
  { key: 'carbs' },
  { key: 'sugar' },
  { key: 'fiber' },
  { key: 'salt', limit: true },
]

export default function NutrientBars({ intake, targets }: { intake: Nutrients; targets: Targets | null }) {
  return (
    <div className="bars">
      {ROWS.map(({ key, limit }) => {
        // 糖質は目標値を持たないので undefined になる
        const target = (targets as Partial<Nutrients> | null)?.[key]
        const value = intake[key]
        const ratio = target ? value / target : 0
        const over = target != null && ratio > (limit ? 1 : 1.2)
        return (
          <div className="bar-row" key={key}>
            <div className="bar-head">
              <span className={`bar-name n-${key}`}>{NUTRIENT_LABELS[key].label}</span>
              <span className={over ? 'bar-val over' : 'bar-val'}>
                {fmt(value)}
                {target != null && <span className="muted"> / {fmt(target)}</span>}
                <span className="muted"> {NUTRIENT_LABELS[key].unit}</span>
                {limit && <span className="muted">（上限）</span>}
              </span>
            </div>
            {target != null && (
              <div className="bar-track">
                <div className={`bar-fill n-${key}${over ? ' over' : ''}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
