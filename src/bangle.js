import * as THREE from 'three';

export const CREW = [
  { name: 'Mina', color: 'Volt', hex: '#D4FF3A' },
  { name: 'Jay', color: 'Flare', hex: '#FF8A1F' },
  { name: 'Dani', color: 'Rose', hex: '#FF4FB8' },
  { name: 'Theo', color: 'Ultra', hex: '#9B6BFF' },
  { name: 'Sol', color: 'Ice', hex: '#3DF5FF' },
  { name: 'Rae', color: 'Blaze', hex: '#FF3B3B' },
  { name: 'Kai', color: 'Gold', hex: '#FFD23D' },
  { name: 'Lu', color: 'Ghost', hex: '#F4F0FF' },
];

const R = 1.6;
const N = 72;

// The ORBIT bangle. Ring lies in the XZ plane, -Z is the wearer's forward.
export function createBangle(scene) {
  const parts = {};
  const part = (name, info, explodeY) => {
    const g = new THREE.Group(); g.userData.part = name; scene.add(g);
    parts[name] = { group: g, info, explodeY };
    return g;
  };

  // 01 selector ring
  const ringMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.14, color: 0xf2eeff, clearcoat: 1, clearcoatRoughness: 0.1 });
  const sel = part('selector', {
    num: '01', title: 'Selector ring', text: 'Titanium ring that spins freely around the resin. Eight snap in gem sockets. A magnet under each socket clicks past a hall sensor, so the band knows which friend you picked.',
    specs: [['Material', 'Grade 2 titanium'], ['Detents', '8 magnetic'], ['Cost est', '$3.50 with gems']],
  }, 1.5);
  const pivot = new THREE.Group(); sel.add(pivot);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.36, 0.075, 32, 240), ringMat);
  ring.rotation.x = Math.PI / 2; ring.userData.part = 'selector'; pivot.add(ring);
  // knurled ticks on the ring
  const tickGeo = new THREE.BoxGeometry(0.02, 0.05, 0.16);
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const t = new THREE.Mesh(tickGeo, ringMat);
    t.position.set(Math.sin(a) * (R + 0.36), 0.07, Math.cos(a) * (R + 0.36)); t.rotation.y = a;
    pivot.add(t);
  }
  const gems = CREW.map((c, i) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshPhysicalMaterial({
      color: c.hex, roughness: 0.02, transmission: 0.55, thickness: 0.4, ior: 2.2, emissive: c.hex, emissiveIntensity: 0.35, clearcoat: 1,
    }));
    const a = (i / 8) * Math.PI * 2;
    m.position.set(Math.sin(a) * (R + 0.36), 0.14, Math.cos(a) * (R + 0.36));
    m.userData.part = 'selector'; pivot.add(m);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 24), ringMat);
    sock.position.copy(m.position).setY(0.06); pivot.add(sock);
    return m;
  });
  const notch = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  notch.rotation.x = Math.PI / 2; notch.position.set(0, 0.28, R + 0.18);

  // 02 resin
  const resinMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.12, thickness: 0.5, ior: 1.45, clearcoat: 0.8, clearcoatRoughness: 0.15, attenuationColor: new THREE.Color(0xc9b8ff), attenuationDistance: 1.5 });
  const resin = part('resin', {
    num: '02', title: 'Resin shell', text: 'Optical clear cast polyurethane, 7 mm deep. The inner face is frosted so the light reads as a soft glow, not hard dots. Sealed to IP54.',
    specs: [['Inner size', 'S 58, M 63, L 68 mm'], ['Band', '9 mm wide'], ['Cost est', '$2.20']],
  }, 0.75);
  const resinMesh = new THREE.Mesh(new THREE.TorusGeometry(R, 0.25, 64, 260), resinMat);
  resinMesh.rotation.x = Math.PI / 2; resinMesh.scale.z = 0.8; resinMesh.userData.part = 'resin';
  resin.add(resinMesh); resin.add(notch);

  // 03 light ribbon
  const ribbon = part('ribbon', {
    num: '03', title: 'Light ribbon', text: 'Seventy two side emitting RGB LEDs on a flex strip. Firmware draws a comet whose head points at your friend and stays locked to the world as you turn.',
    specs: [['LEDs', '72 RGB'], ['Peak draw', '~12 mA seeking'], ['Cost est', '$2.60']],
  }, 0);
  const ledGeo = new THREE.SphereGeometry(0.05, 12, 8);
  const leds = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
    const a = (i / N) * Math.PI * 2;
    m.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R);
    m.userData.part = 'ribbon'; ribbon.add(m); leds.push(m);
  }
  const head = new THREE.PointLight(0xff4fb8, 2, 3, 2); ribbon.add(head);

  // 04 flex brain
  const brain = part('brain', {
    num: '04', title: 'Flex brain', text: 'Ring shaped flex PCB. nRF52840 runs the show and handles BLE. SX1262 LoRa sends 24 byte encrypted location packets band to band. L76K GNSS fixes every 10 s. A 9 axis IMU gives your heading.',
    specs: [['Radio', 'LoRa 915 / 868 MHz'], ['Range', '~1 km in crowds'], ['Cost est', '$12.80']],
  }, -0.75);
  const pcb = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 8, 160), new THREE.MeshStandardMaterial({ color: 0x0f3d33, roughness: 0.5 }));
  pcb.rotation.x = Math.PI / 2; pcb.userData.part = 'brain'; brain.add(pcb);
  for (let i = 0; i < 6; i++) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.14), new THREE.MeshStandardMaterial({ color: 0x15121f, metalness: 0.5, roughness: 0.35 }));
    const a = (i / 6) * Math.PI * 2 + 0.4;
    chip.position.set(Math.sin(a) * R, 0.04, -Math.cos(a) * R); chip.rotation.y = -a;
    chip.userData.part = 'brain'; brain.add(chip);
  }

  // 05 cells
  const battery = part('battery', {
    num: '05', title: 'Curved cells', text: 'Two 120 mAh arc LiPo cells on opposite sides, so the bangle balances instead of rolling. About 28 h of normal use, about 40 h in festival saver mode.',
    specs: [['Capacity', '240 mAh'], ['Average draw', '~8.5 mA'], ['Cost est', '$2.80']],
  }, -1.5);
  const cellMat = new THREE.MeshStandardMaterial({ color: 0xc9c3dc, metalness: 0.9, roughness: 0.25 });
  [0.35, Math.PI + 0.35].forEach((s) => {
    const c = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 12, 60, Math.PI * 0.7), cellMat);
    c.rotation.x = Math.PI / 2; c.rotation.z = s; c.userData.part = 'battery'; battery.add(c);
  });

  // 06 core
  const core = part('core', {
    num: '06', title: 'Core segment', text: 'The slim block at the back of the wrist. Hall sensors, haptic motor and three magnetic charge pins. Squeeze to seek, hold to call your crew to you.',
    specs: [['Charge', 'Magnetic, 90 min'], ['Haptic', 'LRA motor'], ['Cost est', '$1.30']],
  }, -2.2);
  const coreMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 8, 20), new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.32, color: 0x9d97b0, clearcoat: 0.4 }));
  coreMesh.rotation.z = Math.PI / 2; coreMesh.position.set(0, 0, R + 0.02); coreMesh.userData.part = 'core';
  core.add(coreMesh);

  let ringAngle = 0, exploded = 0;
  const col = new THREE.Color(), tmp = new THREE.Color();

  return {
    parts,
    // mode: 'idle' | 'seek' | 'hot' | 'found' | 'pick'
    update(dt, t, { sel, rel, dist, mode, explode }) {
      const want = -(sel / 8) * Math.PI * 2;
      let d = want - ringAngle; d = Math.atan2(Math.sin(d), Math.cos(d));
      ringAngle += d * Math.min(1, dt * 9);
      pivot.rotation.y = ringAngle;
      gems.forEach((g, i) => { const s = i === sel ? 1.5 : 1; g.scale.lerp(new THREE.Vector3(s, s, s), Math.min(1, dt * 10)); g.rotation.y += dt * 0.8; });
      exploded += ((explode ? 1 : 0) - exploded) * Math.min(1, dt * 6);
      Object.values(parts).forEach((p) => (p.group.position.y = p.explodeY * exploded));

      col.set(CREW[sel].hex);
      if (mode === 'idle') {
        leds.forEach((l, i) => l.material.color.copy(col).multiplyScalar(0.08 + 0.08 * Math.max(0, Math.sin(t * 2.5 - i * 0.1))));
        head.intensity = 0; return;
      }
      if (mode === 'pick') {
        const v = Math.max(0, 1 - ((t * 2) % 1) * 1.5);
        leds.forEach((l) => l.material.color.copy(col).multiplyScalar(0.15 + v * 1.4));
        head.position.set(0, 0, 0); head.color.copy(col); head.intensity = 1.5 * v; return;
      }
      if (mode === 'hot' || mode === 'found') {
        const speed = mode === 'found' ? 3 : 6;
        const v = 0.55 + 0.45 * Math.sin(t * speed);
        leds.forEach((l, i) => {
          const sparkle = mode === 'found' ? 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7) : 1;
          l.material.color.copy(col).multiplyScalar((0.6 + v * 1.6) * sparkle);
        });
        head.position.set(0, 0.2, 0); head.color.copy(col); head.intensity = 2.5 * v; return;
      }
      const tail = Math.max(22, Math.min(170, dist * 1.6));
      leds.forEach((l, i) => {
        const ang = (i / N) * 360;
        const diff = ((rel - ang) % 360 + 360) % 360;
        const v = diff <= tail ? Math.pow(1 - diff / tail, 1.8) : 0;
        l.material.color.copy(col).multiplyScalar(0.02 + v * 3.2);
      });
      const a = rel * Math.PI / 180;
      head.color.copy(col); head.position.set(Math.sin(a) * R, 0.15, -Math.cos(a) * R); head.intensity = 2.2;
    },
  };
}
