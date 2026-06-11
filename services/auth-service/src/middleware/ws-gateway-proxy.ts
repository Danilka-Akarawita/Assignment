import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { serviceUrls } from '../lib/service-urls.js';
import { logger } from '../utils/logger.js';

const WS_PATH = '/conversations/ws';

function verifyWsToken(req: IncomingMessage): boolean {
  if (!req.url) return false;
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  if (!token) return false;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return false;

  try {
    jwt.verify(token, jwtSecret);
    return true;
  } catch {
    return false;
  }
}

const agentRunWsProxy = createProxyMiddleware({
  target: serviceUrls.aiGateway,
  changeOrigin: true,
  ws: true,
  pathRewrite: () => WS_PATH,
});

export function attachAgentRunWebSocketProxy(server: Server): void {
  server.on('upgrade', (req, socket, head) => {
    const pathname = req.url?.split('?')[0];
    if (pathname !== WS_PATH) return;

    if (!verifyWsToken(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    agentRunWsProxy.upgrade(req, socket as Socket, head);
  });

  logger.info({ path: WS_PATH }, 'Agent run WebSocket proxy ready');
}

export function agentRunWsHttpFallback(): RequestHandler {
  return (req, res) => {
    if (!verifyWsToken(req)) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    res.status(426).json({
      error: 'Upgrade Required',
      message: 'Connect via WebSocket to this endpoint',
    });
  };
}
