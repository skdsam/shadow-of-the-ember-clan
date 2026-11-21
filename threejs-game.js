import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';

const { Game, dist } = EmberCore;
const game = new Game({ difficulty: 'normal' });
game.loadLevel(5); // Classic C64 Wastelands path-only map

const score = new EmberScore();
const TRACK_MODES = [
  { v: -1, label: 'BGM: AUTO [V]' },
  { v: 3, label: 'BGM: INTRO [V]' },
  { v: 0, label: 'BGM: EXPLORE' },
  { v: 1, label: 'BGM: BATTLE' },
  { v: 2, label: 'BGM: SAFE' },
  { v: 7, label: 'BGM: DANGER' },
  { v: 6, label: 'BGM: ENDING' }
];
let trackIdx = 0, rewardUntil = 0, combatUntil = 0, hitBannerUntil = 0, lastStepFloor = -1, lastRoomKey = '';
let roomDrawProg = 1; // 0 -> 1 progressive C64 scene draw-in animation
let gamePhase = 'title'; // 'title' -> 'prologue' -> 'playing'

const introOverlay = document.getElementById('intro-overlay');
const introImg = document.getElementById('intro-img');
const introBtn = document.getElementById('intro-btn');

function advanceIntro() {
  unlockAudio();
  if (gamePhase === 'title') {
    gamePhase = 'prologue';
    score.setMode('intro', 5);
    introImg.src = 'concepts/03-cinematic-intro.png';
  } else if (gamePhase === 'prologue') {
    gamePhase = 'playing';
    introOverlay.hidden = true;
    score.setMode('level', 5);
  }
}
introBtn.onclick = advanceIntro;

const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#18dc6c');

// Isometric Orthographic Camera
const aspect = viewport.clientWidth / viewport.clientHeight;
const viewSize = 6.0;
const camera = new THREE.OrthographicCamera(
  -viewSize * aspect, viewSize * aspect,
  viewSize, -viewSize,
  0.1, 100
);

// Render at crisp C64-inspired internal pixel resolution (360x225) scaled pixelated!
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(360, 225, false);
renderer.domElement.className = 'webgl';
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // Crisp pixelated shadow edges
viewport.prepend(renderer.domElement);

// Procedural C64 Pixel-Art Textures (NearestFilter)
function makePixelTex(size, drawFn) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const pathTex = makePixelTex(16, (c, s) => {
  c.fillStyle = '#e0e0e0'; c.fillRect(0, 0, s, s);
  c.fillStyle = '#c8c8c8';
  for (let i = 0; i < 14; i++) c.fillRect((i * 7) % s, (i * 11) % s, 2, 1);
  c.fillStyle = '#f4f4f4';
  for (let i = 0; i < 8; i++) c.fillRect((i * 13 + 3) % s, (i * 5 + 2) % s, 1, 1);
});

const grassTex = makePixelTex(32, (c, s) => {
  c.fillStyle = '#18dc6c'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 24; i++) {
    c.fillStyle = i % 3 === 0 ? '#0c8840' : i % 3 === 1 ? '#50f890' : '#000000';
    c.fillRect((i * 11) % s, (i * 7) % s, 1, 2);
  }
});

// High-detail pixel-art billboard textures (trees, cherry blossoms, craggy rocks, bushes, pagoda wall)
function makeSpriteTex(w, h, drawFn) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const treeGreenTex = makeSpriteTex(48, 56, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // Gnarled brown trunk & branches
  px(21, 32, 6, 24, '#8c4818'); px(22, 32, 2, 24, '#c06c28');
  px(15, 24, 6, 10, '#8c4818'); px(27, 22, 6, 12, '#8c4818');
  // Dense layered C64 green pixel foliage clusters
  const cols = ['#004018', '#087830', '#18c858', '#68f888', '#d8f868', '#000000'];
  for (let i = 0; i < 210; i++) {
    const a = (i * 2.39996), rad = Math.sqrt(i / 210) * 20;
    const x = Math.round(24 + Math.cos(a) * rad), y = Math.round(20 + Math.sin(a) * rad * 0.78);
    px(x, y, 2, 2, cols[i % 6]);
  }
});

const treeSakuraTex = makeSpriteTex(48, 56, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(22, 34, 5, 22, '#683018'); px(14, 24, 8, 4, '#683018'); px(26, 20, 8, 4, '#683018');
  const cols = ['#901828', '#e04858', '#ff8090', '#ffffff', '#000000'];
  for (let i = 0; i < 190; i++) {
    const a = (i * 2.39996), rad = Math.sqrt(i / 190) * 19;
    const x = Math.round(24 + Math.cos(a) * rad), y = Math.round(21 + Math.sin(a) * rad * 0.78);
    px(x, y, 2, 2, cols[i % 5]);
  }
});

const craggyBoulderTex = makeSpriteTex(48, 36, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // Cast shadow on ground
  px(10, 29, 34, 6, '#00000088');
  // Craggy faceted C64 pixel boulder
  for (let y = 4; y < 32; y++) {
    const hw = Math.round(Math.sin(((y - 4) / 28) * Math.PI) * 20 + 2);
    for (let x = 22 - hw; x < 22 + hw; x += 2) {
      const shade = x < 18 ? (y < 16 ? '#ffffff' : '#b8b8b8') : x < 26 ? '#707070' : '#181818';
      px(x, y, 2, 2, ((x * 7 + y * 13) % 11 === 0) ? '#000000' : shade);
    }
  }
  px(8, 28, 30, 3, '#000000');
});

const bushTex = makeSpriteTex(28, 20, (c) => {
  const cols = ['#004018', '#088838', '#18d860', '#000000'];
  for (let i = 0; i < 65; i++) {
    const a = (i * 2.39996), rad = Math.sqrt(i / 65) * 11;
    c.fillStyle = cols[i % 4];
    c.fillRect(Math.round(14 + Math.cos(a) * rad), Math.round(12 + Math.sin(a) * rad * 0.55), 2, 2);
  }
});

const pagodaWallTex = makeSpriteTex(64, 48, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // Coral-red temple wall with dark slats and tiled roof eaves (like top-left of screenshot)
  px(4, 12, 56, 36, '#d85048');
  for (let x = 8; x < 56; x += 8) px(x, 14, 3, 32, '#882020');
  px(0, 6, 64, 8, '#303030'); px(2, 4, 60, 4, '#707070');
  px(24, 22, 16, 26, '#141414'); // Dark shrine archway
});

const toriiTex = makeSpriteTex(48, 48, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(4, 8, 40, 4, '#202020'); px(2, 6, 44, 3, '#c83828');
  px(8, 12, 32, 3, '#c83828'); px(12, 12, 5, 34, '#b83020'); px(31, 12, 5, 34, '#b83020');
  px(11, 42, 7, 5, '#282828'); px(30, 42, 7, 5, '#282828');
});

