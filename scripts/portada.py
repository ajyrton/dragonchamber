"""Genera site/index.html a partir de la copia de la portada original (site/portada-original.html).

Uso:  python scripts/portada.py      (mirror.py lo ejecuta solo al terminar)

Cambios sobre la original:
- El slider principal se sustituye por el de novedades y eventos con la mano de cartas (portada/slider.html).
- Antes de la franja "Envío rápido / Envío gratis..." se añade "De tu pedido a tu mesa" y el ticket
  "Comprar aquí" (portada/pedido.html).
- Fondo dividido y estilos en site/dc/portada.css; comportamiento en site/dc/portada.js.
"""
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(os.path.dirname(AQUI), "site")


def leer(ruta):
    with open(ruta, encoding="utf-8") as f:
        return f.read()


def bloque_section(html, marca):
    """Devuelve (inicio, fin) de la etiqueta <section> cuya clase incluye `marca`."""
    patron = r'<section\b[^>]*\bclass="[^"]*\b' + re.escape(marca) + r'\b'
    m = re.search(patron, html)
    if not m:
        raise SystemExit(f"No encuentro la sección {marca} en la portada original")
    inicio = m.start()
    nivel = 0
    for t in re.finditer(r"<(/?)section\b", html[inicio:]):
        nivel += -1 if t.group(1) else 1
        if nivel == 0:
            fin = inicio + t.end()
            return inicio, html.index(">", fin) + 1
    raise SystemExit("La sección no se cierra")


def main():
    html = leer(os.path.join(SITE, "portada-original.html"))

    # 1. Slider original -> slider de novedades con la mano de cartas
    a, b = bloque_section(html, "main-slider-section")
    html = html[:a] + leer(os.path.join(AQUI, "portada", "slider.html")) + html[b:]

    # 2. "De tu pedido a tu mesa" + ticket, antes de la franja de envío y pago
    a, _ = bloque_section(html, "elementor-element-bc79677")
    html = html[:a] + leer(os.path.join(AQUI, "portada", "pedido.html")) + html[a:]

    # 3. Estilos, script y clase del body
    html = html.replace("</head>", '<link rel="stylesheet" href="dc/portada.css"><script src="dc/portada.js" defer></script></head>', 1)
    html = re.sub(r'<body([^>]*)class="', r'<body\1class="dc-portada ', html, count=1)

    with open(os.path.join(SITE, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("site/index.html generada")


if __name__ == "__main__":
    main()
