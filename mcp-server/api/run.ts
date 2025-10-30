import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, createAuthenticatedClient } from "../lib/supabase";
import { generateCompletion } from "../lib/claude-http";
import { AuthenticatedRequest, authMiddleware } from "../lib/auth-middleware";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Apply authentication middleware
  const authResult = await authMiddleware(req, res, { required: true });
  if (!authResult.success) {
    return; // Response already sent by middleware
  }

  const userId = req.userId!;
  const authHeader = req.headers.authorization!;
  const token = authHeader.substring(7);
  const authenticatedClient = createAuthenticatedClient(token);

  try {
    const { prompt_id, input } = req.body;

    if (!prompt_id || !input) {
      return res.status(400).json({
        error: "Missing required fields: prompt_id, input",
      });
    }

    // Fetch the prompt from Supabase using authenticated client
    // This will respect RLS policies and only return prompts the user can access
    const { data: prompt, error: promptError } = await authenticatedClient
      .from("prompts")
      .select("*")
      .eq("id", prompt_id)
      .single();

    if (promptError || !prompt) {
      return res.status(404).json({
        error: "Prompt not found or access denied",
      });
    }

    // Generate completion using Claude
    const output = await generateCompletion(prompt.body, input);

    // Save to history with user association
    try {
      await authenticatedClient.from("history").insert([
        {
          prompt_id,
          input,
          output,
          user_id: userId,
          executed_at: new Date().toISOString(),
        },
      ]);
    } catch (historyError) {
      // Log but don't fail the request if history save fails
      console.error("Failed to save history:", historyError);
    }

    return res.status(200).json({ output });
  } catch (error) {
    console.error("Error in /run:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
