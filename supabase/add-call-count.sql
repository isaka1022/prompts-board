-- Add call_count column to prompts table
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;

-- Create index for sorting by call_count
CREATE INDEX IF NOT EXISTS idx_prompts_call_count ON prompts(call_count DESC);
