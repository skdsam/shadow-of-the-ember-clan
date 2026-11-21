import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';

const { Game, dist } = EmberCore;
const game = new Game({ difficulty: 'normal' });
game.loadLevel(5); // Classic C64 Wastelands path-only map

const score = new EmberScore();
const TRACK_MODES = [
  { v: -1, label: 'Music: Auto (V)' },
  { v: 3, label: 'Preview: Intro (V)' },
  { v: 0, label: 'Preview: 1 Explore (V)' },
  { v: 1, label: 'Preview: 2 Battle (V)' },
  { v: 2, label: 'Preview: 3 Safe (V)' },
  { v: 7, label: 'Preview: Danger (V)' },
  { v: 6, label: 'Preview: Ending (V)' }
];
let trackIdx = 0, rewardUntil = 0, combatUntil = 0, hitBannerUntil = 0, lastStepFloor = -1, lastRoomKey = '';
let gamePhase = 'title'; // 'title' -> 'prologue' -> 'playing'

const introOverlay = document.getElementById('intro-overlay');
const introImg = document.getElementById('intro-img');
const introTitle = document.getElementById('intro-title');
const introCopy = document.getElementById('intro-copy');
const introBtn = document.getElementById('intro-btn');

function advanceIntro() {
  unlockAudio();
  if (gamePhase === 'title') {
    gamePhase = 'prologue';
    score.setMode('intro', 5);
    introImg.src = 'concepts/03-cinematic-intro.png';
    introTitle.textContent = 'PROLOGUE · THE WASTELANDS';
    introCopy.textContent = 'Akuro has stolen the sacred seals. Stay on the stone path, leap past his guards with Space, and reclaim the Wastelands.';
    introBtn.textContent = 'Enter the Wastelands ↵';
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

// Base Grass Ground (tiled pixel grass texture, extra-large so edges never show)
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(60, 60);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.MeshBasicMaterial({ map: grassTex })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(13, -0.02, 13);
scene.add(ground);

const roomGroup = new THREE.Group();
scene.add(roomGroup);

function buildRoom(rx, ry) {
  while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]);
  const minX = rx * 9, maxX = Math.min(26, minX + 9);
  const minY = ry * 9, maxY = Math.min(26, minY + 9);

  const pathMat = new THREE.MeshLambertMaterial({ map: pathTex });
  const waterMat = new THREE.MeshLambertMaterial({ map: waterTex });
  const bridgeMat = new THREE.MeshLambertMaterial({ color: '#a87848' });
  const tileGeo = new THREE.BoxGeometry(1, 0.06, 1);

  const addTile = (tx, tz, tVal) => {
    const m = new THREE.Mesh(tileGeo, tVal === 1 ? waterMat : tVal === 3 ? bridgeMat : pathMat);
    m.position.set(tx + 0.5, tVal === 1 ? -0.02 : 0.01, tz + 0.5);
    m.receiveShadow = true;
    roomGroup.add(m);
  };

  for (let z = minY; z < maxY; z++) {
    for (let x = minX; x < maxX; x++) {
      const tVal = game.map.tiles[z][x];
      if (tVal === 4 || tVal === 1 || tVal === 3) {
        addTile(x, z, tVal);
        if (x === minX) for (let k = 1; k <= 14; k++) addTile(x - k, z, tVal);
        if (x === maxX - 1) for (let k = 1; k <= 14; k++) addTile(x + k, z, tVal);
        if (z === minY) for (let k = 1; k <= 14; k++) addTile(x, z - k, tVal);
        if (z === maxY - 1) for (let k = 1; k <= 14; k++) addTile(x, z + k, tVal);
      }
    }
  }

  const addBillboard = (tex, x, z, w, h) => {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(w, h, 1);
    sp.position.set(x, h * 0.44, z);
    roomGroup.add(sp);
  };

  // Populate dense Japanese pixel-art landscape across the entire visible screen (even past 9x9 edges!)
  const soilMat = new THREE.MeshBasicMaterial({ map: soilTex });
  const soilGeo = new THREE.PlaneGeometry(1.4, 1.4);
  for (let z = minY - 4; z < maxY + 4; z++) {
    for (let x = minX - 4; x < maxX + 4; x++) {
      const gx = Math.max(0, Math.min(25, x)), gz = Math.max(0, Math.min(25, z));
      const tileHere = game.map.tiles[gz][gx];
      const onRoadLine = [4, 5, 12, 13, 22, 23].includes(z) || [4, 5, 12, 13, 21, 22, 18].includes(x);
      if (tileHere !== 0 || onRoadLine) continue;

      const hash = Math.abs((x * 73 + z * 139 + rx * 17 + ry * 31) % 100);
      const nearPath = (game.map.tiles[gz]?.[Math.min(25, gx + 1)] === 4 || game.map.tiles[gz]?.[Math.max(0, gx - 1)] === 4 ||
                        game.map.tiles[Math.min(25, gz + 1)]?.[gx] === 4 || game.map.tiles[Math.max(0, gz - 1)]?.[gx] === 4);

      // Brown earth & root patches beneath trees/shrubs (Amiga Remix feel)
      if (hash < 28) {
        const sp = new THREE.Mesh(soilGeo, soilMat);
        sp.rotation.x = -Math.PI / 2;
        sp.position.set(x + 0.5, 0.004, z + 0.5);
        roomGroup.add(sp);
      }

      if (z === minY - 1 && x % 4 === 1) {
        addBillboard(pagodaWallTex, x + 0.5, z + 0.5, 2.5, 2.0);
        if (hash % 2 === 0) addBillboard(statueTex, x + 1.2, z + 1.1, 1.1, 1.5);
      } else if (nearPath && hash < 12) {
        addBillboard(lanternTex, x + 0.5, z + 0.5, 0.75, 1.15);
      } else if (nearPath && hash < 52) {
        addBillboard(bushTex, x + 0.5, z + 0.5, 1.05, 0.78);
      } else if (!nearPath && hash < 16) {
        addBillboard(hash % 3 === 0 ? treeSakuraTex : treeGreenTex, x + 0.5, z + 0.5, 1.95, 2.25);
      } else if (!nearPath && hash >= 16 && hash < 26) {
        addBillboard(bambooTex, x + 0.5, z + 0.5, 1.2, 1.85);
      } else if (!nearPath && hash >= 26 && hash < 40) {
        addBillboard(craggyBoulderTex, x + 0.5, z + 0.5, 1.65, 1.25);
        if (hash % 2 === 0) addBillboard(craggyBoulderTex, x + 0.9, z + 0.8, 0.95, 0.72); // Boulder cluster
      } else if (!nearPath && hash >= 40 && hash < 65) {
        addBillboard(bushTex, x + 0.5, z + 0.5, 0.95, 0.72);
      }
    }
  }
  // Place iconic red Torii gates at key crossroads entrances
  if (rx === 0 && ry === 1) addBillboard(toriiTex, 4.5, 11.2, 1.9, 1.9);
  if (rx === 2 && ry === 0) addBillboard(toriiTex, 21.5, 6.2, 1.9, 1.9);

  // Serene Sanctuary Courtyard around the Shrine (no enemy can enter)
  const shrine = game.map.objects.find(o => o.type === 'shrine');
  if (shrine && shrine.x >= minX && shrine.x < maxX && shrine.y >= minY && shrine.y < maxY) {
    const zenPad = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.3, 0.04, 24),
      new THREE.MeshLambertMaterial({ color: '#b4c6b8' })
    );
    zenPad.position.set(shrine.x, 0.025, shrine.y);
    zenPad.receiveShadow = true;
    roomGroup.add(zenPad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.25, 3.45, 32),
      new THREE.MeshBasicMaterial({ color: '#60e8b0', side: THREE.DoubleSide })
    );
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

  g.add(torso, belt, head, legL, legR, armR);
  const pivot = new THREE.Group();
  pivot.add(g);
  if (isBoss) pivot.scale.set(1.24, 1.24, 1.24);
  pivot.userData = { legL, legR, armR, bodyMat, rollNode: g };
  return pivot;
}

