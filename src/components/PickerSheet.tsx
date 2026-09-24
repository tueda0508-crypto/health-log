import { useLiveQuery } from 'dexie-react-hooks'
import { db, mealLabel } from '../lib/db'
import { sumItems, type FoodItem } from '../lib/nutrition'
import { formatShort } from '../lib/date'

/** お気に入り・最近の食事から品目を選ぶシート */
export default function PickerSheet({ onPick, onClose }: { onPick: (items: FoodItem[]) => void; onClose: () => void }) {
  const favorites = useLiveQuery(() => db.favorites.orderBy('createdAt').reverse().toArray(), [])
  const recent = useLiveQuery(async () => {
    const meals = await db.meals.orderBy('createdAt').reverse().limit(80).toArray()
    const seen = new Set<string>()
    return meals.filter((m) => {
      const key = m.items.map((i) => i.name).join('|')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 30)
  }, [])

  const deleteFavorite = async (id: number) => {
    if (confirm('このお気に入りを削除しますか？')) await db.favorites.delete(id)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="履歴・お気に入りから追加">
        <div className="sheet-head">
          <h2>履歴・お気に入りから追加</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <h3>⭐ お気に入り</h3>
        {favorites?.length ? (
          favorites.map((f) => (
            <div className="pick-row" key={f.id}>
              <button className="pick-main" onClick={() => onPick(f.items)}>
                <span>
                  <strong>{f.name}</strong>
                  <span className="muted small">{Math.round(sumItems(f.items).kcal)} kcal ・ {f.items.map((i) => i.name).join('、')}</span>
                </span>
              </button>
              <button className="icon-btn danger" onClick={() => deleteFavorite(f.id!)} aria-label="お気に入りを削除">🗑</button>
            </div>
          ))
        ) : (
          <p className="muted small">食事の記録画面で「お気に入りに登録」すると、ここに表示されます</p>
        )}

        <h3>🕒 最近の食事</h3>
        {recent?.length ? (
          recent.map((m) => (
            <div className="pick-row" key={m.id}>
              <button className="pick-main" onClick={() => onPick(m.items)}>
                {m.thumbnail && <img src={m.thumbnail} alt="" className="thumb sm" />}
                <span>
                  <strong>{m.items.map((i) => i.name).join('、')}</strong>
                  <span className="muted small">{formatShort(m.date)} {mealLabel(m.type)} ・ {Math.round(sumItems(m.items).kcal)} kcal</span>
                </span>
              </button>
            </div>
          ))
        ) : (
          <p className="muted small">まだ記録がありません</p>
        )}
      </div>
    </div>
  )
}
