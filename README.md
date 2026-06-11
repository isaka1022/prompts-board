# PromptBoard

A Raycast extension for teams to share, search, and execute AI prompts — powered by a serverless MCP backend and Supabase.

## Overview

PromptBoard lets your team build a shared library of reusable prompt templates and run them against an LLM (Claude) directly from Raycast. Prompts are stored in Supabase, served through a lightweight MCP server deployed on Vercel, and surfaced as native Raycast commands.

```
Raycast Extension  ←→  MCP Server (Vercel)  ←→  Supabase (Database + Auth)
                               ↓
                        Anthropic Claude API
```

## Features

- **Search Prompts** — fuzzy-search the team prompt library by title, body, or author; results are ranked by relevance
- **Add Prompt** — create a new prompt template (title, body, optional author)
- **Run Prompt** — execute any prompt against Claude, view the output in Raycast, copy to clipboard
- **Execution History** — every run is logged to Supabase for auditing and analytics
- **Call Count Tracking** — each prompt records how many times it has been run
- **Public / Private Prompts** — prompts can be scoped to a team or made public
- **Google OAuth** — sign in via Google; user profiles are auto-created on first login
- **Row-Level Security** — Supabase RLS ensures users only access prompts they are allowed to see

## Tech Stack

| Layer | Technology |
|---|---|
| Raycast Extension | TypeScript, React, `@raycast/api` |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) with RLS |
| MCP Server | TypeScript, Vercel Serverless Functions |
| LLM | Anthropic Claude (`@anthropic-ai/sdk`) |
| Web Dashboard | Next.js 15, Tailwind CSS (in `web/`) |

## Project Structure

```
prompts-board/
├── src/                        # Raycast extension source
│   ├── add-prompt.tsx          # "Add Prompt" command
│   ├── search-prompt.tsx       # "Search Prompts" command
│   ├── run-prompt.tsx          # Inline prompt execution view
│   ├── login.tsx               # Google OAuth login flow
│   ├── user-profile.tsx        # User profile command
│   ├── lib/
│   │   ├── api.ts              # MCP server API client
│   │   ├── auth.ts             # Session management
│   │   ├── supabase.ts         # Supabase client
│   │   ├── auth-errors.ts      # Typed auth error handling
│   │   └── retry.ts            # Retry + circuit-breaker utilities
│   └── types/index.ts          # Shared TypeScript types
├── mcp-server/                 # Vercel serverless backend
│   ├── api/
│   │   ├── prompts.ts          # GET/POST /prompts
│   │   ├── run.ts              # POST /run
│   │   └── auth.ts             # Auth endpoints
│   └── lib/
│       ├── claude-http.ts      # Anthropic API wrapper
│       ├── supabase.ts         # Supabase admin client
│       └── auth-middleware.ts  # JWT validation middleware
├── web/                        # Next.js web dashboard
│   └── app/                    # App Router pages
├── supabase/
│   └── schema.sql              # Full database schema with RLS policies
└── package.json                # Raycast extension manifest
```

## Setup

### Prerequisites

- [Raycast](https://raycast.com/) installed
- A [Supabase](https://supabase.com/) project
- An [Anthropic API key](https://console.anthropic.com/)
- [Vercel](https://vercel.com/) account (for the MCP server)
- Node.js 18+

### 1. Supabase

1. Create a new Supabase project.
2. In the SQL editor, run the contents of `supabase/schema.sql`.
3. Enable Google as an OAuth provider under **Authentication > Providers**.
4. Note your **Project URL** and **anon key** from **Settings > API**.

### 2. MCP Server

```bash
cd mcp-server
npm install
cp .env.example .env
```

Fill in `.env`:

```
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ANTHROPIC_API_KEY=sk-ant-...
```

Deploy to Vercel:

```bash
npx vercel --prod
```

Note the deployment URL (e.g., `https://your-mcp-server.vercel.app`).

### 3. Raycast Extension

```bash
npm install
```

Set the required environment variables (Raycast preferences or `.env`):

```
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
MCP_BASE_URL=https://your-mcp-server.vercel.app
```

Run in development mode:

```bash
npm run dev
```

In Raycast, search for **Add Prompt**, **Search Prompts**, or **Login**.

### 4. Web Dashboard (optional)

```bash
cd web
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## API Reference

### `GET /prompts`

Returns all accessible prompts for the authenticated user.

### `POST /prompts`

Create a new prompt.

```json
{ "title": "...", "body": "...", "author": "..." }
```

### `POST /run`

Execute a prompt with Claude.

```json
{ "prompt_id": "<uuid>", "input": "..." }
```

Response: `{ "output": "..." }`

## Development

```bash
npm run dev       # Raycast dev mode
npm run build     # Production build
npm run lint      # ESLint
npm run fix-lint  # ESLint --fix
```

Tests (vitest):

```bash
npm test
```

## Roadmap

### Now
- Local file / SQLite fallback mode — Supabase-free operation using the existing `USE_DEMO_MODE` stub
- Consolidate the 13 scattered setup docs into a single English README with a "Deploy to Vercel" button
- Formalise the no-auth mode so teams can self-host without Google OAuth
- Add edit and delete actions for prompts in the Raycast extension

### Next
- Tag / category filters for the prompt library
- Publish to **Raycast Store** (512×512 icon, CHANGELOG, English README — requirements already confirmed)
- Prompt version history table in Supabase
- Complete the web dashboard (`web/`)
- Public / private toggle surfaced as a Raycast action

### Later
- Team invitation flow with email-domain auto-assignment
- Streaming output display in Raycast during LLM execution
- Multi-LLM backend support (OpenAI, Gemini, local models)
- CI/CD pipeline via GitHub Actions + `vercel --archive=tgz`
- **API authentication** — require an API key header on MCP server endpoints (currently unauthenticated with `CORS *`)

## License

MIT — see [LICENSE](LICENSE)
