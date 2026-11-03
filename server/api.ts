/**
 * Localhost API Server for PortPilot
 * 
 * Binds strictly to 127.0.0.1, provides endpoints for:
 * - GET /api/ports: live port scanner
 * - POST /api/kill: safe process termination with CSRF token verification
 * - Static file serving from ../dist for standalone UI
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanSystemPorts, terminateProcess } from './scanner';
import { SessionTokenGuard } from './security';
import { analyzePortConflicts } from '../src/core/portRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

export const sessionGuard = new SessionTokenGuard();

export function createPortPilotServer(): http.Server {
  return http.createServer(async (req, res) => {
    // Enable CORS for local dev server (port 5176)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PortPilot-Token');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // GET /api/ports
    if (req.method === 'GET' && url.pathname === '/api/ports') {
      try {
        const ports = await scanSystemPorts();
        const conflicts = analyzePortConflicts(ports);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          token: sessionGuard.getToken(),
          ports,
          conflicts,
          timestamp: Date.now(),
        }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: msg }));
      }
      return;
    }

    // POST /api/kill
    if (req.method === 'POST' && url.pathname === '/api/kill') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const tokenHeader = req.headers['x-portpilot-token'] as string;
          const token = tokenHeader || data.token;

          // Verify CSRF session token
          if (!sessionGuard.verify(token)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Forbidden: Invalid or missing CSRF session token.',
            }));
            return;
          }

          const pid = data.pid;
          const signal = data.signal || 'SIGTERM';
          const port = data.port;

          const result = await terminateProcess(pid, signal, port);
          res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: msg }));
        }
      });
      return;
    }

    // GET /api/health
    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
      return;
    }

    // Serve static files from ../dist if exists
    if (fs.existsSync(DIST_DIR)) {
      let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
      };

      try {
        const fileContent = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(fileContent);
        return;
      } catch {
        // Fallthrough to 404
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
}

/**
 * Start the server bound strictly to 127.0.0.1
 */
export function startServer(port: number = 4999): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = createPortPilotServer();
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}
