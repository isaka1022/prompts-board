/**
 * Application configuration
 * All values must be supplied via environment variables.
 * See .env.example in mcp-server/ for the required keys.
 */

export const config = {
  // Supabase Configuration
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",

  // MCP Server Configuration
  mcpBaseUrl: process.env.MCP_BASE_URL || "",
} as const;
