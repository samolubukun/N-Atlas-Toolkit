/**
 * N-ATLaS JavaScript/TypeScript Client.
 *
 * Provides a clean, typed interface to sovereign multilingual models
 * (N-ATLaS Yoruba, Hausa, Igbo, Nigerian English LLM & ASR).
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

import {
  APIConnectionError,
  APIResponseValidationError,
  APIStatusError,
  APITimeoutError,
  ConfigurationError,
  NatlasError,
  StreamProtocolError,
} from "./errors.js";
import { parseSSEStream } from "./sse.js";
import {
  ChatOptions,
  ChatRequest,
  ChatResponse,
  ClientOptions,
  GenerateOptions,
  GenerateRequest,
  GenerateResponse,
  Message,
  LiveTranscriptionEvent,
  LiveTranscriptionOptions,
  TranscriptionOptions,
  TranscriptionResponse,
  Usage,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run";
export const DEFAULT_ASR_URL = "https://samuelolubukun--natlas-engine-natlasasrengine-serve.modal.run";
export const DEFAULT_MODEL = "NCAIR1/N-ATLaS";

export function resolveBaseURL(baseURL?: string): string {
  let configured =
    baseURL ??
    (typeof process !== "undefined" && process.env
      ? process.env.NATLAS_BASE_URL || process.env.NATLAS_API_URL
      : undefined);

  if (!configured) {
    configured = DEFAULT_BASE_URL;
  }

  configured = configured.trim();
  if (!configured) {
    throw new ConfigurationError("Hosted mode baseURL must not be empty");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch (err) {
    throw new ConfigurationError("Hosted mode baseURL is malformed: " + String(err));
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConfigurationError("Hosted mode requires an absolute HTTP(S) baseURL");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new ConfigurationError(
      "Hosted mode baseURL must not contain credentials, a query, or a fragment"
    );
  }

  let pathname = url.pathname.replace(/\/+$/, "");
  if (!pathname.endsWith("/v1")) {
    pathname = `${pathname}/v1`;
  }

  return `${url.origin}${pathname}/`;
}

export function resolveASRURL(asrURL?: string, fallbackBaseURL?: string): string {
  let configured =
    asrURL ??
    (typeof process !== "undefined" && process.env
      ? process.env.NATLAS_ASR_URL
      : undefined);

  if (!configured) {
    if (fallbackBaseURL && fallbackBaseURL.includes("localhost")) {
      return fallbackBaseURL;
    }
    configured = DEFAULT_ASR_URL;
  }

  return resolveBaseURL(configured);
}


export function resolveApiKey(apiKey?: string): string {
  const resolved =
    apiKey ??
    (typeof process !== "undefined" && process.env
      ? process.env.NATLAS_API_KEY
      : undefined);

  if (!resolved || !resolved.trim()) {
    throw new ConfigurationError(
      "Hosted mode requires a non-empty API key. Pass apiKey: '...' or set the NATLAS_API_KEY environment variable."
    );
  }

  return resolved.trim();
}

function parseUsage(raw: unknown): Usage {
  if (!raw || typeof raw !== "object") {
    return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  }
  const u = raw as Record<string, unknown>;
  return {
    prompt_tokens: typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0,
    completion_tokens: typeof u.completion_tokens === "number" ? u.completion_tokens : 0,
    total_tokens: typeof u.total_tokens === "number" ? u.total_tokens : 0,
  };
}

function parseChatResponse(data: unknown, fallbackModel: string): ChatResponse {
  if (!data || typeof data !== "object") {
    throw new APIResponseValidationError("Hosted chat response is not an object");
  }
  const obj = data as Record<string, unknown>;
  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new APIResponseValidationError("Hosted chat response is missing choices");
  }
  const choice = choices[0];
  if (!choice || typeof choice !== "object" || !choice.message) {
    throw new APIResponseValidationError("Hosted chat choice is malformed");
  }
  const msg = choice.message as Record<string, unknown>;

  return {
    model: typeof obj.model === "string" ? obj.model : fallbackModel,
    created: typeof obj.created === "number" ? obj.created : Math.floor(Date.now() / 1000),
    message: {
      role: (msg.role as Message["role"]) ?? "assistant",
      content: typeof msg.content === "string" ? msg.content : "",
    },
    done: true,
    done_reason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    usage: parseUsage(obj.usage),
  };
}

function parseGenerateResponse(data: unknown, fallbackModel: string): GenerateResponse {
  if (!data || typeof data !== "object") {
    throw new APIResponseValidationError("Hosted completion response is not an object");
  }
  const obj = data as Record<string, unknown>;
  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new APIResponseValidationError("Hosted completion response is missing choices");
  }
  const choice = choices[0];
  if (!choice || typeof choice !== "object") {
    throw new APIResponseValidationError("Hosted completion choice is malformed");
  }

  return {
    model: typeof obj.model === "string" ? obj.model : fallbackModel,
    created: typeof obj.created === "number" ? obj.created : Math.floor(Date.now() / 1000),
    response: typeof choice.text === "string" ? choice.text : "",
    done: true,
    done_reason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    usage: parseUsage(obj.usage),
  };
}

function parseChatChunk(event: Record<string, unknown>, fallbackModel: string): ChatResponse {
  const choices = event.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new StreamProtocolError("Hosted chat stream event is missing choices");
  }
  const choice = choices[0];
  if (!choice || typeof choice !== "object") {
    throw new StreamProtocolError("Hosted chat stream choice is malformed");
  }
  const delta = (choice.delta ?? {}) as Record<string, unknown>;

  return {
    model: typeof event.model === "string" ? event.model : fallbackModel,
    created: typeof event.created === "number" ? event.created : Math.floor(Date.now() / 1000),
    message: {
      role: (delta.role as Message["role"]) ?? "assistant",
      content: typeof delta.content === "string" ? delta.content : "",
    },
    done: choice.finish_reason != null,
    done_reason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    usage: parseUsage(event.usage),
  };
}

function parseGenerateChunk(event: Record<string, unknown>, fallbackModel: string): GenerateResponse {
  const choices = event.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new StreamProtocolError("Hosted completion stream event is missing choices");
  }
  const choice = choices[0];
  if (!choice || typeof choice !== "object") {
    throw new StreamProtocolError("Hosted completion stream choice is malformed");
  }

  return {
    model: typeof event.model === "string" ? event.model : fallbackModel,
    created: typeof event.created === "number" ? event.created : Math.floor(Date.now() / 1000),
    response: typeof choice.text === "string" ? choice.text : "",
    done: choice.finish_reason != null,
    done_reason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    usage: parseUsage(event.usage),
  };
}

/**
 * Audio namespace for speech-to-text (ASR) operations.
 */
