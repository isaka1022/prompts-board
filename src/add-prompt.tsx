import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { addPrompt } from "./lib/api";

export default function AddPrompt() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !body.trim() || !author.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing Fields",
        message: "Please fill in all fields",
      });
      return;
    }

    setIsLoading(true);

    try {
      await addPrompt(title.trim(), body.trim(), author.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Prompt Added",
        message: `"${title}" has been added successfully`,
      });

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Prompt",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
      <Form.TextField
        id="author"
        title="Author"
        placeholder="Your name"
        value={author}
        onChange={setAuthor}
      />
    </Form>
  );
}
