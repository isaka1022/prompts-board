-- Migration script for adding authentication to existing PromptBoard database
-- Run this script AFTER setting up the new schema

-- Step 1: Add new columns to existing tables if they don't exist
DO $$ 
BEGIN
  -- Add user_id column to prompts table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'user_id') THEN
    ALTER TABLE prompts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add team_id column to prompts table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'team_id') THEN
    ALTER TABLE prompts ADD COLUMN team_id UUID REFERENCES teams(id);
  END IF;

  -- Add is_public column to prompts table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'is_public') THEN
    ALTER TABLE prompts ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;

  -- Add user_id column to history table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'history' AND column_name = 'user_id') THEN
    ALTER TABLE history ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Update existing prompts to be public (for backward compatibility)
UPDATE prompts 
SET is_public = true 
WHERE user_id IS NULL;

-- Step 3: Create a default admin user profile if needed (optional)
-- This is useful for associating existing prompts with a user
-- You can skip this if you want to keep existing prompts as public only

-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'admin@promptboard.local',
--   crypt('admin123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- ) ON CONFLICT (id) DO NOTHING;

-- Step 4: Associate existing prompts with default admin user (optional)
-- UPDATE prompts 
-- SET user_id = '00000000-0000-0000-0000-000000000001'
-- WHERE user_id IS NULL AND author = 'Admin';

-- Step 5: Verify migration
SELECT 
  'prompts' as table_name,
  COUNT(*) as total_rows,
  COUNT(user_id) as rows_with_user_id,
  COUNT(CASE WHEN is_public = true THEN 1 END) as public_rows
FROM prompts
UNION ALL
SELECT 
  'history' as table_name,
  COUNT(*) as total_rows,
  COUNT(user_id) as rows_with_user_id,
  0 as public_rows
FROM history;
