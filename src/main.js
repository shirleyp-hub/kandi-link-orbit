import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CREW, SIZE, STAGES, createWorld, step, relation, move } from './sim.js';

const $ = (id) => document.getElementById(id);
const world = createWorld();
const state = {
  sel: 2, ringAngle: 0, seeking: true, exploded: 0, explodeTarget: 0,
  finish: 0, resin: 0, gem: 0, mood: 0, speed: 5, sosFlash: 0,
};

// ---------- scene ----------
const host = $('three');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
scene.background = new THREE.Color(0x0a0612);
scene.fog = new THREE.Fog(0x0a0612, 9, 18);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 4.2, 6.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 3.5; controls.maxDistance = 14;
controls.target.set(0, 0.2, 0);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.45, 0.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const R = 1.6;               // inner ring radius
const N = 60;                // LEDs in the light ribbon
const parts = {};            // name -> { group, info, baseY, explodeY }

function part(name, info, explodeY) {
  const g = new THREE.Group(); g.userData.part = name;
  scene.add(g);
  parts[name] = { group: g, info, explodeY };
  return g;
}

// 01 selector ring with gems
const FINISHES = [
  { name: 'Liquid silver', color: 0xf2eeff, rough: 0.12, irid: 0 },
  { name: 'Oil slick', color: 0xb9a8ff, rough: 0.18, irid: 1 },
  { name: 'Midnight', color: 0x2a2538, rough: 0.3, irid: 0 },
  { name: 'Rose gold', color: 0xf3c2b2, rough: 0.15, irid: 0 },
];
const ringMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.12, color: 0xf2eeff, iridescence: 0, iridescenceIOR: 1.8 });
const sel = part('selector', {
  num: '01', title: 'Selector ring', text: 'Anodized titanium ring that spins freely around the resin. Eight snap in gem sockets. Magnets under each socket click past a hall sensor so the band knows which friend you picked.',
  specs: [['Material', 'Grade 2 titanium'], ['Detents', '8 magnetic'], ['Cost est', '$3.50 with gems']],
}, 1.5);
const ringPivot = new THREE.Group(); sel.add(ringPivot);
const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(R + 0.36, 0.07, 24, 200), ringMat);
ringMesh.rotation.x = Math.PI / 2; ringMesh.userData.part = 'selector'; ringPivot.add(ringMesh);
const GEMS = [
  { name: 'Faceted', geo: () => new THREE.OctahedronGeometry(0.13, 0) },
  { name: 'Cabochon', geo: () => new THREE.SphereGeometry(0.12, 24, 16) },
  { name: 'Pony bead', geo: () => new THREE.CylinderGeometry(0.1, 0.1, 0.16, 20, 1, true) },
];
const gemMeshes = CREW.map((c, i) => {
  const m = new THREE.Mesh(GEMS[0].geo(), new THREE.MeshPhysicalMaterial({ color: c.hex, roughness: 0.05, transmission: 0.4, thickness: 0.3, emissive: c.hex, emissiveIntensity: 0.25 }));
  const a = (i / 8) * Math.PI * 2;
  m.position.set(Math.sin(a) * (R + 0.36), 0.1, Math.cos(a) * (R + 0.36));
  m.userData.part = 'selector';
  ringPivot.add(m);
  return m;
});
// notch marker at the front of the resin
const notch = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
notch.rotation.x = Math.PI / 2; notch.position.set(0, 0.25, R + 0.2);

// 02 resin shell
const RESINS = [
  { name: 'Crystal', color: 0xffffff, t: 1 }, { name: 'Smoke', color: 0x3a3050, t: 0.75 },
  { name: 'Ice', color: 0xbff8ff, t: 0.95 }, { name: 'Lilac', color: 0xd8c4ff, t: 0.95 }, { name: 'UV glow', color: 0xeaff9c, t: 0.9 },
];
const resinMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.08, thickness: 0.4, ior: 1.45, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
const resin = part('resin', {
  num: '02', title: 'Resin shell', text: 'Optical clear cast polyurethane, 7 mm deep. The inner face is frosted so the light reads as a soft glow instead of hard dots. Sealed to IP54.',
  specs: [['Inner size', 'S 58, M 63, L 68 mm'], ['Band', '9 mm wide'], ['Cost est', '$2.20']],
}, 0.75);
const resinMesh = new THREE.Mesh(new THREE.TorusGeometry(R, 0.24, 48, 220), resinMat);
resinMesh.rotation.x = Math.PI / 2; resinMesh.userData.part = 'resin';
resin.add(resinMesh); resin.add(notch);

