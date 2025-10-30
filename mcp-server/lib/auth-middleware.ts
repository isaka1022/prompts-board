import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends VercelRequest {
  user?: User;
  userId?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean; // If true, returns 401 when no auth. If false, continues without user
}

/**
 * Authentication middleware that validates Supabase JWT tokens
 * and attaches user context to the request
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: VercelResponse,
  options: AuthMiddlewareOptions = { required: true }
): Promise<{ success: boolean; user?: User }> {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if authorization header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (options.required) {
        res.status(401).json({ 
          error: "Authentication required",
          message: "Missing or invalid authorization header",
          code: "MISSING_AUTH_HEADER",
          retryable: false,
          requiresReauth: true
        });
        return { success: false };
      }
      return { success: true }; // Continue without auth for optional auth
    }

    const token = authHeader.substring(7);

    // Validate the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error("Token validation error:", error);
      
      if (options.required) {
        // Categorize the error for better client handling
        let errorCode = "AUTH_FAILED";
        let retryable = false;
        let requiresReauth = true;
        
        if (error.message?.includes("expired")) {
          errorCode = "TOKEN_EXPIRED";
        } else if (error.message?.includes("invalid") || error.message?.includes("malformed")) {
          errorCode = "INVALID_TOKEN";
        } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
          errorCode = "NETWORK_ERROR";
          retryable = true;
          requiresReauth = false;
        }
        
        res.status(401).json({ 
          error: "Authentication failed",
          message: error.message || "Invalid token",
          code: errorCode,
          retryable,
          requiresReauth
        });
        return { success: false };
      }
      return { success: true }; // Continue without auth for optional auth
    }

    if (!user) {
      if (options.required) {
        res.status(401).json({ 
          error: "Invalid token",
          message: "No user found for provided token",
          code: "NO_USER_FOUND",
          retryable: false,
          requiresReauth: true
        });
        return { success: false };
      }
      return { success: true }; // Continue without auth for optional auth
    }

    // Attach user context to request
    req.user = user;
    req.userId = user.id;

    return { success: true, user };
  } catch (error) {
    console.error("Auth middleware error:", error);
    
    if (options.required) {
      // Determine if this is a retryable error
      const isNetworkError = error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch') ||
        error.message.includes('connection')
      );
      
      res.status(500).json({
        error: "Authentication error",
        message: error instanceof Error ? error.message : "Unknown authentication error",
        code: isNetworkError ? "NETWORK_ERROR" : "INTERNAL_ERROR",
        retryable: isNetworkError,
        requiresReauth: !isNetworkError
      });
      return { success: false };
    }
    
    return { success: true }; // Continue without auth for optional auth
  }
}

/**
 * Higher-order function that wraps API handlers with authentication
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>,
  options: AuthMiddlewareOptions = { required: true }
) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    const authResult = await authMiddleware(req, res, options);
    
    if (!authResult.success) {
      return; // Response already sent by middleware
    }

    // Continue to the actual handler
    return handler(req, res);
  };
}

/**
 * Utility function to refresh an expired token
 */
export async function refreshToken(refreshToken: string): Promise<{
  success: boolean;
  session?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: "Failed to refresh session"
      };
    }

    return {
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Utility function to get user profile with team information
 */
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select(`
        *,
        teams (
          id,
          name,
          domain
        )
      `)
      .eq("id", userId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      profile
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Utility function to check if user has access to a specific team
 */
export async function checkTeamAccess(userId: string, teamId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("team_id")
      .eq("id", userId)
      .eq("team_id", teamId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Team access check error:", error);
    return false;
  }
}
