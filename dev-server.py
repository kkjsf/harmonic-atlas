# ══════════════════════════════════════════════════════════════
# Harmonic Atlas — Live-reload dev server (Python version)
# Works with Python 3 which is already on most computers
# Usage: python dev-server.py   (or double-click start.bat)
# ══════════════════════════════════════════════════════════════

import http.server, threading, os, sys, socket, time, mimetypes
from pathlib import Path

PORT = 3000
DIR  = Path(__file__).parent.resolve()

# ── SSE clients for live-reload ──
sse_clients = []
sse_lock    = threading.Lock()

def notify_reload():
    with sse_lock:
        dead = []
        for wfile in sse_clients:
            try:   wfile.write(b"data: reload\n\n"); wfile.flush()
            except: dead.append(wfile)
        for d in dead: sse_clients.remove(d)

# ── File watcher thread ──
def watch_files():
    mtimes = {}
    while True:
        try:
            for f in DIR.rglob("*"):
                if f.is_file() and f.suffix in ('.html','.js','.json','.css','.png'):
                    mt = f.stat().st_mtime
                    if f in mtimes and mtimes[f] != mt:
                        rel = f.relative_to(DIR)
                        print(f"  ↺  Changed: {rel}")
                        notify_reload()
                    mtimes[f] = mt
        except: pass
        time.sleep(0.4)

# ── Live-reload snippet injected into HTML ──
RELOAD_SNIPPET = b"""
<script>
(function() {
  var es = new EventSource('/__reload');
  es.onmessage = function() { console.log('↺ Reloading…'); location.reload(); };
  es.onerror   = function() { setTimeout(function(){ location.reload(); }, 1500); };
})();
</script>"""

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.css':  'text/css',
    '.ico':  'image/x-icon',
}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Only log non-reload requests
        if '__reload' not in (args[0] if args else ''):
            print(f"  → {args[0] if args else ''}")

    def do_GET(self):
        # SSE live-reload endpoint
        if self.path == '/__reload':
            self.send_response(200)
            self.send_header('Content-Type',  'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection',    'keep-alive')
            self.end_headers()
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            with sse_lock:
                sse_clients.append(self.wfile)
            # Hold connection open
            try:
                while True: time.sleep(1)
            except: pass
            return

        # Resolve file path
        url_path = self.path.split('?')[0].lstrip('/')
        if not url_path: url_path = 'index.html'
        file_path = DIR / url_path

        if not file_path.exists():
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not found')
            return

        ext  = file_path.suffix.lower()
        mime = MIME.get(ext, 'application/octet-stream')
        data = file_path.read_bytes()

        # Inject live-reload into HTML
        if ext == '.html':
            data = data.replace(b'</body>', RELOAD_SNIPPET + b'\n</body>', 1)

        self.send_response(200)
        self.send_header('Content-Type',   mime)
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]; s.close(); return ip
    except: return 'YOUR_LOCAL_IP'

if __name__ == '__main__':
    # Start file watcher in background
    t = threading.Thread(target=watch_files, daemon=True)
    t.start()

    ip = get_local_ip()
    server = http.server.HTTPServer(('0.0.0.0', PORT), Handler)

    print()
    print('╔══════════════════════════════════════════╗')
    print('║   🎵  Harmonic Atlas — Dev Server         ║')
    print('╠══════════════════════════════════════════╣')
    print(f'║  PC:    http://localhost:{PORT}              ║')
    print(f'║  Phone: http://{ip}:{PORT}      ║')
    print('╠══════════════════════════════════════════╣')
    print('║  Watching files… save to auto-reload      ║')
    print('║  Ctrl+C to stop                           ║')
    print('╚══════════════════════════════════════════╝')
    print()

    # Open browser automatically
    def open_browser():
        time.sleep(0.8)
        import webbrowser
        webbrowser.open(f'http://localhost:{PORT}')
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
