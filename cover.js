/* =========================================================
   NexEra Skin cover, in 3D: a drop (the dot from the NexEra logo) falls,
   the sun rises, and NEXERA grows out of it.
   (The four products were taken off the cover at the owner's request,
   2026-11-22: they looked artificial. The scroll story keeps its 3D packs.)
   ========================================================= */
import { THREE, makeRenderer, makeScene } from './studio.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.min(1, Math.max(0, t));
const ease = t => 1 - Math.pow(1 - t, 3);

/* Colours: golden hour in terracotta, nude, cream and gold. */
const C = {
  fogNight: '#3a1d15', fogDawn: '#e3ad82', floorTint: '#ffd2ad', floorMetal: 0.12,
  floor: [[0, '#8a5038'], [0.4, '#61341f'], [1, '#3a1e13']],
  sun: [[0, '#fff6dc'], [0.35, '#f6d47a'], [0.7, '#d9ab41'], [1, '#b46645']],
  glow: [[0, 'rgba(246,212,122,0.9)'], [0.35, 'rgba(242,202,153,0.4)'], [1, 'rgba(180,102,69,0)']],
  ripple: '#f2ca99',
  rim: [0.78, 0.6, 0.52, 0.42]
};

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
  /* the glow sits just behind the disc, so the disc always covers it (no line across the sun) */
  sunGlow.position.z = -0.5;
  sun.add(sunGlow, sunDisc); scene.add(sun);

  const drop = new THREE.Group();
  const dropBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), new THREE.MeshBasicMaterial({ map: dawnTex, toneMapped: false }));
  const dropGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  dropGlow.scale.set(2.2, 2.2, 1); drop.add(dropGlow, dropBall); scene.add(drop);

  const ringMat = () => new THREE.MeshBasicMaterial({ color: C.ripple, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ripples = [0].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 72), ringMat()); m.rotation.x = -Math.PI / 2; m.position.y = 0.01; scene.add(m); return m; });

  /* ----- layout for phones (portrait) and wider screens ----- */
  const g = { W: 1, H: 1, portrait: false, target: new THREE.Vector3(), d: 20 };
  const LAYOUT = {
    wide: { x: [-3.75, -1.3, 1.25, 3.7], z: [0.2, -0.35, -0.35, 0.2], s: [1, 1, 1, 1], rest: [0.3, 0.12, -0.12, -0.3], screenY: 0.665, fill: 0.31 },
    tall: { x: [-2.25, -0.78, 0.75, 2.25], z: [0.25, -0.2, -0.25, 0.25], s: [0.6, 0.6, 0.6, 0.6], rest: [0.3, 0.12, -0.12, -0.3], screenY: 0.61, fill: 0.2 }
  };
  function layout() {
    g.W = hero.clientWidth; g.H = hero.clientHeight; g.portrait = g.W / g.H < 0.8;
    renderer.setSize(g.W, g.H, false);
    cam.aspect = g.W / g.H;
    const L = g.portrait ? LAYOUT.tall : LAYOUT.wide;
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
    g.sunEnd = worldAt(0.5, g.portrait ? 0.43 : 0.53, -24); /* wide screens: low enough to clear the word */
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
  const S = { fall: 0, land: 0, sun: 0, warm: 0, settle: 0, flood: 0, ripple: [0] };
  let t0 = performance.now();

  function draw(now) {
    /* light warms as the sun rises */
    skyDawn.style.opacity = S.warm.toFixed(3);
    scene.fog.color.copy(fogNight).lerp(fogDawn, S.warm * 0.85);
    rim.intensity = 1.2 + S.warm * 1.6; rim.color.setRGB(1, lerp(C.rim[0], C.rim[1], S.warm), lerp(C.rim[2], C.rim[3], S.warm));
    key.intensity = 1.3 + S.warm * 0.4;

    /* the drop */
    drop.visible = S.fall > 0 && S.land < 1;
    if (drop.visible) {
      drop.position.set(0, lerp(9, 0.3, S.fall * S.fall), 0.6);
      const sq = S.land; drop.scale.set(1 + sq * 1.4, Math.max(0.02, 1 - sq * 0.97), 1 + sq * 1.4);
      dropGlow.material.opacity = 1 - sq;
    }
    /* the drop's ripple */
    ripples.forEach((r, i) => {
      const k = S.ripple[i];
      r.position.set(0, 0.012, 0.6);
      r.scale.setScalar(0.2 + k * 7);
      r.material.opacity = k > 0 && k < 1 ? (1 - k) * 0.9 : 0;
    });

    /* the sun */
    sun.position.lerpVectors(g.sunStart, g.sunEnd, ease(S.sun));
    sun.scale.setScalar(g.sunR * (0.75 + 0.25 * S.sun));
    sun.visible = S.sun > 0.001;
    sunGlow.material.opacity = S.sun;
    sun.lookAt(cam.position);

    /* camera: a slow push in as the scene settles */
    const push = 1 - S.settle * 0.06;
    cam.position.set(g.target.x, g.target.y + g.d * 0.2 * push, g.d * push);
    cam.lookAt(g.target.x, g.target.y, 0);

    renderer.render(scene, cam);

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
  renderer.compile(scene, cam);

  /* ----- text and controls ----- */
  const els = {
    fade: $('.hero__fade', hero), ui: $('.hero__ui', hero), kicker: $('.hero__kicker', hero), kickerText: $('.hero__kicker-text', hero),
    wordWrap: $('.hero__word-wrap', hero), word: $('.word', hero), letters: $$('.word__l', hero), copy: $('.hero__copy', hero),
    ctas: $$('.hero__ctas .btn', hero), skip: $('.hero__skip', hero), skipLabel: $('.hero__skip-label', hero), scroll: $('.hero__scroll', hero), nav: $('#nav')
  };
  let tl = null, ended = false;

  function finalState() {
    S.fall = 1; S.land = 1; S.sun = 1; S.warm = 1; S.settle = 1; S.ripple = [0];
  }
  function kicker(text) { if (els.kickerText.textContent !== text) els.kickerText.textContent = text; }

  function onEnd() {
    if (ended) return;
    ended = true;
    els.skipLabel.textContent = 'Replay';
    els.skip.classList.add('is-replay');
    els.skip.setAttribute('aria-label', 'Replay the intro');
    kicker('Skincare store · South Africa');
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
      .fromTo(els.kicker, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3)
      .fromTo(els.skip, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.5)
      /* the drop falls and lands */
      .fromTo(S, { fall: 0, land: 0 }, { fall: 1, duration: 0.7, ease: 'power1.in' }, 0.2)
      .to(S, { land: 1, duration: 0.25, ease: 'power2.out' }, 0.9)
      .fromTo(S.ripple, { 0: 0 }, { 0: 1, duration: 1.4, ease: 'power2.out' }, 0.9);
    tl.to(S, { sun: 1, duration: 1.8, ease: 'power2.out' }, 1.4)
      .to(S, { warm: 1, duration: 2, ease: 'power1.inOut' }, 1.2)
      .to(S, { settle: 1, duration: 1.4, ease: 'power2.inOut' }, 2.2)
      /* NEXERA grows out of the sun */
      .fromTo(els.word, { x: wordFrom('x'), y: wordFrom('y'), scale: 0.04, autoAlpha: 0 }, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 1.3, ease: 'expo.out', immediateRender: true }, 2.45)
      .fromTo(els.letters, { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 2.5)
      .fromTo(els.copy, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 3.15)
      .fromTo(els.ctas, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 3.3)
      .fromTo(els.scroll, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 3.6)
      .call(onEnd, null, 4.0);
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

  /* the page opens on the finished cover (the picture first, then the same frame in 3D), so the name and
     buttons show at once; the full dawn intro plays when asked (the cover's button, or "Play the intro") */
  finalState();
  ended = false; onEnd();
  els.skipLabel.textContent = 'Play intro';
  els.skip.setAttribute('aria-label', 'Play the intro');
  els.skip.hidden = false;
  frame(performance.now());
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
    .to(S, { flood: 1, duration: 1, ease: 'power2.in' }, 0);
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  return { replay, state: S };
}
