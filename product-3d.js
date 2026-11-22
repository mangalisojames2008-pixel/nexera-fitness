// product-3d.js — real 3D product packs for Three.js.
// Replaces product-image-3d.js (the stacked flat images). Each product is a
// solid tube / bottle / jar / carton traced from its own photo, with real
// width, height and depth, and the photo wrapped onto it.
//
//   import { createPack, shapeFor } from './product-3d.js';
//   const pack = await createPack(p.cutout, { shape: shapeFor(p), dims: p.dims_mm, backSrc: p.back_cutout });
//   scene.add(pack);              // pack.userData.size = { width, height, depth } in world units
//
// Uses only BufferGeometry + ShaderMaterial, so it works with any Three.js r150+.
// NexEra site additions: opts.rows / opts.segments (lighter packs on phones),
// setTint() (the cover's dusk-to-golden-hour light), and the bag in the site's colours.

import * as THREE from 'three';
import { loadImage, cutOutImage, measure, makeAtlas, buildPack, PACK_VERTEX, PACK_FRAGMENT } from './pack-geometry.js';

// Best guess of pack shape from the product name; set "shape" in
// skincare_products.json to override (round | oval | tube | box).
export function shapeFor(p) {
  if (p.shape) return p.shape;
  const n = `${p.name} ${p.category || ''}`.toLowerCase();
  if (/patch|pimple/.test(n)) return 'box';
  if (/aqua-gel|jar|tub\b/.test(n)) return 'round';
  if (/tube|wash|foam|scrub|lips|hand cream|corrector|clay|gel-cream|cream spf|day cream|ointment/.test(n)) return 'tube';
  if (/serum|booster|spray|thermal|mist|jar|creme|crème|balm|healing|filler|extra thick|moisturising cream|cream$/.test(n)) return 'round';
  if (/micellar|toner|lotion|cleanser|cleansing|fluid|water|sunscreen|protect/.test(n)) return 'oval';
  return 'oval';
}

function makeGeometry(d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
  g.setIndex(new THREE.BufferAttribute(d.indices, 1));
  g.computeBoundingSphere();
  return g;
}

function quad(w, h, plane = 'xz') {
  const g = new THREE.BufferGeometry();
  const p = plane === 'xz'
    ? [-w / 2, 0, -h / 2, w / 2, 0, -h / 2, w / 2, 0, h / 2, -w / 2, 0, h / 2]
    : [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 0, 3, 2]), 1));
  return g;
}

const SHADOW_FRAG = `uniform float opacity; varying vec2 vUv;
void main(){ float d = length(vUv * 2.0 - 1.0); float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * 0.32 * opacity); }`;
const SIMPLE_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SOLID_FRAG = `uniform vec3 color; uniform float opacity; void main(){ gl_FragColor = vec4(color, opacity); }`;

export function solidMaterial(hex = 0x1d1726, opacity = 1) {
  const c = new THREE.Color(hex);
  return new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Vector3(c.r, c.g, c.b) }, opacity: { value: opacity } }, vertexShader: SIMPLE_VERT, fragmentShader: SOLID_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}
export function plane(w, h, material) { return new THREE.Mesh(quad(w, h, 'xy'), material); }

