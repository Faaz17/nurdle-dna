(function () {
  const viewer = document.querySelector('#cadModelCanvas');
  if (!viewer || !window.THREE || !window.NURDLE_DNA_GLB_BASE64) return;

  const frame = viewer.closest('.cad-viewer') || viewer.parentElement || viewer;
  const renderer = new THREE.WebGLRenderer({ canvas: viewer, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xfbfffe, 7, 18);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(3.4, 2.35, 4.1);

  const controls = new THREE.OrbitControls(camera, viewer);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  controls.minDistance = 2.4;
  controls.maxDistance = 7;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9eef2, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-4, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const rim = new THREE.PointLight(0x44c986, 22, 10, 2);
  rim.position.set(3, 2, 2.6);
  scene.add(rim);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.7, 0.08, 96),
    new THREE.MeshStandardMaterial({ color: 0xf5fbfc, roughness: 0.62, metalness: 0.08 })
  );
  base.position.y = -1.08;
  base.receiveShadow = true;
  scene.add(base);

  try {
    const src = window.NURDLE_DNA_COLORED_GLB_BASE64 || window.NURDLE_DNA_GLB_BASE64;
    const { geometry, sceneMatrix } = parseGlbGeometry(src);
    geometry.computeBoundingBox();

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.boundingBox.getSize(size);
    geometry.translate(-center.x, -center.y, -center.z);

    const scale = 2.8 / Math.max(size.x, size.y, size.z);
    const glbRoot = new THREE.Group();
    glbRoot.applyMatrix4(sceneMatrix);

    const hasVertexColors = geometry.hasAttribute('color');
    const body = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
      color: hasVertexColors ? 0xffffff : 0x7d856b,
      roughness: 0.46,
      metalness: 0.16,
      clearcoat: 0.2,
      clearcoatRoughness: 0.36,
      vertexColors: hasVertexColors,
    }));
    body.scale.setScalar(scale);
    body.castShadow = true;
    body.receiveShadow = true;

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 24),
      new THREE.LineBasicMaterial({ color: 0x4d5544, transparent: true, opacity: 0.38 })
    );
    edges.scale.setScalar(scale);

    glbRoot.add(body, edges);
    modelRoot.add(glbRoot);
    modelRoot.rotation.set(-0.2, 0.42, 0.02);
  } catch (error) {
    console.warn('NurdleDNA GLB CAD design could not be loaded.', error);
  }

  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0x44c986,
    roughness: 0.32,
    metalness: 0.16,
    emissive: 0x073115,
  });

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.035), markerMaterial);
    marker.position.set(Math.cos(angle) * 1.46, -1.0, Math.sin(angle) * 1.46);
    marker.rotation.y = -angle;
    scene.add(marker);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(animate);

  function resize() {
    const rect = frame.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    modelRoot.position.y = Math.sin(performance.now() * 0.0012) * 0.035;
    renderer.render(scene, camera);
  }

  function parseGlbGeometry(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const view = new DataView(bytes.buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
      throw new Error('Invalid GLB 2.0 file.');
    }

    let json = null;
    let bin = null;
    let offset = 12;
    while (offset < bytes.byteLength) {
      const chunkLength = view.getUint32(offset, true);
      const chunkType = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      );
      const chunkStart = offset + 8;

      if (chunkType === 'JSON') {
        json = JSON.parse(new TextDecoder().decode(bytes.slice(chunkStart, chunkStart + chunkLength)));
      } else if (chunkType === 'BIN\0') {
        bin = bytes.buffer.slice(chunkStart, chunkStart + chunkLength);
      }

      offset = chunkStart + chunkLength;
    }

    if (!json || !bin) throw new Error('GLB missing JSON or BIN chunk.');

    const primitive = json.meshes[0].primitives[0];
    const geometry = new THREE.BufferGeometry();
    const position = readAccessor(json, bin, primitive.attributes.POSITION);
    geometry.setAttribute('position', new THREE.BufferAttribute(position.array, position.itemSize));

    if (primitive.attributes.COLOR_0 !== undefined) {
      const color = readAccessor(json, bin, primitive.attributes.COLOR_0);
      geometry.setAttribute('color', new THREE.BufferAttribute(color.array, color.itemSize));
    }

    if (primitive.indices !== undefined) {
      const indices = readAccessor(json, bin, primitive.indices);
      geometry.setIndex(new THREE.BufferAttribute(indices.array, 1));
    }

    geometry.computeVertexNormals();

    const sceneNodeIndex = json.scenes?.[json.scene || 0]?.nodes?.[0];
    const sceneMatrixArray = sceneNodeIndex !== undefined ? json.nodes?.[sceneNodeIndex]?.matrix : null;
    const sceneMatrix = new THREE.Matrix4();
    if (sceneMatrixArray) sceneMatrix.fromArray(sceneMatrixArray);

    return { geometry, sceneMatrix };
  }

  function readAccessor(gltf, buffer, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const component = componentInfo(accessor.componentType);
    const itemSize = typeItemSize(accessor.type);
    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const byteStride = bufferView.byteStride || itemSize * component.bytes;
    const packedStride = itemSize * component.bytes;

    if (byteStride === packedStride) {
      return {
        array: new component.TypedArray(buffer, byteOffset, accessor.count * itemSize),
        itemSize,
      };
    }

    const output = new component.TypedArray(accessor.count * itemSize);
    const source = new DataView(buffer, byteOffset, byteStride * accessor.count);
    for (let i = 0; i < accessor.count; i += 1) {
      for (let j = 0; j < itemSize; j += 1) {
        output[i * itemSize + j] = component.read(source, i * byteStride + j * component.bytes);
      }
    }
    return { array: output, itemSize };
  }

  function componentInfo(componentType) {
    if (componentType === 5126) {
      return { TypedArray: Float32Array, bytes: 4, read: (view, offset) => view.getFloat32(offset, true) };
    }
    if (componentType === 5125) {
      return { TypedArray: Uint32Array, bytes: 4, read: (view, offset) => view.getUint32(offset, true) };
    }
    if (componentType === 5123) {
      return { TypedArray: Uint16Array, bytes: 2, read: (view, offset) => view.getUint16(offset, true) };
    }
    if (componentType === 5121) {
      return { TypedArray: Uint8Array, bytes: 1, read: (view, offset) => view.getUint8(offset) };
    }
    throw new Error(`Unsupported GLB component type: ${componentType}`);
  }

  function typeItemSize(type) {
    return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type] || 1;
  }
}());