export class Audio {
  constructor(private readonly client: NatlasClient) {}

  public readonly transcriptions = {
    /**
     * Transcribe speech in Nigerian languages (Yoruba, Hausa, Igbo, Nigerian English).
     *
     * @param file Blob, Buffer, Uint8Array, or File
     * @param options Transcription options including language and word timestamps
     */
    create: async (
      file: Blob | Uint8Array | ArrayBuffer | { buffer: ArrayBuffer; name?: string },
      options: TranscriptionOptions = {}
    ): Promise<TranscriptionResponse> => {
      const formData = new FormData();

      let blob: Blob;
      if (file instanceof Blob) {
        blob = file;
      } else if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
        blob = new Blob([file as any], { type: "audio/wav" });
      } else if ("buffer" in file && file.buffer instanceof ArrayBuffer) {
        blob = new Blob([file.buffer as any], { type: "audio/wav" });
      } else {
        throw new Error("Invalid audio file format; pass a Blob, Buffer, or Uint8Array");
      }

      formData.append("file", blob, "audio.wav");

      if (options.model) {
        formData.append("model", options.model);
      }
      if (options.language) {
        formData.append("language", options.language);
      }
      if (options.response_format) {
        formData.append("response_format", options.response_format);
      }
      if (options.timestamp_granularities) {
        for (const g of options.timestamp_granularities) {
          formData.append("timestamp_granularities[]", g);
        }
      }

      return this.client.request<TranscriptionResponse>(
        "audio/transcriptions",
        {
          method: "POST",
          body: formData,
        },
        this.client.asrBaseURL
      );
    },

