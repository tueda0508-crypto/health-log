import { useEffect, useState } from 'react'
import DateNav from '../components/DateNav'
import { useDayData, useSelectedDate } from '../lib/hooks'
import { db, type BodyLog } from '../lib/db'
import { EXERCISE_PRESETS, exerciseKcal } from '../lib/exercise'

type BodyForm = Record<'weight' | 'bodyFat' | 'systolic' | 'diastolic' | 'pulse', string>

const FIELDS: { key: keyof BodyForm; label: string; unit: string; step: string }[] = [
  { key: 'weight', label: '体重', unit: 'kg', step: '0.1' },
  { key: 'bodyFat', label: '体脂肪率', unit: '%', step: '0.1' },
  { key: 'systolic', label: '血圧（上）', unit: 'mmHg', step: '1' },
  { key: 'diastolic', label: '血圧（下）', unit: 'mmHg', step: '1' },
  { key: 'pulse', label: '脈拍', unit: 'bpm', step: '1' },
]

const toForm = (b?: BodyLog): BodyForm => ({
  weight: b?.weight?.toString() ?? '',
  bodyFat: b?.bodyFat?.toString() ?? '',
  systolic: b?.systolic?.toString() ?? '',
  diastolic: b?.diastolic?.toString() ?? '',
  pulse: b?.pulse?.toString() ?? '',
})

const parse = (v: string) => {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function BodyPage() {
  const [date, setDate] = useSelectedDate()
  const { body, exercises, burned, currentWeight } = useDayData(date)
  const [form, setForm] = useState<BodyForm>(toForm())
  const [saved, setSaved] = useState(false)

  const [preset, setPreset] = useState(0)
  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')
  const [minutes, setMinutes] = useState('30')

  useEffect(() => setForm(toForm(body)), [body])
  useEffect(() => setSaved(false), [date])

  const saveBody = async () => {
    const log: BodyLog = { date }
    for (const f of FIELDS) {
      const v = parse(form[f.key])
      if (v != null) log[f.key] = v
    }
    await db.bodyLogs.put(log)
    setSaved(true)
  }

  const isCustom = preset === -1
  const weightForCalc = parse(form.weight) ?? currentWeight
  const mins = parse(minutes) ?? 0
  const previewKcal = isCustom
    ? parse(customKcal) ?? 0
    : weightForCalc
      ? exerciseKcal(EXERCISE_PRESETS[preset].mets, weightForCalc, mins)
      : 0

  const addExercise = async () => {
    const name = isCustom ? customName.trim() : EXERCISE_PRESETS[preset].name
    if (!name || previewKcal <= 0) return
    await db.exercises.add({
      date,
      name,
      minutes: mins,
      mets: isCustom ? undefined : EXERCISE_PRESETS[preset].mets,
      kcal: previewKcal,
      createdAt: Date.now(),
    })
    setCustomName('')
    setCustomKcal('')
  }

  return (
    <div className="page">
      <DateNav date={date} onChange={setDate} />

      <section className="card">
        <h2>体の記録</h2>
        <div className="form-grid">
          {FIELDS.map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              <span className="input-unit">
                <input
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  value={form[f.key]}
                  onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setSaved(false) }}
                />
                <span className="muted">{f.unit}</span>
              </span>
            </label>
          ))}
        </div>
        <button className="btn primary block" onClick={saveBody}>{saved ? '✓ 保存しました' : '保存する'}</button>
      </section>

      <section className="card">
        <div className="meal-head">
          <h2>運動</h2>
          <span className="muted">合計 {burned} kcal</span>
        </div>
        {exercises.map((e) => (
          <div className="ex-row" key={e.id}>
            <div>
              <div>{e.name}</div>
              <div className="muted small">{e.minutes ? `${e.minutes}分 ・ ` : ''}{e.kcal} kcal</div>
            </div>
            <button className="icon-btn danger" onClick={() => db.exercises.delete(e.id!)} aria-label={`${e.name}を削除`}>×</button>
          </div>
        ))}

        <div className="ex-form">
          <select value={preset} onChange={(e) => setPreset(Number(e.target.value))} aria-label="運動の種類">
            {EXERCISE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.name}</option>
            ))}
            <option value={-1}>その他（消費kcalを直接入力）</option>
          </select>
          {isCustom && (
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="運動の名前" />
          )}
          <div className="row gap">
            <label className="input-unit">
              <input type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="時間（分）" />
              <span className="muted">分</span>
            </label>
            {isCustom ? (
              <label className="input-unit">
                <input type="number" inputMode="numeric" value={customKcal} onChange={(e) => setCustomKcal(e.target.value)} aria-label="消費カロリー" />
                <span className="muted">kcal</span>
              </label>
            ) : (
              <span className="muted">≈ {previewKcal} kcal</span>
            )}
          </div>
          {!isCustom && !weightForCalc && <p className="muted small">体重を記録すると消費カロリーを計算できます</p>}
          <button className="btn block" onClick={addExercise} disabled={previewKcal <= 0 || (isCustom && !customName.trim())}>＋ 運動を追加</button>
        </div>
      </section>
    </div>
  )
}
