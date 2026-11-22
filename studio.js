/* =========================================================
   NexEra Skin studio: skincare packaging built in code (three.js).
   Every model is a set of named parts, so "Look inside" can take it apart
   and the cover can animate a pump, a dropper, a lid or a cap.
   These are NexEra's own illustrations of generic packaging, not any brand's.
   ========================================================= */
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export { THREE };

/* ---------- colours ---------- */
export const TONES = {
  aqua:  { body: '#d4ecee', formula: '#eef8f8', glow: '#7cc9d0', label: '#0f3b44' },
  mist:  { body: '#e2eef6', formula: '#f3f9fd', glow: '#8fb8dc', label: '#16324a' },
  clay:  { body: '#dcdccc', formula: '#9aa08e', glow: '#a9b48f', label: '#2c3122' },
  amber: { body: '#c9803a', formula: '#e6a24f', glow: '#ff9a4d', label: '#3a1f07' },
  blush: { body: '#f4ddd8', formula: '#fbf3ef', glow: '#ff8a8a', label: '#4a1f1f' },
  sun:   { body: '#ffc070', formula: '#fff1dc', glow: '#ffb15c', label: '#3d2104' },
  sky:   { body: '#d3def3', formula: '#f4f7fd', glow: '#8aa6e8', label: '#17284d' },
  lilac: { body: '#e0d6f3', formula: '#f8f5fd', glow: '#a08af0', label: '#2a1d4d' },
  rose:  { body: '#f3cfd9', formula: '#fdf2f5', glow: '#ff7f9f', label: '#4a1426' }
};
export const CAPS = {
  ink:    { color: '#24252d', metal: 0.0, rough: 0.38 },
  white:  { color: '#f3f2ee', metal: 0.0, rough: 0.32 },
  silver: { color: '#c7cad2', metal: 0.85, rough: 0.28 },
  gold:   { color: '#d6b583', metal: 0.8, rough: 0.3 }
};

/* ---------- renderer and lighting ---------- */
export function makeRenderer(canvas, opts = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = opts.exposure || 1.05;
  r.setClearColor(0x000000, 0);
  return r;
}

export function makeScene(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = env;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff1e0, 1.6); key.position.set(4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb27a, 1.2); rim.position.set(-6, 3, -5); scene.add(rim);
  const fill = new THREE.HemisphereLight(0xdfe6ff, 0x30243a, 0.35); scene.add(fill);
  return { scene, env, key, rim, fill };
}

/* A soft round shadow under a product (no shadow maps needed). */
let shadowTex = null;
export function makeShadow(radius = 1.4, opacity = 0.45) {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(0.45, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.005; m.renderOrder = -1; m.name = 'shadow';
  return m;
}

/* ---------- geometry helpers ---------- */
const V2 = (x, y) => new THREE.Vector2(x, y);
function arc(pts, cx, cy, r, a0, a1, n = 6) {
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(V2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
}
/* A bottle outline turned around the vertical axis. */
function bottleProfile({ r, h, base = 0.18, shoulder = 0.5, neckR = 0.4, neckH = 0.3, inset = 1 }) {
  const p = [V2(0, 0)];
  arc(p, r - base, base, base, -Math.PI / 2, 0, 5);
  p.push(V2(r, h - shoulder));
  const n = 8;
  for (let i = 1; i <= n; i++) {
    const t = i / n, e = 1 - Math.pow(1 - t, 2);
    p.push(V2(r + (neckR - r) * e * inset, h - shoulder + shoulder * Math.sin(t * Math.PI / 2)));
  }
  p.push(V2(neckR, h + neckH)); p.push(V2(0, h + neckH));
  return p;
}
function lathe(points, seg = 64) { const g = new THREE.LatheGeometry(points, seg); g.computeVertexNormals(); return g; }
function cyl(rt, rb, h, seg = 48, open = false) { return new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); }

/* The soft tube: round at the shoulder, pressed flat at the crimp. */
function tubeGeometry(r, w, len, segU = 64, segV = 40) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV, s = v * v * (3 - 2 * v);
    const a = r + (w / 2 - r) * s, b = r + (0.03 - r) * Math.pow(s, 0.85);
    for (let i = 0; i <= segU; i++) {
      const u = i / segU, ang = u * Math.PI * 2;
      pos.push(-Math.cos(ang) * a, v * len, Math.sin(ang) * b);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
    const a = j * (segU + 1) + i, b = a + segU + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------- materials ---------- */
function plastic(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22, ...extra });
}
function capMat(cap) {
  const c = CAPS[cap] || CAPS.white;
  return new THREE.MeshPhysicalMaterial({ color: c.color, roughness: c.rough, metalness: c.metal, clearcoat: c.metal ? 0.2 : 0.8, clearcoatRoughness: 0.18 });
}
function glass(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
}
function formulaMat(tone, kind) {
  if (kind === 'liquid') return new THREE.MeshPhysicalMaterial({ color: tone.formula, roughness: 0.12, transparent: true, opacity: 0.82, clearcoat: 1 });
  if (kind === 'serum') return new THREE.MeshPhysicalMaterial({ color: tone.formula, roughness: 0.08, transparent: true, opacity: 0.9, clearcoat: 1, emissive: tone.glow, emissiveIntensity: 0.18 });
  return new THREE.MeshPhysicalMaterial({ color: tone.formula, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.3 });
}

