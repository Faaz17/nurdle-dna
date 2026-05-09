(function () {
  'use strict';

  // Inject the transition overlay so every page has it
  document.body.insertAdjacentHTML('afterbegin',
    '<div class="ag-page-transition" aria-hidden="true">' +
      '<svg viewBox="0 0 100 110" preserveAspectRatio="none">' +
        '<path class="ag-wave-foam" d="M0,8 C18,0 36,16 50,8 C64,0 80,18 100,6 V110 H0 Z" />' +
        '<path class="ag-wave-fill" d="M0,12 C20,2 36,22 50,12 C64,2 80,22 100,10 V110 H0 Z" />' +
      '</svg>' +
      '<span class="ag-transition-loader">Loading</span>' +
    '</div>'
  );

  const overlay = document.querySelector('.ag-page-transition');

  // ── Leave animation: any internal .html link becomes a transition
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || !href.match(/\.html(\?.*)?(#.*)?$/i)) return;
    if (link.target && link.target !== '' && link.target !== '_self') return;

    let url;
    try { url = new URL(link.href, window.location.href); }
    catch (_) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;  // same page

    e.preventDefault();
    sessionStorage.setItem('ag-transition', '1');
    overlay.classList.add('is-active', 'is-leaving');
    setTimeout(() => { window.location.href = link.href; }, 850);
  });

  // ── Arrive animation: if we got here via a transition, replay the wave receding
  function playArriveAnim() {
    if (sessionStorage.getItem('ag-transition') !== '1') return;
    sessionStorage.removeItem('ag-transition');
    // start "covered"
    overlay.classList.add('is-active', 'is-leaving');
    // double-rAF so the leaving styles apply, then transition to arriving
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.remove('is-leaving');
        overlay.classList.add('is-arriving');
        setTimeout(() => {
          overlay.classList.remove('is-active', 'is-arriving');
        }, 1000);
      });
    });
  }

  if (document.readyState === 'complete') {
    playArriveAnim();
  } else {
    window.addEventListener('load', playArriveAnim);
  }

  // ── Browser back/forward (BFCache restore)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      // page came from BFCache — make sure overlay is hidden
      overlay.classList.remove('is-active', 'is-leaving', 'is-arriving');
    }
  });
})();
