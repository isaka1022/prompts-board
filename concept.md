# 🧠 PromptBoard – Share, Reuse, and Run AI Prompts Seamlessly

## 🪄 概要

**PromptBoard** は、チームで使うAIプロンプトを **「共有・検索・即実行」できるRaycast拡張**。LLMを扱う開発チームが日常的に使うプロンプトをナレッジ化し、**ワークフローの一部として再利用可能に**することを目的とする。

## 🎯 目的

* プロンプトをチーム単位で標準化・再利用できる仕組みを提供。
* Raycast × MCP統合で **「LLM操作をコマンド化」** する新しい体験を実現。

## 🧩 想定ユーザー

* LLMを日常的に使う開発者、デザイナー、リサーチャー
* プロンプト共有・再利用を効率化したいAIチーム

## ⚙️ システム構成

```mermaid
graph TD
  A[Raycast Extension] -->|command: run / search / add| B[MCP Server (Vercel)]
  B -->|fetch/store| C[Supabase (DB + Auth)]
  B -->|LLM call| D[OpenAI / Claude API]
  D -->|result| B
  B -->|output| A
```

| レイヤ        | 技術                                     | 役割               |
| ---------- | -------------------------------------- | ---------------- |
| Frontend   | Raycast Extension (TypeScript + React) | プロンプトの登録・検索・実行UI |
| Middleware | MCP Server on Vercel                   | SupabaseとLLMの仲介層 |
| Backend    | Supabase                               | プロンプト・履歴・認証データ管理 |
| LLM        | OpenAI / Claude                        | プロンプト実行API       |

## 🧱 データ構造（Supabase）

### `prompts` テーブル

| カラム名       | 型           | 説明      |
| ---------- | ----------- | ------- |
| id         | uuid        | プロンプトID |
| title      | text        | タイトル    |
| body       | text        | プロンプト本文 |
| author     | text        | 作成者     |
| created_at | timestamptz | 登録日時    |

### `history` テーブル（任意）

| カラム名        | 型           | 説明      |
| ----------- | ----------- | ------- |
| id          | uuid        | 履歴ID    |
| prompt_id   | uuid        | 対応プロンプト |
| input       | text        | 実行時入力   |
| output      | text        | 出力結果    |
| executed_at | timestamptz | 実行日時    |

## 🧠 機能仕様（MVP）

| 機能名              | 説明                | 実装詳細                                |
| ---------------- | ----------------- | ----------------------------------- |
| 🔍 Prompt Search | 登録済みプロンプト検索・選択    | Supabase全文検索（`title` / `body`）      |
| 🧾 Add Prompt    | 新規登録              | Raycastフォーム → MCP経由でSupabase INSERT |
| ⚡ Run Prompt     | プロンプト実行           | MCP → OpenAI API → 結果返却             |
| 🧠 Save History  | 実行履歴保存            | Supabase INSERT                     |
| 🧩 Local Cache   | 最近使ったプロンプトをローカル保存 | Raycast LocalStorage                |

## 🧰 MCP Server（Vercel）

| エンドポイント    | メソッド | 概要             |
| ---------- | ---- | -------------- |
| `/prompts` | GET  | 全プロンプト取得       |
| `/prompts` | POST | プロンプト追加        |
| `/run`     | POST | 指定プロンプトをLLMに実行 |

### `/run` 例

```ts
POST /run
{
  "prompt_id": "uuid",
  "input": "User text"
}
```

**レスポンス**

```json
{
  "output": "Generated result from LLM"
}
```

## 💡 Raycast コマンド構成

| コマンド名           | 機能    | UI要素                  |
| --------------- | ----- | --------------------- |
| `Add Prompt`    | 新規登録  | FormView（title, body） |
| `Search Prompt` | 検索・一覧 | ListView + Supabase検索 |
| `Run Prompt`    | 実行    | DetailView + Result表示 |

## 🧩 認証

* Supabase Auth (GitHub OAuth)
* Raycastローカルにトークン保存
* チーム単位のRLS適用予定

## 🚀 開発ステップ

1. Supabaseプロジェクト作成・`prompts`テーブル構築
2. MCP ServerをVercelにデプロイ（Supabase SDK + OpenAI SDK）
3. Raycast Extension開発（Add / Search / Run）
4. CRUD + `/run` 経路テスト
5. デモデータ登録・動作確認

## ✨ デモシナリオ（3分）

1. Raycastで「Add Prompt」→ “Summarize meeting note” 登録
2. 「Search Prompt」→ 一覧から選択
3. 「Run Prompt」→ テキスト入力 → 出力表示
4. Supabaseに履歴保存

## 🌈 拡張アイデア

* 📊 使用回数・評価システム
* 🧩 Raycastコマンドへのワンクリ登録
* 🧠 過去出力を踏まえた回答
* 🧭 Web Dashboard for PromptBoard

## 🏆 審査基準対応

| 項目      | 対応ポイント                           |
| ------- | -------------------------------- |
| イノベーション | 「プロンプトをコマンド化」する新UX               |
| 技術的実装   | Raycast × MCP × Supabase × LLM連携 |
| ユーザー体験  | シンプルで即実行可能なUI                    |
| インパクト   | AI活用をチーム単位で標準化する可能性              |