const statueTex = makeSpriteTex(32, 44, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // Stone Jizo / Buddha statue tucked in foliage (like top-left of C64 screenshot)
  px(6, 36, 20, 7, '#585858'); px(8, 18, 16, 18, '#b8b8b8'); px(16, 18, 8, 18, '#787878');
  px(10, 6, 12, 12, '#e0e0e0'); px(16, 6, 6, 12, '#909090');
  px(12, 10, 2, 2, '#181818'); px(18, 10, 2, 2, '#181818'); // Eyes
});

const lanternTex = makeSpriteTex(24, 36, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(8, 28, 8, 6, '#606060'); px(10, 16, 4, 12, '#909090');
  px(6, 10, 12, 7, '#707070'); px(9, 12, 6, 4, '#ffe070'); // Warm flame
  px(4, 7, 16, 3, '#404040'); px(10, 4, 4, 3, '#888888');
});

const bambooTex = makeSpriteTex(32, 52, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  for (const bx of [8, 15, 22]) {
    px(bx, 4, 3, 46, '#287838'); px(bx, 4, 1, 46, '#68d868');
    for (let y = 10; y < 44; y += 10) {
      px(bx - 1, y, 5, 1, '#c8e080');
      px(bx + 3, y - 3, 6, 3, '#18a848');
    }
  }
});

const soilTex = makePixelTex(16, (c, s) => {
  c.fillStyle = '#986020'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 20; i++) {
    c.fillStyle = i % 2 === 0 ? '#683c10' : '#c08038';
    c.fillRect((i * 5) % s, (i * 9) % s, 2, 1);
  }
});

const torchTex = makeSpriteTex(20, 36, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(7, 16, 6, 18, '#505860'); px(8, 16, 2, 18, '#788088');
  px(5, 13, 10, 4, '#303438');
  px(6, 5, 8, 8, '#ff7820'); px(8, 7, 4, 5, '#ffe860');
});

const palaceScreenTex = makeSpriteTex(48, 44, (c) => {
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(2, 6, 44, 36, '#881820'); px(0, 2, 48, 5, '#d8a830');
  px(6, 10, 14, 28, '#f0d8a8'); px(28, 10, 14, 28, '#f0d8a8');
  for (let y = 14; y < 36; y += 6) { px(6, y, 14, 1, '#583018'); px(28, y, 14, 1, '#583018'); }
});

const waterTex = makePixelTex(16, (c, s) => {
  c.fillStyle = '#3c5cb8'; c.fillRect(0, 0, s, s);
  c.fillStyle = '#6890f0';
  c.fillRect(2, 4, 5, 1); c.fillRect(9, 11, 4, 1);
});

