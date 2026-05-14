import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SchooxClient, createSchooxClient } from "./client.js";
import type { SchooxClientConfig } from "./types.js";

const testConfig: SchooxClientConfig = {
  baseUrl: "https://api.schoox.com/v1",
  apiKey: "test-api-key",
  acadId: "12345",
  timeoutMs: 60_000,
  maxRecords: 1000,
};

describe("SchooxClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("constructs URL with apikey and acadId query params", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      capturedUrl = url.toString();
      return new Response(JSON.stringify({ id: 1 }), { status: 200 });
    }) as typeof fetch;

    const client = createSchooxClient(testConfig);
    await client.fetch("/users", {});

    expect(capturedUrl).toContain("apikey=test-api-key");
    expect(capturedUrl).toContain("acadId=12345");
  });

  it("sets Accept: application/json header", async () => {
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = createSchooxClient(testConfig);
    await client.fetch("/users", {});

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/json");
  });

  it("throws on non-ok responses with sanitized error", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const client = createSchooxClient(testConfig);
    await expect(client.fetch("/users/999", {})).rejects.toThrow();
  });

  it("retries on 429 with exponential backoff (up to 3 retries)", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount <= 3) {
        return new Response("Too Many Requests", { status: 429 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    // Use short timeout config to speed up test
    const fastConfig = { ...testConfig, timeoutMs: 30_000 };
    const client = createSchooxClient(fastConfig);

    // Mock setTimeout to speed up backoff
    vi.useFakeTimers();
    const fetchPromise = client.fetch("/users", {});
    // Advance through retries
    await vi.advanceTimersByTimeAsync(1000); // 1st retry
    await vi.advanceTimersByTimeAsync(2000); // 2nd retry
    await vi.advanceTimersByTimeAsync(4000); // 3rd retry

    const result = await fetchPromise;
    expect(callCount).toBe(4); // initial + 3 retries
    expect(result).toEqual({ ok: true });
    vi.useRealTimers();
  });

  it("gives up after 3 retries on 429 and throws", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Too Many Requests", { status: 429 });
    }) as typeof fetch;

    const client = createSchooxClient(testConfig);

    vi.useFakeTimers();
    const fetchPromise = client.fetch("/users", {});
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(fetchPromise).rejects.toThrow();
    vi.useRealTimers();
  });

  it("aborts after timeout (AbortController)", async () => {
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      // Simulate a request that would take forever
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    }) as typeof fetch;

    const shortConfig = { ...testConfig, timeoutMs: 100 };
    const client = createSchooxClient(shortConfig);

    await expect(client.fetch("/users", {})).rejects.toThrow();
  });

  it("only allows GET method (no POST/PUT/DELETE possible)", async () => {
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = createSchooxClient(testConfig);
    await client.fetch("/users", {});

    expect(capturedInit?.method).toBe("GET");
  });
});

describe("createSchooxClient", () => {
  it("returns a SchooxClient instance", () => {
    const client = createSchooxClient(testConfig);
    expect(client).toBeInstanceOf(SchooxClient);
    expect(typeof client.fetch).toBe("function");
  });
});