// 03 light ribbon
const ribbon = part('ribbon', {
  num: '03', title: 'Light ribbon', text: 'Sixty side emitting RGB LEDs on a flex strip at 2.5 mm pitch. The firmware draws a comet whose head points at your friend and stays locked to the world as you turn your wrist.',
  specs: [['LEDs', '60 RGB'], ['Peak draw', '~12 mA seeking'], ['Cost est', '$2.40']],
}, 0);
const ledGeo = new THREE.SphereGeometry(0.045, 12, 8);
const leds = [];
for (let i = 0; i < N; i++) {
  const m = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const a = (i / N) * Math.PI * 2;
  m.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R); // a = 0 is north (-Z)
  m.userData.part = 'ribbon';
  ribbon.add(m); leds.push(m);
}
const headLight = new THREE.PointLight(0xff4fb8, 1.5, 2.5, 2); ribbon.add(headLight);

// 04 flex brain
const brain = part('brain', {
  num: '04', title: 'Flex brain', text: 'A ring shaped flex PCB. nRF52840 runs everything and handles BLE. SX1262 LoRa carries 24 byte encrypted location packets band to band. L76K GNSS takes a fix every 10 s. A 9 axis IMU gives your heading.',
  specs: [['Radio', 'LoRa 915 / 868 MHz'], ['Range', '~1 km in crowds'], ['Cost est', '$12.80 total']],
}, -0.75);
const pcb = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 8, 160), new THREE.MeshStandardMaterial({ color: 0x0f3d33, roughness: 0.6 }));
pcb.rotation.x = Math.PI / 2; pcb.userData.part = 'brain'; brain.add(pcb);
['nRF52840', 'SX1262', 'L76K', 'IMU', 'PMIC', 'Haptic'].forEach((n, i) => {
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.14), new THREE.MeshStandardMaterial({ color: 0x1a1626, metalness: 0.4, roughness: 0.4 }));
  const a = (i / 6) * Math.PI * 2 + 0.4;
  chip.position.set(Math.sin(a) * R, 0.04, -Math.cos(a) * R); chip.rotation.y = -a;
  chip.userData.part = 'brain'; brain.add(chip);
});

// 05 battery cells
const battery = part('battery', {
  num: '05', title: 'Curved cells', text: 'Two 120 mAh arc LiPo cells on opposite sides of the ring, so the bangle balances on the wrist instead of rolling. About 28 h with normal seeking, about 40 h in festival saver mode.',
  specs: [['Capacity', '240 mAh total'], ['Average draw', '~8.5 mA'], ['Cost est', '$2.80']],
}, -1.5);
const cellMat = new THREE.MeshStandardMaterial({ color: 0xc9c3dc, metalness: 0.9, roughness: 0.25 });
[0.35, Math.PI + 0.35].forEach((start) => {
  const c = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 12, 60, Math.PI * 0.7), cellMat);
  c.rotation.x = Math.PI / 2; c.rotation.z = start; c.userData.part = 'battery'; battery.add(c);
});

// 06 core segment
const core = part('core', {
  num: '06', title: 'Core segment', text: 'The slim block at the back of the wrist. Holds the hall sensors, haptic motor and three magnetic charge pins. Squeeze it to seek, hold it to call your crew to you.',
  specs: [['Charge', 'Magnetic pins, 90 min'], ['Haptic', 'LRA motor'], ['Cost est', '$1.30']],
}, -2.2);
const coreMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.6, 8, 16), new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.15, color: 0xeeeaff }));
coreMesh.rotation.z = Math.PI / 2; coreMesh.position.set(0, 0, -R - 0.05); coreMesh.userData.part = 'core';
core.add(coreMesh);
[-0.15, 0, 0.15].forEach((x) => {
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xffd23d, metalness: 1, roughness: 0.2 }));
  pin.position.set(x, -0.16, -R - 0.05); core.add(pin);
});

