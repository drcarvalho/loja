#!/usr/bin/env python3
from collections import OrderedDict
import html as html_lib
import http.server
import json
import os
import re
import socketserver
import sys
import threading
import time
import urllib.parse
import urllib.request

PORT = 8080
YUPOO_BASE_URL = "https://wanfing.x.yupoo.com"
YUPOO_CATEGORY_URL = f"{YUPOO_BASE_URL}/categories/3852491"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

PRODUCT_TYPE_PRICES = {
    "fan": 8.00,
    "player": 10.00,
    "fan_long_sleeve": 11.00,
    "long_sleeve": 13.00,
    "retro_long_sleeve": 17.00,
    "retro": 12.00,
    "shorts": 8.00,
    "training_kit": 22.00,
    "tracksuit_full_zip": 40.00,
    "tracksuit_zip": 39.00,
    "kids": 10.00,
    "kids_retro": 14.00,
    "nba": 18.00,
}

# Cache + controle de concorrência local para evitar rajadas de DNS/TLS no dev server
IMAGE_CACHE_MAX = 96
_image_cache: "OrderedDict[str, tuple[str, bytes]]" = OrderedDict()
_image_cache_lock = threading.Lock()
_url_locks: "dict[str, threading.Lock]" = {}
_url_locks_guard = threading.Lock()
_upstream_semaphore = threading.BoundedSemaphore(6)

_yupoo_cache: "dict[int, tuple[float, list]]" = {}
_yupoo_cache_lock = threading.Lock()
YUPOO_CACHE_TTL_SECONDS = 60.0


def _get_url_lock(url: str) -> threading.Lock:
    with _url_locks_guard:
        lock = _url_locks.get(url)
        if lock is None:
            lock = threading.Lock()
            _url_locks[url] = lock
        return lock


def _fetch_upstream_bytes(url: str, headers: dict, retries: int = 2) -> tuple[str, bytes]:
    last_err = None
    for attempt in range(retries):
        try:
            with _upstream_semaphore:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as response:
                    content_type = response.headers.get("Content-Type", "application/octet-stream")
                    content = response.read()
                    return content_type, content
        except Exception as err:
            last_err = err
            if attempt + 1 < retries:
                time.sleep(0.2 * (attempt + 1))
    raise last_err  # type: ignore[misc]


def infer_item_type(title: str) -> str:
    lower = title.lower()
    is_retro = "retro" in lower
    is_long = "long sleeve" in lower or "manga longa" in lower
    is_kids = "kids" in lower or "kid" in lower or "children" in lower

    if "nba" in lower:
        return "nba"
    if "full zip" in lower and ("tracksuit" in lower or "suit" in lower):
        return "tracksuit_full_zip"
    if "tracksuit" in lower or ("zip" in lower and "jacket" in lower):
        return "tracksuit_zip"
    if "training" in lower:
        return "training_kit"
    if "shorts" in lower and "kit" not in lower:
        return "shorts"
    if is_kids and is_retro:
        return "kids_retro"
    if is_kids:
        return "kids"
    if is_retro and is_long:
        return "retro_long_sleeve"
    if "fan" in lower and is_long:
        return "fan_long_sleeve"
    if is_long:
        return "long_sleeve"
    if is_retro:
        return "retro"
    if "player" in lower:
        return "player"
    return "fan"


