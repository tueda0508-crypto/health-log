import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ItemEditor from '../components/ItemEditor'
import PickerSheet from '../components/PickerSheet'
import { db, MEAL_TYPES, type MealType } from '../lib/db'
import { fmt, sumItems, zeroNutrients, type FoodItem } from '../lib/nutrition'
import { preparePhoto } from '../lib/image'
import { analyzeMealPhoto, AnalysisError } from '../lib/ai'
import { useSettings } from '../lib/settings'
import { toDateKey } from '../lib/date'

function guessMealType(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 17) return 'snack'
  return 'dinner'
}

const blankItem = (): FoodItem => ({ name: '', amount: 1, unit: '人前', baseAmount: 1, base: zeroNutrients() })

export default function MealEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const mealId = id ? Number(id) : undefined

  const [date, setDate] = useState(params.get('date') ?? toDateKey())
  const [type, setType] = useState<MealType>((params.get('type') as MealType) ?? guessMealType())
  const [items, setItems] = useState<FoodItem[]>([])
  const [thumbnail, setThumbnail] = useState<string>()
  const [photoBase64, setPhotoBase64] = useState<string>()
  const [memo, setMemo] = useState('')
  const [note, setNote] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [picker, setPicker] = useState(false)
  const [newIndex, setNewIndex] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(mealId == null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mealId == null) return
    db.meals.get(mealId).then((m) => {
      if (m) {
        setDate(m.date)
        setType(m.type)
        setItems(m.items)
        setThumbnail(m.thumbnail)
      }
      setLoaded(true)
    })
  }, [mealId])

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const p = await preparePhoto(file)
      setThumbnail(p.thumbnail)
      setPhotoBase64(p.analysisBase64)
      if (settings.apiKey) void analyze(p.analysisBase64)
    } catch {
      setError('写真を読み込めませんでした。別の写真を選んでください。')
    }
  }

  const analyze = async (base64 = photoBase64) => {
    if (!base64) return
    if (!settings.apiKey) {
      setError('AI解析にはAPIキーが必要です。設定画面で登録してください。')
      return
    }
    setAnalyzing(true)
    setError('')
    setNote('')
    try {
      const result = await analyzeMealPhoto({ apiKey: settings.apiKey, model: settings.model, imageBase64: base64, memo })
      setItems(result.items)
      setNote(result.note)
    } catch (e) {
      setError(e instanceof AnalysisError ? e.message : '解析中に予期しないエラーが発生しました。')
    } finally {
      setAnalyzing(false)
    }
  }

  const updateItem = (i: number, item: FoodItem) => setItems(items.map((it, j) => (j === i ? item : it)))
  const removeItem = (i: number) => setItems(items.filter((_, j) => j !== i))

  const save = async () => {
    const cleaned = items.filter((i) => i.name.trim())
    if (cleaned.length === 0) {
      setError('品目を1つ以上入力してください。')
      return
    }
    if (mealId != null) {
      await db.meals.update(mealId, { date, type, items: cleaned, thumbnail })
    } else {
      await db.meals.add({ date, type, items: cleaned, thumbnail, createdAt: Date.now() })
    }
    navigate(date === toDateKey() ? '/' : `/?date=${date}`)
  }

  const remove = async () => {
    if (mealId == null || !confirm('この食事の記録を削除しますか？')) return
    await db.meals.delete(mealId)
    navigate(date === toDateKey() ? '/' : `/?date=${date}`)
  }

  const addFavorite = async () => {
    const cleaned = items.filter((i) => i.name.trim())
    if (cleaned.length === 0) return
    const name = prompt('お気に入りの名前', cleaned.map((i) => i.name).join('・'))
    if (!name) return
    await db.favorites.add({ name, items: cleaned, createdAt: Date.now() })
    alert('お気に入りに登録しました')
  }

  const total = sumItems(items)

  if (!loaded) return <div className="page"><p className="muted center">読み込み中…</p></div>

  return (
    <div className="page">
      <div className="page-head">
        <Link to={date === toDateKey() ? '/' : `/?date=${date}`} className="icon-btn" aria-label="戻る">‹</Link>
        <h1>{mealId != null ? '食事を編集' : '食事を記録'}</h1>
      </div>

      <section className="card">
        <div className="row">
          <input type="date" value={date} max={toDateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="日付" />
        </div>
        <div className="segmented" role="radiogroup" aria-label="食事の区分">
          {MEAL_TYPES.map((m) => (
            <button key={m.value} role="radio" aria-checked={type === m.value} className={type === m.value ? 'seg active' : 'seg'} onClick={() => setType(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = '' }} />
        {thumbnail ? (
          <button className="photo" onClick={() => fileRef.current?.click()} aria-label="写真を撮り直す">
            <img src={thumbnail} alt="食事の写真" />
            {analyzing && <div className="photo-overlay"><div className="spinner" />AIが解析中…</div>}
          </button>
        ) : (
          <button className="photo empty" onClick={() => fileRef.current?.click()}>
            <span className="photo-icon">📷</span>
            写真を撮る・選ぶ
            <span className="muted small">AIが品目と栄養を推定します</span>
          </button>
        )}
        {photoBase64 && (
          <div className="memo-row">
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="補足（例：ご飯は大盛り、ドレッシングなし）" />
            <button className="btn small" disabled={analyzing} onClick={() => analyze()}>{items.length ? '再解析' : '解析'}</button>
          </div>
        )}
        {!settings.apiKey && <p className="muted small">※ AI解析には<Link to="/settings">設定</Link>でAPIキーの登録が必要です</p>}
        {note && <p className="ai-note">🤖 {note}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <div className="meal-head">
          <h2>品目</h2>
          <span className="muted">{items.length}品</span>
        </div>
        {items.map((it, i) => (
          <ItemEditor key={i} item={it} onChange={(v) => updateItem(i, v)} onRemove={() => removeItem(i)} defaultOpen={i === newIndex} />
        ))}
        <div className="row gap">
          <button className="btn ghost" onClick={() => { setNewIndex(items.length); setItems([...items, blankItem()]) }}>＋ 手入力で追加</button>
          <button className="btn ghost" onClick={() => setPicker(true)}>⭐ 履歴・お気に入り</button>
        </div>
      </section>

      {items.length > 0 && (
        <section className="card totals">
          <div className="total-kcal">{fmt(total.kcal, 'kcal')} <span className="muted">kcal</span></div>
          <div className="total-grid">
            <span className="n-protein">P {fmt(total.protein)}g</span>
            <span className="n-fat">F {fmt(total.fat)}g</span>
            <span className="n-carbs">C {fmt(total.carbs)}g</span>
            <span>糖質 {fmt(total.sugar)}g</span>
            <span>繊維 {fmt(total.fiber)}g</span>
            <span>塩分 {fmt(total.salt)}g</span>
          </div>
        </section>
      )}

      <div className="actions">
        <button className="btn primary block" onClick={save} disabled={analyzing || items.length === 0}>保存する</button>
        <div className="row gap">
          {items.length > 0 && <button className="btn ghost" onClick={addFavorite}>⭐ お気に入りに登録</button>}
          {mealId != null && <button className="btn ghost danger" onClick={remove}>削除</button>}
        </div>
      </div>

      {picker && (
        <PickerSheet
          onClose={() => setPicker(false)}
          onPick={(picked) => {
            setItems([...items, ...picked.map((p) => ({ ...p, base: { ...p.base } }))])
            setPicker(false)
          }}
        />
      )}
    </div>
  )
}
