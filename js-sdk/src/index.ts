/**
 * N-ATLaS JavaScript/TypeScript SDK
 *
 * Sovereign Multilingual AI SDK for Nigerian Languages (Yoruba, Hausa, Igbo, Nigerian English).
 *
 * N-ATLaS is an initiative of the Federal Ministry of Communications,
 * Innovation and Digital Economy, and powered by Awarri Technologies.
 */

export * from "./types.js";
export * from "./errors.js";
export * from "./languages.js";
export * from "./client.js";
export * from "./sse.js";
export * as tools from "./tools/index.js";

// Convenience default export
import { NatlasClient } from "./client.js";
export default NatlasClient;
