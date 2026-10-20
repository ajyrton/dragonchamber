# The Dragon Chamber — banco de pruebas

Copia estática de la tienda [thedragonchambergames.com/prestashop](https://thedragonchambergames.com/prestashop/)
para probar mejoras visuales poco a poco antes de pasarlas a la web real.

**Web publicada:** <https://ajyrton.github.io/dragonchamber/>

## Estructura

| Carpeta | Qué hay |
|---|---|
| `site/` | Copia de la web (HTML, CSS, JS e imágenes del tema *Ebotic*). |
| `site/dc/` | **Mejoras aplicadas**: `dragonchamber.css` + `dragonchamber.js` (modo oscuro, slider con cartas, dorsos TCG) y `asistente.js`. Es lo que se edita y lo que luego se sube al tema real. |
| `mejoras/` | Maquetas originales de las mejoras (artefactos). |
| `scripts/mirror.py` | Script que vuelve a descargar la copia desde la web real. |

Páginas copiadas: portada, categoría Juegos de cartas (TCG), categoría Cartas, categoría Party games, una ficha de producto,
contacto, sobre nosotros y envíos.

## Verlo en local

```bash
python -m http.server 8080 -d site
```

Y abre <http://localhost:8080>. Los prototipos de `mejoras/` se abren directamente con doble clic.

## Refrescar la copia

```bash
python scripts/mirror.py
```

Para añadir páginas, edita la lista `PAGES` del script. Ojo: sobrescribe los ficheros de `site/`
que ya existan como HTML, así que haz commit de tus cambios antes.

## Limitaciones

- **Es solo el frontal.** El carrito, la búsqueda, la lista de deseos, las valoraciones y el
  login llaman al servidor real y no funcionan en local.
- Los enlaces a páginas que no están copiadas siguen apuntando a la web real.
- PrestaShop genera las páginas con plantillas Smarty (`.tpl`) del tema. Un cambio hecho aquí en
  HTML/CSS hay que trasladarlo luego al tema (o a `custom.css` / `custom.js`) en el servidor.
- Para un clon completo (PHP + base de datos) hace falta acceso FTP y un volcado de la BD.
  **Nunca subas `app/config/parameters.php` ni volcados de la BD a este repositorio.**
