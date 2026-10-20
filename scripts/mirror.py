"""Copia estatica de la estructura de la tienda: portada, categorias, marcas y paginas informativas.

Uso:  python scripts/mirror.py
Vuelve a ejecutarlo cuando quieras refrescar la copia con lo que hay en la web.
OJO: sobrescribe los .html de site/ (haz commit de tus cambios antes).

- Rastrea todas las categorias y subcategorias enlazadas (solo la primera pagina de cada listado).
- Las fichas de producto NO se copian: sus enlaces llevan a no-copiada.html.
- Cualquier otro enlace interno no copiado (pagina 2, buscador, carrito, cuenta...) tambien
  lleva a no-copiada.html, asi nunca se sale del prototipo.
- Las fotos de producto se cargan desde la tienda real para no inflar el repositorio.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://thedragonchambergames.com/prestashop/"
HOST = "thedragonchambergames.com"
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site")

# Puntos de partida del rastreo (rutas relativas a BASE)
SEEDS = ["", "contacto", "mapa-del-sitio"]
LIMITE_PAGINAS = 400

UA = {"User-Agent": "Mozilla/5.0 (DragonChamber mirror)"}
_cache = {}


def fetch(url, intentos=3):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read(), r.headers.get_content_type()
        except Exception:
            if i == intentos - 1:
                raise
            time.sleep(2)


# ---------- Clasificacion de URLs internas ----------

def rel_path(url):
    """Ruta relativa a /prestashop/ sin query ni fragmento, o None si no es de la tienda."""
    p = urllib.parse.urlparse(url)
    if p.netloc not in ("", HOST) or not p.path.startswith("/prestashop"):
        return None
    return urllib.parse.unquote(p.path)[len("/prestashop/"):].strip("/")


def es_pagina_copiable(path):
    """Categoria (123-slug), marca (brand/..), pagina CMS (content/..), contacto o portada."""
    return (path == ""
            or re.fullmatch(r"\d+-[^/.]*", path) is not None
            or re.fullmatch(r"(brand|content)/[^/.]+", path) is not None
            or path in ("contacto", "mapa-del-sitio", "brand"))


def nombre_local(path):
    # La portada copiada se guarda aparte: site/index.html es la portada rediseñada (hecha a mano)
    if path == "":
        return "portada-original.html"
    return path.replace("/", "_") + ".html"


# ---------- Assets ----------

ATTR_RE = re.compile(r'\b(src|href|action|data-src|data-full-size-image-url|data-image-large-src|srcset|data-srcset)="([^"]*)"')
ASSET_EXT = re.compile(r"\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|otf|mp4|webm)$", re.I)
FOTO_PRODUCTO = re.compile(r"^\d+-\w+_default/")


def local_asset(url):
    p = urllib.parse.urlparse(url)
    path = urllib.parse.unquote(p.path)
    if path.startswith("/prestashop/"):
        path = path[len("/prestashop/"):]
    path = path.lstrip("/") or "index"
    if p.query:
        stem, ext = os.path.splitext(path)
        path = f"{stem}_{hashlib.md5(p.query.encode()).hexdigest()[:8]}{ext}"
    return path


def download_asset(url):
    """Descarga un asset y devuelve su ruta local relativa (o None si se deja remoto)."""
    if url in _cache:
        return _cache[url]
    path = rel_path(url) or ""
    if FOTO_PRODUCTO.match(path):  # fotos de producto: se cargan de la tienda real
        _cache[url] = None
        return None
    rel = local_asset(url)
    _cache[url] = rel
    dest = os.path.join(ROOT, rel)
    if os.path.exists(dest):
        return rel
    try:
        data, _ = fetch(url)
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
        if rel_path(abs_url) is None:
            return m.group(0)
        rel = download_asset(abs_url.split("#")[0])
        if not rel:
            return m.group(0)
        return f"url({m.group(1)}{os.path.relpath(rel, os.path.dirname(css_rel)).replace(os.sep, '/')}{m.group(1)})"

    return re.sub(r"url\((['\"]?)([^'\")]+)\1\)", repl, css)


# ---------- Marcas propias en cada pagina ----------

BANNER = (
    '<div id="dc-copia" style="position:sticky;top:0;z-index:100000;background:#c9a227;color:#1b1730;'
    'font:600 13px/1.4 sans-serif;text-align:center;padding:6px 12px">'
    'Copia de pruebas, no es la tienda. Para comprar ve a '
    '<a href="https://thedragonchambergames.com/prestashop/" style="color:inherit">thedragonchambergames.com</a></div>'
)
MEJORAS_HEAD = '<script src="dc/dragonchamber.js"></script>'
MEJORAS_CSS = '<link rel="stylesheet" href="dc/dragonchamber.css">'
MEJORAS_BODY = '<script src="dc/paginas.js"></script><script src="dc/asistente.js" defer></script>'


def mark_copy(html):
    """noindex + aviso visible + mejoras de site/dc/ (idempotente)."""
    if 'id="dc-copia"' in html:
        return html
    html = re.sub(r"<head[^>]*>", lambda m: m.group(0) + '<meta name="robots" content="noindex,nofollow">' + MEJORAS_HEAD, html, 1)
    html = html.replace("</head>", MEJORAS_CSS + MEJORAS_BODY + "</head>", 1)
    html = re.sub(r"<body[^>]*>", lambda m: m.group(0) + BANNER, html, 1)
    return html


# ---------- Rastreo ----------

def links_de(html, url):
    out = set()
    for m in re.finditer(r'href="([^"]+)"', html):
        u = urllib.parse.urljoin(url, m.group(1).replace("&amp;", "&"))
        p = urllib.parse.urlparse(u)
        if p.query:  # paginacion, filtros, busquedas: no se copian
            continue
        path = rel_path(u)
        if path is not None and es_pagina_copiable(path):
            out.add(path)
    return out


def rastrear():
    paginas, cola, vistos = {}, list(SEEDS), set(SEEDS)
    while cola and len(paginas) < LIMITE_PAGINAS:
        lote, cola = cola[:6], cola[6:]
        with ThreadPoolExecutor(6) as ex:
            res = list(ex.map(lambda p: (p, _get_html(p)), lote))
        for path, html in res:
            if html is None:
                continue
            paginas[path] = html
            for nuevo in links_de(html, urllib.parse.urljoin(BASE, path)):
                if nuevo not in vistos:
                    vistos.add(nuevo)
                    cola.append(nuevo)
        print(f"  {len(paginas)} paginas, {len(cola)} en cola")
    return paginas


def _get_html(path):
    try:
        return fetch(urllib.parse.urljoin(BASE, path))[0].decode("utf-8", "replace")
    except Exception as e:
        print(f"  ! {path}: {e}", file=sys.stderr)
        return None


# ---------- Reescritura ----------

def reescribir(path, html, copiadas):
    url = urllib.parse.urljoin(BASE, path)

    assets = set()
    for attr, val in ATTR_RE.findall(html):
        for part in (val.split(",") if "srcset" in attr else [val]):
            u = urllib.parse.urljoin(url, part.strip().split(" ")[0].replace("&amp;", "&"))
            p = urllib.parse.urlparse(u)
            if rel_path(u) is not None and ASSET_EXT.search(p.path):
                assets.add(u)
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(download_asset, assets))

    def destino(raw, attr):
        if raw.startswith(("#", "javascript:", "mailto:", "tel:", "data:")) or not raw:
            return raw
        u = urllib.parse.urljoin(url, raw.replace("&amp;", "&"))
        dest_path = rel_path(u)
        if dest_path is None:  # enlace externo
            return raw
        if u in _cache:
            return _cache[u] or u  # asset local o foto remota (absoluta)
        if ASSET_EXT.search(urllib.parse.urlparse(u).path):
            return u
        if attr not in ("href", "action"):
            return raw
        q = urllib.parse.urlparse(u).query
        if not q and dest_path == "":
            return "index.html"  # el logo y los enlaces de "Inicio" llevan a la portada rediseñada
        if not q and dest_path in copiadas:
            return nombre_local(dest_path)
        return "no-copiada.html?u=" + urllib.parse.quote(dest_path + ("?" + q if q else ""), safe="")

    def repl(m):
        attr, val = m.group(1), m.group(2)
        if "srcset" in attr:
            parts = []
            for part in val.split(","):
                bits = part.strip().split(" ")
                bits[0] = destino(bits[0], attr)
                parts.append(" ".join(bits))
            return f'{attr}="{", ".join(parts)}"'
        return f'{attr}="{destino(val, attr)}"'

    html = mark_copy(ATTR_RE.sub(repl, html))
    with open(os.path.join(ROOT, nombre_local(path)), "w", encoding="utf-8") as f:
        f.write(html)


def main():
    os.makedirs(ROOT, exist_ok=True)
    print("Rastreando categorias...")
    paginas = rastrear()
    copiadas = set(paginas)
    print(f"Reescribiendo {len(copiadas)} paginas...")
    for i, (path, html) in enumerate(sorted(paginas.items()), 1):
        reescribir(path, html, copiadas)
        if i % 25 == 0:
            print(f"  {i}/{len(copiadas)}")
    # Mapa de paginas para los scripts de site/dc (p.ej. los enlaces del asistente)
    with open(os.path.join(ROOT, "dc", "paginas.js"), "w", encoding="utf-8") as f:
        f.write("window.DC_PAGINAS=" + json.dumps({p: (nombre_local(p) if p else "index.html") for p in sorted(copiadas)}, ensure_ascii=False) + ";\n")
    print(f"Listo: {len(copiadas)} paginas y {len([v for v in _cache.values() if v])} assets en {ROOT}")


if __name__ == "__main__":
    main()
