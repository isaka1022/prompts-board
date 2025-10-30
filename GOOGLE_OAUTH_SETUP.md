# 🔐 Google OAuth 完全設定ガイド

このガイドでは、PromptBoardでGoogle認証を有効にする手順を説明します。

## 📋 必要な作業の概要

1. ✅ Google Cloud Consoleで OAuth 2.0 認証情報を作成
2. ✅ Supabaseで Google Provider を設定
3. ✅ 動作確認

所要時間：約10〜15分

---

## ステップ1: Google Cloud Console での設定

### 1-1. プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部の **プロジェクト選択** → **新しいプロジェクト** をクリック
3. プロジェクト名を入力（例：`promptboard-auth`）
4. **作成** をクリック

### 1-2. OAuth 同意画面の設定

1. 左メニューから **APIs & Services** > **OAuth consent screen** を選択
2. **User Type** で **External** を選択 → **CREATE** をクリック
3. 以下を入力：

   | 項目 | 値 |
   |---|---|
   | App name | `PromptBoard` |
   | User support email | あなたのメールアドレス |
   | Application home page | `https://your-domain.com`（任意） |
   | Developer contact information | あなたのメールアドレス |

4. **SAVE AND CONTINUE** をクリック
5. **Scopes** 画面で **SAVE AND CONTINUE**（デフォルトのままでOK）
6. **Test users** 画面で **SAVE AND CONTINUE**（後で追加可能）
7. **Summary** 画面で **BACK TO DASHBOARD**

### 1-3. OAuth 2.0 認証情報の作成

1. 左メニューから **APIs & Services** > **Credentials** を選択
2. 上部の **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs** をクリック
3. **Application type** で **Web application** を選択
4. **Name** に `PromptBoard Web Client` と入力
5. **Authorized redirect URIs** の **+ ADD URI** をクリックし、以下を追加：

```
https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback
```

⚠️ **重要:** `ttdvuvlvnhefnuvnecvd` の部分は、あなたの Supabase プロジェクトIDに置き換えてください

6. **CREATE** をクリック
7. 表示される **Client ID** と **Client Secret** を **コピーして保存**

   ```
   Client ID: 123456789012-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxxx
   ```

---

## ステップ2: Supabase での設定

### 2-1. Google Provider の有効化

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. プロジェクト（`ttdvuvlvnhefnuvnecvd`）を選択
3. 左メニューから **Authentication** → **Providers** を選択
4. **Google** を見つけてクリック
5. 以下を入力：

   | 項目 | 値 |
   |---|---|
   | Enable Sign in with Google | **ON** に切り替え |
   | Client ID (for OAuth) | Google Consoleでコピーした Client ID |
   | Client Secret (for OAuth) | Google Consoleでコピーした Client Secret |

6. **Save** をクリック

### 2-2. Redirect URLs の確認

1. 同じ **Providers** 画面で、画面上部の **Redirect URLs** セクションを確認
2. 以下のURLが表示されているはずです：

```
https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback
```

これがGoogle Cloud Consoleで設定した値と一致していることを確認してください。

---

## ステップ3: 動作確認

### 3-1. Raycast拡張を起動

```bash
cd /Users/amane/sandbox/prompt-board
npm run dev
```

### 3-2. ログインをテスト

1. Raycastで **⌘ + Space** → `Login` と入力
2. **PromptBoard にログイン** コマンドを実行
3. **Googleでログイン** をクリック
4. ブラウザでGoogleログイン画面が開く
5. Googleアカウントでサインイン
6. 権限承認画面で **許可** をクリック
7. 「ログイン成功」画面が表示される
8. Raycastに戻ると認証完了

---

## 🐛 トラブルシューティング

### エラー: `redirect_uri_mismatch`

**原因:** Google Cloud ConsoleとSupabaseのRedirect URIが一致していない

**解決方法:**
1. Google Cloud Console → Credentials → 作成したOAuth Clientを開く
2. **Authorized redirect URIs** に以下が含まれているか確認：
   ```
   https://ttdvuvlvnhefnuvnecvd.supabase.co/auth/v1/callback
   ```
3. なければ追加して **Save**

### エラー: `At least one Client ID is required when Google sign-in is enabled`

**原因:** Supabaseで Client ID が未入力

**解決方法:**
1. Supabase Dashboard → Authentication → Providers → Google
2. Client ID と Client Secret を正しく入力
3. Save をクリック

### エラー: `An unexpected error occurred`

**原因:** MCP Serverとの通信エラー

**解決方法:**
1. MCP ServerがデプロイされているVercel URLを確認：
   ```
   https://mcp-server-4mrd922n0-isaka1022s-projects.vercel.app
   ```
2. ブラウザで `<MCP_URL>/auth/login?platform=raycast` にアクセスして応答を確認
3. エラーが出る場合は、Vercelのログを確認

### Google認証画面で「このアプリは確認されていません」警告

**原因:** OAuth同意画面が「テストモード」のため

**解決方法（開発中）:**
- **詳細設定** → **安全でないページに移動** をクリック
- 開発中は問題なし

**解決方法（本番環境）:**
- Google Cloud Console → OAuth consent screen
- **PUBLISH APP** をクリックしてレビューを申請

---

## ✅ 設定完了の確認

以下ができれば設定完了です：

1. ✅ Raycastで「Login」コマンドが動作する
2. ✅ ブラウザでGoogleログイン画面が開く
3. ✅ ログイン後、「ログイン成功」画面が表示される
4. ✅ Raycastに戻ると認証状態になっている
5. ✅ 「Search Prompts」コマンドでプロンプトが表示される

---

## 📚 参考リンク

- [Google OAuth 2.0 設定ガイド](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🔒 セキュリティのベストプラクティス

1. **Client Secret は絶対に公開しない**
   - Gitにコミットしない
   - スクリーンショットに含めない

2. **本番環境と開発環境で別のOAuth Clientを使う**
   - Google Cloud Consoleで2つのOAuth Clientを作成
   - 環境ごとにCredentialsを切り替え

3. **定期的にCredentialsをローテーション**
   - 3〜6ヶ月ごとにClient Secretを再生成

4. **Authorized redirect URIsを厳密に設定**
   - 必要なURLのみ追加
   - ワイルドカードは使用しない

---

## 次のステップ

Google OAuth設定が完了したら：

1. ✅ プロンプトの追加をテスト（`Add Prompt` コマンド）
2. ✅ プロンプトの検索をテスト（`Search Prompts` コマンド）
3. ✅ プロンプトの実行をテスト（Claude APIとの連携）
4. ✅ チームメンバーを招待してテスト

お疲れ様でした！🎉
