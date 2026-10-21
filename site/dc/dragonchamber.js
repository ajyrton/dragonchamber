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
    '179': '<img src="dc/img/dorsos/magic.jpg" alt="">',
    '181': '<img src="dc/img/dorsos/yugioh.jpg" alt="">',
    '182': '<img src="dc/img/dorsos/onepiece.jpg" alt="">',
    '185': '<img src="dc/img/dorsos/riftbound.jpg" alt="">'
  };

  function setupTcgBacks() {
    var items = document.querySelectorAll('#subcategories .subcategory-item');
    items.forEach(function (li) {
      var a = li.querySelector('.subcategory-image a');
      if (!a) return;
      var m = (a.getAttribute('href') || '').match(/(?:^|\/)(\d+)-[^\/]*$/);
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
