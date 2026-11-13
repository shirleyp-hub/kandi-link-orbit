import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createFestival, createAvatar, STAGE_Z } from './festival.js';
import { createBangle, CREW } from './bangle.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap180 = (d) => ((d % 360) + 540) % 360 - 180;

// ---------------- world ----------------
const worldEl = $('world');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
worldEl.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.domElement.style.cssText = 'position:fixed;inset:0;pointer-events:none';
document.body.insertBefore(labels.domElement, worldEl.nextSibling);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const fest = createFestival(scene);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.55, 0.7);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// crew spread through the crowd, Dani behind you to the right
const START = { x: 0, z: -42 };
const SPOTS = [
  { x: -30, z: -70 }, { x: 22, z: 6 }, { x: 36, z: -14 }, { x: -40, z: -18 },
  { x: 10, z: -72 }, { x: -18, z: 18 }, { x: 46, z: -50 }, { x: -52, z: -44 },
];
const friends = CREW.map((c, i) => {
  const a = createAvatar(scene, c.hex, { armsUp: true });
  a.group.position.set(SPOTS[i].x, 0, SPOTS[i].z);
  a.group.rotation.y = Math.PI;
  const el = document.createElement('div'); el.className = 'label'; el.style.color = c.hex;
  const lab = new CSS2DObject(el); lab.position.set(0, 2.6, 0); a.group.add(lab);
  return { ...a, c, el, lab, home: { ...SPOTS[i] }, ph: i * 0.9 };
});
const you = createAvatar(scene, '#FFFFFF', { armsUp: false });
you.halo.material.color.set('#EDE6FF');
const youLabelEl = document.createElement('div'); youLabelEl.className = 'label'; youLabelEl.style.color = '#EDE6FF'; youLabelEl.textContent = 'YOU';
const youLabel = new CSS2DObject(youLabelEl); youLabel.position.set(0, 2.4, 0); you.group.add(youLabel);

