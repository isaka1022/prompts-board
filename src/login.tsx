import { Action, ActionPanel, Detail, showToast, Toast, open, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

const MCP_BASE_URL = process.env.MCP_BASE_URL || "https://mcp-server-4mrd922n0-isaka1022s-projects.vercel.app";

export default function Login() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <Action
              title="Logout"
              onAction={logout}
              style={Action.Style.Destructive}
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
      const response = await fetch(`${MCP_BASE_URL}/auth/login`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate login URL: ${response.statusText}`);
      }

      const data = await response.json();
      setAuthUrl(data.url);
    } catch (error) {
      console.error("Error generating auth URL:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate login URL";
      setError(errorMessage);
      
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Error",
        message: errorMessage,
      });
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
      console.error("Error opening auth URL:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Browser",
        message: "Could not open the login page. Please try again.",
      });
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
