/* =========================================================
   NexEra Skin 3D product view
   The product is a solid pack built from the brand's real photo
   (product-3d.js): real width, height and depth, the photo wrapped round the
   front, the back photo (or the pack's own side colours) on the back.
   - entrance (glow, faint word, the product rises with a turn, then its details)
   - drag to turn all the way round (momentum, spring back), Front, Side, Back, Top, arrow keys
   - the pack's volume and size (estimated sizes are labelled as estimates)
   - How this step works (the skin diagram for the product's routine step)
   One scene at a time; everything is freed when the view closes.
   ========================================================= */
import { THREE, makeRenderer, makeScene, makeShadow, packProduct, packOf, dispose, PHONE } from './studio.js';

const gsap = window.gsap;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const IDLE = 3000, TAU = Math.PI * 2, TILT = 1.3, REST = -0.42;
const VIEWS = { front: [0, 0.05], side: [Math.PI / 2, 0.05], back: [Math.PI, 0.05], top: [0.4, 1.15] };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const STEP_NAMES = { cleanse: ['01', 'Cleanse'], treat: ['02', 'Treat'], moisturise: ['03', 'Moisturise'], protect: ['04', 'Protect'] };

const pv = document.getElementById('productView');
let cur = null;

export function open(p, opts = {}) {
  if (cur) close(true);
  const reduce = !!opts.reduce;
  const theme = (window.NEXERA_SKIN.THEME || {})[p.brand] || { ingredient: '#f2ca99' };
  const ui = {
    stage: $('.pv__stage', pv), still: $('.pv__still', pv), replay: $('[data-pv-replay]', pv), add: $('[data-pv-add]', pv), ask: $('[data-pv-ask]', pv),
    close: $('[data-pv-close]', pv), panel: $('.pv__panel', pv), loading: $('.pv__loading', pv)
  };

  /* ----- the panel ----- */
  pv.style.setProperty('--pv-glow', theme.ingredient);
  const word = (p.range || p.typeName).replace(/\+$/, '');
  const wordEl = $('.pv__word', pv); wordEl.textContent = word;
  wordEl.style.fontSize = `clamp(3rem, ${Math.min(13, 95 / Math.max(4, word.length)).toFixed(2)}vw, 13rem)`;
  $('.pv__brand', pv).textContent = p.brandName + ' · ' + p.typeName;
  $('.pv__name', pv).textContent = p.name;
  $('.pv__chips', pv).innerHTML = p.chips.concat(p.range ? [p.range + ' range'] : []).map(c => `<span class="chip">${c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('');
  $('.pv__what', pv).textContent = opts.type ? opts.type.what : '';
  ui.ask.href = opts.ask || ui.ask.href;
  const syncAdd = () => { const on = opts.inList && opts.inList(); ui.add.setAttribute('aria-pressed', on ? 'true' : 'false'); ui.add.textContent = on ? 'In your list' : 'Add to list'; };
  syncAdd();
  const k = packOf(p), d = k.dims;
  const cm = v => String(Math.round(v / 5) / 2);
  $('.pv__dims', pv).textContent = [k.size, d && d.h ? (k.est ? 'About ' : '') + cm(d.h) + ' × ' + cm(d.w) + ' × ' + cm(d.d) + ' cm' + (k.est ? ' (estimated from the volume)' : '') : ''].filter(Boolean).join(' · ');

  const [num, stepName] = STEP_NAMES[p.step] || ['', ''];
  $('.pv__how-step', pv).textContent = num + ' ' + stepName + ':';
  const art = $('.pv__how-art', pv); art.innerHTML = '';
  const src = document.querySelector(`.rstep[data-step="${p.step}"]`);
  let skinTl = null;
  if (src) {
    const svg = $('.skin', src).cloneNode(true);
    svg.removeAttribute('role'); svg.setAttribute('aria-hidden', 'true');
    art.append(svg);
    $('.pv__how-text', pv).textContent = $('.rstep__body', src).textContent;
    if (opts.skin && gsap) {
      skinTl = opts.skin(svg, p.step);
      if (skinTl) { if (reduce) skinTl.progress(1); else skinTl.repeat(-1).repeatDelay(1.6).play(0); }
    }
  }

  /* ----- show the dialog ----- */
  const fromEl = opts.from;
  pv.hidden = false;
  pv.classList.remove('is-ready', 'is-dragged');
  document.body.classList.add('is-locked');
  if (opts.lenis) opts.lenis.stop();
  history.pushState({ nexeraView: p.id }, '');
  setTimeout(() => ui.close.focus(), 30);

  /* ----- the 3D scene (a fresh canvas each time) ----- */
  const oldCanvas = $('.pv__canvas', pv);
  const canvas = oldCanvas.cloneNode(false);
  oldCanvas.replaceWith(canvas);
  ui.still.hidden = true;
  ui.still.src = p.img;
  ui.still.alt = 'Photo of ' + p.brandName + ' ' + p.name;

  const state = { p, opts, ui, canvas, reduce, skinTl, fromEl, raf: 0, alive: true, listeners: [] };
  cur = state;
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); state.listeners.push([el, ev, fn, o]); };

  on(ui.close, 'click', () => close());
  on(document, 'keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') trapFocus(e);
  });
  on(window, 'popstate', () => close(true, true));
  on(ui.add, 'click', () => { if (opts.toggle) opts.toggle(); syncAdd(); });

  let renderer;
  try {
    renderer = makeRenderer(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
  } catch (e) {
    showStill(state);
    return;
  }
  state.renderer = renderer;
  on(canvas, 'webglcontextlost', ev => { ev.preventDefault(); showStill(state); });

  const { scene } = makeScene(renderer);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
  Object.assign(state, { scene, cam });

  function resize() {
    const w = ui.stage.clientWidth, h = ui.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    state.w = w; state.h = h;
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(ui.stage); state.ro = ro;

  packProduct(p, { height: 3 }).then(stand => {
    if (!state.alive) { dispose(stand); return; }
    build(state, stand);
  }).catch(() => { if (state.alive) showStill(state); });
}

function build(state, stand) {
  const { ui, renderer, scene, cam, reduce, canvas } = state;
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); state.listeners.push([el, ev, fn, o]); };
  const prod = stand.userData.product, size = { x: stand.userData.width, y: stand.userData.height, z: stand.userData.depth };
  const lift = new THREE.Group(); lift.add(stand); scene.add(lift);
  const shadow = makeShadow(Math.max(size.x, size.z) * 0.6 + 0.3, 0.5); scene.add(shadow);
  Object.assign(state, { lift, shadow, stand });

  const R = { yaw: REST, pitch: 0, vyaw: 0, vpitch: 0, rest: REST, enter: reduce ? 1 : 0, lastTouch: 0 };
  state.R = R;
  const clampYaw = y => y;
  const nearest = (from, to) => to + Math.round((from - to) / TAU) * TAU;

  /* ----- turning ----- */
  let drag = null;
  on(canvas, 'pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    R.vyaw = 0; R.vpitch = 0; R.lastTouch = performance.now();
    pv.classList.add('is-dragged');
    $$('[data-angle]', pv).forEach(x => x.classList.remove('is-on'));
  });
  on(canvas, 'pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    const k = 4.2 / Math.max(320, state.w || 600);
    R.yaw = clampYaw(R.yaw + dx * k); R.pitch = Math.max(-0.5, Math.min(TILT, R.pitch + dy * k * 0.8));
    R.vyaw = dx * k / dt; R.vpitch = dy * k * 0.8 / dt; R.lastTouch = now;
  });
  const end = () => { drag = null; R.lastTouch = performance.now(); };
  on(canvas, 'pointerup', end); on(canvas, 'pointercancel', end);
  on(canvas, 'wheel', e => { e.preventDefault(); R.yaw = clampYaw(R.yaw + e.deltaX * 0.004); R.lastTouch = performance.now(); }, { passive: false });
  $$('[data-angle]', pv).forEach(b => on(b, 'click', () => {
    const a = b.getAttribute('data-angle');
    const v = VIEWS[a];
    if (!v) return;
    R.vyaw = 0; R.vpitch = 0;
    const to = nearest(R.yaw, v[0]);
    if (gsap && !reduce) gsap.to(R, { yaw: to, pitch: v[1], duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
    else { R.yaw = to; R.pitch = v[1]; }
    R.lastTouch = performance.now() + 2500;
    $$('[data-angle]', pv).forEach(x => x.classList.toggle('is-on', x === b));
  }));
  on(document, 'keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') { R.yaw = clampYaw(R.yaw - 0.35); R.lastTouch = performance.now(); }
    if (e.key === 'ArrowRight') { R.yaw = clampYaw(R.yaw + 0.35); R.lastTouch = performance.now(); }
  });

  /* ----- entrance ----- */
  function entrance() {
    if (reduce || !gsap) { R.enter = 1; return; }
    gsap.killTweensOf(R);
    R.enter = 0; R.yaw = R.rest; R.pitch = 0;
    gsap.to(R, { enter: 1, duration: 2.1, ease: 'power3.out' });
    gsap.fromTo($$('.pv__panel > *', pv), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.55, overwrite: true });
    gsap.fromTo($('.pv__word', pv), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' });
    gsap.fromTo($('.pv__glow', pv), { opacity: 0 }, { opacity: 0.35, duration: 1.2 });
  }
  on(ui.replay, 'click', entrance);

  /* ----- the loop ----- */
  let last = performance.now(), first = true;
  function frame(now) {
    if (!state.alive) return;
    state.raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    /* momentum, then spring back after a few seconds of no touching */
    if (!drag && !(gsap && gsap.isTweening(R))) {
      R.yaw = clampYaw(R.yaw + R.vyaw * dt); R.vyaw *= Math.exp(-4 * dt);
      R.pitch = Math.max(-0.5, Math.min(TILT, R.pitch + R.vpitch * dt)); R.vpitch *= Math.exp(-5 * dt);
      if (now - R.lastTouch > IDLE) {
        R.yaw = damp(R.yaw, nearest(R.yaw, R.rest), 2.2, dt);
        R.pitch = damp(R.pitch, 0, 2.2, dt);
        $$('[data-angle]', pv).forEach(x => x.classList.remove('is-on'));
      }
    }
    const e = R.enter, idle = reduce ? 0 : Math.sin(now / 900) * 0.035;
    prod.rotation.set(R.pitch, R.yaw + (1 - e) * -2.4, 0);
    lift.position.y = (1 - e) * -size.y * 0.9 + idle * e;
    shadow.material.opacity = 0.5 * e;

    /* camera: frame the product, leaving room for the buttons along the bottom */
    const span = Math.max(size.y, size.x * 1.15, size.z * 1.15);
    const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const room = 1 - Math.min(0.3, 120 / Math.max(300, state.h || 600));
    const dist = Math.max(span * 1.25 / (2 * vt * room), span * 1.25 / (2 * vt * cam.aspect));
    const lookY = size.y * 0.5 - span * (1 - room) * 0.55;
    cam.position.set(0, lookY + dist * 0.12, dist);
    cam.lookAt(0, lookY, 0);
    renderer.render(scene, cam);
    if (first) { first = false; pv.classList.add('is-ready'); }
  }
  state.raf = requestAnimationFrame(frame);
  entrance();
  pv.classList.toggle('has-3d', true);
}

function showStill(state) {
  state.ui.still.hidden = false;
  pv.classList.add('is-ready');
  $('.pv__loading', pv).textContent = '';
}

function trapFocus(e) {
  const f = $$('button:not([disabled]), a[href]', pv).filter(el => el.offsetParent !== null && el.tabIndex !== -1);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}

export function close(silent, fromPop) {
  const s = cur; if (!s) return;
  cur = null;
  s.alive = false;
  cancelAnimationFrame(s.raf);
  if (gsap && s.R) gsap.killTweensOf(s.R);
  s.listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
  if (s.ro) s.ro.disconnect();
  if (s.skinTl) s.skinTl.kill();
  if (s.lift) { s.scene.remove(s.lift); dispose(s.lift); dispose(s.shadow); }
  if (s.renderer) { s.renderer.dispose(); s.renderer.forceContextLoss(); }
  const fresh = s.canvas.cloneNode(false); s.canvas.replaceWith(fresh);
  $$('[data-angle]', pv).forEach(x => x.classList.remove('is-on'));
  $('.pv__loading', pv).textContent = 'Loading the 3D view';
  pv.hidden = true;
  document.body.classList.remove('is-locked');
  if (s.opts.lenis) s.opts.lenis.start();
  if (!fromPop && !silent && history.state && history.state.nexeraView) history.back();
  if (!silent || fromPop) {
    const back = s.fromEl && (s.fromEl.querySelector('[data-view]') || s.fromEl);
    if (back && back.focus) back.focus({ preventScroll: true });
  }
}