const playerMesh = createCharacterMesh('#060606', '#282828', false, true);
scene.add(playerMesh);

const enemyMeshes = new Map();
const objGroup = new THREE.Group();
const fxGroup = new THREE.Group();
scene.add(objGroup, fxGroup);

const particles = [];
function spawnHitSparks(x, z, color) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, 0.7, z);
    fxGroup.add(m);
    const a = (i / 8) * Math.PI * 2;
    particles.push({ mesh: m, vx: Math.cos(a) * 3.2, vy: 2.8 + Math.random() * 2, vz: Math.sin(a) * 3.2, life: 0.35 });
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
  document.getElementById('track-btn').textContent = m.label;
  unlockAudio();
}

function toggleMute() {
  score.musicVolume = score.musicVolume > 0 ? 0 : 0.45;
  score.apply();
  document.getElementById('mute-btn').textContent = score.musicVolume > 0 ? 'Music: On (M)' : 'Music: Off (M)';
}

document.getElementById('track-btn').onclick = cycleTrack;
document.getElementById('mute-btn').onclick = toggleMute;
document.getElementById('eat-btn').onclick = () => { unlockAudio(); game.eatFood(); };

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.04, (now - lastTime) / 1000);
  lastTime = now;

  if (gamePhase === 'playing' && !game.dead) {
    if (keys.has('j')) game.attack();
    game.update(dt, getMove());
  }

  for (const ev of game.events.splice(0)) {
    if (ev.type === 'message') document.getElementById('hud-msg').textContent = ev.text;
    else if (ev.type === 'impact') {
      spawnHitSparks(ev.x, ev.y, ev.color || '#f0d060');
      document.getElementById('hit-badge').textContent = '★ HIT! ★';
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
  if (now > hitBannerUntil) document.getElementById('hit-badge').textContent = '';

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
  }

  // Page-by-page Orthographic Camera Snap
  const cx = rx * 9 + 4.5, cz = ry * 9 + 4.5;
  camera.position.set(cx + 12, 12, cz + 12);
  camera.lookAt(cx, 0, cz);
  sun.position.set(cx + 12, 22, cz + 6);
  sun.target.position.set(cx, 0, cz);

  // Sync Player 3D Mesh (death foetal curl + flash, or somersault roll jump, or walk)
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
    playerMesh.visible = true;
    playerMesh.userData.rollNode.position.y = 0;
    const rollProg = 1 - p.timer / (p.dodgeDur || 0.42);
    playerMesh.userData.rollNode.rotation.set(rollProg * Math.PI * 2, 0, 0);
    playerMesh.userData.legL.rotation.x = -0.95;
    playerMesh.userData.legR.rotation.x = -0.95;
    playerMesh.userData.armR.rotation.x = -1.1;
  } else {
    playerMesh.visible = true;
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
    mesh.visible = inRoom && (e.hp > 0 || (isDeadFlashing && Math.floor(now / 70) % 2 === 0));
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

  while (objGroup.children.length) objGroup.remove(objGroup.children[0]);
  for (const o of game.map.objects) {
    if (Math.floor(o.x / 9) !== rx || Math.floor(o.y / 9) !== ry) continue;
    if (o.type === 'relic' && game.relics.includes(+o.id.slice(-1))) continue;
    if (o.type === 'food' && game.foods.includes(o.id)) continue;
    const readyShrine = o.type === 'shrine' && game.shrineCooldown <= 0;
    const col = o.type === 'relic' ? '#f0c050' : o.type === 'food' ? '#e83838' : o.type === 'shrine' ? (readyShrine ? '#60f0b0' : '#586898') : o.type === 'altar' ? '#d86050' : '#d8d8d8';
    const mesh = new THREE.Mesh(
      o.type === 'relic' ? new THREE.OctahedronGeometry(0.22) : o.type === 'food' ? new THREE.SphereGeometry(0.18, 6, 5) : o.type === 'shrine' ? new THREE.CylinderGeometry(0.32, 0.42, 0.85, 6) : new THREE.BoxGeometry(0.45, 0.55, 0.45),
      new THREE.MeshLambertMaterial({ color: col })
    );
    mesh.position.set(o.x, o.type === 'relic' || o.type === 'food' ? 0.35 + Math.sin(now * 0.004) * 0.06 : o.type === 'shrine' ? 0.43 : 0.28, o.y);
    mesh.castShadow = true;
    objGroup.add(mesh);
  }
  for (const q of game.projectiles) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    star.position.set(q.x, 0.7, q.y);
    objGroup.add(star);
  }

  // Retracting Dual-Snake Spiral Power Meter (Last Ninja Style)
  drawPowerSnakes(Math.max(0, Math.min(1, p.hp / 100)));

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
  document.getElementById('enemy-bar').style.width = (activeEnemy ? (activeEnemy.hp / activeEnemy.maxHp) * 100 : 100) + '%';
  document.getElementById('wounds-bar').style.width = Math.max(0, p.hp) + '%';
  document.getElementById('relics-txt').textContent = `RELICS: ${game.relics.length} / 3`;
  document.getElementById('puzzle-txt').textContent = `STONES: ${game.puzzle.length} / 3`;
  const eatBtn = document.getElementById('eat-btn');
  eatBtn.textContent = `🍎 FRUIT: ${p.foodBag || 0} [H]`;
  eatBtn.disabled = !(p.foodBag > 0);
  eatBtn.style.opacity = p.foodBag > 0 ? '1' : '0.45';
  document.getElementById('weaponry-txt').textContent = `SHURIKEN × ${String(p.stars).padStart(2, '0')}`;
  const pips = document.querySelectorAll('#lives-row .life-pip');
  pips.forEach((pip, idx) => pip.classList.toggle('lost', idx >= game.lives));

  renderer.render(scene, camera);
}