// Directional sunlight for crisp C64-style cast shadows
scene.add(new THREE.AmbientLight('#ffffff', 0.78));
const sun = new THREE.DirectionalLight('#fff8e8', 1.15);
sun.position.set(18, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
const d = 16;
sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
scene.add(sun); scene.add(sun.target);

// Base Grass Ground (tiled pixel grass texture, covers full 81x81 world)
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(120, 120);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshBasicMaterial({ map: grassTex })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(40, -0.02, 40);
scene.add(ground);

const roomGroup = new THREE.Group();
scene.add(roomGroup);

// Shared Geometries & Materials (allocated ONCE to prevent GPU memory leaks & tab freeze!)
const sharedPathMat = new THREE.MeshLambertMaterial({ map: pathTex });
const sharedWaterMat = new THREE.MeshLambertMaterial({ map: waterTex });
const sharedBridgeMat = new THREE.MeshLambertMaterial({ color: '#a87848' });
const sharedTileGeo = new THREE.BoxGeometry(1, 0.06, 1);
const sharedSoilMat = new THREE.MeshBasicMaterial({ map: soilTex });
const sharedSoilGeo = new THREE.PlaneGeometry(1.4, 1.4);
const sharedZenGeo = new THREE.CylinderGeometry(3.2, 3.3, 0.04, 24);
const sharedZenMat = new THREE.MeshLambertMaterial({ color: '#b4c6b8' });
const sharedRingGeo = new THREE.RingGeometry(3.25, 3.45, 32);
const sharedRingMat = new THREE.MeshBasicMaterial({ color: '#60e8b0', side: THREE.DoubleSide });
const spriteMatCache = new Map();
function getSpriteMat(tex) {
  if (!spriteMatCache.has(tex)) spriteMatCache.set(tex, new THREE.SpriteMaterial({ map: tex, transparent: true }));
  return spriteMatCache.get(tex);
}

function getBiome(rx, ry) {
  if (rx >= 7 && ry < 4) return { name: 'INNER SANCTUM', grass: '#501820', path: '#d8c4a0', style: 'sanctum' };
  if (rx >= 7 && ry >= 4) return { name: 'THE DUNGEONS', grass: '#262c36', path: '#889098', style: 'dungeon' };
  if (rx >= 4 && rx <= 6) return { name: 'PALACE GARDENS', grass: '#22c884', path: '#e8e4dc', style: 'garden' };
  if (rx <= 3 && ry < 4) return { name: 'NORTH WASTELANDS', grass: '#288c64', path: '#b8bcc0', style: 'wasteland' };
  return { name: 'THE WILDERNESS', grass: '#18dc6c', path: '#e0e0e0', style: 'wilderness' };
}

function buildRoom(rx, ry) {
  while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]);
  const biome = getBiome(rx, ry);
  ground.material.color.set(biome.grass);
  scene.background.set(biome.grass);
  sharedPathMat.color.set(biome.path);
  const M = game.map.size || 26, maxRoom = Math.floor(M / 9) - 1;
  const minX = rx * 9, maxX = Math.min(M, minX + 9);
  const minY = ry * 9, maxY = Math.min(M, minY + 9);

  const addTile = (tx, tz, tVal) => {
    const m = new THREE.Mesh(sharedTileGeo, tVal === 1 ? sharedWaterMat : tVal === 3 ? sharedBridgeMat : sharedPathMat);
    m.position.set(tx + 0.5, tVal === 1 ? -0.02 : 0.01, tz + 0.5);
    m.receiveShadow = true;
    roomGroup.add(m);
  };

  for (let z = minY; z < maxY; z++) {
    for (let x = minX; x < maxX; x++) {
      const tVal = game.map.tiles[z][x];
      if (tVal === 4 || tVal === 1 || tVal === 3) {
        addTile(x, z, tVal);
        const canExt = (nx, nz) => tVal === 1 || (nx >= 0 && nx < M && nz >= 0 && nz < M && game.map.tiles[nz][nx] === tVal);
        if (x === minX && (tVal === 1 || (rx > 0 && canExt(x - 1, z)))) for (let k = 1; k <= 14; k++) addTile(x - k, z, tVal);
        if (x === maxX - 1 && (tVal === 1 || (rx < maxRoom && canExt(x + 1, z)))) for (let k = 1; k <= 14; k++) addTile(x + k, z, tVal);
        if (z === minY && (tVal === 1 || (ry > 0 && canExt(x, z - 1)))) for (let k = 1; k <= 14; k++) addTile(x, z - k, tVal);
        if (z === maxY - 1 && (tVal === 1 || (ry < maxRoom && canExt(x, z + 1)))) for (let k = 1; k <= 14; k++) addTile(x, z + k, tVal);
      }
    }
  }

  const addBillboard = (tex, x, z, w, h) => {
    const sp = new THREE.Sprite(getSpriteMat(tex));
    sp.scale.set(w, h, 1);
    sp.position.set(x, h * 0.44, z);
    roomGroup.add(sp);
  };

  // Populate dense Japanese pixel-art landscape across the entire visible screen (even past 9x9 edges!)
  for (let z = minY - 4; z < maxY + 4; z++) {
    for (let x = minX - 4; x < maxX + 4; x++) {
      const gx = Math.max(0, Math.min(M - 1, x)), gz = Math.max(0, Math.min(M - 1, z));
      const tileHere = game.map.tiles[gz][gx];
      const onRoadLine = (game.map.tiles[gz]?.[gx] === 4 || game.map.tiles[gz]?.[gx] === 1 || game.map.tiles[gz]?.[gx] === 3);
      if (tileHere !== 0 || onRoadLine) continue;

      const hash = Math.abs((x * 73 + z * 139 + rx * 17 + ry * 31) % 100);
      const nearPath = (game.map.tiles[gz]?.[Math.min(M - 1, gx + 1)] === 4 || game.map.tiles[gz]?.[Math.max(0, gx - 1)] === 4 ||
                        game.map.tiles[Math.min(M - 1, gz + 1)]?.[gx] === 4 || game.map.tiles[Math.max(0, gz - 1)]?.[gx] === 4);

      if (hash < 28) {
        const sp = new THREE.Mesh(sharedSoilGeo, sharedSoilMat);
        sp.rotation.x = -Math.PI / 2;
        sp.position.set(x + 0.5, 0.004, z + 0.5);
        roomGroup.add(sp);
      }

      if (z === minY - 1 && x % 4 === 1) {
        addBillboard(biome.style === 'sanctum' ? palaceScreenTex : pagodaWallTex, x + 0.5, z + 0.5, 2.5, 2.0);
        if (hash % 2 === 0) addBillboard(statueTex, x + 1.2, z + 1.1, 1.1, 1.5);
      } else if (nearPath && hash < 14) {
        addBillboard((biome.style === 'dungeon' || biome.style === 'sanctum') ? torchTex : lanternTex, x + 0.5, z + 0.5, 0.75, 1.2);
      } else if (nearPath && hash < 52) {
        addBillboard(biome.style === 'dungeon' ? craggyBoulderTex : bushTex, x + 0.5, z + 0.5, 1.05, 0.78);
      } else if (!nearPath && hash < 16) {
        const treeTex = biome.style === 'garden' ? treeSakuraTex : biome.style === 'sanctum' ? palaceScreenTex : biome.style === 'dungeon' ? statueTex : (hash % 3 === 0 ? treeSakuraTex : treeGreenTex);
        addBillboard(treeTex, x + 0.5, z + 0.5, 1.95, 2.25);
      } else if (!nearPath && hash >= 16 && hash < 26) {
        addBillboard(biome.style === 'dungeon' ? torchTex : bambooTex, x + 0.5, z + 0.5, 1.1, 1.75);
      } else if (!nearPath && hash >= 26 && hash < 40) {
        addBillboard(craggyBoulderTex, x + 0.5, z + 0.5, 1.65, 1.25);
        if (hash % 2 === 0) addBillboard(craggyBoulderTex, x + 0.9, z + 0.8, 0.95, 0.72);
      } else if (!nearPath && hash >= 40 && hash < 65) {
        addBillboard(biome.style === 'sanctum' ? lanternTex : bushTex, x + 0.5, z + 0.5, 0.95, 0.72);
      }
    }
  }
  // Place iconic red Torii gates at key crossroads entrances
  if (rx === 0 && ry === 1) addBillboard(toriiTex, 4.5, 11.2, 1.9, 1.9);
  if (rx === 2 && ry === 0) addBillboard(toriiTex, 21.5, 6.2, 1.9, 1.9);

  // Serene Sanctuary Courtyard around the Shrine (no enemy can enter)
  const shrine = game.map.objects.find(o => o.type === 'shrine');
  if (shrine && shrine.x >= minX && shrine.x < maxX && shrine.y >= minY && shrine.y < maxY) {
    const zenPad = new THREE.Mesh(sharedZenGeo, sharedZenMat);
    zenPad.position.set(shrine.x, 0.025, shrine.y);
    zenPad.receiveShadow = true;
    roomGroup.add(zenPad);

    const ring = new THREE.Mesh(sharedRingGeo, sharedRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(shrine.x, 0.055, shrine.y);
    roomGroup.add(ring);

    addBillboard(toriiTex, shrine.x, shrine.y - 1.5, 2.2, 2.1);
    addBillboard(lanternTex, shrine.x - 1.3, shrine.y + 0.6, 0.85, 1.3);
    addBillboard(lanternTex, shrine.x + 1.3, shrine.y + 0.6, 0.85, 1.3);
    addBillboard(treeSakuraTex, shrine.x - 1.8, shrine.y - 1.3, 2.2, 2.5);
  }

  for (const p of game.map.props) {
    if (p.x < minX || p.x >= maxX || p.y < minY || p.y >= maxY) continue;
    if (p.type === 'boulder') {
      const sc = p.scale || 1;
      addBillboard(craggyBoulderTex, p.x, p.y, 1.75 * sc, 1.35 * sc);
    } else if (p.type === 'c64tree') {
      addBillboard(p.variant ? treeSakuraTex : treeGreenTex, p.x, p.y, 2.0, 2.35);
    }
  }
}