// floor glow
const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshBasicMaterial({ color: 0x9b6bff, transparent: true, opacity: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -2.6; scene.add(floor);

// ---------- UI wiring ----------
function chips(id, list, key, apply) {
  const el = $(id);
  list.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = o.name;
    b.onclick = () => { state[key] = i; [...el.children].forEach((c, j) => c.classList.toggle('on', j === i)); apply(); };
    if (i === state[key]) b.classList.add('on');
    el.appendChild(b);
  });
}
function applyLook() {
  const f = FINISHES[state.finish];
  ringMat.color.set(f.color); ringMat.roughness = f.rough; ringMat.iridescence = f.irid;
  coreMesh.material.color.set(f.color); coreMesh.material.iridescence = f.irid;
  const r = RESINS[state.resin];
  resinMat.color.set(r.color); resinMat.transmission = r.t;
  gemMeshes.forEach((m) => { m.geometry.dispose(); m.geometry = GEMS[state.gem].geo(); });
}
chips('finish', FINISHES, 'finish', applyLook);
chips('resin', RESINS, 'resin', applyLook);
chips('gem', GEMS, 'gem', applyLook);
chips('mood', [{ name: 'Heartbeat' }, { name: 'Aurora' }, { name: 'Still' }], 'mood', () => {});

function buzz(n, text) {
  const el = $('buzz'); el.textContent = `${'◉ '.repeat(n)} ${text}`; el.classList.add('show');
  clearTimeout(buzz.t); buzz.t = setTimeout(() => el.classList.remove('show'), 1600);
  if (navigator.vibrate) navigator.vibrate(Array.from({ length: n * 2 - 1 }, (_, i) => (i % 2 ? 80 : 60)));
}
function twist(d) {
  state.sel = (state.sel + d + 8) % 8;
  const f = CREW[state.sel];
  buzz(state.sel + 1, `${f.name} · ${f.color}`);
}
$('twistL').onclick = () => twist(-1);
$('twistR').onclick = () => twist(1);
host.addEventListener('wheel', (e) => { if (e.shiftKey) { e.preventDefault(); twist(e.deltaY > 0 ? 1 : -1); } }, { passive: false });

// core gestures: click, double, triple, hold
let clicks = 0, clickT = null, holdT = null, held = false;
const coreBtn = $('core');
coreBtn.addEventListener('pointerdown', () => {
  held = false;
  holdT = setTimeout(() => {
    held = true; world.beacon = true; world.beaconUntil = world.t + 120; buzz(3, 'Meet at me sent to crew');
  }, 2000);
});
coreBtn.addEventListener('pointerup', () => {
  clearTimeout(holdT);
  if (held) return;
  clicks++; clearTimeout(clickT);
  clickT = setTimeout(() => {
    if (clicks === 1) { state.seeking = !state.seeking; buzz(1, state.seeking ? 'Seeking' : 'Idle'); }
    else if (clicks === 2) { world.you.ghost = true; world.ghostUntil = world.t + 1800; buzz(2, 'Ghost mode 30 min'); }
    else { world.sos = !world.sos; state.sosFlash = 0; buzz(5, world.sos ? 'SOS sent to crew' : 'SOS cleared'); }
    clicks = 0;
  }, 380);
});
$('explode').onclick = (e) => {
  state.explodeTarget = state.explodeTarget ? 0 : 1;
  e.currentTarget.classList.toggle('on', !!state.explodeTarget);
  if (!state.explodeTarget) $('info').hidden = true;
};
$('wander').oninput = (e) => (world.wander = +e.target.value);
$('noise').oninput = (e) => (world.noise = +e.target.value);
$('speed').oninput = (e) => (state.speed = +e.target.value);
$('drop').onclick = () => { const f = world.friends[state.sel]; f.dark = !f.dark; if (f.dark) f.lastPacket = world.t - 130; buzz(1, f.dark ? `${f.name} went dark` : `${f.name} back online`); };

// click a component
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.userData.part);
  if (!hit) { $('info').hidden = true; return; }
  showInfo(hit.object.userData.part);
});
function showInfo(name) {
  const p = parts[name].info;
  $('info').innerHTML = `<div class="num">${p.num}</div><h3>${p.title}</h3><p>${p.text}</p><dl>${p.specs.map(([a, b]) => `<dt>${a}</dt><dd style="margin:0">${b}</dd>`).join('')}</dl>`;
  $('info').hidden = false;
}

