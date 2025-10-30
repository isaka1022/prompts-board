import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, supabaseAdmin } from "../lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url || "", `http://${req.headers.host}`);
  const action = pathname.split("/").pop();

  try {
    switch (action) {
      case "login":
        return handleLogin(req, res);
      case "callback":
        return handleCallback(req, res);
      case "logout":
        return handleLogout(req, res);
      case "user":
        return handleGetUser(req, res);
      case "success":
        return handleAuthSuccess(req, res);
      case "raycast-callback":
        return handleRaycastCallback(req, res);
      default:
        return res.status(404).json({ error: "Auth endpoint not found" });
    }
  } catch (error) {
    console.error("Error in auth handler:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { platform } = req.query;
    const isRaycast = platform === 'raycast';
    
    // Choose redirect URL based on platform
    const redirectTo = isRaycast 
      ? `${process.env.VERCEL_URL || 'https://mcp-server-4mrd922n0-isaka1022s-projects.vercel.app'}/auth/raycast-callback`
      : `${process.env.VERCEL_URL || 'https://mcp-server-4mrd922n0-isaka1022s-projects.vercel.app'}/auth/success`;
    
    // Generate Google OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      url: data.url,
      provider: data.provider
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Failed to generate login URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleAuthSuccess(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, error: authError } = req.query;

    if (authError) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error - PromptBoard</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #d73a49; background: #ffeef0; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Error</h1>
            <div class="error">
              <p><strong>Error:</strong> ${authError}</p>
              <p>Please try logging in again.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error - PromptBoard</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #d73a49; background: #ffeef0; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Error</h1>
            <div class="error">
              <p>Missing authorization code. Please try logging in again.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code as string);

    if (error || !data.session) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error - PromptBoard</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #d73a49; background: #ffeef0; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Error</h1>
            <div class="error">
              <p><strong>Error:</strong> ${error?.message || 'Failed to create session'}</p>
              <p>Please try logging in again.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }

    const { session, user } = data;

    // Create or update user profile
    if (supabaseAdmin) {
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .upsert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
          avatar_url: user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Failed to create/update user profile:", profileError);
      }
    }

    // Return success page with session data
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Successful - PromptBoard</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 40px; 
            background: #f6f8fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .success { 
            color: #28a745; 
            background: #d4edda; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
          }
          .token-container {
            background: #f8f9fa;
            border: 1px solid #e1e4e8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .token {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            word-break: break-all;
            background: white;
            padding: 15px;
            border: 1px solid #d1d5da;
            border-radius: 6px;
            margin: 10px 0;
          }
          .copy-btn {
            background: #0366d6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          }
          .copy-btn:hover {
            background: #0256cc;
          }
          .instructions {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .user-info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 Login Successful!</h1>
          
          <div class="success">
            <p><strong>Welcome to PromptBoard!</strong> You have successfully authenticated.</p>
          </div>

          <div class="user-info">
            <p><strong>Logged in as:</strong> ${user.user_metadata?.full_name || user.email}</p>
            <p><strong>Email:</strong> ${user.email}</p>
          </div>

          <div class="instructions">
            <h3>📋 Next Steps:</h3>
            <ol>
              <li>Copy the authentication token below</li>
              <li>Return to Raycast</li>
              <li>Use the "Paste Token" action in the login command</li>
              <li>Start using PromptBoard!</li>
            </ol>
          </div>

          <div class="token-container">
            <h3>🔑 Your Authentication Token:</h3>
            <div class="token" id="token">${JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              user: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
                avatar_url: user.user_metadata?.avatar_url
              }
            })}</div>
            <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
          </div>

          <p><small>⚠️ Keep this token secure and don't share it with anyone. You can close this page after copying the token.</small></p>
        </div>

        <script>
          function copyToken() {
            const token = document.getElementById('token').textContent;
            navigator.clipboard.writeText(token).then(() => {
              const btn = document.querySelector('.copy-btn');
              const originalText = btn.textContent;
              btn.textContent = '✅ Copied!';
              btn.style.background = '#28a745';
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#0366d6';
              }, 2000);
            }).catch(err => {
              alert('Failed to copy token. Please select and copy manually.');
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Auth success error:", error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error - PromptBoard</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #d73a49; background: #ffeef0; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Authentication Error</h1>
          <div class="error">
            <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
            <p>Please try logging in again.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }
}

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    const { session, user } = data;

    if (!session || !user) {
      return res.status(400).json({ error: "Failed to create session" });
    }

    // Create or update user profile
    if (supabaseAdmin) {
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .upsert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
          avatar_url: user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Failed to create/update user profile:", profileError);
        // Don't fail the auth flow, just log the error
      }
    }

    return res.status(200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url
      }
    });
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);

    // Set the session for this request
    const { error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: "" // We don't need refresh token for logout
    });

    if (error) {
      console.error("Error setting session for logout:", error);
      // Continue with logout even if session setting fails
    }

    // Sign out the user
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("Sign out error:", signOutError);
      // Don't fail the request, client should clear tokens anyway
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      error: "Logout failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleGetUser(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);

    // Verify the JWT token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user profile with team information
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(`
        *,
        teams (
          id,
          name,
          domain
        )
      `)
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError);
      // Return basic user info if profile fetch fails
      return res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url
      });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
      team: profile?.teams ? {
        id: profile.teams.id,
        name: profile.teams.name,
        domain: profile.teams.domain
      } : null
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      error: "Failed to get user data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
