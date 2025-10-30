import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY || "";

if (!apiKey) {
  throw new Error("Missing Anthropic API key");
}

export const anthropic = new Anthropic({
  apiKey,
});

export async function generateCompletion(prompt: string, input: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
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
    });

    const textContent = message.content.find((block) => block.type === "text");
    return textContent && textContent.type === "text" ? textContent.text : "No response generated";
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error(`Failed to generate completion: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
