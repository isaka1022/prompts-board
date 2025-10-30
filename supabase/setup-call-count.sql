-- Setup call_count feature for prompts
-- Run this SQL in Supabase SQL Editor

-- 1. Add call_count column if not exists
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;

-- 2. Create index for sorting by call_count
CREATE INDEX IF NOT EXISTS idx_prompts_call_count ON prompts(call_count DESC);

-- 3. Create function to increment call_count safely
CREATE OR REPLACE FUNCTION increment_call_count(prompt_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE prompts
  SET call_count = COALESCE(call_count, 0) + 1
  WHERE id = prompt_id_param;
END;
$$;

-- 4. Test the function (optional)
-- SELECT increment_call_count('your-prompt-id-here');
-- SELECT id, title, call_count FROM prompts ORDER BY call_count DESC LIMIT 5;
