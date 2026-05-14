import { describe, it, expect, vi } from "vitest";
import { createToolHandler } from "./handler.js";
import type { SchooxClient } from "../api/client.js";
import type { SchooxClientConfig, RouteConfig } from "../api/types.js";

const mockConfig: SchooxClientConfig = {
  baseUrl: "https://api.schoox.com/v1",
  apiKey: "test-key-123",
  acadId: "999",
  timeoutMs: 60000,
  maxRecords: 1000,
};

function mockClient(response: unknown = []): SchooxClient {
  return {
    fetch: vi.fn().mockResolvedValue(response),
  } as unknown as SchooxClient;
}

const testRoutes: Record<string, RouteConfig> = {
  list: { path: "/users", paginated: true, pathParams: [] },
  get: { path: "/users/{userId}", paginated: false, pathParams: ["userId"] },
  get_badges: { path: "/users/{userId}/badges", paginated: false, pathParams: ["userId"] },
};

describe("createToolHandler", () => {
  it("returns validation_error for unknown action", async () => {
    const client = mockClient();
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    const result = await handler({ action: "nonexistent" });

    expect(result).toHaveProperty("isError", true);
    const text = JSON.parse(result.content[0].text);
    expect(text.error).toBe("validation_error");
    expect(text.message).toContain("Unknown action");
    expect(text.message).toContain("nonexistent");
    expect(text.suggestion).toContain("list");
  });

  it("returns validation_error when required path param is missing", async () => {
    const client = mockClient();
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    const result = await handler({ action: "get" });

    expect(result).toHaveProperty("isError", true);
    const text = JSON.parse(result.content[0].text);
    expect(text.error).toBe("validation_error");
    expect(text.message).toContain("Missing required parameter");
    expect(text.message).toContain("userId");
  });

  it("wraps successful response in { data, _meta } envelope", async () => {
    const userData = { id: 123, name: "Jane" };
    const client = mockClient(userData);
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    const result = await handler({ action: "get", userId: 123 });

    expect(result).not.toHaveProperty("isError");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data).toEqual(userData);
    expect(parsed._meta).toEqual({
      tool: "users",
      action: "get",
      returned: 1,
    });
  });

  it("includes pagination _meta fields when paginated", async () => {
    // For paginated routes, the handler uses fetchAllPages internally
    // We test the handler end-to-end with a mock client that returns a small page
    const users = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const client = mockClient(users);
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    const result = await handler({ action: "list" });

    expect(result).not.toHaveProperty("isError");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data).toHaveLength(3);
    expect(parsed._meta.tool).toBe("users");
    expect(parsed._meta.action).toBe("list");
    expect(parsed._meta.returned).toBe(3);
    expect(parsed._meta.truncated).toBe(false);
  });

  it("passes non-path params as query params to client.fetch", async () => {
    const client = mockClient({ id: 123, name: "Jane" });
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    await handler({ action: "get", userId: 123, external_id: true });

    expect(client.fetch).toHaveBeenCalledWith(
      "/users/123",
      { external_id: true }
    );
  });

  it("substitutes path params into URL path", async () => {
    const client = mockClient([{ badge: "gold" }]);
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    await handler({ action: "get_badges", userId: 456 });

    expect(client.fetch).toHaveBeenCalledWith("/users/456/badges", {});
  });

  it("includes truncation metadata when results are capped", async () => {
    // Create a config with maxRecords=5 and a client that returns exactly 5 items
    const smallConfig = { ...mockConfig, maxRecords: 5 };
    const page = Array.from({ length: 5 }, (_, i) => ({ id: i }));
    const client = mockClient(page);
    const handler = createToolHandler("users", testRoutes, client, smallConfig);

    const result = await handler({ action: "list" });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._meta.truncated).toBe(true);
    expect(parsed._meta.message).toContain("Results capped at");
    expect(parsed._meta.message).toContain("5");
  });

  it("catches errors and returns api_error with sanitized message", async () => {
    const client = {
      fetch: vi.fn().mockRejectedValue(new Error("Failed at https://api.schoox.com?apikey=test-key-123&acadId=999")),
    } as unknown as SchooxClient;
    const handler = createToolHandler("users", testRoutes, client, mockConfig);

    const result = await handler({ action: "get", userId: 1 });

    expect(result).toHaveProperty("isError", true);
    const text = JSON.parse(result.content[0].text);
    expect(text.error).toBe("api_error");
    // Credentials should be sanitized
    expect(text.message).not.toContain("test-key-123");
    expect(text.message).not.toContain("999");
    expect(text.message).toContain("[REDACTED]");
  });
});