/* A printed label: the product type and one fact from its name. Text only, no logos. */
const labelCache = new Map();
export function labelTexture(tone, word, small, opts = {}) {
  const aspect = opts.aspect || 2;
  const key = [tone.label, tone.body, word, small, opts.full ? 1 : 0, aspect.toFixed(2)].join('|');
  if (labelCache.has(key)) return labelCache.get(key);
  const W = 1024, H = opts.full ? 1024 : Math.round(1024 / aspect);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = opts.full ? tone.body : '#fbfaf7'; g.fillRect(0, 0, W, H);
  /* on a tube the canvas wraps all the way round, and the front is the first quarter */
  const cx = opts.full ? W * 0.25 : W / 2, cy = opts.full ? H * 0.42 : H / 2;
  const sx = opts.full ? 0.55 : 1, maxW = opts.full ? 300 : W * 0.62;
  g.save(); g.translate(cx, cy); g.scale(sx, 1);
  g.fillStyle = tone.label; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = opts.full ? 150 : Math.min(150, H * 0.3);
  const setF = () => { g.font = `600 ${size}px Sora, "Segoe UI", sans-serif`; };
  setF();
  while (g.measureText(word).width * sx > maxW && size > 30) { size -= 4; setF(); }
  g.fillText(word, 0, small ? -size * 0.32 : 0);
  if (small) {
    const s2 = Math.max(26, size * 0.36);
    g.globalAlpha = 0.45; g.fillRect(-size * 0.9, size * 0.32, size * 1.8, Math.max(3, size * 0.04)); g.globalAlpha = 1;
    g.font = `500 ${s2}px "JetBrains Mono", monospace`;
    let w2 = g.measureText(small.toUpperCase()).width;
    if (w2 * sx > maxW) { g.font = `500 ${s2 * maxW / (w2 * sx)}px "JetBrains Mono", monospace`; }
    g.fillText(small.toUpperCase(), 0, size * 0.32 + s2 * 1.1);
  }
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  labelCache.set(key, t);
  return t;
}

/* ---------- the models ---------- */
/* Each builder returns { group, parts, rig, height }.
   parts: [{ id, label, text, node, out: [x, y, z] }] where node is the Object3D that moves when the product opens.
   rig: named nodes the cover animates (head, lid, cap, pipette, flip). */
function part(group, id, label, text, node, out) { group.add(node); node.name = id; node.userData.home = node.position.clone(); return { id, label, text, node, out: new THREE.Vector3(...out) }; }
function grp(...meshes) { const g = new THREE.Group(); meshes.forEach(m => g.add(m)); return g; }
function mesh(geo, mat, y = 0) { const m = new THREE.Mesh(geo, mat); m.position.y = y; return m; }
function band(r, y, h, tone, p, arcLen = 2.2) {
  const map = labelTexture(tone, p.word, p.small, { aspect: (r * arcLen) / h });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true, -arcLen / 2, arcLen), new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
  m.position.y = y; return m;
}

