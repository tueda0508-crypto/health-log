import { useState } from 'react'
import NumberInput from './NumberInput'
import { fmt, itemNutrients, NUTRIENT_KEYS, NUTRIENT_LABELS, type FoodItem, type Nutrients } from '../lib/nutrition'


export default function ItemEditor({
  item,
  onChange,
  onRemove,
  defaultOpen = false,
}: {
  item: FoodItem
  onChange: (item: FoodItem) => void
  onRemove: () => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const n = itemNutrients(item)

  // 栄養値を直接直した場合は「今の量あたりの値」として基準を置き換える
  // （量が0のときは比率が決められないので、量を先に入れてもらう）
  const setNutrient = (key: keyof Nutrients, value: number) => {
    if (item.amount <= 0) return
    onChange({ ...item, baseAmount: item.amount, base: { ...n, [key]: value } })
  }

  return (
    <div className="item">
      <div className="item-main">
        <input
          className="item-name"
          value={item.name}
          placeholder="品目名"
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
        <button className="icon-btn danger" onClick={onRemove} aria-label={`${item.name}を削除`}>×</button>
      </div>
      <div className="item-amount">
        <button className="step" onClick={() => onChange({ ...item, amount: Math.max(0, +(item.amount * 0.8).toFixed(1)) })} aria-label="減らす">−</button>
        <NumberInput min={0} value={item.amount} onChange={(v) => onChange({ ...item, amount: v })} aria-label="量" />
        <input className="unit" value={item.unit} onChange={(e) => onChange({ ...item, unit: e.target.value })} aria-label="単位" />
        <button className="step" onClick={() => onChange({ ...item, amount: +(item.amount * 1.25).toFixed(1) })} aria-label="増やす">＋</button>
        <span className="item-kcal">{fmt(n.kcal, 'kcal')} kcal</span>
      </div>
      <button className="item-summary" onClick={() => setOpen(!open)}>
        <span className="n-protein">P {fmt(n.protein)}</span>
        <span className="n-fat">F {fmt(n.fat)}</span>
        <span className="n-carbs">C {fmt(n.carbs)}</span>
        <span className="muted">塩 {fmt(n.salt)}</span>
        <span className="muted">{open ? '▲ 閉じる' : '▼ 栄養を編集'}</span>
      </button>
      {open && (
        <div className="item-detail">
          {NUTRIENT_KEYS.map((k) => (
            <label key={k}>
              <span>{NUTRIENT_LABELS[k].label}</span>
              <NumberInput
                min={0}
                step="0.1"
                value={k === 'kcal' ? Math.round(n[k]) : Math.round(n[k] * 10) / 10}
                onChange={(v) => setNutrient(k, v)}
              />
              <span className="muted">{NUTRIENT_LABELS[k].unit}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
