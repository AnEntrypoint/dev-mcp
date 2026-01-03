# dev-server-mcp

MCP (Model Context Protocol) server for managing development servers. Start, stop, inspect logs, and monitor status of any project's dev server via a standardized MCP interface.

## Features

- **start** - Launch `npm run dev` for any project. Call twice to restart.
- **stop** - Gracefully terminate the dev server (SIGTERM → 5s timeout → SIGKILL fallback).
- **logs** - Real-time output inspection with 1000-line rolling buffer.
- **status** - Monitor running state, uptime, and restart attempt count.

## Quick Start

Run via gxe (clones from GitHub, no installation needed):

```bash
npx gxe AnEntrypoint/dev-mcp
```

## Setup for Claude Code CLI

Use the `claude mcp` command to add this server:

```bash
claude mcp add --transport stdio dev-server npx gxe AnEntrypoint/dev-mcp
```

This will register the MCP server and make it available in your Claude Code sessions.

### User-wide Installation (Optional)

To make it available in all projects (instead of just current project):

```bash
claude mcp add --transport stdio dev-server npx gxe AnEntrypoint/dev-mcp -s user
```

## Verify Installation

List configured MCP servers:

```bash
claude mcp list
```

You should see `dev-server` with status `✓ Connected`.

Get server details:

```bash
claude mcp get dev-server
```

## Using in Claude Code

Start a Claude Code session:

```bash
claude
```

The dev-server tools are now available. You can call them directly with paths to your projects.

## Tool Usage

### start

Start dev server for a project. Second call triggers restart.

```javascript
await client.callTool({
  name: 'start',
  arguments: { path: '/path/to/project' }
});
```

Response: `"Started npm run dev in /path/to/project"`

### stop

Stop the running dev server.

```javascript
await client.callTool({
  name: 'stop',
  arguments: { path: '/path/to/project' }
});
```

Response: `"Stopped process in /path/to/project"`

### logs

Get captured output from the dev server.

```javascript
await client.callTool({
  name: 'logs',
  arguments: { path: '/path/to/project' }
});
```

Response: Full stdout/stderr output

### status

Check if server is running and get uptime.

```javascript
await client.callTool({
  name: 'status',
  arguments: { path: '/path/to/project' }
});
```

Response:
```json
{
  "running": true,
  "path": "/path/to/project",
  "uptime": "42s",
  "startAttempts": 1
}
```

## Examples

### Start hookie dev server

```javascript
await client.callTool({
  name: 'start',
  arguments: { path: '/home/user/hookie' }
});
```

### Monitor moonlanding

```javascript
const status = await client.callTool({
  name: 'status',
  arguments: { path: '/home/user/lexco/moonlanding' }
});

const logs = await client.callTool({
  name: 'logs',
  arguments: { path: '/home/user/lexco/moonlanding' }
});
```

### Restart a server

Call start twice:

```javascript
await client.callTool({
  name: 'start',
  arguments: { path: '/path/to/project' }
});

// Triggers restart
await client.callTool({
  name: 'start',
  arguments: { path: '/path/to/project' }
});
```

## How It Works

1. **MCP Protocol** - Exposes tools via stdio transport
2. **Process Management** - Maps projects to child processes by absolute path
3. **Output Capture** - Streams stdout/stderr to 1000-line ring buffer
4. **Graceful Shutdown** - Sends SIGTERM, waits 5s, falls back to SIGKILL

## Requirements

- Node.js ≥18.0.0
- Project with `npm run dev` script

## License

MIT
