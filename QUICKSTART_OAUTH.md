# ⚡ Google OAuth クイックスタート（5分で完了）

最速でGoogle認証を動かすための最小限の手順です。

---

## 🚀 手順

### 1️⃣ Google Cloud Console（3分）

1. [https://console.cloud.google.com/](https://console.cloud.google.com/) を開く
2. 新しいプロジェクト作成 → 名前: `promptboard`
3. **APIs & Services** > **OAuth consent screen**
   - User Type: **External** → Create
   - App name: `PromptBoard`
   - User support email: 自分のメール
   - Developer contact: 自分のメール
   - Save and Continue を3回クリック
4. **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `PromptBoard`
   - Authorized redirect URIs: **以下を追加**
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - **CREATE**
5. 表示される **Client ID** と **Client Secret** をコピー ✅

---

### 2️⃣ Supabase（1分）

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) を開く
2. プロジェクト選択 → **Authentication** > **Providers**
3. **Google** をクリック
   - Toggle を **ON**
   - **Client ID**: 先ほどコピーした値を貼り付け
   - **Client Secret**: 先ほどコピーした値を貼り付け
   - **Save**

---

### 3️⃣ 動作確認（1分）

```bash
# Raycast拡張を起動
npm run dev
```

1. Raycastで `⌘ + Space` → `Login`
2. **Googleでログイン** をクリック
3. ブラウザでGoogleアカウントを選択
4. 「PromptBoardがアクセスを要求しています」→ **許可**
5. 「ログイン成功！」画面が表示される ✅

---

## 💡 Supabase Project IDの確認方法

Supabase Dashboard → **Settings** > **General** で確認できます。

例: `https://<your-project-ref>.supabase.co`
→ Project ID = `<your-project-ref>`

Redirect URIは以下の形式になります：
```
https://[YOUR_PROJECT_ID].supabase.co/auth/v1/callback
```

---

## ❌ エラーが出た場合

### `redirect_uri_mismatch`
→ Google Cloud ConsoleとSupabaseのURLが一致していません
→ Redirect URIを再確認してください

### `At least one Client ID is required`
→ SupabaseでClient IDを入力し忘れています
→ もう一度入力して **Save** をクリック

### `An unexpected error occurred`
→ MCP Serverの接続エラー
→ `.env` ファイルの `MCP_BASE_URL` を確認

---

詳しい説明は `GOOGLE_OAUTH_SETUP.md` を参照してください。
