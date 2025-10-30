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

-- Create policies for public access (you can modify these for team-based access)
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
