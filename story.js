/* =========================================================
   NexEra Skin scroll story (after the cover), in real product photos.
   1. The cleanser hangs on a swinging tag (your pointer gives it a push).
   2. The string lets go; the four products fall through the giant NEXERA.
   3. One section per step: the product spins in as the colours change to its brand.
   4. The products drop into a NexEra bag.
   Stock products only (products.js FEATURED). Only runs without reduced motion;
   otherwise the still photos in the page stay.
   ========================================================= */
import * as THREE from 'three';
import { createProduct, createHangTag, cutOut } from './product-image-3d.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const DATA = window.NEXERA_SKIN;
const PHONE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const LAYERS = PHONE ? 8 : 16;
const DEFAULT_THEME = { bg: '#f6f0e0', accent: '#b46645', ingredient: '#f2ca99' };
const TAU = Math.PI * 2;
const clamp01 = t => Math.min(1, Math.max(0, t));
const lerp = THREE.MathUtils.lerp;
const easeIn = t => t * t;

export async function start(story) {
  const canvas = story.querySelector('.story__gl');
  const panels = Array.from(story.querySelectorAll('.story__panel'));
  const productPanels = panels.filter(p => p.classList.contains('story__product'));
  const PRODUCTS = DATA.FEATURED.map(p => Object.assign({}, p, DATA.THEME[p.brand] || DEFAULT_THEME));
  if (!PRODUCTS.length) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x886677, 1.6));
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); sunLight.position.set(3, 5, 6); scene.add(sunLight);

  /* every featured product from its photo; tall bottles and wide jars keep their proportions */
  async function make(p, h, w, layers) {
    const c = await cutOut(p.img);
    return createProduct(p.img, { height: Math.min(h, w / (c.width / c.height)), layers, renderer });
  }
  const models = await Promise.all(PRODUCTS.map(p => make(p, 2.8, 2.5, LAYERS)));
  const fallers = await Promise.all(PRODUCTS.map(p => make(p, 2.2, 2.0, PHONE ? 4 : 8)));

  /* the holder is what scroll moves; the product inside it changes per section */
  const holderObj = new THREE.Group(); scene.add(holderObj);
  const tag = createHangTag(models[0], { length: PHONE ? 4.4 : 3.4, startAngle: PHONE ? 0.18 : 0.28, damping: 0.55 });
  holderObj.add(tag.root);
  models.slice(1).forEach(m => { m.visible = false; holderObj.add(m); });
  let active = 0;
  function show(i) {
    if (i === active) return;
    models[active].visible = false;
    models[i].visible = true; active = i;
  }
  const hangOffset = models[0].position.y;
  fallers.forEach(f => { f.visible = false; scene.add(f); });

  /* floating ingredient bubbles (decoration) */
  const ING = PHONE ? 9 : 14;
  const ingMat = new THREE.MeshPhysicalMaterial({ roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0, depthWrite: false });
  const ing = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 28, 18), ingMat, ING);
  const ingData = Array.from({ length: ING }, () => ({ fx: (Math.random() - 0.5) * 0.95, fy: (Math.random() - 0.5) * 0.9, z: -2.5 + Math.random() * 2, s: 0.4 + Math.random() * 0.9, sp: 0.4 + Math.random() * 0.8, ph: Math.random() * 6.28 }));
  scene.add(ing);

  /* the NexEra bag (a prop, not a product), open at the top */
  function makeBag() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 600;
    const g = c.getContext('2d');
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    function paint() {
      g.fillStyle = '#2a150f'; g.fillRect(0, 0, 512, 600);
      g.fillStyle = '#f6f0e0'; g.textAlign = 'center'; g.font = '700 74px Sora, "Segoe UI", sans-serif';
      g.fillText('NEXERA', 256, 330);
      const grd = g.createLinearGradient(220, 380, 292, 452); grd.addColorStop(0, '#d9ab41'); grd.addColorStop(0.5, '#b46645'); grd.addColorStop(1, '#8a4630');
      g.fillStyle = grd; g.beginPath(); g.arc(256, 410, 15, 0, TAU); g.fill();
      g.fillStyle = 'rgba(246, 240, 224,.6)'; g.font = '500 26px "DM Sans", sans-serif'; g.fillText('Shop smarter. Live better.', 256, 500);
      t.needsUpdate = true;
    }
    paint();
    const plain = new THREE.MeshStandardMaterial({ color: '#2a150f', roughness: 0.65, side: THREE.DoubleSide });
    const inside = new THREE.MeshStandardMaterial({ color: '#4a2619', roughness: 0.8, side: THREE.DoubleSide });
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    const open = new THREE.MeshBasicMaterial({ visible: false });
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.8), [plain, plain, open, inside, face, plain]);
    grp.add(box);
    const hm = new THREE.MeshStandardMaterial({ color: '#d8c7b0', roughness: 0.8 });
    [-0.25, 0.25].forEach(z => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 10, 32, Math.PI), hm); h.position.set(0, 1.1, z); grp.add(h); });
    grp.userData.paint = paint;
    return grp;
  }
  const bag = makeBag(); bag.visible = false; scene.add(bag);
  if (document.fonts) document.fonts.ready.then(() => bag.userData.paint());

  /* ----- layout: where the post card's photo frame sits, so the product lands in it ----- */
  const L = { viewW: 10, viewH: 6, mob: 1, heroFx: 0.22, heroY: -0.35, fx: -0.24, y: 0, fit: [1, 1, 1, 1], bagFx: 0.22, bagY: -0.9 };
  function measure() {
    const W = window.innerWidth, H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    L.viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    L.viewW = L.viewH * camera.aspect;
    const narrow = W < 760;
    L.mob = narrow ? 0.7 : 1;
    L.heroFx = narrow ? 0.16 : 0.22; L.heroY = narrow ? -0.75 : -0.35;
    L.bagFx = narrow ? 0.12 : 0.22; L.bagY = narrow ? -2.05 : -0.9;
    const panel = productPanels[0], media = panel && panel.querySelector('.story__media');
    if (media) {
      const pr = panel.getBoundingClientRect(), mr = media.getBoundingClientRect();
      const top = pr.height > H * 1.02 ? H / 2 - (mr.top - pr.top) - mr.height / 2 : (H - pr.height) / 2;
      const cx = mr.left + mr.width / 2, cy = top + (mr.top - pr.top) + mr.height / 2;
      L.fx = cx / W - 0.5; L.y = -(cy / H - 0.5) * L.viewH;
      const px = L.viewH / H, bh = mr.height * 0.82 * px, bw = mr.width * 0.8 * px;
      L.fit = models.map(m => Math.min(bh / m.userData.height, bw / m.userData.width));
    }
  }
  measure();

  let raf = 0, inView = false, first = true;

  /* ----- scroll choreography (one unit = one screen of scrolling) ----- */
  const S = { fx: L.heroFx, y: L.heroY, ry: 0, rz: 0, scale: 1, fit: 0, hang: 1, fall: 0, fallVis: 0, ing: 0, bag: 0, drop: 0 };
  const N = panels.length, bagAt = N - 2;
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut', duration: 1 },
    scrollTrigger: { trigger: story, start: 'top top', end: 'bottom bottom', scrub: 1.2, invalidateOnRefresh: true, refreshPriority: 5 }
  });
  /* hero to word: the string lets go, the product slides to the middle, the others fall through the letters */
  tl.to(S, { hang: 0, duration: 0.35 }, 0);
  tl.fromTo(S, { fx: () => L.heroFx, y: () => L.heroY, rz: 0, scale: 1 }, { fx: 0, y: -0.1, rz: 0.15, scale: 1.15, immediateRender: false }, 0);
  tl.to(S, { fallVis: 1, duration: 0.2 }, 0.4);
  tl.fromTo(S, { fall: 0 }, { fall: 1, ease: 'none', duration: 1.4, immediateRender: false }, 0.4);
  tl.to(S, { fallVis: 0, duration: 0.2 }, 1.6);
  /* word to the first product: it spins into the post card's photo frame */
  tl.to(S, { fx: () => L.fx, y: () => L.y, rz: -0.08, scale: 1, fit: 1, ry: TAU }, 1);
  tl.to(S, { ing: 1, duration: 0.5 }, 1.5);
  for (let i = 1; i < PRODUCTS.length; i++) tl.to(S, { ry: TAU * (i + 1), rz: i % 2 ? 0.08 : -0.08 }, 1 + i);
  /* last product to the bag: the bag rises, then everything drops in */
  tl.to(S, { ing: 0, duration: 0.4 }, bagAt);
  tl.to(S, { bag: 1, duration: 0.55 }, bagAt);
  tl.to(S, { fx: () => L.bagFx, y: () => L.bagY + 2.6, rz: 0, scale: 0.5, fit: 0, ry: TAU * (PRODUCTS.length + 1), duration: 0.55 }, bagAt);
  tl.to(S, { drop: 1, duration: 0.45, ease: 'none' }, bagAt + 0.55);

  function applyTheme(t) {
    story.style.setProperty('--sbg', t.bg);
    story.style.setProperty('--accent', t.accent);
    ingMat.color.set(t.ingredient);
    ingMat.emissive.set(t.ingredient).multiplyScalar(0.45);
    wake();
  }
  panels.forEach((sec, si) => ScrollTrigger.create({
    trigger: sec, start: 'top center', end: 'bottom center', refreshPriority: 5,
    onToggle: self => {
      if (!self.isActive) return;
      const i = sec.dataset.i;
      if (i === undefined) { applyTheme(DEFAULT_THEME); if (si === 0) show(0); return; }
      applyTheme(PRODUCTS[+i]); show(+i);
    }
  }));
  applyTheme(DEFAULT_THEME);

  /* pointer: tilt the product and give the hanging tag a push */
  const mouse = { x: 0, y: 0, px: 0 };
  window.addEventListener('pointermove', e => {
    if (!inView) return;
    const nx = e.clientX / window.innerWidth - 0.5;
    if (S.hang > 0.5) tag.nudge((nx - mouse.px) * 6);
    mouse.px = nx; mouse.x = nx; mouse.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  /* ----- the loop: runs only while the story is on screen ----- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), eu = new THREE.Euler();
  const clock = new THREE.Clock();
  function frame() {
    raf = 0;
    if (!inView || document.hidden) return;
    raf = requestAnimationFrame(frame);
    const dt = clock.getDelta(), t = clock.elapsedTime;
    /* only paint inside the story (the canvas is fixed to the screen) */
    const r = story.getBoundingClientRect(), H = window.innerHeight;
    canvas.style.clipPath = `inset(${Math.max(0, r.top).toFixed(0)}px 0 ${Math.max(0, H - r.bottom).toFixed(0)}px 0)`;

    const mob = L.mob;
    const bob = Math.sin(t * 1.2) * 0.05 * (1 - S.hang);
    tag.setAmount(S.hang);
    tag.update(dt);
    models[0].position.y = hangOffset * S.hang;

    const fitK = lerp(mob, L.fit[active] || mob, S.fit);
    const k = S.scale * fitK;
    /* the product stays where it is while the string lets go (the pivot moves instead) */
    let y = S.y - hangOffset * S.hang * k + bob, z = 0;
    let dropK = 0;
    if (S.drop > 0) { dropK = clamp01((S.drop - 0.55) / 0.45); y = lerp(S.y, L.bagY + 0.85 * mob, easeIn(dropK)); z = lerp(0, -0.6, dropK); }
    holderObj.position.set(S.fx * L.viewW, y, z);
    holderObj.scale.setScalar(k);
    const cur = models[active];
    const ry = S.ry + mouse.x * 0.5;
    if (cur === models[0]) {
      /* blend from the tag's swing (hanging) to scroll control (let go) */
      cur.rotation.set(mouse.y * 0.2 * (1 - S.hang), lerp(ry, cur.rotation.y, S.hang), S.rz * (1 - S.hang));
    } else {
      cur.rotation.set(mouse.y * 0.2, ry, S.rz);
    }
    cur.userData.updateSheen();

    /* products falling through the giant word, and later into the bag */
    const bagX = L.bagFx * L.viewW;
    fallers.forEach((f, i) => {
      if (S.drop > 0 && i < PRODUCTS.length - 1) {
        const kk = clamp01((S.drop - i * 0.16) / 0.5);
        f.visible = kk > 0;
        if (!f.visible) return;
        f.position.set(bagX + (i - 1) * 0.45 * mob, lerp(L.bagY + 3.6, L.bagY + 0.75 * mob, easeIn(kk)), -0.6);
        f.rotation.set(0, (1 - kk) * 2.2 + (i - 1) * 0.25, (i - 1) * 0.12);
        f.scale.setScalar(0.5 * mob * Math.min(1, 1.9 / f.userData.width));
        f.userData.updateSheen();
        return;
      }
      f.visible = S.fallVis > 0.01;
      if (!f.visible) return;
      const lane = (i + 0.5) / fallers.length - 0.5;
      f.position.set(lane * L.viewW * 0.7, L.viewH * (0.9 - S.fall * 1.9) - i * 0.9, -0.5 - (i % 2));
      f.rotation.set(0, t * 0.3 + i, (i % 2 ? 0.35 : -0.35) + S.fall * (i % 2 ? 1 : -1));
      f.scale.setScalar(mob);
      f.userData.updateSheen();
    });

    bag.visible = S.bag > 0.01;
    bag.position.set(bagX, lerp(-L.viewH, L.bagY, S.bag), -0.6);
    bag.rotation.y = -0.35 * (1 - dropK * 0.5) + mouse.x * 0.2;
    bag.scale.setScalar(mob);

    ing.visible = S.ing > 0.01;
    ingMat.opacity = S.ing * 0.55;
    if (ing.visible) {
      ingData.forEach((d, i) => {
        v.set(d.fx * L.viewW, d.fy * L.viewH + Math.sin(t * d.sp + d.ph) * 0.25, d.z);
        q.setFromEuler(eu.set(t * d.sp * 0.3, t * d.sp * 0.2, 0));
        sc.setScalar(d.s * S.ing * mob);
        ing.setMatrixAt(i, m4.compose(v, q, sc));
      });
      ing.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
    if (first) { first = false; story.classList.add('is-3d'); }
  }
  function wake() { if (!raf && inView && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(e => { inView = e[0].isIntersecting; canvas.style.visibility = inView ? 'visible' : 'hidden'; if (inView) wake(); }, { rootMargin: '0px' }).observe(story);
  document.addEventListener('visibilitychange', wake);
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); wake(); }, 120); });
  ScrollTrigger.addEventListener('refreshInit', measure);
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  if (/[?&]debug\b/.test(location.search)) window.__nexStory = { S, tl, L, renderer, layers: LAYERS, frame: () => { inView = true; frame(); } };
  return { state: S };
}
