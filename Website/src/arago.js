(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. Lenis smooth scroll (loads from CDN, falls back to native if blocked)
  // ──────────────────────────────────────────────

  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 1.6,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.lenis = lenis;
  }

  // Attempt to load Lenis from CDN
  const lenisScript = document.createElement('script');
  lenisScript.src = 'https://unpkg.com/lenis@1.1.13/dist/lenis.min.js';
  lenisScript.onload = initLenis;
  document.head.appendChild(lenisScript);

  // ──────────────────────────────────────────────
  // 2. Page load: reveal nav + WebGL background + hero scroll cue
  // ──────────────────────────────────────────────

  window.addEventListener('load', () => {
    document.querySelector('.ag-nav')?.classList.add('is-visible');
    document.querySelector('.ag-hero')?.classList.add('is-visible');
  });

  // ──────────────────────────────────────────────
  // 3. Scroll-triggered fade-up (IntersectionObserver)
  // ──────────────────────────────────────────────

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -80px 0px' }
  );

  document
    .querySelectorAll('[data-anim], [data-anim-stagger]')
    .forEach((el) => {
      if (el.hasAttribute('data-anim-stagger')) {
        Array.from(el.children).forEach((child, idx) => {
          child.style.setProperty('--i', idx);
        });
      }
      fadeObserver.observe(el);
    });

  // ──────────────────────────────────────────────
  // 4. Scroll progress bar + hide hero scroll cue when scrolling
  // ──────────────────────────────────────────────

  const progress = document.createElement('div');
  progress.className = 'ag-progress';
  document.body.appendChild(progress);

  const hero = document.querySelector('.ag-hero');

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = pct + '%';

    if (hero) {
      const scrolled = window.scrollY;
      hero.classList.toggle('is-scroll-label-hidden', scrolled > 80);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ──────────────────────────────────────────────
  // 5. Stat counter (count up when in view) — kept from previous version
  // ──────────────────────────────────────────────

  function animateCount(el, target, duration) {
    duration = duration || 1500;
    const start = performance.now();
    const isFloat = target % 1 !== 0;
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      el.textContent = isFloat ? value.toFixed(1) : Math.round(value);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          if (!isNaN(target)) animateCount(el, target, 1500);
          countObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.6 }
  );
  document
    .querySelectorAll('[data-count]')
    .forEach((el) => countObserver.observe(el));

  // ──────────────────────────────────────────────
  // 6. Smooth in-page anchor scrolling
  // ──────────────────────────────────────────────

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (window.lenis) {
        window.lenis.scrollTo(target, { offset: -100 });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ──────────────────────────────────────────────
  // 7. Active nav link tracking
  // ──────────────────────────────────────────────

  const navLinks = document.querySelectorAll('.ag-header-link[href^="#"]');
  const sections = Array.from(navLinks)
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((l) => l.classList.remove('active'));
          const link = document.querySelector('.ag-header-link[href="#' + entry.target.id + '"]');
          if (link) link.classList.add('active');
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach((s) => activeObserver.observe(s));

  // ──────────────────────────────────────────────
  // 8. Cursor-driven parallax on hero copy + chip rotation
  // ──────────────────────────────────────────────

  const heroCopy = document.querySelector('.ag-hero-edito');
  const chip = document.querySelector('.ag-chip');
  let tx = 0, ty = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function tickHero() {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    if (window.scrollY < window.innerHeight) {
      if (heroCopy) {
        heroCopy.style.transform =
          'translate(' + (cx * 5).toFixed(2) + 'px,' + (cy * 4).toFixed(2) + 'px)';
      }
      if (chip) {
        chip.style.setProperty('--mx', cx.toFixed(3));
        chip.style.setProperty('--my', cy.toFixed(3));
      }
    }
    requestAnimationFrame(tickHero);
  }
  tickHero();
})();
