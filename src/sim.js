// Festival world simulation. Units are meters. Bearing 0 is north, clockwise positive.

export const CREW = [
  { name: 'Mina', color: 'Volt', hex: '#D4FF3A', glyph: '●' },
  { name: 'Jay', color: 'Flare', hex: '#FF8A1F', glyph: '▲' },
  { name: 'Dani', color: 'Rose', hex: '#FF4FB8', glyph: '■' },
  { name: 'Theo', color: 'Ultra', hex: '#9B6BFF', glyph: '◆' },
  { name: 'Sol', color: 'Ice', hex: '#3DF5FF', glyph: '✦' },
  { name: 'Rae', color: 'Blaze', hex: '#FF3B3B', glyph: '✚' },
  { name: 'Kai', color: 'Gold', hex: '#FFD23D', glyph: '⬢' },
  { name: 'Lu', color: 'Ghost', hex: '#F4F0FF', glyph: '▼' },
];

export const SIZE = 800;
export const STAGES = [
  { name: 'MAIN STAGE', x: 400, y: 110, r: 70 },
  { name: 'BASS POD', x: 140, y: 420, r: 50 },
  { name: 'TRANCE TENT', x: 650, y: 380, r: 50 },
  { name: 'TECHNO WAREHOUSE', x: 420, y: 650, r: 55 },
  { name: 'ART CAR', x: 230, y: 200, r: 25 },
];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createWorld() {
  const you = { x: 400, y: 420, heading: 0, battery: 100, ghost: false, target: null };
  const friends = CREW.map((c, i) => {
    const s = STAGES[i % STAGES.length];
    return {
      ...c, i,
      x: clamp(s.x + rand(-60, 60), 10, SIZE - 10), y: clamp(s.y + rand(-60, 60), 10, SIZE - 10),
      vx: 0, vy: 0, goal: s, battery: rand(35, 95), dark: false,
      known: null, lastPacket: -999, pointingAtYou: false,
    };
  });
  // Sol starts very close to show the hot state
  friends[4].x = you.x + 6; friends[4].y = you.y - 4;
  return { you, friends, t: 0, packetEvery: 10, noise: 4, wander: 1, beacon: false, sos: false, ghostUntil: 0, beaconUntil: 0 };
}

export function step(w, dt) {
  w.t += dt;
  const y = w.you;
  // auto walk
  if (y.target) {
    const dx = y.target.x - y.x, dy = y.target.y - y.y, d = Math.hypot(dx, dy);
    if (d < 1.5) y.target = null;
    else {
      const sp = Math.min(d, 1.4 * dt);
      y.x += dx / d * sp; y.y += dy / d * sp;
      const want = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      let diff = ((want - y.heading + 540) % 360) - 180;
      y.heading = (y.heading + clamp(diff, -120 * dt, 120 * dt) + 360) % 360;
    }
  }
  y.battery = Math.max(0, y.battery - dt * 0.0009);
  if (w.ghostUntil && w.t > w.ghostUntil) { y.ghost = false; w.ghostUntil = 0; }
  if (w.beaconUntil && w.t > w.beaconUntil) { w.beacon = false; w.beaconUntil = 0; }

  for (const f of w.friends) {
    if (f.dark) continue;
    // drift between stages, with dancing jitter
    if (Math.random() < 0.0015 * w.wander * dt * 10) f.goal = STAGES[Math.floor(Math.random() * STAGES.length)];
    let gx = f.goal.x - f.x, gy = f.goal.y - f.y;
    const gd = Math.hypot(gx, gy);
    if (w.beacon) { gx = y.x - f.x; gy = y.y - f.y; }
    const g = Math.hypot(gx, gy) || 1;
    const pull = gd > f.goal.r || w.beacon ? 1.1 : 0.05;
    f.vx += (gx / g * pull + rand(-1, 1) * w.wander) * dt * 0.8;
    f.vy += (gy / g * pull + rand(-1, 1) * w.wander) * dt * 0.8;
    f.vx *= 0.9; f.vy *= 0.9;
    f.x = clamp(f.x + f.vx * dt, 5, SIZE - 5); f.y = clamp(f.y + f.vy * dt, 5, SIZE - 5);
    f.battery = Math.max(0, f.battery - dt * 0.001);
    if (f.battery <= 0) f.dark = true;
    f.pointingAtYou = w.beacon;
    // packet with GNSS noise every packetEvery seconds
    if (w.t - f.lastPacket >= w.packetEvery) {
      f.lastPacket = w.t;
      f.known = { x: f.x + rand(-w.noise, w.noise), y: f.y + rand(-w.noise, w.noise) };
    }
  }
}

export function relation(w, f) {
  const y = w.you;
  const k = f.known || f;
  const dx = k.x - y.x, dy = k.y - y.y;
  const gpsDist = Math.hypot(dx, dy);
  const trueDist = Math.hypot(f.x - y.x, f.y - y.y);
  const bearing = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const rel = (bearing - y.heading + 360) % 360;
  const age = w.t - f.lastPacket;
  const stale = f.dark && age > 120;
  // under 10 m the band trusts BLE signal strength, modeled as true distance with small jitter
  const ble = trueDist < 10;
  return { dist: ble ? trueDist : gpsDist, bearing, rel, ble, stale, age, dark: f.dark };
}

export function move(w, fwd, turn, dt) {
  const y = w.you;
  if (turn) y.heading = (y.heading + turn * 90 * dt + 360) % 360;
  if (fwd) {
    const a = y.heading * Math.PI / 180;
    y.x = clamp(y.x + Math.sin(a) * fwd * 2.2 * dt, 5, SIZE - 5);
    y.y = clamp(y.y - Math.cos(a) * fwd * 2.2 * dt, 5, SIZE - 5);
    y.target = null;
  }
}