function pump(p, tone, cap, foam) {
  const g = new THREE.Group();
  const r = foam ? 0.82 : 0.78, h = foam ? 2.9 : 3.3;
  const body = plastic(tone.body), capM = capMat(cap);
  const bodyMesh = mesh(lathe(bottleProfile({ r, h, shoulder: 0.45, neckR: 0.36, neckH: 0.22 })), body);
  const lab = band(r + 0.004, h * 0.45, h * 0.5, tone, p);
  const formula = mesh(lathe(bottleProfile({ r: r * 0.9, h: h * 0.72, shoulder: 0.05, neckR: r * 0.9, neckH: 0 }), 48), formulaMat(tone, 'liquid'), 0.06);
  const parts = [
    part(g, 'bottle', 'Bottle', 'Holds the ' + p.typeWord + ' and keeps it sealed.', grp(bodyMesh, lab), [0, 0, 0]),
    part(g, 'formula', 'The formula', 'The ' + p.typeWord + ' itself.', formula, [1.9, 0.3, 0.4]),
    part(g, 'tube', 'Dip tube', 'Draws the formula up from the bottom of the bottle.', mesh(cyl(0.045, 0.045, h - 0.1, 12), plastic('#f4f4f4', { transparent: true, opacity: 0.85 }), h / 2 + 0.05), [-1.7, 0.6, 0.2])
  ];
  const collarH = foam ? 0.62 : 0.34, collarR = foam ? 0.56 : 0.42;
  const collar = grp(mesh(cyl(collarR, collarR, collarH, 48), capM, h + 0.22 + collarH / 2), mesh(new THREE.TorusGeometry(collarR, 0.03, 8, 48), capM, h + 0.22 + 0.02));
  collar.children[1].rotation.x = Math.PI / 2;
  parts.push(part(g, 'collar', foam ? 'Foam chamber' : 'Collar', foam ? 'Mixes air into the liquid so it comes out as foam.' : 'Screws the pump onto the bottle and keeps it closed.', collar, [0, 1.25, 0]));
  const top = h + 0.22 + collarH;
  const headR = foam ? 0.5 : 0.3;
  const head = new THREE.Group();
  head.add(mesh(cyl(0.07, 0.07, 0.42, 12), capM, top + 0.21));
  const cap1 = mesh(new THREE.CapsuleGeometry(headR * 0.62, headR * 0.5, 6, 24), capM, top + 0.5);
  cap1.scale.set(1, 0.7, 1); head.add(cap1);
  const nozzle = mesh(cyl(0.07, 0.09, foam ? 0.55 : 0.8, 16), capM, top + 0.5);
  nozzle.rotation.z = Math.PI / 2; nozzle.position.x = (foam ? 0.55 : 0.6); head.add(nozzle);
  parts.push(part(g, 'head', 'Pump head', 'Press it to push out one dose.', head, [0, 2.2, 0]));
  return { group: g, parts, rig: { head }, height: top + 0.8 };
}

