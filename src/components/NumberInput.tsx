import { useEffect, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
}

const parse = (text: string) => {
  const n = parseFloat(text)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * 数値入力。入力中は文字列のまま持つので、欄を空にしたり「1.」と打ったりできる。
 * 空欄は 0 として扱い、フォーカスが外れたら表示を値に戻す。
 */
export default function NumberInput({ value, onChange, onFocus, onBlur, ...rest }: Props) {
  const [text, setText] = useState(String(value))

  // 外から値が変わったとき（＋−ボタンなど）だけ表示を合わせる
  useEffect(() => {
    if (parse(text) !== value) setText(String(value))
  }, [value])

  return (
    <input
      {...rest}
      type="number"
      inputMode={rest.inputMode ?? 'decimal'}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
      onFocus={(e) => {
        e.target.select()
        onFocus?.(e)
      }}
      onBlur={(e) => {
        if (text.trim() === '') setText(String(value))
        onBlur?.(e)
      }}
    />
  )
}
