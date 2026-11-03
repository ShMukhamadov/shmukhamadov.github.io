/* Shokhruz Mukhamadov · portfolio interactions (no dependencies) */
(() => {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canVT = typeof d.startViewTransition === 'function' && !reduce;
  const svg = (p) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  // View transitions reject their promises when skipped; that is expected, so ignore it.
  const quiet = (vt) => { ['ready', 'finished', 'updateCallbackDone'].forEach((k) => vt[k] && vt[k].catch(() => {})); return vt; };
  // Run a DOM update inside a view transition when possible. If the browser stalls or
  // skips the transition (e.g. a background tab), the update still happens.
  const runVT = (apply, onDone) => {
    if (!canVT || d.visibilityState !== 'visible') { apply(); if (onDone) onDone(); return; }
    let ran = false;
    const once = () => { if (!ran) { ran = true; apply(); } };
    const vt = quiet(d.startViewTransition(once));
    vt.finished.catch(() => {}).then(() => onDone && onDone());
    setTimeout(() => { if (!ran) { try { vt.skipTransition(); } catch (e) {} once(); if (onDone) onDone(); } }, 450);
  };
  const ICON = {
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    prev: svg('<path d="m15 5-7 7 7 7"/>'),
    next: svg('<path d="m9 5 7 7-7 7"/>'),
  };

  /* ---------- Theme ---------- */
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const theme = () => root.getAttribute('data-theme') || (sysDark.matches ? 'dark' : 'light');
  const metaTheme = () => {
    const explicit = root.getAttribute('data-theme');
    d.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (!m.dataset.orig) m.dataset.orig = m.content;
      m.content = explicit ? (explicit === 'dark' ? '#050816' : '#f4f7fd') : m.dataset.orig;
    });
  };
  metaTheme();
  d.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const sync = () => btn.setAttribute('aria-label', theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    sync();
    if (sysDark.addEventListener) sysDark.addEventListener('change', sync);
    btn.addEventListener('click', () => {
      const next = theme() === 'dark' ? 'light' : 'dark';
      const apply = () => {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        sync();
        metaTheme();
      };
      runVT(apply);
    });
  });

  /* ---------- Navigation ---------- */
  const nav = d.querySelector('[data-nav]');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = d.querySelector('[data-menu-toggle]');
  const menu = d.querySelector('[data-mobile-menu]');
  const setMenu = (open) => {
    if (!menu) return;
    menu.hidden = !open;
    nav.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('lb-open', open);
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
    matchMedia('(min-width: 961px)').addEventListener('change', (m) => m.matches && setMenu(false));
  }

  // Highlight the link for the section in view; clear it in sections without a link.
  const spy = (links, attr, margin, targets) => {
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map((a) => [a.getAttribute(attr), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        const l = map.get(en.target.id);
        if (l) l.classList.add('is-active');
      });
    }, { rootMargin: margin });
    (targets || [...map.keys()].map((id) => d.getElementById(id))).forEach((s) => s && io.observe(s));
  };
  if (d.body.classList.contains('is-home')) spy([...d.querySelectorAll('[data-nav-link]')], 'data-nav-link', '-30% 0px -60% 0px', [...d.querySelectorAll('main > section[id]')]);
  spy([...d.querySelectorAll('[data-toc-link]')], 'data-toc-link', '-25% 0px -65% 0px');

  /* ---------- Reveal on scroll ---------- */
  const reveals = d.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach((el) => ro.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Counters ---------- */
  const counters = d.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    const fmt = (n, dec, group) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: group });
    const start = (el) => {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const final = el.dataset.final;
      const group = final.includes(',');
      const t0 = performance.now();
      const dur = 1700;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = p < 1 ? pre + fmt(target * eased, dec, group) + suf : final;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { co.unobserve(en.target); start(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach((el) => {
      el.dataset.final = el.textContent;
      el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || '');
      co.observe(el);
    });
  }

  /* ---------- Work filters ---------- */
  const grid = d.querySelector('[data-work-grid]');
  const filterBtns = [...d.querySelectorAll('[data-filter]')];
  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    const cards = [...grid.querySelectorAll('.work-card')];
    const apply = () => {
      filterBtns.forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      grid.classList.toggle('is-filtered', f !== 'all');
      cards.forEach((c) => { c.hidden = f !== 'all' && !c.dataset.cats.split(' ').includes(f); c.classList.add('is-in'); });
    };
    if (canVT) cards.forEach((c, i) => { c.style.viewTransitionName = `wc-${i}`; });
    runVT(apply, () => cards.forEach((c) => { c.style.viewTransitionName = ''; }));
  }));

  /* ---------- YouTube (loads only when clicked) ---------- */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-yt]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    const frame = d.createElement('div');
    frame.className = 'video__frame is-playing';
    const iframe = d.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(a.dataset.yt)}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = a.dataset.title || 'YouTube video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.appendChild(iframe);
    a.replaceWith(frame);
    iframe.focus();
  });

  /* ---------- Lightbox ---------- */
  let box, img, cap, count, btnPrev, btnNext, btnClose, items = [], idx = 0, lastFocus = null;
  const build = () => {
    box = d.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML = `<div class="lightbox__top"><span class="lightbox__count" aria-live="polite"></span><button class="lightbox__btn lightbox__close" type="button" aria-label="Close">${ICON.close}</button></div>
      <div class="lightbox__stage"><img class="lightbox__img" alt="" decoding="async"><button class="lightbox__btn lightbox__prev" type="button" aria-label="Previous photo">${ICON.prev}</button><button class="lightbox__btn lightbox__next" type="button" aria-label="Next photo">${ICON.next}</button></div>
      <p class="lightbox__caption"></p>`;
    d.body.appendChild(box);
    img = box.querySelector('.lightbox__img');
    cap = box.querySelector('.lightbox__caption');
    count = box.querySelector('.lightbox__count');
    btnPrev = box.querySelector('.lightbox__prev');
    btnNext = box.querySelector('.lightbox__next');
    btnClose = box.querySelector('.lightbox__close');
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => go(-1));
    btnNext.addEventListener('click', () => go(1));
    box.querySelector('.lightbox__stage').addEventListener('click', (e) => { if (e.target.classList.contains('lightbox__stage')) close(); });
    img.addEventListener('load', () => img.classList.remove('is-loading'));
    let sx = null, sy = null;
    box.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    box.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
      sx = sy = null;
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const f = [btnClose, btnPrev, btnNext].filter((b) => !b.hidden);
        const i = f.indexOf(d.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  };
  const show = (i) => {
    idx = (i + items.length) % items.length;
    const a = items[idx];
    img.classList.add('is-loading');
    img.removeAttribute('srcset');
    img.sizes = '100vw';
    if (a.dataset.srcset) img.srcset = a.dataset.srcset;
    img.src = a.href;
    img.alt = a.dataset.caption || '';
    img.width = +a.dataset.w || 0;
    img.height = +a.dataset.h || 0;
    cap.textContent = a.dataset.caption || '';
    count.textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : '';
    btnPrev.hidden = btnNext.hidden = items.length < 2;
    [1, -1].forEach((o) => {
      const n = items[(idx + o + items.length) % items.length];
      if (n && n !== a) { const p = new Image(); p.sizes = '100vw'; if (n.dataset.srcset) p.srcset = n.dataset.srcset; p.src = n.href; }
    });
  };
  const go = (dir) => show(idx + dir);
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  };
  function open(link) {
    if (!box) build();
    const group = link.dataset.group || 'page';
    items = [...d.querySelectorAll(`a.lb[data-group="${CSS.escape(group)}"]`)];
    lastFocus = link;
    box.hidden = false;
    root.classList.add('lb-open');
    show(items.indexOf(link));
    requestAnimationFrame(() => box.classList.add('is-open'));
    d.addEventListener('keydown', onKey);
    btnClose.focus();
  }
  function close() {
    box.classList.remove('is-open');
    d.removeEventListener('keydown', onKey);
    root.classList.remove('lb-open');
    setTimeout(() => { box.hidden = true; img.removeAttribute('src'); img.removeAttribute('srcset'); }, reduce ? 0 : 260);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a.lb');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    open(a);
  });

  /* ---------- Muted demo clips: play only while visible ---------- */
  const clips = d.querySelectorAll('video[data-autoplay]');
  if (clips.length && 'IntersectionObserver' in window && !reduce) {
    const vo = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) { v.preload = 'auto'; const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
      });
    }, { threshold: 0.35 });
    clips.forEach((v) => vo.observe(v));
  }

  /* ---------- Misc ---------- */
  d.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
