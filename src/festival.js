import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// World units are meters. North is -Z. The main stage sits north.
export const STAGE_Z = -95;

function personGeometry(armsUp = true) {
  const parts = [];
  const add = (g, x, y, z, rz = 0, rx = 0) => { g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); parts.push(g); };
  add(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), 0, 1.12, 0);
  add(new THREE.SphereGeometry(0.13, 12, 10), 0, 1.66, 0);
  add(new THREE.CapsuleGeometry(0.085, 0.72, 4, 8), 0.1, 0.45, 0);
  add(new THREE.CapsuleGeometry(0.085, 0.72, 4, 8), -0.1, 0.45, 0);
  if (armsUp) {
    add(new THREE.CapsuleGeometry(0.055, 0.6, 4, 8), 0.32, 1.65, 0, -0.45);
    add(new THREE.CapsuleGeometry(0.055, 0.6, 4, 8), -0.32, 1.65, 0, 0.45);
  } else {
    add(new THREE.CapsuleGeometry(0.055, 0.6, 4, 8), 0.27, 1.05, 0, 0.12);
    add(new THREE.CapsuleGeometry(0.055, 0.6, 4, 8), -0.27, 1.05, 0, -0.12);
  }
  return mergeGeometries(parts);
}

export function createFestival(scene) {
  scene.background = new THREE.Color(0x07040d);
  scene.fog = new THREE.FogExp2(0x120a24, 0.0105);

  // wet field that catches stage colour
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x1a1428, roughness: 0.5, metalness: 0.25 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  scene.add(new THREE.HemisphereLight(0x6a4fb0, 0x0a0612, 1.1));
  // stage wash from the north rims the crowd, cool fill from behind
  const rim = new THREE.DirectionalLight(0xff4fb8, 2.2); rim.position.set(-20, 30, -120); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x3df5ff, 1.6); rim2.position.set(30, 25, -120); scene.add(rim2);
  const fill = new THREE.DirectionalLight(0x9b6bff, 0.6); fill.position.set(0, 20, 60); scene.add(fill);
  // floor lights scattered in the crowd
  [[-25, -60, 0xff4fb8], [20, -30, 0x3df5ff], [-15, -10, 0x9b6bff], [35, -65, 0xd4ff3a], [0, 10, 0xff4fb8]].forEach(([x, z, c]) => {
    const l = new THREE.PointLight(c, 60, 40, 1.6); l.position.set(x, 6, z); scene.add(l);
  });

  // stage
  const stage = new THREE.Group(); stage.position.z = STAGE_Z; scene.add(stage);
  const truss = new THREE.MeshStandardMaterial({ color: 0x1a1726, metalness: 0.8, roughness: 0.4 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(46, 2.2, 14), truss); deck.position.y = 1.1; stage.add(deck);
  [-23, 23].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 1.2), truss); p.position.set(x, 11, -4); stage.add(p); });
  const top = new THREE.Mesh(new THREE.BoxGeometry(48, 1.2, 1.2), truss); top.position.set(0, 22, -4); stage.add(top);
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t; varying vec2 vUv;
      vec3 pal(float x){ return 0.5+0.5*cos(6.2831*(x+vec3(0.0,0.33,0.67))); }
      void main(){
        vec2 g = floor(vUv*vec2(96.,40.))/vec2(96.,40.);
        float r = length(g-vec2(.5,.45));
        float w = sin(r*28.-t*3.)*.5+.5;
        float bars = step(.5, fract(g.x*12.+t*.4));
        vec3 c = mix(vec3(.95,.25,.72), vec3(.24,.96,1.), w);
        c = mix(c, pal(g.x+t*.1), .25) * (.55+.45*bars);
        gl_FragColor = vec4(c*0.85,1.);
      }`,
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 17), wallMat); wall.position.set(0, 11.5, -3.3); stage.add(wall);

  // light cones and lasers
  const beams = [];
  const coneMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beamColors = [0xff4fb8, 0x3df5ff, 0x9b6bff, 0xd4ff3a, 0xff4fb8, 0x3df5ff];
  beamColors.forEach((c, i) => {
    const g = new THREE.ConeGeometry(4, 60, 32, 1, true); g.translate(0, -30, 0);
    const m = new THREE.Mesh(g, coneMat(c));
    const pivot = new THREE.Group(); pivot.position.set(-20 + i * 8, 21.5, -2); pivot.add(m); stage.add(pivot);
    const spot = new THREE.SpotLight(c, 160, 120, 0.22, 0.6, 1.4); spot.position.set(0, 0, 0); pivot.add(spot); pivot.add(spot.target); spot.target.position.set(0, -10, 0);
    beams.push({ pivot, phase: i * 1.3 });
  });
  const lasers = [];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.CylinderGeometry(0.03, 0.03, 160, 6, 1, true); g.translate(0, 80, 0);
    const c = [0x3df5ff, 0xd4ff3a, 0xff4fb8][i % 3];
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    const pivot = new THREE.Group(); pivot.position.set(-14 + i * 2.2, 3, 4); pivot.add(m); stage.add(pivot);
    lasers.push({ pivot, phase: i * 0.45 });
  }

  // crowd
  const geo = personGeometry(true);
  const COUNT = 900;
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.1 });
  const crowd = new THREE.InstancedMesh(geo, crowdMat, COUNT);
  const people = [];
  const c = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    // denser toward the stage
    const z = STAGE_Z + 12 + Math.pow(Math.random(), 1.4) * 150;
    const spread = 18 + (z - STAGE_Z) * 0.45;
    const x = (Math.random() * 2 - 1) * spread;
    people.push({ x, z, bx: x, bz: z, s: 0.9 + Math.random() * 0.2, ph: Math.random() * 6.28, sp: 2 + Math.random() * 2, ry: Math.PI + (Math.random() - 0.5) * 0.8 });
    c.setHSL(0.72 + Math.random() * 0.1, 0.2, 0.16 + Math.random() * 0.12);
    crowd.setColorAt(i, c);
  }
  crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(crowd);

  // kandi glow and glowsticks scattered at hand height
  const sparkN = 700;
  const sp = new Float32Array(sparkN * 3), sc = new Float32Array(sparkN * 3);
  const pal = [0xff4fb8, 0x3df5ff, 0xd4ff3a, 0x9b6bff, 0xffd23d].map((h) => new THREE.Color(h));
  for (let i = 0; i < sparkN; i++) {
    const p = people[Math.floor(Math.random() * COUNT)];
    sp.set([p.x + (Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 1.0, p.z + (Math.random() - 0.5) * 0.8], i * 3);
    const k = pal[i % pal.length]; sc.set([k.r, k.g, k.b], i * 3);
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scene.add(sparks);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();

  return {
    people,
    // push people out of the way of avatars so the crowd parts
    update(t, avoid = []) {
      wallMat.uniforms.t.value = t;
      beams.forEach((b) => { b.pivot.rotation.z = Math.sin(t * 0.5 + b.phase) * 0.55; b.pivot.rotation.x = 0.35 + Math.cos(t * 0.4 + b.phase) * 0.25; });
      lasers.forEach((l) => { l.pivot.rotation.z = Math.sin(t * 0.9 + l.phase) * 1.1; l.pivot.rotation.x = -1.15 + Math.sin(t * 0.7 + l.phase * 2) * 0.15; l.pivot.visible = Math.sin(t * 0.6) > -0.4; });
      for (let i = 0; i < COUNT; i++) {
        const p = people[i];
        let tx = p.bx, tz = p.bz;
        for (const a of avoid) {
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
          if (d < 2.3 && d > 0.001) { tx += (dx / d) * (2.3 - d) * 1.1; tz += (dz / d) * (2.3 - d) * 1.1; }
        }
        p.x += (tx - p.x) * 0.12; p.z += (tz - p.z) * 0.12;
        const bob = Math.abs(Math.sin(t * p.sp + p.ph)) * 0.12;
        e.set(0, p.ry + Math.sin(t * 1.3 + p.ph) * 0.2, Math.sin(t * p.sp * 0.5 + p.ph) * 0.06);
        q.setFromEuler(e); v.set(p.x, bob, p.z); s.setScalar(p.s);
        m4.compose(v, q, s); crowd.setMatrixAt(i, m4);
      }
      crowd.instanceMatrix.needsUpdate = true;
      sparks.material.opacity = 0.65 + 0.3 * Math.sin(t * 4);
    },
  };
}

// A hero avatar with a glowing bangle on the raised wrist
export function createAvatar(scene, hex, { armsUp = false } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(personGeometry(armsUp), new THREE.MeshStandardMaterial({ color: 0x9a8cc0, roughness: 0.45, metalness: 0.2, emissive: new THREE.Color(hex), emissiveIntensity: 0.22 }));
  g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 12, 40), new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }));
  band.position.set(armsUp ? -0.42 : -0.3, armsUp ? 1.86 : 0.8, 0); band.rotation.x = Math.PI / 2;
  g.add(band);
  const glow = new THREE.PointLight(hex, 3, 6, 2); glow.position.copy(band.position); g.add(glow);
  // halo ring on the ground so the hero reads in the crowd
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 48), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.5, toneMapped: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02; g.add(halo);
  scene.add(g);
  return { group: g, band, glow, halo, body };
}
