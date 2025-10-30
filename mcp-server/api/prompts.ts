import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, createAuthenticatedClient } from "../lib/supabase";
import { AuthenticatedRequest, authMiddleware } from "../lib/auth-middleware";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      // Fetch all prompts - authentication not required for now
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json(data || []);
    } else if (req.method === "POST") {
      // Apply authentication middleware for POST
      const authResult = await authMiddleware(req, res, { required: true });
      if (!authResult.success) {
        return; // Response already sent by middleware
      }

      const userId = req.userId!;
      const authHeader = req.headers.authorization!;
      const token = authHeader.substring(7);
      const authenticatedClient = createAuthenticatedClient(token);
      // Add new prompt associated with authenticated user
      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).json({
          error: "Missing required fields: title, body",
        });
      }

      // Get user profile to determine team association
      const { data: userProfile } = await authenticatedClient
        .from("user_profiles")
        .select("display_name, team_id")
        .eq("id", userId)
        .single();

      const { data, error } = await authenticatedClient
        .from("prompts")
        .insert([
          {
            title,
            body,
            author: userProfile?.display_name || 'Unknown Author',
            user_id: userId,
            team_id: userProfile?.team_id || null,
            is_public: false // Default to private, can be made configurable later
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
