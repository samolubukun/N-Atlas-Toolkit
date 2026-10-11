/**
 * Errors thrown by the N-ATLaS JavaScript/TypeScript SDK.
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

export class NatlasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NatlasError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigurationError extends NatlasError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class APIConnectionError extends NatlasError {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "APIConnectionError";
    this.cause = cause;
  }
}

export class APITimeoutError extends NatlasError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "APITimeoutError";
  }
}

export class APIStatusError extends NatlasError {
  public readonly statusCode: number;
  public readonly responseText?: string;
  public readonly method?: string;
  public readonly url?: string;

  constructor(
    message: string,
    options: {
      statusCode: number;
      responseText?: string;
      method?: string;
      url?: string;
    }
  ) {
    super(message);
    this.name = "APIStatusError";
    this.statusCode = options.statusCode;
    this.responseText = options.responseText;
    this.method = options.method;
    this.url = options.url;
  }
}

export class APIResponseValidationError extends NatlasError {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "APIResponseValidationError";
    this.cause = cause;
  }
}

export class AuthError extends APIStatusError {
  constructor(message = "Authentication failed (401)", options?: any) {
    super(message, { statusCode: 401, ...options });
    this.name = "AuthError";
  }
}

export class RateLimitError extends APIStatusError {
  public readonly retryAfter?: number;

  constructor(message = "Rate limit exceeded (429)", options?: any) {
    super(message, { statusCode: 429, ...options });
    this.name = "RateLimitError";
    this.retryAfter = options?.retryAfter;
  }
}

export class BadRequestError extends APIStatusError {
  constructor(message = "Bad request (400)", options?: any) {
    super(message, { statusCode: 400, ...options });
    this.name = "BadRequestError";
  }
}

export class ServerError extends APIStatusError {
  constructor(message = "Internal server error", options?: any) {
    super(message, { statusCode: options?.statusCode ?? 500, ...options });
    this.name = "ServerError";
  }
}

export class AbortError extends NatlasError {
  constructor(message = "Request was aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export class StreamProtocolError extends NatlasError {
  constructor(message: string) {
    super(message);
    this.name = "StreamProtocolError";
  }
}
