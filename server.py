#!/usr/bin/env python3
"""
Question Library - Local Server
Serves static files and provides the /api/scan, /api/browse, and /api/file endpoints.
"""

import http.server
import json
import os
import sys
import urllib.parse
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog
    _TKINTER_AVAILABLE = True
except ImportError:
    _TKINTER_AVAILABLE = False

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

VIDEO_EXTENSIONS = {'.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
    '.ogg':  'video/ogg',
    '.mov':  'video/quicktime',
    '.mkv':  'video/x-matroska',
    '.avi':  'video/x-msvideo',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.bat':  'application/octet-stream',
    '.md':   'text/markdown; charset=utf-8',
}

BASE_DIR = Path(__file__).parent.resolve()


def scan_vault(vault_path_str: str) -> list:
    """
    Scans the given folder path and builds a hierarchical JSON structure.
    Expected layout: vault/Course/Unit/ID.mp4  (+ optional ID.png)
    """
    vault_path = Path(vault_path_str)

    if not vault_path.exists():
        raise FileNotFoundError(f"Folder not found: {vault_path_str}")
    if not vault_path.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {vault_path_str}")

    courses = []

    # --- Course level (1st-level subdirectories) ---
    for course_dir in sorted(vault_path.iterdir()):
        if not course_dir.is_dir():
            continue

        course_id = _slugify(course_dir.name)
        units = []

        # --- Unit level (2nd-level subdirectories) ---
        for unit_dir in sorted(course_dir.iterdir()):
            if not unit_dir.is_dir():
                continue

            unit_id = f"{course_id}-{_slugify(unit_dir.name)}"
            questions = []

            # --- Question/file level (3rd-level, video files) ---
            video_files = sorted(
                f for f in unit_dir.iterdir()
                if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS
            )

            for index, video_file in enumerate(video_files, start=1):
                file_stem = video_file.stem  # e.g. MATH_001 or MATH_001_A
                question_id = f"{unit_id}-{_slugify(file_stem)}"

                # Extract the correct answer from the filename if present
                # Convention: <code>_<ANSWER>.mp4  e.g. FIZ_BA_001_A.mp4 → answer 'A'
                answer = _extract_answer(file_stem)

                # Build the display title without the answer suffix (strips '_A' etc.)
                display_stem = file_stem.rsplit('_', 1)[0] if answer else file_stem

                # Convert the absolute video path to a localhost URL
                video_url = _path_to_api_url(video_file.resolve())

                # Check for a companion image file with the same stem
                image_url = None
                for img_ext in IMAGE_EXTENSIONS:
                    img_file = unit_dir / (file_stem + img_ext)
                    if img_file.exists():
                        image_url = _path_to_api_url(img_file.resolve())
                        break

                question = {
                    "id":    question_id,
                    "title": f"Question {index}  [{display_stem}]",
                    "video": video_url,
                }
                if answer:
                    question["answer"] = str(answer)
                if image_url:
                    question["image"] = str(image_url)

                questions.append(question)

            if questions:  # Skip empty units
                units.append({
                    "id":    unit_id,
                    "title": unit_dir.name,
                    "tests": [
                        {
                            "id":        f"{unit_id}-t1",
                            "title":     unit_dir.name,
                            "questions": questions,
                        }
                    ],
                })

        courses.append({
            "id":    course_id,
            "title": course_dir.name,
            "units": units,
        })

    return courses


def _extract_answer(file_stem: str) -> str | None:
    """
    Parses the correct answer letter from a file stem.

    Convention: the stem must end with an underscore followed by a single
    letter A–E (case-insensitive).  Examples:
        'FIZ_BA_001_A'  →  'A'
        'MAT_LIM_005_c'  →  'C'
        'FIZ_BA_002'     →  None
    """
    valid_answers = {'A', 'B', 'C', 'D', 'E'}
    parts = file_stem.rsplit('_', 1)
    if len(parts) == 2 and parts[1].upper() in valid_answers:
        return parts[1].upper()
    return None


def _slugify(text: str) -> str:
    """Converts a folder or file name into a safe URL slug / ID."""
    replacements = {
        ' ': '-', 'ı': 'i', 'ğ': 'g', 'ü': 'u',
        'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'I',
        'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C',
    }
    result = text.lower()
    for char, replacement in replacements.items():
        result = result.replace(char, replacement)
    # Keep only alphanumeric characters, hyphens, and underscores
    result = ''.join(c if c.isalnum() or c in '-_' else '-' for c in result)
    return result.strip('-')


