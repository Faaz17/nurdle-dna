const scenes = [
  {
    code: 'SITE',
    title: 'Industrial area setup',
    summary: 'Polymer silos, loading bay, pipe, stormwater outlet, coastal water, and inline NurdleDNA protection are visible.',
    tone: 'cyan',
    duration: 8500,
    camera: [15, 10, 16],
    target: [-1, 1.4, 1],
    dashboard: {
      state: 'Commissioned / Ready',
      pellet: '0',
      gas_ppm: '--',
      valve: 'Open',
      mass: '0 g',
      density_index: '--',
      turbidity: 'Clear',
      bay: 'Loading Bay 03',
      proof: 'Standby',
      report: 'Template ready',
      fsm_state: 'S0',
      dna_source: '--',
      temperature: '--',
      device_id: 'NURDLE-001',
    },
    visual: { spill: 0, pipePellets: 0, cartridge: 0, valve: 0, alarm: 0, vapor: 0, ai: 0, report: 0 },
  },
  {
    code: 'SAFE',
    title: 'Normal operation',
    summary: 'Clean flow passes through the transparent pipe while AI vision, gas sensing, and mass capture remain on standby.',
    tone: 'green',
    duration: 8000,
    camera: [10, 5.4, 8.2],
    target: [-0.7, 1.3, 0.2],
    dashboard: {
      state: 'Green / Monitoring',
      pellet: '0',
      gas_ppm: '24 ppm',
      valve: 'Open',
      mass: '0 g',
      density_index: '12',
      turbidity: 'Clear',
      bay: 'Loading Bay 03',
      proof: 'Standby',
      report: 'Standby',
      fsm_state: 'S1',
      dna_source: '--',
      temperature: '24.2 °C',
      device_id: 'NURDLE-001',
    },
    visual: { spill: 0, pipePellets: 0, cartridge: 0, valve: 0, alarm: 0, vapor: 0, ai: 0.18, report: 0 },
  },
  {
    code: 'SPILL',
    title: 'Industrial spill event',
    summary: 'A transfer leak sends white nurdles toward the drain; AI confidence, turbidity, and VOC warning rise together.',
    tone: 'amber',
    duration: 9000,
    camera: [8.5, 5.2, 5.8],
    target: [-3.5, 1.5, 0.2],
    dashboard: {
      state: 'Warning / Detecting',
      pellet: '126',
      gas_ppm: '118 ppm',
      valve: 'Open',
      mass: '0 g',
      density_index: '58',
      turbidity: 'High',
      bay: 'Loading Bay 03',
      proof: 'Capturing',
      report: 'Pending',
      fsm_state: 'S2',
      dna_source: 'Analysing',
      temperature: '25.1 °C',
      device_id: 'NURDLE-001',
    },
    visual: { spill: 1, pipePellets: 0.82, cartridge: 0.08, valve: 0, alarm: 0.45, vapor: 0.85, ai: 1, report: 0 },
  },
  {
    code: 'LOCK',
    title: 'Automatic emergency response',
    summary: 'The valve closes, flow diverts into the evidence cartridge, pellets are trapped, and an alert is issued.',
    tone: 'red',
    duration: 9000,
    camera: [6.6, 4.6, 4.7],
    target: [0.9, 1.15, -0.5],
    dashboard: {
      state: 'Red / Containment',
      pellet: '126',
      gas_ppm: '120 ppm',
      valve: 'Closed',
      mass: '18.6 g',
      density_index: '72',
      turbidity: 'High',
      bay: 'Loading Bay 03',
      proof: 'Saved',
      report: 'Generated',
      fsm_state: 'S3',
      dna_source: 'SOURCE-B',
      temperature: '26.4 °C',
      device_id: 'NURDLE-001',
    },
    visual: { spill: 0.62, pipePellets: 0.45, cartridge: 1, valve: 1, alarm: 1, vapor: 0.58, ai: 1, report: 0.35 },
  },
  {
    code: 'AUDIT',
    title: 'Evidence and accountability',
    summary: 'An audit-ready report connects location, event type, captured mass, proof image, and maintenance action.',
    tone: 'green',
    duration: 11000,
    camera: [7.4, 4.8, 6.8],
    target: [2.3, 1.1, -1.1],
    dashboard: {
      state: 'Green / Reported',
      pellet: '126',
      gas_ppm: '120 ppm',
      valve: 'Closed',
      mass: '18.6 g',
      density_index: '72',
      turbidity: 'High logged',
      bay: 'Loading Bay 03',
      proof: 'Saved',
      report: 'Generated',
      fsm_state: 'S3',
      dna_source: 'SOURCE-B',
      temperature: '26.4 °C',
      device_id: 'NURDLE-001',
    },
    visual: { spill: 0.2, pipePellets: 0.12, cartridge: 1, valve: 1, alarm: 0.2, vapor: 0.18, ai: 0.72, report: 1 },
  },
];

