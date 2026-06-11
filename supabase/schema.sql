-- PromptBoard Database Schema with Authentication

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create teams table for team-based access control
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT, -- For email domain-based team assignment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user profiles table with team associations
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prompts table with user and team associations
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL, -- Keep for backward compatibility
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  is_public BOOLEAN DEFAULT false,
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create history table for execution logs with user association
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can read teams they belong to" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
  );

-- User profiles policies
CREATE POLICY "Users can read all user profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Prompts policies
CREATE POLICY "Users can read accessible prompts" ON prompts
  FOR SELECT USING (
    is_public = true OR 
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create prompts" ON prompts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prompts" ON prompts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own prompts" ON prompts
  FOR DELETE USING (user_id = auth.uid());

-- History policies
CREATE POLICY "Users can read their own history" ON history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own history" ON history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create default team for existing data
INSERT INTO teams (id, name, domain) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Default Team', NULL)
ON CONFLICT (id) DO NOTHING;

-- Sample data (optional) - marked as public for backward compatibility
INSERT INTO prompts (title, body, author, is_public) VALUES
  ('Summarize Meeting Notes', 'You are a professional meeting summarizer. Summarize the following meeting notes into key points, action items, and decisions made.', 'Admin', true),
  ('Code Review Assistant', 'You are an expert code reviewer. Review the following code and provide constructive feedback on code quality, potential bugs, and best practices.', 'Admin', true),
  ('Email Writer', 'You are a professional email writer. Write a clear, concise, and professional email based on the following context.', 'Admin', true)
ON CONFLICT (id) DO NOTHING;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update user profile timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER handle_updated_at_teams
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
