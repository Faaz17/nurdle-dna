(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // State model — mirrors the Arduino + Jetson FSM
  // ────────────────────────────────────────────────────────────

  const STATE = {
    S0: { name: 'INIT',    valve: 'Open',   pump: 'Running', uv: 'Off', buzzer: 'Off', lcd: 'Booting…',     led: 'All ON', pill: 'is-init' },
    S1: { name: 'SysOk',   valve: 'Open',   pump: 'Running', uv: 'Off', buzzer: 'Off', lcd: 'Sys OK',       led: 'Green',  pill: '' },
    S2: { name: 'Causn',   valve: 'Open',   pump: 'Running', uv: 'On',  buzzer: 'Off', lcd: 'Causn',        led: 'Yellow', pill: 'is-warn' },
    S3: { name: 'ALRM',    valve: 'Closed', pump: 'Off',     uv: 'On',  buzzer: 'On',  lcd: 'ALRM-LATCH',   led: 'Red',    pill: 'is-crit' },
    S4: { name: 'RSTIN',   valve: 'Open',   pump: 'Running', uv: 'Off', buzzer: 'Off', lcd: 'Reset…',       led: 'All ON', pill: 'is-init' },
  };

  const sim = {
    state: 'S0',
    autoMode: true,
    alarmLatched: false,
    liveMode: false,               // true once Firebase pushes real device data
    lastFirebaseUpdate: 0,         // performance.now() timestamp of latest Firebase msg
    boot: 0,                       // 0 → 1 over a few seconds
    spillImpulse: 0,               // 0 → 1 when triggered, decays
    gasImpulse: 0,
    turbidImpulse: 0,
    sensors: { ldr: 312, gas: 38, pellet: 0, mass: 0 },
    history: { ldr: [], gas: [], pellet: [], mass: [] },
    historyMax: 80,
    pelletAccum: 0,
    massCaptured: 0,
    autoCycle: 0,                  // seconds since last auto event
    nextAutoEvent: 12 + Math.random() * 8,
    bootStart: performance.now(),
    lastSync: 0,
  };

  // Set once Firebase is live — lets doReset() push a remote reset command
  // to the device. Null in simulation mode.
  let fbCommandRef = null;

  // ────────────────────────────────────────────────────────────
  // DOM
  // ────────────────────────────────────────────────────────────

  const $ = (id) => document.getElementById(id);

  const dom = {
    fsmStates: document.querySelectorAll('.fsm-state'),
    fsmPill:   $('fsmPill'),
    netLed:    $('netLed'),
    netLabel:  $('netLabel'),

    sLdr: $('sLdr'), sGas: $('sGas'), sPellet: $('sPellet'), sMass: $('sMass'),
    gLdr: $('gLdr'), gGas: $('gGas'), gPellet: $('gPellet'), gMass: $('gMass'),

    btnSpill:  $('btnSpill'),
    btnGas:    $('btnGas'),
    btnTurbid: $('btnTurbid'),
    btnReset:  $('btnReset'),
    autoMode:  $('autoMode'),
    btnClearLog: $('btnClearLog'),

    dValve: $('dValve'), dPump: $('dPump'), dUv: $('dUv'),
    dBuzzer: $('dBuzzer'), dLcd: $('dLcd'), dLed: $('dLed'),

    tileValve:  $('tileValve'),  tilePump: $('tilePump'),  tileUv:    $('tileUv'),
    tileBuzzer: $('tileBuzzer'), tileLcd:  $('tileLcd'),   tileLed:   $('tileLed'),

    eventList: $('eventList'),
    uptime:    $('uptime'),
    lastSync:  $('lastSync'),
  };

  // ────────────────────────────────────────────────────────────
  // Event log
  // ────────────────────────────────────────────────────────────

  const events = [];
  const MAX_EVENTS = 60;

  function logEvent(tag, msg) {
    const time = nowHHMMSS();
    events.unshift({ time, tag, msg });
    if (events.length > MAX_EVENTS) events.pop();
    renderEvents();
  }

  function renderEvents() {
    if (!dom.eventList) return;
    dom.eventList.innerHTML = events.map((e, i) => `
      <li class="event-item${i === 0 ? ' is-new' : ''}">
        <span class="event-time">${e.time}</span>
        <span class="event-tag tag-${e.tag}">${e.tag.toUpperCase()}</span>
        <span class="event-msg">${e.msg}</span>
      </li>
    `).join('');
  }

  function nowHHMMSS() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, '0')).join(':');
  }

  // ────────────────────────────────────────────────────────────
  // FSM transitions
  // ────────────────────────────────────────────────────────────

  function setState(next, reason) {
    if (sim.state === next) return;
    const prev = sim.state;
    sim.state = next;
    renderState();
    logEvent(tagFor(next), `${prev} → ${next} (${reason})`);
  }

  function tagFor(state) {
    if (state === 'S3') return 'crit';
    if (state === 'S2') return 'warn';
    if (state === 'S0' || state === 'S4') return 'info';
    return 'ok';
  }

  function renderState() {
    const cfg = STATE[sim.state];
    dom.fsmStates.forEach((el) => {
      el.classList.toggle('is-active', el.dataset.state === sim.state);
    });
    dom.fsmPill.textContent = `${sim.state} · ${cfg.name}`;
    dom.fsmPill.className = `state-pill ${cfg.pill}`;

    setTile(dom.tileValve,  dom.dValve,  cfg.valve,  cfg.valve  === 'Closed' ? 'crit' : 'on');
    setTile(dom.tilePump,   dom.dPump,   cfg.pump,   cfg.pump   === 'Off'    ? 'crit' : 'on');
    setTile(dom.tileUv,     dom.dUv,     cfg.uv,     cfg.uv     === 'On'     ? 'warn' : '');
    setTile(dom.tileBuzzer, dom.dBuzzer, cfg.buzzer, cfg.buzzer === 'On'     ? 'crit' : '');
    setTile(dom.tileLcd,    dom.dLcd,    `"${cfg.lcd}"`, sim.state === 'S3' ? 'crit' : sim.state === 'S2' ? 'warn' : 'on');
    setTile(dom.tileLed,    dom.dLed,    cfg.led, sim.state === 'S3' ? 'crit' : sim.state === 'S2' ? 'warn' : 'on');
  }

  function setTile(tile, valueEl, value, cls) {
    valueEl.textContent = value;
    tile.classList.remove('is-on', 'is-warn', 'is-crit');
    if (cls) tile.classList.add(`is-${cls}`);
  }

  // ────────────────────────────────────────────────────────────
  // Sensor simulation tick (5 Hz)
  // ────────────────────────────────────────────────────────────

  function tick(dt) {
    // Boot ramp
    if (sim.boot < 1) {
      sim.boot = Math.min(1, sim.boot + dt / 2.4);
      if (sim.boot >= 1 && sim.state === 'S0') setState('S1', 'self-test complete');
    }

    // ── If live Firebase data arrived recently, skip ALL simulated
    //    sensor noise and FSM auto-eval. The Firebase listener is
    //    authoritative; we only need to push history and re-render.
    const liveStale = (performance.now() - sim.lastFirebaseUpdate) > 8000;
    if (sim.liveMode && !liveStale) {
      pushHistory();
      renderSensors();
      updateUptime();
      return;
    }
    if (sim.liveMode && liveStale) {
      // Lost contact with the device — fall back to simulation
      sim.liveMode = false;
      if (dom.netLed)   dom.netLed.classList.remove('is-live');
      if (dom.netLabel) dom.netLabel.textContent = 'SIMULATED';
      const banner = document.getElementById('simBanner');
      if (banner) banner.style.display = '';
      logEvent('warn', 'Live data stalled > 8s — reverting to simulation');
    }

    // Decay impulses
    sim.spillImpulse  *= Math.pow(0.55, dt);
    sim.gasImpulse    *= Math.pow(0.6, dt);
    sim.turbidImpulse *= Math.pow(0.7, dt);

    // Baseline + sinusoidal drift + random noise + impulse
    const t = (performance.now() - sim.bootStart) / 1000;
    const baseLdr = 320 + Math.sin(t * 0.4) * 8;
    const baseGas = 42 + Math.sin(t * 0.27) * 4;

    sim.sensors.ldr  = baseLdr + (Math.random() - 0.5) * 14 + sim.spillImpulse * 480 + sim.turbidImpulse * 350;
    sim.sensors.gas  = baseGas + (Math.random() - 0.5) * 5  + sim.gasImpulse * 220 + sim.spillImpulse * 60;

    // Pellets: AI sees them when spill is active (with detection lag)
    const pelletInstant = Math.max(0, sim.spillImpulse * (110 + Math.random() * 30) - 4);
    sim.sensors.pellet = Math.round(pelletInstant);

    // Mass accumulates only when valve is closed (S3 latch) and pellets are flowing
    if (sim.state === 'S3' && sim.spillImpulse > 0.05) {
      sim.massCaptured += sim.spillImpulse * 4.8 * dt;
    }
    sim.sensors.mass = sim.massCaptured;

    // Auto state evaluation (only if not latched)
    if (!sim.alarmLatched) {
      if (sim.sensors.gas > 200 || sim.sensors.pellet > 80) {
        sim.alarmLatched = true;
        setState('S3', sim.sensors.gas > 200 ? 'gas critical' : 'AI confirmed pellet leak');
      } else if (sim.sensors.gas > 110 || sim.sensors.ldr > 600 || sim.sensors.pellet > 20) {
        if (sim.state !== 'S2') setState('S2', 'sensor above warn threshold');
      } else if (sim.state === 'S2') {
        setState('S1', 'thresholds cleared');
      }
    }

    pushHistory();
    renderSensors();

    // Auto-cycle: if auto mode, occasionally trigger demo events
    if (sim.autoMode) {
      sim.autoCycle += dt;
      if (sim.autoCycle >= sim.nextAutoEvent) {
        sim.autoCycle = 0;
        sim.nextAutoEvent = 14 + Math.random() * 10;
        autoChooseEvent();
      }
    }

    // Cloud sync heartbeat every 2 seconds
    if (performance.now() - sim.lastSync > 2000) {
      sim.lastSync = performance.now();
      dom.lastSync.textContent = nowHHMMSS();
    }

    updateUptime();
  }

  function updateUptime() {
    const upMs = performance.now() - sim.bootStart;
    const h = Math.floor(upMs / 3.6e6);
    const m = Math.floor((upMs % 3.6e6) / 60000);
    const s = Math.floor((upMs % 60000) / 1000);
    dom.uptime.textContent = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  }

  function autoChooseEvent() {
    if (sim.alarmLatched) {
      doReset();
      return;
    }
    const r = Math.random();
    if (r < 0.5) doSpill();
    else if (r < 0.85) doGas();
    else doTurbid();
  }

  function pushHistory() {
    for (const k of Object.keys(sim.history)) {
      sim.history[k].push(sim.sensors[k === 'ldr' ? 'ldr' : k === 'gas' ? 'gas' : k === 'pellet' ? 'pellet' : 'mass']);
      if (sim.history[k].length > sim.historyMax) sim.history[k].shift();
    }
  }

  function renderSensors() {
    dom.sLdr.textContent    = Math.round(sim.sensors.ldr);
    dom.sGas.textContent    = Math.round(sim.sensors.gas);
    dom.sPellet.textContent = sim.sensors.pellet;
    dom.sMass.textContent   = sim.sensors.mass.toFixed(1);

    // colour states
    cardClass('sLdr',    sim.sensors.ldr,    600, 850);
    cardClass('sGas',    sim.sensors.gas,    110, 200);
    cardClass('sPellet', sim.sensors.pellet, 20,  80);
    cardClass('sMass',   sim.sensors.mass,   1,   10);

    drawGraph(dom.gLdr,    sim.history.ldr,    0, 1024, '#5fd6ff');
    drawGraph(dom.gGas,    sim.history.gas,    0, 320,  '#ffb84c');
    drawGraph(dom.gPellet, sim.history.pellet, 0, 160,  '#ff5a52');
    drawGraph(dom.gMass,   sim.history.mass,   0, 30,   '#43e08a');
  }

  function cardClass(strongId, value, warn, crit) {
    const card = $(strongId).closest('.sensor-card');
    card.classList.remove('is-warn', 'is-crit');
    if (value >= crit) card.classList.add('is-crit');
    else if (value >= warn) card.classList.add('is-warn');
  }

  // ────────────────────────────────────────────────────────────
  // Sparkline graphs
  // ────────────────────────────────────────────────────────────

  function drawGraph(canvas, data, min, max, colour) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = (h * i) / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (data.length < 2) return;

    const range = max - min || 1;
    const stepX = w / (sim.historyMax - 1);

    // fill
    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = h - ((Math.max(min, Math.min(max, v)) - min) / range) * (h - 4) - 2;
      ctx.lineTo(x, y);
    });
    ctx.lineTo((data.length - 1) * stepX, h);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(colour, 0.16);
    ctx.fill();

    // line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = h - ((Math.max(min, Math.min(max, v)) - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // last-value dot
    const lastX = (data.length - 1) * stepX;
    const lastY = h - ((Math.max(min, Math.min(max, data[data.length - 1])) - min) / range) * (h - 4) - 2;
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.arc(lastX, lastY, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ────────────────────────────────────────────────────────────
  // Manual triggers
  // ────────────────────────────────────────────────────────────

  function doSpill() {
    sim.spillImpulse = 1;
    sim.turbidImpulse = 0.7;
    logEvent('warn', 'Manual: spill event triggered at Loading Bay 03');
  }

  function doGas() {
    sim.gasImpulse = 1;
    logEvent('warn', 'Manual: gas-leak simulation injected (MQ-135 channel)');
  }

  function doTurbid() {
    sim.turbidImpulse = 1;
    logEvent('info', 'Manual: cloudy water injected (LDR drop)');
  }

  function doReset() {
    if (!sim.alarmLatched && sim.state !== 'S3') {
      logEvent('info', 'RST pressed — no alarm to clear');
      return;
    }

    // Live mode: send a remote reset command to the device. The Jetson picks
    // this up, forwards RESET to the Arduino, and the latched S3 clears — the
    // device's own Firebase update then drives the dashboard back to S1.
    if (fbCommandRef) {
      fbCommandRef.child('reset').set(Date.now());
      logEvent('ok', 'Remote reset sent to device — clearing latched alarm');
      return;
    }

    setState('S4', 'operator pressed RST');
    setTimeout(() => {
      sim.alarmLatched = false;
      sim.massCaptured = 0;
      sim.spillImpulse = 0;
      sim.gasImpulse = 0;
      sim.turbidImpulse = 0;
      setState('S1', 'reset complete');
      logEvent('ok', 'Cartridge cleared, valve re-opened, system armed');
    }, 1100);
  }

  // ────────────────────────────────────────────────────────────
  // Wire-up
  // ────────────────────────────────────────────────────────────

  dom.btnSpill.addEventListener('click', doSpill);
  dom.btnGas.addEventListener('click', doGas);
  dom.btnTurbid.addEventListener('click', doTurbid);
  dom.btnReset.addEventListener('click', doReset);
  dom.autoMode.addEventListener('change', (e) => {
    sim.autoMode = e.target.checked;
    sim.autoCycle = 0;
    logEvent('info', `Auto-loop ${sim.autoMode ? 'enabled' : 'disabled'}`);
  });
  dom.btnClearLog.addEventListener('click', () => {
    events.length = 0;
    renderEvents();
  });

  // boot log
  logEvent('info', 'Power-up — running self test');
  renderState();

  // tick loop (5 Hz)
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    tick(dt);
  }, 200);

  // RAF for smooth canvas redraws (graph reflow on resize)
  window.addEventListener('resize', renderSensors);

  // ────────────────────────────────────────────────────────────
  // Firebase realtime integration
  // Falls back to simulation when credentials are REPLACE_ME or
  // the SDK fails to load (e.g. offline, blocked by firewall).
  // ────────────────────────────────────────────────────────────

  (function initFirebase() {
    const cfg = window.NURDLE_FIREBASE;
    if (!cfg || !window.firebase || cfg.apiKey === 'REPLACE_ME') {
      // Stay in simulation mode
      logEvent('info', 'Simulation mode — fill in firebase-config.js to go live');
      return;
    }

    let fbApp;
    try {
      fbApp = firebase.apps.length
        ? firebase.apps[0]
        : firebase.initializeApp(cfg);
    } catch (e) {
      logEvent('warn', 'Firebase init failed — simulation mode active');
      return;
    }

    const db       = firebase.database(fbApp);
    const devRef   = db.ref('devices/NURDLE-001');
    const evtRef   = db.ref('events');

    // Enable the dashboard → device reset path now that we're live.
    fbCommandRef = db.ref('devices/NURDLE-001/command');

    // ── Firebase reachability (logged, but does NOT drive netLed) ──
    // The netLed/netLabel are driven by actual device data freshness
    // below — Firebase being reachable just means the browser has
    // internet, not that a real device is publishing.
    db.ref('.info/connected').on('value', (snap) => {
      if (snap.val()) {
        logEvent('info', 'Firebase reachable — waiting for device data');
      }
    });

    // ── Device snapshot listener ────────────────────────────
    devRef.on('value', (snap) => {
      const d = snap.val();
      if (!d) return;

      // First device update → flip into live mode (pauses simulation)
      if (!sim.liveMode) {
        logEvent('ok', 'Live device data received — simulation paused');
      }
      sim.liveMode = true;
      sim.lastFirebaseUpdate = performance.now();

      // Drive the LIVE indicator from real device data
      if (dom.netLed)   dom.netLed.classList.add('is-live');
      if (dom.netLabel) dom.netLabel.textContent = 'LIVE';

      // Hide the static "Simulation mode" banner now that real data is flowing
      const banner = document.getElementById('simBanner');
      if (banner) banner.style.display = 'none';

      // Map FSM state string → sim state key
      const fsmMap = { S0: 'S0', S1: 'S1', S2: 'S2', S3: 'S3', S4: 'S4' };
      const nextState = fsmMap[d.fsm_state] || 'S1';

      // Pause the auto-loop while live data is flowing
      sim.autoMode = false;
      if (dom.autoMode) dom.autoMode.checked = false;

      // Inject real sensor readings (these are now authoritative — the
      // tick loop will skip its sine-wave overwrite while liveMode is on)
      if (d.ldr     !== undefined) sim.sensors.ldr    = d.ldr;
      if (d.gas_ppm !== undefined) sim.sensors.gas    = d.gas_ppm;
      if (d.ai_count !== undefined) sim.sensors.pellet = d.ai_count;
      if (d.load_g  !== undefined) sim.sensors.mass   = d.load_g;

      // Render top-3 AI class breakdown chips (Pen / Fragment / Microfibre / …)
      const classEl = document.getElementById('sClasses');
      if (classEl) {
        const cls = d.ai_classes && typeof d.ai_classes === 'object' ? d.ai_classes : {};
        const top = Object.entries(cls)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        classEl.innerHTML = top.length === 0
          ? ''
          : top.map(([name, n]) =>
              `<span class="class-chip">${name}<strong>${n}</strong></span>`
            ).join('');
      }

      // FSM transition
      if (nextState === 'S3') {
        sim.alarmLatched = true;
      } else if (sim.alarmLatched && nextState === 'S1') {
        sim.alarmLatched = false;
      }
      setState(nextState, 'Firebase live update');

      // Update last-sync timestamp
      if (dom.lastSync && d.timestamp) {
        const t = new Date(d.timestamp);
        dom.lastSync.textContent = t.toLocaleTimeString();
      }

      renderSensors();
    });

    // ── Live camera snapshot listener ───────────────────────
    const snapRef = db.ref('devices/NURDLE-001/snapshot');
    snapRef.on('value', (snap) => {
      const s = snap.val();
      if (!s || !s.data) return;
      const img = document.getElementById('cameraFeed');
      const ph  = document.getElementById('camPlaceholder');
      const ts  = document.getElementById('camTimestamp');
      if (img) img.src = 'data:image/jpeg;base64,' + s.data;
      if (ph)  ph.style.display = 'none';
      if (ts && s.timestamp) {
        ts.textContent = new Date(s.timestamp).toLocaleTimeString();
      }
    });

    // ── Recent events listener (last 10) ───────────────────
    evtRef.limitToLast(10).on('child_added', (snap) => {
      const e = snap.val();
      if (!e) return;
      const t = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—';
      logEvent('crit',
        `[FIREBASE] ALARM @ ${t} — density ${e.density_index ?? '?'} · ${e.ai_count ?? '?'} nurdles · ${e.load_g ?? '?'}g`
      );
    });

    logEvent('info', 'Firebase listener attached — waiting for device data');
  })();
})();
