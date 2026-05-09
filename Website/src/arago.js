(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. Scroll-triggered fade-up via IntersectionObserver
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
    { threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
  );

  document
    .querySelectorAll('[data-anim], [data-anim-stagger]')
    .forEach((el) => {
      // For stagger containers, set --i index on each child
      if (el.hasAttribute('data-anim-stagger')) {
        Array.from(el.children).forEach((child, idx) => {
          child.style.setProperty('--i', idx);
        });
      }
      fadeObserver.observe(el);
    });

  // ──────────────────────────────────────────────
  // 2. Hero chip mouse parallax (smoothed via lerp)
  // ──────────────────────────────────────────────

  const chip = document.querySelector('.ag-chip');
  let targetMx = 0;
  let targetMy = 0;
  let currentMx = 0;
  let currentMy = 0;

  document.addEventListener('mousemove', (e) => {
    targetMx = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function tickChip() {
    currentMx += (targetMx - currentMx) * 0.06;
    currentMy += (targetMy - currentMy) * 0.06;
    if (chip) {
      chip.style.setProperty('--mx', currentMx.toFixed(3));
      chip.style.setProperty('--my', currentMy.toFixed(3));
    }
    requestAnimationFrame(tickChip);
  }
  if (chip) tickChip();

  // ──────────────────────────────────────────────
  // 3. Scroll progress bar (top of page)
  // ──────────────────────────────────────────────

  const progress = document.createElement('div');
  progress.className = 'ag-progress';
  document.body.appendChild(progress);

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ──────────────────────────────────────────────
  // 4. Stat counter animation (count up when in view)
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
    .querySelectorAll('.ag-stat-num[data-count]')
    .forEach((el) => countObserver.observe(el));

  // ──────────────────────────────────────────────
  // 5. Subtle parallax drift on hero copy as you scroll
  // ──────────────────────────────────────────────

  const heroCopy = document.querySelector('.ag-hero-copy');
  const heroVisual = document.querySelector('.ag-hero-visual');

  function applyHeroParallax() {
    const scrolled = window.scrollY;
    if (heroCopy && scrolled < window.innerHeight) {
      heroCopy.style.transform = 'translateY(' + scrolled * 0.18 + 'px)';
      heroCopy.style.opacity = String(1 - scrolled / (window.innerHeight * 0.9));
    }
    if (heroVisual && scrolled < window.innerHeight) {
      heroVisual.style.transform = 'translateY(' + scrolled * -0.08 + 'px)';
    }
  }
  window.addEventListener('scroll', applyHeroParallax, { passive: true });

  // ──────────────────────────────────────────────
  // 6. Smooth in-page anchor scrolling — already by CSS scroll-behavior,
  //    but we set focus on landing for accessibility
  // ──────────────────────────────────────────────

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