    /**
     * Connect to the real-time Deepgram-style streaming ASR WebSocket endpoint.
     * Streams raw audio chunks (PCM 16kHz 16-bit mono) and receives live transcripts.
     */
    live: (options: LiveTranscriptionOptions = {}): LiveTranscriptionSession => {
      return new LiveTranscriptionSession(this.client, options);
    },
  };
}

/**
 * Real-time streaming ASR session using WebSocket (Deepgram clone protocol).
 */
export class LiveTranscriptionSession {
  private ws: any;
  private readonly listeners: {
    transcript: Array<(event: LiveTranscriptionEvent) => void>;
    error: Array<(err: Error) => void>;
    close: Array<() => void>;
    open: Array<() => void>;
  } = {
    transcript: [],
    error: [],
    close: [],
    open: [],
  };

  constructor(
    private readonly client: NatlasClient,
    private readonly options: LiveTranscriptionOptions = {}
  ) {
    if (options.onTranscript) this.listeners.transcript.push(options.onTranscript);
    if (options.onError) this.listeners.error.push(options.onError);
    if (options.onClose) this.listeners.close.push(options.onClose);

    this.connect();
  }

  private connect(): void {
    const rawAsrUrl = this.client.asrBaseURL;
    const wsProto = rawAsrUrl.startsWith("https://") ? "wss://" : "ws://";
    const hostAndPath = rawAsrUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    let wsEndpoint = `${wsProto}${hostAndPath}/audio/transcriptions/streaming`;
    const params = new URLSearchParams();
    if (this.options.language) {
      params.set("language", this.options.language);
    }
    if (this.options.model) {
      params.set("model", this.options.model);
    }
    const query = params.toString();
    if (query) {
      wsEndpoint += `?${query}`;
    }

    const WebSocketImpl =
      typeof WebSocket !== "undefined"
        ? WebSocket
        : (globalThis as any).WebSocket;

    if (!WebSocketImpl) {
      throw new ConfigurationError(
        "No WebSocket implementation found in the environment. In Node.js, ensure Node >= 21 or provide globalThis.WebSocket."
      );
    }

    try {
      this.ws = new WebSocketImpl(wsEndpoint, {
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });
    } catch {
      // In browser or standard WebSocket without header options, pass token as subprotocol or fallback
      this.ws = new WebSocketImpl(wsEndpoint);
    }

    this.ws.onopen = () => {
      for (const listener of this.listeners.open) listener();
    };

    this.ws.onmessage = (event: any) => {
      try {
        const text = typeof event.data === "string" ? event.data : event.data.toString();
        const parsed = JSON.parse(text) as LiveTranscriptionEvent;
        for (const listener of this.listeners.transcript) {
          listener(parsed);
        }
      } catch (err: any) {
        for (const listener of this.listeners.error) {
          listener(new Error(`Failed to parse ASR stream message: ${err.message}`));
        }
      }
    };

    this.ws.onerror = (err: any) => {
      const errorObj = err instanceof Error ? err : new Error(String(err?.message || err));
      for (const listener of this.listeners.error) {
        listener(errorObj);
      }
    };

    this.ws.onclose = () => {
      for (const listener of this.listeners.close) {
        listener();
      }
    };
  }

