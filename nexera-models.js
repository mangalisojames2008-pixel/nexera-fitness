// nexera-models.js — real 3D NEXERA-branded skincare packs for Three.js.
// Built from true 3D geometry (not photos): a squeeze tube, a glass dropper
// bottle, a cream jar and an airless pump bottle, each with NEXERA branding,
// printed labels, and studio materials (gloss plastic, frosted glass, metal).
//
//   import { createNexeraProduct, ROUTINE_PACKS } from './nexera-models.js';
//   const tube = createNexeraProduct('cleanse');   // 'cleanse' | 'treat' | 'moisturise' | 'protect'
//   scene.add(tube);   // tube.userData.size = { width, height, depth }
//
// Only BufferGeometry + ShaderMaterial are used, so it works with Three r150+.
//
// Honesty rule: these packs are NEXERA brand visuals for the four routine steps.
// NEXERA sells Garnier, CeraVe, Eucerin and Avène; each step names the real product it stocks.

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* 1. The four NEXERA packs. Edit names, colours and sizes here.      */
/* ------------------------------------------------------------------ */
export const ROUTINE_PACKS = {
  cleanse:    { step: '01', stepName: 'Cleanse',    name: 'Gentle Gel Cleanser', size: '150 ml', kind: 'tube',
                body: '#f3ede6', ink: '#1d1726', accent: '#2f6db5', cap: '#1d1726' },
  treat:      { step: '02', stepName: 'Treat',      name: 'Vitamin C Serum',     size: '30 ml',  kind: 'dropper',
                body: '#c2600e', glass: 0.72, ink: '#1d1726', accent: '#e06a00', cap: '#1d1726', liquid: '#e8902c', label: '#f7f1e8' },
  moisturise: { step: '03', stepName: 'Moisturise', name: 'Hydra Gel Cream',     size: '50 ml',  kind: 'jar',
                body: '#f6f4f1', ink: '#1d1726', accent: '#138a87', cap: '#138a87' },
  protect:    { step: '04', stepName: 'Protect',    name: 'Daily Shield SPF50',  size: '50 ml',  kind: 'pump',
                body: '#f4d6c8', ink: '#1d1726', accent: '#c2410c', cap: '#fbf7f3' },
};
const BRAND = 'NEXERA';

