# @schoox/schoox-mcp-server

MCP server for querying Schoox LMS data via AI assistants. Provides 15 read-only tools for users, courses, enrollments, events, exams, skills, and more.

## Installation

```bash
npx @schoox/schoox-mcp-server
```

Requires Node.js 18+.

## Required Environment Variables

- `SCHOOX_API_KEY` -- Schoox API key (from academy admin settings)
- `SCHOOX_ACADEMY_ID` -- Numeric academy ID (from academy admin settings)

## Optional Environment Variables

- `SCHOOX_MAX_RECORDS` -- Max records per paginated request (default: 1000)
- `SCHOOX_BASE_URL` -- API base URL (default: https://api.schoox.com/v1)

## MCP Configuration

### Claude Desktop

Config file location:
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

Note: Claude Desktop has a minimal PATH. Use the full path to npx (`which npx` to find it).

### Claude Code

Add to `~/.claude.json` (global) or `.mcp.json` (project-level):

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

Or via CLI: `claude mcp add schoox -e SCHOOX_API_KEY=your-api-key -e SCHOOX_ACADEMY_ID=123456 -- npx -y @schoox/schoox-mcp-server`

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

## Available Tools

| Tool | Description |
|------|-------------|
| aboves | Organizational hierarchy levels above units |
| badges | Academy badges |
| content | Content items (web resources, files, SCORM) |
| courses | Course catalog, details, skills, students, lectures, exams |
| curriculums | Learning paths and structured training programs |
| dashboard | Training analytics and progress reporting |
| events | Instructor-led and virtual classroom events |
| exams | Exam metadata and student results |
| groups | User groups |
| jobs | Job roles |
| skills | Skill/competency definitions and assessments |
| types | Custom type definitions |
| units | Organizational units (stores, locations, departments) |
| usage | Academy-wide usage and licensing statistics |
| users | User profiles and badges |

## Security

This server is read-only by default. All API calls require valid credentials passed via environment variables. No credentials are stored on disk.
