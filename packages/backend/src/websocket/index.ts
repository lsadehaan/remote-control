import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { URL } from 'url';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { JwtPayload } from '@remote-control/shared';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { logger } from '../utils/logger.js';
import Docker from 'dockerode';

// Import x-files.js for file browser
import { XFilesHandler } from 'x-files.js';

// Zod schemas for WebSocket message validation (lit-shell protocol)
const spawnMessageSchema = z.object({
  type: z.literal('spawn'),
  options: z.object({
    cols: z.number().int().min(10).max(500).optional(),
    rows: z.number().int().min(2).max(200).optional(),
    env: z.record(z.string()).optional(),
  }).optional(),
});

const dataMessageSchema = z.object({
  type: z.literal('data'),
  sessionId: z.string().min(1).max(100),
  data: z.string().max(65536), // Max 64KB per message
});

const resizeMessageSchema = z.object({
  type: z.literal('resize'),
  sessionId: z.string().min(1).max(100),
  cols: z.number().int().min(10).max(500),
  rows: z.number().int().min(2).max(200),
});

const closeMessageSchema = z.object({
  type: z.literal('close'),
  sessionId: z.string().min(1).max(100),
});

const terminalMessageSchema = z.discriminatedUnion('type', [
  spawnMessageSchema,
  dataMessageSchema,
  resizeMessageSchema,
  closeMessageSchema,
]);

interface DbProject {
  id: number;
  container_id: string | null;
  volume_path: string;
  user_id: number;
}

interface TerminalSession {
  id: string;
  projectId: number;
  containerId: string;
  ws: WebSocket;
  exec: Docker.Exec;
  stream: NodeJS.ReadWriteStream;
  cols: number;
  rows: number;
  createdAt: Date;
  lastActivity: Date;
}

// Store active terminal sessions
const terminalSessions = new Map<string, TerminalSession>();

// Docker client instance
const docker = new Docker({ socketPath: config.docker.socketPath });