/* ------------------------------------------------------------------ */
/* 2. Studio shader: physically-inspired lighting without HDR files.  */
/*    Soft key + fill + rim, GGX highlights, Fresnel, softbox         */
/*    reflections, clearcoat, metal and glass.                        */
/* ------------------------------------------------------------------ */
const VERT = `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 color; uniform sampler2D map; uniform float useMap;
uniform float roughness; uniform float metal; uniform float clearcoat;
uniform float glass; uniform float opacity; uniform vec3 tint;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
float ggx(vec3 N, vec3 H, float r){ float a = r*r; float a2 = a*a; float d = max(dot(N,H),0.0); float x = d*d*(a2-1.0)+1.0; return a2/(3.14159*x*x+1e-4); }
// fake studio environment: bright top, two vertical softboxes, warm floor bounce
vec3 studio(vec3 R){
  float top = smoothstep(0.2, 0.9, R.y);
  float boxL = smoothstep(0.18, 0.0, abs(R.x + 0.55)) * smoothstep(-0.6, 0.3, R.y);
  float boxR = smoothstep(0.12, 0.0, abs(R.x - 0.62)) * smoothstep(-0.5, 0.4, R.y);
  float floor_ = smoothstep(-0.1, -0.8, R.y);
  return vec3(0.16,0.15,0.17) + vec3(1.0)*top*0.75 + vec3(1.0,0.98,0.95)*(boxL*1.2 + boxR*0.9) + vec3(0.55,0.42,0.32)*floor_*0.35;
}
void main(){
  vec4 t = useMap > 0.5 ? texture2D(map, vUv) : vec4(0.0);
  vec3 base = mix(color, t.rgb, t.a);
  float printed = t.a;                         // labels/print are matte, not glass
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV);
  vec3 L1 = normalize(vec3(0.55, 0.75, 0.6)), L2 = normalize(vec3(-0.7, 0.25, 0.45)), L3 = normalize(vec3(0.1, 0.4, -0.9));
  float NV = clamp(dot(N, V), 0.0, 1.0);
  float r = mix(roughness, 0.6, printed);
  float m = metal * (1.0 - printed);
  vec3 diffuse = base * (0.42 + 0.62*max(dot(N,L1),0.0) + 0.22*max(dot(N,L2),0.0)) * (1.0 - m);
  if (glass > 0.0) diffuse *= mix(0.55, 1.0, printed);   // tinted glass reads darker than plastic
  vec3 F0 = mix(vec3(0.04), base, m);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - NV, 5.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 2; i++){ vec3 L = i == 0 ? L1 : L2; vec3 H = normalize(L + V); spec += F * ggx(N, H, max(r, 0.08)) * max(dot(N, L), 0.0) * (i == 0 ? 0.9 : 0.35); }
  vec3 R = reflect(-V, N);
  vec3 env = studio(R) * F * mix(1.0, 0.25, r) * (m > 0.5 ? 1.6 : 1.0);
  vec3 coat = vec3(0.0);
  if (clearcoat > 0.0){ vec3 H = normalize(L1 + V); float cf = 0.04 + 0.96*pow(1.0-NV,5.0); coat = vec3(ggx(N, H, 0.06)) * max(dot(N,L1),0.0) * 0.5 * clearcoat + studio(R) * cf * 0.55 * clearcoat; }
  float rim = pow(1.0 - NV, 3.0) * max(dot(N, L3) + 0.3, 0.0) * 0.35;
  vec3 col = (diffuse + spec + env + coat + rim) * tint;
  float a = opacity;
  if (glass > 0.0){ a *= mix(mix(glass, 1.0, pow(1.0 - NV, 2.5)), 1.0, printed); }
  gl_FragColor = vec4(col, a);
}`;

const white1 = (() => { const c = document.createElement('canvas'); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();

export function studioMaterial({ color = '#ffffff', map = null, roughness = 0.35, metal = 0, clearcoat = 0, glass = 0, opacity = 1, side = THREE.FrontSide } = {}) {
  const c = new THREE.Color(color);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Vector3(c.r, c.g, c.b) }, map: { value: map || white1 }, useMap: { value: map ? 1 : 0 },
      roughness: { value: roughness }, metal: { value: metal }, clearcoat: { value: clearcoat },
      glass: { value: glass }, opacity: { value: opacity }, tint: { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: VERT, fragmentShader: FRAG, side,
    transparent: glass > 0 || opacity < 1, depthWrite: !(glass > 0),
  });
  return mat;
}

