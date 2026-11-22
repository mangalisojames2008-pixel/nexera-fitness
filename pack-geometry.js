// pack-geometry.js — no dependencies.
// Turns ONE product photo into a solid 3D pack (real width, height, depth).
//
// How: the photo's outline is measured row by row. Each row becomes a ring
// around the product (round for bottles/jars, flattening towards the crimp
// for tubes, squared-off for cartons). The front of the solid wears the
// photo exactly as shot; the back wears the back photo if there is one,
// otherwise the pack's own side colours carried round. So it has real
// volume from every angle, not stacked flat images.

export const SHAPES = {
  round: { n: 2,   depth: 1.0  },  // dropper bottles, jars, sprays, tubs
  oval:  { n: 2,   depth: 0.55 },  // flat-ish pump bottles, micellar bottles
  tube:  { n: 2,   depth: 0.85 },  // squeeze tubes (flattens to the crimp)
  box:   { n: 5,   depth: 0.45 },  // cartons, rectangular bottles
};

// ---------- 1. cut the white background out of the photo ----------
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load product image: ' + url));
    img.src = url;
  });
}

// Flood-fills near-white from the edges (keeps white parts inside the pack),
// feathers the edge, trims to the product. Images with transparency are only trimmed.
// maxSize 2048 keeps small label text (product name, ml, brand logo) sharp.
export function cutOutImage(img, { tolerance = 12, maxSize = 2048 } = {}) {
  const s = Math.min(1, maxSize / Math.max(img.width, img.height));
  const W = Math.round(img.width * s), H = Math.round(img.height * s);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const data = g.getImageData(0, 0, W, H), px = data.data;
  let hasAlpha = false;
  for (let i = 3; i < px.length; i += 4 * 61) if (px[i] < 250) { hasAlpha = true; break; }
  if (!hasAlpha) {
    const isBg = i => { const r = px[i], gg = px[i + 1], b = px[i + 2], mn = Math.min(r, gg, b), mx = Math.max(r, gg, b); return 255 - mn <= tolerance && mx - mn < 10; };
    const seen = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) {
      const p = st.pop(); if (seen[p]) continue; seen[p] = 1;
      const i = p * 4; if (!isBg(i)) continue; px[i + 3] = 0;
      const x = p % W, y = (p / W) | 0;
      if (x > 0) st.push(p - 1); if (x < W - 1) st.push(p + 1); if (y > 0) st.push(p - W); if (y < H - 1) st.push(p + W);
    }
    const a0 = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) a0[p] = px[p * 4 + 3];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x; if (!a0[p]) continue;
      if (!a0[p - 1] || !a0[p + 1] || !a0[p - W] || !a0[p + W]) { const i = p * 4; px[i + 3] = Math.max(80, Math.min(255, (255 - Math.min(px[i], px[i + 1], px[i + 2])) * 6)); }
    }
    g.putImageData(data, 0, 0);
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d', { willReadFrequently: true }).drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// ---------- 2. measure the outline, row by row ----------
export function measure(canvas, rows = 200) {
  const W = canvas.width, H = canvas.height;
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const out = [];
  for (let r = 0; r < rows; r++) {
    const y = Math.min(H - 1, Math.round((r / (rows - 1)) * (H - 1)));
    let l = -1, rr = -1;
    for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 100) { l = x; break; }
    for (let x = W - 1; x >= 0; x--) if (px[(y * W + x) * 4 + 3] > 100) { rr = x + 1; break; }
    out.push({ y, l: l < 0 ? W / 2 : l, r: rr < 0 ? W / 2 : rr });
  }
  // Packshots often have a soft shadow or reflection under the product.
  // Drop thin rows at the very bottom so the pack gets a real flat base.
  const widths = out.map(o => o.r - o.l).sort((a, b) => a - b);
  const body = widths[Math.floor(widths.length * 0.7)] || 1;
  let end = out.length;
  while (end > out.length * 0.92 && (out[end - 1].r - out[end - 1].l) < body * 0.55) end--;
  return { W, H, rows: out.slice(0, end) };
}