// Build a pack from a photo URL, or from a canvas you drew (e.g. the shopping bag).
// opts.shape  round | oval | tube | box
// opts.height world units tall (default 3; scale the group afterwards)
// opts.dims   { h, w, d } in mm from the retailer page — sets the real depth
// opts.backSrc photo of the back of the pack (optional)
export async function createPack(src, { shape = 'oval', height = 3, dims = null, backSrc = null, canvas = null, gloss = 1, shadow = true, rows = 200, segments = 72 } = {}) {
  const front = canvas || cutOutImage(await loadImage(src));
  let back = null;
  if (backSrc) { try { back = cutOutImage(await loadImage(backSrc)); } catch (e) { console.warn(e.message); } }
  const depthRatio = dims && dims.w && dims.d ? dims.d / dims.w : null;
  const data = buildPack(measure(front, rows), { shape, height, depthRatio, segments });

  const tex = new THREE.CanvasTexture(makeAtlas(front, back));
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, opacity: { value: 1 }, gloss: { value: gloss }, tint: { value: new THREE.Vector3(1, 1, 1) } },
    vertexShader: PACK_VERTEX, fragmentShader: PACK_FRAGMENT,
    side: THREE.DoubleSide, transparent: true,
  });
  const mesh = new THREE.Mesh(makeGeometry(data), mat);
  const group = new THREE.Group();
  group.add(mesh);

  let shadowMat = null;
  if (shadow) {
    shadowMat = new THREE.ShaderMaterial({ uniforms: { opacity: { value: 1 } }, vertexShader: SIMPLE_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false });
    const sh = new THREE.Mesh(quad(Math.max(data.size.width, data.size.depth) * 1.7, data.size.depth * 2.2 + 0.4), shadowMat);
    sh.position.y = -height / 2 - 0.02;
    group.add(sh);
    group.userData.shadow = sh;
  }
  group.userData.size = data.size;
  group.userData.mesh = mesh;
  group.userData.setOpacity = o => { mat.uniforms.opacity.value = o; if (shadowMat) shadowMat.uniforms.opacity.value = o; group.visible = o > 0.01; };
  group.userData.setTint = (r, g, b) => mat.uniforms.tint.value.set(r, g, b);
  group.userData.dispose = () => { mesh.geometry.dispose(); mat.dispose(); tex.dispose(); if (shadowMat) shadowMat.dispose(); };
  return group;
}

// A shopping bag drawn on a canvas, built with the same solid-pack method.
export async function createBag({ label = 'NEXERA', color = '#2a150f', ink = '#f6f0e0', handle = '#f2ca99', font = '700 92px Sora, "Segoe UI", system-ui, sans-serif', height = 3, rows = 60, segments = 32 } = {}) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 760;
  const g = c.getContext('2d');
  const draw = () => {
    g.clearRect(0, 0, 600, 760);
    // handles
    g.strokeStyle = handle; g.lineWidth = 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(190, 170); g.bezierCurveTo(190, 20, 410, 20, 410, 170); g.stroke();
    // bag body
    g.fillStyle = color; g.fillRect(40, 160, 520, 600);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(40, 160, 520, 26);
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font; g.fillText(label, 300, 470);
    const grd = g.createLinearGradient(282, 540, 318, 576); grd.addColorStop(0, '#e6bd57'); grd.addColorStop(1, '#b46645');
    g.fillStyle = grd; g.beginPath(); g.arc(300, 558, 14, 0, Math.PI * 2); g.fill();
  };
  draw();
  if (document.fonts) await document.fonts.ready.then(draw).catch(() => {});
  const bag = await createPack(null, { canvas: c, shape: 'box', height, gloss: 0.4, rows, segments });
  return bag;
}

// Hang a pack from a string that swings (the tag from the reference video).
// Call update(dt, anchorWorld, amount) every frame; amount 1 = hanging, 0 = let go.
export function createHang(scene, { length = 1.4, color = 0x2a150f } = {}) {
  const mat = solidMaterial(color, 0.9);
  const string = plane(0.018, 1, mat);
  scene.add(string);
  let theta = 0.55, omega = 0;
  return {
    string,
    nudge(v) { omega += v; },
    // returns the pack's position/rotation while hanging
    update(dt, anchor, packHalfHeight, amount, still = false, len = length) {
      dt = Math.min(dt, 1 / 30);
      if (!still) {
        const L = len + packHalfHeight;
        omega += (-(9.8 / L) * Math.sin(theta) - 0.85 * omega) * dt;
        theta += omega * dt;
      } else theta = 0;
      const L = len * amount;
      const sx = Math.sin(theta), cy = Math.cos(theta);
      const top = { x: anchor.x + sx * L, y: anchor.y - cy * L };
      string.visible = amount > 0.02;
      string.position.set((anchor.x + top.x) / 2, (anchor.y + top.y) / 2, 0.05);
      string.scale.set(1, Math.max(L, 0.001), 1);
      string.rotation.set(0, 0, theta);
      mat.uniforms.opacity.value = 0.9 * amount;
      return { x: top.x + sx * packHalfHeight, y: top.y - cy * packHalfHeight, rz: theta };
    },
  };
}
