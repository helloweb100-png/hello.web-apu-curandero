/* =========================================================
   APU RUNA | Interacciones y animaciones
   Vanilla JS, sin dependencias. Sin listeners de "scroll":
   un solo ticker con requestAnimationFrame lee scrollY y
   actualiza variables CSS / transforms (solo transform y opacity).
   Todo respeta prefers-reduced-motion.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Configuración (editar aquí) ---------- */
  const CONFIG = {
    phone: '5218118113822',           // WhatsApp internacional, sin + ni espacios
    guidingSince: 1990,
    interests: {
      ceremonia: 'una ceremonia y ofrenda a la Pachamama',
      curacion: 'una consulta de curación andina',
      turismo: 'el turismo místico en los Andes',
      formacion: 'la formación de nuevos chamanes',
      mexico: 'un encuentro contigo en México',
      conversar: 'conversar contigo primero',
    },
  };

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  root.classList.add('js-ok');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mqReduce.matches;
  mqReduce.addEventListener && mqReduce.addEventListener('change', e => { reduce = e.matches; });
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Estado compartido: viewport, scroll y puntero (normalizado -1..1, suavizado) */
  const view = { w: window.innerWidth, h: window.innerHeight, y: window.scrollY, docH: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, cx: -9999, cy: -9999, active: false };

  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / view.w) * 2 - 1;
    pointer.y = (e.clientY / view.h) * 2 - 1;
    pointer.cx = e.clientX;
    pointer.cy = e.clientY;
    pointer.active = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; pointer.cx = pointer.cy = -9999; });

  /* ---------- Ticker único ---------- */
  const tasks = new Set();
  const resizers = new Set();

  function frame(t) {
    view.y = window.scrollY;
    pointer.sx = lerp(pointer.sx, pointer.x, 0.07);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.07);
    tasks.forEach(fn => fn(t));
    requestAnimationFrame(frame);
  }

  function measure() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.docH = document.documentElement.scrollHeight;
    resizers.forEach(fn => fn());
  }
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  });

  /* ---------- Titulares: dividir en palabras ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            const inner = document.createElement('span');
            w.className = 'w';
            inner.className = 'w__in';
            inner.style.setProperty('--wi', String(i++));
            inner.textContent = part;
            w.append(inner);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains('w')) {
          walk(child);
        }
      });
    };
    walk(el);
  }

  /* ---------- Loader ---------- */
  function initLoader(done) {
    const loader = $('#loader');
    if (!loader) { done(); return; }

    root.classList.add('is-loading');
    const bar = $('#loaderBar');
    const count = $('#loaderCount');
    const fill = $('#loaderFill');
    const msg = $('#loaderMsg');
    const CIRC = 2 * Math.PI * 100;
    const messages = [[0, 'Invocando a los Apus'], [42, 'Encendiendo la ofrenda'], [82, 'Bienvenido, caminante']];

    const minMs = reduce ? 250 : 2700;
    const startAt = performance.now();
    let pageReady = document.readyState === 'complete';
    let fontsReady = !document.fonts;
    let shown = 0;
    let finished = false;
    let lastMsg = '';

    if (!pageReady) window.addEventListener('load', () => { pageReady = true; }, { once: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { fontsReady = true; });
      setTimeout(() => { fontsReady = true; }, 3000);
    }

    function render() {
      const p = clamp(shown, 0, 100);
      bar.style.strokeDashoffset = String(CIRC * (1 - p / 100));
      count.textContent = String(Math.round(p));
      fill.style.setProperty('--p', p.toFixed(1) + '%');
      const m = messages.filter(x => p >= x[0]).pop()[1];
      if (m !== lastMsg) { msg.textContent = m; lastMsg = m; }
    }

    function finish() {
      if (finished) return;
      finished = true;
      shown = 100; render();
      setTimeout(() => {
        loader.classList.add('is-done');
        root.classList.remove('is-loading');
        root.classList.add('is-loaded');
        setTimeout(done, reduce ? 0 : 420);       // los textos suben mientras se abre el telón
        setTimeout(() => loader.classList.add('is-gone'), 1300);
      }, 380);
    }

    function tick(now) {
      if (finished) return;
      const timePct = clamp((now - startAt) / minMs, 0, 1) * 100;
      const ready = pageReady && fontsReady;
      const target = ready ? timePct : Math.min(timePct, 90);
      shown = lerp(shown, target, 0.14);
      if (target - shown < 0.4) shown = target;
      render();
      if (ready && shown >= 99.9) finish(); else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(finish, 8000);   // seguro: nunca bloquea el sitio
  }

  /* ---------- Revelado al entrar al viewport ---------- */
  function startReveal() {
    const els = $$('[data-reveal],[data-words]');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ---------- Contadores ---------- */
  function initCounters() {
    const els = $$('.count');
    const run = el => {
      let target = Number(el.dataset.count) || 0;
      if (el.dataset.since) target = new Date().getFullYear() - Number(el.dataset.since);
      if (reduce) { el.textContent = String(target); return; }
      const dur = 2200;
      const t0 = performance.now();
      const step = now => {
        const k = clamp((now - t0) / dur, 0, 1);
        el.textContent = String(Math.round(target * easeOutExpo(k)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
    }), { threshold: 0.6 });
    els.forEach(el => { if (!reduce) el.textContent = '0'; io.observe(el); });
  }

  /* ---------- Header, menú móvil, progreso ---------- */
  function initHeader() {
    const header = $('#header');
    const sentinel = $('#sentinel');
    if (header && sentinel && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);
    }

    const burger = $('#burger');
    const menu = $('#menu');
    if (burger && menu) {
      const setMenu = open => {
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        document.body.classList.toggle('menu-open', open);
      };
      burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
      $$('a', menu).forEach(a => a.addEventListener('click', () => {
        setMenu(false);
        if (a.dataset.interest) applyInterest(a.dataset.interest);
      }));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
      window.matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
    }

    const progress = $('#progress');
    let lastP = -1;
    tasks.add(() => {
      if (!progress) return;
      const max = Math.max(1, view.docH - view.h);
      const p = clamp(view.y / max, 0, 1);
      if (Math.abs(p - lastP) > 0.0008) { progress.style.setProperty('--p', p.toFixed(4)); lastP = p; }
    });
  }

  /* ---------- Hero: montañas procedurales, puntero y partículas ---------- */
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ridgePath(rand, w, h, base, amp, rough) {
    let pts = [[0, base + (rand() - 0.5) * amp], [w, base + (rand() - 0.5) * amp]];
    let disp = amp;
    for (let s = 0; s < 7; s++) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        next.push(pts[i], [(x1 + x2) / 2, (y1 + y2) / 2 + (rand() - 0.5) * disp]);
      }
      next.push(pts[pts.length - 1]);
      pts = next;
      disp *= rough;
    }
    return 'M0,' + h + ' L' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + ' L' + w + ',' + h + ' Z';
  }

  function initHero() {
    const hero = $('#inicio');
    if (!hero) return;
    const grid = $('#heroGrid');
    const stage = $('#stage');
    const ridgeHost = $('#ridges');

    /* Tres capas de cordillera (Apus) con parallax */
    const layers = [];
    if (ridgeHost) {
      const defs = [
        { seed: 7, base: 170, amp: 210, rough: 0.56, fill: 'rgba(42, 58, 98, .5)', k: 0.35 },
        { seed: 21, base: 250, amp: 170, rough: 0.55, fill: 'rgba(20, 30, 56, .82)', k: 0.65 },
        { seed: 53, base: 338, amp: 100, rough: 0.52, fill: '#070a12', k: 1 },
      ];
      defs.forEach(d => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1440 420');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('class', 'ridge');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ridgePath(mulberry32(d.seed), 1440, 420, d.base, d.amp, d.rough));
        path.setAttribute('fill', d.fill);
        svg.appendChild(path);
        ridgeHost.appendChild(svg);
        layers.push({ el: svg, k: d.k });
      });
    }

    let heroH = hero.offsetHeight;
    resizers.add(() => { heroH = hero.offsetHeight; });

    let lastHp = -1;
    tasks.add(() => {
      if (view.y > heroH * 1.15) return;
      const hp = clamp(view.y / (heroH * 0.75), 0, 1);
      if (grid && Math.abs(hp - lastHp) > 0.002) { grid.style.setProperty('--hp', hp.toFixed(3)); lastHp = hp; }
      if (stage && finePointer) {
        stage.style.setProperty('--px', pointer.sx.toFixed(3));
        stage.style.setProperty('--py', pointer.sy.toFixed(3));
      }
      layers.forEach(l => {
        const x = finePointer && !reduce ? pointer.sx * -22 * l.k : 0;
        const y = reduce ? 0 : view.y * 0.22 * l.k;
        l.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      });
    });

    initParticles(hero);
  }

  function initParticles(hero) {
    const canvas = $('#fx');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], visible = true, running = false, rect = null;

    const spawn = initial => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 12,
      r: Math.random() * 1.7 + 0.4,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.38 + 0.08),
      a: Math.random() * 0.6 + 0.25,
      tw: Math.random() * 6.28,
      ember: Math.random() < 0.38,
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 15000, 34, 112));
      parts = Array.from({ length: count }, () => spawn(true));
      if (reduce) draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      rect = hero.getBoundingClientRect();
      const mx = pointer.cx - rect.left;
      const my = pointer.cy - rect.top;
      const near = pointer.active;

      if (near) {
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 260);
        g.addColorStop(0, 'rgba(234,239,124,.09)');
        g.addColorStop(1, 'rgba(234,239,124,0)');
        ctx.fillStyle = g;
        ctx.fillRect(mx - 260, my - 260, 520, 520);
      }

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!reduce) {
          if (near) {
            const dx = p.x - mx, dy = p.y - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < 22500 && d2 > 1) {
              const d = Math.sqrt(d2);
              const f = (1 - d / 150) * 0.05;
              p.vx += (dx / d) * f - (dy / d) * f * 0.5;   // empuje + giro suave
              p.vy += (dy / d) * f + (dx / d) * f * 0.5;
            }
          }
          p.vx = lerp(p.vx, (Math.random() - 0.5) * 0.12, 0.02) * 0.995;
          p.vy = lerp(p.vy, -0.2, 0.01);
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -12 || p.x < -12 || p.x > w + 12) parts[i] = spawn(false);
        }
        const tw = 0.6 + 0.4 * Math.sin(t * 0.002 + p.tw);
        const alpha = p.a * tw;
        ctx.beginPath();
        ctx.fillStyle = p.ember ? 'rgba(234,239,124,' + alpha.toFixed(3) + ')' : 'rgba(205,220,255,' + (alpha * 0.8).toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }

      /* constelaciones: líneas entre partículas cercanas */
      ctx.lineWidth = 0.6;
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 8100) {
            ctx.strokeStyle = 'rgba(190,205,240,' + ((1 - d2 / 8100) * 0.16).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    const loop = t => {
      if (!running) return;
      if (visible && !document.hidden) draw(t);
      requestAnimationFrame(loop);
    };
    const start = () => { if (!running && !reduce) { running = true; requestAnimationFrame(loop); } };

    resize();
    resizers.add(resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(hero);
    }
    start();
  }

  /* ---------- Parallax suave y escala por scroll ---------- */
  function initScrollEffects() {
    /* Elementos [data-parallax]: se mide el contenedor (sin transform) para no crear bucles */
    const items = $$('[data-parallax]').map(el => ({ el, host: el.parentElement, speed: Number(el.dataset.parallax) || 0.1, v: 0, on: false }));
    if (items.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        items.forEach(i => { if (i.host === en.target) i.on = en.isIntersecting; });
      }), { rootMargin: '20% 0px' });
      new Set(items.map(i => i.host)).forEach(h => io.observe(h));
    } else { items.forEach(i => { i.on = true; }); }

    const scaleEls = $$('[data-scale]').map(el => ({ el, host: el.closest('section'), v: 0.84 }));

    tasks.add(() => {
      if (reduce) return;
      items.forEach(it => {
        if (!it.on) return;
        const r = it.host.getBoundingClientRect();
        const target = (r.top + r.height / 2 - view.h / 2) * it.speed * -1;
        it.v = lerp(it.v, target, 0.1);
        it.el.style.transform = 'translate3d(0,' + it.v.toFixed(1) + 'px,0)';
      });
      scaleEls.forEach(s => {
        const r = s.host.getBoundingClientRect();
        if (r.bottom < -100 || r.top > view.h + 100) return;
        const k = clamp((view.h - r.top) / (view.h * 0.95), 0, 1);
        s.v = lerp(s.v, 0.84 + 0.16 * easeOutExpo(k), 0.12);
        s.el.style.setProperty('--sc', s.v.toFixed(4));
      });
    });
    if (reduce) scaleEls.forEach(s => s.el.style.setProperty('--sc', '1'));
  }

  /* ---------- El maestro: capítulos con imagen sticky ---------- */
  function initMaster() {
    const chapters = $$('.chapter');
    const frame = $('#masterFrame');
    const yearEl = $('#masterYear');
    if (!chapters.length || !frame || !yearEl || !('IntersectionObserver' in window)) return;
    const imgs = $$('img', frame);
    const years = (yearEl.dataset.years || '').split(',');
    let current = -1;

    const set = i => {
      if (i === current) return;
      current = i;
      chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
      imgs.forEach((m, k) => m.classList.toggle('is-active', k === i));
      if (years[i] && yearEl.textContent !== years[i]) {
        if (reduce) { yearEl.textContent = years[i]; return; }
        yearEl.classList.add('is-swap');
        setTimeout(() => { yearEl.textContent = years[i]; yearEl.classList.remove('is-swap'); }, 260);
      }
    };
    set(0);

    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) set(Number(en.target.dataset.chapter));
    }), { rootMargin: '-46% 0px -46% 0px' });
    chapters.forEach(c => io.observe(c));
  }

  /* ---------- Principios: se iluminan al centrarse ---------- */
  function initValues() {
    const rows = $$('.value');
    if (!rows.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => entries.forEach(en => en.target.classList.toggle('is-lit', en.isIntersecting)), { rootMargin: '-46% 0px -46% 0px' });
    rows.forEach(r => io.observe(r));
  }

  /* ---------- Tu camino: recorrido horizontal con scroll vertical ---------- */
  function initPan() {
    const sec = $('#camino');
    const track = $('#panTrack');
    const bar = $('#panBar');
    if (!sec || !track) return;
    const mq = window.matchMedia('(min-width: 1024px) and (min-height: 560px)');
    let live = false, maxX = 0, cur = 0;

    const setup = () => {
      const should = mq.matches && !reduce;
      if (should !== live) {
        live = should;
        root.classList.toggle('has-pan', live);
        if (live) $$('img', track).forEach(img => { img.loading = 'eager'; });
        else { sec.style.removeProperty('--pan-h'); track.style.removeProperty('--tx'); }
      }
      if (!live) return;
      maxX = Math.max(0, track.scrollWidth - view.w);
      sec.style.setProperty('--pan-h', Math.round(maxX + view.h) + 'px');
    };
    setup();
    resizers.add(setup);
    window.addEventListener('load', () => { measure(); });

    tasks.add(() => {
      if (!live) return;
      const r = sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > view.h + 200) return;
      const p = clamp(-r.top / Math.max(1, r.height - view.h), 0, 1);
      cur = lerp(cur, p, 0.1);
      track.style.setProperty('--tx', (-cur * maxX).toFixed(1) + 'px');
      if (bar) bar.style.transform = 'scaleX(' + cur.toFixed(4) + ')';
    });
  }

  /* ---------- Micro-interacciones: magnético, foco de luz, tilt ---------- */
  function initPointerFx() {
    if (!finePointer) return;

    $$('[data-magnetic]').forEach(el => {
      let box = null;
      el.addEventListener('pointerenter', () => { if (!reduce) box = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', e => {
        if (!box || e.pointerType !== 'mouse') return;
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 2);
        el.style.setProperty('--mx', (dx * 0.2).toFixed(1) + 'px');
        el.style.setProperty('--my', (dy * 0.28).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => {
        box = null;
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });

    $$('[data-spot]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });

    if (!reduce) {
      $$('[data-tilt]').forEach(host => {
        const inner = $('.tilt', host) || host;
        host.addEventListener('pointermove', e => {
          const r = host.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          inner.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg');
          inner.style.setProperty('--rx', (-y * 16).toFixed(2) + 'deg');
        });
        host.addEventListener('pointerleave', () => {
          inner.style.setProperty('--ry', '0deg');
          inner.style.setProperty('--rx', '0deg');
        });
      });
    }
  }

  /* ---------- Galería: acordeón + lightbox ---------- */
  function initGallery() {
    const wrap = $('#strips');
    const caption = $('#galleryCaption');
    const dlg = $('#lightbox');
    if (!wrap) return;
    const strips = $$('.strip', wrap);
    const wide = window.matchMedia('(min-width: 900px)');

    const activate = i => {
      strips.forEach((s, k) => s.classList.toggle('is-active', k === i));
      if (caption) caption.textContent = strips[i].dataset.caption || '';
    };
    strips.forEach((s, i) => {
      s.addEventListener('pointerenter', () => { if (wide.matches) activate(i); });
      s.addEventListener('focus', () => activate(i));
      s.addEventListener('click', () => openLightbox(i));
    });

    if (!dlg || typeof dlg.showModal !== 'function') return;
    const img = $('#lbImg');
    const cap = $('#lbCap');
    let idx = 0;

    const show = i => {
      idx = (i + strips.length) % strips.length;
      const src = $('img', strips[idx]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = strips[idx].dataset.caption || '';
      activate(idx);
    };
    function openLightbox(i) {
      show(i);
      dlg.showModal();
      document.body.classList.add('lb-open');
    }
    $('#lbClose').addEventListener('click', () => dlg.close());
    $('#lbPrev').addEventListener('click', () => show(idx - 1));
    $('#lbNext').addEventListener('click', () => show(idx + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => document.body.classList.remove('lb-open'));
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- Preguntas frecuentes ---------- */
  function initFaq() {
    const items = $$('#faqList .qa');
    items.forEach(item => {
      const btn = $('button', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach(o => {
          const isThis = o === item;
          o.classList.toggle('is-open', isThis && open);
          $('button', o).setAttribute('aria-expanded', String(isThis && open));
        });
      });
    });
  }

  /* ---------- Formulario -> WhatsApp ---------- */
  function applyInterest(key) {
    const select = $('#f-interest');
    if (select && CONFIG.interests[key]) {
      select.value = key;
      select.dispatchEvent(new Event('change'));
    }
    setTimeout(() => { const n = $('#f-name'); if (n) n.focus({ preventScroll: true }); }, 900);
  }

  function initForm() {
    const form = $('#form');
    if (!form) return;
    const status = $('#formStatus');
    const submit = $('#submit');
    const rules = {
      name: { input: $('#f-name'), err: $('#e-name'), check: v => v.trim().length >= 2 || 'Escribe tu nombre para que Apu Runa sepa a quién responder.' },
      interest: { input: $('#f-interest'), err: $('#e-interest'), check: v => !!v || 'Elige el camino que más te llama.' },
    };

    const validate = key => {
      const r = rules[key];
      const res = r.check(r.input.value);
      const field = r.input.closest('.field');
      const ok = res === true;
      field.classList.toggle('is-invalid', !ok);
      r.input.setAttribute('aria-invalid', String(!ok));
      r.input.setAttribute('aria-describedby', r.err.id);
      r.err.textContent = ok ? '' : res;
      return ok;
    };

    Object.keys(rules).forEach(key => {
      const r = rules[key];
      r.input.addEventListener('blur', () => validate(key));
      r.input.addEventListener('input', () => { if (r.input.closest('.field').classList.contains('is-invalid')) validate(key); });
      r.input.addEventListener('change', () => { if (r.input.closest('.field').classList.contains('is-invalid')) validate(key); });
    });

    $$('a[data-interest]').forEach(a => a.addEventListener('click', () => applyInterest(a.dataset.interest)));

    form.addEventListener('submit', e => {
      e.preventDefault();
      status.className = 'form__status';
      status.textContent = '';
      const results = Object.keys(rules).map(validate);
      if (results.includes(false)) {
        const first = Object.keys(rules).find(k => rules[k].input.getAttribute('aria-invalid') === 'true');
        rules[first].input.focus();
        status.classList.add('is-error');
        status.textContent = 'Revisa los campos marcados para continuar.';
        return;
      }

      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const place = String(data.get('place') || '').trim();
      const msg = String(data.get('message') || '').trim();
      const interest = CONFIG.interests[String(data.get('interest'))] || CONFIG.interests.conversar;

      let text = 'Hola Apu Runa, soy ' + name + (place ? ' (desde ' + place + ')' : '') + '. Me interesa ' + interest + '.';
      if (msg) text += '\n\n' + msg;
      const url = 'https://wa.me/' + CONFIG.phone + '?text=' + encodeURIComponent(text);

      submit.classList.add('is-loading');
      status.textContent = 'Preparando tu mensaje...';
      setTimeout(() => {
        submit.classList.remove('is-loading');
        const win = window.open(url, '_blank', 'noopener');
        status.textContent = '';
        status.append(document.createTextNode(win ? 'Listo, se abrió WhatsApp con tu mensaje. ' : 'Tu mensaje está listo. '));
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Abrir WhatsApp';
        status.append(link);
      }, 800);
    });
  }

  /* ---------- Botón flotante de WhatsApp: aviso discreto ---------- */
  function initWhatsAppHint() {
    const wa = $('#wa');
    if (!wa || reduce) return;
    setTimeout(() => {
      wa.classList.add('is-hint');
      setTimeout(() => wa.classList.remove('is-hint'), 4800);
    }, 9000);
  }

  /* ---------- Arranque ---------- */
  function init() {
    $$('[data-words]').forEach(splitWords);
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());

    measure();
    initHeader();
    initHero();
    initScrollEffects();
    initMaster();
    initValues();
    initPan();
    initPointerFx();
    initGallery();
    initFaq();
    initForm();
    requestAnimationFrame(frame);

    initLoader(() => {
      startReveal();
      initCounters();
      initWhatsAppHint();
      measure();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