// ---------- 3. back texture when there's no back photo ----------
// Carries each row's side colour round the back, so the back reads as the
// same pack material/label colours (no mirrored text, no blank grey).
export function backFromSides(front) {
  const W = front.width, H = front.height;
  const src = front.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const img = g.createImageData(W, H); const d = img.data;
  const rowCol = new Float32Array(H * 3);
  for (let y = 0; y < H; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < W; x++) if (src[(y * W + x) * 4 + 3] > 100) { l = x; break; }
    for (let x = W - 1; x >= 0; x--) if (src[(y * W + x) * 4 + 3] > 100) { r = x; break; }
    if (l < 0) continue;
    const w = r - l + 1, s0 = Math.round(w * 0.06), s1 = Math.max(s0 + 1, Math.round(w * 0.16));
    let R = 0, G = 0, B = 0, n = 0;
    for (const x of [[l + s0, l + s1], [r - s1, r - s0]]) for (let xx = x[0]; xx <= x[1]; xx++) {
      const i = (y * W + xx) * 4; if (src[i + 3] < 100) continue; R += src[i]; G += src[i + 1]; B += src[i + 2]; n++;
    }
    if (n) { rowCol[y * 3] = R / n; rowCol[y * 3 + 1] = G / n; rowCol[y * 3 + 2] = B / n; }
  }
  // light vertical smoothing so label stripes stay but noise goes
  const k = Math.max(1, Math.round(H / 200));
  for (let y = 0; y < H; y++) {
    let R = 0, G = 0, B = 0, n = 0;
    for (let yy = Math.max(0, y - k); yy <= Math.min(H - 1, y + k); yy++) { if (rowCol[yy * 3] + rowCol[yy * 3 + 1] + rowCol[yy * 3 + 2] === 0) continue; R += rowCol[yy * 3]; G += rowCol[yy * 3 + 1]; B += rowCol[yy * 3 + 2]; n++; }
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (src[i + 3] < 10 || !n) { d[i + 3] = 0; continue; }
      d[i] = R / n; d[i + 1] = G / n; d[i + 2] = B / n; d[i + 3] = src[i + 3];
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Front photo on the left half, back on the right half of one texture.
export function makeAtlas(front, back) {
  // phones can't use textures wider/taller than 4096px
  const k = Math.min(1, 4096 / (front.width * 2), 4096 / front.height);
  const W = Math.round(front.width * k), H = Math.round(front.height * k);
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(front, 0, 0, W, H);
  g.drawImage(back || backFromSides(front), W, 0, W, H);
  return c;
}

// ---------- 4. build the solid ----------
// opts.shape: 'round' | 'oval' | 'tube' | 'box'
// opts.height: world units tall
// opts.depthRatio: depth ÷ width of the main body (from real mm if known)
// opts.crimp: 'top' | 'bottom' | 'auto' (tubes only)
export function buildPack(sil, { shape = 'oval', height = 3, depthRatio = null, crimp = 'auto', segments = 72 } = {}) {
  const spec = SHAPES[shape] || SHAPES.oval;
  const ratio = depthRatio ?? spec.depth;
  const n = spec.n;
  const { W, H, rows } = sil;
  const R = rows.length, s = height / H;
  const width = r => Math.max(0, r.r - r.l);

  // "core" width: ignores thin side bits (pump nozzles, hang tabs) when
  // working out depth, so a nozzle doesn't become a fat disc
  const win = Math.max(2, Math.round(R * 0.03));
  const core = rows.map((_, i) => { let m = Infinity; for (let j = Math.max(0, i - win); j <= Math.min(R - 1, i + win); j++) m = Math.min(m, width(rows[j])); return m; });
  const bodyW = [...core].sort((a, b) => a - b)[Math.floor(R * 0.7)] || 1;

  let crimpTop = crimp === 'top';
  if (shape === 'tube' && crimp === 'auto') {
    const avg = (a, b) => { let t = 0; for (let i = a; i < b; i++) t += width(rows[i]); return t / (b - a); };
    const k = Math.max(2, Math.round(R * 0.12));
    crimpTop = avg(0, k) > avg(R - k, R);
  }
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const depthAt = i => {
    let d = Math.min(core[i], bodyW * 1.05) * ratio;
    if (shape === 'tube') {
      const t = crimpTop ? 1 - i / (R - 1) : i / (R - 1);       // 0 at cap end, 1 at crimp
      d = Math.min(core[i], bodyW) * ratio * (1 - 0.93 * smooth(0.12, 0.97, t));
    }
    return Math.max(d, 0);
  };

  const pos = [], nor = [], uv = [], idx = [];
  const half = Math.floor(segments / 2);
  const ys = rows.map(r => (H / 2 - r.y) * s);
  const cx = rows.map(r => ((r.l + r.r) / 2 - W / 2) * s);
  const ax = rows.map(r => width(r) * s / 2);
  const bz = rows.map((_, i) => depthAt(i) * s / 2);
  const spow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

  // two shells (front + back) so each can use its own half of the texture
  for (const back of [false, true]) {
    const base = pos.length / 3;
    for (let i = 0; i < R; i++) {
      const dA = (ax[Math.min(R - 1, i + 1)] - ax[Math.max(0, i - 1)]) / ((ys[Math.max(0, i - 1)] - ys[Math.min(R - 1, i + 1)]) || 1e-6);
      for (let k = 0; k <= half; k++) {
        const th = (back ? Math.PI : 0) + (k / half) * Math.PI;   // front: 0..π (z>0)
        const c = Math.cos(th), sn = Math.sin(th);
        const a = Math.max(ax[i], 1e-5), b = Math.max(bz[i], 1e-5);
        const x = a * spow(c, 2 / n), z = b * spow(sn, 2 / n);
        pos.push(cx[i] + x, ys[i], z);
        // analytic normal of the superellipse, plus slope along the height
        let nx = spow(x / a, n - 1) / a, nz = spow(z / b, n - 1) / b;
        const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
        let ny = dA * Math.abs(nx) * 0.9;
        const L = Math.hypot(nx, ny, nz) || 1;
        nor.push(nx / L, ny / L, nz / L);
        const xn = (cx[i] + x * 0.965) / s / W + 0.5;       // 0..1 across the photo (inset so edges don't smear)
        uv.push(back ? 0.5 + 0.5 * (1 - xn) : 0.5 * xn, 1 - rows[i].y / H);
      }
    }
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < half; k++) {
      const a = base + i * (half + 1) + k, b2 = a + half + 1;
      idx.push(a, a + 1, b2, a + 1, b2 + 1, b2);   // outward-facing
    }
  }
  // end caps
  for (const top of [true, false]) {
    const i = top ? 0 : R - 1, ny = top ? 1 : -1;
    const c0 = pos.length / 3;
    pos.push(cx[i], ys[i], 0); nor.push(0, ny, 0); uv.push(0.5 * ((cx[i] / s) / W + 0.5), 1 - rows[i].y / H);
    for (let k = 0; k <= segments; k++) {
      const th = (k / segments) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      const x = ax[i] * spow(c, 2 / n), z = bz[i] * spow(sn, 2 / n);
      pos.push(cx[i] + x, ys[i], z); nor.push(0, ny, 0);
      uv.push(0.5 * ((cx[i] + x) / s / W + 0.5), 1 - rows[i].y / H);
    }
    for (let k = 0; k < segments; k++) top ? idx.push(c0, c0 + k + 2, c0 + k + 1) : idx.push(c0, c0 + k + 1, c0 + k + 2);
  }
  return {
    positions: new Float32Array(pos), normals: new Float32Array(nor), uvs: new Float32Array(uv),
    indices: (pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)),
    size: { width: W * s, height, depth: Math.max(...bz) * 2 },
  };
}