function flip(p, tone, cap) {
  const g = new THREE.Group();
  const r = 0.78, h = 3.5;
  const bodyMesh = mesh(lathe(bottleProfile({ r, h, shoulder: 0.55, neckR: 0.5, neckH: 0.18 })), plastic(tone.body, { transparent: true, opacity: 0.88 }));
  bodyMesh.scale.z = 0.7;
  const lab = band(r + 0.004, h * 0.45, h * 0.46, tone, p); lab.scale.z = 0.7;
  const liquid = mesh(lathe(bottleProfile({ r: r * 0.9, h: h * 0.7, shoulder: 0.05, neckR: r * 0.9, neckH: 0 }), 48), formulaMat(tone, 'liquid'), 0.06);
  liquid.scale.z = 0.7;
  const capM = capMat(cap);
  const base = grp(mesh(cyl(0.56, 0.56, 0.42, 48), capM, h + 0.18 + 0.21));
  const lidPivot = new THREE.Group(); lidPivot.position.set(-0.56, h + 0.6, 0);
  const lidMesh = mesh(cyl(0.56, 0.56, 0.2, 48), capM, 0.1); lidMesh.position.x = 0.56; lidPivot.add(lidMesh);
  const parts = [
    part(g, 'bottle', 'Bottle', 'Holds the ' + p.typeWord + '. Squeeze gently to pour.', grp(bodyMesh, lab), [0, 0, 0]),
    part(g, 'formula', 'The formula', 'The ' + p.typeWord + ' itself.', liquid, [1.9, 0.3, 0.3]),
    part(g, 'capbase', 'Cap with opening', 'A small opening lets out a little at a time.', base, [0, 1.3, 0]),
    part(g, 'lid', 'Flip lid', 'Snaps shut to keep the bottle closed.', lidPivot, [0, 2.1, 0])
  ];
  return { group: g, parts, rig: { flip: lidPivot }, height: h + 0.9 };
}

function dropper(p, tone, cap) {
  const g = new THREE.Group();
  const r = 0.72, h = 2.25;
  const bottle = mesh(lathe(bottleProfile({ r, h, base: 0.12, shoulder: 0.42, neckR: 0.34, neckH: 0.28 })), glass(tone.body));
  bottle.renderOrder = 2;
  const serum = mesh(lathe(bottleProfile({ r: r * 0.9, h: h * 0.62, base: 0.1, shoulder: 0.05, neckR: r * 0.9, neckH: 0 }), 48), formulaMat(tone, 'serum'), 0.05);
  serum.renderOrder = 1;
  const lab = band(r + 0.006, h * 0.42, h * 0.42, tone, p, 1.9);
  const capM = capMat(cap);
  const collar = grp(mesh(cyl(0.42, 0.42, 0.5, 48), capM, h + 0.28 + 0.25));
  const bulbProfile = [V2(0, 0)];
  arc(bulbProfile, 0.26, 0.2, 0.06, -Math.PI / 2, 0, 3);
  bulbProfile.push(V2(0.33, 0.5)); arc(bulbProfile, 0, 0.62, 0.33, 0, Math.PI / 2, 8);
  const bulb = mesh(lathe(bulbProfile, 32), new THREE.MeshPhysicalMaterial({ color: cap === 'white' ? '#e9e6e0' : '#2a2a30', roughness: 0.55, sheen: 0.4 }), h + 0.78);
  const pip = new THREE.Group();
  const tubeG = mesh(cyl(0.085, 0.05, 2.0, 16), glass('#ffffff'), h + 0.78 - 1.0); tubeG.renderOrder = 3;
  const tip = mesh(new THREE.SphereGeometry(0.06, 12, 12), formulaMat(tone, 'serum'), h + 0.78 - 1.98);
  pip.add(tubeG, tip, bulb);
  const parts = [
    part(g, 'bottle', 'Glass bottle', 'Holds the serum. Tinted glass, illustrated.', grp(bottle, lab), [0, 0, 0]),
    part(g, 'formula', 'The serum', 'The concentrated formula itself.', serum, [1.9, 0.2, 0.3]),
    part(g, 'collar', 'Collar', 'Holds the dropper in place and seals the bottle.', collar, [0, 1.35, 0]),
    part(g, 'pipette', 'Dropper', 'Squeeze the bulb and release to draw up a few drops.', pip, [-1.6, 2.2, 0])
  ];
  return { group: g, parts, rig: { pipette: pip, tip }, height: h + 1.5 };
}