// Detailed 3D Articulated Ninja / Enemy Character
function createCharacterMesh(colorHex, accentHex, isBoss = false, isPlayer = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
  const trimMat = new THREE.MeshLambertMaterial({ color: accentHex });
  const steelMat = new THREE.MeshLambertMaterial({ color: '#f0f0f0' });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.2), bodyMat);
  torso.position.y = 0.62; torso.castShadow = true;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.22), trimMat);
  belt.position.y = 0.44;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), bodyMat);
  head.position.y = 0.99; head.castShadow = true;

  if (isPlayer) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.28), bodyMat);
    tail.position.set(0, 1.0, -0.2);
    g.add(tail);
    const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.05), trimMat);
    scabbard.position.set(-0.08, 0.72, -0.14);
    scabbard.rotation.z = 0.45;
    g.add(scabbard);
  }

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.14), bodyMat);
  legL.position.set(-0.09, 0.19, 0); legL.castShadow = true;
  const legR = legL.clone(); legR.position.x = 0.09;

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.11), bodyMat);
  armR.position.set(0.24, 0.64, 0); armR.castShadow = true;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.74), steelMat);
  blade.position.set(0, -0.14, 0.38);
  armR.add(blade);

  let clawMesh = null, starMesh = null;
  if (isPlayer) {
    clawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.32), new THREE.MeshLambertMaterial({ color: '#e8a828' }));
    clawMesh.position.set(0, -0.16, 0.18);
    clawMesh.visible = false;
    armR.add(clawMesh);

    starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), steelMat);
    starMesh.position.set(0, -0.16, 0.14);
    starMesh.visible = false;
    armR.add(starMesh);
  }

  g.add(torso, belt, head, legL, legR, armR);
  const pivot = new THREE.Group();
  pivot.add(g);
  if (isBoss) pivot.scale.set(1.24, 1.24, 1.24);
  pivot.userData = { legL, legR, armR, blade, clawMesh, starMesh, bodyMat, rollNode: g };
  return pivot;
}

const playerMesh = createCharacterMesh('#060606', '#282828', false, true);
scene.add(playerMesh);

const enemyMeshes = new Map();
const objectMeshes = new Map();
const projectilePool = [];
const objGroup = new THREE.Group();
const fxGroup = new THREE.Group();
scene.add(objGroup, fxGroup);

const sharedSparkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
const sharedStarGeo = new THREE.OctahedronGeometry(0.14);
const sharedStarMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const sharedObjGeos = {
  node: new THREE.CylinderGeometry(0.32, 0.34, 0.05, 8),
  oct: new THREE.OctahedronGeometry(0.22),
  food: new THREE.SphereGeometry(0.18, 6, 5),
  torus: new THREE.TorusGeometry(0.18, 0.06, 6, 8),
  cyl: new THREE.CylinderGeometry(0.32, 0.42, 0.85, 6)
};

const particles = [];
function spawnHitSparks(x, z, color) {
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(sharedSparkGeo, mat);
    m.position.set(x, 0.7, z);
    fxGroup.add(m);
    const a = (i / 8) * Math.PI * 2;
    particles.push({ mesh: m, mat, vx: Math.cos(a) * 3.2, vy: 2.8 + Math.random() * 2, vz: Math.sin(a) * 3.2, life: 0.35 });
  }
}

