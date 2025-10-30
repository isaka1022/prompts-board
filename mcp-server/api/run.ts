import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";
import { generateCompletion } from "../lib/claude";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  try {
    const { prompt_id, input } = req.body;

    if (!prompt_id || !input) {
      return res.status(400).json({
        error: "Missing required fields: prompt_id, input",
      });
    }

    // Fetch the prompt from Supabase
    const { data: prompt, error: promptError } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", prompt_id)
      .single();

    if (promptError || !prompt) {
      return res.status(404).json({
        error: "Prompt not found",
      });
    }

    // Generate completion using Claude
    const output = await generateCompletion(prompt.body, input);

    // Save to history (optional)
    try {
      await supabase.from("history").insert([
        {
          prompt_id,
          input,
          output,
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
