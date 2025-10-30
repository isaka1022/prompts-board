/**
 * Application configuration
 * Loads from environment variables with fallback defaults
 */

export const config = {
  // Supabase Configuration
  supabaseUrl: process.env.SUPABASE_URL || "https://ttdvuvlvnhefnuvnecvd.supabase.co",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZHZ1dmx2bmhlZm51dm5lY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTMzNzksImV4cCI6MjA3NzM4OTM3OX0.LJ88Axy1XUQGaYhRa6ahHdJgXjiPoQr0EDugCrZ8POo",

  // MCP Server Configuration
  mcpBaseUrl: process.env.MCP_BASE_URL || "https://mcp-server-6aad63cwa-isaka1022s-projects.vercel.app",
} as const;
