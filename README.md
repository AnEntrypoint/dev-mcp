# dev-server-mcp

MCP (Model Context Protocol) server for managing development servers. Start, stop, inspect logs, and monitor status of any project's dev server via a standardized MCP interface.

## Features

- **start** - Launch `npm run dev` for any project. Call twice to restart.
- **stop** - Gracefully terminate the dev server (SIGTERM → 5s timeout → SIGKILL fallback).
- **logs** - Real-time output inspection with 1000-line rolling buffer.
- **status** - Monitor running state, uptime, and restart attempt count.

## Quick Start (claude code)

```bash
claude mcp add dev-server -s user npx -- gxe AnEntrypoint/dev-mcp
```
<img width="644" height="231" alt="image" src="https://github.com/user-attachments/assets/56415f78-8ebe-4b75-86a7-e2ac6b2a0eba" />