const dom = {
  canvas: document.querySelector('#world'),
  sceneButtons: document.querySelector('#sceneButtons'),
  sceneCode: document.querySelector('#sceneCode'),
  sceneTitle: document.querySelector('#sceneTitle'),
  sceneSummary: document.querySelector('#sceneSummary'),
  playToggle: document.querySelector('#playToggle'),
  resetScene: document.querySelector('#resetScene'),
  speedRange: document.querySelector('#speedRange'),
  progressBar: document.querySelector('#progressBar'),
  statusCard: document.querySelector('#statusCard'),
  stateDot: document.querySelector('#stateDot'),
  reportPanel: document.querySelector('#reportPanel'),
  metrics: {
    state: document.querySelector('#stateValue'),
    pellet: document.querySelector('#pelletValue'),
    gas_ppm: document.querySelector('#vocValue'),
    valve: document.querySelector('#valveValue'),
    mass: document.querySelector('#massValue'),
    density_index: document.querySelector('#confidenceValue'),
    turbidity: document.querySelector('#turbidityValue'),
    timestamp: document.querySelector('#timestampValue'),
    bay: document.querySelector('#bayValue'),
    proof: document.querySelector('#proofValue'),
    report: document.querySelector('#reportValue'),
    fsm_state: document.querySelector('#fsmStateValue'),
    dna_source: document.querySelector('#dnaSourceValue'),
    temperature: document.querySelector('#temperatureValue'),
    device_id: document.querySelector('#deviceIdValue'),
  },
};

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
  renderer.outputEncoding = THREE.sRGBEncoding;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07110f);
scene.fog = new THREE.Fog(0x07110f, 24, 56);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(15, 10, 16);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 4;
controls.maxDistance = 34;
controls.target.set(-1, 1.4, 1);
controls.addEventListener('start', () => {
  autoCamera = false;
});

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let activeScene = 0;
let sceneTimer = 0;
let playing = true;
let speed = 1;
let autoCamera = true;

const visual = {
  spill: 0,
  pipePellets: 0,
  cartridge: 0,
  valve: 0,
  alarm: 0,
  vapor: 0,
  ai: 0,
  report: 0,
};

const world = new THREE.Group();
scene.add(world);

const materials = {
  concrete: new THREE.MeshStandardMaterial({ color: 0xb6bec3, roughness: 0.88, metalness: 0.02 }),
  darkConcrete: new THREE.MeshStandardMaterial({ color: 0x1a2025, roughness: 0.95 }),
  paintedSteel: new THREE.MeshStandardMaterial({ color: 0x394048, roughness: 0.5, metalness: 0.45 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.42, metalness: 0.72 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe6a83a, roughness: 0.55, metalness: 0.22 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc8342f, roughness: 0.4, metalness: 0.22, emissive: 0x4a0808 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2bb874, roughness: 0.4, metalness: 0.2, emissive: 0x0a4828 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xbdefff,
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: 0.24,
    transmission: 0.42,
    thickness: 0.18,
  }),
  pipeWater: new THREE.MeshStandardMaterial({
    color: 0x5fd6ff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.2,
    metalness: 0,
    emissive: 0x0d4f65,
  }),
  ocean: new THREE.MeshStandardMaterial({
    color: 0x247f92,
    transparent: true,
    opacity: 0.72,
    roughness: 0.28,
    metalness: 0,
    emissive: 0x052936,
  }),
  nurdle: new THREE.MeshStandardMaterial({ color: 0xf6f7ef, roughness: 0.62 }),
  nurdleHot: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, emissive: 0x2b2406 }),
  cartridgeGlass: new THREE.MeshPhysicalMaterial({
    color: 0xc9fff3,
    transparent: true,
    opacity: 0.34,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.3,
  }),
};

const dynamic = {};

setupLights();
buildEnvironment();
buildControls();
loadDeviceModel();
setScene(0, true);
animate();

