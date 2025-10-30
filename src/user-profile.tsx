import { Action, ActionPanel, Detail, showToast, Toast, popToRoot } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

export default function UserProfile() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Show authentication required message if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: "Please use the Login command to authenticate first",
      });
    }
  }, [isLoading, isAuthenticated]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await logout();
      
      await showToast({
        style: Toast.Style.Success,
        title: "Logged Out Successfully",
        message: "You have been logged out of PromptBoard",
      });
      
      // Close the profile view after logout
      popToRoot();
    } catch (error) {
      console.error("Logout error:", error);
      
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout Failed",
        message: error instanceof Error ? error.message : "An error occurred during logout",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown="# Loading Profile...\n\nChecking authentication status..."
      />
    );
  }

  // Show authentication required message
  if (!isAuthenticated || !user) {
    return (
      <Detail
        markdown={`# Authentication Required

You need to be logged in to view your profile.

Please use the **Login** command to authenticate with your Google account first.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Login Command"
              url="raycast://extensions/your-name/prompt-board/login"
              icon="🔐"
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

  // Extract user information
  const displayName = user.user_metadata?.full_name || user.email || "Unknown User";
  const email = user.email || "No email available";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const lastSignIn = user.last_sign_in_at 
    ? new Date(user.last_sign_in_at).toLocaleString() 
    : "Never";
  const accountCreated = user.created_at 
    ? new Date(user.created_at).toLocaleDateString() 
    : "Unknown";
  
  // Get provider information
  const provider = user.app_metadata?.provider || "google";
  const providerId = user.app_metadata?.providers?.[0] || provider;

  const profileMarkdown = `# User Profile

${avatarUrl ? `![Avatar](${avatarUrl})` : '👤'}

## Personal Information

**Name:** ${displayName}
**Email:** ${email}
**Provider:** ${provider.charAt(0).toUpperCase() + provider.slice(1)}

## Account Details

**Account Created:** ${accountCreated}
**Last Sign In:** ${lastSignIn}
**User ID:** \`${user.id}\`

## Team Information

${user.user_metadata?.team_name ? `**Team:** ${user.user_metadata.team_name}` : '*No team assigned*'}
${user.user_metadata?.team_role ? `**Role:** ${user.user_metadata.team_role}` : ''}

## PromptBoard Access

✅ **Authenticated** - You have full access to PromptBoard features:
- Create and manage personal prompts
- Search and execute team prompts
- View execution history
- Collaborate with team members

---

*Need to switch accounts or having issues? Use the logout button below.*`;

  return (
    <Detail
      markdown={profileMarkdown}
      actions={
        <ActionPanel>
          <Action
            title="Logout"
            onAction={handleLogout}
            style={Action.Style.Destructive}
            icon="🚪"
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action.OpenInBrowser
            title="Add New Prompt"
            url="raycast://extensions/your-name/prompt-board/add-prompt"
            icon="➕"
          />
          <Action.OpenInBrowser
            title="Search Prompts"
            url="raycast://extensions/your-name/prompt-board/search-prompt"
            icon="🔍"
          />
          <Action.CopyToClipboard
            title="Copy User ID"
            content={user.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Email"
            content={email}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