// ground guide from you to the friend, a ribbon of light
const guideGeo = new THREE.PlaneGeometry(1, 1, 1, 1); guideGeo.translate(0, 0.5, 0); guideGeo.rotateX(-Math.PI / 2);
const guideMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { t: { value: 0 }, c: { value: new THREE.Color('#FF4FB8') }, o: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform float t; uniform vec3 c; uniform float o; varying vec2 vUv;
    void main(){ float edge = smoothstep(.5,.0,abs(vUv.x-.5));
      float dash = smoothstep(.3,.5,fract(vUv.y*24.-t*2.)) * smoothstep(1.,.7,fract(vUv.y*24.-t*2.));
      float fade = smoothstep(0.,.08,vUv.y)*smoothstep(1.,.85,vUv.y);
      gl_FragColor = vec4(c*(.35+dash)*edge*fade*o, 1.); }`,
});
const guide = new THREE.Mesh(guideGeo, guideMat); guide.position.y = 0.03; scene.add(guide);

// reunion burst
const burstN = 400;
const burstGeo = new THREE.BufferGeometry();
const bp = new Float32Array(burstN * 3), bv = [];
burstGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
const burst = new THREE.Points(burstGeo, new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
scene.add(burst);
function fireBurst(x, z, hex) {
  burst.material.color.set(hex); burst.material.opacity = 1;
  for (let i = 0; i < burstN; i++) {
    bp.set([x, 1.6, z], i * 3);
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = 2 + Math.random() * 5;
    bv[i] = [Math.sqrt(1 - u * u) * Math.cos(a) * s, Math.abs(u) * s + 2, Math.sqrt(1 - u * u) * Math.sin(a) * s];
  }
  burstGeo.attributes.position.needsUpdate = true;
}

// ---------------- wrist view ----------------
const wristEl = $('wristView');
const wr = new THREE.WebGLRenderer({ antialias: true });
wr.setPixelRatio(Math.min(devicePixelRatio, 2));
wr.toneMapping = THREE.ACESFilmicToneMapping; wr.toneMappingExposure = 0.8;
wristEl.appendChild(wr.domElement);
const ws = new THREE.Scene();
ws.background = new THREE.Color(0x0b0716);
const pm = new THREE.PMREMGenerator(wr);
ws.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; ws.environmentIntensity = 0.22;
const wcam = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
const band = createBangle(ws);
const wcomp = new EffectComposer(wr);
wcomp.addPass(new RenderPass(ws, wcam));
const wbloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.45, 0.75);
wcomp.addPass(wbloom); wcomp.addPass(new OutputPass());
// subtle skin disc under the band so it reads as worn
const skin = new THREE.Mesh(new THREE.CircleGeometry(1.32, 64), new THREE.MeshPhysicalMaterial({ color: 0x2a1c1f, roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color(0x8a5a55), sheenRoughness: 0.6 }));
skin.rotation.x = -Math.PI / 2; skin.position.y = -0.12; ws.add(skin);

// ---------------- state ----------------
const S = {
  mode: 'story', step: 0, stepT: 0, playing: true,
  sel: 0, target: 2, pickedByUser: false,
  pos: { x: START.x, z: START.z }, heading: 0, walked: 0,
  explode: false, bandMode: 'idle', foundAt: null,
  cam: new THREE.Vector3(0, 40, 20), look: new THREE.Vector3(0, 0, -40),
};
const trail = [];

const STEPS = [
  { id: 'lost', title: 'Lost', dur: 8, k: '01 · Lost', t: 'Headliner drops. Phone dies. Crew gone.', b: 'Nine hundred people between you and your friends. No bars, no battery, no meeting spot that anyone can find in the dark.' },
  { id: 'pick', title: 'Pick', dur: 6.5, k: '02 · Pick', t: 'Twist the ring to Dani.', b: 'Each click lands on one friend\'s gem. One buzz per position, so you can do it without looking. Tap a different friend below to change who you find.' },
  { id: 'point', title: 'Point', dur: 6.5, k: '03 · Point', t: 'The light finds her.', b: 'A point of light swings around the band and stops where Dani is. Right now that is behind you, to the right.' },
  { id: 'walk', title: 'Walk', dur: null, k: '04 · Walk', t: 'Turn until the light is ahead. Go.', b: 'The light stays locked on Dani as you turn and move. The tail shortens as you close in. Under 10 m the whole ring starts breathing.' },
  { id: 'found', title: 'Found', dur: 10, k: '05 · Found', t: 'Found. No phone needed.', b: '' },
];

// ---------------- UI ----------------
const stepsEl = $('steps');
STEPS.forEach((s, i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button" aria-label="Go to step ${s.title}"><span class="bar"><i></i></span><span class="lab">${s.title}</span></button>`;
  li.querySelector('button').onclick = () => goStep(i);
  stepsEl.appendChild(li);
});
const crewEl = $('crew');
CREW.forEach((c, i) => {
  const b = document.createElement('button'); b.type = 'button';
  b.innerHTML = `<i style="background:${c.hex};box-shadow:0 0 10px ${c.hex}"></i>${c.name}`;
  b.onclick = () => choose(i, true);
  crewEl.appendChild(b);
});
function paintCrew() { [...crewEl.children].forEach((b, i) => b.classList.toggle('on', i === S.target)); }

