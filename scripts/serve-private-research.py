#!/usr/bin/env python3
"""Loopback preview. Private payload stays outside the static/public repository."""
import argparse,http.server,secrets,json
from pathlib import Path
from urllib.parse import urlsplit
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--payload',required=True);p.add_argument('--port',type=int,default=8814);a=p.parse_args()
root=Path(a.root).resolve();payload=Path(a.payload).resolve();token=secrets.token_urlsafe(32)
if payload.is_relative_to(root):raise ValueError('Private payload must be outside public root')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.headers.get('Host')not in [f'127.0.0.1:{a.port}',f'localhost:{a.port}']:self.send_error(403);return
  path=urlsplit(self.path).path
  if any(part.startswith('.')for part in path.split('/')if part):self.send_error(404);return
  if path=='/__private_payload.js':
   if f'uwant_local={token}'not in self.headers.get('Cookie',''):self.send_error(403);return
   body=payload.read_bytes();self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Cache-Control','no-store');self.send_header('Cross-Origin-Resource-Policy','same-origin');self.end_headers();self.wfile.write(body);return
  if path in ['/','/index.html']:
   body=(root/'index.html').read_text().replace('<script src="research-overlay.js','<script src="/__private_payload.js"></script><script src="research-overlay.js').encode()
   self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8');self.send_header('Set-Cookie',f'uwant_local={token}; HttpOnly; SameSite=Strict; Path=/');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body);return
  if (root/path.lstrip('/')).is_dir():self.send_error(404);return
  super().do_GET()
http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
