import type { SchooxClient } from "../api/client.js";
import type { SchooxClientConfig, RouteConfig, ToolSuccessResult, ToolErrorResult } from "../api/types.js";
import { errorResult, sanitize } from "../api/errors.js";
import { fetchAllPages } from "../api/pagination.js";

/**
 * Create a generic tool handler that routes actions to the correct API endpoint.
 *
 * The handler:
 * 1. Validates the action exists in the route map
 * 2. Validates required path params are present
 * 3. Substitutes path params into the URL
 * 4. Calls fetchAllPages for paginated routes, client.fetch for non-paginated
 * 5. Wraps response in { data, _meta } envelope
 * 6. Catches errors and returns sanitized api_error
 */
export function createToolHandler(
  toolName: string,
  toolRoutes: Record<string, RouteConfig>,
  client: SchooxClient,
  config: SchooxClientConfig
): (params: Record<string, unknown>) => Promise<ToolSuccessResult | ToolErrorResult> {
  return async (params: Record<string, unknown>): Promise<ToolSuccessResult | ToolErrorResult> => {
    try {
      const action = params.action as string;

      // Validate action exists
      const route = toolRoutes[action];
      if (!route) {
        const validActions = Object.keys(toolRoutes).join(", ");
        return errorResult(
          "validation_error",
          `Unknown action: ${action} for tool ${toolName}`,
          `Available actions: ${validActions}`
        );
      }

      // Validate required path params
      for (const pathParam of route.pathParams) {
        if (params[pathParam] === undefined || params[pathParam] === null) {
          return errorResult(
            "validation_error",
            `Missing required parameter: ${pathParam} for action ${action}`,
            `The ${action} action requires ${pathParam}. Example: ${pathParam}: 123`
          );
        }
      }

      // Build resolved path and query params
      let resolvedPath = route.path;
      const queryParams: Record<string, string | number | boolean> = {};

      for (const [key, value] of Object.entries(params)) {
        if (key === "action" || value === undefined || value === null) {
          continue;
        }

        const placeholder = `{${key}}`;
        if (resolvedPath.includes(placeholder)) {
          resolvedPath = resolvedPath.replace(placeholder, String(value));
        } else {
          queryParams[key] = value as string | number | boolean;
        }
      }

      // Execute request
      if (route.paginated) {
        // Remove start/limit from query params -- pagination module manages these
        delete queryParams.start;
        delete queryParams.limit;

        const result = await fetchAllPages(client, resolvedPath, queryParams, config.maxRecords);

        const meta: Record<string, unknown> = {
          tool: toolName,
          action,
          returned: result.totalFetched,
          truncated: result.truncated,
        };

        if (result.truncated) {
          meta.total_available = undefined;
          meta.message = `Results capped at ${config.maxRecords}. Use filters to narrow your query.`;
        }

        const response = { data: result.data, _meta: meta };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(response) }],
        };
      } else {
        // Non-paginated: single fetch
        const apiResult = await client.fetch(resolvedPath, queryParams);

        const response = {
          data: apiResult,
          _meta: {
            tool: toolName,
            action,
            returned: Array.isArray(apiResult) ? apiResult.length : 1,
          },
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(response) }],
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(
        "api_error",
        sanitize(message, config),
        "Check your parameters and try again."
      );
    }
  };
}