function setupLights() {
  // Soft cool ambient — keeps dark machinery from going pitch black
  const hemi = new THREE.HemisphereLight(0xc8d8de, 0x1a2025, 0.7);
  scene.add(hemi);

  // Key sun — toned down so light floor doesn't blow out
  const sun = new THREE.DirectionalLight(0xfff5e6, 1.05);
  sun.position.set(-9, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  scene.add(sun);

  // Teal rim light from behind — separates dark machinery silhouettes
  const rim = new THREE.DirectionalLight(0x44e0c8, 0.55);
  rim.position.set(7, 5, -12);
  scene.add(rim);

  // Loading-bay overhead floodlight (cyan) — reduced so it doesn't overexpose
  const bayLight = new THREE.PointLight(0x5fd6ff, 11, 12, 2);
  bayLight.position.set(-4.4, 5.1, -1.4);
  scene.add(bayLight);

  dynamic.alarmLight = new THREE.PointLight(0xff5a52, 0, 16, 2);
  dynamic.alarmLight.position.set(0.8, 4.2, -1.5);
  scene.add(dynamic.alarmLight);
}

function buildEnvironment() {
  const pad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.28, 18), materials.concrete);
  pad.position.set(-1, -0.16, 0);
  pad.receiveShadow = true;
  world.add(pad);

  const grid = new THREE.GridHelper(28, 28, 0x4a5560, 0x6c7882);
  grid.position.y = 0.01;
  grid.material.opacity = 0.45;
  grid.material.transparent = true;
  world.add(grid);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(32, 16, 32, 8), materials.ocean);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.03, 12.2);
  sea.receiveShadow = true;
  world.add(sea);
  dynamic.sea = sea;

  const coastWall = box([24, 0.7, 0.35], [0, 0.28, 8.1], materials.darkConcrete);
  world.add(coastWall);

  buildSilos();
  buildTruckBay();
  buildPipeAndDeviceArea();
  buildDrainage();
  buildControlRoom();
  buildParticles();
  buildLabels();
}

function buildSilos() {
  const siloMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3845, roughness: 0.45, metalness: 0.55 });
  const capMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.4, metalness: 0.68 });

  [-8.6, -6.4].forEach((x, index) => {
    const silo = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 5.3, 40), siloMaterial);
    body.position.y = 2.95;
    body.castShadow = true;
    body.receiveShadow = true;
    silo.add(body);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.84, 1.05, 40), capMaterial);
    cone.position.y = 0.82;
    cone.rotation.x = Math.PI;
    cone.castShadow = true;
    silo.add(cone);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 0.38, 40), capMaterial);
    lid.position.y = 5.8;
    lid.castShadow = true;
    silo.add(lid);

    const ladder = box([0.08, 4.6, 0.08], [0.95, 3.15, 0], materials.steel);
    silo.add(ladder);

    const pipe = cylinderBetween(new THREE.Vector3(0, 0.32, 0), new THREE.Vector3(0, -0.7, 1.45), 0.12, materials.steel);
    silo.add(pipe);

    silo.position.set(x, 0, -3.4 - index * 0.28);
    world.add(silo);
  });

  const overhead = cylinderBetween(new THREE.Vector3(-7.5, 5.3, -3.4), new THREE.Vector3(-5.1, 4.25, -0.1), 0.13, materials.steel);
  world.add(overhead);
}

function buildTruckBay() {
  const canopy = box([5.2, 0.18, 3.2], [-5.1, 3.25, -0.2], materials.steel);
  world.add(canopy);

  for (const x of [-7.3, -2.9]) {
    for (const z of [-1.6, 1.1]) {
      world.add(box([0.16, 3.1, 0.16], [x, 1.55, z], materials.steel));
    }
  }

  const truck = new THREE.Group();
  truck.add(box([3.3, 1.3, 1.25], [0, 0.82, 0], new THREE.MeshStandardMaterial({ color: 0x1f2a35, roughness: 0.62, metalness: 0.22 })));
  truck.add(box([1.1, 1.18, 1.18], [2.2, 0.74, 0], new THREE.MeshStandardMaterial({ color: 0x1a4858, roughness: 0.48, metalness: 0.28 })));
  for (const x of [-1.1, 1.0, 2.35]) {
    for (const z of [-0.68, 0.68]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0x111817, roughness: 0.72 }));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.28, z);
      wheel.castShadow = true;
      truck.add(wheel);
    }
  }
  truck.position.set(-5.2, 0, 1.1);
  truck.rotation.y = -0.06;
  world.add(truck);

  const bag = box([0.7, 0.82, 0.42], [-4.9, 3.9, -0.3], new THREE.MeshStandardMaterial({ color: 0x8a8676, roughness: 0.85 }));
  bag.rotation.z = 0.2;
  dynamic.rupturedBag = bag;
  world.add(bag);
}