  /**
   * Send binary audio chunk (e.g. PCM 16-bit 16kHz mono).
   */
  public send(data: ArrayBuffer | Uint8Array | Blob): void {
    if (this.ws && this.ws.readyState === 1 /* OPEN */) {
      this.ws.send(data);
    } else {
      throw new Error("Cannot send audio chunk: WebSocket is not open");
    }
  }

  /**
   * Event listener subscription.
   */
  public on(event: "transcript", cb: (data: LiveTranscriptionEvent) => void): this;
  public on(event: "error", cb: (err: Error) => void): this;
  public on(event: "close", cb: () => void): this;
  public on(event: "open", cb: () => void): this;
  public on(event: string, cb: any): this {
    if (event in this.listeners) {
      (this.listeners as any)[event].push(cb);
    }
    return this;
  }

  /**
   * Cleanly finish and close the real-time stream.
   */
  public close(): void {
    if (this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: "CloseStream" }));
      } catch {
        // ignore
      }
      this.ws.close();
    }
  }
}

/**
 * N-ATLaS TypeScript/JavaScript API Client.
 */
export class NatlasClient {
  public readonly baseURL: string;
  public readonly asrBaseURL: string;
  public readonly apiKey: string;
  public readonly model: string;
  public readonly timeout: number;
  private readonly customHeaders: Record<string, string>;
  private readonly fetchFn: typeof fetch;

  public readonly audio: Audio;

  constructor(options: ClientOptions = {}) {
    const rawUrl = options.baseURL ?? options.host;
    this.baseURL = resolveBaseURL(rawUrl);
    this.asrBaseURL = resolveASRURL(options.asrBaseURL, this.baseURL);
    this.apiKey = resolveApiKey(options.apiKey);
    this.model = options.model ?? DEFAULT_MODEL;
    this.timeout = options.timeout ?? 120_000;
    this.customHeaders = options.headers ?? {};
    this.fetchFn = options.fetch ?? globalThis.fetch;

    if (!this.fetchFn) {
      throw new ConfigurationError(
        "No global fetch found. Please provide a custom fetch implementation or upgrade Node.js to >= 18."
      );
    }

    this.audio = new Audio(this);
  }

  /**
   * Internal request dispatcher with timeout, error translation, and auth headers.
   */
  public async request<T = unknown>(
    endpoint: string,
    init: RequestInit = {},
    customBaseURL?: string
  ): Promise<T> {
    const root = customBaseURL ?? this.baseURL;
    const url = new URL(endpoint.replace(/^\/+/, ""), root);

    const headers = new Headers(this.customHeaders);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }

    if (init.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // Do not set Content-Type if body is FormData (let browser/runtime set multipart boundary)
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url.toString(), {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Hosted API request failed with status ${response.status}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object") {
            const errObj = parsed.error || parsed.detail || parsed.message;
            if (typeof errObj === "string") {
              message = errObj;
            } else if (errObj && typeof errObj === "object" && "message" in errObj) {
              message = String(errObj.message);
            }
          }
        } catch {
          // ignore json parse error
        }