def parse_yupoo_html(raw_html: str) -> list:
    items = []
    seen_ids = set()
    block_pattern = re.compile(
        r'<a[^>]*class="album__main"[^>]*>.*?</a>\s*<div[^>]*class="[^"]*album__title[^"]*"[^>]*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE,
    )
    for match in block_pattern.finditer(raw_html):
        chunk = match.group(0)
        raw_title = html_lib.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip()
        if not raw_title or raw_title in (".", ".."):
            continue

        href_m = re.search(r'href="([^"]+)"', chunk)
        img_m = re.search(r'<img[^>]+(?:data-origin-src|data-src|src)="([^"]+)"', chunk, re.IGNORECASE)
        if not href_m or not img_m:
            continue

        href = html_lib.unescape(href_m.group(1))
        yupoo_url = href if href.startswith("http") else f"{YUPOO_BASE_URL}{href}"
        image_url = html_lib.unescape(img_m.group(1))
        if image_url.startswith("//"):
            image_url = f"https:{image_url}"

        album_m = re.search(r"/albums/(\d+)", href)
        safe_fallback = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_title)[:40] or "item"
        album_id = album_m.group(1) if album_m else safe_fallback
        item_id = f"yp_{album_id}"
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)

        item_type = infer_item_type(raw_title)
        price_usd = PRODUCT_TYPE_PRICES.get(item_type, 8.00)

        size_m = re.search(
            r"\b((?:Kids?\s*)?(?:S|XS|M|L|XL|XXL|XXXL|XXXXL|\d{2})[-–](?:S|M|L|XL|XXL|XXXL|XXXXL|X{2,5}L|\d{2}))\b",
            raw_title,
            re.IGNORECASE,
        )
        size_range = size_m.group(1) if size_m else "S-XXL"
        model = raw_title.replace(size_m.group(0), "").strip() if size_m else raw_title
        model = re.sub(r"\s{2,}", " ", model) or raw_title

        items.append(
            {
                "id": item_id,
                "title": raw_title,
                "model": model,
                "size_range": size_range,
                "sizes": ["P (S)", "M (M)", "G (L)", "GG (XL)", "2XL (XG)", "3XL", "4XL"],
                "price": price_usd,
                "price_usd": price_usd,
                "image": image_url,
                "yupoo_url": yupoo_url,
                "category": "Futebol & Esportes",
                "item_type": item_type,
                "source": "yupoo-live",
            }
        )
    return items


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class StoreRequestHandler(http.server.SimpleHTTPRequestHandler):
    def _safe_write(self, data: bytes):
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def send_json(self, status_code: int, payload, send_body: bool = True):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if send_body:
                self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def send_image_response(self, content_type: str, content: bytes, send_body: bool = True):
        try:
            self.send_response(200)
            self.send_header("Content-Type", content_type or "image/jpeg")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if send_body:
                self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_OPTIONS(self):
        try:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _handle_request(self, is_head: bool = False):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/favicon.ico":
            try:
                self.send_response(204)
                self.end_headers()
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        # Proxy de imagens Yupoo (equivalente a /api/proxy-img.js na Vercel)
        if parsed.path in ("/proxy-img", "/api/proxy-img"):
            params = urllib.parse.parse_qs(parsed.query)
            img_url = params.get("url", [None])[0]

            if not img_url:
                self.send_json(400, {"error": "Missing 'url' query parameter"}, send_body=not is_head)
                return

            try:
                target = urllib.parse.urlparse(img_url)
            except Exception:
                self.send_json(400, {"error": "URL inválida"}, send_body=not is_head)
                return

            hostname = (target.hostname or "").lower()
            if target.scheme not in ("http", "https") or not (
                hostname == "yupoo.com" or hostname.endswith(".yupoo.com")
            ):
                self.send_json(400, {"error": "Domínio não permitido"}, send_body=not is_head)
                return

            with _image_cache_lock:
                cached = _image_cache.get(img_url)
                if cached is not None:
                    _image_cache.move_to_end(img_url)
            if cached is not None:
                self.send_image_response(cached[0], cached[1], send_body=not is_head)
                return

            url_lock = _get_url_lock(img_url)
            with url_lock:
                with _image_cache_lock:
                    cached = _image_cache.get(img_url)
                    if cached is not None:
                        _image_cache.move_to_end(img_url)
                if cached is not None:
                    self.send_image_response(cached[0], cached[1], send_body=not is_head)
                    return

                try:
                    content_type, content = _fetch_upstream_bytes(
                        img_url,
                        headers={
                            "User-Agent": USER_AGENT,
                            "Referer": f"{YUPOO_BASE_URL}/",
                        },
                        retries=2,
                    )
                    if not content_type or content_type == "application/octet-stream":
                        content_type = "image/jpeg"
                except Exception as err:
                    self.send_json(502, {"error": f"Failed to fetch image: {err}"}, send_body=not is_head)
                    return

                with _image_cache_lock:
                    _image_cache[img_url] = (content_type, content)
                    _image_cache.move_to_end(img_url)
                    while len(_image_cache) > IMAGE_CACHE_MAX:
                        _image_cache.popitem(last=False)

            self.send_image_response(content_type, content, send_body=not is_head)
            return

        # Sync automático do Yupoo (equivalente a /api/yupoo.js na Vercel)
        if parsed.path in ("/api/yupoo", "/yupoo-products"):
            params = urllib.parse.parse_qs(parsed.query)
            try:
                page_num = max(1, min(5, int(params.get("page", ["1"])[0])))
            except ValueError:
                page_num = 1

            now = time.monotonic()
            with _yupoo_cache_lock:
                entry = _yupoo_cache.get(page_num)
                if entry and (now - entry[0]) < YUPOO_CACHE_TTL_SECONDS:
                    self.send_json(200, entry[1], send_body=not is_head)
                    return

            target_url = f"{YUPOO_CATEGORY_URL}?page={page_num}" if page_num > 1 else YUPOO_CATEGORY_URL
            try:
                _, raw_bytes = _fetch_upstream_bytes(
                    target_url,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    },
                    retries=2,
                )
                raw_html = raw_bytes.decode("utf-8", errors="replace")
                items = parse_yupoo_html(raw_html)
                with _yupoo_cache_lock:
                    _yupoo_cache[page_num] = (time.monotonic(), items)
                self.send_json(200, items, send_body=not is_head)
                return
            except Exception as err:
                self.send_json(502, {"error": f"Failed to fetch Yupoo catalog: {err}"}, send_body=not is_head)
                return

        if is_head:
            super().do_HEAD()
        else:
            super().do_GET()

    def do_GET(self):
        self._handle_request(is_head=False)

    def do_HEAD(self):
        self._handle_request(is_head=True)

    def log_message(self, format, *args):
        sys.stderr.write(f"[server] {self.address_string()} - {format % args}\n")


def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with ThreadingHTTPServer(("", PORT), StoreRequestHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()


if __name__ == "__main__":
    run()
