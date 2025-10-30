import { LocalStorage } from "@raycast/api";
import { fetch } from "@raycast/utils";
import { Prompt, RunPromptRequest, RunPromptResponse } from "../types";

const MCP_BASE_URL = process.env.MCP_BASE_URL || "https://mcp-server-jlb50mbw9-isaka1022s-projects.vercel.app";
const USE_DEMO_MODE = true; // Set to false once Vercel deployment protection is disabled

async function getApiKey(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>("apiKey");
}

// Demo mode functions using LocalStorage
async function getDemoPrompts(): Promise<Prompt[]> {
  const stored = await LocalStorage.getItem<string>("demo_prompts");
  if (stored) {
    return JSON.parse(stored);
  }

  // Initialize with sample data
  const samplePrompts: Prompt[] = [
    {
      id: "1",
      title: "Summarize Meeting Notes",
      body: "You are a professional meeting summarizer. Summarize the following meeting notes into key points, action items, and decisions made.",
      author: "Admin",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Code Review Assistant",
      body: "You are an expert code reviewer. Review the following code and provide constructive feedback on code quality, potential bugs, and best practices.",
      author: "Admin",
      created_at: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Email Writer",
      body: "You are a professional email writer. Write a clear, concise, and professional email based on the following context.",
      author: "Admin",
      created_at: new Date().toISOString(),
    },
  ];

  await LocalStorage.setItem("demo_prompts", JSON.stringify(samplePrompts));
  return samplePrompts;
}

async function addDemoPrompt(title: string, body: string, author: string): Promise<Prompt> {
  const prompts = await getDemoPrompts();
  const newPrompt: Prompt = {
    id: Date.now().toString(),
    title,
    body,
    author,
    created_at: new Date().toISOString(),
  };
  prompts.unshift(newPrompt);
  await LocalStorage.setItem("demo_prompts", JSON.stringify(prompts));
  return newPrompt;
}

async function runDemoPrompt(promptId: string, input: string): Promise<string> {
  const prompts = await getDemoPrompts();
  const prompt = prompts.find((p) => p.id === promptId);

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  // Mock response for demo mode
  return `[DEMO MODE - Backend not connected]

This is a mock response. To get real AI-generated results:

1. Deploy the MCP server to Vercel (see README.md)
2. Set up your Supabase database
3. Configure the MCP_BASE_URL environment variable

Your input was: "${input}"
Prompt template: "${prompt.title}"`;
}

// API functions with demo mode fallback
export async function fetchPrompts(): Promise<Prompt[]> {
  if (USE_DEMO_MODE) {
    return await getDemoPrompts();
  }

  try {
    const response = await fetch(`${MCP_BASE_URL}/prompts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching prompts:", error);
    throw error;
  }
}

export async function addPrompt(title: string, body: string, author: string): Promise<Prompt> {
  if (USE_DEMO_MODE) {
    return await addDemoPrompt(title, body, author);
  }

  try {
    const response = await fetch(`${MCP_BASE_URL}/prompts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, author }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add prompt: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding prompt:", error);
    throw error;
  }
}

export async function runPrompt(request: RunPromptRequest): Promise<RunPromptResponse> {
  if (USE_DEMO_MODE) {
    const output = await runDemoPrompt(request.prompt_id, request.input);
    return { output };
  }

  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${MCP_BASE_URL}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to run prompt: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error running prompt:", error);
    throw error;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await LocalStorage.setItem("apiKey", key);
}

export async function clearApiKey(): Promise<void> {
  await LocalStorage.removeItem("apiKey");
}
