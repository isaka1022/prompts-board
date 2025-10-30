import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { fetchPrompts } from "./lib/api";
import { Prompt } from "./types";
import RunPromptView from "./run-prompt";

function SearchPromptComponent() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      setIsLoading(true);
      const data = await fetchPrompts();
      setPrompts(data);
      await showToast({
        style: Toast.Style.Success,
        title: "Prompts loaded",
        message: `Found ${data.length} prompts`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load prompts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.title.toLowerCase().includes(searchText.toLowerCase()) ||
      prompt.body.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts..."
      throttle
    >
      {filteredPrompts.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No prompts found"
          description="Try searching with different keywords or add a new prompt"
        />
      ) : (
        filteredPrompts.map((prompt) => (
          <List.Item
            key={prompt.id}
            title={prompt.title}
            subtitle={prompt.author}
            accessories={[
              { text: new Date(prompt.created_at).toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Run Prompt"
                  target={<RunPromptView prompt={prompt} />}
                  icon="⚡"
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
                  icon="🔄"
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function SearchPrompt() {
  return <SearchPromptComponent />;
}
