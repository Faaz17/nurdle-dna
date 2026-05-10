(function () {
  'use strict';

  // ─── DOM refs ────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const dom = {
    netLed:      $('netLed'),
    netLabel:    $('netLabel'),
    loading:     $('evLoading'),
    empty:       $('evEmpty'),
    table:       $('evTable'),
    body:        $('evBody'),
    btnExport:   $('btnExport'),
    btnRefresh:  $('btnRefresh'),
    searchInput: $('searchInput'),
    sortSelect:  $('sortSelect'),
    statTotal:       $('statTotal'),
    statLastAlarm:   $('statLastAlarm'),
    statMaxDensity:  $('statMaxDensity'),
    statTotalGrams:  $('statTotalGrams'),
  };

  // ─── State ───────────────────────────────────────────────────
  let allEvents   = [];   // raw from Firebase
  let activeFilter = 'all';

  // ─── Helpers ─────────────────────────────────────────────────
  function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function densityBar(val) {
    const pct = Math.min(100, Math.max(0, Number(val) || 0));
    const cls  = pct >= 70 ? 'crit' : pct >= 30 ? 'warn' : 'ok';
    return `<span class="ev-density-wrap">
      <span class="ev-density-bar ev-density-${cls}" style="width:${pct}%"></span>
      <span class="ev-density-num">${pct}</span>
    </span>`;
  }

  function typeBadge(type) {
    const cls = type === 'ALARM' ? 'crit' : type === 'WARN' ? 'warn' : 'ok';
    return `<span class="ev-badge ev-badge-${cls}">${type || 'EVENT'}</span>`;
  }

  // ─── Render ──────────────────────────────────────────────────
  function render() {
    const query  = (dom.searchInput.value || '').toLowerCase();
    const sort   = dom.sortSelect.value;

    let rows = allEvents.filter((e) => {
      if (activeFilter !== 'all' && e.type !== activeFilter) return false;
      if (query) {
        const haystack = [e.type, e.fsm_state, e.bay_id, e.device_id].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    // Sort
    rows = rows.slice().sort((a, b) => {
      if (sort === 'oldest')  return new Date(a.timestamp) - new Date(b.timestamp);
      if (sort === 'density') return (b.density_index || 0) - (a.density_index || 0);
      if (sort === 'mass')    return (b.load_g || 0) - (a.load_g || 0);
      return new Date(b.timestamp) - new Date(a.timestamp); // newest
    });

    dom.loading.hidden = true;

    if (rows.length === 0) {
      dom.table.hidden = true;
      dom.empty.hidden = false;
      return;
    }

    dom.empty.hidden = true;
    dom.table.hidden = false;

    dom.body.innerHTML = rows.map((e) => `
      <tr class="ev-row ev-row-${(e.type || '').toLowerCase()}">
        <td class="ev-td ev-td-time">${fmtTime(e.timestamp)}</td>
        <td class="ev-td">${typeBadge(e.type)}</td>
        <td class="ev-td ev-td-mono">${e.fsm_state || '—'}</td>
        <td class="ev-td">${e.bay_id || '—'}</td>
        <td class="ev-td">${densityBar(e.density_index)}</td>
        <td class="ev-td ev-td-num">${e.gas_ppm ?? '—'}</td>
        <td class="ev-td ev-td-num">${e.load_g != null ? Number(e.load_g).toFixed(1) : '—'}</td>
        <td class="ev-td ev-td-num">${e.ai_count ?? '—'}</td>
      </tr>
    `).join('');
  }

  // ─── Stats ───────────────────────────────────────────────────
  function updateStats() {
    if (!allEvents.length) return;

    dom.statTotal.textContent = allEvents.length;

    const sorted = allEvents.slice().sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    dom.statLastAlarm.textContent = fmtTime(sorted[0]?.timestamp).split(',')[0];

    const maxDensity = Math.max(...allEvents.map((e) => Number(e.density_index) || 0));
    dom.statMaxDensity.textContent = maxDensity;

    const totalGrams = allEvents.reduce((s, e) => s + (Number(e.load_g) || 0), 0);
    dom.statTotalGrams.textContent = totalGrams.toFixed(1) + ' g';

    dom.btnExport.disabled = false;
  }

  // ─── CSV export ──────────────────────────────────────────────
  function exportCSV() {
    const headers = ['Timestamp', 'Type', 'FSM State', 'Bay', 'Device',
                     'Density Index', 'Gas ppm', 'Mass g', 'AI Count'];
    const rows = allEvents.map((e) => [
      e.timestamp, e.type, e.fsm_state, e.bay_id, e.device_id,
      e.density_index, e.gas_ppm, e.load_g, e.ai_count,
    ].map((v) => `"${v ?? ''}"`).join(','));

    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `nurdle-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Filter chips ────────────────────────────────────────────
  document.querySelectorAll('.ev-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ev-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  dom.searchInput.addEventListener('input', render);
  dom.sortSelect.addEventListener('change', render);
  dom.btnExport.addEventListener('click', exportCSV);

  // ─── Firebase ────────────────────────────────────────────────
  (function initFirebase() {
    const cfg = window.NURDLE_FIREBASE;

    if (!cfg || !window.firebase || cfg.apiKey === 'REPLACE_ME') {
      dom.loading.innerHTML = `
        <span style="color:var(--amber)">⚠</span>
        Firebase not configured — fill in <code>firebase-config.js</code> to load live events.`;
      dom.netLabel.textContent = 'OFFLINE';
      return;
    }

    let app;
    try {
      app = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(cfg);
    } catch (e) {
      dom.loading.textContent = 'Firebase init failed — ' + e.message;
      return;
    }

    const db     = firebase.database(app);
    const evtRef = db.ref('events');

    // Connection indicator
    db.ref('.info/connected').on('value', (snap) => {
      const live = !!snap.val();
      dom.netLed.classList.toggle('is-live', live);
      dom.netLabel.textContent = live ? 'LIVE' : 'RECONNECTING';
    });

    // Load all events once, then listen for new ones
    evtRef.orderByChild('timestamp').on('value', (snap) => {
      allEvents = [];
      snap.forEach((child) => {
        allEvents.push({ _key: child.key, ...child.val() });
      });
      updateStats();
      render();
    });

    // Refresh button re-triggers the on('value') listener (already live, just re-render)
    dom.btnRefresh.addEventListener('click', () => {
      dom.loading.hidden = false;
      dom.table.hidden   = true;
      dom.empty.hidden   = true;
      evtRef.orderByChild('timestamp').once('value', (snap) => {
        allEvents = [];
        snap.forEach((child) => allEvents.push({ _key: child.key, ...child.val() }));
        updateStats();
        render();
      });
    });
  })();
})();
