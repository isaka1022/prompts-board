# PromptBoard Setup Guide

Your Supabase credentials are already configured! Follow these steps to complete the setup.

## Step 1: Create Database Tables

Go to your Supabase SQL Editor and run the schema:

**URL:** https://supabase.com/dashboard/project/ttdvuvlvnhefnuvnecvd/sql/new

**Copy and paste this SQL:**

```sql
-- PromptBoard Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create history table for execution logs
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_title ON prompts USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_prompts_body ON prompts USING gin(to_tsvector('english', body));
CREATE INDEX IF NOT EXISTS idx_history_prompt_id ON history(prompt_id);
CREATE INDEX IF NOT EXISTS idx_history_executed_at ON history(executed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access on prompts"
  ON prompts FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on prompts"
  ON prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access on history"
  ON history FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on history"
  ON history FOR INSERT
  WITH CHECK (true);

-- Sample data (optional)
INSERT INTO prompts (title, body, author) VALUES
  ('Summarize Meeting Notes', 'You are a professional meeting summarizer. Summarize the following meeting notes into key points, action items, and decisions made.', 'Admin'),
  ('Code Review Assistant', 'You are an expert code reviewer. Review the following code and provide constructive feedback on code quality, potential bugs, and best practices.', 'Admin'),
  ('Email Writer', 'You are a professional email writer. Write a clear, concise, and professional email based on the following context.', 'Admin');
```

## Step 2: Verify Database Setup (Optional)

Run this command to test the connection:

```bash
node setup-database.js
```

## Step 3: Deploy MCP Server to Vercel

```bash
cd mcp-server
npm install

# Make sure you have an OpenAI API key, then update .env:
# OPENAI_API_KEY=sk-your-key-here

# Install Vercel CLI if you haven't
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

## Step 4: Update Raycast Extension

After deploying to Vercel, you'll get a URL like:
`https://your-project.vercel.app`

Update the URL in `src/lib/api.ts`:

```typescript
const MCP_BASE_URL = process.env.MCP_BASE_URL || "https://your-project.vercel.app";
```

## Step 5: Test in Raycast

1. Open Raycast
2. Search for "Search Prompts"
3. You should see the prompts from your Supabase database!

---

## Current Status

✅ Supabase credentials configured
✅ MCP Server code ready
✅ Raycast extension running in demo mode

Next: Run the SQL schema in Supabase!
