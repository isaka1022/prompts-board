# 🧠 PromptBoard

Share, reuse, and run AI prompts seamlessly with your team through Raycast.

## 🎯 Overview

PromptBoard is a Raycast extension that enables teams to **share, search, and execute AI prompts**. It combines Raycast's powerful command interface with a cloud-based prompt library, making LLM workflows reusable and standardized across your team.

## 🏗️ Architecture

```
Raycast Extension ↔ MCP Server (Vercel) ↔ Supabase (Database)
                                ↓
                         OpenAI/Claude API
```

## 📦 Project Structure

```
prompt-board/
├── src/                      # Raycast Extension
│   ├── commands/
│   │   ├── add-prompt.tsx    # Add new prompts
│   │   ├── search-prompt.tsx # Search and browse prompts
│   │   └── run-prompt.tsx    # Execute prompts with LLM
│   ├── lib/
│   │   └── api.ts            # API client for MCP server
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── mcp-server/               # MCP Server (Vercel)
│   ├── api/
│   │   ├── prompts.ts        # CRUD endpoints for prompts
│   │   └── run.ts            # Prompt execution endpoint
│   └── lib/
│       ├── supabase.ts       # Supabase client
│       └── openai.ts         # OpenAI client
└── supabase/
    └── schema.sql            # Database schema
```

## 🚀 Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema:
   ```sql
   -- Copy and paste the contents of supabase/schema.sql
   -- into the Supabase SQL Editor
   ```
3. Get your credentials:
   - Project URL: `Settings > API > Project URL`
   - Anon Key: `Settings > API > Project API keys > anon public`

### 2. MCP Server Deployment (Vercel)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the MCP server directory:
   ```bash
   cd mcp-server
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your credentials in `.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   OPENAI_API_KEY=sk-your-openai-key
   ```

5. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

6. Note your deployment URL (e.g., `https://your-mcp-server.vercel.app`)

### 3. Raycast Extension Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Update the MCP server URL in `src/lib/api.ts`:
   ```typescript
   const MCP_BASE_URL = "https://your-mcp-server.vercel.app";
   ```

3. Build and run the extension:
   ```bash
   npm run dev
   ```

4. In Raycast, search for "Add Prompt", "Search Prompts", or run the commands

## 🧩 Features

### ✅ MVP Features

- **🔍 Search Prompts**: Browse and search all team prompts by title or content
- **➕ Add Prompt**: Create new prompts with title, body, and author
- **⚡ Run Prompt**: Execute prompts with OpenAI and see results instantly
- **📝 History**: Automatically save execution history to Supabase

### 🎨 Commands

| Command | Description |
|---------|-------------|
| `Add Prompt` | Create a new prompt template |
| `Search Prompts` | Search, view, and run existing prompts |

## 🔧 API Endpoints

### GET `/prompts`
Fetch all prompts from the database.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Summarize Meeting Notes",
    "body": "You are a professional meeting summarizer...",
    "author": "Admin",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

### POST `/prompts`
Create a new prompt.

**Request:**
```json
{
  "title": "Code Review Assistant",
  "body": "Review the following code...",
  "author": "Your Name"
}
```

### POST `/run`
Execute a prompt with the LLM.

**Request:**
```json
{
  "prompt_id": "uuid",
  "input": "User text to process"
}
```

**Response:**
```json
{
  "output": "Generated result from LLM"
}
```

## 🗃️ Database Schema

### `prompts` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Prompt title |
| body | text | Prompt template |
| author | text | Creator name |
| created_at | timestamptz | Creation timestamp |

### `history` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| prompt_id | uuid | Foreign key to prompts |
| input | text | User input |
| output | text | LLM output |
| executed_at | timestamptz | Execution timestamp |

## 🎬 Demo Scenario

1. Open Raycast → `Add Prompt`
2. Create a new prompt: "Summarize meeting notes"
3. Open Raycast → `Search Prompts`
4. Select your prompt from the list
5. Enter your meeting notes as input
6. View the generated summary
7. Copy the output to your clipboard

## 🌈 Future Enhancements

- 📊 Usage statistics and popularity rankings
- ⭐ Rating system for prompts
- 🔐 Team-based authentication with GitHub OAuth
- 🧩 One-click conversion to Raycast commands
- 🧠 Context-aware responses using history
- 🌐 Web dashboard for prompt management
- 🔄 Support for multiple LLM providers (Claude, Gemini)

## 📝 Environment Variables

### MCP Server
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-key
```

### Raycast Extension
Update `MCP_BASE_URL` in `src/lib/api.ts` to point to your deployed Vercel server.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run Raycast extension in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## 📄 License

MIT

## 🙏 Credits

Built with:
- [Raycast API](https://developers.raycast.com/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [OpenAI](https://openai.com/)
