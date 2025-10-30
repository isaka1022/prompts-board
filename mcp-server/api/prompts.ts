import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      // Fetch all prompts
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json(data);
    } else if (req.method === "POST") {
      // Add new prompt
      const { title, body, author } = req.body;

      if (!title || !body || !author) {
        return res.status(400).json({
          error: "Missing required fields: title, body, author",
        });
      }

      const { data, error } = await supabase
        .from("prompts")
        .insert([
          {
            title,
            body,
            author,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json(data);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error in /prompts:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
