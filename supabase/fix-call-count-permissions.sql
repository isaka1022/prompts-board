-- Fix permissions for call_count update
-- Run this in Supabase SQL Editor

-- Allow public UPDATE on prompts table (for call_count increment)
CREATE POLICY IF NOT EXISTS "Allow public update on prompts"
  ON prompts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Or if you want to allow only call_count updates:
-- DROP POLICY IF EXISTS "Allow public update on prompts" ON prompts;
-- CREATE POLICY "Allow call_count update on prompts"
--   ON prompts FOR UPDATE
--   USING (true)
--   WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'prompts';
