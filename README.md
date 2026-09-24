# ヘルスログ

食事の写真を Claude で解析して、カロリー・PFC・塩分などを記録する個人用の健康管理 PWA。

- 食事：写真 → AI が品目ごとに量と栄養素を推定 → 量を直すと比例して再計算
- 体重・体脂肪率・血圧・脈拍、運動（METs から消費カロリーを計算）
- 目標値はプロフィール（Mifflin-St Jeor 式）から自動計算、手動で上書き可
- 週・月・3か月のグラフ、履歴・お気に入りからの再登録
- データはすべて端末内（IndexedDB）に保存。JSON で書き出し・復元

## 開発

```bash
npm install
npm run dev
```

`main` に push すると GitHub Actions がビルドして GitHub Pages に公開する。

## 構成

- Vite + React + TypeScript、vite-plugin-pwa
- Dexie（IndexedDB）、Chart.js
- `@anthropic-ai/sdk` をブラウザから直接呼ぶ（APIキーは端末の localStorage のみに保存）