function buildPipeAndDeviceArea() {
  const pipeOuter = cylinderBetween(new THREE.Vector3(-8.5, 1.45, -0.15), new THREE.Vector3(7.6, 1.45, -0.15), 0.48, materials.glass, true);
  world.add(pipeOuter);

  const waterCore = cylinderBetween(new THREE.Vector3(-8.3, 1.45, -0.15), new THREE.Vector3(7.4, 1.45, -0.15), 0.28, materials.pipeWater.clone(), true);
  world.add(waterCore);
  dynamic.waterCore = waterCore;

  const inlet = cylinderBetween(new THREE.Vector3(-9.1, 1.45, -0.15), new THREE.Vector3(-8.45, 1.45, -0.15), 0.55, materials.steel);
  const outlet = cylinderBetween(new THREE.Vector3(7.55, 1.45, -0.15), new THREE.Vector3(9.1, 1.45, -0.15), 0.55, materials.steel);
  world.add(inlet, outlet);

  const deviceShell = new THREE.Group();
  deviceShell.add(box([2.05, 1.46, 1.58], [0, 1.45, -0.15], new THREE.MeshStandardMaterial({
    color: 0x1f3833,
    roughness: 0.36,
    metalness: 0.38,
    transparent: true,
    opacity: 0.66,
  })));
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 14, 54), materials.green);
  ringA.rotation.y = Math.PI / 2;
  ringA.position.set(-0.82, 1.45, -0.15);
  const ringB = ringA.clone();
  ringB.position.x = 0.82;
  deviceShell.add(ringA, ringB);
  world.add(deviceShell);
  dynamic.deviceShell = deviceShell;

  const cameraHead = new THREE.Group();
  cameraHead.add(box([0.7, 0.34, 0.42], [-1.25, 2.58, -0.15], materials.steel));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x0b1211, roughness: 0.2, metalness: 0.2, emissive: 0x0b5364 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(-1.25, 2.48, 0.08);
  cameraHead.add(lens);
  world.add(cameraHead);

  const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 1.4, 1.1));
  dynamic.aiFrame = new THREE.LineSegments(frameGeometry, new THREE.LineBasicMaterial({ color: 0x43e08a, transparent: true, opacity: 0 }));
  dynamic.aiFrame.position.set(-3.7, 1.45, -0.05);
  world.add(dynamic.aiFrame);

  const valveGroup = new THREE.Group();
  const valveBody = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 16, 48), materials.red);
  valveBody.rotation.y = Math.PI / 2;
  valveGroup.add(valveBody);
  dynamic.valveDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.08, 48), new THREE.MeshStandardMaterial({
    color: 0xff5a52,
    roughness: 0.36,
    metalness: 0.3,
    emissive: 0x2d0000,
  }));
  dynamic.valveDisc.rotation.z = Math.PI / 2;
  valveGroup.add(dynamic.valveDisc);
  const handle = box([0.12, 0.78, 0.12], [0, 0.9, 0], materials.red);
  valveGroup.add(handle);
  valveGroup.position.set(0.9, 1.45, -0.15);
  world.add(valveGroup);
  dynamic.valveGroup = valveGroup;

  buildCartridge();
  buildAlarmTower();
}

function buildCartridge() {
  const cartridge = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.75, 36, 1, true), materials.cartridgeGlass);
  body.castShadow = true;
  body.rotation.z = Math.PI / 2;
  cartridge.add(body);

  const meshMaterial = new THREE.MeshStandardMaterial({
    color: 0xdaf7ed,
    roughness: 0.38,
    metalness: 0.4,
    transparent: true,
    opacity: 0.76,
    wireframe: true,
  });
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 28), meshMaterial);
  filter.rotation.z = Math.PI / 2;
  filter.position.x = -0.28;
  cartridge.add(filter);

  const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.13, 36), materials.steel);
  const capB = capA.clone();
  capA.rotation.z = Math.PI / 2;
  capB.rotation.z = Math.PI / 2;
  capA.position.x = -0.94;
  capB.position.x = 0.94;
  cartridge.add(capA, capB);

  cartridge.position.set(2.25, 0.72, -1.82);
  world.add(cartridge);
  dynamic.cartridge = cartridge;

  const tubeIn = cylinderBetween(new THREE.Vector3(1.05, 1.2, -0.25), new THREE.Vector3(1.55, 0.72, -1.82), 0.12, materials.glass, true);
  const tubeOut = cylinderBetween(new THREE.Vector3(3.08, 0.72, -1.82), new THREE.Vector3(4.0, 1.2, -0.25), 0.1, materials.glass, true);
  world.add(tubeIn, tubeOut);
  dynamic.divertTubes = [tubeIn, tubeOut];
}

function buildAlarmTower() {
  const tower = new THREE.Group();
  tower.add(box([0.08, 1.2, 0.08], [0, 0.6, 0], materials.steel));
  const redBulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({
    color: 0xff5a52,
    roughness: 0.18,
    metalness: 0.05,
    emissive: 0x220000,
  }));
  redBulb.position.y = 1.33;
  tower.add(redBulb);
  tower.position.set(0.8, 1.45, -1.55);
  world.add(tower);
  dynamic.alarmBulb = redBulb;
}

function buildDrainage() {
  const trenchMat = new THREE.MeshStandardMaterial({ color: 0x283330, roughness: 0.92 });
  const trench = box([1.4, 0.22, 8.6], [-4.65, 0.03, 3.25], trenchMat);
  world.add(trench);
  const channelWater = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 8.2), materials.pipeWater.clone());
  channelWater.rotation.x = -Math.PI / 2;
  channelWater.position.set(-4.65, 0.18, 3.25);
  world.add(channelWater);
  dynamic.channelWater = channelWater;

  const outletPipe = cylinderBetween(new THREE.Vector3(-4.65, 0.42, 7.0), new THREE.Vector3(-2.2, 0.42, 8.6), 0.32, materials.steel);
  world.add(outletPipe);
  const outletWater = cylinderBetween(new THREE.Vector3(-4.45, 0.42, 7.13), new THREE.Vector3(-2.02, 0.42, 8.72), 0.2, materials.pipeWater.clone(), true);
  world.add(outletWater);
  dynamic.outletWater = outletWater;
}