// Build pixel-accurate twin spiral snake paths from inner core -> outer rim
const powerCanvas = document.getElementById('power-canvas');
const powerCtx = powerCanvas.getContext('2d');
powerCtx.imageSmoothingEnabled = false;

function buildSpiralPoints(cx, cy, mirrorX) {
  // Exact Last Ninja spiral winding outward from inner eye -> outer stem
  const pts = [];
  const step = 1;
  const segments = [
    [0, 0, 8 * mirrorX, 0],
    [8 * mirrorX, 0, 8 * mirrorX, -8],
    [8 * mirrorX, -8, -12 * mirrorX, -8],
    [-12 * mirrorX, -8, -12 * mirrorX, 10],
    [-12 * mirrorX, 10, 16 * mirrorX, 10],
    [16 * mirrorX, 10, 16 * mirrorX, -18],
    [16 * mirrorX, -18, -20 * mirrorX, -18],
    [-20 * mirrorX, -18, -20 * mirrorX, 20],
    [-20 * mirrorX, 20, -2 * mirrorX, 20],
    [-2 * mirrorX, 20, -2 * mirrorX, 24]
  ];
  for (const [x1, y1, x2, y2] of segments) {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const count = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / step;
    for (let i = 0; i <= count; i++) {
      pts.push([cx + x1 + dx * i * step, cy + y1 + dy * i * step]);
    }
  }
  return pts;
}