function jar(p, tone, cap) {
  const g = new THREE.Group();
  const r = 1.3, h = 1.2;
  const jp = [V2(0, 0)]; arc(jp, r - 0.16, 0.16, 0.16, -Math.PI / 2, 0, 5); jp.push(V2(r, h - 0.04)); jp.push(V2(r - 0.08, h)); jp.push(V2(r - 0.08, h + 0.2)); jp.push(V2(r - 0.18, h + 0.2)); jp.push(V2(r - 0.18, 0.14)); jp.push(V2(0, 0.14));
  const body = mesh(lathe(jp), plastic(tone.body));
  const lab = band(r + 0.004, h * 0.48, h * 0.62, tone, p, 2.1);
  const cp = [V2(0, 0.14)]; cp.push(V2(r - 0.2, 0.14)); cp.push(V2(r - 0.2, h * 0.86));
  for (let i = 0; i <= 10; i++) { const t = i / 10; cp.push(V2((r - 0.2) * (1 - t * t * 0.9), h * 0.86 + Math.sin(t * Math.PI / 2) * 0.22 * (1 - t * 0.3))); }
  cp.push(V2(0, h * 1.02));
  const cream = mesh(lathe(cp, 48), formulaMat(tone, 'cream'));
  const swirl = mesh(new THREE.TorusGeometry(0.22, 0.09, 12, 32, Math.PI * 1.6), formulaMat(tone, 'cream'), h * 1.02);
  swirl.rotation.x = Math.PI / 2; cream.add(swirl);
  const disc = mesh(cyl(r - 0.2, r - 0.2, 0.04, 48), plastic('#ffffff', { transparent: true, opacity: 0.7 }), h + 0.06);
  const lidM = capMat(cap);
  const lid = new THREE.Group();
  const lp = [V2(0, 0), V2(r + 0.06, 0)]; arc(lp, r - 0.06, 0.42, 0.12, 0, Math.PI / 2, 6); lp.push(V2(0, 0.54));
  const lidMesh = mesh(lathe(lp), lidM, h + 0.02);
  const ridge = mesh(new THREE.TorusGeometry(r + 0.06, 0.02, 6, 64), lidM, h + 0.04); ridge.rotation.x = Math.PI / 2;
  lid.add(lidMesh, ridge);
  const parts = [
    part(g, 'jar', 'Jar', 'A wide jar, so the cream is easy to reach.', grp(body, lab), [0, 0, 0]),
    part(g, 'formula', 'The cream', 'The ' + p.typeWord + ' itself.', cream, [1.9, 0.5, 0.4]),
    part(g, 'disc', 'Inner disc', 'Covers the cream under the lid.', disc, [0, 1.25, 0]),
    part(g, 'lid', 'Screw lid', 'Twists on to keep the jar closed.', lid, [0, 2.1, 0])
  ];
  return { group: g, parts, rig: { lid }, height: h + 0.7 };
}

function tube(p, tone, cap, mini) {
  const g = new THREE.Group();
  const s = mini ? 0.62 : 1, r = 0.62 * s, w = 1.5 * s, len = 3.3 * s, capH = 0.62 * s;
  const capM = capMat(cap);
  const capG = new THREE.Group();
  const cp = [V2(0, 0)]; arc(cp, r * 0.92 - 0.08, 0.08, 0.08, -Math.PI / 2, 0, 4); cp.push(V2(r * 0.92, capH)); cp.push(V2(0, capH));
  capG.add(mesh(lathe(cp, 48), capM));
  const shoulderG = new THREE.Group();
  const sp = [V2(0.16 * s, capH), V2(0.2 * s, capH + 0.14 * s), V2(r, capH + 0.34 * s), V2(r, capH + 0.36 * s)];
  shoulderG.add(mesh(lathe(sp, 48), plastic(tone.body)));
  const bodyMat = new THREE.MeshPhysicalMaterial({ map: labelTexture(tone, p.word, p.small, { full: true }), roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.22, side: THREE.DoubleSide });
  const body = mesh(tubeGeometry(r, w, len), bodyMat, capH + 0.36 * s);
  const crimp = mesh(new THREE.BoxGeometry(w + 0.02, 0.28 * s, 0.07), plastic(tone.body), capH + 0.36 * s + len + 0.12 * s);
  const ribs = new THREE.Group();
  for (let i = 0; i < 6; i++) { const rb = mesh(new THREE.BoxGeometry(w * 0.96, 0.02, 0.085), plastic(tone.body), crimp.position.y - 0.1 * s + i * 0.04 * s); ribs.add(rb); }
  const tubeGroup = grp(body, crimp, ribs);
  const formula = mesh(new THREE.CapsuleGeometry(r * 0.55, len * 0.6, 8, 24), formulaMat(tone, p.typeId === 'serum' ? 'serum' : 'cream'), capH + len * 0.5);
  formula.scale.z = 0.7; formula.visible = false; formula.userData.showWhenOpen = true;
  const parts = [
    part(g, 'tube', 'Soft tube', 'Squeezes flat as you use it, so you can get the last of it out.', tubeGroup, [0, 1.1 * s, 0]),
    part(g, 'formula', 'The formula', 'The ' + p.typeWord + ' itself.', formula, [1.8 * s, 1.0 * s, 0.4]),
    part(g, 'shoulder', 'Nozzle', 'Lets out just the amount you squeeze.', shoulderG, [0, 0.45 * s, 0]),
    part(g, 'cap', 'Cap', 'Screws on to keep the tube sealed. The tube stands on it.', capG, [0, -0.15 * s, 0])
  ];
  return { group: g, parts, rig: { cap: capG }, height: capH + 0.36 * s + len + 0.3 * s };
}