def _path_to_api_url(abs_path: Path) -> str:
    """
    Converts an absolute file path to a browser-accessible URL.
    - If the file is inside the project directory, returns a relative URL.
    - Otherwise, proxies it through the /api/file?p=... endpoint.
    """
    try:
        rel = abs_path.relative_to(BASE_DIR)
        # Use forward slashes (backslashes cause issues on Windows)
        return rel.as_posix()
    except ValueError:
        # File is outside the project directory — serve via the API
        encoded = urllib.parse.quote(str(abs_path), safe='')
        return f"/api/file?p={encoded}"


class RequestHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path
        query  = urllib.parse.parse_qs(parsed.query)

        # --- API: Native folder browser dialog ---
        if path == '/api/browse':
            self._handle_browse()
            return

        # --- API: Vault directory scanner ---
        if path == '/api/scan':
            self._handle_scan(query)
            return

        # --- API: External file proxy ---
        if path == '/api/file':
            self._handle_file_proxy(query)
            return

        # --- Static files ---
        # Redirect root to index.html
        if path == '/':
            path = '/index.html'

        # Security: prevent path traversal attacks
        file_path = (BASE_DIR / path.lstrip('/')).resolve()
        if not str(file_path).startswith(str(BASE_DIR)):
            self._send_json_error(403, "Access denied.")
            return

        self._serve_file(file_path)

    def _handle_browse(self):
        """Opens a native folder selection dialog via tkinter."""
        if not _TKINTER_AVAILABLE:
            self._send_json_error(500, "tkinter is not available in this Python installation.")
            return
        try:
            root = tk.Tk()
            root.withdraw()                      # Hide the main window
            root.attributes('-topmost', True)    # Bring dialog to front
            selected = filedialog.askdirectory(
                title="Select Vault Folder",
                parent=root,
            )
            root.destroy()
            self._send_json(200, {"path": selected if selected else None})
        except Exception as e:
            self._send_json_error(500, f"Could not open dialog: {e}")

    def _handle_scan(self, query: dict):
        """Scans a vault directory and returns its structure as JSON."""
        path_values = query.get('path', [])
        vault_path_str: str | None = path_values[0] if path_values else None

        if not vault_path_str:
            self._send_json_error(400, "Missing required query parameter: path")
            return
        try:
            data = scan_vault(vault_path_str)
            self._send_json(200, data)
        except FileNotFoundError as e:
            self._send_json_error(404, str(e))
        except NotADirectoryError as e:
            self._send_json_error(400, str(e))
        except Exception as e:
            self._send_json_error(500, f"Server error: {e}")

    def _handle_file_proxy(self, query: dict):
        """Serves a file from an arbitrary absolute path on the filesystem."""
        p_values = query.get('p', [])
        file_path_str: str | None = p_values[0] if p_values else None

        if not file_path_str:
            self._send_json_error(400, "Missing required query parameter: p")
            return
        self._serve_file(Path(file_path_str))

    def _serve_file(self, file_path: Path):
        """Reads a file from disk and sends it as an HTTP response."""
        if not file_path.exists() or not file_path.is_file():
            self._send_json_error(404, f"File not found: {file_path.name}")
            return

        suffix       = file_path.suffix.lower()
        content_type = MIME_TYPES.get(suffix, 'application/octet-stream')
        file_size    = file_path.stat().st_size

        # Support Range requests (required for video seeking)
        range_header = self.headers.get('Range')
        if range_header and range_header.startswith('bytes='):
            self._serve_range(file_path, file_size, content_type, range_header)
        else:
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(file_size))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            try:
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            except (BrokenPipeError, ConnectionResetError):
                pass

    def _serve_range(self, file_path: Path, file_size: int, content_type: str, range_header: str):
        """Handles HTTP Range requests for video seeking."""
        try:
            range_spec: str = range_header[6:]  # 6 == len('bytes=')
            parts = range_spec.split('-', 1)
            start_str: str = parts[0] if len(parts) > 0 else ''
            end_str:   str = parts[1] if len(parts) > 1 else ''

            start: int = int(start_str) if start_str else 0
            end:   int = int(end_str)   if end_str   else file_size - 1
            end = min(end, file_size - 1)
            length: int = end - start + 1

            self.send_response(206)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(length))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            chunk_size = 65536
            with open(file_path, 'rb') as f:
                f.seek(start)
                bytes_remaining = length
                while bytes_remaining > 0:
                    chunk = f.read(min(chunk_size, bytes_remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    bytes_remaining = bytes_remaining - len(chunk)
        except (ValueError, BrokenPipeError, ConnectionResetError):
            pass

    def _send_json(self, status: int, data):
        """Sends a JSON response with the given status code and data."""
        body = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def _send_json_error(self, status: int, message: str):
        """Sends a JSON error response."""
        self._send_json(status, {"error": message})


if __name__ == '__main__':
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, RequestHandler)
    print(f"Server started → http://localhost:{PORT}")
    print(f"Project directory: {BASE_DIR}")
    print("Press CTRL+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()
