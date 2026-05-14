import type { SchooxClient } from "./client.js";

/**
 * Auto-aggregate all pages from a paginated Schoox API endpoint.
 *
 * Loops using offset-based pagination (start/limit) until:
 * - A page returns fewer items than requested (last page)
 * - Total accumulated results reach maxRecords (safety cap)
 *
 * If the first response is not an array, returns it wrapped in a single-element array
 * (handles non-paginated endpoints that happen to be called through this path).
 */
export async function fetchAllPages(
  client: SchooxClient,
  path: string,
  params: Record<string, string | number | boolean>,
  maxRecords: number,
  pageSize: number = 100
): Promise<{ data: unknown[]; truncated: boolean; totalFetched: number }> {
  const results: unknown[] = [];
  let start = 0;

  while (results.length < maxRecords) {
    const limit = Math.min(pageSize, maxRecords - results.length);
    const response = await client.fetch(path, { ...params, start, limit });

    // Non-array response: single-object endpoint
    if (!Array.isArray(response)) {
      return { data: [response], truncated: false, totalFetched: 1 };
    }

    results.push(...response);

    // Last page: fewer items than requested
    if (response.length < limit) {
      break;
    }

    start += response.length;
  }

  return {
    data: results,
    truncated: results.length >= maxRecords,
    totalFetched: results.length,
  };
}