const keys = new Set();
const unlockAudio = () => {
  score.start().then(() => {
    const prompt = document.getElementById('audio-hint');
    if (prompt && score.ctx?.state === 'running') prompt.hidden = true;
  }).catch(() => {});
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  keys.add(k);
  unlockAudio();
  if (e.repeat) return;
  if (gamePhase !== 'playing') { if (k === 'enter' || k === ' ') advanceIntro(); return; }
  if (k === 'j') game.attack();
  else if (k === 'k') game.throwStar();
  else if (k === ' ') game.dodge(getMove());
  else if (k === 'e') game.interact();
  else if (k === 'h') game.eatFood();
  else if (k === 'q' || k === 'tab') { e.preventDefault(); game.switchWeapon(); }
  else if (k === 'v') cycleTrack();
  else if (k === 'm') toggleMute();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function getMove() {
  const sx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const sy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  return { x: sx + sy, y: sy - sx, guard: keys.has('shift') };
}

function cycleTrack() {
  trackIdx = (trackIdx + 1) % TRACK_MODES.length;
  const m = TRACK_MODES[trackIdx];
  score.c64Version = m.v;
  score.previewC64 = m.v >= 0;
  score.step = 0;
  if (score.ctx) score.next = score.ctx.currentTime + 0.02;
  unlockAudio();
}

function toggleMute() {
  score.musicVolume = score.musicVolume > 0 ? 0 : 0.45;
  score.apply();
}

document.getElementById('track-btn').onclick = cycleTrack;
document.getElementById('mute-btn').onclick = toggleMute;
document.getElementById('side-canvas').onclick = () => { unlockAudio(); game.eatFood(); };
document.getElementById('bottom-canvas').onclick = () => { unlockAudio(); game.switchWeapon(); };

let lastTime = performance.now(), rafId = 0, isDisposed = false;
function animate(now) {
  if (isDisposed) return;
  rafId = requestAnimationFrame(animate);
  const dt = Math.min(0.04, (now - lastTime) / 1000);
  lastTime = now;

  if (gamePhase === 'playing' && !game.dead && roomDrawProg >= 1) {
    if (keys.has('j')) game.attack();
    game.update(dt, getMove());
  }

  for (const ev of game.events.splice(0)) {
    if (ev.type === 'message') document.getElementById('hud-msg').textContent = ev.text;
    else if (ev.type === 'impact') {
      spawnHitSparks(ev.x, ev.y, ev.color || '#f0d060');
      hitBannerUntil = now + 450;
      combatUntil = now + 5000;
    } else if (ev.type === 'effect') {
      score.effect(ev.name, ev.note);
      if (['relic', 'save', 'success', 'victory'].includes(ev.name)) rewardUntil = now + 4000;
    } else if (ev.type === 'death') {
      score.paused = true; score.apply();
      score.effect('death');
      document.getElementById('hud-msg').textContent = game.lives > 0 ? `Defeated! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} remaining...` : 'GAME OVER · Out of lives! Restarting...';
      setTimeout(() => { game.retry(); combatUntil = 0; score.paused = false; score.apply(); }, 2600);
    }
  }
  // Update 3D hit-marker particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life -= dt;
    pt.mesh.position.x += pt.vx * dt;
    pt.mesh.position.y += pt.vy * dt;
    pt.mesh.position.z += pt.vz * dt;
    pt.vy -= 12 * dt;
    if (pt.life <= 0) { fxGroup.remove(pt.mesh); particles.splice(i, 1); }
  }

  const p = game.player;
  const rx = Math.floor(p.x / 9), ry = Math.floor(p.y / 9);
  const rk = `${rx},${ry}`;
  if (rk !== lastRoomKey) {
    if (lastRoomKey) score.effect('room');
    lastRoomKey = rk;
    buildRoom(rx, ry);
    roomDrawProg = 0;
  }

  // Progressive C64 scene draw-in animation (reveals room elements back-to-front!)
  if (roomDrawProg < 1) {
    roomDrawProg = Math.min(1, roomDrawProg + dt * 1.9);
    const total = roomGroup.children.length;
    const cutoff = Math.floor(total * roomDrawProg);
    for (let i = 0; i < total; i++) {
      roomGroup.children[i].visible = i <= cutoff;
    }
  }

  // Page-by-page Orthographic Camera Snap
  const cx = rx * 9 + 4.5, cz = ry * 9 + 4.5;
  camera.position.set(cx + 12, 12, cz + 12);
  camera.lookAt(cx, 0, cz);
  sun.position.set(cx + 12, 22, cz + 6);
  sun.target.position.set(cx, 0, cz);

  // Sync Player 3D Mesh (equipped weapon + death foetal curl + flash, or somersault, or walk)
  const wpn = p.weapon || 'katana';
  playerMesh.userData.blade.visible = wpn === 'katana';
  if (playerMesh.userData.starMesh) playerMesh.userData.starMesh.visible = wpn === 'stars';
  if (playerMesh.userData.clawMesh) playerMesh.userData.clawMesh.visible = wpn === 'claws';
  playerMesh.position.set(p.x, p.jumpZ || 0, p.y);
  playerMesh.rotation.y = -p.angle + Math.PI / 2;
  if (game.dead) {
    playerMesh.visible = Math.floor(now / 70) % 2 === 0;
    playerMesh.userData.rollNode.rotation.set(0, 0, Math.PI / 2);
    playerMesh.userData.rollNode.position.y = 0.2;
    playerMesh.userData.legL.rotation.x = -1.35;
    playerMesh.userData.legR.rotation.x = -1.35;
    playerMesh.userData.armR.rotation.x = -1.2;
  } else if (p.state === 'dodge') {
    playerMesh.visible = !(p.invuln > 0 && Math.floor(now / 80) % 2 === 1);
    playerMesh.userData.rollNode.position.y = 0;
    const rollProg = 1 - p.timer / (p.dodgeDur || 0.42);
    playerMesh.userData.rollNode.rotation.set(rollProg * Math.PI * 2, 0, 0);
    playerMesh.userData.legL.rotation.x = -0.95;
    playerMesh.userData.legR.rotation.x = -0.95;
    playerMesh.userData.armR.rotation.x = -1.1;
  } else {
    playerMesh.visible = !(p.invuln > 0 && Math.floor(now / 80) % 2 === 1);
    playerMesh.userData.rollNode.position.y = 0;
    playerMesh.userData.rollNode.rotation.set(0, 0, 0);
    const walkSwing = p.state === 'walk' ? Math.sin(p.step * 1.4) * 0.6 : 0;
    playerMesh.userData.legL.rotation.x = walkSwing;
    playerMesh.userData.legR.rotation.x = -walkSwing;
    playerMesh.userData.armR.rotation.x = p.state === 'attack' ? -1.5 : -walkSwing * 0.4;
  }

  // Footsteps & Adaptive Music State (smooth transition without abrupt step reset)
  const sf = Math.floor(p.step / 3);
  if (p.state === 'walk' && sf !== lastStepFloor) {
    lastStepFloor = sf;
    const t = game.map.tiles[Math.floor(p.y)]?.[Math.floor(p.x)];
    score.effect(t === 3 ? 'stepWood' : 'step');
  }
  const lowHp = p.hp <= 30 && !game.dead;
  const activeFight = (game.bossStarted && !game.bossDefeated) || game.enemies.some(e => e.hp > 0 && (e.alert || dist(e, p) < 6.0));
  if (activeFight) combatUntil = now + 5000;
  const nearSafe = game.map.objects.some(o => (o.type === 'shrine' || o.type === 'guide') && dist(o, p) < 3.5);
  const inBattle = activeFight || now < combatUntil;
  const nextState = lowHp ? 'danger' : nearSafe ? 'safe' : inBattle ? 'battle' : (now < rewardUntil) ? 'safe' : 'explore';
  if (!game.dead && score.c64State !== nextState) {
    score.c64State = nextState;
  }

  // Sync Enemies & Projectiles
  for (const e of game.enemies) {
    let mesh = enemyMeshes.get(e.id);
    if (!mesh) {
      mesh = createCharacterMesh(e.kind === 'boss' ? '#a83038' : '#6848b8', e.kind === 'boss' ? '#f0d060' : '#d86050', e.kind === 'boss', false);
      enemyMeshes.set(e.id, mesh);
      scene.add(mesh);
    }
    const inRoom = Math.floor(e.x / 9) === rx && Math.floor(e.y / 9) === ry;
    const isDeadFlashing = e.hp <= 0 && e.timer > 0;
    mesh.visible = inRoom && (e.hp > 0 || !isDeadFlashing || Math.floor(now / 70) % 2 === 0);
    mesh.position.set(e.x, 0, e.y);
    mesh.rotation.y = -e.angle + Math.PI / 2;
    if (e.hp <= 0) {
      mesh.userData.rollNode.rotation.set(0, 0, Math.PI / 2);
      mesh.userData.rollNode.position.y = 0.2;
      mesh.userData.legL.rotation.x = -1.35;
      mesh.userData.legR.rotation.x = -1.35;
      mesh.userData.armR.rotation.x = -1.2;
    } else {
      mesh.userData.rollNode.rotation.set(0, 0, 0);
      mesh.userData.rollNode.position.y = 0;
      const eWalk = e.state === 'walk' ? Math.sin(e.step * 1.4) * 0.5 : 0;
      mesh.userData.legL.rotation.x = eWalk;
      mesh.userData.legR.rotation.x = -eWalk;
      mesh.userData.armR.rotation.x = e.state === 'attack' ? -1.5 : 0;
    }
  }

  // Cached Object Meshes (ZERO per-frame geometry/material allocation!)
  for (const o of game.map.objects) {
    let mesh = objectMeshes.get(o.id);
    if (!mesh) {
      if (o.type === 'guide') {
        mesh = createCharacterMesh('#2e6b5e', '#d8c088', false, false);
      } else {
        const col = o.type === 'relic' ? '#f0c050' : o.type === 'food' ? '#e83838' : o.type === 'stars' ? '#d8e8ff' : o.type === 'key' ? '#e8c840' : o.type === 'claws' ? '#f0a030' : o.type === 'node' ? '#a8a8a8' : o.type === 'shrine' ? '#60f0b0' : '#d86050';
        const geo = o.type === 'node' ? sharedObjGeos.node : (o.type === 'relic' || o.type === 'stars') ? sharedObjGeos.oct : o.type === 'food' ? sharedObjGeos.food : (o.type === 'key' || o.type === 'claws') ? sharedObjGeos.torus : sharedObjGeos.cyl;
        mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
        mesh.castShadow = o.type !== 'node';
      }
      objectMeshes.set(o.id, mesh);
      objGroup.add(mesh);
    }
    const inRoom = Math.floor(o.x / 9) === rx && Math.floor(o.y / 9) === ry;
    const collected = (o.type === 'relic' && game.relics.includes(+o.id.slice(-1))) ||
                      (o.type === 'food' && game.foods.includes(o.id)) ||
                      (o.type === 'stars' && game.starCaches.includes(o.id)) ||
                      (o.type === 'key' && game.inventory.includes('key')) ||
                      (o.type === 'claws' && game.inventory.includes('claws'));
    mesh.visible = inRoom && !collected;
    if (!mesh.visible) continue;
    if (o.type === 'node') mesh.material.color.set(game.puzzle.includes(o.number) ? '#60f0b0' : '#a8a8a8');
    else if (o.type === 'shrine') mesh.material.color.set(game.shrineCooldown <= 0 ? '#60f0b0' : '#586898');
    mesh.position.set(o.x, o.type === 'guide' ? 0 : o.type === 'node' ? 0.04 : (o.type === 'relic' || o.type === 'food' || o.type === 'stars' || o.type === 'key' || o.type === 'claws') ? 0.35 + Math.sin(now * 0.004) * 0.06 : 0.43, o.y);
    if (o.type === 'stars' || o.type === 'key' || o.type === 'claws') mesh.rotation.y = now * 0.004;
  }

  // Pooled Projectile Meshes
  const activeProjs = game.projectiles.filter(q => Math.floor(q.x / 9) === rx && Math.floor(q.y / 9) === ry);
  while (projectilePool.length < activeProjs.length) {
    const pm = new THREE.Mesh(sharedStarGeo, sharedStarMat);
    projectilePool.push(pm);
    objGroup.add(pm);
  }
  for (let i = 0; i < projectilePool.length; i++) {
    if (i < activeProjs.length) {
      projectilePool[i].visible = true;
      projectilePool[i].position.set(activeProjs[i].x, 0.7, activeProjs[i].y);
    } else {
      projectilePool[i].visible = false;
    }
  }

  const nearShrine = game.map.objects.find(o => o.type === 'shrine' && dist(o, p) < 2.2);
  if (nearShrine) {
    if (game.shrineCooldown > 0) {
      const m = Math.floor(game.shrineCooldown / 60), s = Math.ceil(game.shrineCooldown % 60);
      document.getElementById('hud-msg').textContent = `Sacred Sanctuary (Safe) · Shrine cooldown: ${m}:${String(s % 60).padStart(2, '0')}`;
    } else {
      document.getElementById('hud-msg').textContent = 'Sacred Sanctuary (Safe) · Press [E] to pray for Full Health';
    }
  }
  const activeEnemy = game.enemies.find(e => e.hp > 0 && dist(e, p) < 7);
  const eRatio = activeEnemy ? Math.max(0, activeEnemy.hp / activeEnemy.maxHp) : 1;
  drawC64PixelHUD(p, eRatio, game.nearestObject(), now);

  renderer.render(scene, camera);
}

