/* =========================================================
   NexEra Skin studio: the renderer, lights and soft shadows shared by
   the cover and the 3D product view. The products themselves are solid
   packs built from the brands' real photos (product-3d.js); nothing is drawn here.
   ========================================================= */
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createPack, shapeFor } from './product-3d.js';

export { THREE };

/* Phones get lighter packs (fewer outline rows and segments) and a lower pixel ratio. */
export const PHONE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
export const DETAIL = PHONE ? { rows: 120, segments: 48 } : { rows: 200, segments: 72 };

/* A product's pack data (shape, volume, size in mm, back photo), from packs.js. */
export function packOf(p) {
  const k = (window.NEXERA_PACKS || {})[p.id] || {};
  return { shape: k.shape || shapeFor({ name: p.name, category: p.typeName }), dims: k.dims || null, size: k.size || null, est: k.est !== false, back: k.back ? 'assets/cutouts/back/' + p.id + '.webp' : null };
}

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

/* A product as a solid pack built from its photo, standing on y = 0.
   height: world units tall (or mmScale: world units per mm, for real relative sizes). */
export async function packProduct(p, { height = 3, mmScale = 0, shadow = false } = {}) {
  const k = packOf(p);
  const h = mmScale && k.dims && k.dims.h ? k.dims.h * mmScale : height;
  const pack = await createPack(p.img, { shape: k.shape, dims: k.dims, backSrc: k.back, height: h, shadow, rows: DETAIL.rows, segments: DETAIL.segments });
  pack.position.y = h / 2;
  const stand = new THREE.Group(); stand.add(pack);
  const sz = pack.userData.size;
  stand.userData = { product: pack, width: sz.width, height: sz.height, depth: sz.depth, info: k };
  return stand;
}

/* Darken or warm a pack (for the dusk-to-golden-hour cover). */
export function tint(stand, r, g, b) { stand.userData.product.userData.setTint(r, g, b); }

/* Free GPU memory when a scene closes. */
export function dispose(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material; if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach(mm => { if (mm.uniforms && mm.uniforms.map && mm.uniforms.map.value) mm.uniforms.map.value.dispose(); mm.dispose(); });
  });
}
