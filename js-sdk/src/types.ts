/**
 * Typed N-ATLaS requests and responses.
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

export type Role = "system" | "user" | "assistant" | "function" | "tool";

export type FinishReason = string | null;

export type LanguageValue = "yoruba" | "hausa" | "igbo" | "nigerian_english";

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: FunctionCall;
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
}

export interface Message {
  role: Role;
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  [key: string]: unknown;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  model: string;
  created: number;
  message: Message;
  done: boolean;
  done_reason?: FinishReason;
  usage: Usage;
}

export interface GenerateResponse {
  model: string;
  created: number;
  response: string;
  done: boolean;
  done_reason?: FinishReason;
  usage: Usage;
}

export interface SamplingOptions {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  stop?: string | string[];
}

export interface ChatOptions extends SamplingOptions {
  model?: string;
  tools?: ToolDefinition[];
  tool_choice?: string | Record<string, unknown>;
}

export interface GenerateOptions extends SamplingOptions {
  model?: string;
}

export interface ChatRequest extends SamplingOptions {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  tool_choice?: string | Record<string, unknown>;
  stream?: boolean;
}

export interface GenerateRequest extends SamplingOptions {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptionResponse {
  text: string;
  duration?: number;
  model: string;
  language?: string;
  words?: TranscriptionWord[];
  attribution?: string;
}

export interface TranscriptionOptions {
  model?: string;
  language?: string;
  response_format?: "json" | "text" | "verbose_json";
  timestamp_granularities?: Array<"word" | "segment">;
}

export interface LiveAlternative {
  transcript: string;
  confidence: number;
  words?: TranscriptionWord[];
}

export interface LiveChannel {
  alternatives: LiveAlternative[];
}

export interface LiveTranscriptionEvent {
  channel: LiveChannel;
  is_final: boolean;
  speech_final: boolean;
  language: string;
  model: string;
}

export interface LiveTranscriptionOptions {
  language?: string;
  model?: string;
  onTranscript?: (event: LiveTranscriptionEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export interface ClientOptions {
  /** Base URL for the hosted N-ATLaS vLLM / OpenAI-compatible endpoint */
  baseURL?: string;
  /** Alias for baseURL */
  host?: string;
  /** Dedicated Base URL for the sovereign ASR engine (Speech-to-Text) */
  
  /** N-ATLaS API key (defaults to NATLAS_API_KEY environment variable) */
  apiKey?: string;
  /** Model identifier (defaults to "NCAIR1/N-ATLaS") */
  model?: string;
  /** Request timeout in milliseconds (defaults to 120,000ms / 2 minutes) */
  timeout?: number;
  /** Optional custom headers */
  headers?: Record<string, string>;
  /** Optional custom fetch implementation (useful for testing or specific runtimes) */
  fetch?: typeof fetch;
}
