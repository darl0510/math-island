import http.server
import socketserver
import os
import sys

PORT = 8085

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow cross-origin for audio and local assets
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.js'):
            return 'application/javascript; charset=utf-8'
        if path.endswith('.json'):
            return 'application/json; charset=utf-8'
        if path.endswith('.css'):
            return 'text/css; charset=utf-8'
        if path.endswith('.mp3'):
            return 'audio/mpeg'
        return super().guess_type(path)

os.chdir(os.path.dirname(os.path.abspath(__file__)))

for port in range(PORT, PORT + 20):
    try:
        with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
            print(f"[OK] 奇幻數學島本地伺服器啟動於: http://127.0.0.1:{port}")
            sys.stdout.flush()
            httpd.serve_forever()
            break
    except OSError:
        continue
