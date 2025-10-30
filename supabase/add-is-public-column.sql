-- Add is_public column to prompts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE prompts ADD COLUMN is_public BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Update all existing prompts to be public
UPDATE prompts SET is_public = true WHERE is_public IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON prompts(is_public);