function spray(p, tone, cap) {
  const g = new THREE.Group();
  const r = 0.72, h = 3.4;
  const cp = [V2(0, 0)]; arc(cp, r - 0.1, 0.1, 0.1, -Math.PI / 2, 0, 4); cp.push(V2(r, h - 0.3));
  for (let i = 1; i <= 8; i++) { const t = i / 8; cp.push(V2(r - (r - 0.4) * t * t, h - 0.3 + Math.sin(t * Math.PI / 2) * 0.32)); }
  cp.push(V2(0.38, h + 0.06)); cp.push(V2(0, h + 0.06));
  const can = mesh(lathe(cp), new THREE.MeshPhysicalMaterial({ color: tone.body, metalness: 0.35, roughness: 0.28, clearcoat: 0.8 }));
  const lab = band(r + 0.004, h * 0.45, h * 0.52, tone, p);
  const capM = capMat(cap);
  const valve = grp(mesh(cyl(0.4, 0.4, 0.12, 32), new THREE.MeshPhysicalMaterial({ color: '#d9dbe0', metalness: 0.9, roughness: 0.25 }), h + 0.12), mesh(cyl(0.05, 0.05, 0.2, 12), capM, h + 0.26));
  const act = new THREE.Group();
  act.add(mesh(cyl(0.34, 0.38, 0.42, 32), capM, h + 0.5));
  const nz = mesh(cyl(0.05, 0.05, 0.12, 12), new THREE.MeshBasicMaterial({ color: '#111' }), h + 0.56); nz.rotation.z = Math.PI / 2; nz.position.x = 0.36; act.add(nz);
  const liquid = mesh(lathe(bottleProfile({ r: r * 0.9, h: h * 0.7, shoulder: 0.05, neckR: r * 0.9, neckH: 0 }), 48), formulaMat(tone, 'liquid'), 0.06);
  const tubeIn = mesh(cyl(0.04, 0.04, h - 0.1, 10), plastic('#f4f4f4'), h / 2);
  const parts = [
    part(g, 'can', 'Can', 'Holds the formula under gentle pressure.', grp(can, lab), [0, 0, 0]),
    part(g, 'formula', 'The formula', 'The ' + p.typeWord + ' itself.', liquid, [1.9, 0.3, 0.4]),
    part(g, 'tube', 'Dip tube', 'Carries the formula up to the valve.', tubeIn, [-1.6, 0.4, 0.2]),
    part(g, 'valve', 'Valve', 'Opens only while you press, then closes again.', valve, [0, 1.3, 0]),
    part(g, 'head', 'Spray button', 'Press for a fine, even mist.', act, [0, 2.2, 0])
  ];
  return { group: g, parts, rig: { head: act }, height: h + 0.8 };
}

