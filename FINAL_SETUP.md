# 🎉 PromptBoard - 最終設定完了ガイド

## ✅ 完了した作業

### 1. Raycast拡張の簡素化
- ✅ 認証機能を完全に削除
- ✅ Login / User Profile コマンドを無効化
- ✅ Add Prompt / Search Prompts を認証なしで動作
- ✅ 環境変数ベースの設定に変更

### 2. MCP Server
- ✅ Vercelにデプロイ済み
- ✅ `/prompts` エンドポイント（GET/POST）動作確認済み
- ✅ `/run` エンドポイント（Claude API連携）動作確認済み
- ✅ CORS設定完了

### 3. Web UI
- ✅ Next.jsアプリ実装済み
- ✅ プロンプト一覧表示機能あり
- ✅ 認証なしで動作

---

## 🚀 今すぐ使う方法

### Raycast拡張を起動

```bash
cd /Users/amane/sandbox/prompt-board
npm run dev
```

**使えるコマンド:**
1. **Add Prompt** - 新しいプロンプトを追加
2. **Search Prompts** - プロンプトを検索して実行

### Web UIを起動

```bash
cd /Users/amane/sandbox/prompt-board/web
npm install  # 初回のみ
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

---

## 📊 現在の構成

```
┌─────────────────┐
│ Raycast拡張     │  ← 認証なし、シンプル
│ (macOS)         │
└────────┬────────┘
         │
         ↓ REST API
┌─────────────────┐
│ MCP Server      │  ← Vercelにデプロイ済み
│ (Vercel)        │  https://mcp-server-46087vffx-isaka1022s-projects.vercel.app
└────┬─────┬──────┘
     │     │
     ↓     ↓
┌─────┐ ┌──────┐
│Supa │ │Claude│
│base │ │ API  │
└─────┘ └──────┘

┌─────────────────┐
│ Web UI          │  ← プロンプト一覧表示
│ (Next.js)       │
└────────┬────────┘
         │
         ↓ REST API
    MCP Server
```

---

## 🔧 環境変数

### Raycast拡張（`.env`）
```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...（長いキー）
MCP_BASE_URL=https://mcp-server-46087vffx-isaka1022s-projects.vercel.app
```

### Web UI（`web/.env.local`）
```bash
NEXT_PUBLIC_MCP_BASE_URL=https://mcp-server-46087vffx-isaka1022s-projects.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...（長いキー）
```

---

## 🎯 使い方

### 1. プロンプトを追加（Raycast）

1. Raycastで `⌘ + Space`
2. `Add Prompt` と入力
3. 以下を入力：
   - Title: `要約プロンプト`
   - Prompt Body: `以下のテキストを3行で要約してください`
   - Author: `あなたの名前`（任意）
4. `⌘ + Enter` で送信

### 2. プロンプトを検索・実行（Raycast）

1. Raycastで `⌘ + Space`
2. `Search Prompts` と入力
3. 追加したプロンプトを選択
4. `Enter` でプロンプト実行画面へ
5. 入力欄にテキストを貼り付け
6. `⌘ + Enter` で実行
7. Claude AIが応答を生成

### 3. Web UIで確認

1. ブラウザで http://localhost:3000 を開く
2. 追加したプロンプトがカード形式で表示される
3. クリックで詳細表示

---

## 📝 現在の機能

### Raycast拡張
- ✅ プロンプト追加
- ✅ プロンプト検索
- ✅ プロンプト実行（Claude API）
- ❌ 認証（削除済み）
- ❌ ユーザー管理（削除済み）

### Web UI
- ✅ プロンプト一覧表示
- ✅ プロンプト詳細表示
- ❌ 認証（未実装）
- ❌ プロンプト追加（未実装）

### MCP Server
- ✅ GET `/prompts` - 全プロンプト取得
- ✅ POST `/prompts` - プロンプト追加
- ✅ POST `/run` - プロンプト実行
- ✅ CORS対応

---

## 🔮 今後の拡張（オプション）

### フェーズ2: 認証の再追加
- Google OAuth認証
- ユーザー単位のプロンプト管理
- チーム機能

### フェーズ3: 機能拡張
- プロンプト編集・削除
- カテゴリ分類
- タグ機能
- 使用統計

### フェーズ4: Web UI強化
- プロンプト追加フォーム
- リアルタイム更新
- ダークモード

---

## 🐛 トラブルシューティング

### Raycastでエラー

**症状:** `Failed to fetch prompts`

**解決方法:**
1. MCP Server URLが正しいか確認
   ```bash
   curl https://mcp-server-46087vffx-isaka1022s-projects.vercel.app/prompts
   ```
2. `.env` ファイルの `MCP_BASE_URL` を確認
3. Raycast拡張を再起動（`npm run dev` を再実行）

### Web UIでエラー

**症状:** `Failed to fetch prompts`

**解決方法:**
1. `web/.env.local` ファイルが存在するか確認
2. `NEXT_PUBLIC_MCP_BASE_URL` の値が正しいか確認
3. Webサーバーを再起動
   ```bash
   cd web
   npm run dev
   ```

### Claude APIエラー

**症状:** プロンプト実行時にエラー

**解決方法:**
1. MCP Serverの環境変数を確認
   - Vercel Dashboard → mcp-server → Settings → Environment Variables
   - `ANTHROPIC_API_KEY` が設定されているか確認
2. Vercelを再デプロイ
   ```bash
   cd mcp-server
   vercel --prod
   ```

---

## 📚 参考資料

### プロジェクトファイル
- `README.md` - プロジェクト概要
- `ENV_SETUP.md` - 環境変数設定ガイド
- `DEPLOYMENT.md` - デプロイ手順

### 関連ドキュメント
- [Raycast API](https://developers.raycast.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Claude API](https://docs.anthropic.com/)
- [Vercel Docs](https://vercel.com/docs)

---

## 🎉 完了！

すべての設定が完了しました。Raycast拡張とWeb UIの両方が使えます。

質問があれば、いつでも聞いてください！👍

