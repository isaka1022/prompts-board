#!/usr/bin/env node

/**
 * Setup script to initialize Supabase database
 * Run: node setup-database.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const SUPABASE_URL = "https://<your-project-ref>.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDatabase() {
  console.log("🚀 Setting up PromptBoard database...\n");

  // Note: You need to run the SQL schema manually in Supabase SQL Editor
  // because the anon key doesn't have permission to execute DDL commands

  console.log("📋 Instructions:");
  console.log("1. Go to: https://supabase.com/dashboard/project/<your-project-ref>/sql/new");
  console.log("2. Copy the contents of supabase/schema.sql");
  console.log("3. Paste and run it in the SQL Editor");
  console.log("\n✅ After running the schema, this script will verify the setup.\n");

  // Wait for user confirmation
  console.log("Press Ctrl+C to exit if you haven't run the schema yet.");
  console.log("Or press Enter to verify the database setup...");

  process.stdin.once("data", async () => {
    console.log("\n🔍 Verifying database setup...");

    try {
      // Test connection by fetching prompts
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .limit(5);

      if (error) {
        console.error("❌ Error:", error.message);
        console.log("\n⚠️  Make sure you've run the schema.sql in Supabase SQL Editor!");
        process.exit(1);
      }

      console.log("✅ Database connection successful!");
      console.log(`📊 Found ${data.length} prompts in the database`);

      if (data.length > 0) {
        console.log("\n📝 Sample prompts:");
        data.forEach((prompt) => {
          console.log(`  - ${prompt.title} (by ${prompt.author})`);
        });
      }

      console.log("\n🎉 Setup complete! You can now:");
      console.log("1. Deploy the MCP server: cd mcp-server && vercel --prod");
      console.log("2. Update src/lib/api.ts with your Vercel URL");
      console.log("3. Use PromptBoard in Raycast!");

      process.exit(0);
    } catch (err) {
      console.error("❌ Error:", err.message);
      process.exit(1);
    }
  });
}

setupDatabase();
