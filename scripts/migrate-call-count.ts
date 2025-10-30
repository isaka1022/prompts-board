import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration: add call_count column...');

  const sqlFile = path.join(__dirname, '../supabase/add-call-count.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 100) + '...');

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      // Try direct query if rpc fails
      console.log('RPC failed, trying direct query...');
      try {
        // For ALTER TABLE, we need to use the Supabase management API or run raw SQL
        // Let's try a different approach using the raw query
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          console.error('Error executing statement:', await response.text());
        } else {
          console.log('✓ Statement executed successfully');
        }
      } catch (err) {
        console.error('Error:', err);
      }
    } else {
      console.log('✓ Statement executed successfully');
    }
  }

  console.log('\nMigration completed!');
  console.log('Verifying by fetching prompts...');

  const { data, error } = await supabase
    .from('prompts')
    .select('id, title, call_count')
    .limit(5);

  if (error) {
    console.error('Error fetching prompts:', error);
  } else {
    console.log('\nSample prompts with call_count:');
    console.table(data);
  }
}

runMigration().catch(console.error);
