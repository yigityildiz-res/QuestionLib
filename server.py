#!/usr/bin/env python3
"""
YKS Soru Çözüm Havuzu - Lokal Sunucu
Hem statik dosyaları servis eder hem de /api/scan endpoint'i sağlar.
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
    Verilen klasör yolunu tarar ve hiyerarşik JSON yapısı oluşturur.
    Beklenen yapı: kasa/Ders/Unite/ID.mp4 (+ ID.png opsiyonel)
    """
    vault_path = Path(vault_path_str)

    if not vault_path.exists():
        raise FileNotFoundError(f"Klasör bulunamadı: {vault_path_str}")
    if not vault_path.is_dir():
        raise NotADirectoryError(f"Bu bir klasör değil: {vault_path_str}")

    dersler = []

    # --- Ders Seviyesi (1. seviye alt klasörler) ---
    for ders_dir in sorted(vault_path.iterdir()):
        if not ders_dir.is_dir():
            continue

        ders_id = _slugify(ders_dir.name)
        unite_listesi = []

        # --- Ünite Seviyesi (2. seviye alt klasörler) ---
        for unite_dir in sorted(ders_dir.iterdir()):
            if not unite_dir.is_dir():
                continue

            unite_id = f"{ders_id}-{_slugify(unite_dir.name)}"
            soru_listesi = []

            # --- Soru/Dosya Seviyesi (3. seviye, video dosyaları) ---
            video_files = sorted(
                f for f in unite_dir.iterdir()
                if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS
            )

            for idx, video_file in enumerate(video_files, start=1):
                file_stem = video_file.stem  # örn: MAT_001
                soru_id   = f"{unite_id}-{_slugify(file_stem)}"

                # Video dosyasının mutlak yolunu localhost URL'e çevir
                video_abs = video_file.resolve()
                video_url = _path_to_api_url(video_abs)

                # Aynı ada sahip resim dosyası var mı?
                resim_url = None
                for img_ext in IMAGE_EXTENSIONS:
                    img_file = unite_dir / (file_stem + img_ext)
                    if img_file.exists():
                        resim_url = _path_to_api_url(img_file.resolve())
                        break

                soru = {
                    "id":     soru_id,
                    "baslik": f"Soru {idx}  [{file_stem}]",
                    "video":  video_url,
                }
                if resim_url:
                    soru["resim"] = str(resim_url)

                soru_listesi.append(soru)

            if soru_listesi:  # Boş üniteleri dahil etme
                unite_listesi.append({
                    "id":          unite_id,
                    "baslik":      unite_dir.name,
                    "testListesi": [
                        {
                            "id":         f"{unite_id}-t1",
                            "baslik":     unite_dir.name,
                            "soruListesi": soru_listesi,
                        }
                    ],
                })

        dersler.append({
            "id":           ders_id,
            "baslik":       ders_dir.name,
            "uniteListesi": unite_listesi,
        })

    return dersler


def _slugify(text: str) -> str:
    """Klasör veya dosya adını güvenli bir ID'ye dönüştürür."""
    replacements = {
        ' ': '-', 'ı': 'i', 'ğ': 'g', 'ü': 'u',
        'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'I',
        'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C',
    }
    result = text.lower()
    for char, repl in replacements.items():
        result = result.replace(char, repl)
    # Alfanümerik + tire + alt çizgi dışındakileri kaldır
    result = ''.join(c if c.isalnum() or c in '-_' else '-' for c in result)
    return result.strip('-')


def _path_to_api_url(abs_path: Path) -> str:
    """
    Mutlak bir dosya yolunu tarayıcıdan erişilebilir bir URL'e çevirir.
    Proje dizininin içindeyse göreceli URL, dışındaysa /api/file?p=... URL kullanır.
    """
    try:
        rel = abs_path.relative_to(BASE_DIR)
        # Forward slash ile döndür (Windows'ta \\ sorun çıkarabilir)
        return rel.as_posix()
    except ValueError:
        # Proje dışındaki dosya — API üzerinden servis et
        encoded = urllib.parse.quote(str(abs_path), safe='')
        return f"/api/file?p={encoded}"


class YKSHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # Temiz log çıktısı
        print(f"[{self.address_string()}] {format % args}")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path
        query  = urllib.parse.parse_qs(parsed.query)

        # --- API: Klasör Seçici Diyalogu ---
        if path == '/api/browse':
            if not _TKINTER_AVAILABLE:
                self._send_json_error(500, "tkinter bu Python kurulumunda mevcut değil.")
                return
            try:
                root = tk.Tk()
                root.withdraw()          # Ana pencereyi gizle
                root.attributes('-topmost', True)  # Diyalogu öne getir
                selected = filedialog.askdirectory(
                    title="Kasa Klasörünü Seçin",
                    parent=root,
                )
                root.destroy()
                self._send_json(200, {"path": selected if selected else None})
            except Exception as e:
                self._send_json_error(500, f"Diyalog açılamadı: {e}")
            return

        # --- API: Klasör Tarama ---
        if path == '/api/scan':
            path_vals = query.get('path', [])
            vault_path_str: str | None = path_vals[0] if path_vals else None
            if not vault_path_str:
                self._send_json_error(400, "path parametresi gerekli.")
                return
            try:
                data = scan_vault(vault_path_str)
                self._send_json(200, data)
            except FileNotFoundError as e:
                self._send_json_error(404, str(e))
            except NotADirectoryError as e:
                self._send_json_error(400, str(e))
            except Exception as e:
                self._send_json_error(500, f"Sunucu hatası: {e}")
            return

        # --- API: Harici Dosya Servisi ---
        if path == '/api/file':
            p_vals = query.get('p', [])
            file_path_str: str | None = p_vals[0] if p_vals else None
            if not file_path_str:
                self._send_json_error(400, "p parametresi gerekli.")
                return
            self._serve_file(Path(file_path_str))
            return

        # --- Statik Dosyalar ---
        # Köke / gelirse index.html'e yönlendir
        if path == '/':
            path = '/index.html'

        # Güvenlik: path traversal engelle
        file_path = (BASE_DIR / path.lstrip('/')).resolve()
        if not str(file_path).startswith(str(BASE_DIR)):
            self._send_json_error(403, "Erişim reddedildi.")
            return

        self._serve_file(file_path)

    def _serve_file(self, file_path: Path):
        if not file_path.exists() or not file_path.is_file():
            self._send_json_error(404, f"Dosya bulunamadı: {file_path.name}")
            return

        suffix      = file_path.suffix.lower()
        content_type = MIME_TYPES.get(suffix, 'application/octet-stream')
        file_size   = file_path.stat().st_size

        # Range request desteği (video oynatıcı için kritik)
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
        """HTTP Range isteklerini karşılar (video seek için gerekli)."""
        try:
            prefix = 'bytes='  # len == 6
            range_spec: str = range_header[6:]
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

            with open(file_path, 'rb') as f:
                f.seek(start)
                remaining: int = length
                chunk_size = 65536
                while remaining > 0:
                    chunk = f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    chunk_len: int = len(chunk)
                    remaining = int(remaining - chunk_len)
        except (ValueError, BrokenPipeError, ConnectionResetError):
            pass

    def _send_json(self, status: int, data):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def _send_json_error(self, status: int, message: str):
        self._send_json(status, {"error": message})


if __name__ == '__main__':
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, YKSHandler)
    print(f"YKS Sunucusu başlatıldı → http://localhost:{PORT}")
    print(f"Proje dizini: {BASE_DIR}")
    print("Durdurmak için CTRL+C")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSunucu durduruldu.")
        httpd.server_close()
