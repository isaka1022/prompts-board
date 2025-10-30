// Alternative Claude implementation using direct HTTP calls
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

if (!ANTHROPIC_API_KEY) {
  throw new Error("Missing Anthropic API key");
}

export async function generateCompletion(prompt: string, input: string): Promise<string> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        temperature: 0.7,
        system: prompt,
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const textContent = data.content?.find((block: any) => block.type === "text");

    return textContent?.text || "No response generated";
  } catch (error) {
    console.error("Claude API error:", error);
    throw new Error(`Failed to generate completion: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
