/* =========================================================
   NEXERA cinematic story (from the owner's nexera-cinematic.html):
   hero (the serum floating under leaf shadows) → statement (words light up)
   → 01 Cleanse → water drop → 02 Treat → 03 Moisturise → 04 Protect
   → tile reveal → banner → "It's in the bag" → the shop.

   THE RULE: every section has an empty .stage box in the normal page layout.
   A NEXERA pack is only ever drawn inside the active section's stage, sized to
   fit it. Sections with data-stage="none" fade the pack out. Between stages the
   pack spins away small and faint. Never position packs with screen fractions.

   The packs are NEXERA brand visuals for the four steps; each step names the
   real product we stock. main.js starts this only without reduced motion; the
   still pictures in the stages stay otherwise.
   ========================================================= */
import * as THREE from 'three';
import { createNexeraProduct, ROUTINE_PACKS, studioMaterial } from './nexera-models.js';

export function start(root) {
  const canvas = root.querySelector('.cine__gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  let vw = 1, vh = 1, viewH = 1;
  function resize() {
    vw = innerWidth; vh = innerHeight; renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }
  resize();
  const toWorld = (x, y) => ({ x: (x - vw / 2) / vh * viewH, y: -(y - vh / 2) / vh * viewH });
  const px = p => p / vh * viewH;

  const models = Object.fromEntries(Object.keys(ROUTINE_PACKS).map(k => [k, createNexeraProduct(k)]));
  Object.values(models).forEach(m => { m.visible = false; scene.add(m); });
  const bag = makeBag(); bag.visible = false; scene.add(bag);

  /* statement words and the tile reveal */
  const words = [...root.querySelectorAll('.statement .w')];
  const tiles = root.querySelector('.tiles'), grid = tiles && tiles.querySelector('.tiles__grid');
  if (grid) {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const t = document.createElement('div'); t.className = 't';
      t.style.backgroundPosition = `${c / 7 * 100}% ${r / 5 * 100}%`;
      t.style.transitionDelay = `${(Math.hypot(c - 3.5, r - 2.5) * 0.06).toFixed(2)}s`;
      grid.appendChild(t);
    }
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { tiles.classList.add('in'); o.disconnect(); } }, { threshold: 0.35 }).observe(tiles);
  }

  /* ---------------- stage engine ---------------- */
  const secs = [...root.querySelectorAll(':scope > section')].map(sec => {
    const stEl = sec.querySelector('[data-stage]') || (sec.dataset.stage ? sec : null);
    const mode = stEl ? stEl.dataset.stage : 'none';
    return { sec, st: mode === 'none' ? null : stEl, mode, product: stEl && stEl.dataset.product, theme: sec.dataset };
  });
  const smooth = t => t * t * (3 - 2 * t);
  const box = s => {
    const r = s.st.getBoundingClientRect();
    if (s.mode === 'bag') return { cx: r.left + r.width / 2, cy: r.top + r.height * 0.30, h: r.height * 0.46, w: r.width * 0.5, r };
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height * 0.86, w: r.width * 0.8, r };
  };
  const fit = (m, b) => Math.min(px(b.h) / m.userData.size.height, px(b.w) / Math.max(m.userData.size.width, 0.01));
  let theme = null;
  const setTheme = t => {
    if (!t || theme === t) return; theme = t;
    if (t.bg) root.style.setProperty('--sbg', t.bg);
    if (t.accent) root.style.setProperty('--accent', t.accent);
  };
  const waterEl = root.querySelector('.water');
  let mouseX = 0; addEventListener('pointermove', e => { mouseX = e.clientX / vw - 0.5; }, { passive: true });

  function frame(now) {
    /* the canvas is fixed to the screen: only paint inside the story */
    const rr = root.getBoundingClientRect();
    canvas.style.clipPath = `inset(${Math.max(0, rr.top).toFixed(0)}px 0 ${Math.max(0, vh - rr.bottom).toFixed(0)}px 0)`;

    const mid = vh * 0.5, band = vh * (vw < 900 ? 0.22 : 0.28);
    const rects = secs.map(s => s.sec.getBoundingClientRect());
    let k = 0; for (let i = 0; i < secs.length; i++) if (rects[i].top <= mid) k = i;
    let a = k, b = k, t = 0;
    if (secs[k].mode !== 'water') {
      if (k > 0 && mid - rects[k].top < band) { a = k - 1; b = k; t = 0.5 + (mid - rects[k].top) / (2 * band); }
      else if (k < secs.length - 1 && rects[k].bottom - mid < band) { a = k; b = k + 1; t = (mid - (rects[k].bottom - band)) / (2 * band); }
    }
    t = smooth(Math.min(1, Math.max(0, t)));
    setTheme(secs[t < 0.5 ? a : b].theme);

    /* statement: the words light up as it scrolls through */
    const si = secs.findIndex(s => s.sec.classList.contains('statement'));
    if (si >= 0) {
      const sr = rects[si], p = Math.min(1, Math.max(0, (vh * 0.85 - sr.top) / (sr.height * 0.8)));
      words.forEach((w, i) => w.classList.toggle('on', i / words.length < p));
    }

    const A = secs[a], B = secs[b];
    Object.values(models).forEach(m => { m.visible = false; });
    let show = null, pos = null, sc = 0, ry = 0, alpha = 1, tint = [1, 1, 1];

    if (a === b && A.mode === 'water') {
      /* sticky water drop: the pack falls in, rings and bubbles start on impact */
      const r = rects[a], p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      const bx = box(A), m = models[A.product];
      const surface = waterEl.getBoundingClientRect().top;
      const y = THREE.MathUtils.lerp(bx.r.top + bx.h * 0.35, surface + vh * 0.2, Math.pow(Math.min(1, p * 1.35), 2));
      show = A.product; pos = toWorld(bx.cx, y); sc = fit(m, bx) * 0.85; ry = p * Math.PI * 1.5;
      const under = y > surface;
      waterEl.classList.toggle('hit', under);
      if (under) tint = [0.72, 0.86, 0.95];
      if (p > 0.97 && k < secs.length - 1) alpha = 1 - (p - 0.97) / 0.03;
    } else {
      if (waterEl) waterEl.classList.remove('hit');
      const pa = A.mode !== 'none', pb = B.mode !== 'none';
      if (pa || pb) {
        const bA = pa ? box(A) : null, bB = pb ? box(B) : null;
        const prodA = pa ? A.product : B.product, prodB = pb ? B.product : A.product;
        const swap = prodA !== prodB;
        show = swap ? (t < 0.5 ? prodA : prodB) : prodA;
        const from = bA || bB, to = bB || bA;
        pos = toWorld(THREE.MathUtils.lerp(from.cx, to.cx, t), THREE.MathUtils.lerp(from.cy, to.cy, t));
        sc = THREE.MathUtils.lerp(fit(models[prodA], from), fit(models[prodB], to), t);
        ry = swap ? (t < 0.5 ? t * Math.PI : (t - 1) * Math.PI) : (a !== b ? t * Math.PI * 2 : 0);
        if (!pa) alpha = t; if (!pb) alpha = 1 - t;   /* fade in and out of the text-only sections */
        const travel = a !== b ? Math.sin(Math.PI * t) : 0;
        /* gone at the middle of a move, so a travelling pack never crosses the words */
        sc *= 1 - 0.55 * travel; alpha *= Math.pow(1 - travel, 2);
      }
    }

    if (show) {
      const m = models[show]; m.visible = true;
      m.position.set(pos.x, pos.y + Math.sin(now / 900) * 0.06, 0.5);
      m.rotation.set(0.08, ry + Math.sin(now / 1700) * 0.2 + mouseX * 0.4, Math.sin(now / 2300) * 0.04);
      m.scale.setScalar(sc);
      m.userData.setOpacity(Math.max(0, Math.min(1, alpha)));
      m.userData.setTint(...tint);
      m.userData.shadow.visible = A.mode !== 'water';
    }

    /* the bag follows its stage; the protect pack drops into it */
    const bs = secs.find(s => s.mode === 'bag');
    if (bs) {
      const br = bs.st.getBoundingClientRect();
      bag.visible = br.bottom > -40 && br.top < vh + 40;
      if (bag.visible) {
        const s2 = Math.min(px(br.height * 0.6) / bag.userData.size.height, px(br.width * 0.7) / bag.userData.size.width);
        const w2 = toWorld(br.left + br.width / 2, br.bottom - br.height * 0.34);
        bag.scale.setScalar(s2); bag.position.set(w2.x, w2.y, 0); bag.rotation.set(0.06, -0.4 + Math.sin(now / 2400) * 0.08, 0);
        if (show === 'protect' && (A.mode === 'bag' || B.mode === 'bag')) models.protect.position.z = -0.1;
      }
    }
    renderer.render(scene, camera);
  }

  /* draw only while the story is on screen */
  let raf = 0, inView = true, first = true;
  function loop(now) {
    raf = 0;
    if (!inView || document.hidden) return;
    frame(now);
    if (first) { first = false; root.classList.add('is-3d'); }
    raf = requestAnimationFrame(loop);
  }
  const wake = () => { if (!raf && inView && !document.hidden) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(e => { inView = e[0].isIntersecting; canvas.style.visibility = inView ? 'visible' : 'hidden'; wake(); }).observe(root);
  document.addEventListener('visibilitychange', wake);
  addEventListener('resize', () => { resize(); wake(); });
  if (/[?&]debug\b/.test(location.search)) window.__nexCine = { models, bag, frame: () => frame(performance.now()) };
  wake();
  return { models };
}

