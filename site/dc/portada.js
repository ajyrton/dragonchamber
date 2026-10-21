/* The Dragon Chamber · añadidos de la portada
   1. Slider de novedades con la mano de cartas   2. Dragón arrastrable de "De tu pedido a tu mesa"   3. Ticket ampliable */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Slider ---------- */
  var EMBLEMAS = {
    yugioh: '<svg viewBox="0 0 30 46" aria-hidden="true"><g fill="none" stroke="#f0c36a" stroke-width="2"><path d="M15 4 L27 34 L3 34Z"/><path d="M15 42 L3 12 L27 12Z"/></g><circle cx="15" cy="23" r="3" fill="#f0c36a"/></svg>',
    riftbound: '<svg viewBox="0 0 30 46" aria-hidden="true"><path d="M15 3 C26 12 26 34 15 43 C4 34 4 12 15 3Z" fill="none" stroke="#9fd0ff" stroke-width="2"/><path d="M15 3 L12 23 L15 43 L18 23Z" fill="#9fd0ff"/></svg>',
    onepiece: '<svg viewBox="0 0 30 46" aria-hidden="true"><circle cx="15" cy="20" r="10" fill="none" stroke="#f3d27a" stroke-width="2"/><path d="M15 10 L17 20 L15 30 L13 20Z" fill="#d94a3a"/><path d="M2 38 q6 -4 13 0 t13 0" fill="none" stroke="#6cc3e8" stroke-width="2"/></svg>',
    magic: '<svg viewBox="0 0 30 46" aria-hidden="true"><circle cx="15" cy="23" r="11" fill="none" stroke="#e5c04b" stroke-width="1.6"/><circle cx="15" cy="11" r="3" fill="#f4eecf"/><circle cx="26" cy="20" r="3" fill="#3f8fd8"/><circle cx="21" cy="33" r="3" fill="#222"/><circle cx="9" cy="33" r="3" fill="#d8453b"/><circle cx="4" cy="20" r="3" fill="#3aa757"/><circle cx="15" cy="23" r="3.5" fill="#e5c04b"/></svg>',
    pokemon: '<svg viewBox="0 0 30 46" aria-hidden="true"><circle cx="15" cy="23" r="11" fill="#fff"/><path d="M4 23 A11 11 0 0 1 26 23Z" fill="#ffd54a"/><path d="M4 23 H26" stroke="#1b1b2f" stroke-width="2"/><circle cx="15" cy="23" r="3.5" fill="#fff" stroke="#1b1b2f" stroke-width="2"/></svg>',
    gundam: '<svg viewBox="0 0 30 46" aria-hidden="true"><path d="M3 12 L15 26 L27 12 L22 12 L15 21 L8 12Z" fill="#ffd54a"/><rect x="11" y="27" width="8" height="10" rx="2" fill="#e9eef3"/><circle cx="15" cy="31" r="2" fill="#d8453b"/></svg>',
    aos: '<svg viewBox="0 0 30 46" aria-hidden="true"><path d="M15 3 L19 12 L16.5 12 L16.5 40 L13.5 40 L13.5 12 L11 12Z" fill="#e5c04b"/><path d="M8 34 H22" stroke="#e5c04b" stroke-width="3" stroke-linecap="round"/></svg>'
  };

  var hero = document.querySelector('.dc-hero');
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.dc-slide'));
    var hand = hero.querySelector('.dc-hand');
    var actual = 0, timer = null, n = slides.length, mid = (n - 1) / 2;

    var hover = -1;
    var cartas = slides.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dc-mcard';
      b.style.setProperty('--c', s.style.getPropertyValue('--c'));
      b.style.setProperty('--k', s.style.getPropertyValue('--k'));
      var titulo = s.querySelector('h2').textContent;
      var img = s.querySelector('.dc-slide__img img');
      b.setAttribute('aria-label', 'Diapositiva ' + (i + 1) + ' de ' + n + ': ' + titulo + ', ' + s.dataset.fecha);
      // Carta completa en miniatura: gema (emblema), cinta con el título, arte, tipo y fecha
      b.innerHTML = '<span class="dc-mcard__cara" aria-hidden="true">' +
        '<span class="dc-mcard__cinta">' + s.dataset.corto + '</span>' +
        '<span class="dc-mcard__arte"><img src="' + img.getAttribute('src') + '" alt="" loading="lazy"></span>' +
        '<span class="dc-mcard__tipo">' + s.dataset.tipo + '</span>' +
        '<span class="dc-mcard__fecha">' + s.dataset.fecha + '</span>' +
        '</span><span class="dc-mcard__gema" aria-hidden="true">' + (EMBLEMAS[s.dataset.emblema] || '') + '</span>';
      b.addEventListener('click', function () { ir(i); reiniciar(); });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = i; colocarMano(); } });
      b.addEventListener('pointerleave', function () { if (hover === i) { hover = -1; colocarMano(); } });
      b.addEventListener('focus', function () { hover = i; colocarMano(); });
      b.addEventListener('blur', function () { if (hover === i) { hover = -1; colocarMano(); } });
      // Flechas para recorrer la mano con el teclado
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); cartas[(i + d + n) % n].focus(); }
      });
      hand.appendChild(b);
      return b;
    });

    // Abanico: posición, giro y escala de cada carta según la seleccionada y la que tiene el ratón
    function colocarMano() {
      var movil = innerWidth < 768;
      var paso = movil ? 44 : 80;          // separación entre cartas (se solapan)
      var aparta = movil ? 22 : 46;        // cuánto se apartan las vecinas de la seleccionada
      var sube = movil ? -52 : -74;        // cuánto sube la seleccionada
      var escala = movil ? 1.45 : 1.45;
      var ancho = cartas[0].offsetWidth;
      var limite = hand.clientWidth / 2 - ancho * escala / 2 - 12; // la seleccionada no se sale por los lados
      cartas.forEach(function (c, i) {
        var d = i - mid;
        var x = d * paso, y = d * d * (movil ? 2.5 : 4), r = d * 5, s = 1, z = 10 + i;
        if (i < actual) x -= aparta; else if (i > actual) x += aparta;
        if (hover >= 0 && hover !== actual && i !== hover) x += (i < hover ? -1 : 1) * (movil ? 8 : 16);
        if (i === actual) { y = sube; r = 0; s = escala; z = 100; x = Math.max(-limite, Math.min(limite, x)); }
        else if (i === hover) { y = y - (movil ? 18 : 30); r = 0; s = 1.12; z = 90; }
        c.style.setProperty('--x', x + 'px');
        c.style.setProperty('--y', y + 'px');
        c.style.setProperty('--r', r + 'deg');
        c.style.setProperty('--s', s);
        c.style.zIndex = z;
      });
    }
    addEventListener('resize', colocarMano);

    function ir(i) {
      actual = (i + n) % n;
      slides.forEach(function (s, j) {
        var on = j === actual;
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        s.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = on ? 0 : -1; });
      });
      cartas.forEach(function (c, j) { c.setAttribute('aria-current', j === actual ? 'true' : 'false'); });
      colocarMano();
    }
    function siguiente() { ir(actual + 1); }
    function reiniciar() {
      clearInterval(timer);
      if (!reduce) timer = setInterval(siguiente, 6500);
    }
    hero.querySelector('.dc-hero__arrow--prev').addEventListener('click', function () { ir(actual - 1); reiniciar(); });
    hero.querySelector('.dc-hero__arrow--next').addEventListener('click', function () { siguiente(); reiniciar(); });
    // Pausa mientras el ratón o el foco están dentro
    hero.addEventListener('mouseenter', function () { clearInterval(timer); });
    hero.addEventListener('mouseleave', reiniciar);
    hero.addEventListener('focusin', function () { clearInterval(timer); });
    hero.addEventListener('focusout', reiniciar);
    document.addEventListener('visibilitychange', function () { document.hidden ? clearInterval(timer) : reiniciar(); });
    // Fuera de pantalla no avanza: el bucle solo corre mientras se ve
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? reiniciar() : clearInterval(timer); }).observe(hero);
    }
    // Deslizar con el dedo
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { ir(actual + (dx < 0 ? 1 : -1)); reiniciar(); }
    });
    ir(0);
    reiniciar();
  }

  /* ---------- 2. Dragón arrastrable ---------- */
  var ruta = document.querySelector('.dc-ruta');
  if (ruta) {
    var dragon = ruta.querySelector('.dc-dragon');
    var hecho = ruta.querySelector('.dc-ruta__hecho');
    var paradas = Array.prototype.slice.call(ruta.querySelectorAll('.dc-ruta__paradas li'));
    var botones = paradas.map(function (li) { return li.querySelector('button'); });
    var pasos = Array.prototype.slice.call(document.querySelectorAll('.dc-pasos li'));
    var fila = document.querySelector('.dc-pasos');
    var total = paradas.length, paso = 0, pos = 0, arrastrando = false, programado = 0;

    paradas.forEach(function (li, i) { li.style.left = (i / (total - 1) * 100) + '%'; });

    function ancho() { return ruta.clientWidth; }
    // Coloca al dragón en una fracción f (0..1) de la ruta
    function colocar(f, mover) {
      var antes = pos;
      pos = Math.min(1, Math.max(0, f));
      dragon.style.setProperty('--x', (pos * ancho()) + 'px');
      dragon.classList.toggle('mira-izq', pos < antes - 0.001);
      hecho.style.width = (pos * 100) + '%';
      var p = Math.round(pos * (total - 1));
      botones.forEach(function (b, i) { b.classList.toggle('is-hecho', i <= p); b.classList.toggle('is-aqui', i === p); });
      pasos.forEach(function (li, i) { li.classList.toggle('is-aqui', i === p); });
      if (p !== paso) {
        paso = p;
        dragon.setAttribute('aria-valuenow', p + 1);
        dragon.setAttribute('aria-valuetext', botones[p].textContent);
      }
      if (mover !== false && fila) {
        programado = Date.now();
        var li = pasos[p];
        var objetivo = li.offsetLeft - fila.offsetLeft - (fila.clientWidth - li.clientWidth) / 2;
        fila.scrollTo({ left: objetivo, behavior: reduce || arrastrando ? 'auto' : 'smooth' });
      }
    }
    function irA(i) { colocar(i / (total - 1)); }

    // Arrastre con ratón, dedo o lápiz
    dragon.addEventListener('pointerdown', function (e) {
      arrastrando = true;
      dragon.setPointerCapture(e.pointerId);
      dragon.classList.add('is-arrastrando', 'is-volando');
      e.preventDefault();
    });
    dragon.addEventListener('pointermove', function (e) {
      if (!arrastrando) return;
      var r = ruta.getBoundingClientRect();
      colocar((e.clientX - r.left) / r.width);
    });
    function soltar() {
      if (!arrastrando) return;
      arrastrando = false;
      dragon.classList.remove('is-arrastrando', 'is-volando');
      irA(Math.round(pos * (total - 1))); // se posa en la parada más cercana
    }
    dragon.addEventListener('pointerup', soltar);
    dragon.addEventListener('pointercancel', soltar);

    // Teclado: flechas, Inicio y Fin
    dragon.addEventListener('keydown', function (e) {
      var k = e.key, p = Math.round(pos * (total - 1));
      if (k === 'ArrowRight' || k === 'ArrowUp') p++;
      else if (k === 'ArrowLeft' || k === 'ArrowDown') p--;
      else if (k === 'Home') p = 0;
      else if (k === 'End') p = total - 1;
      else return;
      e.preventDefault();
      irA(Math.max(0, Math.min(total - 1, p)));
    });

    // Pulsar una parada lleva al dragón volando hasta ella
    botones.forEach(function (b, i) {
      b.addEventListener('click', function () {
        dragon.classList.add('is-volando');
        irA(i);
        setTimeout(function () { dragon.classList.remove('is-volando'); }, 500);
      });
    });

    // Si se desliza la fila de fotos, el dragón la sigue
    if (fila) {
      var t = null;
      fila.addEventListener('scroll', function () {
        if (arrastrando || Date.now() - programado < 800) return;
        clearTimeout(t);
        t = setTimeout(function () {
          var max = fila.scrollWidth - fila.clientWidth;
          if (max <= 0) return;
          colocar(fila.scrollLeft / max, false);
        }, 120);
      }, { passive: true });
    }
    addEventListener('resize', function () { colocar(pos, false); });
    colocar(0, false);
  }

  /* ---------- 3. Ticket ampliable ---------- */
  var btn = document.querySelector('.dc-ticket__btn');
  if (btn) {
    var mas = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var abrir = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', abrir);
      mas.hidden = !abrir;
      document.querySelector('.dc-ticket__res').hidden = abrir;
      btn.textContent = abrir ? 'Ver menos' : 'Ver todas las condiciones';
    });
  }
  /* ---------- 4. Dorsos TCG: se inclinan hacia el ratón y brillan ---------- */
  // Se activa siempre con ratón: es un movimiento pequeño que solo ocurre mientras se pasa por encima
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.dc-tcgcard').forEach(function (t) {
      var c = t.querySelector('.dc-tcgcard__card');
      t.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - .5) * 40) + 'deg');
        c.style.setProperty('--rx', ((.5 - y) * 40) + 'deg');
        c.style.setProperty('--mx', x * 100 + '%');
        c.style.setProperty('--my', y * 100 + '%');
      });
      t.addEventListener('mouseleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  }
})();