// ---------- 5. shared shader (used by Three.js AND the test renderer) ----------
// Keeps the photo's own colours, adds soft lighting, roundness and a gloss
// highlight that moves as the pack turns.
export const PACK_VERTEX = `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
export const PACK_FRAGMENT = `
uniform sampler2D map; uniform float opacity; uniform float gloss; uniform vec3 tint;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec4 t = texture2D(map, vUv);
  if (t.a < 0.35) discard;
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV);
  vec3 L = normalize(vec3(0.45, 0.65, 0.75));
  float diff = max(dot(N, L), 0.0);
  float facing = clamp(dot(N, V), 0.0, 1.0);
  // the photo already carries the real label lighting, so shading is gentle
  float shade = (0.70 + 0.34 * diff) * mix(0.66, 1.0, pow(facing, 0.6));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * 0.30 * gloss;
  // soft vertical "softbox" reflections, as in studio product shots
  float strip = smoothstep(0.16, 0.0, abs(N.x - 0.42)) * 0.16 + smoothstep(0.10, 0.0, abs(N.x + 0.62)) * 0.07;
  strip *= gloss * smoothstep(0.0, 0.35, facing);
  float rim = pow(1.0 - facing, 3.0) * 0.12;
  vec3 col = (t.rgb * shade + vec3(spec + strip + rim)) * tint;
  gl_FragColor = vec4(min(col, vec3(1.0)), opacity);
}`;
