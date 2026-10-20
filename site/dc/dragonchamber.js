/* The Dragon Chamber – mejoras visuales sobre el tema Ebotic
   Se carga en el <head> sin defer para aplicar el modo oscuro antes de pintar (sin parpadeo).
   1. Modo oscuro (botón luna / sol)   2. Dorsos animados en las subcategorías TCG */
(function () {
  var KEY = 'dc-theme', root = document.documentElement;

  /* ---------- 1. Modo oscuro ---------- */
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function prefersDark() { return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches; }
  root.dataset.theme = saved() || (prefersDark() ? 'dark' : 'light');

  function setupThemeButton() {
    var b = document.createElement('button');
    b.id = 'dc-theme';
    b.type = 'button';
    function label() {
      var dark = root.dataset.theme === 'dark';
      b.textContent = dark ? '☀' : '☾';
      b.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      b.title = b.getAttribute('aria-label');
    }
    b.onclick = function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, root.dataset.theme); } catch (e) {}
      label();
    };
    label();
    document.body.appendChild(b);
  }

  /* ---------- 2. Dorsos TCG ---------- */
  var BACKS = {
    '179': '<svg viewBox="0 0 250 350" aria-hidden="true"><rect width="250" height="350" fill="#2b1650"/><rect x="10" y="10" width="230" height="330" rx="10" fill="none" stroke="#e5c04b" stroke-width="3"/><circle cx="125" cy="175" r="88" fill="none" stroke="#e5c04b" stroke-width="2"/><g stroke="#e5c04b" stroke-width="2" fill="none"><polygon points="125,95 200,150 172,238 78,238 50,150"/><polygon points="125,255 50,200 78,112 172,112 200,200"/></g><g><circle cx="125" cy="88" r="12" fill="#f4eecf"/><circle cx="205" cy="146" r="12" fill="#3f8fd8"/><circle cx="175" cy="240" r="12" fill="#222"/><circle cx="75" cy="240" r="12" fill="#d8453b"/><circle cx="45" cy="146" r="12" fill="#3aa757"/></g><circle cx="125" cy="175" r="16" fill="#e5c04b"/></svg>',
    '181': '<svg viewBox="0 0 250 350" aria-hidden="true"><defs><radialGradient id="dc-y" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#7a3a14"/><stop offset="1" stop-color="#2a1208"/></radialGradient></defs><rect width="250" height="350" fill="url(#dc-y)"/><rect x="10" y="10" width="230" height="330" rx="10" fill="none" stroke="#f0c36a" stroke-width="3"/><g fill="none" stroke="#f0c36a" stroke-width="2.5"><path d="M125 70 L200 230 L50 230Z"/><path d="M125 280 L50 120 L200 120Z"/><circle cx="125" cy="175" r="26"/></g><circle cx="125" cy="175" r="10" fill="#f0c36a"/></svg>',
    '182': '<svg viewBox="0 0 250 350" aria-hidden="true"><rect width="250" height="350" fill="#0e2a4d"/><g fill="none" stroke="#6cc3e8" stroke-width="2.5" opacity=".7"><path d="M0 250 q31 -24 62 0 t62 0 t62 0 t64 0"/><path d="M0 280 q31 -24 62 0 t62 0 t62 0 t64 0"/><path d="M0 310 q31 -24 62 0 t62 0 t62 0 t64 0"/></g><rect x="10" y="10" width="230" height="330" rx="10" fill="none" stroke="#f3d27a" stroke-width="3"/><circle cx="125" cy="140" r="64" fill="none" stroke="#f3d27a" stroke-width="3"/><path d="M125 76 L137 140 L125 204 L113 140Z" fill="#d94a3a"/><path d="M61 140 L125 128 L189 140 L125 152Z" fill="#f3d27a"/><circle cx="125" cy="140" r="7" fill="#0e2a4d"/></svg>',
    '185': '<svg viewBox="0 0 250 350" aria-hidden="true"><defs><radialGradient id="dc-r" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#2f6ee8"/><stop offset=".5" stop-color="#1b1f5e"/><stop offset="1" stop-color="#0b0b24"/></radialGradient></defs><rect width="250" height="350" fill="url(#dc-r)"/><rect x="10" y="10" width="230" height="330" rx="10" fill="none" stroke="#9fd0ff" stroke-width="3"/><g fill="none" stroke="#9fd0ff" stroke-width="2"><path d="M125 55 C190 100 190 250 125 295 C60 250 60 100 125 55Z"/><path d="M125 95 C165 130 165 220 125 255 C85 220 85 130 125 95Z"/></g><path d="M125 55 L112 175 L125 295 L138 175Z" fill="#9fd0ff" opacity=".8"/></svg>'
  };

  function setupTcgBacks() {
    var items = document.querySelectorAll('#subcategories .subcategory-item');
    items.forEach(function (li) {
      var a = li.querySelector('.subcategory-image a');
      if (!a) return;
      var m = (a.getAttribute('href') || '').match(/\/(\d+)-[^\/]*$/);
      if (!m || !BACKS[m[1]]) return;
      a.innerHTML = '<span class="dc-card">' + BACKS[m[1]] + '</span>';
      li.parentElement.classList.add('dc-tcg-list');
      var c = a.firstChild;
      li.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - .5) * 24) + 'deg');
        c.style.setProperty('--rx', ((.5 - y) * 24) + 'deg');
        c.style.setProperty('--mx', x * 100 + '%');
        c.style.setProperty('--my', y * 100 + '%');
      });
      li.addEventListener('mouseleave', function () {
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
      });
    });
  }

  function init() { setupThemeButton(); setupTcgBacks(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
