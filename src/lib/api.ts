import "cross-fetch/polyfill";
import { Prompt, RunPromptRequest, RunPromptResponse } from "../types";
import { config } from "../config";

const MCP_BASE_URL = config.mcpBaseUrl;
const USE_DEMO_MODE = false; // Production mode - using real Claude AI

// Demo mode functions using LocalStorage (kept for reference)
// Not used in production mode

// API functions - no authentication required
export async function fetchPrompts(): Promise<Prompt[]> {
  if (USE_DEMO_MODE) {
    // Demo mode not used in production
    return [];
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

export async function addPrompt(title: string, body: string, author?: string): Promise<Prompt> {
  if (USE_DEMO_MODE) {
    // Demo mode not used in production
    throw new Error("Demo mode not available");
  }

  try {
    const response = await fetch(`${MCP_BASE_URL}/prompts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, author: author || "Anonymous" }),
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
    // Demo mode not used in production
    throw new Error("Demo mode not available");
  }

  try {
    const response = await fetch(`${MCP_BASE_URL}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
