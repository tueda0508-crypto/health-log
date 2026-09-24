import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { ModelId } from './settings'
import type { FoodItem } from './nutrition'

const MealAnalysis = z.object({
  is_food: z.boolean().describe('写真に食べ物・飲み物が写っているか'),
  items: z.array(
    z.object({
      name: z.string().describe('料理・食品名（日本語）'),
      amount: z.number().describe('推定量の数値'),
      unit: z.string().describe('量の単位。g, ml, 個, 枚, 杯, 本 など'),
      kcal: z.number(),
      protein: z.number().describe('たんぱく質 g'),
      fat: z.number().describe('脂質 g'),
      carbs: z.number().describe('炭水化物 g（糖質+食物繊維）'),
      sugar: z.number().describe('糖質 g'),
      fiber: z.number().describe('食物繊維 g'),
      salt: z.number().describe('食塩相当量 g'),
    }),
  ),
  note: z.string().describe('推定の前提や注意点を日本語で1〜2文'),
})

const SYSTEM_PROMPT = `あなたは日本の管理栄養士です。食事の写真から、写っている料理・食品を品目ごとに分けて、量と栄養素を推定します。

- 栄養値は「日本食品標準成分表（八訂）」と一般的な市販品・外食の値を基準にしてください。
- 各品目の栄養値は、その品目の推定量（amount）あたりの合計値にしてください。
- ご飯・パン・麺など主食は必ず独立した品目にしてください。定食やセットは料理ごとに分けます。
- 量は器の大きさや一般的な1人前から推定し、単位は g を優先します（個数で数えるほうが自然なものは 個・枚・本 など）。
- ユーザーの補足メモがあれば最優先で反映してください。
- 食べ物が写っていない場合は is_food を false にし、items を空にしてください。`

export interface AnalysisResult {
  items: FoodItem[]
  note: string
}

export class AnalysisError extends Error {}

export async function analyzeMealPhoto(opts: {
  apiKey: string
  model: ModelId
  imageBase64: string // JPEG, data URL の接頭辞なし
  memo?: string
}): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true })

  const text = opts.memo?.trim()
    ? `この食事を解析してください。\n補足メモ: ${opts.memo.trim()}`
    : 'この食事を解析してください。'

  try {
    const response = await client.messages.parse({
      model: opts.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        format: zodOutputFormat(MealAnalysis),
        // Sonnet 5 は effort で推論量を抑えて料金を節約（Haiku 4.5 は effort 非対応）
        ...(opts.model === 'claude-sonnet-5' ? { effort: 'medium' as const } : {}),
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: opts.imageBase64 } },
            { type: 'text', text },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') throw new AnalysisError('AIがこの画像の解析を断りました。別の写真で試してください。')
    if (response.stop_reason === 'max_tokens') throw new AnalysisError('解析結果が長すぎて途中で切れました。もう一度試してください。')

    const out = response.parsed_output
    if (!out) throw new AnalysisError('解析結果を読み取れませんでした。もう一度試してください。')
    if (!out.is_food || out.items.length === 0) throw new AnalysisError('食べ物が見つかりませんでした。料理が写った写真を選んでください。')

    return {
      note: out.note,
      items: out.items.map((it) => {
        const amount = it.amount > 0 ? it.amount : 1
        return {
          name: it.name,
          amount,
          unit: it.unit || 'g',
          baseAmount: amount,
          base: {
            kcal: it.kcal,
            protein: it.protein,
            fat: it.fat,
            carbs: it.carbs,
            sugar: it.sugar,
            fiber: it.fiber,
            salt: it.salt,
          },
        }
      }),
    }
  } catch (e) {
    if (e instanceof AnalysisError) throw e
    if (e instanceof Anthropic.AuthenticationError) throw new AnalysisError('APIキーが正しくありません。設定画面で確認してください。')
    if (e instanceof Anthropic.PermissionDeniedError) throw new AnalysisError('このAPIキーではこのモデルを使えません。設定でモデルを変えてみてください。')
    if (e instanceof Anthropic.RateLimitError) throw new AnalysisError('APIの利用上限に達しました。少し待つか、利用上限・残高を確認してください。')
    if (e instanceof Anthropic.BadRequestError) throw new AnalysisError(`リクエストが受け付けられませんでした（${e.message}）`)
    if (e instanceof Anthropic.APIConnectionError) throw new AnalysisError('通信できませんでした。電波の良い場所でもう一度試してください。')
    if (e instanceof Anthropic.APIError) throw new AnalysisError(`AIサービスでエラーが発生しました（${e.status ?? '不明'}）。時間をおいて試してください。`)
    throw e
  }
}