const leftSnake = buildSpiralPoints(34, 29, -1);
const rightSnake = buildSpiralPoints(78, 29, 1);

function drawPowerSnakes(ratio) {
  powerCtx.fillStyle = '#000000';
  powerCtx.fillRect(0, 0, 112, 58);
  // 100% -> 50%: right spiral retracts into black; 50% -> 0%: left spiral retracts into black
  const leftRatio = Math.max(0, Math.min(1, ratio * 2));
  const rightRatio = Math.max(0, Math.min(1, (ratio - 0.5) * 2));
  const drawOne = (pts, r) => {
    const activeCount = Math.round(pts.length * r);
    if (activeCount <= 0) return;
    powerCtx.fillStyle = '#d87868';
    for (let i = 0; i < activeCount; i++) {
      const [x, y] = pts[i];
      powerCtx.fillRect(x - 3, y - 3, 7, 7);
    }
    powerCtx.fillStyle = '#ffffff';
    for (let i = 0; i < activeCount; i++) {
      const [x, y] = pts[i];
      powerCtx.fillRect(x - 1, y - 1, 3, 3);
    }
  };
  drawOne(leftSnake, leftRatio);
  drawOne(rightSnake, rightRatio);
}

score.setMode('title', 5);
unlockAudio();
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  const asp = viewport.clientWidth / viewport.clientHeight;
  camera.left = -viewSize * asp;
  camera.right = viewSize * asp;
  camera.updateProjectionMatrix();
});
