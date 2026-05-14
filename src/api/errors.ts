import type { ToolErrorResult } from "./types.js";

/**
 * Replace credential values with [REDACTED] in any string.
 * Prevents apiKey and acadId from leaking in error messages.
 */
export function sanitize(
  text: string,
  config: { apiKey: string; acadId: string }
): string {
  return text.replaceAll(config.apiKey, "[REDACTED]").replaceAll(config.acadId, "[REDACTED]");
}

/**
 * Build a structured MCP error result with three-part JSON body.
 * Sets isError: true so the LLM treats it as an error.
 */
export function errorResult(
  code: "validation_error" | "api_error" | "auth_error",
  message: string,
  suggestion: string
): ToolErrorResult {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: code, message, suggestion }),
      },
    ],
    isError: true,
  };
}

/**
 * Map HTTP status codes to user-friendly error messages.
 * Raw Schoox error bodies are never passed through directly to the LLM.
 */
export function friendlyApiError(
  status: number,
  body: string
): { message: string; suggestion: string } {
  switch (status) {
    case 400:
      return {
        message: `Bad request: ${body}`,
        suggestion: "Check parameter values and types.",
      };
    case 401:
      return {
        message: "Authentication failed.",
        suggestion: "Verify SCHOOX_API_KEY is correct and not expired.",
      };
    case 403:
      return {
        message: "Access denied.",
        suggestion:
          "Your API key may not have permission for this resource.",
      };
    case 404:
      return {
        message: "Resource not found.",
        suggestion: "Check the ID parameter.",
      };
    case 429:
      return {
        message: "Rate limited by Schoox API.",
        suggestion: "Try again in a few seconds.",
      };
    default:
      return {
        message: `Schoox API error (HTTP ${status}).`,
        suggestion: "This may be a temporary issue.",
      };
  }
}