export function initWebSocket(server: Server): void {
  // Create separate WebSocket servers for terminal and files
  const terminalWss = new WebSocketServer({ noServer: true });
  const filesWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const projectId = url.searchParams.get('projectId');
    const path = url.pathname;

    if (!token) {
      logger.warn('WebSocket upgrade rejected: no token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!projectId) {
      logger.warn('WebSocket upgrade rejected: no projectId');
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify JWT
    let user: JwtPayload;
    try {
      user = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      logger.warn('WebSocket upgrade rejected: invalid token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify project access
    const db = getDb();
    const project = db
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(projectId, user.userId) as DbProject | undefined;

    if (!project) {
      logger.warn({ projectId, userId: user.userId }, 'WebSocket upgrade rejected: project not found');
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    if (path === '/ws/terminal') {
      terminalWss.handleUpgrade(request, socket, head, (ws) => {
        terminalWss.emit('connection', ws, request, { user, project });
      });
    } else if (path === '/ws/files') {
      filesWss.handleUpgrade(request, socket, head, (ws) => {
        filesWss.emit('connection', ws, request, { user, project });
      });
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  });

  // Handle terminal connections - lit-shell protocol compatible with Docker exec
  terminalWss.on('connection', (ws: WebSocket, _request: unknown, context: { user: JwtPayload; project: DbProject }) => {
    const { user, project } = context;
    logger.info({ userId: user.userId, projectId: project.id }, 'Terminal WebSocket connected');

    // Set up ping/pong heartbeat
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    // Track sessions for this WebSocket
    const clientSessions = new Set<string>();

    ws.on('close', () => {
      clearInterval(pingInterval);
      // Clean up all sessions for this client
      for (const sessionId of clientSessions) {
        closeSession(sessionId);
      }
      logger.info({ projectId: project.id }, 'Terminal WebSocket disconnected');
    });

    ws.on('error', (error) => {
      logger.error({ error, projectId: project.id }, 'Terminal WebSocket error');
    });

    // Handle messages using lit-shell protocol with Zod validation
    ws.on('message', async (data) => {
      try {
        const rawMessage = JSON.parse(data.toString());

        // Validate message structure
        const parseResult = terminalMessageSchema.safeParse(rawMessage);
        if (!parseResult.success) {
          const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
          logger.warn({ errors: parseResult.error.errors }, 'Invalid WebSocket message');
          sendError(ws, `Invalid message: ${errorMessage}`);
          return;
        }

        const message = parseResult.data;

        switch (message.type) {
          case 'spawn':
            await handleSpawn(ws, project, message.options || {}, clientSessions);
            break;

          case 'data':
            handleData(message.sessionId, message.data);
            break;

          case 'resize':
            await handleResize(message.sessionId, message.cols, message.rows);
            break;

          case 'close':
            closeSession(message.sessionId);
            clientSessions.delete(message.sessionId);
            break;
        }
      } catch (error) {
        logger.error({ error }, 'Failed to process terminal message');
        sendError(ws, 'Failed to process message');
      }
    });
  });

  // Handle file browser connections using x-files.js
  filesWss.on('connection', (ws: WebSocket, request: unknown, context: { user: JwtPayload; project: DbProject }) => {
    const { user, project } = context;
    logger.info({ userId: user.userId, projectId: project.id }, 'Files WebSocket connected');

    // Set up ping/pong heartbeat
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
      logger.info({ projectId: project.id }, 'Files WebSocket disconnected');
    });

    // Create x-files handler for this connection
    // The handler is configured with the project's volume path as the only allowed path
    const xFilesHandler = new XFilesHandler({
      allowedPaths: [project.volume_path],
      allowWrite: true,
      allowDelete: true,
      // Authentication already done via JWT in upgrade handler
      authenticate: () => true,
    });

    // Let x-files handle the connection
    // Pass request for any additional context x-files may need
    xFilesHandler.handleConnection(ws as unknown as WebSocket, request as import('http').IncomingMessage);
  });
}

/**
 * Spawn a new terminal session using Docker exec
 * Compatible with lit-shell protocol
 */
async function handleSpawn(
  ws: WebSocket,
  project: DbProject,
  options: { cols?: number; rows?: number; env?: Record<string, string> },
  clientSessions: Set<string>
): Promise<void> {
  const cols = options.cols || 80;
  const rows = options.rows || 24;
  const env = options.env || {};

  // Check if container is running
  if (!project.container_id) {
    sendError(ws, 'Container not running. Please start the container first.');
    return;
  }

  // Limit sessions per client
  if (clientSessions.size >= 5) {
    sendError(ws, 'Maximum sessions (5) reached');
    return;
  }

  try {
    const container = docker.getContainer(project.container_id);

    // Verify container is running
    const info = await container.inspect();
    if (!info.State.Running) {
      sendError(ws, 'Container is not running. Please start the container first.');
      return;
    }

    // Create exec instance with TTY
    const exec = await container.exec({
      Cmd: ['/bin/bash'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Env: Object.entries({ ...env, TERM: 'xterm-256color' }).map(([k, v]) => `${k}=${v}`),
    });

    // Start the exec session
    const stream = await exec.start({
      hijack: true,
      stdin: true,
    });

    // Set initial size
    await exec.resize({ w: cols, h: rows });

    const sessionId = `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Store session
    const session: TerminalSession = {
      id: sessionId,
      projectId: project.id,
      containerId: project.container_id,
      ws,
      exec,
      stream,
      cols,
      rows,
      createdAt: now,
      lastActivity: now,
    };

    terminalSessions.set(sessionId, session);
    clientSessions.add(sessionId);

    // Handle stream output -> WebSocket (lit-shell protocol)
    stream.on('data', (data: Buffer) => {
      session.lastActivity = new Date();
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'data',
          sessionId,
          data: data.toString('utf8'),
        }));
      }
    });

    // Handle stream end
    stream.on('end', () => {
      logger.info({ sessionId, projectId: project.id }, 'Terminal stream ended');
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          sessionId,
          exitCode: 0,
        }));
      }
      terminalSessions.delete(sessionId);
      clientSessions.delete(sessionId);
    });

    // Handle stream error
    stream.on('error', (err: Error) => {
      logger.error({ err, sessionId, projectId: project.id }, 'Terminal stream error');
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          sessionId,
          exitCode: 1,
        }));
      }
      terminalSessions.delete(sessionId);
      clientSessions.delete(sessionId);
    });

    // Notify client - lit-shell protocol
    ws.send(JSON.stringify({
      type: 'spawned',
      sessionId,
      shell: '/bin/bash',
      cwd: '/workspace',
      cols,
      rows,
    }));

    logger.info({ sessionId, projectId: project.id }, 'Terminal session spawned');

  } catch (error) {
    logger.error({ error, projectId: project.id }, 'Failed to spawn terminal session');
    sendError(ws, error instanceof Error ? error.message : 'Failed to spawn terminal');
  }
}

/**
 * Write data to terminal session
 */
function handleData(sessionId: string, data: string): void {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    logger.warn({ sessionId }, 'Session not found for data');
    return;
  }

  session.lastActivity = new Date();
  session.stream.write(data);
}

/**
 * Resize terminal session
 */
async function handleResize(sessionId: string, cols: number, rows: number): Promise<void> {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    logger.warn({ sessionId }, 'Session not found for resize');
    return;
  }

  try {
    session.cols = cols;
    session.rows = rows;
    await session.exec.resize({ w: cols, h: rows });
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to resize terminal');
  }
}

/**
 * Close terminal session
 */
function closeSession(sessionId: string): void {
  const session = terminalSessions.get(sessionId);
  if (!session) return;

  try {
    session.stream.end();
  } catch {
    // Ignore errors on close
  }

  terminalSessions.delete(sessionId);
  logger.info({ sessionId }, 'Terminal session closed');
}

/**
 * Send error to WebSocket client - lit-shell protocol
 */
function sendError(ws: WebSocket, message: string): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      message,
    }));
  }
}
