/* =========================================================
   NexEra Skin studio: the renderer, lights and soft shadows shared by
   the cover and the 3D product view. The products themselves are the
   brands' real photos (product-image-3d.js); nothing is drawn here.
   ========================================================= */
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createProduct, cutOut } from './product-image-3d.js';

export { THREE };

/* Phones get lighter products (fewer side layers) and a lower pixel ratio. */
export const PHONE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
export const LAYERS = PHONE ? 8 : 16;

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

/* A product photo in 3D, sized to fit a box (tall bottles and wide jars come out in proportion),
   standing on y = 0. The photo keeps its true colours (no tone mapping). */
export async function photoProduct(p, { maxH = 4, maxW = 2.3, renderer = null, layers = LAYERS, depth } = {}) {
  const photo = await cutOut(p.img);
  const aspect = photo.width / photo.height;
  const height = Math.min(maxH, maxW / aspect);
  const group = await createProduct(p.img, { height, layers, renderer, depth: depth || Math.min(0.42, 0.12 + height * 0.06), backUrl: p.back || null });
  group.traverse(o => { if (o.material) { o.material.toneMapped = false; if (o.material.color) o.material.userData.base = o.material.color.clone(); } });
  group.position.y = height / 2;
  const stand = new THREE.Group(); stand.add(group);
  stand.userData = { product: group, width: height * aspect, height, depth: group.userData.depth, hasBack: !!p.back };
  return stand;
}

/* Darken or warm a product photo (for the night-to-dawn cover). */
export function tint(stand, r, g, b) {
  stand.userData.product.traverse(o => {
    const m = o.material; if (!m || !m.color || !m.userData.base) return;
    m.color.setRGB(m.userData.base.r * r, m.userData.base.g * g, m.userData.base.b * b);
  });
}

/* Free GPU memory when a scene closes (product photo textures are shared, so they stay). */
export function dispose(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material; if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach(mm => mm.dispose());
  });
}
