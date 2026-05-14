import type { SchooxClientConfig } from "./api/types.js";

export type { SchooxClientConfig };

/**
 * Load and validate configuration from environment variables.
 * Exits the process with a clear error if required credentials are missing.
 */
export function loadConfig(): SchooxClientConfig {
  const apiKey = process.env.SCHOOX_API_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: SCHOOX_API_KEY environment variable is required.\nGet your API key from your Schoox academy settings."
    );
    process.exit(1);
  }

  const acadId = process.env.SCHOOX_ACADEMY_ID;
  if (!acadId) {
    console.error(
      "ERROR: SCHOOX_ACADEMY_ID environment variable is required.\nFind your academy ID in your Schoox admin dashboard."
    );
    process.exit(1);
  }

  const maxRecords = parseInt(process.env.SCHOOX_MAX_RECORDS ?? "1000", 10);
  const baseUrl =
    process.env.SCHOOX_BASE_URL ?? "https://api.schoox.com/v1";

  return {
    baseUrl,
    apiKey,
    acadId,
    timeoutMs: 60_000,
    maxRecords: Number.isNaN(maxRecords) ? 1000 : maxRecords,
  };
}
