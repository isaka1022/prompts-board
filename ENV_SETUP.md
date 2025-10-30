# 🔧 環境変数設定ガイド

このプロジェクトは環境変数を使用して設定を管理します。

## 📝 初期設定

### 1. `.env` ファイルを作成

プロジェクトルートに `.env` ファイルを作成してください：

```bash
# プロジェクトルートで実行
cp .env.example .env
```

または、手動で作成：

```bash
# .env
SUPABASE_URL=https://ttdvuvlvnhefnuvnecvd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZHZ1dmx2bmhlZm51dm5lY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTMzNzksImV4cCI6MjA3NzM4OTM3OX0.LJ88Axy1XUQGaYhRa6ahHdJgXjiPoQr0EDugCrZ8POo
MCP_BASE_URL=https://mcp-server-4mrd922n0-isaka1022s-projects.vercel.app
```

### 2. 値の取得方法

#### Supabase URL と Anon Key

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. **Settings** > **API** に移動
4. 以下をコピー：
   - **Project URL** → `SUPABASE_URL`
   - **Project API keys** > **anon public** → `SUPABASE_ANON_KEY`

#### MCP Server URL

1. MCP Serverをデプロイ済みの場合：Vercelのデプロイメントページから取得
2. まだデプロイしていない場合：`mcp-server/` ディレクトリで `vercel --prod` を実行

## 🔒 セキュリティ

### ✅ 安全な点
- `.env` ファイルは `.gitignore` に含まれています
- Gitにコミットされません
- ローカル環境でのみ使用されます

### ⚠️ 注意事項
- **絶対にGitにコミットしないでください**
- チームメンバーと共有する場合は安全な方法で（1Password、環境変数マネージャーなど）
- 公開リポジトリにアップロードしないこと

## 🚀 使用方法

### 開発モードで実行

```bash
npm run dev
```

Raycastが起動し、環境変数が自動的に読み込まれます。

### ビルド

```bash
npm run build
```

環境変数はビルド時にバンドルされます。

## 🔄 環境変数の変更

1. `.env` ファイルを編集
2. Raycast拡張を再起動（`npm run dev` を再実行）

## 🆘 トラブルシューティング

### 「Supabase configuration not found」エラー

`.env` ファイルが正しく配置されているか確認：

```bash
# プロジェクトルートで確認
ls -la .env
```

### 環境変数が読み込まれない

1. `.env` ファイルの場所を確認（プロジェクトルートに配置）
2. 値が正しく設定されているか確認
3. Raycast拡張を再起動

### Raycast設定画面に何も表示されない

これは正常です。環境変数を使用しているため、Raycast設定画面での入力は不要になりました。

## 📚 参考資料

- [Supabase API設定](https://supabase.com/docs/guides/api)
- [Vercelデプロイメント](https://vercel.com/docs)
- [Raycast Extensions](https://developers.raycast.com/)