// 100% Pixel-Art C64/EGA Side & Bottom HUD Renderer (Chunky Bitmap Font + Pixel Sprites)
const sideCanvas = document.getElementById('side-canvas');
const sideCtx = sideCanvas.getContext('2d');
const botCanvas = document.getElementById('bottom-canvas');
const botCtx = botCanvas.getContext('2d');
sideCtx.imageSmoothingEnabled = false;
botCtx.imageSmoothingEnabled = false;

// 5x5 / 6x5 Chunky C64 Bitmap Font Glyphs
const BITMAP_FONT = {
  'A': ['01110','11011','11111','11011','11011'],
  'B': ['11110','11011','11110','11011','11110'],
  'C': ['01111','11000','11000','11000','01111'],
  'D': ['11110','11011','11011','11011','11110'],
  'E': ['11111','11000','11110','11000','11111'],
  'F': ['11111','11000','11110','11000','11000'],
  'G': ['01111','11000','11011','11011','01111'],
  'H': ['11011','11011','11111','11011','11011'],
  'I': ['01110','00100','00100','00100','01110'],
  'J': ['00011','00011','00011','11011','01110'],
  'K': ['11011','11110','11100','11110','11011'],
  'L': ['11000','11000','11000','11000','11111'],
  'M': ['11011','11111','11111','11011','11011'],
  'N': ['11011','11111','11111','11111','11011'],
  'O': ['01110','11011','11011','11011','01110'],
  'P': ['11110','11011','11110','11000','11000'],
  'Q': ['01110','11011','11011','01110','00011'],
  'R': ['11110','11011','11110','11110','11011'],
  'S': ['01111','11000','01110','00011','11110'],
  'T': ['11111','00100','00100','00100','00100'],
  'U': ['11011','11011','11011','11011','01110'],
  'V': ['11011','11011','11011','01110','00100'],
  'W': ['11011','11011','11111','11111','10001'],
  'X': ['11011','01110','00100','01110','11011'],
  'Y': ['11011','11011','01110','00100','00100'],
  'Z': ['11111','00011','00110','11000','11111'],
  '0': ['01110','11011','11011','11011','01110'],
  '1': ['00100','01100','00100','00100','01110'],
  '2': ['11110','00011','01110','11000','11111'],
  '3': ['11110','00011','01110','00011','11110'],
  '4': ['11011','11011','11111','00011','00011'],
  '5': ['11111','11000','11110','00011','11110'],
  '6': ['01111','11000','11110','11011','01110'],
  '7': ['11111','00011','00110','01100','01100'],
  '8': ['01110','11011','01110','11011','01110'],
  '9': ['01110','11011','01111','00011','11110'],
  '.': ['00000','00000','00100','00000','00000'],
  ':': ['00000','00100','00000','00100','00000'],
  '-': ['00000','00000','01110','00000','00000'],
  '+': ['00000','00100','01110','00100','00000'],
  '/': ['00001','00010','00100','01000','10000'],
  '!': ['00100','00100','00100','00000','00100'],
  '%': ['11001','00010','00100','01000','10011'],
  '[': ['01110','01000','01000','01000','01110'],
  ']': ['01110','00010','00010','00010','01110'],
  '(': ['00110','01000','01000','01000','00110'],
  ')': ['01100','00010','00010','00010','01100'],
  ' ': ['00000','00000','00000','00000','00000']
};

function drawPixelText(ctx, str, cx, y, col = '#ffffff', scale = 1, dither = false) {
  const charW = 6 * scale;
  const totalW = str.length * charW - scale;
  let startX = Math.round(cx - totalW / 2);
  for (let c = 0; c < str.length; c++) {
    const g = BITMAP_FONT[str[c].toUpperCase()] || BITMAP_FONT[' '];
    for (let ry = 0; ry < 5; ry++) {
      for (let rx = 0; rx < 5; rx++) {
        if (g[ry][rx] === '1') {
          if (dither) {
            ctx.fillStyle = ry < 2 ? '#f03030' : ry < 4 ? ((rx + ry) % 2 === 0 ? '#d82020' : '#780808') : '#881010';
          } else {
            ctx.fillStyle = col;
          }
          ctx.fillRect(startX + rx * scale, y + ry * scale, scale, scale);
        }
      }
    }
    startX += charW;
  }
}

