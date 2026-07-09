# @schoox/schoox-mcp-server

MCP server for querying Schoox LMS data via AI assistants.

Connect your AI assistant to your Schoox academy and use natural language to query users, courses, enrollments, progress, events, and more -- without writing API code.



<video src="https://github.com/user-attachments/assets/65f8cdd8-4c2b-4975-a6a3-5d179b8274c0" width="100%" autoplay loop muted></video>



> [!WARNING]
> ## Data Privacy
>
> This server exposes sensitive Schoox data. The API returns **user PII** (names, emails, employment data) and **corporate confidential information** (training records, org structure, business data). Any data the MCP tools retrieve flows through your connected AI assistant.
>
> When you use this server with an AI client (Claude Desktop, Claude Code, Cursor, etc.), data returned by the tools is transmitted to your AI provider's servers as part of the conversation. Depending on your account type and your provider's policies, that data may be retained, logged, or used for model training (for example, on free or consumer-tier accounts). Review your AI provider's data usage and retention policies, and prefer accounts or plans with appropriate data protections (such as commercial or enterprise terms that guarantee no training on your data) before connecting this server to production academy data.
>
> **Disclaimer:** Schoox is not responsible for any data leaks, data exposure, or misuse of data resulting from use of this tool. Responsibility for compliance with your organization's data handling policies and applicable privacy regulations rests with you.
>
> For additional information, please see Schoox's [AI Functionality Policy](https://www.schoox.com/ai-functionality-policy/).

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/))
- **Schoox API key** and **Academy ID** (available from your Schoox academy admin settings)

## Quick Start

### Claude Desktop

Add to your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "schoox": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "@schoox/schoox-mcp-server"],
      "env": {
        "SCHOOX_API_KEY": "your-api-key",
        "SCHOOX_ACADEMY_ID": "123456"
      }
    }
  }
}
```

> **Note:** Claude Desktop uses a minimal PATH. If you use nvm or Volta, run `which npx` to find your full path and replace `/usr/local/bin/npx` above.

### Claude Code

Add to `~/.claude.json` (global, all projects) or `.mcp.json` in your project root (project-level):

```json
{
  "mcpServers": {
    "schoox": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@schoox/schoox-mcp-server"],
      "env": {
        "SCHOOX_API_KEY": "your-api-key",
        "SCHOOX_ACADEMY_ID": "123456"
      }
    }
  }
}
```

Or use the CLI:

```bash
claude mcp add schoox -e SCHOOX_API_KEY=your-api-key -e SCHOOX_ACADEMY_ID=123456 -- npx -y @schoox/schoox-mcp-server
```

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "schoox": {
      "command": "npx",
      "args": ["-y", "@schoox/schoox-mcp-server"],
      "env": {
        "SCHOOX_API_KEY": "your-api-key",
        "SCHOOX_ACADEMY_ID": "123456"
      }
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client can use the standard stdio configuration:

```json
{
  "mcpServers": {
    "schoox": {
      "command": "npx",
      "args": ["-y", "@schoox/schoox-mcp-server"],
      "env": {
        "SCHOOX_API_KEY": "your-api-key",
        "SCHOOX_ACADEMY_ID": "123456"
      }
    }
  }
}
```

## Example

Once configured, ask your AI assistant questions like:

> "Show me all active courses in my academy"

> "How many users completed the Safety Training course this month?"

> "List all events scheduled for next week"

The assistant uses the Schoox MCP tools automatically to fetch data from your academy and respond in natural language.

## Available Tools

| Tool | Description |
|------|-------------|
| aboves | Look up organizational hierarchy levels above units (regions, divisions, areas, districts) |
| badges | List available badges configured in the academy |
| content | Browse content items (web resources, uploaded files, SCORM packages) and metadata |
| courses | Query the course catalog, course details, skills, students, lectures, and exams |
| curriculums | Query learning paths (curricula) -- structured training programs |
| dashboard | Training analytics and progress reporting (per-user and aggregate) |
| events | Query instructor-led training (ILT) and virtual classroom (VC) events |
| exams | Query exam metadata and student exam results/scores |
| groups | List user groups configured in the academy |
| jobs | List job roles defined in the academy |
| skills | Query skill/competency definitions, assessments, and relationships |
| types | List custom type definitions configured in academy settings |
| units | Look up organizational units (stores, locations, departments) |
| usage | Get academy-wide usage and licensing summary statistics |
| users | Look up user profiles and badges |

## Configuration

All configuration is via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SCHOOX_API_KEY` | Yes | -- | Schoox API key from academy settings |
| `SCHOOX_ACADEMY_ID` | Yes | -- | Numeric academy ID from Schoox admin dashboard |
| `SCHOOX_MAX_RECORDS` | No | 1000 | Maximum records per paginated request |
| `SCHOOX_BASE_URL` | No | `https://api.schoox.com/v1` | API base URL |

## License

[MIT](LICENSE)
