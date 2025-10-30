-- Fix permissions for call_count update (version 2)
-- Run this in Supabase SQL Editor

-- First, drop existing policy if it exists (ignore error if it doesn't exist)
DROP POLICY IF EXISTS "Allow public update on prompts" ON prompts;

-- Create new policy for UPDATE operations
CREATE POLICY "Allow public update on prompts"
  ON prompts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'prompts';
