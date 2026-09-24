import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import DateNav from '../components/DateNav'
import CalorieRing from '../components/CalorieRing'
import NutrientBars from '../components/NutrientBars'
import { useDayData, useSelectedDate } from '../lib/hooks'
import { db, MEAL_TYPES } from '../lib/db'
import { sumItems } from '../lib/nutrition'
import { useSettings } from '../lib/settings'
import { backupOverdue } from '../lib/backup'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

export default function HomePage() {
  const [date, setDate] = useSelectedDate()
  const { meals, intake, burned, targets, body } = useDayData(date)
  const settings = useSettings()
  const firstMeal = useLiveQuery(() => db.meals.orderBy('createdAt').first(), [])

  return (
    <div className="page">
      <DateNav date={date} onChange={setDate} />

      {!settings.profile && (
        <Link to="/settings" className="notice">
          👋 はじめに<strong>設定</strong>でプロフィールとAPIキーを登録してください
        </Link>
      )}
      {settings.profile && !isStandalone() && /iPhone|iPad/.test(navigator.userAgent) && (
        <div className="notice">
          📲 Safari の共有ボタン →「ホーム画面に追加」から起動すると、データが消えにくくなります
        </div>
      )}
      {backupOverdue(settings.lastExportAt, firstMeal?.createdAt) && (
        <Link to="/settings#backup" className="notice warn">
          💾 1週間以上バックアップしていません。設定から書き出しましょう
        </Link>
      )}

      <section className="card">
        {targets ? (
          <CalorieRing intake={intake.kcal} target={targets.kcal} burned={burned} />
        ) : (
          <p className="muted center">摂取 {Math.round(intake.kcal)} kcal（目標はプロフィール登録後に表示）</p>
        )}
        <NutrientBars intake={intake} targets={targets} />
      </section>

      {MEAL_TYPES.map(({ value, label }) => {
        const list = meals.filter((m) => m.type === value)
        const kcal = list.reduce((a, m) => a + sumItems(m.items).kcal, 0)
        return (
          <section className="card meal-section" key={value}>
            <div className="meal-head">
              <h2>{label}</h2>
              <span className="muted">{Math.round(kcal)} kcal</span>
              <Link className="btn small" to={`/meal/new?date=${date}&type=${value}`}>＋ 記録</Link>
            </div>
            {list.map((m) => (
              <Link to={`/meal/${m.id}`} className="meal-row" key={m.id}>
                {m.thumbnail ? <img src={m.thumbnail} alt="" className="thumb" /> : <div className="thumb placeholder">🍽</div>}
                <div className="meal-row-body">
                  <div className="meal-names">{m.items.map((i) => i.name).join('、')}</div>
                  <div className="muted small">{Math.round(sumItems(m.items).kcal)} kcal</div>
                </div>
              </Link>
            ))}
          </section>
        )
      })}

      <Link to={`/body?date=${date}`} className="card body-summary">
        <h2>体の記録</h2>
        {body && (body.weight || body.bodyFat || body.systolic) ? (
          <div className="chips">
            {body.weight != null && <span className="chip">体重 {body.weight} kg</span>}
            {body.bodyFat != null && <span className="chip">体脂肪 {body.bodyFat} %</span>}
            {body.systolic != null && <span className="chip">血圧 {body.systolic}/{body.diastolic ?? '-'}</span>}
          </div>
        ) : (
          <span className="muted">未記録 — タップして体重・血圧・運動を記録</span>
        )}
      </Link>
    </div>
  )
}
