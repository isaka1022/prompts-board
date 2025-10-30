import { Action, ActionPanel, Detail, showToast, Toast, open, popToRoot, getPreferenceValues } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { AuthError, AuthErrorHandler, AuthErrorType } from "./lib/auth-errors";
import { withAuthRetry } from "./lib/retry";
import { AuthErrorBoundary } from "./components/AuthErrorBoundary";

interface Preferences {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mcpBaseUrl: string;
}

const preferences = getPreferenceValues<Preferences>();
const MCP_BASE_URL = preferences.mcpBaseUrl;

function LoginComponent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingToken, setIsProcessingToken] = useState(false);

  // If already authenticated, show user profile
  if (isAuthenticated && user) {
    const userInfo = `# Welcome back!

**Name:** ${user.user_metadata?.full_name || user.email}
**Email:** ${user.email}
**Last Sign In:** ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}

You are successfully authenticated and can now use all PromptBoard features.
`;

    return (
      <Detail
        markdown={userInfo}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="View Profile"
              url="raycast://extensions/your-name/prompt-board/user-profile"
              icon="👤"
            />
            <Action
              title="Logout"
              onAction={logout}
              style={Action.Style.Destructive}
              icon="🚪"
            />
            <Action
              title="Close"
              onAction={popToRoot}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Generate OAuth URL
  const generateAuthUrl = async () => {
    setIsGeneratingUrl(true);
    setError(null);

    try {
      const result = await withAuthRetry(async () => {
        const response = await fetch(`${MCP_BASE_URL}/auth/login?redirectTo=${encodeURIComponent(`${MCP_BASE_URL}/auth/success`)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to generate login URL: ${response.statusText}`);
        }

        const data = await response.json() as { url: string };
        return data.url;
      });

      if (result.success) {
        setAuthUrl(result.data!);
      } else {
        const authError = await AuthErrorHandler.handleError(result.error!, { operation: 'generateAuthUrl' });
        setError(authError.userMessage);
      }
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'generateAuthUrl' }
      );
      setError(authError.userMessage);
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  // Handle OAuth login
  const handleLogin = async () => {
    if (!authUrl) {
      await generateAuthUrl();
      return;
    }

    try {
      await open(authUrl);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Opening Browser",
        message: "Complete the login process in your browser, then return to Raycast",
      });
    } catch (error) {
      const authError = new AuthError({
        type: AuthErrorType.OAUTH_FAILED,
        message: error instanceof Error ? error.message : "Failed to open browser",
        userMessage: "Could not open the login page. Please try again.",
        retryable: true,
        requiresReauth: false,
        originalError: error instanceof Error ? error : undefined,
      });
      
      await authError.showToast();
      setError(authError.userMessage);
    }
  };

  // Handle token pasting from clipboard
  const handlePasteToken = async () => {
    setIsProcessingToken(true);
    setError(null);

    try {
      // Get token from clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText) {
        throw new Error("No text found in clipboard");
      }

      // Parse the token data
      let tokenData;
      try {
        tokenData = JSON.parse(clipboardText);
      } catch {
        throw new Error("Invalid token format. Please copy the complete token from the login page.");
      }

      // Validate token structure
      if (!tokenData.access_token || !tokenData.user) {
        throw new Error("Invalid token data. Please copy the complete token from the login page.");
      }

      // Store the session data
      const session = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        user: {
          id: tokenData.user.id,
          email: tokenData.user.email,
          user_metadata: {
            full_name: tokenData.user.name,
            avatar_url: tokenData.user.avatar_url
          }
        }
      };

      // Import the auth functions
      const { storeSession } = await import("../lib/auth");
      await storeSession(session as any);

      await showToast({
        style: Toast.Style.Success,
        title: "Login Successful",
        message: `Welcome back, ${tokenData.user.name}!`,
      });

      // The useAuth hook will automatically detect the stored session
      // and update the component state
    } catch (error) {
      const authError = new AuthError({
        type: AuthErrorType.OAUTH_FAILED,
        message: error instanceof Error ? error.message : "Failed to process token",
        userMessage: error instanceof Error ? error.message : "Failed to process authentication token",
        retryable: true,
        requiresReauth: false,
        originalError: error instanceof Error ? error : undefined,
      });
      
      await authError.showToast();
      setError(authError.userMessage);
    } finally {
      setIsProcessingToken(false);
    }
  };

  // Check authentication status periodically after opening browser
  const checkAuthStatus = async () => {
    // This will be handled by the useAuth hook's auth state listener
    // The hook will automatically update when the user completes OAuth
  };

  useEffect(() => {
    // Generate auth URL on component mount
    generateAuthUrl();
  }, []);

  const loginContent = `# Login to PromptBoard

${error ? `⚠️ **Error:** ${error}\n\n` : ''}

Welcome to PromptBoard! To get started, you need to authenticate with your Google account.

## What happens next:

1. Click "Login with Google" below
2. Your browser will open to Google's login page
3. Sign in with your Google account
4. You'll be redirected back and automatically logged in
5. Return to Raycast to start using PromptBoard

## Features you'll unlock:

- **Personal Prompts**: Create and manage your own prompt library
- **Team Collaboration**: Share prompts with your team members
- **Execution History**: Track your prompt usage and results
- **Secure Access**: Your prompts are protected and private

${isLoading ? '🔄 **Checking authentication status...**' : ''}
${isGeneratingUrl ? '🔄 **Generating login URL...**' : ''}
`;

  return (
    <Detail
      markdown={loginContent}
      actions={
        <ActionPanel>
          <Action
            title="Login with Google"
            onAction={handleLogin}
            icon="🔐"
          />
          {authUrl && (
            <Action.CopyToClipboard
              title="Copy Login URL"
              content={authUrl}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title="Refresh"
            onAction={generateAuthUrl}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Check Auth Status"
            onAction={checkAuthStatus}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

// Wrap the component with error boundary
export default function Login() {
  return (
    <AuthErrorBoundary
      onAuthError={(error) => {
        console.error("Login component auth error:", error);
      }}
      onRetry={() => {
        // Refresh the page/component
        window.location?.reload?.();
      }}
    >
      <LoginComponent />
    </AuthErrorBoundary>
  );
}