/* a simple shopping bag: a box body with a printed front and two handles */
export function makeBag() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 640; const g = c.getContext('2d');
  const draw = () => {
    g.fillStyle = '#24150f'; g.fillRect(0, 0, 512, 640);
    g.fillStyle = '#f6f0e0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 64px Sora, "Helvetica Neue", Arial, sans-serif'; g.fillText('NEXERA', 256, 330);
    g.font = '500 22px "DM Sans", "Helvetica Neue", Arial, sans-serif'; g.globalAlpha = 0.6; g.fillText('your routine, in four steps', 256, 390); g.globalAlpha = 1;
  };
  draw(); const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  if (document.fonts) document.fonts.ready.then(() => { draw(); t.needsUpdate = true; });
  const W = 2, H = 2.3, D = 0.8;
  const pos = [], nor = [], uv = [], idx = [];
  const quad = (a, b, c2, d, n, uvq) => { const s = pos.length / 3; [a, b, c2, d].forEach((p, i) => { pos.push(...p); nor.push(...n); uv.push(...uvq[i]); }); idx.push(s, s + 1, s + 2, s, s + 2, s + 3); };
  const x = W / 2, y = H / 2, z = D / 2, Z = [[0, 0], [0, 0], [0, 0], [0, 0]], F = [[0, 0], [1, 0], [1, 1], [0, 1]];
  quad([-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1], F);   /* the printed front */
  quad([x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1], Z);
  quad([x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0], Z);
  quad([-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0], Z);
  quad([-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0], Z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(geo, studioMaterial({ color: '#24150f', map: t, roughness: 0.55, side: THREE.DoubleSide })));
  /* handles: half rings */
  const ring = () => {
    const p2 = [], n2 = [], u2 = [], i2 = [], R = 0.45, r = 0.03, S = 24, T = 8;
    for (let i = 0; i <= S; i++) {
      const a = Math.PI * i / S;
      for (let j = 0; j <= T; j++) {
        const b = 2 * Math.PI * j / T, cx = Math.cos(a) * R, cy = Math.sin(a) * R;
        const nx = Math.cos(a) * Math.cos(b), ny = Math.sin(a) * Math.cos(b), nz = Math.sin(b);
        p2.push(cx + nx * r, cy + ny * r, nz * r); n2.push(nx, ny, nz); u2.push(i / S, j / T);
      }
    }
    for (let i = 0; i < S; i++) for (let j = 0; j < T; j++) { const a = i * (T + 1) + j, b = a + T + 1; i2.push(a, b, a + 1, a + 1, b, b + 1); }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p2), 3));
    g2.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n2), 3));
    g2.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(u2), 2));
    g2.setIndex(new THREE.BufferAttribute(new Uint16Array(i2), 1));
    return g2;
  };
  [-0.22, 0.22].forEach(zz => { const h = new THREE.Mesh(ring(), studioMaterial({ color: '#c9b9a6', roughness: 0.7, side: THREE.DoubleSide })); h.position.set(0, y, zz); grp.add(h); });
  grp.userData.size = { width: W, height: H + 0.45, depth: D };
  return grp;
}
