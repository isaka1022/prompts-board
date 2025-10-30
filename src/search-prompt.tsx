import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { fetchPrompts } from "./lib/api";
import { Prompt } from "./types";
import { useAuth } from "./hooks/useAuth";
import RunPromptView from "./run-prompt";
import { AuthErrorBoundary } from "./components/AuthErrorBoundary";
import { AuthErrorHandler } from "./lib/auth-errors";

function SearchPromptComponent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadPrompts();
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: "Please use the Login command to authenticate first",
      });
    }
  }, [authLoading, isAuthenticated]);

  async function loadPrompts() {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchPrompts();
      setPrompts(data);
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'loadPrompts', userId: user?.id }
      );
      
      // Additional handling for auth errors that require re-authentication
      if (authError.requiresReauth) {
        console.log("Re-authentication required for load prompts operation");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.title.toLowerCase().includes(searchText.toLowerCase()) ||
      prompt.body.toLowerCase().includes(searchText.toLowerCase())
  );

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView title="Checking authentication..." />
      </List>
    );
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <List>
        <List.EmptyView
          title="Authentication Required"
          description="Please log in first to view prompts"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Login Command"
                url="raycast://extensions/your-name/prompt-board/login"
                icon="🔐"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts by title or content..."
      throttle
    >
      <List.Section title={`Prompts (${user?.user_metadata?.full_name || user?.email})`}>
        {filteredPrompts.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No Prompts Found"
            description="Try a different search or add a new prompt"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Add New Prompt"
                  url="raycast://extensions/your-name/prompt-board/add-prompt"
                />
                <Action
                  title="Refresh"
                  onAction={loadPrompts}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.OpenInBrowser
                  title="View Profile"
                  url="raycast://extensions/your-name/prompt-board/user-profile"
                  icon="👤"
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
              </ActionPanel>
            }
          />
        ) : (
          filteredPrompts.map((prompt) => (
            <List.Item
              key={prompt.id}
              title={prompt.title}
              subtitle={prompt.author}
              accessories={[{ text: new Date(prompt.created_at).toLocaleDateString() }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Run Prompt"
                    target={<RunPromptView prompt={prompt} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt Body"
                    content={prompt.body}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    onAction={loadPrompts}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action.OpenInBrowser
                    title="View Profile"
                    url="raycast://extensions/your-name/prompt-board/user-profile"
                    icon="👤"
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
// Wrap the component with error boundary
export default function SearchPrompt() {
  return (
    <AuthErrorBoundary
      onAuthError={(error) => {
        console.error("Search prompt auth error:", error);
      }}
      onRetry={() => {
        // Component will re-render automatically
      }}
    >
      <SearchPromptComponent />
    </AuthErrorBoundary>
  );
}