// keyboard
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.key.toLowerCase());
  if (e.key === 'q' || e.key === 'Q') twist(-1);
  if (e.key === 'e' || e.key === 'E') twist(1);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// map
const map = $('map'); const mctx = map.getContext('2d');
map.addEventListener('click', (e) => {
  const r = map.getBoundingClientRect();
  world.you.target = { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
});
function drawMap(rels) {
  const s = map.width / SIZE; const y = world.you;
  mctx.clearRect(0, 0, map.width, map.height);
  mctx.strokeStyle = '#1A1230'; mctx.lineWidth = 1;
  for (let g = 0; g <= SIZE; g += 100) { mctx.beginPath(); mctx.moveTo(g * s, 0); mctx.lineTo(g * s, map.height); mctx.moveTo(0, g * s); mctx.lineTo(map.width, g * s); mctx.stroke(); }
  STAGES.forEach((st) => {
    mctx.fillStyle = 'rgba(155,107,255,0.12)'; mctx.beginPath(); mctx.arc(st.x * s, st.y * s, st.r * s, 0, 7); mctx.fill();
    mctx.fillStyle = '#A89CC8'; mctx.font = '600 10px JetBrains Mono'; mctx.textAlign = 'center'; mctx.fillText(st.name, st.x * s, st.y * s + 3);
  });
  world.friends.forEach((f, i) => {
    const k = rels[i];
    const pos = f.known || f;
    const on = i === state.sel;
    if (on && state.seeking) {
      mctx.strokeStyle = f.hex; mctx.setLineDash([4, 6]); mctx.beginPath(); mctx.moveTo(y.x * s, y.y * s); mctx.lineTo(pos.x * s, pos.y * s); mctx.stroke(); mctx.setLineDash([]);
    }
    mctx.globalAlpha = k.dark ? 0.35 : 1;
    mctx.fillStyle = f.hex; mctx.beginPath(); mctx.arc(pos.x * s, pos.y * s, on ? 7 : 5, 0, 7); mctx.fill();
    if (on) { mctx.strokeStyle = f.hex; mctx.beginPath(); mctx.arc(pos.x * s, pos.y * s, 12, 0, 7); mctx.stroke(); }
    mctx.globalAlpha = 1;
    mctx.fillStyle = '#EDE6FF'; mctx.font = '500 11px Space Grotesk'; mctx.textAlign = 'left'; mctx.fillText(f.name, pos.x * s + 9, pos.y * s - 7);
  });
  // you
  mctx.save(); mctx.translate(y.x * s, y.y * s); mctx.rotate(y.heading * Math.PI / 180);
  if (world.beacon) { mctx.strokeStyle = '#D4FF3A'; mctx.beginPath(); mctx.arc(0, 0, 18 + (performance.now() / 40) % 20, 0, 7); mctx.stroke(); }
  mctx.fillStyle = world.sos ? '#FF3B3B' : '#EDE6FF';
  mctx.beginPath(); mctx.moveTo(0, -11); mctx.lineTo(7, 8); mctx.lineTo(0, 4); mctx.lineTo(-7, 8); mctx.closePath(); mctx.fill();
  mctx.restore();
  if (y.target) { mctx.strokeStyle = '#EDE6FF'; mctx.beginPath(); mctx.arc(y.target.x * s, y.target.y * s, 5, 0, 7); mctx.stroke(); }
}

function fmt(d) { return d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'; }

function readout(rels) {
  const f = CREW[state.sel]; const k = rels[state.sel];
  let msg;
  if (world.sos) msg = 'SOS active. Every crew band is flashing red and pointing at you.';
  else if (!state.seeking) msg = 'Idle. Click the core to start seeking.';
  else if (k.stale) msg = `No packet for ${Math.round(k.age)} s. Hollow light aims at their last known spot.`;
  else if (k.ble) msg = 'Under 10 m. BLE took over and the whole ring breathes. Look up.';
  else if (k.dist > 250) msg = 'Far. Long comet tail, slow haptic tick.';
  else msg = 'Closing in. Tail shortens as you get closer.';
  $('readout').innerHTML = `<div class="label">Seeking</div>
    <div class="read-big"><span class="name" style="color:${f.hex}">${f.name}</span><span class="dist">${fmt(k.dist)}</span></div>
    <div class="read-state">${msg}</div>
    <div class="crew">${world.friends.map((x, i) => `<div class="${rels[i].dark ? 'dead' : ''}"><i style="background:${x.hex}"></i>${x.name} ${fmt(rels[i].dist)}</div>`).join('')}</div>`;
  $('hud').innerHTML = `<span>HDG <b>${Math.round(world.you.heading)}°</b></span><span>BAT <b>${world.you.battery.toFixed(0)}%</b></span><span>${world.you.ghost ? '<b>GHOST</b>' : 'VISIBLE'}</span><span>${world.beacon ? '<b>BEACON</b>' : ''}</span>`;
}

// ---------- light rendering ----------
const tmp = new THREE.Color();
function drawLights(rels, t) {
  const f = CREW[state.sel]; const k = rels[state.sel];
  const col = new THREE.Color(f.hex);
  if (world.sos) {
    const on = Math.floor(t * 4) % 2 === 0;
    leds.forEach((l) => l.material.color.set(on ? 0xff2020 : 0x110000));
    headLight.color.set(0xff2020); headLight.intensity = on ? 2 : 0; return;
  }
  if (world.beacon) {
    leds.forEach((l, i) => { l.material.color.set(CREW[Math.floor(i / (N / 8))].hex).multiplyScalar(0.6 + 0.4 * Math.sin(t * 4 + i * 0.3)); });
    headLight.intensity = 0; return;
  }
  if (!state.seeking) {
    leds.forEach((l, i) => {
      let v = 0;
      if (state.mood === 0) v = 0.15 + 0.15 * Math.max(0, Math.sin(t * 3));
      if (state.mood === 1) tmp.setHSL((i / N + t * 0.05) % 1, 0.8, 0.5);
      if (state.mood === 1) l.material.color.copy(tmp).multiplyScalar(0.35);
      else l.material.color.copy(col).multiplyScalar(v);
    });
    headLight.intensity = 0; return;
  }
  if (k.ble) {
    const v = 0.55 + 0.45 * Math.sin(t * 5);
    leds.forEach((l) => l.material.color.copy(col).multiplyScalar(v * 1.6));
    headLight.color.copy(col); headLight.position.set(0, 0, 0); headLight.intensity = 2 * v; return;
  }
  // comet: rel bearing is where the friend is relative to your heading.
  // The bangle model is drawn north up in its own frame, so we rotate the light, not the band.
  const head = k.rel;
  const tail = Math.max(20, Math.min(170, k.dist / 2.5));
  leds.forEach((l, i) => {
    const ang = (i / N) * 360;
    const diff = ((head - ang) % 360 + 360) % 360;
    let v = diff <= tail ? Math.pow(1 - diff / tail, 1.6) : 0;
    if (k.stale) v = diff < 6 || diff > 354 ? 0.6 : 0.02 * (i % 4 === 0);
    l.material.color.copy(col).multiplyScalar(0.02 + v * 2.2);
  });
  const a = head * Math.PI / 180;
  headLight.color.copy(col); headLight.position.set(Math.sin(a) * R, 0.1, -Math.cos(a) * R); headLight.intensity = k.stale ? 0.3 : 1.5;
}

// ---------- loop ----------
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h); composer.setSize(w, h); bloom.resolution.set(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host); resize();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const sdt = dt * state.speed;
  const fwd = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const turn = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  move(world, fwd * state.speed, turn, dt);
  step(world, sdt);
  const rels = world.friends.map((f) => relation(world, f));

  // ring spins so the selected gem sits over the front notch (+Z)
  const want = -(state.sel / 8) * Math.PI * 2;
  let d = want - state.ringAngle; d = Math.atan2(Math.sin(d), Math.cos(d));
  state.ringAngle += d * Math.min(1, dt * 10);
  ringPivot.rotation.y = state.ringAngle;
  gemMeshes.forEach((m, i) => { const s = i === state.sel ? 1.45 : 1; m.scale.lerp(new THREE.Vector3(s, s, s), dt * 10); m.rotation.y += dt; });

  state.exploded += (state.explodeTarget - state.exploded) * Math.min(1, dt * 6);
  Object.values(parts).forEach((p) => (p.group.position.y = p.explodeY * state.exploded));

  drawLights(rels, now / 1000);
  drawMap(rels);
  if (Math.floor(now / 200) !== Math.floor((now - dt * 1000) / 200)) readout(rels);
  controls.update();
  composer.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
