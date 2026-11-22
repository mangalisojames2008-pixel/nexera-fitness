/* =========================================================
   NexEra Skin cover: "Your routine, in four steps", in 3D.
   A drop (the dot from the NexEra logo) falls, the four featured products
   (solid packs made from the real product photos, stock only, in their real
   relative sizes) rise one by one and each does a small move,
   the sun rises, and NEXERA grows out of it.
   ========================================================= */
import { THREE, makeRenderer, makeScene, makeShadow, packProduct, packOf, tint } from './studio.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.min(1, Math.max(0, t));
const ease = t => 1 - Math.pow(1 - t, 3);

const DATA = window.NEXERA_SKIN;
/* Colours: golden hour in terracotta, nude, cream and gold. */
const C = {
  fogNight: '#3a1d15', fogDawn: '#e3ad82', floorTint: '#ffd2ad', floorMetal: 0.12,
  floor: [[0, '#8a5038'], [0.4, '#61341f'], [1, '#3a1e13']],
  sun: [[0, '#fff6dc'], [0.35, '#f6d47a'], [0.7, '#d9ab41'], [1, '#b46645']],
  glow: [[0, 'rgba(246,212,122,0.9)'], [0.35, 'rgba(242,202,153,0.4)'], [1, 'rgba(180,102,69,0)']],
  ripple: '#f2ca99', drip: '#d9ab41', dripGlow: '#f2b45a',
  rim: [0.78, 0.6, 0.52, 0.42], night: [0.55, 0.46, 0.42]
};
const STEP = {}; DATA.STEPS.forEach(s => { STEP[s.id] = s; });
/* one featured product per step, in routine order */
const SPECS = DATA.FEATURED.map(p => ({ p, n: STEP[p.step].n, name: STEP[p.step].name }));

