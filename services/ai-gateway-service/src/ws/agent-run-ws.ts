import type { IncomingMessage, Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { prisma } from '../lib/prisma.js';
import { notifyAgentRunChanged } from '../services/agent-run-events.service.js';
import { logger } from '../utils/logger.js';
import { agentRunHub } from './agent-run-hub.js';

const WS_PATH = '/conversations/ws';
const TERMINAL = new Set(['COMPLETED', 'FAILED']);

interface SubscribeMessage {
  type: 'subscribe';
  agentRunId: number;
}

function parseToken(req: IncomingMessage): string | null {
  if (!req.url) return null;
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('token');
}

function verifyToken(token: string): { userId: number } | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as { sub: string };
    return { userId: Number(decoded.sub) };
  } catch {
    return null;
  }
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function isSubscribeMessage(value: unknown): value is SubscribeMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  return msg.type === 'subscribe' && typeof msg.agentRunId === 'number';
}

export function attachAgentRunWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = req.url?.split('?')[0];
    if (pathname !== WS_PATH) return;

    const token = parseToken(req);
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const auth = verifyToken(token);
    if (!auth) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, auth.userId);
    });
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, userId: number) => {
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      unsubscribe?.();
      unsubscribe = null;
    };

    ws.on('message', async (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw.toString());
        if (!isSubscribeMessage(parsed)) {
          sendJson(ws, { type: 'error', error: 'Expected subscribe message' });
          return;
        }

        cleanup();

        const run = await prisma.agentRun.findFirst({
          where: { id: parsed.agentRunId, userId },
        });

        if (!run) {
          sendJson(ws, { type: 'error', error: 'Agent run not found' });
          return;
        }

        unsubscribe = agentRunHub.subscribe(parsed.agentRunId, (event) => {
          sendJson(ws, event);
          if (
            TERMINAL.has((event.agentRun as { status?: string }).status ?? '') &&
            ws.readyState === WebSocket.OPEN
          ) {
            ws.close();
          }
        });

        await notifyAgentRunChanged(parsed.agentRunId, 'run.snapshot');
      } catch (err) {
        logger.warn({ err }, 'WebSocket message handling failed');
        sendJson(ws, { type: 'error', error: 'Invalid message' });
      }
    });

    ws.on('close', cleanup);
    ws.on('error', (err) => {
      logger.warn({ err }, 'WebSocket client error');
      cleanup();
    });
  });

  logger.info({ path: WS_PATH }, 'Agent run WebSocket endpoint ready');
}