function patches(p, tone, cap) {
  const g = new THREE.Group();
  const W = 2.4, D = 1.6, H = 0.42;
  const tray = mesh(new THREE.BoxGeometry(W, H, D), plastic(tone.body), H / 2);
  const sheet = new THREE.Group();
  sheet.add(mesh(new THREE.BoxGeometry(W * 0.86, 0.03, D * 0.8), plastic('#ffffff'), 0));
  const dotM = new THREE.MeshPhysicalMaterial({ color: '#f5efe6', roughness: 0.2, transparent: true, opacity: 0.85, clearcoat: 1 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const d = mesh(cyl(0.16, 0.16, 0.03, 24), dotM, 0.03); d.position.x = -0.75 + i * 0.5; d.position.z = -0.4 + j * 0.4; sheet.add(d);
  }
  sheet.position.y = H + 0.02;
  const lidM = new THREE.MeshPhysicalMaterial({ map: labelTexture(tone, p.word, p.small, { aspect: 1.5 }), roughness: 0.4, clearcoat: 0.6 });
  const lid = mesh(new THREE.BoxGeometry(W + 0.06, 0.12, D + 0.06), [plastic(tone.body), plastic(tone.body), lidM, plastic(tone.body), plastic(tone.body), plastic(tone.body)], H + 0.1);
  const parts = [
    part(g, 'tray', 'Box', 'Keeps the patches flat and clean.', tray, [0, 0, 0]),
    part(g, 'sheet', 'Patch sheet', 'Small round patches, one for each spot.', sheet, [0, 1.0, 0.6]),
    part(g, 'lid', 'Lid', 'Closes over the sheet.', lid, [0, 1.9, 0])
  ];
  return { group: g, parts, rig: { lid }, height: 1.2 };
}

const BUILDERS = { pump: (p, t, c) => pump(p, t, c, false), foam: (p, t, c) => pump(p, t, c, true), flip, dropper, jar, tube: (p, t, c) => tube(p, t, c, false), minitube: (p, t, c) => tube(p, t, c, true), spray, patches };

/* Build a product: { shape, tone, cap, word, small, typeWord, typeId } */
export function buildProduct(spec) {
  const tone = TONES[spec.tone] || TONES.aqua;
  const p = { word: (spec.word || '').toUpperCase(), small: spec.small || '', typeWord: spec.typeWord || 'formula', typeId: spec.typeId };
  const model = (BUILDERS[spec.shape] || BUILDERS.pump)(p, tone, spec.cap || 'white');
  model.tone = tone;
  model.group.userData.parts = model.parts;
  return model;
}

/* Short label word for the printed label, from the product type. */
export function labelWord(prod) {
  const map = { cleanser: 'Cleanser', water: /Toner/.test(prod.name) ? 'Toner' : /Thermal/.test(prod.name) ? 'Water' : 'Micellar', exfoliant: /Patches/.test(prod.name) ? 'Patches' : /Scrub/.test(prod.name) ? 'Scrub' : 'Peel', serum: 'Serum', moisturiser: /Gel/.test(prod.name) ? 'Gel cream' : /Lotion|Fluid|Emulsion/.test(prod.name) ? 'Lotion' : 'Cream', sunscreen: 'Sun', body: /Hand/.test(prod.name) ? 'Hand' : 'Body', repair: /Ointment/.test(prod.name) ? 'Ointment' : /Balm/.test(prod.name) ? 'Balm' : 'Repair', eyelip: /Lips/.test(prod.name) ? 'Lips' : 'Eye' };
  return map[prod.type] || 'Care';
}
export function specFor(prod) {
  return { shape: prod.shape, tone: prod.tone, cap: prod.cap, word: labelWord(prod), small: prod.chips[0] || '', typeWord: (prod.typeName || 'formula').toLowerCase(), typeId: prod.type };
}

/* Free GPU memory when a scene closes. */
export function dispose(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material; if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach(mm => { for (const k in mm) { const v = mm[k]; if (v && v.isTexture && !labelCacheHas(v) && v !== shadowTex) v.dispose(); } mm.dispose(); });
  });
}
function labelCacheHas(t) { for (const v of labelCache.values()) if (v === t) return true; return false; }
