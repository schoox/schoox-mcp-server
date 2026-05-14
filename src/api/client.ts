import type { SchooxClientConfig } from "./types.js";
import { sanitize, friendlyApiError } from "./errors.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * HTTP client for the Schoox API.
 * Injects auth credentials as query params, enforces GET-only,
 * handles timeouts via AbortController, and retries on 429.
 */
export class SchooxClient {
  private config: SchooxClientConfig;

  constructor(config: SchooxClientConfig) {
    this.config = config;
  }

  /**
   * Make an authenticated GET request to the Schoox API.
   *
   * @param path - API path (e.g., "/users" or "/users/{userId}")
   * @param params - Query/path parameters. Path params like {userId} are substituted into the path.
   * @returns Parsed JSON response
   */
  async fetch(
    path: string,
    params: Record<string, string | number | boolean>
  ): Promise<unknown> {
    // Substitute path parameters (e.g., {userId}) into the path
    let resolvedPath = path;
    const queryParams: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      if (resolvedPath.includes(placeholder)) {
        resolvedPath = resolvedPath.replace(placeholder, String(value));
      } else {
        queryParams[key] = value;
      }
    }

    // Ensure baseUrl ends with / so relative paths append correctly
    // (without trailing /, new URL("/curriculums", "https://api.schoox.com/v1") drops /v1)
    const base = this.config.baseUrl.endsWith("/")
      ? this.config.baseUrl
      : this.config.baseUrl + "/";
    // Strip leading / from path so it's treated as relative to base
    const relativePath = resolvedPath.startsWith("/")
      ? resolvedPath.slice(1)
      : resolvedPath;
    const url = new URL(relativePath, base);
    url.searchParams.set("apikey", this.config.apiKey);
    url.searchParams.set("acadId", this.config.acadId);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, String(value));
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs
      );

      try {
        const response = await globalThis.fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            // Check Retry-After header, fall back to exponential backoff
            const retryAfter = response.headers.get("Retry-After");
            const delayMs = retryAfter
              ? Number(retryAfter) * 1000
              : BASE_DELAY_MS * Math.pow(2, attempt);
            await this.sleep(delayMs);
            continue;
          }
          // Max retries exhausted on 429
          const { message, suggestion } = friendlyApiError(429, "");
          throw new Error(
            sanitize(
              `${message} ${suggestion}`,
              this.config
            )
          );
        }

        if (!response.ok) {
          const body = await response.text();
          const { message, suggestion } = friendlyApiError(
            response.status,
            body
          );
          throw new Error(
            sanitize(
              `${message} ${suggestion}`,
              this.config
            )
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Re-throw non-retryable errors immediately
        if (
          lastError.name === "AbortError" ||
          (lastError.message && !lastError.message.includes("Rate limited"))
        ) {
          throw lastError;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a SchooxClient instance.
 */
export function createSchooxClient(config: SchooxClientConfig): SchooxClient {
  return new SchooxClient(config);
}
