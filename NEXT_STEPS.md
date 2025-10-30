# 🎯 次にやること - Google OAuth設定

## ✅ 完了した作業

1. ✅ MCP Serverの認証エンドポイント実装
2. ✅ Vercelへのデプロイ
3. ✅ エンドポイントの動作確認
4. ✅ Raycast拡張の環境変数対応

---

## 🚀 今すぐやること（5分）

### 手順1: Google Cloud Console（3分）

1. [https://console.cloud.google.com/](https://console.cloud.google.com/) を開く
2. 新しいプロジェクト作成 → 名前: `promptboard`
3. **APIs & Services** > **OAuth consent screen**
   - User Type: **External** → Create
   - App name: `PromptBoard`
   - User support email: 自分のメールアドレス
   - Developer contact: 自分のメールアドレス
   - **Save and Continue** を3回クリック

4. **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `PromptBoard`
   - **Authorized redirect URIs** に以下を追加：
     ```
     https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback
     ```
   - **CREATE** をクリック

5. 表示される **Client ID** と **Client Secret** をコピー ✅

---

### 手順2: Supabase（1分）

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) を開く
2. プロジェクト選択 → **Authentication** > **Providers**
3. **Google** をクリック
   - Toggle を **ON**
   - **Client ID (for OAuth)**: コピーした Client ID を貼り付け
   - **Client Secret (for OAuth)**: コピーした Client Secret を貼り付け
   - **Save** をクリック

---

### 手順3: 動作確認（1分）

```bash
npm run dev
```

1. Raycastで `⌘ + Space` → `Login`
2. **Googleでログイン** をクリック
3. ブラウザでGoogleログイン
4. 「ログイン成功！」が表示されればOK ✅

---

## 📊 現在の設定値

### MCP Server URL
```
https://mcp-server-46087vffx-isaka1022s-projects.vercel.app
```

### Supabase Project
```
https://ttdvuvlvnhefnuvnecvd.supabase.co
```

### Google OAuth Redirect URI（必須）
```
https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback
```

この値を必ずGoogle Cloud Consoleに設定してください。

---

## ❓ よくあるエラー

### `redirect_uri_mismatch`
→ Google Cloud Consoleの Redirect URI が間違っています
→ 必ず `https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback` を設定

### `At least one Client ID is required`
→ Supabaseで Client ID / Secret を入力し忘れています
→ 再度入力して **Save** をクリック

### `An unexpected error occurred`（以前のエラー）
→ ✅ **解決済み！** MCP Serverのルーティング設定を修正しました

---

## 📚 詳細ガイド

より詳しい手順は以下を参照：
- `QUICKSTART_OAUTH.md` - 最速ガイド（5分）
- `GOOGLE_OAUTH_SETUP.md` - 詳細ガイド（スクリーンショット付き）

---

## 🎉 設定完了後

ログインが成功したら、以下のコマンドが使えます：

1. **Add Prompt** - プロンプトを追加
2. **Search Prompts** - プロンプトを検索・実行
3. **User Profile** - プロフィール表示

お疲れ様でした！🚀
