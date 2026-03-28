# NIGHTPICKS - ナイトワーカー向け情報メディア

## プロジェクト概要
ホスト・キャバ嬢などナイトワーカーが毎日チェックしたくなる情報メディアサイト。

## 技術スタック
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS (ダークテーマ)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (管理画面のみ)
- **Storage**: Supabase Storage (画像)
- **AI**: Anthropic Claude API (記事自動生成)
- **Deploy**: Vercel

## ディレクトリ構造
- `src/app/(public)/` — 公開ページ (Header/Footer付きレイアウト)
- `src/app/admin/` — 管理画面 (サイドバー付きレイアウト, 認証必須)
- `src/app/api/` — APIエンドポイント (track, og, revalidate, ai)
- `src/actions/` — Server Actions (記事CRUD, AI生成, 画像アップロード)
- `src/components/public/` — 公開サイト用コンポーネント
- `src/components/admin/` — 管理画面用コンポーネント
- `src/lib/supabase/` — Supabaseクライアント (client/server/admin)
- `src/lib/ai/` — AI記事生成パイプライン
- `src/lib/analytics/` — 計測基盤
- `supabase/` — DBスキーマ, マイグレーション

## 開発コマンド
```bash
npm run dev     # 開発サーバー (http://localhost:3000)
npm run build   # ビルド
npm run lint    # ESLint
```

## 重要な設計判断
- 記事は**Markdown**で管理 (AI生成との相性重視)
- 管理画面はNext.js内の `/admin` ルートで自前構築
- 認証は `src/middleware.ts` でガード (`/admin` 配下のみ)
- 計測は自前実装 (Beacon API → Supabase page_views テーブル)
- ISRは1時間、On-Demand ISRも対応

## Supabase
- salocheckとは**別プロジェクト**
- RLSポリシーで公開記事の制御
- page_views は service_role のみ書き込み可

## カテゴリ (固定)
news, technique, interview, ranking, column, lifestyle

## 関連サービス
- SaloCheck (salocheck.com): セットサロンSaaS。バナー広告経由で `?utm_source=salocheck&wid={worker_id}` 付きで送客
