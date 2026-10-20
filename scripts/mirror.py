"""Descarga una copia estatica de la tienda (HTML + CSS + JS + imagenes).

Uso:  python scripts/mirror.py
Vuelve a ejecutarlo cuando quieras refrescar la copia con lo que hay en la web.
"""
import hashlib
import os
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://thedragonchambergames.com/prestashop/"
HOST = "thedragonchambergames.com"
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site")

# Paginas a copiar: (url relativa a BASE, fichero de salida)
PAGES = [
    ("", "index.html"),
    ("12-cartas", "categoria-cartas.html"),
    ("176-juegos-de-cartas", "categoria-tcg.html"),
    ("10-party-games", "categoria-party-games.html"),
    ("12379-the-goblin-king.html", "producto-ejemplo.html"),
    ("contacto", "contacto.html"),
    ("content/4-sobre-nosotros", "sobre-nosotros.html"),
    ("content/1-envios", "envios.html"),
]

UA = {"User-Agent": "Mozilla/5.0 (DragonChamber mirror)"}
_cache = {}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read(), r.headers.get_content_type()


def local_path(url):
    """Ruta local (relativa a ROOT) para un asset del propio dominio."""
    p = urllib.parse.urlparse(url)
    path = urllib.parse.unquote(p.path)
    if path.startswith("/prestashop/"):
        path = path[len("/prestashop/"):]
    path = path.lstrip("/") or "index"
    # Fotos de producto (/1234-home_default/nombre.jpg) -> img/productos/
    if re.match(r"\d+-\w+_default/", path):
        path = "img/productos/" + path
    if p.query:
        stem, ext = os.path.splitext(path)
        path = f"{stem}_{hashlib.md5(p.query.encode()).hexdigest()[:8]}{ext}"
    return path


def is_ours(url):
    return urllib.parse.urlparse(url).netloc in ("", HOST)


def download_asset(url):
    """Descarga un asset y devuelve su ruta local relativa (o None)."""
    if url in _cache:
        return _cache[url]
    rel = local_path(url)
    _cache[url] = rel
    dest = os.path.join(ROOT, rel)
    if os.path.exists(dest):
        return rel
    try:
        data, ctype = fetch(url)
    except Exception as e:
        print(f"  ! {url}: {e}", file=sys.stderr)
        _cache[url] = None
        return None
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if rel.endswith(".css"):
        data = rewrite_css(data.decode("utf-8", "replace"), url, rel).encode("utf-8")
    with open(dest, "wb") as f:
        f.write(data)
    return rel


def rewrite_css(css, css_url, css_rel):
    def repl(m):
        ref = m.group(2).strip()
        if ref.startswith(("data:", "#")):
            return m.group(0)
        abs_url = urllib.parse.urljoin(css_url, ref)
        if not is_ours(abs_url):
            return m.group(0)
        rel = download_asset(abs_url.split("#")[0])
        if not rel:
            return m.group(0)
        return f"url({m.group(1)}{os.path.relpath(rel, os.path.dirname(css_rel)).replace(os.sep, '/')}{m.group(1)})"

    return re.sub(r"url\((['\"]?)([^'\")]+)\1\)", repl, css)


ATTR_RE = re.compile(r'\b(src|href|data-src|data-full-size-image-url|data-image-large-src|srcset|data-srcset)="([^"]+)"')
ASSET_EXT = re.compile(r"\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|otf|mp4|webm)(\?|$)", re.I)


BANNER = (
    '<div id="dc-copia" style="position:sticky;top:0;z-index:100000;background:#c9a227;color:#1b1730;'
    'font:600 13px/1.4 sans-serif;text-align:center;padding:6px 12px">'
    'Copia de pruebas, no es la tienda. Para comprar ve a '
    '<a href="https://thedragonchambergames.com/prestashop/" style="color:inherit">thedragonchambergames.com</a></div>'
)


def mark_copy(html):
    """Marca la pagina como copia: noindex + aviso visible (idempotente)."""
    if 'id="dc-copia"' in html:
        return html
    html = re.sub(r"<head[^>]*>", lambda m: m.group(0) + '<meta name="robots" content="noindex,nofollow">', html, 1)
    html = re.sub(r"<body[^>]*>", lambda m: m.group(0) + BANNER, html, 1)
    return html


# Mejoras propias (site/dc/): se enlazan en todas las paginas copiadas
MEJORAS_HEAD = '<script src="dc/dragonchamber.js"></script>'
MEJORAS_CSS = '<link rel="stylesheet" href="dc/dragonchamber.css">'
MEJORAS_BODY = '<script src="dc/asistente.js" defer></script>'


def inject_mejoras(html):
    if "dc/dragonchamber.js" in html:
        return html
    html = re.sub(r"<head[^>]*>", lambda m: m.group(0) + MEJORAS_HEAD, html, 1)
    html = html.replace("</head>", MEJORAS_CSS + MEJORAS_BODY + "</head>", 1)
    return html


def mirror_page(path, out_name, page_map):
    url = urllib.parse.urljoin(BASE, path)
    print(f"-> {url}")
    html = fetch(url)[0].decode("utf-8", "replace")

    # Recoger assets primero y descargarlos en paralelo
    urls = set()
    for attr, val in ATTR_RE.findall(html):
        for part in (val.split(",") if "srcset" in attr else [val]):
            u = urllib.parse.urljoin(url, part.strip().split(" ")[0].replace("&amp;", "&"))
            if is_ours(u) and ASSET_EXT.search(urllib.parse.urlparse(u).path):
                urls.add(u)
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(download_asset, urls))

    def repl(m):
        attr, val = m.group(1), m.group(2)
        parts = val.split(",") if "srcset" in attr else [val]
        out = []
        for part in parts:
            bits = part.strip().split(" ")
            u = urllib.parse.urljoin(url, bits[0].replace("&amp;", "&"))
            if u in _cache and _cache[u]:
                bits[0] = _cache[u]
            elif u.rstrip("/") + "/" == BASE or u == BASE:
                bits[0] = "index.html"
            elif u.split("#")[0] in page_map:
                bits[0] = page_map[u.split("#")[0]]
            out.append(" ".join(bits))
        return f'{attr}="{", ".join(out) if "srcset" in attr else out[0]}"'

    html = inject_mejoras(mark_copy(ATTR_RE.sub(repl, html)))
    with open(os.path.join(ROOT, out_name), "w", encoding="utf-8") as f:
        f.write(html)


def main():
    if "--solo-marcar" in sys.argv:
        for _, out in PAGES:
            f = os.path.join(ROOT, out)
            if os.path.exists(f):
                html = open(f, encoding="utf-8").read()
                open(f, "w", encoding="utf-8").write(inject_mejoras(mark_copy(html)))
        return
    os.makedirs(ROOT, exist_ok=True)
    page_map = {urllib.parse.urljoin(BASE, p): out for p, out in PAGES}
    for path, out in PAGES:
        try:
            mirror_page(path, out, page_map)
        except Exception as e:
            print(f"  ! pagina {path}: {e}", file=sys.stderr)
    print(f"Listo: {len([v for v in _cache.values() if v])} assets en {ROOT}")


if __name__ == "__main__":
    main()
