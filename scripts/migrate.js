require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Adding call_count column to prompts table...');

  // Check if column exists by trying to select it
  const { data: testData, error: testError } = await supabase
    .from('prompts')
    .select('call_count')
    .limit(1);

  if (testError && testError.message.includes('call_count')) {
    console.log('Column does not exist yet. Please run the SQL manually:');
    console.log('\n--- Copy and paste this SQL in your Supabase SQL Editor ---\n');
    console.log('ALTER TABLE prompts ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;');
    console.log('CREATE INDEX IF NOT EXISTS idx_prompts_call_count ON prompts(call_count DESC);');
    console.log('\n--- End of SQL ---\n');
  } else {
    console.log('✓ call_count column already exists or accessible');
  }

  // Verify
  console.log('\nFetching prompts to verify...');
  const { data, error } = await supabase
    .from('prompts')
    .select('id, title, call_count')
    .order('call_count', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run this SQL in Supabase SQL Editor:');
    console.log('ALTER TABLE prompts ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;');
    console.log('CREATE INDEX IF NOT EXISTS idx_prompts_call_count ON prompts(call_count DESC);');
  } else {
    console.log('\n✓ Migration successful! Sample data:');
    console.table(data);
  }
}

migrate();