function gradientTexture(stops, radial) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = radial ? g.createRadialGradient(128, 128, 0, 128, 128, 128) : g.createLinearGradient(0, 0, 256, 256);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function start(hero, opts = {}) {
  const canvas = $('.hero__canvas', hero);
  const renderer = makeRenderer(canvas);
  const small = matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  const { scene, key, rim } = makeScene(renderer);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const shared = opts.state || {};
  const poster = /[?&]poster\b/.test(location.search);
  /* decide now: play the intro, or (if the still picture is already showing) keep the finished frame */
  const autoplay = poster ? false : (opts.canAutoplay ? opts.canAutoplay() : true);
  if (opts.onReady) opts.onReady();

  await Promise.race([document.fonts ? document.fonts.ready : null, new Promise(r => setTimeout(r, 1500))]);

  /* ----- the stage ----- */
  const fogNight = new THREE.Color(C.fogNight), fogDawn = new THREE.Color(C.fogDawn);
  scene.fog = new THREE.Fog(fogNight.clone(), 14, 40);
  const floorTex = gradientTexture(C.floor, true);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(34, 72), new THREE.MeshStandardMaterial({ color: C.floorTint, map: floorTex, roughness: 0.32, metalness: C.floorMetal, envMapIntensity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  const dawnTex = gradientTexture(C.sun);
  const glowTex = gradientTexture(C.glow, true);
  const sun = new THREE.Group();
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: dawnTex, fog: false, toneMapped: false, transparent: true }));
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, transparent: true }));
  sunGlow.scale.set(5, 5, 1);
  sun.add(sunGlow, sunDisc); scene.add(sun);

  const drop = new THREE.Group();
  const dropBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), new THREE.MeshBasicMaterial({ map: dawnTex, toneMapped: false }));
  const dropGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  dropGlow.scale.set(2.2, 2.2, 1); drop.add(dropGlow, dropBall); scene.add(drop);

  const ringMat = () => new THREE.MeshBasicMaterial({ color: C.ripple, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ripples = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 72), ringMat()); m.rotation.x = -Math.PI / 2; m.position.y = 0.01; scene.add(m); return m; });

  /* real relative sizes: the tallest pack is 4.3 units, the others follow their size in mm */
  const tallest = Math.max(...SPECS.map(spec => (packOf(spec.p).dims || { h: 150 }).h));
  const stands = await Promise.all(SPECS.map(spec => packProduct(spec.p, { mmScale: 4.3 / tallest, height: 3 })));
  const items = SPECS.map((spec, i) => {
    const stand = stands[i], prod = stand.userData.product;
    const holder = new THREE.Group(); holder.add(stand); scene.add(holder);
    const shadow = makeShadow(Math.max(stand.userData.width, stand.userData.depth) * 0.62 + 0.25, 0.55); scene.add(shadow);
    return { spec, stand, prod, holder, shadow, h: stand.userData.height, base: new THREE.Vector3(), scale: 1, rest: 0 };
  });
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1, transmission: 0 });
  const bubbles = [0, 1, 2, 3].map(i => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 + i * 0.025, 20, 20), bubbleMat); b.visible = false; scene.add(b); return b; });
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), new THREE.MeshPhysicalMaterial({ color: C.drip, emissive: C.dripGlow, emissiveIntensity: 0.3, roughness: 0.1, clearcoat: 1 }));
  drip.visible = false; scene.add(drip);

  /* ----- layout for phones (portrait) and wider screens ----- */
  const g = { W: 1, H: 1, portrait: false, target: new THREE.Vector3(), d: 20 };
  const LAYOUT = {
    wide: { x: [-3.75, -1.3, 1.25, 3.7], z: [0.2, -0.35, -0.35, 0.2], s: [1, 1, 1, 1], rest: [0.3, 0.12, -0.12, -0.3], screenY: 0.665, fill: 0.31 },
    tall: { x: [-2.25, -0.78, 0.75, 2.25], z: [0.25, -0.2, -0.25, 0.25], s: [0.6, 0.6, 0.6, 0.6], rest: [0.3, 0.12, -0.12, -0.3], screenY: 0.61, fill: 0.2 }
  };
  const stepEls = $$('.hero__step', hero);
  function layout() {
    g.W = hero.clientWidth; g.H = hero.clientHeight; g.portrait = g.W / g.H < 0.8;
    renderer.setSize(g.W, g.H, false);
    cam.aspect = g.W / g.H;
    const L = g.portrait ? LAYOUT.tall : LAYOUT.wide;
    items.forEach((it, i) => { it.base.set(L.x[i], 0, L.z[i]); it.scale = L.s[i]; it.rest = L.rest[i]; it.holder.scale.setScalar(it.scale); });
    const rowW = (g.portrait ? 6.0 : 9.2), prodH = 4.4 * (g.portrait ? 0.64 : 1);
    const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dH = prodH / L.fill / (2 * vt), dW = rowW * 1.12 / (2 * vt * cam.aspect);
    g.d = Math.max(dH, dW);
    g.target.set(0, prodH * 0.42, 0);
    cam.position.set(0, g.target.y + g.d * 0.2, g.d);
    cam.lookAt(g.target);
    cam.clearViewOffset(); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const p = g.target.clone().project(cam);
    const want = L.screenY, now = (1 - p.y) / 2;
    cam.setViewOffset(g.W, g.H, 0, (now - want) * g.H, g.W, g.H);
    cam.updateProjectionMatrix();
    /* where the floor meets the sky, for the CSS sky behind the canvas */
    scene.fog.near = g.d * 0.85; scene.fog.far = g.d + 26;
    const h = new THREE.Vector3(0, 0, -34).project(cam);
    hero.style.setProperty('--hz', clamp01((1 - h.y) / 2).toFixed(3));
    /* the sun sits just above the products, between them */
    g.sunEnd = worldAt(0.5, g.portrait ? 0.43 : 0.47, -24);
    g.sunStart = new THREE.Vector3(g.sunEnd.x, -6, -24);
    g.sunR = g.portrait ? 2.6 : 3.4;
  }
  function worldAt(sx, sy, z) {
    const ndc = new THREE.Vector3(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(cam);
    const dir = ndc.sub(cam.position).normalize();
    const t = (z - cam.position.z) / dir.z;
    return cam.position.clone().add(dir.multiplyScalar(t)).setX(0);
  }
  function toScreen(v) { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * g.W, y: (1 - p.y) / 2 * g.H }; }

  /* ----- state the timeline animates ----- */
  const S = { fall: 0, land: 0, rise: [0, 0, 0, 0], label: [0, 0, 0, 0], press: 0, bubbles: 0, lift: 0, dripT: 0, lid: 0, hop: 0, sun: 0, warm: 0, settle: 0, flood: 0, exit: 0, ripple: [0, 0, 0, 0, 0] };
  let t0 = performance.now(), mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function draw(now) {
    const t = (now - t0) / 1000;
    const idle = S.settle;
    mouse.x = lerp(mouse.x, mouse.tx, 0.05); mouse.y = lerp(mouse.y, mouse.ty, 0.05);

    /* light warms as the sun rises */
    skyDawn.style.opacity = S.warm.toFixed(3);
    scene.fog.color.copy(fogNight).lerp(fogDawn, S.warm * 0.85);
    rim.intensity = 1.2 + S.warm * 1.6; rim.color.setRGB(1, lerp(C.rim[0], C.rim[1], S.warm), lerp(C.rim[2], C.rim[3], S.warm));
    key.intensity = 1.3 + S.warm * 0.4;
    /* the photos are dim and blue at night and take on the morning light */
    const w = S.warm;
    items.forEach(it => tint(it.stand, lerp(C.night[0], 1, w), lerp(C.night[1], 0.985, w), lerp(C.night[2], 0.955, w)));

    /* the drop */
    drop.visible = S.fall > 0 && S.land < 1;
    if (drop.visible) {
      drop.position.set(0, lerp(9, 0.3, S.fall * S.fall), 0.6);
      const sq = S.land; drop.scale.set(1 + sq * 1.4, Math.max(0.02, 1 - sq * 0.97), 1 + sq * 1.4);
      dropGlow.material.opacity = 1 - sq;
    }
    /* ripples: 0 is the drop, 1 to 4 are the products */
    ripples.forEach((r, i) => {
      const k = S.ripple[i], pos = i === 0 ? new THREE.Vector3(0, 0, 0.6) : items[i - 1].base;
      r.position.set(pos.x, 0.012, pos.z);
      r.scale.setScalar(0.2 + k * (i === 0 ? 7 : 2.6));
      r.material.opacity = k > 0 && k < 1 ? (1 - k) * 0.9 : 0;
    });

    /* the products */
    items.forEach((it, i) => {
      const r = S.rise[i], e = ease(r);
      const spread = 1 + S.exit * 0.5;
      const bob = idle * Math.sin(t * 1.3 + i * 1.7) * 0.07;
      it.holder.position.set(it.base.x * spread, lerp(-6, 0, e) + bob + S.exit * (3 + i * 0.6), it.base.z);
      it.holder.scale.setScalar(it.scale);
      it.prod.rotation.set(0, lerp(-2.2, it.rest, e) + idle * Math.sin(t * 0.5 + i) * 0.12 + S.exit * (i % 2 ? 0.8 : -0.8), 0);
      it.holder.visible = r > 0.001;
      it.shadow.position.set(it.base.x * spread, 0.006, it.base.z);
      it.shadow.material.opacity = 0.55 * e * (1 - S.exit);
      it.shadow.scale.setScalar(it.scale * (1 - Math.min(0.4, bob * 2)));
    });
    /* 01 cleanse: the bottle gives a squeeze and foam bubbles float up from the top */
    const cl = items[0], sq = Math.sin(Math.PI * S.press);
    cl.stand.scale.set(1 + sq * 0.05, 1 - sq * 0.08, 1 + sq * 0.05);
    const top = new THREE.Vector3(cl.holder.position.x + 0.25 * cl.scale, cl.holder.position.y + cl.h * cl.scale + 0.05, cl.holder.position.z);
    bubbles.forEach((b, i) => {
      const k = clamp01(S.bubbles * 1.6 - i * 0.18);
      b.visible = k > 0 && k < 1;
      b.position.set(top.x + Math.sin(k * 6 + i) * 0.18 + i * 0.08, top.y + k * (1.6 + i * 0.3), top.z);
      b.scale.setScalar((0.6 + k * 0.8) * cl.scale);
    });
    /* 02 treat: the serum lifts and tips, and a drop falls to the floor */
    const tr = items[1];
    tr.holder.position.y += S.lift * 0.9 * tr.scale;
    tr.prod.rotation.z = -S.lift * 0.22;
    if (S.dripT > 0 && S.dripT < 1) {
      drip.visible = true;
      const fall = S.dripT * S.dripT, from = tr.holder.position.y + 0.1;
      drip.position.set(tr.holder.position.x + 0.15 * tr.scale, lerp(from, 0.08, fall), tr.holder.position.z + 0.3);
      drip.scale.setScalar(tr.scale * (S.dripT < 0.12 ? S.dripT / 0.12 : 1));
    } else drip.visible = false;
    /* 03 moisturise: the jar lifts and turns a full circle */
    const mo = items[2], lk = Math.min(1, S.lid);
    mo.holder.position.y += Math.sin(lk * Math.PI / 2) * 0.55 * mo.scale * (S.lid > 1 ? 2 - S.lid : 1);
    mo.prod.rotation.y += (S.lid / 2) * Math.PI * 2;
    /* 04 protect: the sunscreen hops and spins as the sun comes up */
    const tb = items[3];
    tb.holder.position.y += Math.sin(Math.PI * S.hop) * 0.9;
    tb.prod.rotation.y += S.hop * Math.PI * 2;

    /* the sun */
    sun.position.lerpVectors(g.sunStart, g.sunEnd, ease(S.sun));
    sun.scale.setScalar(g.sunR * (0.75 + 0.25 * S.sun));
    sun.visible = S.sun > 0.001;
    sunGlow.material.opacity = S.sun;
    sun.lookAt(cam.position);

    /* camera: a slow push in when the products settle, and a little parallax on a laptop */
    const push = 1 - S.settle * 0.06;
    cam.position.set(g.target.x + mouse.x * 0.8, g.target.y + g.d * 0.2 * push + mouse.y * 0.4, g.d * push);
    cam.lookAt(g.target.x + mouse.x * 0.3, g.target.y, 0);

    renderer.render(scene, cam);

    /* step labels under each product */
    items.forEach((it, i) => {
      const el = stepEls[i]; if (!el) return;
      const p = toScreen(new THREE.Vector3(it.holder.position.x, -0.2, it.base.z));
      el.style.transform = `translate(-50%, 0) translate(${p.x.toFixed(1)}px, ${(p.y + 10).toFixed(1)}px)`;
      el.style.opacity = (S.label[i] * (1 - S.exit)).toFixed(3);
    });

    /* the paper flood that carries you into the page */
    if (S.flood > 0.001) {
      const sp = toScreen(sun.position);
      const big = Math.hypot(Math.max(sp.x, g.W - sp.x), Math.max(sp.y, g.H - sp.y));
      flood.style.transform = `translate3d(${(sp.x - 50).toFixed(1)}px,${(sp.y - 50).toFixed(1)}px,0) scale(${(S.flood * big / 41).toFixed(3)})`;
    } else flood.style.transform = 'scale(0)';
    shared.flood = S.flood;
  }

  const flood = $('.flood', hero), skyDawn = $('.sky--dawn', hero);
  /* the loop draws while something moves, then rests to save battery */
  let running = false, raf = 0, visible = true, firstFrame = true, awakeUntil = 0;
  function frame(now) {
    raf = 0;
    draw(now);
    if (firstFrame) { firstFrame = false; hero.classList.add('is-3d'); }
    const busy = (tl && tl.isActive()) || now < awakeUntil;
    if (running && busy) raf = requestAnimationFrame(frame); else running = false;
  }
  function wake(ms) { awakeUntil = Math.max(awakeUntil, performance.now() + (ms || 2500)); startLoop(); }
  function startLoop() { if (!running && visible) { running = true; raf = requestAnimationFrame(frame); } }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  layout();
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); wake(600); }, 120); });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', e => { mouse.tx = (e.clientX / window.innerWidth - 0.5) * S.settle; mouse.ty = -(e.clientY / window.innerHeight - 0.5) * S.settle; if (window.scrollY < window.innerHeight) wake(1800); }, { passive: true });
  }
  renderer.compile(scene, cam);

  /* ----- text and controls ----- */
  const els = {
    fade: $('.hero__fade', hero), ui: $('.hero__ui', hero), kicker: $('.hero__kicker', hero), kickerText: $('.hero__kicker-text', hero),
    wordWrap: $('.hero__word-wrap', hero), word: $('.word', hero), letters: $$('.word__l', hero), copy: $('.hero__copy', hero),
    ctas: $$('.hero__ctas .btn', hero), skip: $('.hero__skip', hero), skipLabel: $('.hero__skip-label', hero), scroll: $('.hero__scroll', hero), nav: $('#nav')
  };
  let tl = null, ended = false;

  function finalState() {
    S.fall = 1; S.land = 1; S.rise = [1, 1, 1, 1]; S.label = [1, 1, 1, 1]; S.press = 0; S.bubbles = 0; S.lift = 0; S.dripT = 0; S.lid = 0; S.hop = 0;
    S.sun = 1; S.warm = 1; S.settle = 1; S.ripple = [0, 0, 0, 0, 0];
  }
  function kicker(text) { if (els.kickerText.textContent !== text) els.kickerText.textContent = text; }

  function onEnd() {
    if (ended) return;
    ended = true;
    els.skipLabel.textContent = 'Replay';
    els.skip.classList.add('is-replay');
    els.skip.setAttribute('aria-label', 'Replay the intro');
    kicker('Your routine, in four steps');
    wake(3500);
  }

  function build() {
    const wordFrom = axis => () => {
      const wr = els.wordWrap.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      const sp = toScreen(g.sunEnd);
      return axis === 'x' ? sp.x - (wr.left - hr.left + wr.width / 2) : sp.y - (wr.top - hr.top + wr.height / 2);
    };
    els.skip.hidden = false;
    tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    tl.to(els.fade, { opacity: 0, duration: 0.9, ease: 'power1.out' }, 0)
      .fromTo(els.nav, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.6, immediateRender: true }, 6.0)
      .fromTo(els.kicker, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3)
      .fromTo(els.skip, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.5)
      /* the drop falls and lands */
      .fromTo(S, { fall: 0, land: 0 }, { fall: 1, duration: 0.7, ease: 'power1.in' }, 0.2)
      .to(S, { land: 1, duration: 0.25, ease: 'power2.out' }, 0.9)
      .fromTo(S.ripple, { 0: 0 }, { 0: 1, duration: 1.4, ease: 'power2.out' }, 0.9);
    /* the four products, one after another */
    SPECS.forEach((spec, i) => {
      const at = 1.0 + i * 1.05;
      tl.fromTo(S.rise, { [i]: 0 }, { [i]: 1, duration: 0.95, ease: 'back.out(1.25)' }, at)
        .fromTo(S.ripple, { [i + 1]: 0 }, { [i + 1]: 1, duration: 1.1, ease: 'power2.out' }, at)
        .fromTo(S.label, { [i]: 0 }, { [i]: 1, duration: 0.5 }, at + 0.35)
        .call(() => kicker(spec.n + ' · ' + spec.name), null, at + 0.1);
    });
    tl.call(() => kicker('01 · Cleanse'), null, 1.1)
      .to(S, { press: 1, duration: 0.5, ease: 'power1.inOut' }, 1.55)
      .fromTo(S, { bubbles: 0 }, { bubbles: 1, duration: 1.6, ease: 'none' }, 1.7)
      .to(S, { lift: 1, duration: 0.45, ease: 'power2.out' }, 2.55)
      .fromTo(S, { dripT: 0 }, { dripT: 1, duration: 0.55, ease: 'power1.in' }, 3.0)
      .to(S, { lift: 0, duration: 0.4, ease: 'power2.in' }, 3.45)
      .to(S, { lid: 1, duration: 0.7, ease: 'power2.out' }, 3.45)
      .to(S, { lid: 2, duration: 0.55, ease: 'power2.in' }, 4.55)
      .to(S, { hop: 1, duration: 0.9, ease: 'power1.inOut' }, 4.55)
      .to(S, { sun: 1, duration: 1.8, ease: 'power2.out' }, 4.4)
      .to(S, { warm: 1, duration: 2, ease: 'power1.inOut' }, 4.2)
      .to(S, { settle: 1, duration: 1.4, ease: 'power2.inOut' }, 5.2)
      /* NEXERA grows out of the sun */
      .fromTo(els.word, { x: wordFrom('x'), y: wordFrom('y'), scale: 0.04, autoAlpha: 0 }, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 1.3, ease: 'expo.out', immediateRender: true }, 5.45)
      .fromTo(els.letters, { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 5.5)
      .fromTo(els.copy, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 6.15)
      .fromTo(els.ctas, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 6.3)
      .fromTo(els.scroll, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 6.6)
      .call(() => kicker('Your routine, in four steps'), null, 6.4)
      .call(onEnd, null, 7.0);
  }

  function replay() {
    if (!tl) build();
    ended = false;
    els.skipLabel.textContent = 'Skip intro';
    els.skip.classList.remove('is-replay');
    els.skip.removeAttribute('aria-label');
    t0 = performance.now();
    tl.timeScale(1).restart();
    wake(500);
    return true;
  }
  function hurry() { if (tl && !ended && tl.timeScale() < 4) tl.timeScale(5); }

  if (poster) {
    finalState();
    hero.classList.add('is-poster');
    els.fade.style.opacity = 0;
    frame(performance.now());
    window.__posterReady = true;
    return { replay: () => false };
  }

  if (!autoplay) {
    /* the 3D arrived after the still picture was already showing: keep the finished frame, offer Replay */
    finalState();
    ended = false; onEnd();
    els.skip.hidden = false;
    frame(performance.now());
  } else {
    build();
    tl.play(0);
  }
  wake(1500);
  if (/[?&]debug\b/.test(location.search)) window.__nexCover = { tl: () => tl, S, draw: () => frame(performance.now()) };
  startLoop();

  const vis = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) wake(1500); else stopLoop(); }, { rootMargin: '60px 0px' });
  vis.observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else if (visible) wake(1500); });

  els.skip.addEventListener('click', () => {
    if (!tl) { replay(); return; }
    if (!ended) { tl.timeScale(1).progress(1); onEnd(); return; }
    replay();
  });
  window.addEventListener('wheel', hurry, { passive: true });
  window.addEventListener('touchmove', hurry, { passive: true });
  window.addEventListener('keydown', e => { if (/^( |PageDown|ArrowDown|End|Spacebar)$/.test(e.key)) hurry(); });
  window.addEventListener('scroll', () => { if (window.scrollY > 8) hurry(); }, { passive: true });

  /* leaving the cover: the products float up and apart, the light floods into the page */
  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: '+=65%', pin: true, scrub: true, refreshPriority: 10 }, onUpdate: () => wake(400) })
    .to(els.ui, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 0)
    .to(els.wordWrap, { scale: 1.35, duration: 0.55, ease: 'power1.in' }, 0)
    .to(S, { exit: 1, duration: 0.8, ease: 'power1.in' }, 0)
    .to(S, { flood: 1, duration: 1, ease: 'power2.in' }, 0);
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  return { replay, state: S };
}
