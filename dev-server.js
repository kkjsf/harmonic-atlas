// ══════════════════════════════════════════════════════════════
// Harmonic Atlas — Live-reload dev server
// Usage: node dev-server.js
// Then open: http://localhost:3000  (PC)
//       or:  http://YOUR_LOCAL_IP:3000  (phone on same WiFi)
// ══════════════════════════════════════════════════════════════

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = 3000;
const DIR  = __dirname;

// ── MIME types ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.css':  'text/css',
};

// ── SSE clients waiting for reload events ──
let sseClients = [];

// ── Watch all files in this folder and sub-folders ──
function watchDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { watchDir(full); return; }
    fs.watch(full, () => {
      console.log(`  ↺  Changed: ${path.relative(DIR, full)}`);
      sseClients.forEach(res => res.write('data: reload\n\n'));
      sseClients = sseClients.filter(r => !r.writableEnded);
    });
  });
}
watchDir(DIR);

// ── HTTP server ──
const server = http.createServer((req, res) => {
  // SSE endpoint for live-reload
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    sseClients.push(res);
    req.on('close', () => { sseClients = sseClients.filter(r => r !== res); });
    return;
  }

  // Serve files
  let filePath = path.join(DIR, req.url === '/' ? 'index.html' : req.url);
  // Strip query strings
  filePath = filePath.split('?')[0];

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found: ' + req.url); return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });

    // Inject live-reload snippet into HTML responses
    if (ext === '.html') {
      const snippet = `
<script>
// Live-reload (dev server only — not present in production)
(function() {
  const es = new EventSource('/__reload');
  es.onmessage = () => { console.log('↺ Reloading…'); location.reload(); };
  es.onerror   = () => setTimeout(() => location.reload(), 1500);
})();
</script>`;
      const html = data.toString().replace('</body>', snippet + '\n</body>');
      res.end(html);
    } else {
      res.end(data);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // Find local IP for phone access
  const nets = os.networkInterfaces();
  let localIp = 'YOUR_LOCAL_IP';
  Object.values(nets).flat().forEach(n => {
    if (n.family === 'IPv4' && !n.internal) localIp = n.address;
  });

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   🎵  Harmonic Atlas — Dev Server         ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  PC:    http://localhost:${PORT}              ║`);
  console.log(`║  Phone: http://${localIp}:${PORT}      ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Watching files… save to auto-reload      ║');
  console.log('║  Ctrl+C to stop                           ║');
  console.log('╚══════════════════════════════════════════╝\n');
});
