/* =========================================================
   NexEra Skin: real product photos as 3D objects.
   createProduct(url) turns a product photo into a thick 3D card that can turn,
   swing and spin. No drawn or modelled packaging anywhere.
   createHangTag(product) hangs a product on a swinging string.
   ========================================================= */
import * as THREE from 'three';

const loaded = new Map();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load product image: ' + url));
    img.src = url;
  });
}

/* Remove a plain white background (if the image has no transparency yet) and trim to the product. */
export async function cutOut(url, { tolerance = 22, maxSize = 1024 } = {}) {
  if (loaded.has(url)) return loaded.get(url);
  const job = (async () => {
    const img = await loadImage(url);
    const s = Math.min(1, maxSize / Math.max(img.width, img.height));
    const W = Math.round(img.width * s), H = Math.round(img.height * s);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const data = g.getImageData(0, 0, W, H); const px = data.data;
    let hasAlpha = false;
    for (let i = 3; i < px.length; i += 4 * 61) if (px[i] < 250) { hasAlpha = true; break; }
    if (!hasAlpha) {
      const isBg = i => { const r = px[i], gg = px[i + 1], b = px[i + 2]; const mn = Math.min(r, gg, b), mx = Math.max(r, gg, b); return 255 - mn <= tolerance && mx - mn < 14; };
      const seen = new Uint8Array(W * H); const stack = [];
      for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
      for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
      while (stack.length) {
        const p = stack.pop(); if (seen[p]) continue; seen[p] = 1; const i = p * 4; if (!isBg(i)) continue; px[i + 3] = 0; const x = p % W, y = (p / W) | 0;
        if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
      }
      const a0 = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) a0[p] = px[p * 4 + 3];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const p = y * W + x; if (!a0[p]) continue;
        if (!a0[p - 1] || !a0[p + 1] || !a0[p - W] || !a0[p + W]) { const i = p * 4, w = 255 - Math.min(px[i], px[i + 1], px[i + 2]); px[i + 3] = Math.max(70, Math.min(255, w * 6)); }
      }
      g.putImageData(data, 0, 0);
    }
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (px[(y * W + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
    const pad = 2, tw = x1 - x0 + 1 + pad * 2, th = y1 - y0 + 1 + pad * 2;
    const out = document.createElement('canvas'); out.width = tw; out.height = th;
    out.getContext('2d').drawImage(c, x0 - pad, y0 - pad, tw, th, 0, 0, tw, th);
    return out;
  })();
  loaded.set(url, job);
  job.catch(() => loaded.delete(url));
  return job;
}

/* One GPU texture per photo, shared by every copy of the product. */
const textures = new WeakMap();
function textureFrom(canvas, renderer) {
  if (textures.has(canvas)) return textures.get(canvas);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  textures.set(canvas, t);
  return t;
}

/* The photo as a thick card: a front, stacked layers for the sides, a back and a moving sheen.
   layers: 16 looks solid on a laptop; 8 is lighter for phones. */
export async function createProduct(url, opts = {}) {
  const { height = 3, depth = 0.32, layers = 16, backUrl = null, renderer = null } = opts;
  const front = await cutOut(url);
  const aspect = front.width / front.height;
  const width = height * aspect;
  const tex = textureFrom(front, renderer);
  const geo = new THREE.PlaneGeometry(width, height);
  const group = new THREE.Group(); const mats = [];
  const frontMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, side: THREE.FrontSide }); mats.push(frontMat);
  const frontMesh = new THREE.Mesh(geo, frontMat); frontMesh.position.z = depth / 2; group.add(frontMesh);
  for (let k = 1; k < layers; k++) {
    const shade = 0.55 + 0.25 * Math.sin((k / layers) * Math.PI);
    const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(shade, shade, shade), alphaTest: 0.5, transparent: true, side: THREE.DoubleSide }); mats.push(m);
    const layer = new THREE.Mesh(geo, m); layer.position.z = depth / 2 - (depth * k) / layers; group.add(layer);
  }
  let backMesh;
  if (backUrl) {
    const back = textureFrom(await cutOut(backUrl), renderer);
    const bm = new THREE.MeshBasicMaterial({ map: back, transparent: true, alphaTest: 0.05 }); mats.push(bm);
    backMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), bm); backMesh.rotation.y = Math.PI;
  } else {
    const bm = new THREE.MeshBasicMaterial({ map: tex, color: 0xb8b8b8, transparent: true, alphaTest: 0.05, side: THREE.BackSide }); mats.push(bm);
    backMesh = new THREE.Mesh(geo, bm);
  }
  backMesh.position.z = -depth / 2; group.add(backMesh);
  const sheenMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { map: { value: tex }, shift: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float shift; varying vec2 vUv;
      void main(){ float a = texture2D(map, vUv).a; if (a < 0.5) discard;
      float band = smoothstep(0.18, 0.0, abs(vUv.x - 0.5 - shift)) * 0.22;
      gl_FragColor = vec4(vec3(1.0), band * a); }`
  });
  const sheen = new THREE.Mesh(geo, sheenMat); sheen.position.z = depth / 2 + 0.002; group.add(sheen);
  group.userData = {
    width, height, depth, url, hasBack: !!backUrl, materials: mats,
    updateSheen() { sheenMat.uniforms.shift.value = THREE.MathUtils.clamp(Math.sin(group.rotation.y) * 0.6, -0.7, 0.7); },
    setOpacity(o) { mats.forEach(m => { m.opacity = o; m.transparent = true; }); sheenMat.uniforms.shift.value = o < 0.99 ? 5 : sheenMat.uniforms.shift.value; group.visible = o > 0.01; }
  };
  return group;
}

/* Hang a product on a string that swings (a simple pendulum). */
export function createHangTag(product, { length = 2, damping = 0.9, startAngle = 0.55, stringColor = 0x2a1a14 } = {}) {
  const root = new THREE.Group(); const pivot = new THREE.Group(); root.add(pivot);
  const h = product.userData.height || 3;
  const strMat = new THREE.LineBasicMaterial({ color: stringColor, transparent: true, opacity: 0.85 });
  const strGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0)]);
  const string = new THREE.Line(strGeo, strMat); pivot.add(string);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), new THREE.MeshBasicMaterial({ color: stringColor })); loop.position.y = -length; pivot.add(loop);
  product.position.set(0, -length - h / 2 + 0.04, 0); pivot.add(product);
  let theta = startAngle, omega = 0, twist = 0, amount = 1; const g = 9.8;
  return {
    root, pivot, string,
    nudge(v) { omega += v; },
    setAmount(a) { amount = a; strMat.opacity = 0.85 * a; loop.visible = a > 0.05; string.visible = a > 0.02; },
    update(dt) {
      dt = Math.min(dt, 1 / 30); omega += (-(g / (length + h / 2)) * Math.sin(theta) - damping * omega) * dt; theta += omega * dt; twist += dt;
      pivot.rotation.z = theta * amount; product.rotation.y = Math.sin(twist * 0.8) * 0.35 * amount + product.rotation.y * (1 - amount);
    }
  };
}
