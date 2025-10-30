import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { addPrompt } from "./lib/api";
import { useAuth } from "./hooks/useAuth";
import { AuthErrorBoundary } from "./components/AuthErrorBoundary";
import { AuthError, AuthErrorHandler } from "./lib/auth-errors";

function AddPromptComponent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Show authentication required message if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: "Please use the Login command to authenticate first",
      });
    }
  }, [authLoading, isAuthenticated]);

  async function handleSubmit() {
    if (!isAuthenticated) {
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Required",
        message: "Please log in first to add prompts",
      });
      return;
    }

    if (!title.trim() || !body.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Fields",
        message: "Please fill in title and prompt body",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use authenticated user's name, no need for manual author input
      const authorName = user?.user_metadata?.full_name || user?.email || "Unknown User";
      await addPrompt(title.trim(), body.trim(), authorName);

      await showToast({
        style: Toast.Style.Success,
        title: "Prompt Added",
        message: `"${title}" has been added successfully`,
      });

      popToRoot();
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'addPrompt', userId: user?.id }
      );
      
      // Additional handling for auth errors that require re-authentication
      if (authError.requiresReauth) {
        // The error handler already showed a toast, but we might want to redirect to login
        console.log("Re-authentication required for add prompt operation");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <Form isLoading={true}>
        <Form.Description text="Checking authentication..." />
      </Form>
    );
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Login Command"
              url="raycast://extensions/your-name/prompt-board/login"
              icon="🔐"
            />
          </ActionPanel>
        }
      >
        <Form.Description 
          title="Authentication Required" 
          text="Please log in first to add prompts. Use the Login command to authenticate with Google." 
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Prompt" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="View Profile"
            url="raycast://extensions/your-name/prompt-board/user-profile"
            icon="👤"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description 
        title="Logged in as" 
        text={user?.user_metadata?.full_name || user?.email || "Unknown User"} 
      />
      <Form.Separator />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g., Summarize meeting notes"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="body"
        title="Prompt Body"
        placeholder="Enter the prompt template..."
        value={body}
        onChange={setBody}
      />
    </Form>
  );
}

// Wrap the component with error boundary
export default function AddPrompt() {
  return (
    <AuthErrorBoundary
      onAuthError={(error) => {
        console.error("Add prompt auth error:", error);
      }}
      onRetry={() => {
        // Component will re-render automatically
      }}
    >
      <AddPromptComponent />
    </AuthErrorBoundary>
  );
}
