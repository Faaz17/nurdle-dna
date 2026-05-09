(function () {
  const canvas = document.querySelector('#futureWorld');
  const soundToggle = document.querySelector('#soundToggle');

  initTypingHero();
  initHeroCinematic();
  initFutureSustainability3d();
  initCadModelViewer();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf8fdff, 18, 58);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(6.2, 3.6, 10.6);

  const root = new THREE.Group();
  const heroRig = new THREE.Group();
  const industrial = new THREE.Group();
  const pellets = new THREE.Group();
  scene.add(root);
  root.add(heroRig, industrial, pellets);

  const mats = {
    steel: new THREE.MeshStandardMaterial({ color: 0xd9e7ea, roughness: 0.24, metalness: 0.48 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x6b8792, roughness: 0.45, metalness: 0.38 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xb9fff4, roughness: 0.04, transparent: true, opacity: 0.28, transmission: 0.3 }),
    aqua: new THREE.MeshStandardMaterial({ color: 0x43d6c9, roughness: 0.35, metalness: 0.2, emissive: 0x073d38 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf3d38a, roughness: 0.34, metalness: 0.25, emissive: 0x3a2705 }),
    signal: new THREE.MeshStandardMaterial({ color: 0x47e28c, roughness: 0.42, metalness: 0.12, emissive: 0x083e1e }),
    alert: new THREE.MeshStandardMaterial({ color: 0xef5b4f, roughness: 0.38, metalness: 0.12, emissive: 0x330301 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xe2edf0, roughness: 0.84, metalness: 0.04 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2aa8bd, roughness: 0.28, transparent: true, opacity: 0.62, emissive: 0x042a32 }),
    pellet: new THREE.MeshStandardMaterial({ color: 0xf9f8ee, roughness: 0.58 }),
  };

  const state = {
    scroll: 0,
    targetScroll: 0,
    pulse: false,
    mouseX: 0,
    mouseY: 0,
  };

  addLights();
  buildHeroGateway();
  buildIndustrialTwin();
  buildPellets();
  loadDevice();
  animate();

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('pointermove', (event) => {
    state.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      state.pulse = !state.pulse;
      soundToggle.setAttribute('aria-pressed', String(state.pulse));
      soundToggle.textContent = state.pulse ? 'Pulse off' : 'Pulse on';
    });
  }

  function initTypingHero() {
    const target = document.querySelector('[data-typing-text]');
    if (!target) return;

    const text = target.dataset.typingText || '';
    let index = 0;
    let direction = 1;
    const typeDelay = 78;
    const deleteDelay = 42;
    const holdDelay = 1350;

    function tick() {
      target.textContent = text.slice(0, index);

      if (direction === 1 && index >= text.length) {
        direction = -1;
        window.setTimeout(tick, holdDelay);
        return;
      }

      if (direction === -1 && index <= 0) {
        direction = 1;
        window.setTimeout(tick, 420);
        return;
      }

      index += direction;
      window.setTimeout(tick, direction === 1 ? typeDelay : deleteDelay);
    }

    tick();
  }

  function initCadModelViewer() {
    const viewer = document.querySelector('#cadModelCanvas');
    if (!viewer || !window.THREE || !window.NURDLE_DNA_STL_BASE64) return;

    const frame = viewer.closest('.cad-viewer') || viewer.parentElement || viewer;
    const cadRenderer = new THREE.WebGLRenderer({ canvas: viewer, antialias: true, alpha: true });
    cadRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    cadRenderer.shadowMap.enabled = true;
    cadRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in cadRenderer) {
      cadRenderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      cadRenderer.outputEncoding = THREE.sRGBEncoding;
    }

    const cadScene = new THREE.Scene();
    cadScene.fog = new THREE.Fog(0xfbfffe, 7, 18);

    const cadCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    cadCamera.position.set(3.4, 2.35, 4.1);

    const controls = new THREE.OrbitControls(cadCamera, viewer);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;
    controls.minDistance = 2.4;
    controls.maxDistance = 7;
    controls.target.set(0, 0, 0);

    cadScene.add(new THREE.HemisphereLight(0xffffff, 0xd9eef2, 1.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 6, 4);
    key.castShadow = true;
    cadScene.add(key);
    const rim = new THREE.PointLight(0x44c986, 22, 10, 2);
    rim.position.set(3, 2, 2.6);
    cadScene.add(rim);

    const modelRoot = new THREE.Group();
    cadScene.add(modelRoot);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.7, 0.08, 96),
      new THREE.MeshStandardMaterial({ color: 0xf5fbfc, roughness: 0.62, metalness: 0.08 })
    );
    base.position.y = -1.08;
    base.receiveShadow = true;
    cadScene.add(base);

    try {
      const binary = atob(window.NURDLE_DNA_STL_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const geometry = new THREE.STLLoader().parse(bytes.buffer);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.boundingBox.getSize(size);
      geometry.translate(-center.x, -center.y, -center.z);

      const scale = 2.6 / Math.max(size.x, size.y, size.z);
      const body = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
        color: 0xe8f6f4,
        roughness: 0.22,
        metalness: 0.28,
        clearcoat: 0.62,
        clearcoatRoughness: 0.18,
      }));
      body.scale.setScalar(scale);
      body.castShadow = true;
      body.receiveShadow = true;

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({ color: 0x061217, transparent: true, opacity: 0.28 })
      );
      edges.scale.setScalar(scale);

      modelRoot.add(body, edges);
      modelRoot.rotation.set(-0.28, 0.32, 0.02);
    } catch (error) {
      console.warn('NurdleDNA CAD model could not be loaded.', error);
    }

    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x44c986, roughness: 0.32, metalness: 0.16, emissive: 0x073115 });
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.035), markerMaterial);
      marker.position.set(Math.cos(angle) * 1.46, -1.0, Math.sin(angle) * 1.46);
      marker.rotation.y = -angle;
      cadScene.add(marker);
    }

    resizeCad();
    window.addEventListener('resize', resizeCad);
    requestAnimationFrame(animateCad);

    function resizeCad() {
      const rect = frame.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      cadCamera.aspect = width / height;
      cadCamera.updateProjectionMatrix();
      cadRenderer.setSize(width, height, false);
    }

    function animateCad() {
      requestAnimationFrame(animateCad);
      controls.update();
      modelRoot.position.y = Math.sin(performance.now() * 0.0012) * 0.035;
      cadRenderer.render(cadScene, cadCamera);
    }
  }

  function initHeroCinematic() {
    const film = document.querySelector('#heroCinematic');
    if (!film) return;

    const context = film.getContext('2d');
    if (!context) return;

    const duration = 35000;
    const images = {
      refinery: loadImage('./assets/industrial-refinery-cleaner-future.png'),
      coast: loadImage('./assets/dubai-coast-cleaner-future.png'),
    };
    const particles = createFilmParticles(180);
    const sparks = createFilmParticles(70, 19);
    let startedAt = performance.now();
    let width = 1280;
    let height = 720;

    resizeFilm();
    window.addEventListener('resize', resizeFilm);
    requestAnimationFrame(drawFilm);

    function resizeFilm() {
      const rect = film.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(640, Math.floor(rect.width * dpr));
      height = Math.max(360, Math.floor(rect.height * dpr));
      film.width = width;
      film.height = height;
    }

    function drawFilm(now) {
      const progress = ((now - startedAt) % duration) / duration;
      const seconds = ((now - startedAt) % duration) / 1000;
      context.clearRect(0, 0, width, height);
      renderFrame(progress, seconds);
      requestAnimationFrame(drawFilm);
    }

    function renderFrame(progress, seconds) {
      const ctx = context;
      const w = width;
      const h = height;
      const spill = smooth(0.28, 0.48, progress);
      const alarm = smooth(0.42, 0.57, progress) * (1 - smooth(0.77, 0.9, progress));
      const captured = smooth(0.58, 0.78, progress);
      const report = smooth(0.72, 0.92, progress);
      const coastAlpha = smooth(0.62, 0.92, progress);

      drawCover(images.refinery, 0, 0, w, h, 1.07 + progress * 0.08, -0.32 + progress * 0.36, 0.08);
      ctx.save();
      ctx.globalAlpha = 0.36 + coastAlpha * 0.46;
      drawCover(images.coast, 0, 0, w, h, 1.12 + coastAlpha * 0.1, 0.22 - coastAlpha * 0.34, -0.04);
      ctx.restore();

      const wash = ctx.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, 'rgba(255,255,255,0.55)');
      wash.addColorStop(0.42, 'rgba(232,250,252,0.28)');
      wash.addColorStop(1, 'rgba(6,38,54,0.1)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);

      drawScanGrid(ctx, w, h, seconds, progress);
      drawGreenEnvironment(ctx, w, h, seconds, progress, coastAlpha, captured);
      drawPipeline(ctx, w, h, seconds, spill, alarm, captured);
      drawPellets(ctx, w, h, seconds, progress, spill, captured);
      drawAiBox(ctx, w, h, seconds, spill);
      drawEvidenceCard(ctx, w, h, report);
      drawBenefitCaption(ctx, w, h, progress);
      drawFilmProgress(ctx, w, h, progress, seconds);
    }

    function drawGreenEnvironment(ctx, w, h, seconds, progress, coastAlpha, captured) {
      const centerX = w * 0.78;
      const centerY = h * 0.44;
      const radius = h * (0.18 + coastAlpha * 0.04);

      ctx.save();
      ctx.globalAlpha = 0.42 + coastAlpha * 0.32;
      const halo = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.8);
      halo.addColorStop(0, 'rgba(168,242,138,0.42)');
      halo.addColorStop(0.48, 'rgba(67,214,201,0.18)');
      halo.addColorStop(1, 'rgba(67,214,201,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const rr = radius * (0.76 + i * 0.16);
        ctx.globalAlpha = 0.12 + coastAlpha * 0.12;
        ctx.strokeStyle = i % 2 ? '#43d6c9' : '#a8f28a';
        ctx.beginPath();
        ctx.arc(centerX, centerY, rr, seconds * 0.22 + i, seconds * 0.22 + i + Math.PI * 1.15);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = 'rgba(255,255,255,0.58)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i += 1) {
        const y = h * (0.78 + i * 0.025);
        ctx.beginPath();
        ctx.moveTo(w * 0.56, y);
        ctx.bezierCurveTo(w * 0.68, y - h * 0.025, w * 0.78, y + h * 0.022, w * 0.94, y - h * 0.012);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.72 + captured * 0.22;
      for (let i = 0; i < 8; i += 1) {
        const angle = seconds * 0.18 + i * 0.82;
        const x = centerX + Math.cos(angle) * radius * (0.52 + (i % 3) * 0.16);
        const y = centerY + Math.sin(angle * 0.9) * radius * (0.38 + (i % 2) * 0.18);
        drawLeaf(ctx, x, y, 12 + (i % 3) * 5, angle + Math.PI * 0.42, i % 2 ? '#a8f28a' : '#44c986');
      }
      ctx.restore();
    }

    function drawBenefitCaption(ctx, w, h, progress) {
      const captions = [
        { start: 0.02, end: 0.28, title: 'Green industry without invisible leakage', stat: 'Pellets stopped before drains' },
        { start: 0.28, end: 0.52, title: 'Cleaner water for coastal cities', stat: 'Microplastics captured at source' },
        { start: 0.52, end: 0.74, title: 'Safer air, safer stormwater', stat: 'VOC warning plus automatic closure' },
        { start: 0.74, end: 0.99, title: 'Proof for a circular economy', stat: 'Evidence saved, report generated' },
      ];
      const active = captions.find((caption) => progress >= caption.start && progress < caption.end) || captions[0];
      const fade = smooth(active.start, active.start + 0.045, progress) * (1 - smooth(active.end - 0.05, active.end, progress));
      if (fade <= 0.01) return;

      const cardW = w * 0.34;
      const cardH = h * 0.16;
      const x = w - cardW - w * 0.055;
      const y = h * 0.66;

      ctx.save();
      ctx.globalAlpha = fade;
      roundRect(ctx, x, y, cardW, cardH, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#073744';
      ctx.font = `950 ${Math.max(18, h * 0.035)}px "Segoe UI", sans-serif`;
      wrapText(ctx, active.title, x + 22, y + 42, cardW - 44, h * 0.042);
      ctx.fillStyle = '#117d5f';
      ctx.font = `900 ${Math.max(13, h * 0.023)}px "Segoe UI", sans-serif`;
      ctx.fillText(active.stat, x + 22, y + cardH - 24);
      ctx.restore();
    }

    function drawPipeline(ctx, w, h, seconds, spill, alarm, captured) {
      const y = h * 0.64;
      const left = w * 0.12;
      const right = w * 0.82;
      const deviceX = w * 0.53;
      const valveX = w * 0.65;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = 'rgba(255,255,255,0.58)';
      ctx.lineWidth = h * 0.07;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.bezierCurveTo(w * 0.3, y - h * 0.07, w * 0.48, y + h * 0.05, right, y - h * 0.02);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(60,155,180,0.34)';
      ctx.lineWidth = h * 0.048;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.bezierCurveTo(w * 0.3, y - h * 0.07, w * 0.48, y + h * 0.05, right, y - h * 0.02);
      ctx.stroke();

      ctx.strokeStyle = alarm > 0.05 ? `rgba(230,60,52,${0.35 + alarm * 0.3})` : 'rgba(60,214,201,0.48)';
      ctx.lineWidth = h * 0.014;
      ctx.setLineDash([w * 0.035, w * 0.018]);
      ctx.lineDashOffset = -seconds * 90;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.bezierCurveTo(w * 0.3, y - h * 0.07, w * 0.48, y + h * 0.05, right, y - h * 0.02);
      ctx.stroke();
      ctx.setLineDash([]);

      drawGlassCapsule(ctx, deviceX - w * 0.075, y - h * 0.09, w * 0.15, h * 0.18, captured);
      drawValve(ctx, valveX, y - h * 0.015, h * 0.062, seconds, alarm, captured);
      drawCartridge(ctx, valveX + w * 0.06, y + h * 0.08, w * 0.13, h * 0.12, captured);

      drawLabel(ctx, 'AI camera', deviceX - w * 0.105, y - h * 0.18, '#0879b5');
      drawLabel(ctx, captured > 0.35 ? 'Valve closed' : 'Valve open', valveX - w * 0.03, y - h * 0.14, captured > 0.35 ? '#8d1022' : '#117d5f');
      drawLabel(ctx, 'Evidence cartridge', valveX + w * 0.045, y + h * 0.23, '#5b1725');

      if (alarm > 0.05) {
        ctx.globalAlpha = alarm * (0.45 + Math.sin(seconds * 14) * 0.18);
        ctx.fillStyle = 'rgba(230, 60, 52, 0.42)';
        ctx.beginPath();
        ctx.arc(valveX, y - h * 0.22, h * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawGlassCapsule(ctx, x, y, w, h, captured) {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, 'rgba(255,255,255,0.74)');
      grad.addColorStop(0.52, 'rgba(185,255,244,0.34)');
      grad.addColorStop(1, 'rgba(255,255,255,0.18)');
      roundRect(ctx, x, y, w, h, h * 0.5);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.stroke();

      ctx.fillStyle = `rgba(68, 201, 134, ${0.2 + captured * 0.25})`;
      roundRect(ctx, x + w * 0.11, y + h * 0.22, w * 0.78, h * 0.56, h * 0.28);
      ctx.fill();
    }

    function drawValve(ctx, x, y, r, seconds, alarm, captured) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seconds * 0.8 + captured * Math.PI * 0.75);
      ctx.lineWidth = 6;
      ctx.strokeStyle = captured > 0.5 ? '#8d1022' : '#e4493d';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = alarm > 0.08 ? 'rgba(141,16,34,0.82)' : 'rgba(255,255,255,0.82)';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawCartridge(ctx, x, y, w, h, captured) {
      roundRect(ctx, x, y, w, h, h * 0.32);
      ctx.fillStyle = 'rgba(255,255,255,0.58)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(91,23,37,0.32)';
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = captured;
      ctx.fillStyle = '#f9f8ee';
      for (let i = 0; i < 34; i += 1) {
        const px = x + ((i * 37) % 100) / 100 * w;
        const py = y + h * (0.34 + ((i * 19) % 50) / 100);
        ctx.beginPath();
        ctx.arc(px, py, 2.8 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPellets(ctx, w, h, seconds, progress, spill, captured) {
      const pipeY = h * 0.64;
      ctx.save();
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const flow = (particle.u + seconds * (0.06 + particle.w * 0.03)) % 1;
        const active = Math.min(1, spill * 1.2);
        const capturePull = captured * smooth(0.42, 1, flow);
        const x = w * (0.14 + flow * 0.62) + Math.sin(seconds * 2 + particle.v * 8) * 7;
        const y = pipeY + Math.sin(flow * Math.PI * 2 + particle.x * 4) * h * 0.035 + capturePull * h * 0.12;
        const r = 2 + particle.w * 4;
        ctx.globalAlpha = active * (0.38 + particle.w * 0.58);
        ctx.fillStyle = '#fff9e6';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const falling = spill * (1 - smooth(0.75, 0.95, progress));
      for (let i = 0; i < sparks.length; i += 1) {
        const s = sparks[i];
        const fall = (s.u + seconds * 0.16) % 1;
        ctx.globalAlpha = falling * (0.28 + s.w * 0.56);
        ctx.fillStyle = '#fff9e6';
        ctx.beginPath();
        ctx.arc(w * (0.21 + s.x * 0.13), h * (0.18 + fall * 0.54), 2 + s.w * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawAiBox(ctx, w, h, seconds, spill) {
      const active = smooth(0.18, 0.42, spill);
      ctx.save();
      ctx.globalAlpha = 0.42 + active * 0.58;
      ctx.strokeStyle = '#43d6c9';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -seconds * 22;
      const x = w * 0.19;
      const y = h * 0.22;
      const bw = w * 0.22;
      const bh = h * 0.25;
      ctx.strokeRect(x, y, bw, bh);
      ctx.setLineDash([]);
      drawLabel(ctx, active > 0.45 ? 'AI confidence 94%' : 'Monitoring flow', x + 12, y - 34, '#0879b5');
      ctx.restore();
    }

    function drawEvidenceCard(ctx, w, h, amount) {
      const x = w - (w * 0.29 + 26);
      const y = h * 0.14;
      const cardW = w * 0.29;
      const cardH = h * 0.42;
      ctx.save();
      ctx.globalAlpha = amount;
      ctx.translate((1 - amount) * 50, 0);
      roundRect(ctx, x, y, cardW, cardH, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.82)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#5b1725';
      ctx.font = `${Math.max(18, h * 0.035)}px "Segoe Print", "Comic Sans MS", cursive`;
      ctx.fillText('Incident Report', x + 24, y + 48);
      ctx.font = `900 ${Math.max(14, h * 0.024)}px "Segoe UI", sans-serif`;
      ctx.fillStyle = '#071217';
      const rows = [
        ['Bay ID', 'Loading Bay 03'],
        ['Pellet count', '126'],
        ['Captured mass', '18.6 g'],
        ['Proof image', 'Saved'],
      ];
      rows.forEach((row, index) => {
        const yy = y + 88 + index * h * 0.065;
        ctx.fillText(row[0], x + 24, yy);
        ctx.textAlign = 'right';
        ctx.fillText(row[1], x + cardW - 24, yy);
        ctx.textAlign = 'left';
      });
      ctx.restore();
    }

    function drawScanGrid(ctx, w, h, seconds, progress) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#43d6c9';
      ctx.lineWidth = 1;
      for (let x = -w; x < w * 1.4; x += w * 0.09) {
        ctx.beginPath();
        ctx.moveTo(x + (seconds * 16) % (w * 0.09), 0);
        ctx.lineTo(x + w * 0.18 + (seconds * 16) % (w * 0.09), h);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.2 + Math.sin(progress * Math.PI * 2) * 0.04;
      const glow = ctx.createRadialGradient(w * 0.48, h * 0.55, 0, w * 0.48, h * 0.55, w * 0.45);
      glow.addColorStop(0, 'rgba(68,201,134,0.24)');
      glow.addColorStop(1, 'rgba(68,201,134,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    function drawFilmProgress(ctx, w, h, progress, seconds) {
      const x = w * 0.06;
      const y = h - 28;
      const barW = w * 0.56;
      ctx.save();
      ctx.globalAlpha = 0.9;
      roundRect(ctx, x, y, barW, 6, 999);
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.fill();
      roundRect(ctx, x, y, barW * progress, 6, 999);
      ctx.fillStyle = '#44c986';
      ctx.fill();
      ctx.font = `900 ${Math.max(12, h * 0.02)}px "Segoe UI", sans-serif`;
      ctx.fillStyle = '#071217';
      ctx.fillText(`${String(Math.floor(seconds)).padStart(2, '0')} / 35 sec`, x, y - 12);
      ctx.restore();
    }

    function drawLabel(ctx, text, x, y, color) {
      ctx.save();
      ctx.font = `900 ${Math.max(12, height * 0.022)}px "Segoe UI", sans-serif`;
      const metrics = ctx.measureText(text);
      roundRect(ctx, x - 8, y - 22, metrics.width + 16, 30, 999);
      ctx.fillStyle = 'rgba(255,255,255,0.66)';
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function drawLeaf(ctx, x, y, size, rotation, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(size * 0.75, -size * 0.35, size * 0.58, size * 0.62, 0, size);
      ctx.bezierCurveTo(-size * 0.58, size * 0.62, -size * 0.75, -size * 0.35, 0, -size);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.56)';
      ctx.lineWidth = Math.max(1, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(0, size * 0.72);
      ctx.stroke();
      ctx.restore();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      for (let i = 0; i < words.length; i += 1) {
        const testLine = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, y);
          line = words[i];
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    }

    function drawCover(image, x, y, w, h, zoom, panX, panY) {
      if (!image.complete || image.naturalWidth === 0) {
        const fallback = context.createLinearGradient(0, 0, w, h);
        fallback.addColorStop(0, '#eaf7fb');
        fallback.addColorStop(1, '#bfeff1');
        context.fillStyle = fallback;
        context.fillRect(x, y, w, h);
        return;
      }

      const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom;
      const sourceW = w / scale;
      const sourceH = h / scale;
      const sourceX = (image.naturalWidth - sourceW) / 2 + panX * (image.naturalWidth - sourceW) * 0.5;
      const sourceY = (image.naturalHeight - sourceH) / 2 + panY * (image.naturalHeight - sourceH) * 0.5;
      context.drawImage(image, sourceX, sourceY, sourceW, sourceH, x, y, w, h);
    }

    function loadImage(source) {
      const image = new Image();
      image.src = source;
      return image;
    }

    function roundRect(ctx, x, y, w, h, radius) {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function createFilmParticles(count, salt = 7) {
      let seed = salt * 997;
      const result = [];
      for (let i = 0; i < count; i += 1) {
        seed = (seed * 16807) % 2147483647;
        const a = (seed - 1) / 2147483646;
        seed = (seed * 16807) % 2147483647;
        const b = (seed - 1) / 2147483646;
        seed = (seed * 16807) % 2147483647;
        const c = (seed - 1) / 2147483646;
        result.push({ x: a - 0.5, y: b - 0.5, u: a, v: b, w: c });
      }
      return result;
    }

    function smooth(edge0, edge1, value) {
      const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
      return x * x * (3 - 2 * x);
    }
  }

  function initFutureSustainability3d() {
    const stageCanvas = document.querySelector('#futureSustainability3d');
    if (!stageCanvas || !window.THREE) return;

    const stage = stageCanvas.closest('.hero-cinematic') || stageCanvas;
    const stageRenderer = new THREE.WebGLRenderer({ canvas: stageCanvas, antialias: true, alpha: true });
    stageRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stageRenderer.shadowMap.enabled = true;
    stageRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in stageRenderer) {
      stageRenderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      stageRenderer.outputEncoding = THREE.sRGBEncoding;
    }

    const stageScene = new THREE.Scene();
    stageScene.fog = new THREE.Fog(0x082430, 9, 24);

    const stageCamera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 60);
    stageCamera.position.set(4.8, 3.1, 7.2);

    const root3d = new THREE.Group();
    const orbitRig = new THREE.Group();
    const cityRig = new THREE.Group();
    const flowRig = new THREE.Group();
    stageScene.add(root3d);
    root3d.add(orbitRig, cityRig, flowRig);

    const stageMats = {
      glass: new THREE.MeshPhysicalMaterial({ color: 0xcffff4, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.28, transmission: 0.42 }),
      green: new THREE.MeshStandardMaterial({ color: 0x77f08b, roughness: 0.28, metalness: 0.16, emissive: 0x123f1d }),
      aqua: new THREE.MeshStandardMaterial({ color: 0x43d6c9, roughness: 0.26, metalness: 0.2, emissive: 0x063c38 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x0e78b8, roughness: 0.34, metalness: 0.24, emissive: 0x051d36 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xd8edf2, roughness: 0.28, metalness: 0.5 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x0d3440, roughness: 0.62, metalness: 0.12 }),
      pellet: new THREE.MeshStandardMaterial({ color: 0xfff8df, roughness: 0.56, emissive: 0x221600 }),
    };

    stageScene.add(new THREE.HemisphereLight(0xffffff, 0x0d3440, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(-4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    stageScene.add(key);

    const greenLight = new THREE.PointLight(0x77f08b, 28, 14, 2);
    greenLight.position.set(2.7, 1.7, 1.2);
    stageScene.add(greenLight);

    const blueLight = new THREE.PointLight(0x43d6c9, 22, 15, 2);
    blueLight.position.set(-2.2, 1.8, 1.6);
    stageScene.add(blueLight);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.78, 0.12, 96), stageMats.glass);
    platform.position.y = -1.1;
    platform.receiveShadow = true;
    root3d.add(platform);

    const water = new THREE.Mesh(new THREE.CircleGeometry(3.3, 128), new THREE.MeshStandardMaterial({
      color: 0x43d6c9,
      roughness: 0.18,
      transparent: true,
      opacity: 0.28,
      emissive: 0x052b31,
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.16;
    root3d.add(water);

    const ringData = [
      [2.9, 0.018, 0.15, 0.22, stageMats.aqua],
      [2.24, 0.014, Math.PI / 2.4, -0.1, stageMats.green],
      [1.64, 0.012, Math.PI / 2.0, 0.3, stageMats.metal],
    ];
    ringData.forEach(([radius, tube, rx, rz, material]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 16, 180), material);
      ring.rotation.set(rx, 0, rz);
      ring.castShadow = true;
      orbitRig.add(ring);
    });

    buildFutureCity(cityRig, stageMats);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.5, -0.78, 0.65),
      new THREE.Vector3(-1.4, -0.56, 0.2),
      new THREE.Vector3(-0.16, -0.44, -0.12),
      new THREE.Vector3(1.1, -0.53, -0.18),
      new THREE.Vector3(2.36, -0.84, -0.52),
    ]);
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.035, 18, false), stageMats.glass);
    pipe.castShadow = true;
    flowRig.add(pipe);

    const flowLine = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.014, 12, false), stageMats.green);
    flowRig.add(flowLine);

    const pelletMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 12, 8), stageMats.pellet, 90);
    pelletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    pelletMesh.userData.seed = seeded(90, 503);
    flowRig.add(pelletMesh);

    const nodes = [];
    [['Design', -1.95, 0.55, 0.42, stageMats.blue], ['Execute', 0.2, 0.92, -0.18, stageMats.aqua], ['Sustainability', 1.95, 0.58, 0.38, stageMats.green]].forEach((item) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), item[4]);
      node.position.set(item[1], item[2], item[3]);
      node.castShadow = true;
      nodes.push(node);
      orbitRig.add(node);
    });

    resizeStage();
    window.addEventListener('resize', resizeStage);
    requestAnimationFrame(animateStage);

    function buildFutureCity(target, materials) {
      const towerSpecs = [
        [-1.45, -0.6, 0.22, 1.0, materials.metal],
        [-0.9, -0.28, 0.18, 1.4, materials.aqua],
        [-0.32, -0.48, 0.16, 0.86, materials.blue],
        [0.2, -0.14, 0.24, 1.7, materials.green],
        [0.74, -0.42, 0.18, 1.18, materials.metal],
        [1.28, -0.68, 0.22, 0.94, materials.aqua],
      ];

      towerSpecs.forEach(([x, z, width, height, material]) => {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), material);
        tower.position.set(x, -1.04 + height / 2, z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        target.add(tower);
      });

      const futureRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 18, 96), materials.green);
      futureRing.position.set(0.25, 0.26, -0.08);
      futureRing.rotation.set(Math.PI / 2.2, 0.1, 0.2);
      futureRing.castShadow = true;
      target.add(futureRing);

      for (let i = 0; i < 22; i += 1) {
        const angle = (i / 22) * Math.PI * 2;
        const radius = 2.25 + (i % 3) * 0.12;
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1 + (i % 4) * 0.03, 0.065), i % 2 ? materials.aqua : materials.green);
        marker.position.set(Math.cos(angle) * radius, -1.0, Math.sin(angle) * radius);
        marker.rotation.y = -angle;
        target.add(marker);
      }
    }

    function animateStage(now) {
      requestAnimationFrame(animateStage);
      const time = now * 0.001;
      const phase = (time % 35) / 35;

      root3d.rotation.y = -0.36 + Math.sin(time * 0.16) * 0.08;
      orbitRig.rotation.y = time * 0.16;
      orbitRig.rotation.x = Math.sin(time * 0.21) * 0.04;
      cityRig.rotation.y = Math.sin(time * 0.1) * 0.1;
      water.material.opacity = 0.24 + Math.sin(time * 1.7) * 0.05;

      nodes.forEach((node, index) => {
        node.scale.setScalar(1 + Math.sin(time * 2.2 + index * 1.7) * 0.14);
      });

      updateStagePellets(time, phase);

      stageCamera.position.x = 4.8 + Math.sin(time * 0.12) * 0.38;
      stageCamera.position.y = 3.05 + Math.sin(time * 0.18) * 0.14;
      stageCamera.lookAt(0.34, -0.35, 0);
      stageRenderer.render(stageScene, stageCamera);
    }

    function updateStagePellets(time, phase) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const seeds = pelletMesh.userData.seed;

      for (let i = 0; i < pelletMesh.count; i += 1) {
        const seed = seeds[i];
        const t = (seed.u + time * (0.08 + seed.w * 0.03)) % 1;
        curve.getPointAt(t, position);
        position.y += Math.sin(time * 1.7 + seed.v * 10) * 0.025;
        position.z += (seed.z || 0) * 0.08;
        const active = phase < 0.72 || t < 0.82;
        scale.setScalar(active ? 0.68 + seed.w * 0.65 : 0.001);
        matrix.compose(position, quaternion, scale);
        pelletMesh.setMatrixAt(i, matrix);
      }
      pelletMesh.instanceMatrix.needsUpdate = true;
    }

    function resizeStage() {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      stageCamera.aspect = width / height;
      stageCamera.updateProjectionMatrix();
      stageRenderer.setSize(width, height, false);
    }
  }

  function addLights() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcce8ee, 1.75));

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-6, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const rim = new THREE.PointLight(0x43d6c9, 28, 18, 2);
    rim.position.set(4.4, 2.6, 4.4);
    scene.add(rim);

    const warm = new THREE.PointLight(0xf3d38a, 20, 16, 2);
    warm.position.set(-5.8, 4.4, 3.2);
    scene.add(warm);

    const alarm = new THREE.PointLight(0xef5b4f, 0, 12, 2);
    alarm.position.set(1.2, 1.6, 0.2);
    scene.add(alarm);
    state.alarm = alarm;
  }

  function buildHeroGateway() {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.48, 0.18, 24, 160), mats.steel);
    ring.rotation.set(0.18, 0.08, -0.12);
    ring.castShadow = true;
    ring.receiveShadow = true;
    heroRig.add(ring);
    state.ring = ring;

    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.018, 8, 130), mats.aqua);
    inner.rotation.copy(ring.rotation);
    heroRig.add(inner);

    const outer = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.012, 8, 160), mats.gold);
    outer.rotation.copy(ring.rotation);
    heroRig.add(outer);

    const windowGeo = new THREE.BoxGeometry(0.36, 0.025, 0.075);
    for (let i = 0; i < 84; i += 1) {
      const angle = (i / 84) * Math.PI * 2;
      const radius = i % 3 === 0 ? 2.53 : 2.38;
      const material = i % 5 === 0 ? mats.gold : mats.aqua;
      const chip = new THREE.Mesh(windowGeo, material);
      chip.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.02 + Math.sin(angle * 3) * 0.11);
      chip.rotation.z = angle + Math.PI / 2;
      chip.rotation.x = ring.rotation.x;
      chip.castShadow = true;
      heroRig.add(chip);
    }

    const mound = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.3, 0.7, 80), mats.signal);
    mound.position.y = -2.48;
    mound.scale.z = 0.34;
    mound.receiveShadow = true;
    heroRig.add(mound);

    heroRig.position.set(2.4, 1.5, -1.8);
    heroRig.rotation.y = -0.15;
  }

  function buildIndustrialTwin() {
    industrial.position.set(1.8, -1.42, -0.8);
    industrial.scale.setScalar(0.72);

    const pad = box(12, 0.18, 7, 0, -0.14, 0, mats.concrete);
    industrial.add(pad);

    for (let i = 0; i < 3; i += 1) {
      const silo = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.5, 32), mats.steel);
      body.position.y = 1.24;
      body.castShadow = true;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.37, 0.48, 32), mats.darkSteel);
      cone.position.y = -0.22;
      cone.rotation.x = Math.PI;
      cone.castShadow = true;
      silo.add(body, cone);
      silo.position.set(-4.2 + i * 0.9, 0, -1.6);
      industrial.add(silo);
    }

    industrial.add(cylinderBetween(new THREE.Vector3(-4.5, 1.0, 0.6), new THREE.Vector3(4.4, 1.0, 0.6), 0.18, mats.glass, true));
    industrial.add(cylinderBetween(new THREE.Vector3(-4.45, 1.0, 0.6), new THREE.Vector3(4.35, 1.0, 0.6), 0.1, mats.water, true));

    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 48), mats.alert);
    valve.position.set(0.8, 1.0, 0.6);
    valve.rotation.z = Math.PI / 2;
    industrial.add(valve);
    state.valve = valve;

    const cartridge = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.1, 32, 1, true), mats.glass);
    cartridge.position.set(1.65, 0.38, -0.35);
    cartridge.rotation.z = Math.PI / 2;
    industrial.add(cartridge);
    state.cartridge = cartridge;

    const drain = box(0.7, 0.08, 4.2, -2.6, 0.0, 1.55, mats.darkSteel);
    industrial.add(drain);

    const coast = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2, 12, 4), mats.water);
    coast.rotation.x = -Math.PI / 2;
    coast.position.set(0.8, 0.02, 4.1);
    industrial.add(coast);
    state.coast = coast;

    const room = box(1.5, 1.05, 1.0, 4.2, 0.48, -1.7, mats.darkSteel);
    industrial.add(room);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ color: 0x47e28c }));
    screen.position.set(3.43, 0.64, -1.7);
    screen.rotation.y = -Math.PI / 2;
    industrial.add(screen);
  }

  function buildPellets() {
    const pelletGeo = new THREE.SphereGeometry(0.035, 10, 8);
    const matrix = new THREE.Matrix4();
    const white = new THREE.InstancedMesh(pelletGeo, mats.pellet, 170);
    white.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    white.userData.seed = seeded(170, 37);
    for (let i = 0; i < 170; i += 1) {
      matrix.makeScale(0.001, 0.001, 0.001);
      white.setMatrixAt(i, matrix);
    }
    pellets.add(white);
    state.pellets = white;

    const starGeo = new THREE.SphereGeometry(0.012, 8, 6);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xcffdf5, transparent: true, opacity: 0.62 });
    const stars = new THREE.InstancedMesh(starGeo, starMat, 240);
    stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    stars.userData.seed = seeded(240, 73);
    pellets.add(stars);
    state.stars = stars;
  }

  function loadDevice() {
    try {
      const binary = atob(window.NURDLE_DNA_STL_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const geometry = new THREE.STLLoader().parse(bytes.buffer);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.boundingBox.getSize(size);
      geometry.translate(-center.x, -center.y, -center.z);

      const device = new THREE.Mesh(geometry, mats.signal);
      state.deviceBaseScale = 1.3 / Math.max(size.x, size.y, size.z);
      device.scale.setScalar(state.deviceBaseScale);
      device.position.set(1.8, -0.68, -0.34);
      device.rotation.set(0.05, -0.2, 0);
      device.castShadow = true;
      device.receiveShadow = true;
      root.add(device);
      state.device = device;
    } catch (error) {
      const fallback = new THREE.Mesh(new THREE.TorusKnotGeometry(0.34, 0.08, 80, 12), mats.signal);
      fallback.position.set(1.8, -0.68, -0.34);
      root.add(fallback);
      state.deviceBaseScale = 1;
      state.device = fallback;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    state.scroll += (state.targetScroll - state.scroll) * 0.06;

    const incident = smoothstep(0.35, 0.72, state.scroll);
    const proof = smoothstep(0.62, 1, state.scroll);
    const pulse = state.pulse ? 1 + Math.sin(time * 6) * 0.08 : 1;

    heroRig.rotation.y = -0.18 + state.mouseX * 0.04 + Math.sin(time * 0.22) * 0.06;
    heroRig.rotation.x = state.mouseY * -0.025;
    heroRig.scale.setScalar(1 - state.scroll * 0.18);

    industrial.rotation.y = 0.18 + state.scroll * 0.55 + state.mouseX * 0.025;
    industrial.position.y = -1.42 + state.scroll * 0.72;
    industrial.position.z = -0.8 + state.scroll * 0.35;

    if (state.device) {
      state.device.rotation.y += 0.008 + incident * 0.012;
      state.device.scale.setScalar(state.device.scale.x * 0.995 + state.deviceBaseScale * pulse * 0.005);
    }

    if (state.valve) {
      state.valve.rotation.y = incident * Math.PI * 0.5;
      state.valve.material = incident > 0.6 ? mats.alert : mats.signal;
    }

    if (state.cartridge) {
      state.cartridge.material.opacity = 0.26 + proof * 0.28;
    }

    if (state.alarm) {
      state.alarm.intensity = incident * (20 + Math.max(0, Math.sin(time * 9)) * 30);
    }

    if (state.coast) {
      state.coast.position.y = 0.02 + Math.sin(time * 1.6) * 0.02;
    }

    updatePellets(time, incident, proof);
    updateStars(time);

    const camA = new THREE.Vector3(6.2, 3.6, 10.6);
    const camB = new THREE.Vector3(4.2, 2.7, 6.9);
    const camC = new THREE.Vector3(2.0, 1.9, 5.3);
    camera.position.copy(camA.lerp(camB, Math.min(state.scroll * 1.4, 1)).lerp(camC, proof * 0.55));
    camera.lookAt(1.4, -0.2 + state.scroll * 0.4, -0.8);

    renderer.render(scene, camera);
  }

  function updatePellets(time, incident, proof) {
    const mesh = state.pellets;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const seeds = mesh.userData.seed;

    for (let i = 0; i < mesh.count; i += 1) {
      const seed = seeds[i];
      const active = i / mesh.count < Math.max(incident, proof);
      const phase = (time * (0.08 + seed.w * 0.18) + seed.u) % 1;
      const spillX = -1.95 + seed.x * 0.95 + phase * 1.3;
      const pipeX = -1.4 + phase * 3.0;
      const y = -0.52 + seed.y * 0.22 - proof * 0.45;
      const z = 0.8 + seed.z * 0.6 - proof * 1.15;
      position.set(THREE.MathUtils.lerp(spillX, pipeX, proof), y, z);
      scale.setScalar(active ? 0.8 + seed.w * 0.6 : 0.001);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function updateStars(time) {
    const mesh = state.stars;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const seeds = mesh.userData.seed;

    for (let i = 0; i < mesh.count; i += 1) {
      const seed = seeds[i];
      position.set(seed.x * 15, seed.y * 8 + 1.8 + Math.sin(time + seed.u * 9) * 0.16, seed.z * 9 - 5);
      scale.setScalar(0.8 + Math.sin(time * 1.8 + seed.v * 8) * 0.25);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function updateScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    state.targetScroll = window.scrollY / max;
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function cylinderBetween(start, end, radius, material, openEnded) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 36, 1, Boolean(openEnded));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function seeded(count, salt) {
    let value = salt * 1009;
    const result = [];
    for (let i = 0; i < count; i += 1) {
      value = (value * 16807) % 2147483647;
      const a = (value - 1) / 2147483646;
      value = (value * 16807) % 2147483647;
      const b = (value - 1) / 2147483646;
      value = (value * 16807) % 2147483647;
      const c = (value - 1) / 2147483646;
      value = (value * 16807) % 2147483647;
      const d = (value - 1) / 2147483646;
      result.push({ x: a - 0.5, y: b - 0.5, z: c - 0.5, u: a, v: b, w: d });
    }
    return result;
  }

  function smoothstep(edge0, edge1, value) {
    const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  }
}());
