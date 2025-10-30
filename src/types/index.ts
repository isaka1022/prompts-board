export interface Prompt {
  id: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
}

export interface PromptHistory {
  id: string;
  prompt_id: string;
  input: string;
  output: string;
  executed_at: string;
}

export interface RunPromptRequest {
  prompt_id: string;
  input: string;
}

export interface RunPromptResponse {
  output: string;
}

export interface MCPConfig {
  baseUrl: string;
  apiKey?: string;
}
