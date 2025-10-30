export interface Prompt {
  id: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
  user_id?: string;
  team_id?: string;
  is_public?: boolean;
}

export interface PromptHistory {
  id: string;
  prompt_id: string;
  input: string;
  output: string;
  executed_at: string;
  user_id?: string;
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

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  domain?: string;
  created_at: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}
