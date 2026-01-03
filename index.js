#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DevServerManager {
  constructor() {
    this.processes = new Map();
    this.logBuffers = new Map();
    this.startAttempts = new Map();
  }

  async start(projectPath) {
    const absolute = resolve(projectPath);

    if (this.processes.has(absolute)) {
      const existing = this.processes.get(absolute);
      const attempts = (this.startAttempts.get(absolute) || 0) + 1;
      this.startAttempts.set(absolute, attempts);

      if (attempts === 2) {
        await this.stop(projectPath);
        return this._spawn(absolute);
      }

      return `Process already running. Call start again to restart.`;
    }

    this.startAttempts.set(absolute, 1);
    return this._spawn(absolute);
  }

  _spawn(absolute) {
    const logs = [];
    this.logBuffers.set(absolute, logs);

    const child = spawn('npm', ['run', 'dev'], {
      cwd: absolute,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: process.platform !== 'win32',
    });

    const collectLogs = (data) => {
      const line = data.toString();
      logs.push(line);
      if (logs.length > 1000) logs.shift();
    };

    child.stdout.on('data', collectLogs);
    child.stderr.on('data', collectLogs);
    child.unref();

    this.processes.set(absolute, { child, startTime: Date.now(), pid: child.pid });

    return `Started npm run dev in ${absolute}`;
  }

  async stop(projectPath) {
    const absolute = resolve(projectPath);
    const proc = this.processes.get(absolute);

    if (!proc) return `No process running for ${absolute}`;

    const { child, pid } = proc;
    const isWindows = process.platform === 'win32';

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try {
          if (isWindows) {
            spawn('taskkill', ['/F', '/PID', pid.toString(), '/T']);
          } else {
            process.kill(-pid, 'SIGKILL');
          }
        } catch (e) {}
        this.processes.delete(absolute);
        this.startAttempts.delete(absolute);
        resolve(`Force killed process in ${absolute}`);
      }, 5000);

      child.once('exit', () => {
        clearTimeout(timeout);
        this.processes.delete(absolute);
        this.startAttempts.delete(absolute);
        resolve(`Stopped process in ${absolute}`);
      });

      try {
        if (isWindows) {
          spawn('taskkill', ['/F', '/PID', pid.toString(), '/T']);
        } else {
          process.kill(-pid, 'SIGTERM');
        }
      } catch (e) {}
    });
  }

  logs(projectPath) {
    const absolute = resolve(projectPath);
    const logLines = this.logBuffers.get(absolute) || [];
    return logLines.join('');
  }

  status(projectPath) {
    const absolute = resolve(projectPath);
    const proc = this.processes.get(absolute);

    if (!proc) return { running: false, path: absolute };

    const uptime = Date.now() - proc.startTime;
    const attempts = this.startAttempts.get(absolute) || 0;
    return {
      running: true,
      path: absolute,
      uptime: `${Math.floor(uptime / 1000)}s`,
      startAttempts: attempts,
    };
  }
}

const manager = new DevServerManager();

const server = new Server(
  {
    name: 'dev-server-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'start',
        description: 'Start npm run dev for a project. Call again to restart.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to project directory',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'stop',
        description: 'Stop the running development server, no need to stop for restarts',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to project directory',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'logs',
        description: 'Get output logs from the development server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to project directory',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'status',
        description: 'Get status of the development server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to project directory',
            },
          },
          required: ['path'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const path = args?.path;

  if (!path || typeof path !== 'string') {
    return {
      content: [{
        type: 'text',
        text: 'Error: path is required',
      }],
      isError: true,
    };
  }

  try {
    let result;
    switch (name) {
      case 'start':
        result = await manager.start(path);
        break;
      case 'stop':
        result = await manager.stop(path);
        break;
      case 'logs':
        result = manager.logs(path);
        break;
      case 'status':
        result = JSON.stringify(manager.status(path), null, 2);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{
        type: 'text',
        text: result,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