        throw new APIStatusError(message, {
          statusCode: response.status,
          responseText: text,
          method: init.method ?? "GET",
          url: url.toString(),
        });
      }

      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch (err) {
        throw new APIResponseValidationError("Hosted API returned invalid JSON", err);
      }
    } catch (err: any) {
      if (err instanceof NatlasError) {
        throw err;
      }
      if (err.name === "AbortError" || controller.signal.aborted) {
        throw new APITimeoutError(`Request timed out after ${this.timeout}ms`);
      }
      throw new APIConnectionError(`Failed to connect to N-ATLaS API: ${err.message}`, err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Internal streaming dispatcher yielding raw SSE Uint8Array stream.
   */
  private async requestStream(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<ReadableStream<Uint8Array>> {
    const url = new URL(endpoint.replace(/^\/+/, ""), this.baseURL);

    const headers = new Headers(this.customHeaders);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "text/event-stream");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new APIStatusError(`Streaming failed with status ${response.status}: ${text}`, {
          statusCode: response.status,
          responseText: text,
          method: "POST",
          url: url.toString(),
        });
      }

      if (!response.body) {
        throw new StreamProtocolError("Response body is null");
      }

      return response.body as ReadableStream<Uint8Array>;
    } catch (err: any) {
      if (err instanceof NatlasError) {
        throw err;
      }
      if (err.name === "AbortError" || controller.signal.aborted) {
        throw new APITimeoutError(`Stream connection timed out after ${this.timeout}ms`);
      }
      throw new APIConnectionError(`Failed to initiate stream: ${err.message}`, err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send a chat message array to N-ATLaS.
   */
  public async chat(
    messages: Message[],
    options?: ChatOptions & { stream?: false }
  ): Promise<ChatResponse>;
  public async chat(
    messages: Message[],
    options: ChatOptions & { stream: true }
  ): Promise<AsyncIterable<ChatResponse>>;
  public async chat(
    messages: Message[],
    options: ChatOptions & { stream?: boolean } = {}
  ): Promise<ChatResponse | AsyncIterable<ChatResponse>> {
    if (!messages || messages.length === 0) {
      throw new Error("messages must contain at least one message");
    }

    const { stream, model, ...sampling } = options;
    const reqModel = model ?? this.model;

    const requestPayload: ChatRequest = {
      model: reqModel,
      messages,
      stream: Boolean(stream),
      ...sampling,
    };

    if (stream) {
      const byteStream = await this.requestStream("chat/completions", requestPayload as any);
      const rawEvents = parseSSEStream(byteStream);

      async function* generateChunks(): AsyncGenerator<ChatResponse, void, unknown> {
        for await (const event of rawEvents) {
          yield parseChatChunk(event, reqModel);
        }
      }

      return generateChunks();
    }

    const raw = await this.request<unknown>("chat/completions", {
      method: "POST",
      body: JSON.stringify(requestPayload),
    });

    return parseChatResponse(raw, reqModel);
  }

  /**
   * Generate text completions from a prompt string.
   */
  public async generate(
    prompt: string,
    options?: GenerateOptions & { stream?: false }
  ): Promise<GenerateResponse>;
  public async generate(
    prompt: string,
    options: GenerateOptions & { stream: true }
  ): Promise<AsyncIterable<GenerateResponse>>;
  public async generate(
    prompt: string,
    options: GenerateOptions & { stream?: boolean } = {}
  ): Promise<GenerateResponse | AsyncIterable<GenerateResponse>> {
    if (!prompt || !prompt.trim()) {
      throw new Error("prompt must be a non-empty string");
    }

    const { stream, model, ...sampling } = options;
    const reqModel = model ?? this.model;

    const requestPayload: GenerateRequest = {
      model: reqModel,
      prompt,
      stream: Boolean(stream),
      ...sampling,
    };

    if (stream) {
      const byteStream = await this.requestStream("completions", requestPayload as any);
      const rawEvents = parseSSEStream(byteStream);

      async function* generateChunks(): AsyncGenerator<GenerateResponse, void, unknown> {
        for await (const event of rawEvents) {
          yield parseGenerateChunk(event, reqModel);
        }
      }

      return generateChunks();
    }

    const raw = await this.request<unknown>("completions", {
      method: "POST",
      body: JSON.stringify(requestPayload),
    });

    return parseGenerateResponse(raw, reqModel);
  }

  /**
   * Transcribe speech in Nigerian languages (Yoruba, Hausa, Igbo, Nigerian English).
   */
  public async transcribe(
    file: Blob | Uint8Array | ArrayBuffer | { buffer: ArrayBuffer; name?: string },
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResponse> {
    return this.audio.transcriptions.create(file, options);
  }

  /**
   * Escape hatch for custom GET requests.
   */
  public async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  /**
   * Escape hatch for custom POST requests.
   */
  public async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Module-level convenience client alias
export const Client = NatlasClient;