/* ------------------------------------------------------------------ */
/* 3. Geometry: a lathe (turned profile) with real normals and UVs.    */
/*    u wraps around (0.5 = facing the camera), v runs along the       */
/*    profile. Optional squash() flattens it (for squeeze tubes).      */
/* ------------------------------------------------------------------ */
function lathe(profile, { segments = 96, squash = null } = {}) {
  const P = profile.length, pos = [], nor = [], uv = [], idx = [];
  const ys = profile.map(q => q[1]), yMin = Math.min(...ys), yMax = Math.max(...ys);
  for (let i = 0; i < P; i++) {
    const [r, y] = profile[i];
    const a = profile[Math.max(0, i - 1)], b = profile[Math.min(P - 1, i + 1)];
    let nr = b[1] - a[1], ny = -(b[0] - a[0]); const nl = Math.hypot(nr, ny) || 1; nr /= nl; ny /= nl;
    for (let j = 0; j <= segments; j++) {
      const phi = (j / segments) * Math.PI * 2 - Math.PI, s = Math.sin(phi), c = Math.cos(phi);
      let x = r * s, z = r * c, nx = nr * s, nz = nr * c, nyy = ny;
      if (squash) { const k = squash(y); x *= k.x; z *= k.z; nx /= k.x; nz /= Math.max(k.z, 0.02); }
      const l = Math.hypot(nx, nyy, nz) || 1;
      pos.push(x, y, z); nor.push(nx / l, nyy / l, nz / l); uv.push(j / segments, (y - yMin) / ((yMax - yMin) || 1));   // v follows height, so labels sit where you expect
    }
  }
  for (let i = 0; i < P - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(new THREE.BufferAttribute(pos.length / 3 > 65000 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
  return g;
}
// rounded edge helper: quarter circle from (r0,y0) turning by radius
const arc = (cx, cy, rad, a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + (a1 - a0) * k / n; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
const H = Math.PI / 2;

/* ------------------------------------------------------------------ */
/* 4. Printed labels (drawn on canvas, wrapped round the pack).        */
/* ------------------------------------------------------------------ */
function labelCanvas(w = 2048, h = 1024) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; }
/* the site's own type: Sora for the NEXERA wordmark, DM Sans for the rest */
const FONT = '"DM Sans", "Helvetica Neue", Arial, sans-serif';
const MARK = 'Sora, "Helvetica Neue", Arial, sans-serif';

// print centred on the front (u = 0.5). vBand: [v0, v1] part of the height the label covers.
// R = radius, Hh = height of the labelled part, band = [bottom, top] as fractions of Hh
function drawLabel(p, kind, R = 0.5, Hh = 2, band = [0.2, 0.75]) {
  const [c, g] = labelCanvas();
  const draw = () => {
    g.clearRect(0, 0, c.width, c.height);
    const cx = c.width / 2;
    // keep letters in true proportion on a curved surface
    const k = (c.width / (2 * Math.PI * R)) / (c.height / Hh);
    if (kind === 'tube') {
      // vertical print like premium tubes: big NEXERA running up the tube
      g.save(); g.translate(cx, c.height * 0.55); g.scale(k, 1); g.rotate(-Math.PI / 2);
      g.fillStyle = p.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 150px ${MARK}`; g.fillText(BRAND, 0, -30);
      g.fillStyle = p.accent; g.font = `500 40px ${FONT}`; g.fillText(`${p.step} · ${p.stepName.toUpperCase()}`, 0, 70);
      g.fillStyle = p.ink; g.font = `500 44px ${FONT}`; g.fillText(p.name, 0, 125);
      g.globalAlpha = 0.6; g.font = `500 30px ${FONT}`; g.fillText(p.size, 0, 175); g.globalAlpha = 1;
      g.restore();
      g.fillStyle = p.accent; g.fillRect(0, c.height * 0.9, c.width, 10);          // thin accent ring near the crimp
    } else {
      const y0 = c.height * (1 - band[1]), y1 = c.height * (1 - band[0]);     // canvas y is flipped vs v
      const mid = (y0 + y1) / 2;
      let s = (y1 - y0) / 360;
      // shrink to fit the front of the pack (about 110 degrees of its curve)
      g.font = `600 ${Math.round(96 * s)}px ${MARK}`;
      const fit = (c.width * 0.3) / (g.measureText(BRAND).width * k);
      if (fit < 1) s *= fit;
      g.save(); g.translate(cx, 0); g.scale(k, 1); g.translate(-cx, 0);
      if (p.label) { g.fillStyle = p.label; g.fillRect(cx - 300 * s, y0, 600 * s, y1 - y0); }
      g.fillStyle = p.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 ${Math.round(96 * s)}px ${MARK}`; g.fillText(BRAND, cx, mid - 92 * s);
      g.fillStyle = p.accent; g.font = `500 ${Math.round(26 * s)}px ${FONT}`; g.fillText(`${p.step} · ${p.stepName.toUpperCase()}`, cx, mid - 8 * s);
      g.fillStyle = p.ink; g.font = `500 ${Math.round(36 * s)}px ${FONT}`; g.fillText(p.name, cx, mid + 44 * s);
      g.globalAlpha = 0.6; g.font = `500 ${Math.round(24 * s)}px ${FONT}`; g.fillText(p.size, cx, mid + 96 * s); g.globalAlpha = 1;
      g.fillStyle = p.accent; g.fillRect(cx - 160 * s, mid + 132 * s, 320 * s, 4 * s);
      g.restore();
    }
  };
  draw();
  const t = tex(c);
  if (document.fonts) document.fonts.ready.then(() => { draw(); t.needsUpdate = true; });
  return t;
}

/* ------------------------------------------------------------------ */
/* 5. The four models                                                  */
/* ------------------------------------------------------------------ */
function tube(p) {
  // standing on its cap, crimp at the top (like the reference video)
  const R = 0.46, Hh = 3.0;
  const squash = y => { const k = THREE.MathUtils.smoothstep(y, 0.95, Hh); return { x: 1 + 0.2 * k, z: 1 - 0.93 * k }; };
  const capMesh = new THREE.Mesh(lathe([[0, 0], [0.25, 0], [0.27, 0.03], [0.27, 0.56], [0.24, 0.6], [0.2, 0.62], [0, 0.62]]), studioMaterial({ color: p.cap, roughness: 0.28, clearcoat: 0.6 }));
  const bodyProf = [[0, 0.6], [0.2, 0.6], [0.2, 0.68], [0.3, 0.72], [R, 0.9], [R, 1.6], [R, 2.3], [R * 0.98, 2.75], [R * 0.97, Hh - 0.03], [0, Hh]];
  const bodyMesh = new THREE.Mesh(lathe(bodyProf, { squash }), studioMaterial({ color: p.body, map: drawLabel(p, 'tube', 0.46, 2.4), roughness: 0.32, clearcoat: 0.8, side: THREE.DoubleSide }));
  const crimp = new THREE.Mesh(lathe([[0, Hh - 0.03], [0.56, Hh - 0.03], [0.56, Hh + 0.1], [0, Hh + 0.1]], { squash: () => ({ x: 1, z: 0.07 }) }), studioMaterial({ color: p.body, roughness: 0.4 }));
  return { parts: [capMesh, bodyMesh, crimp], height: Hh + 0.1, width: 1.12, depth: 0.92 };
}
function dropper(p) {
  const R = 0.62;
  const glassProf = [[0, 0.02], ...arc(R - 0.1, 0.1, 0.1, -H, 0, 5), [R, 1.55], ...arc(R - 0.28, 1.55, 0.28, 0, H, 6), [0.22, 1.9], [0.22, 2.02], [0, 2.02]];
  const liquidProf = [[0, 0.08], [R - 0.12, 0.08], [R - 0.06, 0.2], [R - 0.06, 1.15], [0, 1.15]];
  const glass = new THREE.Mesh(lathe(glassProf), studioMaterial({ color: p.body, map: drawLabel(p, 'dropper', R, 2.0, [0.1, 0.66]), roughness: 0.06, clearcoat: 1, glass: p.glass || 0.22 }));
  const liquid = new THREE.Mesh(lathe(liquidProf), studioMaterial({ color: p.liquid, roughness: 0.15, opacity: 0.92 }));
  const collar = new THREE.Mesh(lathe([[0, 1.98], [0.3, 1.98], [0.32, 2.02], [0.32, 2.34], [0.3, 2.38], [0, 2.38]]), studioMaterial({ color: '#c9a46a', roughness: 0.22, metal: 1 }));
  const bulb = new THREE.Mesh(lathe([[0, 2.36], [0.22, 2.36], [0.24, 2.5], [0.2, 2.75], ...arc(0, 2.85, 0.2, 0, H, 6)]), studioMaterial({ color: p.cap, roughness: 0.55 }));
  return { parts: [liquid, collar, bulb, glass], height: 3.05, width: R * 2, depth: R * 2 };
}
function jar(p) {
  const R = 1.1;
  const bodyProf = [[0, 0], ...arc(R - 0.08, 0.08, 0.08, -H, 0, 4), [R, 0.95], [R - 0.05, 1.0], [R - 0.08, 1.02], [0, 1.02]];
  const lidProf = [[0, 1.0], [R + 0.02, 1.0], [R + 0.03, 1.04], [R + 0.03, 1.5], ...arc(R - 0.06, 1.5, 0.09, 0, H, 5), [0, 1.59]];
  const body = new THREE.Mesh(lathe(bodyProf), studioMaterial({ color: p.body, map: drawLabel(p, 'jar', R, 1.0, [0.12, 0.84]), roughness: 0.22, clearcoat: 0.9 }));
  const lid = new THREE.Mesh(lathe(lidProf), studioMaterial({ color: p.cap, roughness: 0.3, metal: 0.65, clearcoat: 0.5 }));
  return { parts: [body, lid], height: 1.6, width: (R + 0.03) * 2, depth: (R + 0.03) * 2 };
}
function pump(p) {
  const R = 0.5;
  const bodyProf = [[0, 0], ...arc(R - 0.08, 0.08, 0.08, -H, 0, 4), [R, 2.1], ...arc(R - 0.08, 2.1, 0.08, 0, H, 4), [0.3, 2.18], [0, 2.18]];
  const body = new THREE.Mesh(lathe(bodyProf), studioMaterial({ color: p.body, map: drawLabel(p, 'pump', R, 2.18, [0.22, 0.8]), roughness: 0.3, clearcoat: 0.9 }));
  const collar = new THREE.Mesh(lathe([[0, 2.16], [0.34, 2.16], [0.36, 2.2], [0.36, 2.42], [0.33, 2.45], [0, 2.45]]), studioMaterial({ color: p.cap, roughness: 0.35, clearcoat: 0.6 }));
  const stem = new THREE.Mesh(lathe([[0, 2.44], [0.1, 2.44], [0.1, 2.62], [0, 2.62]], { segments: 32 }), studioMaterial({ color: p.cap, roughness: 0.4 }));
  const head = new THREE.Mesh(lathe([[0, 2.6], [0.3, 2.6], [0.32, 2.64], [0.3, 2.84], [0.22, 2.9], [0, 2.9]], { squash: () => ({ x: 1, z: 0.62 }) }), studioMaterial({ color: p.cap, roughness: 0.35, clearcoat: 0.6 }));
  const nozzle = new THREE.Mesh(lathe([[0, -0.05], [0.07, -0.05], [0.07, 0.05], [0, 0.05]], { segments: 24 }), studioMaterial({ color: p.cap, roughness: 0.35 }));
  nozzle.rotation.set(0, 0, Math.PI / 2); nozzle.scale.set(1, 4.2, 1); nozzle.position.set(0.36, 2.78, 0);
  return { parts: [body, collar, stem, head, nozzle], height: 2.9, width: 1.1, depth: 1.0 };
}

const BUILDERS = { tube, dropper, jar, pump };
const SHADOW_FRAG = `uniform float opacity; varying vec2 vUv;
void main(){ float d = length(vUv * 2.0 - 1.0); float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(0.0, 0.0, 0.0, a * a * 0.35 * opacity); }`;
const SIMPLE_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
function shadowPlane(w, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2]), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 0, 3, 2]), 1));
  return new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { opacity: { value: 1 } }, vertexShader: SIMPLE_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false }));
}

// Returns a Group centred on its middle, standing upright.
export function createNexeraProduct(key, overrides = {}) {
  const p = { ...ROUTINE_PACKS[key], ...overrides };
  const built = BUILDERS[p.kind](p);
  const group = new THREE.Group(), inner = new THREE.Group();
  built.parts.forEach(m => inner.add(m));
  inner.position.y = -built.height / 2;
  group.add(inner);
  const sh = shadowPlane(built.width * 1.8, built.depth * 1.8 + 0.3);
  sh.position.y = -built.height / 2 - 0.01;
  group.add(sh);
  const mats = built.parts.map(m => m.material);
  const baseOpacity = mats.map(m => m.uniforms.opacity.value);
  group.userData = {
    key, info: p, shadow: sh,
    size: { width: built.width, height: built.height, depth: built.depth },
    setOpacity(o) {
      mats.forEach((m, i) => { m.uniforms.opacity.value = baseOpacity[i] * o; m.transparent = true; });
      sh.material.uniforms.opacity.value = o; group.visible = o > 0.01;
    },
    // darken/tint (used under water)
    setTint(r, g, b) { mats.forEach(m => m.uniforms.tint.value.set(r, g, b)); },
  };
  return group;
}
