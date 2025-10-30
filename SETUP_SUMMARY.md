# PromptBoard セットアップ完了まとめ

## 📦 プロジェクト構成

```
prompt-board/
├── mcp-server/          # MCPサーバー（Vercel Serverless Functions）
│   ├── api/
│   │   ├── prompts.ts   # プロンプト一覧・作成API
│   │   └── run.ts       # プロンプト実行API（Claude連携）
│   └── lib/
│       ├── supabase.ts
│       └── claude-http.ts
├── web/                 # Next.jsウェブアプリケーション
│   ├── app/
│   │   ├── page.tsx     # トップページ（プロンプト一覧）
│   │   ├── prompt/[id]/ # プロンプト詳細・実行ページ
│   │   └── test/        # デバッグ用テストページ
│   ├── components/
│   │   └── Header.tsx   # ヘッダー（ログインボタン付き）
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── lib/
│       └── supabase.ts
├── src/                 # Raycast Extension
│   ├── login.tsx
│   ├── add-prompt.tsx
│   └── search-prompt.tsx
└── supabase/           # データベーススキーマ
    └── schema.sql
```

## 🚀 デプロイ済みURL

### 本番環境
- **Webアプリ**: https://web-klx6hj321-isaka1022s-projects.vercel.app
- **MCPサーバー**: https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app
- **Supabase**: https://ttdvuvlvnhefnuvnecvd.supabase.co

### ローカル環境
- **Webアプリ**: http://localhost:3000

## 🗄️ データベース構成（Supabase）

### テーブル
1. **prompts** - プロンプト管理
   - id (UUID)
   - title (TEXT)
   - body (TEXT)
   - author (TEXT)
   - created_at (TIMESTAMPTZ)

2. **history** - 実行履歴
   - id (UUID)
   - prompt_id (UUID)
   - input (TEXT)
   - output (TEXT)
   - executed_at (TIMESTAMPTZ)

### 登録済みプロンプト（6件）
1. test
2. Test from Raycast
3. API Test Prompt
4. Summarize Meeting Notes
5. Code Review Assistant
6. Email Writer

## 🔧 API エンドポイント

### GET /prompts
プロンプト一覧を取得
```bash
curl https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app/prompts
```

### POST /prompts
新しいプロンプトを作成
```bash
curl -X POST https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app/prompts \
  -H "Content-Type: application/json" \
  -d '{"title": "タイトル", "body": "本文", "author": "作成者"}'
```

### POST /run
プロンプトを実行（Claude API連携）
```bash
curl -X POST https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app/run \
  -H "Content-Type: application/json" \
  -d '{"prompt_id": "UUID", "input": "入力テキスト"}'
```

## 🤖 Claude AI連携

### 使用モデル
- **claude-haiku-4-5** (Claude 3.5 Haiku)
- 高速で低コスト
- 最大トークン数: 4096

### 設定
- Temperature: 0.7
- システムプロンプト: プロンプトの`body`を使用
- ユーザー入力: `input`パラメータ

## 🔐 認証（Google OAuth）

### 現在の状態
- ✅ Supabase認証設定済み
- ✅ Google OAuthプロバイダー設定必要
- ⚠️ 現在は認証なしでも全機能利用可能（簡易版）

### Google OAuth設定手順（未完了）
1. Google Cloud Console でOAuth 2.0クライアントID作成
2. Authorized redirect URIs設定:
   - `https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
3. SupabaseダッシュボードでClient ID/Secret設定

## 🎨 主な機能

### Webアプリ
- ✅ プロンプト一覧表示
- ✅ プロンプト詳細表示
- ✅ プロンプト実行（Claude API経由）
- ✅ レスポンシブデザイン
- ✅ ダークモード対応
- ⚠️ Google OAuth（設定必要）

### Raycast Extension
- ✅ プロンプト検索
- ✅ プロンプト作成
- ✅ プロンプト実行
- ✅ ローカルストレージ対応

## 🔧 環境変数

### MCPサーバー (.env)
```
SUPABASE_URL=https://ttdvuvlvnhefnuvnecvd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Webアプリ (.env.local)
```
NEXT_PUBLIC_MCP_BASE_URL=https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ttdvuvlvnhefnuvnecvd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 🐛 既知の問題と解決策

### 問題1: "Error: Failed to fetch prompts"
**原因**: CORSエラーまたはブラウザキャッシュ
**解決策**:
1. ブラウザのハードリフレッシュ（Ctrl+Shift+R / Cmd+Shift+R）
2. ブラウザキャッシュクリア
3. 開発者ツールでNetworkタブを確認

### 問題2: ログイン後にエラー
**現在の状態**: 認証トークン送信を無効化（シンプル版）
**将来の対応**: Google OAuth完全設定後に認証機能を有効化

### 問題3: モデル名エラー
**解決済み**: `claude-haiku-4-5`を正しく設定

## 📝 開発コマンド

### ローカル開発
```bash
# Webアプリ起動
cd web
npm run dev

# Raycast Extension開発
npm run dev
```

### デプロイ
```bash
# MCPサーバー
cd mcp-server
vercel --prod

# Webアプリ
cd web
vercel --prod
```

### データベース操作
```bash
# プロンプト一覧取得
curl https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app/prompts

# プロンプト実行テスト
curl -X POST https://mcp-server-4ks2aigah-isaka1022s-projects.vercel.app/run \
  -H "Content-Type: application/json" \
  -d '{"prompt_id": "e62622b8-4356-4b53-9099-a976dcbaed26", "input": "Meeting: Discussed Q4 goals"}'
```

## 🎯 次のステップ

### 優先度高
1. [ ] Google OAuth完全設定
2. [ ] データベースに`is_public`カラム追加
3. [ ] チーム機能の実装

### 優先度中
1. [ ] プロンプト編集機能
2. [ ] プロンプト削除機能
3. [ ] 実行履歴の表示

### 優先度低
1. [ ] プロンプトのカテゴリ分け
2. [ ] お気に入り機能
3. [ ] 検索機能の強化

## 📚 参考資料

- [Claude API Documentation](https://docs.anthropic.com/claude/reference)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## ✅ 完了した作業

1. ✅ Supabaseデータベース作成・設定
2. ✅ MCPサーバー作成（Vercel Serverless Functions）
3. ✅ Claude API連携（claude-haiku-4-5）
4. ✅ Next.js Webアプリ作成
5. ✅ プロンプト一覧・詳細画面実装
6. ✅ プロンプト実行機能実装
7. ✅ CORS設定
8. ✅ Vercelデプロイ
9. ✅ ローカル開発環境構築
10. ✅ 認証コンテキスト作成

## 🎉 完成したもの

プロンプトを共有・実行できるWebアプリケーションとRaycast Extensionが完成しました！

- **6つのプロンプトが登録済み**
- **Claude AI（Haiku 4.5）で実行可能**
- **本番環境にデプロイ済み**
- **ローカル開発環境も動作中**

---

**作成日**: 2025-10-30
**最終更新**: 2025-10-30
