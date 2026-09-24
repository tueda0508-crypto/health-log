import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ACTIVITY_OPTIONS,
  autoTargets,
  bmr,
  getSettings,
  GOAL_OPTIONS,
  MODEL_OPTIONS,
  updateSettings,
  useSettings,
  type Profile,
  type TargetKey,
} from '../lib/settings'
import { latestWeight } from '../lib/db'
import { toDateKey } from '../lib/date'
import { exportBackup, importBackup } from '../lib/backup'

const DEFAULT_PROFILE: Profile = { sex: 'male', age: 35, height: 170, weight: 65, activity: 'normal', goal: 'lose' }

const TARGET_FIELDS: { key: TargetKey; label: string; unit: string }[] = [
  { key: 'kcal', label: 'エネルギー', unit: 'kcal' },
  { key: 'protein', label: 'たんぱく質', unit: 'g' },
  { key: 'fat', label: '脂質', unit: 'g' },
  { key: 'carbs', label: '炭水化物', unit: 'g' },
  { key: 'fiber', label: '食物繊維', unit: 'g' },
  { key: 'salt', label: '塩分（上限）', unit: 'g' },
]

export default function SettingsPage() {
  const s = useSettings()
  const [profile, setProfile] = useState<Profile>(s.profile ?? DEFAULT_PROFILE)
  const [apiKey, setApiKey] = useState(s.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [msg, setMsg] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const recordedWeight = useLiveQuery(() => latestWeight(toDateKey()), [])
  const weight = recordedWeight ?? profile.weight
  const auto = autoTargets(profile, weight)

  useEffect(() => {
    if (location.hash.includes('backup')) document.getElementById('backup')?.scrollIntoView()
  }, [])

  // 登録前は画面上だけで編集し、「登録」ボタンで保存する。登録後は変更をその場で保存する
  const setP = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    const next = { ...profile, [k]: v }
    setProfile(next)
    if (s.profile) updateSettings({ profile: next })
  }

  const onApiKeyChange = (v: string) => {
    setApiKey(v)
    updateSettings({ apiKey: v.trim() })
  }

  const setOverride = (k: TargetKey, v: string) => {
    const n = parseFloat(v)
    const next = { ...s.targetOverrides }
    if (Number.isFinite(n) && n > 0) next[k] = n
    else delete next[k]
    updateSettings({ targetOverrides: next })
  }

  const onImport = async (file?: File) => {
    if (!file) return
    if (!confirm('今のデータをすべて置き換えて、バックアップから復元します。よろしいですか？')) return
    try {
      const r = await importBackup(file)
      const restored = getSettings().profile
      if (restored) setProfile(restored)
      setMsg(`✓ 復元しました（食事 ${r.meals} 件）`)
    } catch (e) {
      setMsg(`復元に失敗しました：${e instanceof Error ? e.message : ''}`)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">設定</h1>

      <section className="card">
        <h2>プロフィール</h2>
        <div className="segmented">
          {(['male', 'female'] as const).map((v) => (
            <button key={v} className={profile.sex === v ? 'seg active' : 'seg'} onClick={() => setP('sex', v)}>
              {v === 'male' ? '男性' : '女性'}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="field">
            <span>年齢</span>
            <span className="input-unit"><input type="number" inputMode="numeric" value={profile.age} onChange={(e) => setP('age', Number(e.target.value))} /><span className="muted">歳</span></span>
          </label>
          <label className="field">
            <span>身長</span>
            <span className="input-unit"><input type="number" inputMode="decimal" value={profile.height} onChange={(e) => setP('height', Number(e.target.value))} /><span className="muted">cm</span></span>
          </label>
          <label className="field">
            <span>体重{recordedWeight != null && <small className="muted">（記録: {recordedWeight}kg を使用）</small>}</span>
            <span className="input-unit"><input type="number" inputMode="decimal" value={profile.weight} disabled={recordedWeight != null} onChange={(e) => setP('weight', Number(e.target.value))} /><span className="muted">kg</span></span>
          </label>
        </div>
        <label className="field">
          <span>活動量</span>
          <select value={profile.activity} onChange={(e) => setP('activity', e.target.value as Profile['activity'])}>
            {ACTIVITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>目標</span>
          <select value={profile.goal} onChange={(e) => setP('goal', e.target.value as Profile['goal'])}>
            {GOAL_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        {s.profile ? (
          <p className="muted small">✓ 登録済み。変更は自動で保存されます</p>
        ) : (
          <button className="btn primary block" onClick={() => updateSettings({ profile })}>この内容で登録</button>
        )}
      </section>

      <section className="card">
        <h2>1日の目標</h2>
        <p className="muted small">基礎代謝 {Math.round(bmr(profile, weight))} kcal から自動計算しています。空欄は自動、数値を入れると上書きします。</p>
        {TARGET_FIELDS.map((f) => (
          <label className="field inline" key={f.key}>
            <span>{f.label}</span>
            <span className="input-unit">
              <input
                type="number"
                inputMode="decimal"
                placeholder={String(auto[f.key])}
                value={s.targetOverrides[f.key] ?? ''}
                onChange={(e) => setOverride(f.key, e.target.value)}
              />
              <span className="muted">{f.unit}</span>
            </span>
          </label>
        ))}
      </section>

      <section className="card">
        <h2>AI解析</h2>
        <label className="field">
          <span>Anthropic APIキー</span>
          <span className="row gap">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              placeholder="sk-ant-..."
              autoComplete="off"
              onChange={(e) => onApiKeyChange(e.target.value)}
            />
            <button className="btn small ghost" onClick={() => setShowKey(!showKey)}>{showKey ? '隠す' : '表示'}</button>
          </span>
        </label>
        {s.apiKey ? (
          <p className="small">✓ 保存済み{!s.apiKey.startsWith('sk-ant-') && <span className="error">（「sk-ant-」で始まっていません。貼り付け内容を確認してください）</span>}</p>
        ) : (
          <p className="muted small">未登録（入力すると自動で保存されます）</p>
        )}
        <p className="muted small">
          キーはこの端末の中だけに保存され、Anthropic への解析リクエスト以外には送信しません。
          console.anthropic.com で発行し、念のため利用上限（Spend limit）を設定しておくと安心です。
        </p>
        <label className="field">
          <span>モデル</span>
          <select value={s.model} onChange={(e) => updateSettings({ model: e.target.value as typeof s.model })}>
            {MODEL_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </section>

      <section className="card" id="backup">
        <h2>バックアップ</h2>
        <p className="muted small">
          データはこの端末のブラウザにだけ保存されています。機種変更やデータ消去に備えて、定期的にファイルへ書き出してください（APIキーは含まれません）。
          <br />最終バックアップ：{s.lastExportAt ? new Date(s.lastExportAt).toLocaleString('ja-JP') : 'まだありません'}
        </p>
        <div className="row gap">
          <button className="btn primary" onClick={() => exportBackup().then(() => setMsg('✓ 書き出しました'))}>書き出す</button>
          <button className="btn ghost" onClick={() => importRef.current?.click()}>ファイルから復元</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        {msg && <p className="small">{msg}</p>}
      </section>
    </div>
  )
}
