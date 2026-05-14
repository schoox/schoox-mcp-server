import { describe, it, expect } from "vitest";
import { sanitize, errorResult, friendlyApiError } from "./errors.js";

describe("sanitize", () => {
  const config = { apiKey: "secret-key-123", acadId: "acad-456" };

  it("replaces apiKey value with [REDACTED]", () => {
    const input = "Error at https://api.schoox.com/v1/users?apikey=secret-key-123";
    expect(sanitize(input, config)).toBe(
      "Error at https://api.schoox.com/v1/users?apikey=[REDACTED]"
    );
  });

  it("replaces acadId value with [REDACTED]", () => {
    const input = "Request failed for acadId=acad-456";
    expect(sanitize(input, config)).toBe(
      "Request failed for acadId=[REDACTED]"
    );
  });

  it("handles strings containing both apiKey and acadId", () => {
    const input = "URL: ?apikey=secret-key-123&acadId=acad-456";
    expect(sanitize(input, config)).toBe(
      "URL: ?apikey=[REDACTED]&acadId=[REDACTED]"
    );
  });
});

describe("errorResult", () => {
  it("returns object with isError:true and three-part JSON", () => {
    const result = errorResult("api_error", "Something failed", "Try again");
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      error: "api_error",
      message: "Something failed",
      suggestion: "Try again",
    });
  });

  it("sets error field to 'validation_error'", () => {
    const result = errorResult("validation_error", "Bad input", "Fix it");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("validation_error");
  });

  it("sets error field to 'api_error'", () => {
    const result = errorResult("api_error", "API down", "Retry");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("api_error");
  });

  it("sets error field to 'auth_error'", () => {
    const result = errorResult("auth_error", "Invalid key", "Check key");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("auth_error");
  });
});

describe("friendlyApiError", () => {
  it("401 returns message about authentication failed", () => {
    const result = friendlyApiError(401, "Unauthorized");
    expect(result.message).toContain("Authentication failed");
  });

  it("403 returns message about access denied", () => {
    const result = friendlyApiError(403, "Forbidden");
    expect(result.message).toContain("Access denied");
  });

  it("404 returns message about resource not found", () => {
    const result = friendlyApiError(404, "Not Found");
    expect(result.message).toContain("not found");
  });

  it("429 returns message about rate limited", () => {
    const result = friendlyApiError(429, "Too Many Requests");
    expect(result.message).toContain("Rate limited");
  });

  it("500 returns generic server error message", () => {
    const result = friendlyApiError(500, "Internal Server Error");
    expect(result.message).toContain("Schoox API error");
    expect(result.message).toContain("500");
  });
});
