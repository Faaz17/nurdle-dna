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
  // 8. Cursor-driven parallax on hero copy
  // ──────────────────────────────────────────────

  const heroCopy = document.querySelector('.ag-hero-edito');
  let tx = 0, ty = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function tickHero() {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    if (heroCopy && window.scrollY < window.innerHeight) {
      heroCopy.style.transform =
        'translate(' + (cx * 5).toFixed(2) + 'px,' + (cy * 4).toFixed(2) + 'px)';
    }
    requestAnimationFrame(tickHero);
  }
  tickHero();

  // ──────────────────────────────────────────────
  // 9. Water+pellet field (Canvas2D animator)
  // ──────────────────────────────────────────────

  class WaterField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = 0; this.h = 0;
      this.t = 0;
      this.mouse = { x: -9999, y: -9999, active: false };
      this.pellets = [];
      this.ripples = [];
      this.nextRipple = 4 + Math.random() * 2;
      this.running = false;
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      this.resize();
      window.addEventListener('resize', this.resize);
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - r.left);
        this.mouse.y = (e.clientY - r.top);
        this.mouse.active = true;
      });
      canvas.addEventListener('mouseleave', () => { this.mouse.active = false; });
      this.spawnPellets(50);
      this.start();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width  = Math.max(1, Math.round(this.w * this.dpr));
      this.canvas.height = Math.max(1, Math.round(this.h * this.dpr));
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    spawnPellets(n) {
      for (let i = 0; i < n; i += 1) this.pellets.push(this.makePellet(true));
    }

    makePellet(initial) {
      return {
        x: initial ? Math.random() * this.w : -10,
        y: Math.random() * this.h,
        size: 2 + Math.random() * 5,
        opacity: 0.3 + Math.random() * 0.65,
        speed: 0.4 + Math.random() * 1.0,
        bobAmp: 4 + Math.random() * 8,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.4 + Math.random() * 0.7,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.4,
        vx: 0, vy: 0,
      };
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastT = performance.now();
      requestAnimationFrame(this.tick);
    }

    stop() { this.running = false; }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      this.t += dt;
      this.draw(dt);
      requestAnimationFrame(this.tick);
    }

    draw(dt) {
      const ctx = this.ctx;
      const w = this.w, h = this.h, t = this.t;

      // base background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0,    '#031018');
      grad.addColorStop(0.5,  '#062430');
      grad.addColorStop(1,    '#021018');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 3 stacked sine-wave flow layers
      const layers = [
        { color: 'rgba(46, 190, 202, 0.10)', amp: h * 0.06, freq: 0.012, speed: 0.5, yBase: h * 0.32 },
        { color: 'rgba(95, 214, 255, 0.08)', amp: h * 0.09, freq: 0.009, speed: 0.7, yBase: h * 0.55 },
        { color: 'rgba(67, 224, 138, 0.06)', amp: h * 0.07, freq: 0.014, speed: 0.4, yBase: h * 0.76 },
      ];
      for (const L of layers) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = L.yBase + Math.sin(x * L.freq + t * L.speed) * L.amp
                    + Math.sin(x * L.freq * 2.3 + t * L.speed * 1.6) * L.amp * 0.35;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = L.color;
        ctx.fill();
      }

      // pellet particles
      for (let i = 0; i < this.pellets.length; i += 1) {
        const p = this.pellets[i];
        // base motion: drift right
        p.x += (p.speed * 30) * dt + p.vx;
        p.y += p.vy + Math.sin(t * p.bobSpeed + p.bobPhase) * p.bobAmp * dt;
        p.rot += p.rotSpeed * dt;

        // velocity damping
        p.vx *= 0.92;
        p.vy *= 0.92;

        // mouse repulsion
        if (this.mouse.active) {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const d2 = dx * dx + dy * dy;
          const R = 120;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const force = (1 - d / R) * 220 * dt;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
        }

        // respawn off-right
        if (p.x > w + 20) {
          p.x = -10;
          p.y = Math.random() * h;
        }
        // wrap vertically too if pushed off
        if (p.y < -20) p.y = h + 10;
        if (p.y > h + 20) p.y = -10;

        // draw pellet — soft white ellipse with subtle glow
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.5);
        halo.addColorStop(0, 'rgba(255, 255, 255, ' + (p.opacity * 0.35) + ')');
        halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(248, 250, 252, ' + p.opacity + ')';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // periodic cyan ripples
      this.nextRipple -= dt;
      if (this.nextRipple <= 0) {
        this.ripples.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0,
          life: 1,
        });
        this.nextRipple = 3 + Math.random() * 3;
      }
      for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
        const R = this.ripples[i];
        R.r += 90 * dt;
        R.life -= 0.55 * dt;
        if (R.life <= 0) {
          this.ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = 'rgba(95, 214, 255, ' + (R.life * 0.55) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(R.x, R.y, R.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // mouse-following soft glow
      if (this.mouse.active) {
        const mg = ctx.createRadialGradient(this.mouse.x, this.mouse.y, 0, this.mouse.x, this.mouse.y, 140);
        mg.addColorStop(0, 'rgba(95, 214, 255, 0.18)');
        mg.addColorStop(1, 'rgba(95, 214, 255, 0)');
        ctx.fillStyle = mg;
        ctx.fillRect(0, 0, w, h);
      }

      // edge vignette
      const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w, h) * 0.4, w/2, h/2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  const waterCanvas = document.getElementById('waterField');
  if (waterCanvas) {
    const field = new WaterField(waterCanvas);
    // pause when offscreen
    const visObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) field.start();
          else field.stop();
        });
      },
      { threshold: 0 }
    );
    visObs.observe(waterCanvas);
  }

  // ──────────────────────────────────────────────
  // 10. Hardware-card cursor-tracked water-drop ripple
  // ──────────────────────────────────────────────

  document.querySelectorAll('.hw-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--rx', ((e.clientX - r.left) / r.width  * 100) + '%');
      card.style.setProperty('--ry', ((e.clientY - r.top)  / r.height * 100) + '%');
    });
  });
})();
