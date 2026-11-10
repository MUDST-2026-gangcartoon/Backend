import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

// Serve the built SPA and proxy only to the isolated loopback backend.
const root = resolve(process.argv[2] || '../frontend/dist');
const port = Number(process.env.E2E_FRONTEND_PORT || 15173);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 18080);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
    const proxy = http.request({ hostname: '127.0.0.1', port: backendPort, path: req.url, method: req.method, headers: req.headers }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Backend unavailable'); });
    return req.pipe(proxy);
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    try { if (!(await stat(file)).isFile()) throw new Error('Not a file'); }
    catch { file = resolve(root, 'index.html'); }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
}).listen(port, '127.0.0.1', () => console.log(`E2E frontend listening on 127.0.0.1:${port}`));
