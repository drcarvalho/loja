#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.parse
import sys
import os

PORT = 8080

class StoreRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Servir proxy de imagem sem bloqueio de hotlink
        if self.path.startswith('/proxy-img'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            img_url = params.get('url', [None])[0]

            if not img_url:
                self.send_error(400, "Missing 'url' query parameter")
                return

            try:
                req = urllib.request.Request(
                    img_url,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://wanfing.x.yupoo.com/'
                    }
                )
                with urllib.request.urlopen(req, timeout=12) as response:
                    content = response.read()
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Length', str(len(content)))
                    self.send_header('Cache-Control', 'public, max-age=86400')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(content)
                    return
            except Exception as e:
                self.send_error(502, f"Failed to fetch image: {e}")
                return

        return super().do_GET()

def run():
    # Garante que roda no diretório do script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), StoreRequestHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == '__main__':
    run()
