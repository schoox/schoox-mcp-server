import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createSchooxClient } from "./api/client.js";
import { registerAllTools } from "./tools/index.js";

// Validate credentials and create client before server starts.
// loadConfig() exits the process if required env vars are missing.
const config = loadConfig();
const client = createSchooxClient(config);

const server = new McpServer({
  name: "@schoox/schoox-mcp-server",
  version: "1.0.2",
});

registerAllTools(server, client, config);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Schoox MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