function buzz(n, text) {
  const el = $('buzz'); el.textContent = `${'◉ '.repeat(n)}${text}`; el.classList.add('show');
  clearTimeout(buzz.t); buzz.t = setTimeout(() => el.classList.remove('show'), 1400);
  if (navigator.vibrate) try { navigator.vibrate(Array.from({ length: n * 2 - 1 }, (_, i) => (i % 2 ? 70 : 45))); } catch (e) { /* ignore */ }
}
function setAccent() {
  const hex = CREW[S.target].hex;
  document.documentElement.style.setProperty('--accent', hex);
  guideMat.uniforms.c.value.set(hex);
}
function choose(i, byUser) {
  S.target = i; S.pickedByUser = byUser;
  if (S.mode === 'free') { S.sel = i; buzz(i + 1, `${CREW[i].name} · ${CREW[i].color}`); }
  else if (byUser && S.step <= 1) { goStep(1); }
  else if (byUser) { S.sel = i; buzz(i + 1, `${CREW[i].name} · ${CREW[i].color}`); }
  paintCrew(); setAccent(); setCaption();
}
function setCaption() {
  const s = STEPS[S.step]; const n = CREW[S.target].name;
  $('capK').textContent = s.k;
  $('capT').textContent = s.t.replace('Dani', n).replace('her', n === 'Dani' ? 'her' : 'them');
  let b = s.b.replace(/Dani/g, n);
  if (s.id === 'found') b = `${n} is right here. You crossed ${Math.round(Math.max(S.walked, Math.hypot(SPOTS[S.target].x - START.x, SPOTS[S.target].z - START.z)))} m of crowd on light alone. Both bands breathe the same color so you spot each other in the crowd.`;
  $('capB').textContent = b;
  [...stepsEl.children].forEach((li, i) => li.classList.toggle('on', i === S.step));
}
function goStep(i) {
  S.step = clamp(i, 0, STEPS.length - 1); S.stepT = 0;
  const id = STEPS[S.step].id;
  if (id === 'lost' || id === 'pick' || id === 'point') {
    S.pos = { ...START }; S.heading = 0; S.walked = 0; trail.length = 0; S.foundAt = null;
    friends.forEach((f) => { f.group.position.set(f.home.x, 0, f.home.z); });
  }
  if (id === 'lost') S.sel = 0;
  if (id === 'pick') S.sel = (S.target + 6) % 8;
  if (id === 'point' || id === 'walk') S.sel = S.target;
  if (id === 'found') {
    S.sel = S.target;
    const f = friends[S.target].group.position;
    const a = Math.atan2(S.pos.x - f.x, S.pos.z - f.z);
    if (Math.hypot(S.pos.x - f.x, S.pos.z - f.z) > 3) { S.pos = { x: f.x + Math.sin(a) * 1.6, z: f.z + Math.cos(a) * 1.6 }; }
    fireBurst(f.x, f.z, CREW[S.target].hex);
  }
  $('wrist').classList.toggle('big', id === 'pick' || id === 'point');
  $('crew').classList.toggle('ask', id === 'pick');
  setCaption();
}
$('prev').onclick = () => goStep(S.step - 1);
$('next').onclick = () => (S.step === STEPS.length - 1 ? goStep(0) : goStep(S.step + 1));
$('play').onclick = () => { S.playing = !S.playing; $('play').textContent = S.playing ? 'Pause' : 'Play'; };
$('explode').onclick = (e) => { S.explode = !S.explode; e.currentTarget.classList.toggle('on', S.explode); if (!S.explode) $('info').hidden = true; };

function setMode(m) {
  S.mode = m;
  $('modeStory').classList.toggle('on', m === 'story'); $('modeStory').setAttribute('aria-selected', m === 'story');
  $('modeFree').classList.toggle('on', m === 'free'); $('modeFree').setAttribute('aria-selected', m === 'free');
  $('story').hidden = m !== 'story'; $('free').hidden = m !== 'free';
  $('wrist').classList.remove('big'); $('crew').classList.remove('ask');
  if (m === 'free') { S.sel = S.target; S.foundAt = null; } else goStep(0);
}
$('modeStory').onclick = () => setMode('story');
$('modeFree').onclick = () => setMode('free');

