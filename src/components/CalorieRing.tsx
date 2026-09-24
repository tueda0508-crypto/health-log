export default function CalorieRing({ intake, target, burned }: { intake: number; target: number; burned: number }) {
  const budget = target + burned
  const remaining = budget - intake
  const ratio = budget > 0 ? Math.min(intake / budget, 1) : 0
  const over = remaining < 0
  const r = 70
  const c = 2 * Math.PI * r

  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 180 180" className="ring" role="img" aria-label={`摂取 ${Math.round(intake)}kcal / 目標 ${Math.round(budget)}kcal`}>
        <circle cx="90" cy="90" r={r} className="ring-track" />
        <circle
          cx="90"
          cy="90"
          r={r}
          className={over ? 'ring-value over' : 'ring-value'}
          strokeDasharray={`${c * ratio} ${c}`}
          transform="rotate(-90 90 90)"
        />
        <text x="90" y="78" textAnchor="middle" className="ring-caption">{over ? 'オーバー' : 'あと'}</text>
        <text x="90" y="106" textAnchor="middle" className="ring-number">{Math.abs(Math.round(remaining)).toLocaleString()}</text>
        <text x="90" y="126" textAnchor="middle" className="ring-caption">kcal</text>
      </svg>
      <dl className="ring-stats">
        <div><dt>目標</dt><dd>{Math.round(target).toLocaleString()}</dd></div>
        <div><dt>摂取</dt><dd>{Math.round(intake).toLocaleString()}</dd></div>
        <div><dt>運動</dt><dd>+{Math.round(burned).toLocaleString()}</dd></div>
      </dl>
    </div>
  )
}
