import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchPrompts } from "./lib/api";
import { Prompt } from "./types";
import RunPromptView from "./run-prompt";

export default function SearchPrompt() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      const data = await fetchPrompts();
      setPrompts(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Prompts",
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
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts by title or content..."
      throttle
    >
      {filteredPrompts.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Prompts Found"
          description="Try a different search or add a new prompt"
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
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
