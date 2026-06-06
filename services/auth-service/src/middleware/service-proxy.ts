import type { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { proxyPathRewrite } from '../lib/proxy-path.js';
import { serviceUrls } from '../lib/service-urls.js';
import { logger } from '../utils/logger.js';
import { authenticate } from './auth.js';

function createProxy(
  target: string,
  serviceName: string,
  mountPath: string
): RequestHandler {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => proxyPathRewrite(mountPath, path),
    on: {
      error: (err, _req, res) => {
        logger.error({ err, target, serviceName }, 'API gateway proxy error');
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({ error: `${serviceName} is unavailable` })
          );
        }
      },
      proxyReq: (_proxyReq, req) => {
        logger.debug(
          { method: req.method, path: req.url, serviceName },
          'Proxying request'
        );
      },
    },
  });
}

export function gatewayProxy(mountPath: string): RequestHandler[] {
  return [
    authenticate,
    createProxy(serviceUrls.aiGateway, 'ai-gateway-service', mountPath),
  ];
}

export function knowledgeProxy(mountPath: string): RequestHandler[] {
  return [
    authenticate,
    createProxy(serviceUrls.knowledge, 'knowledge-service', mountPath),
  ];
}