function buildSpiralPoints(cx, cy, mirrorX) {
  const pts = [];
  const segments = [
    [0, 0, 5 * mirrorX, 0],
    [5 * mirrorX, 0, 5 * mirrorX, -5],
    [5 * mirrorX, -5, -8 * mirrorX, -5],
    [-8 * mirrorX, -5, -8 * mirrorX, 7],
    [-8 * mirrorX, 7, 11 * mirrorX, 7],
    [11 * mirrorX, 7, 11 * mirrorX, -11],
    [11 * mirrorX, -11, -14 * mirrorX, -11],
    [-14 * mirrorX, -11, -14 * mirrorX, 13],
    [-14 * mirrorX, 13, -1 * mirrorX, 13],
    [-1 * mirrorX, 13, -1 * mirrorX, 16]
  ];
  for (const [x1, y1, x2, y2] of segments) {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const count = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= count; i++) {
      pts.push([cx + x1 + dx * i, cy + y1 + dy * i]);
    }
  }
  return pts;
}

const leftSnake = buildSpiralPoints(21, 16, -1);
const rightSnake = buildSpiralPoints(47, 16, 1);

function drawPixelKatana(ctx, ox, oy) {
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, w, h); };
  // Pointed blade tip + 3-shade steel blade
  px(0, 4, 2, 1, '#ffffff');
  px(2, 3, 38, 1, '#ffffff');
  px(1, 4, 39, 1, '#b0b0b0');
  px(3, 5, 37, 1, '#585858');
  // Curved S-guard (tsuba) matching screenshot
  px(40, 1, 2, 7, '#d8d8d8');
  px(39, 0, 2, 2, '#ffffff');
  px(41, 7, 2, 2, '#909090');
  // Striped wrapped hilt
  px(42, 3, 11, 3, '#585858');
  for (let hx = 43; hx <= 51; hx += 2) px(hx, 3, 1, 2, '#e0e0e0');
}

function drawPixelIcon(ctx, kind, ox, oy) {
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, w, h); };
  if (kind === 'stars') {
    px(5, 0, 2, 12, '#d8e8ff'); px(0, 5, 12, 2, '#d8e8ff');
    px(2, 2, 8, 8, '#98b0d0'); px(5, 5, 2, 2, '#000000');
  } else if (kind === 'claws') {
    // Nunchaku / Dragon Nails in gold & chain
    px(4, 1, 3, 2, '#ffffff'); px(7, 0, 3, 2, '#b0b0b0'); px(10, 1, 3, 2, '#ffffff');
    px(1, 3, 3, 11, '#e8a828'); px(2, 3, 1, 11, '#ffd868');
    px(12, 3, 3, 11, '#e8a828'); px(13, 3, 1, 11, '#ffd868');
  } else if (kind === 'key') {
    px(0, 3, 6, 6, '#f0d050'); px(2, 5, 2, 2, '#000000');
    px(6, 5, 10, 2, '#f0d050'); px(13, 7, 2, 3, '#f0d050'); px(10, 7, 2, 2, '#f0d050');
  } else if (kind === 'food') {
    // Pixel cherry/apple matching screenshot
    px(1, 3, 6, 5, '#e02020'); px(2, 2, 4, 7, '#e02020');
    px(2, 3, 2, 2, '#ff9898'); px(5, 6, 2, 2, '#780808');
    px(4, 0, 2, 2, '#68d848');
  } else if (kind === 'relic') {
    px(4, 0, 4, 12, '#f0c040'); px(0, 4, 12, 4, '#f0c040'); px(4, 4, 4, 4, '#ffffff');
  }
}

