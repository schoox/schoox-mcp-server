import { describe, it, expect, vi } from "vitest";
import { fetchAllPages } from "./pagination.js";
import { SchooxClient } from "./client.js";

// Mock SchooxClient
function mockClient(responses: unknown[]): SchooxClient {
  const fetchFn = vi.fn();
  for (const resp of responses) {
    fetchFn.mockResolvedValueOnce(resp);
  }
  return { fetch: fetchFn } as unknown as SchooxClient;
}

describe("fetchAllPages", () => {
  it("aggregates 3 pages of 100 items into 300 results", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 100 }, (_, i) => ({ id: 100 + i }));
    const page3 = Array.from({ length: 100 }, (_, i) => ({ id: 200 + i }));
    // 4th call returns empty array (signals end of data)
    const client = mockClient([page1, page2, page3, []]);

    const result = await fetchAllPages(client, "/users", {}, 1000, 100);

    expect(result.data).toHaveLength(300);
    expect(result.truncated).toBe(false);
    expect(result.totalFetched).toBe(300);
    // Verify pagination params passed correctly (4 calls: 3 full pages + 1 empty)
    expect(client.fetch).toHaveBeenCalledTimes(4);
    expect(client.fetch).toHaveBeenNthCalledWith(1, "/users", { start: 0, limit: 100 });
    expect(client.fetch).toHaveBeenNthCalledWith(2, "/users", { start: 100, limit: 100 });
    expect(client.fetch).toHaveBeenNthCalledWith(3, "/users", { start: 200, limit: 100 });
    expect(client.fetch).toHaveBeenNthCalledWith(4, "/users", { start: 300, limit: 100 });
  });

  it("stops when page returns fewer items than limit (last page)", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 42 }, (_, i) => ({ id: 100 + i }));
    const client = mockClient([page1, page2]);

    const result = await fetchAllPages(client, "/users", {}, 1000, 100);

    expect(result.data).toHaveLength(142);
    expect(result.truncated).toBe(false);
    expect(result.totalFetched).toBe(142);
    expect(client.fetch).toHaveBeenCalledTimes(2);
  });

  it("stops at maxRecords and sets truncated=true", async () => {
    // maxRecords = 150, so after 2 pages of 100 we'd have 200 but should stop at 150
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: 100 + i }));
    const client = mockClient([page1, page2]);

    const result = await fetchAllPages(client, "/users", {}, 150, 100);

    expect(result.data).toHaveLength(150);
    expect(result.truncated).toBe(true);
    expect(result.totalFetched).toBe(150);
    // Second request should have limit=50 (150-100)
    expect(client.fetch).toHaveBeenNthCalledWith(2, "/users", { start: 100, limit: 50 });
  });

  it("handles single-object (non-array) responses", async () => {
    const singleObj = { id: 1, name: "Test User" };
    const client = mockClient([singleObj]);

    const result = await fetchAllPages(client, "/users/1", {}, 1000);

    expect(result.data).toEqual([singleObj]);
    expect(result.truncated).toBe(false);
    expect(result.totalFetched).toBe(1);
  });

  it("returns truncated=false when all records fit", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const client = mockClient([page1]);

    const result = await fetchAllPages(client, "/users", {}, 1000, 100);

    expect(result.data).toHaveLength(50);
    expect(result.truncated).toBe(false);
    expect(result.totalFetched).toBe(50);
  });

  it("passes extra query params through to each page request", async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const client = mockClient([page1]);

    await fetchAllPages(client, "/users", { role: "employee", search: "john" }, 1000, 100);

    expect(client.fetch).toHaveBeenCalledWith("/users", {
      role: "employee",
      search: "john",
      start: 0,
      limit: 100,
    });
  });
});
