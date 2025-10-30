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
      // For GET requests, authentication is optional - return public prompts if not authenticated
      const authResult = await authMiddleware(req, res, { required: false });

      let data, error;

      if (authResult.success && req.userId) {
        // Authenticated user - fetch their accessible prompts
        const authHeader = req.headers.authorization!;
        const token = authHeader.substring(7);
        const authenticatedClient = createAuthenticatedClient(token);

        const result = await authenticatedClient
          .from("prompts")
          .select(`
            *,
            user_profiles!prompts_user_id_fkey (
              display_name
            )
          `)
          .order("created_at", { ascending: false });

        data = result.data;
        error = result.error;
      } else {
        // Unauthenticated user - fetch all prompts (temporary until is_public column is added)
        const result = await supabase
          .from("prompts")
          .select("*")
          .order("created_at", { ascending: false });

        data = result.data;
        error = result.error;
      }

      if (error) {
        throw error;
      }

      // Transform the data to include author name from user profile
      const transformedData = data?.map(prompt => ({
        ...prompt,
        author: prompt.user_profiles?.display_name || prompt.author || 'Unknown Author'
      })) || [];

      return res.status(200).json(transformedData);
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
