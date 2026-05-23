#!/usr/bin/env python3
"""
Simple local dev server for ackmanx.github.io/docs.
Not needed for deployment — GitHub Pages serves the /docs directory directly.

Usage:
    python3 serve.py          # serves on http://localhost:3000
    python3 serve.py 8080     # serves on http://localhost:8080
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000

# Serve from the directory this script lives in
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"  {self.address_string()} — {format % args}")


with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