function buildControlRoom() {
  const room = new THREE.Group();
  room.add(box([3.2, 2.2, 2.2], [0, 1.1, 0], new THREE.MeshStandardMaterial({ color: 0x36433f, roughness: 0.68, metalness: 0.08 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.0), new THREE.MeshBasicMaterial({ color: 0x07110f }));
  screen.position.set(-1.62, 1.55, -0.1);
  screen.rotation.y = -Math.PI / 2;
  room.add(screen);
  dynamic.controlScreen = screen;

  const graph = new THREE.Group();
  for (let i = 0; i < 6; i += 1) {
    const bar = box([0.045, 0.16 + i * 0.045, 0.04], [-1.66, 1.2 + i * 0.02, -0.55 + i * 0.17], materials.green);
    graph.add(bar);
  }
  room.add(graph);
  dynamic.screenGraph = graph;

  room.position.set(7.8, 0, -4.1);
  world.add(room);
}

function buildParticles() {
  dynamic.spillPellets = makePelletInstancer(150, materials.nurdleHot);
  dynamic.spillPellets.userData.points = makeSeededPoints(150, 3);
  world.add(dynamic.spillPellets);

  dynamic.pipePellets = makePelletInstancer(110, materials.nurdle);
  dynamic.pipePellets.userData.points = makeSeededPoints(110, 7);
  world.add(dynamic.pipePellets);

  dynamic.cartridgePellets = makePelletInstancer(90, materials.nurdleHot);
  dynamic.cartridgePellets.userData.points = makeSeededPoints(90, 11);
  world.add(dynamic.cartridgePellets);

  dynamic.flowDrops = makeFlowInstancer(95);
  dynamic.flowDrops.userData.points = makeSeededPoints(95, 17);
  world.add(dynamic.flowDrops);

  const vaporTexture = makeCircleTexture('rgba(255,184,76,0.75)');
  const vaporMaterial = new THREE.SpriteMaterial({
    map: vaporTexture,
    color: 0xffb84c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  dynamic.vaporSprites = [];
  const vaporSeeds = makeSeededPoints(34, 23);
  vaporSeeds.forEach((seed) => {
    const sprite = new THREE.Sprite(vaporMaterial.clone());
    sprite.position.set(-4.8 + seed.x * 1.1, 1.0 + seed.y * 1.7, -0.6 + seed.z * 0.9);
    sprite.scale.setScalar(0.22 + seed.w * 0.3);
    sprite.userData.seed = seed;
    world.add(sprite);
    dynamic.vaporSprites.push(sprite);
  });
}

function buildLabels() {
  createLabel('Polymer storage silos', [-7.6, 6.55, -3.7], 2.7);
  createLabel('Loading Bay 03', [-5.2, 3.95, 1.55], 2.0);
  createLabel('NurdleDNA inline unit', [0.2, 3.02, -0.2], 2.3);
  createLabel('Evidence cartridge', [2.45, 1.72, -2.1], 2.1);
  createLabel('Stormwater outlet to coast', [-2.3, 1.15, 8.7], 2.45);
  createLabel('Control room dashboard', [7.7, 2.75, -4.25], 2.35);
}

function buildControls() {
  scenes.forEach((profile, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scene-button';
    button.dataset.scene = String(index);
    button.innerHTML = `${String(index + 1).padStart(2, '0')}<span>${profile.code}</span>`;
    button.addEventListener('click', () => setScene(index, true));
    dom.sceneButtons.append(button);
  });

  const pausedOverlay = document.querySelector('#pausedOverlay');
  const speedValue = document.querySelector('#speedValue');

  dom.playToggle.addEventListener('click', () => {
    playing = !playing;
    dom.playToggle.textContent = playing ? 'Pause' : 'Play';
    dom.playToggle.classList.toggle('is-paused', !playing);
    if (pausedOverlay) pausedOverlay.hidden = playing;
  });

  dom.resetScene.addEventListener('click', () => {
    setScene(0, true);
    autoCamera = true;
  });

  dom.speedRange.addEventListener('input', () => {
    speed = Number(dom.speedRange.value);
    if (speedValue) speedValue.textContent = speed.toFixed(1) + '×';
  });

  document.querySelectorAll('.trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.jump);
      if (!Number.isNaN(i) && i >= 0 && i < scenes.length) setScene(i, true);
    });
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove);
}

function loadDeviceModel() {
  try {
    const binary = atob(window.NURDLE_DNA_STL_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const geometry = new THREE.STLLoader().parse(bytes.buffer);
    installDeviceGeometry(geometry);
  } catch (error) {
    const fallback = new THREE.Mesh(new THREE.TorusKnotGeometry(0.65, 0.12, 96, 12), materials.green);
    fallback.position.set(0, 1.45, -0.15);
    fallback.scale.set(1.35, 1, 1);
    fallback.castShadow = true;
    world.add(fallback);
    dynamic.deviceMesh = fallback;
  }
}

function installDeviceGeometry(geometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const box3 = geometry.boundingBox;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box3.getCenter(center);
  box3.getSize(size);
  geometry.translate(-center.x, -center.y, -center.z);

  const material = new THREE.MeshStandardMaterial({
    color: 0x2bb874,
    roughness: 0.32,
    metalness: 0.52,
    emissive: 0x0a4828,
    transparent: true,
    opacity: 0.97,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const scale = 2.95 / Math.max(size.x, size.y, size.z);
  mesh.scale.setScalar(scale);
  mesh.position.set(0, 1.45, -0.15);
  mesh.rotation.set(0, 0, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  dynamic.deviceMesh = mesh;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (playing) {
    sceneTimer += dt * 1000 * speed;
    const duration = scenes[activeScene].duration;
    if (sceneTimer >= duration) {
      setScene((activeScene + 1) % scenes.length, true);
    }
  }

  updateVisualState(dt);
  updateWorld(dt, elapsed);
  updateCamera(dt);
  controls.update();
  renderer.render(scene, camera);
}

function updateVisualState(dt) {
  const target = scenes[activeScene].visual;
  const t = 1 - Math.exp(-dt * 3.2);
  for (const key of Object.keys(visual)) {
    visual[key] = THREE.MathUtils.lerp(visual[key], target[key], t);
  }
}

function updateWorld(dt, elapsed) {
  if (dynamic.deviceMesh) {
    dynamic.deviceMesh.rotation.y = visual.alarm * Math.sin(clock.elapsedTime * 1.2) * 0.06;
  }

  if (dynamic.rupturedBag) {
    dynamic.rupturedBag.rotation.z = 0.2 + visual.spill * Math.sin(elapsed * 5) * 0.09;
  }

  if (dynamic.valveDisc) {
    dynamic.valveDisc.rotation.y = THREE.MathUtils.lerp(Math.PI / 2, 0, visual.valve);
  }

  if (dynamic.valveGroup) {
    dynamic.valveGroup.scale.setScalar(1 + visual.alarm * Math.sin(elapsed * 12) * 0.025);
  }

  if (dynamic.alarmBulb) {
    const pulse = Math.max(0, Math.sin(elapsed * 10));
    dynamic.alarmBulb.material.emissive.setHex(visual.alarm > 0.05 ? 0x9c0803 : 0x220000);
    dynamic.alarmBulb.scale.setScalar(1 + visual.alarm * pulse * 0.32);
    dynamic.alarmLight.intensity = visual.alarm * (18 + pulse * 36);
  }

  if (dynamic.aiFrame) {
    dynamic.aiFrame.material.opacity = visual.ai * (0.45 + Math.max(0, Math.sin(elapsed * 8)) * 0.45);
    dynamic.aiFrame.scale.setScalar(1 + visual.ai * Math.sin(elapsed * 5) * 0.025);
  }

  if (dynamic.waterCore) {
    dynamic.waterCore.material.opacity = 0.42 - visual.valve * 0.22;
  }

  if (dynamic.channelWater) {
    dynamic.channelWater.material.opacity = 0.35 + visual.spill * 0.2;
  }

  if (dynamic.outletWater) {
    dynamic.outletWater.material.opacity = 0.36 - visual.valve * 0.2;
  }

  if (dynamic.sea) {
    dynamic.sea.position.y = 0.03 + Math.sin(elapsed * 1.4) * 0.025;
  }

  if (dynamic.screenGraph) {
    dynamic.screenGraph.children.forEach((bar, index) => {
      bar.scale.y = 0.65 + visual.spill * (0.25 + index * 0.12) + visual.report * 0.2;
      bar.material = visual.valve > 0.5 ? materials.red : visual.spill > 0.4 ? materials.yellow : materials.green;
    });
  }

  updateInstancedPellets(elapsed);
  updateFlowDrops(elapsed);
  updateVapor(elapsed);
  updateHudProgress();
}

function updateInstancedPellets(elapsed) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  updateSpillPellets(matrix, position, quaternion, scale, elapsed);
  updatePipePellets(matrix, position, quaternion, scale, elapsed);
  updateCartridgePellets(matrix, position, quaternion, scale, elapsed);
}

function updateSpillPellets(matrix, position, quaternion, scale, elapsed) {
  const mesh = dynamic.spillPellets;
  const seeds = mesh.userData.points;
  for (let i = 0; i < mesh.count; i += 1) {
    const seed = seeds[i];
    const phase = (elapsed * (0.35 + seed.w * 0.55) + seed.u) % 1;
    const enabled = i / mesh.count < visual.spill;
    const fall = 4.6 * phase;
    position.set(-5.25 + seed.x * 1.4, 3.72 - fall, -0.42 + seed.z * 1.05);
    if (position.y < 0.25) {
      position.y = 0.23 + seed.y * 0.12;
      position.x += phase * 1.1;
    }
    const s = enabled ? 0.055 + seed.w * 0.045 : 0.0001;
    scale.setScalar(s);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function updatePipePellets(matrix, position, quaternion, scale, elapsed) {
  const mesh = dynamic.pipePellets;
  const seeds = mesh.userData.points;
  for (let i = 0; i < mesh.count; i += 1) {
    const seed = seeds[i];
    const phase = (elapsed * (0.12 + seed.w * 0.22) + seed.u) % 1;
    const enabled = i / mesh.count < visual.pipePellets;
    const x = THREE.MathUtils.lerp(-6.5, 1.2, phase);
    const angle = seed.v * Math.PI * 2;
    position.set(x, 1.45 + Math.sin(angle) * 0.2, -0.15 + Math.cos(angle) * 0.2);
    const s = enabled ? 0.045 + seed.w * 0.035 : 0.0001;
    scale.setScalar(s);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function updateCartridgePellets(matrix, position, quaternion, scale, elapsed) {
  const mesh = dynamic.cartridgePellets;
  const seeds = mesh.userData.points;
  for (let i = 0; i < mesh.count; i += 1) {
    const seed = seeds[i];
    const enabled = i / mesh.count < visual.cartridge;
    const radius = Math.sqrt(seed.u) * 0.34;
    const angle = seed.v * Math.PI * 2;
    position.set(
      2.15 + (seed.x * 0.8),
      0.72 + Math.sin(angle) * radius * 0.72 + seed.y * 0.14,
      -1.82 + Math.cos(angle) * radius,
    );
    const s = enabled ? 0.048 + seed.w * 0.04 + Math.sin(elapsed * 7 + seed.u * 5) * 0.004 : 0.0001;
    scale.setScalar(Math.max(0.0001, s));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function updateFlowDrops(elapsed) {
  const mesh = dynamic.flowDrops;
  const seeds = mesh.userData.points;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const activeFlow = 0.96 - visual.valve * 0.54;

  for (let i = 0; i < mesh.count; i += 1) {
    const seed = seeds[i];
    const phase = (elapsed * (0.2 + seed.w * 0.28) + seed.u) % 1;
    const x = THREE.MathUtils.lerp(-8.0, 7.1, phase);
    const angle = seed.v * Math.PI * 2;
    position.set(x, 1.45 + Math.sin(angle) * 0.18, -0.15 + Math.cos(angle) * 0.18);
    const s = activeFlow * (0.035 + seed.w * 0.026);
    scale.setScalar(Math.max(0.0001, s));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function updateVapor(elapsed) {
  dynamic.vaporSprites.forEach((sprite, index) => {
    const seed = sprite.userData.seed;
    sprite.position.y += Math.sin(elapsed * 1.2 + index) * 0.0016;
    sprite.position.x += Math.sin(elapsed * 0.8 + index * 0.3) * 0.001;
    sprite.material.opacity = visual.vapor * (0.18 + seed.w * 0.32);
    sprite.scale.setScalar((0.22 + seed.w * 0.34) * (1 + visual.vapor * Math.sin(elapsed * 2 + seed.u * 8) * 0.16));
  });
}

function updateCamera(dt) {
  if (!autoCamera) {
    return;
  }

  const profile = scenes[activeScene];
  const targetPosition = new THREE.Vector3(...profile.camera);
  const targetLook = new THREE.Vector3(...profile.target);
  const t = 1 - Math.exp(-dt * 1.45);
  camera.position.lerp(targetPosition, t);
  controls.target.lerp(targetLook, t);
}

function updateHudProgress() {
  const profile = scenes[activeScene];
  const progress = Math.min(1, sceneTimer / profile.duration);
  dom.progressBar.style.width = `${progress * 100}%`;
}

function startTimestampClock(active) {
  clearInterval(window._tsClock);
  if (!active) { dom.metrics.timestamp.textContent = '--:--:--'; return; }
  function tick() {
    const d = new Date();
    dom.metrics.timestamp.textContent =
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
  }
  tick();
  window._tsClock = setInterval(tick, 1000);
}

function setScene(index, moveCamera = false) {
  activeScene = index;
  sceneTimer = 0;
  const profile = scenes[activeScene];
  dom.sceneCode.textContent = profile.code;
  dom.sceneTitle.textContent = profile.title;
  dom.sceneSummary.textContent = profile.summary;
  dom.metrics.state.textContent = profile.dashboard.state;
  dom.metrics.pellet.textContent = profile.dashboard.pellet;
  dom.metrics.gas_ppm.textContent = profile.dashboard.gas_ppm;
  dom.metrics.valve.textContent = profile.dashboard.valve;
  dom.metrics.mass.textContent = profile.dashboard.mass;
  dom.metrics.density_index.textContent = profile.dashboard.density_index;
  dom.metrics.turbidity.textContent = profile.dashboard.turbidity;
  dom.metrics.bay.textContent = profile.dashboard.bay;
  dom.metrics.proof.textContent = profile.dashboard.proof;
  dom.metrics.report.textContent = profile.dashboard.report;
  dom.metrics.fsm_state.textContent = profile.dashboard.fsm_state;
  dom.metrics.dna_source.textContent = profile.dashboard.dna_source;
  if (dom.metrics.temperature) dom.metrics.temperature.textContent = profile.dashboard.temperature || '--';
  dom.metrics.device_id.textContent = profile.dashboard.device_id;
  startTimestampClock(activeScene > 0);

  dom.statusCard.classList.remove('tone-green', 'tone-amber', 'tone-red', 'tone-cyan');
  dom.statusCard.classList.add(`tone-${profile.tone}`);
  dom.reportPanel.classList.toggle('is-muted', profile.visual.report < 0.9);

  [...dom.sceneButtons.children].forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === activeScene);
  });

  if (moveCamera) {
    autoCamera = true;
  }
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function box(size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(start, end, radius, material, openEnded = false) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 40, 1, openEnded);
  const mesh = new THREE.Mesh(geometry, material);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePelletInstancer(count, material) {
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

function makeFlowInstancer(count) {
  const geometry = new THREE.SphereGeometry(1, 10, 6);
  const material = new THREE.MeshBasicMaterial({ color: 0x8feeff, transparent: true, opacity: 0.62 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

function makeSeededPoints(count, salt) {
  let seed = salt * 9973;
  const points = [];
  for (let i = 0; i < count; i += 1) {
    seed = (seed * 16807) % 2147483647;
    const a = (seed - 1) / 2147483646;
    seed = (seed * 16807) % 2147483647;
    const b = (seed - 1) / 2147483646;
    seed = (seed * 16807) % 2147483647;
    const c = (seed - 1) / 2147483646;
    seed = (seed * 16807) % 2147483647;
    const d = (seed - 1) / 2147483646;
    points.push({
      x: a - 0.5,
      y: b - 0.5,
      z: c - 0.5,
      w: d,
      u: a,
      v: b,
    });
  }
  return points;
}

function makeCircleTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(48, 48, 4, 48, 48, 45);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.48, 'rgba(255,184,76,0.32)');
  gradient.addColorStop(1, 'rgba(255,184,76,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);
  return new THREE.CanvasTexture(canvas);
}

function createLabel(text, position, width) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7, 17, 15, 0.78)';
  roundRect(ctx, 12, 20, 488, 74, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(95, 214, 255, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 12, 20, 488, 74, 14);
  ctx.stroke();
  ctx.fillStyle = '#ecf7f1';
  ctx.font = '700 34px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 58, 448);

  const texture = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }));
  sprite.position.set(position[0], position[1], position[2]);
  sprite.scale.set(width, width * 0.25, 1);
  world.add(sprite);
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Firebase live data — overwrites demo scene values when device is online.
// Replace all REPLACE_ME values with your Firebase project credentials.
(function initFirebase() {
  const firebaseConfig = {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    databaseURL: 'https://REPLACE_ME-default-rtdb.firebaseio.com',
    projectId: 'REPLACE_ME',
  };

  if (typeof firebase === 'undefined' || firebaseConfig.apiKey === 'REPLACE_ME') return;

  try {
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    db.ref('devices/NURDLE-001').on('value', function (snapshot) {
      const data = snapshot.val();
      if (!data) return;
      if (dom.metrics.density_index) dom.metrics.density_index.textContent = data.density_index != null ? String(data.density_index) : '--';
      if (dom.metrics.gas_ppm) dom.metrics.gas_ppm.textContent = data.gas_ppm != null ? data.gas_ppm + ' ppm' : '--';
      if (dom.metrics.fsm_state) dom.metrics.fsm_state.textContent = data.fsm_state || '--';
      if (dom.metrics.dna_source) dom.metrics.dna_source.textContent = data.dna_source || '--';
      if (dom.metrics.temperature) dom.metrics.temperature.textContent = data.temperature != null ? data.temperature + ' °C' : '--';
      if (dom.metrics.valve) dom.metrics.valve.textContent = data.valve || '--';
      if (dom.metrics.mass) dom.metrics.mass.textContent = data.grams_captured != null ? data.grams_captured + ' g' : '--';
      if (dom.metrics.timestamp) {
        clearInterval(window._tsClock);
        dom.metrics.timestamp.textContent = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--:--:--';
      }
    });
  } catch (e) {
    console.warn('NurdleDNA Firebase init failed:', e.message);
  }
}());