const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (S.mode === 'free' && (e.key === 'q' || e.key === 'e')) choose((S.target + (e.key === 'e' ? 1 : 7)) % 8, true);
  if (S.mode === 'free' && e.key.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// click parts in the wrist view
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
wr.domElement.addEventListener('click', (e) => {
  if (!S.explode) return;
  const r = wr.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, wcam);
  const hit = ray.intersectObjects(ws.children, true).find((h) => h.object.userData.part);
  if (!hit) { $('info').hidden = true; return; }
  const p = band.parts[hit.object.userData.part].info;
  $('info').innerHTML = `<div class="num">${p.num}</div><h3>${p.title}</h3><p>${p.text}</p><dl>${p.specs.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
  $('info').hidden = false;
});

// ---------------- minimap ----------------
const mini = $('mini'), mx = mini.getContext('2d');
const MAP = { x0: -70, x1: 70, z0: -110, z1: 30 };
const toMap = (x, z) => [((x - MAP.x0) / (MAP.x1 - MAP.x0)) * mini.width, ((z - MAP.z0) / (MAP.z1 - MAP.z0)) * mini.height];
function drawMini(t) {
  const W = mini.width;
  mx.fillStyle = '#0a0614'; mx.fillRect(0, 0, W, W);
  mx.fillStyle = 'rgba(155,107,255,0.06)';
  for (let i = 0; i < fest.people.length; i += 2) { const p = fest.people[i]; const [a, b] = toMap(p.x, p.z); mx.fillRect(a, b, 2, 2); }
  const [sx, sz] = toMap(-23, STAGE_Z); const [ex] = toMap(23, STAGE_Z);
  mx.fillStyle = '#FF4FB8'; mx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3); mx.fillRect(sx, sz - 6, ex - sx, 8); mx.globalAlpha = 1;
  mx.font = '600 16px JetBrains Mono'; mx.fillStyle = '#A89CC8'; mx.textAlign = 'center'; mx.fillText('MAIN STAGE', W / 2, sz + 26);
  if (trail.length > 1) {
    mx.strokeStyle = 'rgba(237,230,255,.5)'; mx.setLineDash([4, 6]); mx.lineWidth = 2; mx.beginPath();
    trail.forEach((p, i) => { const [a, b] = toMap(p.x, p.z); i ? mx.lineTo(a, b) : mx.moveTo(a, b); }); mx.stroke(); mx.setLineDash([]);
  }
  friends.forEach((f, i) => {
    const [a, b] = toMap(f.group.position.x, f.group.position.z);
    const on = i === S.target;
    mx.fillStyle = f.c.hex; mx.globalAlpha = on ? 1 : 0.45;
    mx.beginPath(); mx.arc(a, b, on ? 8 : 5, 0, 7); mx.fill();
    if (on) { mx.strokeStyle = f.c.hex; mx.lineWidth = 2; mx.beginPath(); mx.arc(a, b, 14 + (t * 20) % 10, 0, 7); mx.stroke(); }
    mx.globalAlpha = 1;
  });
  const [ux, uz] = toMap(S.pos.x, S.pos.z);
  mx.save(); mx.translate(ux, uz); mx.rotate(S.heading * Math.PI / 180);
  mx.fillStyle = '#FFFFFF'; mx.beginPath(); mx.moveTo(0, -12); mx.lineTo(8, 9); mx.lineTo(0, 4); mx.lineTo(-8, 9); mx.closePath(); mx.fill();
  mx.restore();
}

// ---------------- loop ----------------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h); bloom.resolution.set(w, h); labels.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
new ResizeObserver(() => {
  const w = wristEl.clientWidth, h = wristEl.clientHeight; if (!w || !h) return;
  wr.setSize(w, h); wcomp.setSize(w, h); wbloom.resolution.set(w, h);
  wcam.aspect = w / h; wcam.updateProjectionMatrix();
}).observe(wristEl);

const fwdVec = (deg) => ({ x: Math.sin(deg * Math.PI / 180), z: -Math.cos(deg * Math.PI / 180) });
const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
let last = performance.now(), pickTick = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  const f = friends[S.target];
  const fp = f.group.position;
  const dx = fp.x - S.pos.x, dz = fp.z - S.pos.z;
  const dist = Math.hypot(dx, dz);
  const bearing = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  const step = STEPS[S.step].id;

  if (S.mode === 'story') {
    if (S.playing) S.stepT += dt;
    const dur = STEPS[S.step].dur;
    if (step === 'pick' && S.playing) {
      pickTick += dt;
      if (pickTick > 0.75 && S.sel !== S.target) { pickTick = 0; S.sel = (S.sel + 1) % 8; buzz(S.sel + 1, `${CREW[S.sel].name} · ${CREW[S.sel].color}`); }
    }
    if (step === 'walk' && S.playing) {
      const desired = bearing;
      const weave = Math.sin(t * 1.7) * 9;
      const diff = wrap180(desired + weave - S.heading);
      const turnRate = S.stepT < 1.2 ? 0 : 75;
      S.heading = (S.heading + clamp(diff, -turnRate * dt, turnRate * dt) + 360) % 360;
      if (S.stepT > 1.2 && Math.abs(wrap180(desired - S.heading)) < 50 && dist > 1.8) {
        const sp = (dist < 10 ? 1.8 : 3.4) * dt; const v = fwdVec(S.heading);
        S.pos.x += v.x * sp; S.pos.z += v.z * sp; S.walked += sp;
        if (!trail.length || Math.hypot(trail.at(-1).x - S.pos.x, trail.at(-1).z - S.pos.z) > 1) trail.push({ ...S.pos });
      }
      if (dist < 2.2) goStep(4);
    }
    if (dur && S.stepT > dur && S.playing) { if (S.step < STEPS.length - 1) goStep(S.step + 1); }
    S.bandMode = step === 'lost' ? 'idle' : step === 'pick' ? (S.sel === S.target ? 'seek' : 'pick') : step === 'found' ? 'found' : dist < 10 ? 'hot' : 'seek';
    // progress bars
    [...stepsEl.children].forEach((li, i) => {
      const bar = li.querySelector('i');
      const d = STEPS[i].dur;
      bar.style.width = i < S.step ? '100%' : i > S.step ? '0%' : `${d ? clamp(S.stepT / d, 0, 1) * 100 : clamp(1 - (dist - 2) / 45, 0, 1) * 100}%`;
    });
  } else {
    const fwd = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const turn = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    S.heading = (S.heading + turn * 95 * dt + 360) % 360;
    if (fwd) { const v = fwdVec(S.heading); S.pos.x += v.x * fwd * 4 * dt; S.pos.z += v.z * fwd * 4 * dt; S.walked += Math.abs(fwd) * 4 * dt; if (!trail.length || Math.hypot(trail.at(-1).x - S.pos.x, trail.at(-1).z - S.pos.z) > 1) trail.push({ ...S.pos }); }
    if (dist < 2.2 && !S.foundAt) { S.foundAt = t; fireBurst(fp.x, fp.z, f.c.hex); buzz(3, `Found ${f.c.name}`); }
    if (dist > 4) S.foundAt = null;
    S.bandMode = S.foundAt ? 'found' : dist < 10 ? 'hot' : 'seek';
    // crew drift gently in free roam
    friends.forEach((fr, i) => { if (i === S.target && dist < 6) return; fr.group.position.x = fr.home.x + Math.sin(t * 0.07 + fr.ph) * 6; fr.group.position.z = fr.home.z + Math.cos(t * 0.05 + fr.ph) * 6; });
  }

  // avatars
  you.group.position.set(S.pos.x, 0, S.pos.z);
  you.group.rotation.y = -S.heading * Math.PI / 180;
  const moving = S.mode === 'story' ? step === 'walk' && S.stepT > 1.2 : keys.size > 0;
  you.body.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.06 : Math.abs(Math.sin(t * 3)) * 0.03;
  const bandHex = S.bandMode === 'idle' ? '#EDE6FF' : CREW[S.sel].hex;
  you.band.material.color.set(bandHex); you.glow.color.set(bandHex);
  you.glow.intensity = S.bandMode === 'idle' ? 0.6 : 2.5 + Math.sin(t * 6) * (S.bandMode === 'hot' || S.bandMode === 'found' ? 1.5 : 0.3);
  friends.forEach((fr, i) => {
    const on = i === S.target;
    fr.body.position.y = Math.abs(Math.sin(t * 2.4 + fr.ph)) * 0.12;
    const found = S.bandMode === 'found' && on;
    if (found) { fr.group.rotation.y = Math.atan2(S.pos.x - fr.group.position.x, S.pos.z - fr.group.position.z); }
    else fr.group.rotation.y = Math.PI + Math.sin(t * 0.8 + fr.ph) * 0.3;
    const pulse = on && (S.bandMode === 'hot' || found) ? 2 + Math.sin(t * 6) * 1.5 : on && step !== 'lost' ? 1.6 : 0.5;
    fr.glow.intensity = pulse;
    fr.halo.visible = on && (step !== 'lost' || S.mode === 'free');
    fr.halo.scale.setScalar(1 + ((t * 0.8) % 1) * (found ? 2.5 : 0.6));
    fr.halo.material.opacity = 0.6 * (1 - ((t * 0.8) % 1));
    const d = Math.hypot(fr.group.position.x - S.pos.x, fr.group.position.z - S.pos.z);
    const showLabel = (S.mode === 'story' && step === 'lost') || on;
    fr.lab.visible = showLabel;
    fr.el.className = 'label' + (step === 'lost' && S.mode === 'story' ? ' ghost' : '');
    fr.el.textContent = step === 'lost' && S.mode === 'story' ? `${fr.c.name.toUpperCase()} ?` : `${fr.c.name.toUpperCase()} · ${Math.round(d)} M`;
  });
  youLabel.visible = S.mode === 'story' && step === 'lost';

  // ground guide
  const showGuide = S.mode === 'story' ? step === 'point' || step === 'walk' : true;
  guideMat.uniforms.o.value += ((showGuide && dist > 2.5 ? (step === 'point' ? 0.9 : 0.45) : 0) - guideMat.uniforms.o.value) * Math.min(1, dt * 3);
  guideMat.uniforms.t.value = t;
  guide.position.set(S.pos.x, 0.03, S.pos.z);
  guide.rotation.y = -bearing * Math.PI / 180;
  guide.scale.set(0.6, 1, Math.max(0.1, dist - 1));

  // burst physics
  if (burst.material.opacity > 0) {
    for (let i = 0; i < burstN; i++) { bv[i][1] -= 4 * dt; bp[i * 3] += bv[i][0] * dt; bp[i * 3 + 1] = Math.max(0.05, bp[i * 3 + 1] + bv[i][1] * dt); bp[i * 3 + 2] += bv[i][2] * dt; }
    burstGeo.attributes.position.needsUpdate = true; burst.material.opacity = Math.max(0, burst.material.opacity - dt * 0.35);
  }

  // camera choreography
  const h = S.heading * Math.PI / 180;
  const back = (dist, up, side = 0) => camTarget.set(S.pos.x - Math.sin(h) * dist + Math.cos(h) * side, up, S.pos.z + Math.cos(h) * dist + Math.sin(h) * side);
  if (S.mode === 'free') { back(7, 3.6); const v = fwdVec(S.heading); lookTarget.set(S.pos.x + v.x * 8, 1.4, S.pos.z + v.z * 8); }
  else if (step === 'lost') {
    const a = t * 0.12, r = 34 - Math.min(14, S.stepT * 1.6);
    camTarget.set(S.pos.x + Math.sin(a) * r, 26 - Math.min(14, S.stepT * 1.5), S.pos.z + Math.cos(a) * r); lookTarget.set(S.pos.x, 1, S.pos.z - 4);
  } else if (step === 'pick') { back(4.2, 2.6, 1.2); lookTarget.set(S.pos.x, 1.5, S.pos.z - 6); }
  else if (step === 'point') { back(9, 7.5, 2); lookTarget.set((S.pos.x + fp.x) / 2, 0.5, (S.pos.z + fp.z) / 2); }
  else if (step === 'walk') { back(7.5, 3.8); const v = fwdVec(S.heading); lookTarget.set(S.pos.x + v.x * 10, 1.3, S.pos.z + v.z * 10); }
  else if (step === 'found') {
    const a = t * 0.25, mxp = (S.pos.x + fp.x) / 2, mzp = (S.pos.z + fp.z) / 2;
    camTarget.set(mxp + Math.sin(a) * 5.5, 2.6, mzp + Math.cos(a) * 5.5); lookTarget.set(mxp, 1.3, mzp);
  }
  const k = 1 - Math.exp(-dt * (step === 'lost' && S.mode === 'story' ? 1.2 : 2.2));
  S.cam.lerp(camTarget, k); S.look.lerp(lookTarget, k);
  camera.position.copy(S.cam); camera.lookAt(S.look);

  fest.update(t, [{ x: S.pos.x, z: S.pos.z }, ...friends.map((fr) => ({ x: fr.group.position.x, z: fr.group.position.z }))]);

  // band
  const rel = (bearing - S.heading + 360) % 360;
  band.update(dt, t, { sel: S.sel, rel, dist, mode: S.bandMode, explode: S.explode });
  const wa = t * 0.15;
  const wd = S.explode ? 11.5 : 8;
  wcam.position.set(Math.sin(wa) * 0.6, wd * 0.82, wd * 0.58); wcam.lookAt(0, S.explode ? -0.3 : 0, 0);
  $('wristMode').textContent = { idle: 'Idle', pick: 'Choosing', seek: `Seeking ${CREW[S.sel].name}`, hot: 'Under 10 m', found: 'Found' }[S.bandMode];
  $('dist').textContent = step === 'lost' && S.mode === 'story' ? '· · ·' : `${Math.round(dist)} m`;
  $('bandBat').textContent = `${Math.max(1, 86 - Math.floor(S.walked / 40))}%`;

  drawMini(t);
  composer.render();
  labels.render(scene, camera);
  wcomp.render();
  requestAnimationFrame(frame);
}

paintCrew(); setAccent(); goStep(0);
requestAnimationFrame(frame);
