import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
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

  // Enhanced fuzzy search with scoring
  const getMatchScore = (prompt: Prompt, query: string): number => {
    const lowerQuery = query.toLowerCase();
    const lowerTitle = prompt.title.toLowerCase();
    const lowerBody = prompt.body.toLowerCase();
    const lowerAuthor = prompt.author.toLowerCase();
    
    let score = 0;
    
    // Exact match in title gets highest score
    if (lowerTitle === lowerQuery) score += 1000;
    
    // Title starts with query
    if (lowerTitle.startsWith(lowerQuery)) score += 500;
    
    // Title contains query
    if (lowerTitle.includes(lowerQuery)) score += 300;
    
    // Body starts with query
    if (lowerBody.startsWith(lowerQuery)) score += 200;
    
    // Body contains query
    if (lowerBody.includes(lowerQuery)) score += 100;
    
    // Author matches
    if (lowerAuthor.includes(lowerQuery)) score += 50;
    
    // Fuzzy match - count matching characters
    const titleChars = lowerTitle.split('');
    const queryChars = lowerQuery.split('');
    let matchingChars = 0;
    queryChars.forEach(char => {
      if (titleChars.includes(char)) matchingChars++;
    });
    score += matchingChars * 5;
    
    return score;
  };

  const filteredPrompts = searchText
    ? prompts
        .map(prompt => ({
          prompt,
          score: getMatchScore(prompt, searchText)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.prompt)
    : prompts;

  // Get snippet of matching text
  const getSnippet = (text: string, query: string, maxLength: number = 100): string => {
    if (!query) return text.substring(0, maxLength);
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text.substring(0, maxLength);
    
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + query.length + 80);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";
    
    return snippet;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type to search prompts instantly... (title, body, or author)"
      throttle
      searchText={searchText}
    >
      {filteredPrompts.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText ? "No matching prompts found" : "No prompts found"}
          description={
            searchText
              ? `Try different keywords. Current search: "${searchText}"`
              : "Add a new prompt to get started!"
          }
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        filteredPrompts.map((prompt) => {
          const snippet = getSnippet(prompt.body, searchText);
          
          return (
            <List.Item
              key={prompt.id}
              title={prompt.title}
              subtitle={snippet}
              accessories={[
                { text: prompt.author, icon: Icon.Person },
                { text: new Date(prompt.created_at).toLocaleDateString(), icon: Icon.Calendar },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Run Prompt"
                    target={<RunPromptView prompt={prompt} />}
                    icon={Icon.Play}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt Body"
                    content={prompt.body}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Prompt Title"
                    content={prompt.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    onAction={loadPrompts}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    icon={Icon.ArrowClockwise}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

export default function SearchPrompt() {
  return <SearchPromptComponent />;
}
