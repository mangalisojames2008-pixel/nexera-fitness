/* =========================================================
   NexEra Skin scroll story (after the cover), with solid 3D packs made
   from the real product photos (product-3d.js). From nexera-story.html.
   hero: the cleanser hangs on a swinging string (your pointer pushes it)
   word: the product passes through the giant NEXERA
   steps: each product stands on its post card, in the brand's colours
   bag: the last product drops into a NexEra bag

   THE RULE: every section has an empty .stage box in the normal page layout.
   The product is only ever drawn inside the active section's stage box, sized
   to fit it. Between sections it spins away small and faint while it moves to
   the next stage, then appears edge-on in the new one. Text and buttons sit in
   their own layout space, so nothing can be covered on any screen size.
   Never position products with fixed screen fractions.

   Runs only without reduced motion; otherwise the still photos in the stages stay.
   ========================================================= */
import * as THREE from 'three';
import { createPack, createBag, createHang } from './product-3d.js';
import { packOf, DETAIL, PHONE } from './studio.js';

export async function start(story) {
  const canvas = story.querySelector('.story__gl');
  const ROUTINE = window.NEXERA_SKIN.FEATURED;
  if (!ROUTINE.length) return null;

  /* ---------------- 3D scene ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  let vw = 1, vh = 1, viewH = 1;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }
  resize();
  const toWorld = (x, y) => ({ x: (x - vw / 2) / vh * viewH, y: -(y - vh / 2) / vh * viewH });
  const pxToWorld = px => px / vh * viewH;

  const packs = await Promise.all(ROUTINE.map(p => {
    const k = packOf(p);
    return createPack(p.img, { shape: k.shape, dims: k.dims, backSrc: k.back, rows: DETAIL.rows, segments: DETAIL.segments });
  }));
  packs.forEach(p => { p.visible = false; scene.add(p); });
  const bag = await createBag(); bag.visible = false; scene.add(bag);
  const hang = createHang(scene);

  /* ---------------- stage-follow engine ---------------- */
  // Sections with a stage, in order. The product lives in the active section's
  // stage, and glides to the next stage while the boundary between the two
  // sections passes the middle of the screen.
  const secs = Array.from(story.querySelectorAll('.st')).map(sec => {
    const st = sec.querySelector('[data-stage]');
    return { sec, st, mode: st.dataset.stage, product: +st.dataset.product, theme: sec.dataset };
  });
  const smooth = t => t * t * (3 - 2 * t);
  function fitFor(s, rect) {
    // target box on screen for this stage, as { cx, cy, h, w }
    if (s.mode === 'bag') return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height * 0.36, h: rect.height * 0.5, w: rect.width * 0.5 };
    if (s.mode === 'hang') return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height * 0.62, h: rect.height * 0.66, w: rect.width * 0.8 };
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, h: rect.height * 0.86, w: rect.width * 0.86 };
  }
  function scaleToFit(pack, box) {
    const sz = pack.userData.size;
    return Math.min(pxToWorld(box.h) / sz.height, pxToWorld(box.w) / Math.max(sz.width, 0.01));
  }
  let theme = null;
  function setTheme(t) {
    if (theme === t) return; theme = t;
    story.style.setProperty('--sbg', t.bg || '#f6f0e0');
    story.style.setProperty('--accent', t.accent || '#b46645');
    if (t.soft) story.style.setProperty('--soft', t.soft);
  }

  let mouseX = 0, lastMouseX = 0;
  let last = performance.now(), raf = 0, inView = false, first = true;
  window.addEventListener('pointermove', e => {
    if (!inView) return;
    mouseX = e.clientX / vw - 0.5; hang.nudge((mouseX - lastMouseX) * 5); lastMouseX = mouseX;
  }, { passive: true });

  function frame(now) {
    raf = 0;
    if (!inView || document.hidden) return;
    raf = requestAnimationFrame(frame);
    const dt = (now - last) / 1000; last = now;
    /* the canvas is fixed to the screen: only paint inside the story */
    const sr = story.getBoundingClientRect();
    canvas.style.clipPath = `inset(${Math.max(0, sr.top).toFixed(0)}px 0 ${Math.max(0, vh - sr.bottom).toFixed(0)}px 0)`;

    const mid = vh * 0.5, band = vh * (vw < 900 ? 0.22 : 0.28);
    const rects = secs.map(s => s.sec.getBoundingClientRect());
    let k = 0; for (let i = 0; i < secs.length; i++) if (rects[i].top <= mid) k = i;
    let a = k, b = k, t = 0;
    if (k > 0 && mid - rects[k].top < band) { a = k - 1; b = k; t = 0.5 + (mid - rects[k].top) / (2 * band); }
    else if (k < secs.length - 1 && rects[k].bottom - mid < band) { a = k; b = k + 1; t = (mid - (rects[k].bottom - band)) / (2 * band); }
    t = smooth(Math.min(1, Math.max(0, t)));
    setTheme(secs[t < 0.5 ? a : b].theme);

    const A = secs[a], B = secs[b];
    const boxA = fitFor(A, A.st.getBoundingClientRect()), boxB = fitFor(B, B.st.getBoundingClientRect());
    const swap = A.product !== B.product;
    const show = swap ? (t < 0.5 ? A.product : B.product) : A.product;
    packs.forEach((p, i) => { p.visible = i === show; });
    const pack = packs[show];

    const cx = THREE.MathUtils.lerp(boxA.cx, boxB.cx, t), cy = THREE.MathUtils.lerp(boxA.cy, boxB.cy, t);
    const sc = THREE.MathUtils.lerp(scaleToFit(packs[A.product], boxA), scaleToFit(packs[B.product], boxB), t);
    let w = toWorld(cx, cy);
    // spin between stages; the swap happens edge-on so it's seamless
    let ry = swap ? (t < 0.5 ? t * Math.PI : (t - 1) * Math.PI) : (a !== b ? t * Math.PI * 2 : 0);
    ry += Math.sin(now / 1600) * 0.28 + mouseX * 0.4;
    let rz = 0;

    // hanging tag (hero)
    const hangAmt = A.mode === 'hang' ? 1 - t : 0;
    if (hangAmt > 0) {
      const r = A.st.getBoundingClientRect();
      // string + product always fit inside the hero stage
      const anchor = toWorld(r.left + r.width / 2, Math.max(r.top + 2, -vh));
      const hp = hang.update(dt, anchor, pack.userData.size.height * sc / 2, hangAmt, false, pxToWorld(r.height * 0.24));
      w = { x: THREE.MathUtils.lerp(w.x, hp.x, hangAmt), y: THREE.MathUtils.lerp(w.y, hp.y, hangAmt) };
      rz = hp.rz * hangAmt;
    } else hang.update(dt, { x: 0, y: 99 }, 0, 0, true);

    // bag: follows its stage, product drops in from above
    const bagSec = secs[secs.length - 1];
    const br = bagSec.st.getBoundingClientRect();
    bag.visible = br.bottom > -50 && br.top < vh + 50;
    if (bag.visible) {
      const bs = scaleToFit(bag, { h: br.height * 0.62, w: br.width * 0.75 });
      const bw = toWorld(br.left + br.width / 2, br.bottom - br.height * 0.62 / 2 - br.height * 0.08);
      bag.scale.setScalar(bs); bag.position.set(bw.x, bw.y, 0);
      bag.rotation.set(0.08, -0.35 + Math.sin(now / 2200) * 0.08, 0);
    }
    const inBag = (B.mode === 'bag' ? t : 0) + (A.mode === 'bag' ? 1 : 0);

    // while travelling between stages the product spins away small and faint,
    // so it never sits on top of the text it passes
    // (on the way into the bag too: on a phone the bag sits below its words, so the
    // product has to pass them; it only grows back as it reaches the bag)
    const travel = a !== b ? Math.sin(Math.PI * t) : 0;
    const dip = A.mode === 'bag' ? 0 : travel;
    pack.position.set(w.x, w.y, inBag > 0.5 ? -0.05 : 0.6);
    pack.rotation.set(0.06, ry * (1 - inBag * 0.85), rz);
    pack.scale.setScalar(sc * (1 - 0.7 * dip));
    pack.userData.setOpacity(1 - 0.92 * Math.pow(dip, 1.5));
    if (pack.userData.shadow) pack.userData.shadow.visible = hangAmt < 0.2 && inBag < 0.5;

    renderer.render(scene, camera);
    if (first) { first = false; story.classList.add('is-3d'); }
  }
  function wake() { if (!raf && inView && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  window.addEventListener('resize', () => { resize(); wake(); });
  new IntersectionObserver(e => {
    inView = e[0].isIntersecting;
    canvas.style.visibility = inView ? 'visible' : 'hidden';
    if (inView) wake();
  }).observe(story);
  document.addEventListener('visibilitychange', wake);
  if (/[?&]debug\b/.test(location.search)) window.__nexStory = { secs, packs, bag, renderer, frame: () => { inView = true; frame(performance.now()); } };
  return { packs };
}
