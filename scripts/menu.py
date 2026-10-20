"""Ajustes del menú superior, aplicados a todas las páginas copiadas.

Uso:  python scripts/menu.py      (mirror.py lo aplica solo a cada página que copia)

- "+ Miniaturas" deja de estar en la barra y pasa a ser una columna "MINIATURAS" dentro de
  "Pintura y Modelismo".
- Se añade "Ofertas" al final de la barra.
El menú aparece dos veces en cada página (normal y cabecera fija); se ajustan las dos.
"""
import glob
import os
import re

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site")
MARCA = "<!-- dc-menu -->"

COLUMNA_MINIATURAS = """<div class="avaorg-menu-col col-xs-6 col-sm-3 dc-menu-col">
	<a href="6-miniaturas.html" class="column_title">MINIATURAS</a>
	<span class="icon-drop-mobile"><i class="material-icons add">add </i><i class="material-icons remove">remove </i></span>
	<ul class="ul-column column_dropdown ">
		<li class="submenu-item"><a href="94-corvus-belli.html">Corvus Belli</a></li>
		<li class="submenu-item"><a href="97-warcrow.html">Warcrow</a></li>
		<li class="submenu-item"><a href="96-archon-studio.html">Archon Studio</a></li>
		<li class="submenu-item"><a href="100-dungeon-lasers.html">Dungeons&amp;Lásers</a></li>
		<li class="submenu-item"><a href="195-trench-crusade.html">Trench+Crusade</a></li>
		<li class="submenu-item"><a href="93-model-kit.html">Model Kit</a></li>
		<li class="submenu-item"><a href="194-gale-force-nine.html">Gale Force Nine</a></li>
	</ul>
</div>"""

OFERTAS = """<li class=" menu-item dc-menu-ofertas ">
	<a href="ofertas.html"><span>Ofertas</span></a>
</li>"""


def bloques_li(html, href):
    """(inicio, fin) de cada <li class=" menu-item ..."> de primer nivel cuyo enlace principal es `href`."""
    out = []
    patron = r'<li class="\s*menu-item[^"]*">\s*<a\s+(?:style=""\s+)?href="' + re.escape(href) + '"'
    for m in re.finditer(patron, html):
        nivel = 0
        for t in re.finditer(r"<(/?)li\b", html[m.start():]):
            nivel += -1 if t.group(1) else 1
            if nivel == 0:
                out.append((m.start(), m.start() + t.end() + 1))
                break
    return out


def ajustar_menu(html):
    if MARCA in html or "6-miniaturas.html" not in html:
        return html
    # Se trabaja de atrás hacia delante para no mover las posiciones pendientes
    cambios = []
    for a, b in bloques_li(html, "6-miniaturas.html"):
        cambios.append((a, b, ""))
    for a, b in bloques_li(html, "9-pintura-y-modelismo.html"):
        bloque = html[a:b]
        # La fila de columnas es el tercer </div> empezando por el final del <li>
        cierres = [m.start() for m in re.finditer(r"</div>", bloque)]
        if len(cierres) >= 3:
            p = a + cierres[-3]
            cambios.append((p, p, COLUMNA_MINIATURAS))
    for a, b in bloques_li(html, "174-libros-y-rol.html"):
        cambios.append((b, b, OFERTAS))
    for a, b, nuevo in sorted(cambios, key=lambda c: c[0], reverse=True):
        html = html[:a] + nuevo + html[b:]
    return html.replace("</body>", MARCA + "</body>", 1)


def main():
    n = 0
    for f in glob.glob(os.path.join(SITE, "*.html")):
        if os.path.basename(f) in ("index.html", "no-copiada.html"):
            continue
        with open(f, encoding="utf-8") as fh:
            html = fh.read()
        nuevo = ajustar_menu(html)
        if nuevo != html:
            with open(f, "w", encoding="utf-8") as fh:
                fh.write(nuevo)
            n += 1
    print(f"Menú ajustado en {n} páginas")


if __name__ == "__main__":
    main()
