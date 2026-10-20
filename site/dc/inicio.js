/* The Dragon Chamber · portada rediseñada
   1. Tema claro/oscuro   2. Estado en vivo (abierto ahora y hora de recogida)   3. Mazo fijo con lomos
   4. Dorsos de las cartas TCG   5. Fila arrastrable   6. Inclinación de las cartas   7. Entradas al hacer scroll */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Tema ---------- */
  var tema = document.getElementById('tema');
  function etiquetaTema() {
    var dark = root.dataset.theme === 'dark';
    tema.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  if (tema) {
    etiquetaTema();
    tema.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('dc-theme', root.dataset.theme); } catch (e) {}
      etiquetaTema();
    });
  }

  /* ---------- 2. Estado en vivo ----------
     Horario de la tienda (hora de Almería): todos los días 10:00-14:00 y 16:30-20:30.
     La recogida está lista en 2 horas de tienda abierta. */
  var TRAMOS = [[600, 840], [990, 1230]]; // minutos desde medianoche
  var RECOGIDA = 120;

  function ahoraEnAlmeria() {
    var partes = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var h = 0, m = 0;
    partes.forEach(function (p) { if (p.type === 'hour') h = +p.value; if (p.type === 'minute') m = +p.value; });
    return h * 60 + m;
  }
  function hora(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  // Suma minutos de tienda abierta a partir de "desde" (días que se repiten igual)
  function sumarAbierto(desde, minutos) {
    var dia = 0, t = desde;
    for (var guard = 0; guard < 10; guard++) {
      for (var i = 0; i < TRAMOS.length; i++) {
        var a = TRAMOS[i][0], b = TRAMOS[i][1];
        var inicio = Math.max(a, t);
        if (inicio >= b) continue;
        var cabe = b - inicio;
        if (minutos <= cabe) return { dia: dia, min: inicio + minutos };
        minutos -= cabe; t = b;
      }
      dia++; t = 0;
    }
    return null;
  }
  function textoEstado() {
    var now = ahoraEnAlmeria();
    var abierto = TRAMOS.filter(function (r) { return now >= r[0] && now < r[1]; })[0];
    var listo = sumarAbierto(now, RECOGIDA);
    var cuando = listo.dia === 0 ? 'hoy a partir de las ' + hora(Math.ceil(listo.min / 5) * 5)
      : 'mañana a partir de las ' + hora(Math.ceil(listo.min / 5) * 5);
    if (abierto) {
      return 'Abierto ahora, hasta las ' + hora(abierto[1]) + '. Si lo pides ya, lo recoges ' + cuando + '.';
    }
    var siguiente = TRAMOS.filter(function (r) { return r[0] > now; })[0];
    var abre = siguiente ? 'hoy a las ' + hora(siguiente[0]) : 'mañana a las ' + hora(TRAMOS[0][0]);
    return 'Cerrado ahora. Abrimos ' + abre + '. Si lo pides ya, lo recoges ' + cuando + '.';
  }
  function pintarEstado() {
    var t = textoEstado();
    document.querySelectorAll('[data-estado]').forEach(function (el) { el.textContent = t; });
  }
  pintarEstado();
  setInterval(pintarEstado, 60000);

  /* ---------- 3. Mazo fijo: cada carta entra por la derecha y las anteriores quedan como lomos ---------- */
  var deck = document.querySelector('.deck');
  var cartas = deck ? Array.prototype.slice.call(deck.querySelectorAll('.dcard')) : [];
  var LOMO = 120, ANCHO = 620;
  var escritorio = matchMedia('(min-width: 1000px)');

  function colocar(k) {
    var band = deck.querySelector('.deck__band');
    cartas.forEach(function (c, i) {
      c.classList.toggle('is-spine', i < k);
      c.classList.toggle('is-next', i > k);
      if (i < k) { c.style.setProperty('--x', i * LOMO + 'px'); c.style.setProperty('--clip', (ANCHO - LOMO) + 'px'); }
      else if (i === k) { c.style.setProperty('--x', k * LOMO + 'px'); c.style.setProperty('--clip', '0px'); }
      else {
        // Solo la siguiente asoma a la derecha; las demás esperan fuera de la banda
        c.style.setProperty('--x', (k * LOMO + ANCHO + 32 + (i - k - 1) * (ANCHO + 32)) + 'px');
        c.style.setProperty('--clip', Math.max(0, (k * LOMO + ANCHO + 32) + ANCHO - band.clientWidth) + 'px');
      }
      c.classList.toggle('is-hidden', i > k + 1);
      c.style.zIndex = i <= k ? i + 1 : cartas.length - i;
      c.setAttribute('aria-current', i === k ? 'true' : 'false');
    });
  }
  function pasoActual() {
    var r = deck.getBoundingClientRect();
    var recorrido = deck.offsetHeight - innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / recorrido));
    return Math.min(cartas.length - 1, Math.floor(p * cartas.length));
  }
  function activarMazo() {
    if (!deck || reduce || !escritorio.matches) { deck && deck.classList.remove('is-pinned'); return; }
    deck.classList.add('is-pinned');
    var ultimo = -1;
    function tick() {
      var k = pasoActual();
      if (k !== ultimo) { colocar(k); ultimo = k; }
    }
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', function () { ultimo = -1; tick(); });
    cartas.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (!c.classList.contains('is-spine') && !c.classList.contains('is-next')) return;
        e.preventDefault();
        var recorrido = deck.offsetHeight - innerHeight;
        scrollTo({ top: deck.offsetTop + (i + 0.5) / cartas.length * recorrido, behavior: 'smooth' });
      });
    });
    tick();
  }
  if (deck) activarMazo();

  /* ---------- 4. Dorsos de las cartas TCG (colores planos) ---------- */
  var DORSOS = {
    '179': '<svg viewBox="0 0 250 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="250" height="96" fill="#2b1650"/><circle cx="125" cy="48" r="70" fill="none" stroke="#e5c04b" stroke-width="3"/><circle cx="125" cy="48" r="44" fill="none" stroke="#e5c04b" stroke-width="2"/><circle cx="125" cy="8" r="9" fill="#f4eecf"/><circle cx="165" cy="34" r="9" fill="#3f8fd8"/><circle cx="150" cy="80" r="9" fill="#222"/><circle cx="100" cy="80" r="9" fill="#d8453b"/><circle cx="85" cy="34" r="9" fill="#3aa757"/><circle cx="125" cy="48" r="12" fill="#e5c04b"/></svg>',
    '181': '<svg viewBox="0 0 250 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="250" height="96" fill="#4a2410"/><g fill="none" stroke="#f0c36a" stroke-width="3"><path d="M125 -10 L175 80 L75 80Z"/><path d="M125 106 L75 16 L175 16Z"/><circle cx="125" cy="48" r="20"/></g><circle cx="125" cy="48" r="8" fill="#f0c36a"/></svg>',
    '182': '<svg viewBox="0 0 250 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="250" height="96" fill="#0e2a4d"/><g fill="none" stroke="#6cc3e8" stroke-width="3"><path d="M0 70 q31 -20 62 0 t62 0 t62 0 t64 0"/><path d="M0 88 q31 -20 62 0 t62 0 t62 0 t64 0"/></g><circle cx="125" cy="40" r="28" fill="none" stroke="#f3d27a" stroke-width="3"/><path d="M125 12 L132 40 L125 68 L118 40Z" fill="#d94a3a"/></svg>',
    '185': '<svg viewBox="0 0 250 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="250" height="96" fill="#1b1f5e"/><g fill="none" stroke="#9fd0ff" stroke-width="3"><path d="M125 -4 C185 20 185 76 125 100 C65 76 65 20 125 -4Z"/><path d="M125 18 C155 32 155 64 125 78 C95 64 95 32 125 18Z"/></g><path d="M125 -4 L117 48 L125 100 L133 48Z" fill="#9fd0ff"/></svg>',
    '186': '<svg viewBox="0 0 250 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="250" height="96" fill="#08111f"/><g fill="#23f8fd"><rect x="60" y="20" width="36" height="52" rx="5"/><rect x="107" y="16" width="36" height="52" rx="5" transform="rotate(6 125 42)"/><rect x="154" y="20" width="36" height="52" rx="5" transform="rotate(12 172 46)"/></g></svg>'
  };
  document.querySelectorAll('[data-back]').forEach(function (el) { el.innerHTML = DORSOS[el.dataset.back] || ''; });

  /* ---------- 5. Fila arrastrable ---------- */
  var track = document.querySelector('.row__track');
  if (track) {
    var barra = document.querySelector('.row__bar span');
    var progreso = function () {
      var max = track.scrollWidth - track.clientWidth;
      var visible = track.clientWidth / track.scrollWidth;
      barra.style.width = (visible * 100) + '%';
      barra.style.transform = 'translateX(' + (max > 0 ? (track.scrollLeft / max) * (1 / visible - 1) * 100 : 0) + '%)';
    };
    track.addEventListener('scroll', progreso, { passive: true });
    addEventListener('resize', progreso);
    progreso();
    document.querySelectorAll('[data-row]').forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: +b.dataset.row * 312, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- 6. Inclinación de las cartas al pasar el ratón ---------- */
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.tilt').forEach(function (c) {
      var base = getComputedStyle(c).getPropertyValue('--r') || '0deg';
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        var lift = c.classList.contains('slip') ? ' translateY(-14px)' : '';
        c.style.transform = 'perspective(900px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg)' + lift;
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }

  /* ---------- 7. Entradas al aparecer (escalonadas) ---------- */
  var bloques = document.querySelectorAll('.deck__head, .tcg__copy, .slips, .sheet, .sheet__group, .buy__pic, .row__head, .row__track, .vcard, .back__panel, .back__links');
  bloques.forEach(function (b) {
    b.setAttribute('data-rise', '');
    Array.prototype.forEach.call(b.children, function (ch, i) { ch.style.transitionDelay = (i * 75) + 'ms'; });
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    bloques.forEach(function (b) { io.observe(b); });
  } else {
    bloques.forEach(function (b) { b.classList.add('is-in'); });
  }
})();