function drawC64PixelHUD(p, eRatio, nearObj, now) {
  // === RIGHT SIDEBAR (88 x 156 internal pixel grid) ===
  sideCtx.fillStyle = '#000000';
  sideCtx.fillRect(0, 0, 88, 156);
  // White horizontal divider between ENEMY/WOUNDS and USING/HOLDING
  sideCtx.fillStyle = '#ffffff';
  sideCtx.fillRect(0, 56, 88, 2);

  // Top box: . ENEMY . -> Purple bar inside white frame -> . WOUNDS .
  drawPixelText(sideCtx, '. ENEMY .', 44, 8, '#ffffff', 1);
  sideCtx.fillStyle = '#ffffff';
  sideCtx.fillRect(6, 21, 76, 13);
  sideCtx.fillStyle = '#000000';
  sideCtx.fillRect(8, 23, 72, 9);
  sideCtx.fillStyle = '#5868f0';
  sideCtx.fillRect(8, 23, Math.round(72 * eRatio), 9);
  drawPixelText(sideCtx, '. WOUNDS .', 44, 42, '#ffffff', 1);

  // Lower box: . USING . -> Equipped Weapon (Katana / Stars / Dragon Nails) -> . HOLDING .
  drawPixelText(sideCtx, nearObj ? '. COLLECT .' : '. USING .', 44, 66, '#ffffff', 1);
  if (nearObj && ['food', 'stars', 'key', 'claws', 'relic'].includes(nearObj.type)) {
    drawPixelIcon(sideCtx, nearObj.type, 38, 79);
  } else if (p.weapon === 'stars' && p.stars > 0) {
    drawPixelIcon(sideCtx, 'stars', 30, 79);
    drawPixelText(sideCtx, 'X' + p.stars, 52, 83, '#d8e8ff', 1);
  } else if (p.weapon === 'claws' && game.inventory.includes('claws')) {
    drawPixelIcon(sideCtx, 'claws', 36, 78);
  } else {
    drawPixelKatana(sideCtx, 17, 81);
  }

  drawPixelText(sideCtx, '. HOLDING .', 44, 104, '#ffffff', 1);
  let hx = 10;
  if (game.inventory.includes('key')) { drawPixelIcon(sideCtx, 'key', hx, 118); hx += 19; }
  if (game.inventory.includes('claws')) { drawPixelIcon(sideCtx, 'claws', hx, 118); hx += 19; }
  for (let i = 0; i < (p.foodBag || 0); i++) { drawPixelIcon(sideCtx, 'food', hx + i * 11, 119); }
  for (let i = 0; i < game.relics.length; i++) { drawPixelIcon(sideCtx, 'relic', 14 + i * 22, 136); }
  if (p.foodBag > 0) {
    drawPixelText(sideCtx, 'PRESS H', 64, 139, '#e85050', 1);
  }

  // === BOTTOM BAR (320 x 46 internal pixel grid) ===
  botCtx.fillStyle = '#000000';
  botCtx.fillRect(0, 0, 320, 46);

  // 1. Retracting Snake Spiral (. POWER .)
  const ratio = Math.max(0, Math.min(1, p.hp / 100));
  const leftR = Math.max(0, Math.min(1, ratio * 2));
  const rightR = Math.max(0, Math.min(1, (ratio - 0.5) * 2));
  const drawSpiral = (pts, r) => {
    const activeCount = Math.round(pts.length * r);
    if (activeCount <= 0) return;
    botCtx.fillStyle = '#e85050';
    for (let i = 0; i < activeCount; i++) botCtx.fillRect(pts[i][0] - 2, pts[i][1] - 2, 5, 5);
    botCtx.fillStyle = '#ffffff';
    for (let i = 0; i < activeCount; i++) botCtx.fillRect(pts[i][0] - 1, pts[i][1] - 1, 3, 3);
    botCtx.fillStyle = '#000000';
    for (let i = 2; i < activeCount; i += 4) botCtx.fillRect(pts[i][0], pts[i][1], 1, 1);
  };
  drawSpiral(leftSnake, leftR);
  drawSpiral(rightSnake, rightR);
  drawPixelText(botCtx, '. POWER .', 34, 37, '#ffffff', 1);

  // 2. Pixel Apple Lives (. LIVES .)
  for (let i = 0; i < Math.max(0, game.lives); i++) {
    drawPixelIcon(botCtx, 'food', 79 + i * 11, 22);
  }
  drawPixelText(botCtx, '. LIVES .', 94, 37, '#ffffff', 1);

  // 3. Pixel Weaponry (. WEAPONRY .)
  drawPixelKatana(botCtx, 146, 6);
  if (p.stars > 0) {
    drawPixelIcon(botCtx, 'stars', 150, 19);
    drawPixelText(botCtx, 'X' + p.stars, 173, 23, '#ffffff', 1);
  }
  if (game.inventory.includes('claws')) {
    drawPixelIcon(botCtx, 'claws', 192, 18);
  }
  if (now < hitBannerUntil) {
    drawPixelText(botCtx, 'HIT', 134, 21, '#f0d050', 1);
  }
  drawPixelText(botCtx, '. WEAPONRY .', 176, 37, '#ffffff', 1);

  // 4. Dithered Crimson Pixel Title Logo (Right)
  drawPixelText(botCtx, 'SHADOWS', 274, 5, '#e83030', 1, true);
  drawPixelText(botCtx, 'OF THE', 274, 14, '#c82020', 1, true);
  drawPixelText(botCtx, 'EMBER', 274, 23, '#e83030', 2, true);
  drawPixelText(botCtx, 'CLAN', 274, 35, '#e83030', 2, true);

  // 5. Pixel-Art Title Overlay & Bottom Viewport Controls Banner (#intro-canvas, #btn-canvas, #msg-canvas)
  const introCv = document.getElementById('intro-canvas');
  const btnCv = document.getElementById('btn-canvas');
  const msgCv = document.getElementById('msg-canvas');
  if (introCv && gamePhase !== 'playing') {
    const ic = introCv.getContext('2d'); ic.imageSmoothingEnabled = false;
    ic.clearRect(0, 0, 270, 44);
    ic.fillStyle = '#000000bb'; ic.fillRect(0, 0, 270, 44);
    if (gamePhase === 'title') {
      drawPixelText(ic, '. FIVE SEALS . ONE ROAD TO DAWN .', 135, 6, '#f0d060', 1);
      drawPixelText(ic, 'WASD MOVE . J ATTACK . K STAR . Q WEAPON', 135, 19, '#ffffff', 1);
      drawPixelText(ic, 'SPACE ROLL . E INTERACT . H EAT APPLE', 135, 31, '#88e0a0', 1);
    } else {
      drawPixelText(ic, '. PROLOGUE : THE WASTELANDS .', 135, 6, '#e85050', 1);
      drawPixelText(ic, 'FIND IRON KEY AND DRAGON NAILS', 135, 19, '#ffffff', 1);
      drawPixelText(ic, 'RECOVER 3 RELICS . DEFEAT THE SHOGUN', 135, 31, '#f0d060', 1);
    }
    const bc = btnCv.getContext('2d'); bc.imageSmoothingEnabled = false;
    bc.fillStyle = '#000000'; bc.fillRect(0, 0, 140, 15);
    drawPixelText(bc, gamePhase === 'title' ? '. BEGIN JOURNEY .' : '. ENTER WASTELANDS .', 70, 5, '#f0d060', 1);
  }
  if (msgCv) {
    const mc = msgCv.getContext('2d'); mc.imageSmoothingEnabled = false;
    mc.fillStyle = '#000000'; mc.fillRect(0, 0, 320, 13);
    const rawMsg = (document.getElementById('hud-msg').textContent || '').replace(/[·]/g, '.').toUpperCase();
    drawPixelText(mc, rawMsg.slice(0, 52), 160, 4, '#ffffff', 1);
  }
  const tc = document.getElementById('track-canvas')?.getContext('2d');
  const muc = document.getElementById('mute-canvas')?.getContext('2d');
  if (tc && muc) {
    tc.imageSmoothingEnabled = false; muc.imageSmoothingEnabled = false;
    tc.fillStyle = '#000000'; tc.fillRect(0, 0, 96, 9);
    drawPixelText(tc, TRACK_MODES[trackIdx].label, 48, 2, '#f0d060', 1);
    muc.fillStyle = '#000000'; muc.fillRect(0, 0, 54, 9);
    drawPixelText(muc, score.musicVolume > 0 ? 'SFX: ON' : 'SFX: OFF', 27, 2, score.musicVolume > 0 ? '#88e0a0' : '#e85050', 1);
  }
}

score.setMode('title', 5);
unlockAudio();
buildRoom(Math.floor(game.player.x / 9), Math.floor(game.player.y / 9));
lastRoomKey = `${Math.floor(game.player.x / 9)},${Math.floor(game.player.y / 9)}`;
rafId = requestAnimationFrame(animate);

// Instant teardown on page close / reload so tab never hooks or hangs!
function cleanupPage() {
  if (isDisposed) return;
  isDisposed = true;
  if (rafId) cancelAnimationFrame(rafId);
  score.stop();
  try { renderer.dispose(); } catch {}
}
window.addEventListener('pagehide', cleanupPage);
window.addEventListener('beforeunload', cleanupPage);

window.addEventListener('resize', () => {
  const asp = viewport.clientWidth / viewport.clientHeight;
  camera.left = -viewSize * asp;
  camera.right = viewSize * asp;
  camera.updateProjectionMatrix();
});
