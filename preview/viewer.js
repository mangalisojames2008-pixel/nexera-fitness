/* =========================================================
   NexEra Skin 3D product view
   - entrance (glow, faint word, the product rises with a turn, then its details)
   - free rotation (drag on both axes, momentum, spring back, Front/Side/Back/Top, arrow keys)
   - Look inside (the packaging comes apart into labelled parts; tap a label to read about it)
   - How this step works (the skin diagram for the product's routine step)
   One scene at a time; everything is freed when the view closes.
   ========================================================= */
import { THREE, makeRenderer, makeScene, buildProduct, makeShadow, specFor, dispose, TONES } from './studio.js';

const gsap = window.gsap;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const NS = 'http://www.w3.org/2000/svg';
const TILT = 0.55, IDLE = 3000, TAU = Math.PI * 2;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const STEP_NAMES = { cleanse: ['01', 'Cleanse'], treat: ['02', 'Treat'], moisturise: ['03', 'Moisturise'], protect: ['04', 'Protect'] };

const pv = document.getElementById('productView');
let cur = null;

export function open(p, opts = {}) {
  if (cur) close(true);
  const reduce = !!opts.reduce;
  const tone = TONES[p.tone] || TONES.aqua;
  const ui = {
    stage: $('.pv__stage', pv), labels: $('.pv__labels', pv), lines: $('.pv__lines', pv), still: $('.pv__still', pv),
    inside: $('[data-inside]', pv), replay: $('[data-pv-replay]', pv), add: $('[data-pv-add]', pv), ask: $('[data-pv-ask]', pv),
    part: $('.pv__part', pv), close: $('[data-pv-close]', pv), panel: $('.pv__panel', pv)
  };

  /* ----- the panel ----- */
  pv.style.setProperty('--pv-glow', tone.glow);
  const word = (p.range || p.typeName).replace(/\+$/, '');
  const wordEl = $('.pv__word', pv); wordEl.textContent = word;
  wordEl.style.fontSize = `clamp(3rem, ${Math.min(13, 95 / Math.max(4, word.length)).toFixed(2)}vw, 13rem)`;
  $('.pv__brand', pv).textContent = p.brandName + ' · ' + p.typeName;
  $('.pv__name', pv).textContent = p.name;
  $('.pv__chips', pv).innerHTML = p.chips.concat(p.range ? [p.range + ' range'] : []).map(c => `<span class="chip">${c.replace(/[<>&]/g, '')}</span>`).join('');
  $('.pv__what', pv).textContent = opts.type ? opts.type.what : '';
  ui.ask.href = opts.ask || ui.ask.href;
  const syncAdd = () => { const on = opts.inList && opts.inList(); ui.add.setAttribute('aria-pressed', on ? 'true' : 'false'); ui.add.textContent = on ? 'In your list' : 'Add to list'; };
  syncAdd();
  ui.part.hidden = true;
  ui.inside.setAttribute('aria-pressed', 'false');
  ui.inside.lastChild.textContent = 'Look inside';

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
  ui.still.src = `assets/products/${p.shape}-${p.tone}-${p.cap}.webp`;
  /* a real photo, when the owner has added one */
  const hasPhoto = !!(window.NEXERA_PHOTOS || {})[p.id], photo = $('.pv__photo', pv);
  photo.hidden = !hasPhoto;
  if (hasPhoto) { photo.src = `assets/photos/${p.id}.webp`; photo.alt = 'Photo of ' + p.brandName + ' ' + p.name; }
  $('.pv__note', pv).textContent = hasPhoto
    ? 'The photo shows the product. The 3D view is an illustration of the type of packaging, with simplified parts.'
    : 'Illustration. Not the actual packaging. Parts are simplified.';

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
    const small = matchMedia('(max-width: 900px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  } catch (e) {
    showStill(state);
    return;
  }
  on(canvas, 'webglcontextlost', ev => { ev.preventDefault(); showStill(state); });

  const { scene } = makeScene(renderer);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
  const model = buildProduct(specFor(p));
  const pivot = new THREE.Group(), lift = new THREE.Group();
  lift.add(pivot); pivot.add(model.group); scene.add(lift);
  const box = new THREE.Box3().setFromObject(model.group), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  model.group.position.set(-center.x, 0, -center.z);
  const shadow = makeShadow(Math.max(size.x, size.z) * 0.85, 0.55); scene.add(shadow);
  /* the size when opened, so the camera can make room for every part */
  model.parts.forEach(pt => pt.node.position.copy(pt.node.userData.home).add(pt.out));
  model.group.traverse(o => { if (o.userData.showWhenOpen) o.visible = true; });
  const openBox = new THREE.Box3().setFromObject(model.group);
  model.parts.forEach(pt => pt.node.position.copy(pt.node.userData.home));
  model.group.traverse(o => { if (o.userData.showWhenOpen) o.visible = false; });
  const openSize = openBox.getSize(new THREE.Vector3()), openCenter = openBox.getCenter(new THREE.Vector3());
  const frameClosed = { span: Math.max(size.y, size.x * 1.1, size.z * 1.1), cy: size.y * 0.5 };
  const frameOpen = { span: Math.max(openSize.y, Math.max(Math.abs(openBox.min.x), Math.abs(openBox.max.x)) * 2.1, openSize.z * 1.2), cy: openCenter.y };
  Object.assign(state, { renderer, scene, cam, model, pivot, lift, shadow, size });

  const R = { yaw: -0.35, pitch: 0, vyaw: 0, vpitch: 0, rest: -0.35, inside: 0, enter: reduce ? 1 : 0, lastTouch: 0, selected: null };
  state.R = R;

  function resize() {
    const w = ui.stage.clientWidth, h = ui.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    state.w = w; state.h = h;
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(ui.stage); state.ro = ro;

  /* ----- labels for Look inside ----- */
  const items = model.parts.map(pt => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pv__label'; btn.textContent = pt.label; btn.setAttribute('aria-pressed', 'false'); btn.tabIndex = -1;
    const path = document.createElementNS(NS, 'path'); path.setAttribute('pathLength', '1');
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '3.2');
    ui.lines.append(path, dot); ui.labels.append(btn);
    btn.addEventListener('click', () => select(pt.id));
    return { pt, btn, path, dot, x: 0, y: 0 };
  });
  state.items = items;

  function meshesOf(node) { const m = []; node.traverse(o => { if (o.isMesh) m.push(o); }); return m; }
  function select(id) {
    R.selected = R.selected === id ? null : id;
    items.forEach(it => {
      const sel = R.selected === it.pt.id;
      it.btn.setAttribute('aria-pressed', sel ? 'true' : 'false');
      meshesOf(it.pt.node).forEach(m => {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach(mat => {
          if (mat.userData.op == null) { mat.userData.op = mat.opacity; mat.userData.tr = mat.transparent; }
          const dim = R.selected && !sel;
          mat.transparent = dim ? true : mat.userData.tr; mat.opacity = dim ? 0.16 : mat.userData.op; mat.needsUpdate = true;
        });
      });
    });
    const it = items.find(i => i.pt.id === R.selected);
    ui.part.hidden = !it;
    if (it) ui.part.innerHTML = `<strong>${it.pt.label}</strong>${it.pt.text}`;
  }

  function setInside(open) {
    if (open && R.selected) select(R.selected);
    ui.inside.setAttribute('aria-pressed', open ? 'true' : 'false');
    ui.inside.lastChild.textContent = open ? 'Put it back together' : 'Look inside';
    items.forEach(it => { it.btn.tabIndex = open ? 0 : -1; });
    if (!open) { if (R.selected) select(R.selected); ui.part.hidden = true; }
    if (reduce || !gsap) { R.inside = open ? 1 : 0; return; }
    gsap.to(R, { inside: open ? 1 : 0, duration: open ? 1.2 : 0.8, ease: open ? 'power3.inOut' : 'power2.inOut', overwrite: true });
    if (open) { R.yaw = nearest(R.yaw, R.rest + 0.35); }
  }
  on(ui.inside, 'click', () => setInside(ui.inside.getAttribute('aria-pressed') !== 'true'));

  /* ----- turning ----- */
  const nearest = (from, to) => to + Math.round((from - to) / TAU) * TAU;
  let drag = null;
  on(canvas, 'pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    R.vyaw = 0; R.vpitch = 0; R.lastTouch = performance.now();
    pv.classList.add('is-dragged');
  });
  on(canvas, 'pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    const k = 4.2 / Math.max(320, state.w || 600);
    R.yaw += dx * k; R.pitch = Math.max(-TILT, Math.min(TILT, R.pitch + dy * k));
    R.vyaw = dx * k / dt; R.vpitch = dy * k / dt; R.lastTouch = now;
  });
  const end = () => { drag = null; R.lastTouch = performance.now(); };
  on(canvas, 'pointerup', end); on(canvas, 'pointercancel', end);
  on(canvas, 'wheel', e => { e.preventDefault(); R.yaw += e.deltaX * 0.004; R.lastTouch = performance.now(); }, { passive: false });
  $$('[data-angle]', pv).forEach(b => on(b, 'click', () => {
    const a = b.getAttribute('data-angle');
    const yaw = { front: R.rest, side: R.rest + Math.PI / 2, back: R.rest + Math.PI, top: R.rest }[a];
    R.yaw = nearest(R.yaw, yaw); R.targetYaw = R.yaw; R.vyaw = 0;
    R.pitchTarget = a === 'top' ? TILT * 1.6 : 0;
    gsap ? gsap.to(R, { pitch: a === 'top' ? 0.9 : 0, duration: 0.8, ease: 'power3.out' }) : (R.pitch = a === 'top' ? 0.9 : 0);
    R.lastTouch = performance.now() + 2000;
    $$('[data-angle]', pv).forEach(x => x.classList.toggle('is-on', x === b));
  }));
  on(document, 'keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') { R.yaw -= 0.35; R.lastTouch = performance.now(); }
    if (e.key === 'ArrowRight') { R.yaw += 0.35; R.lastTouch = performance.now(); }
  });

  /* ----- entrance ----- */
  function entrance() {
    if (reduce || !gsap) { R.enter = 1; return; }
    gsap.killTweensOf(R, 'enter');
    R.enter = 0; R.yaw = R.rest;
    gsap.to(R, { enter: 1, duration: 2.1, ease: 'power3.out' });
    gsap.fromTo($$('.pv__panel > *', pv), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.55, overwrite: true });
    gsap.fromTo($('.pv__word', pv), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' });
    gsap.fromTo($('.pv__glow', pv), { opacity: 0 }, { opacity: 0.35, duration: 1.2 });
  }
  on(ui.replay, 'click', () => { if (R.inside > 0) setInside(false); entrance(); });

  /* ----- the loop ----- */
  const tmp = new THREE.Vector3(), boxTmp = new THREE.Box3();
  let last = performance.now(), first = true;
  function frame(now) {
    if (!state.alive) return;
    state.raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    /* momentum, then spring back after a few seconds of no touching */
    if (!drag) {
      R.yaw += R.vyaw * dt; R.vyaw *= Math.exp(-4 * dt);
      R.pitch = Math.max(-TILT * 1.7, Math.min(TILT * 1.7, R.pitch + R.vpitch * dt)); R.vpitch *= Math.exp(-5 * dt);
      if (now - R.lastTouch > IDLE && R.inside < 0.5) {
        R.yaw = damp(R.yaw, nearest(R.yaw, R.rest), 2.2, dt);
        R.pitch = damp(R.pitch, 0, 2.2, dt);
        $$('[data-angle]', pv).forEach(x => x.classList.remove('is-on'));
      }
    }
    const e = R.enter, idle = reduce ? 0 : Math.sin(now / 900) * 0.035;
    pivot.rotation.set(R.pitch, R.yaw + (1 - e) * -2.4, 0);
    lift.position.y = (1 - e) * -size.y * 0.9 + idle * e;
    shadow.material.opacity = 0.55 * e;
    shadow.scale.setScalar(1 + R.inside * 0.4);

    /* Look inside: each part moves out along its own direction, a little after the one before */
    model.parts.forEach((pt, i) => {
      const k = Math.max(0, Math.min(1, R.inside * 1.25 - i * 0.06));
      const s = k * k * (3 - 2 * k);
      pt.node.position.copy(pt.node.userData.home).addScaledVector(pt.out, s);
      pt.node.traverse(o => { if (o.userData.showWhenOpen) o.visible = R.inside > 0.02; });
    });

    /* camera: frame the product, and step back when it opens */
    const ins = R.inside * R.inside * (3 - 2 * R.inside);
    const span = THREE.MathUtils.lerp(frameClosed.span, frameOpen.span, ins);
    const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    /* leave room for the buttons along the bottom of the stage */
    const room = 1 - Math.min(0.3, 120 / Math.max(300, state.h || 600));
    const fitH = span * 1.25 / (2 * vt * room), fitW = span * (1.25 + ins * 0.5) / (2 * vt * cam.aspect);
    const dist = Math.max(fitH, fitW);
    const cy = THREE.MathUtils.lerp(frameClosed.cy, frameOpen.cy, ins);
    const lookY = cy - span * (1 - room) * 0.55;
    cam.position.set(0, lookY + dist * 0.12, dist);
    cam.lookAt(0, lookY, 0);
    renderer.render(scene, cam);
    if (first) { first = false; pv.classList.add('is-ready'); }

    /* labels and leader lines */
    const show = R.inside > 0.85;
    if (R.inside > 0.01) {
      const W = state.w, H = state.h, colL = 14, colR = W - 14;
      const pts = items.map(it => {
        boxTmp.setFromObject(it.pt.node); boxTmp.getCenter(tmp);
        const pr = tmp.project(cam);
        return { it, ax: (pr.x + 1) / 2 * W, ay: (1 - pr.y) / 2 * H };
      });
      const left = pts.filter(q => q.ax < W / 2).sort((a, b) => a.ay - b.ay), right = pts.filter(q => q.ax >= W / 2).sort((a, b) => a.ay - b.ay);
      [left, right].forEach((col, side) => {
        let lastY = -1e9;
        col.forEach(q => {
          const bw = q.it.btn.offsetWidth || 90, bh = q.it.btn.offsetHeight || 34;
          let y = Math.max(q.ay - bh / 2, lastY + bh + 8, 60);
          y = Math.min(y, H - bh - 70);
          lastY = y;
          const x = side === 0 ? colL : colR - bw;
          q.it.btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          const lx = side === 0 ? x + bw : x, ly = y + bh / 2;
          const elbow = side === 0 ? lx + 18 : lx - 18;
          q.it.path.setAttribute('d', `M${lx.toFixed(1)} ${ly.toFixed(1)}H${elbow.toFixed(1)}L${q.ax.toFixed(1)} ${q.ay.toFixed(1)}`);
          q.it.dot.setAttribute('cx', q.ax.toFixed(1)); q.it.dot.setAttribute('cy', q.ay.toFixed(1));
        });
      });
    }
    const draw = Math.max(0, Math.min(1, (R.inside - 0.6) / 0.4));
    items.forEach(it => {
      it.btn.classList.toggle('is-on', show);
      it.path.style.setProperty('--d', (1 - draw).toFixed(3));
      it.dot.style.setProperty('--o', draw.toFixed(3));
    });
  }
  state.raf = requestAnimationFrame(frame);
  entrance();
  pv.classList.toggle('has-3d', true);
}

function showStill(state) {
  state.ui.still.hidden = false;
  pv.classList.add('is-ready');
  $('.pv__loading', pv).textContent = '';
  const ins = state.ui.inside; ins.disabled = true;
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
  s.listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
  if (s.ro) s.ro.disconnect();
  if (s.skinTl) s.skinTl.kill();
  if (s.items) s.items.forEach(it => { it.btn.remove(); it.path.remove(); it.dot.remove(); });
  if (s.model) { s.scene.remove(s.lift); dispose(s.lift); dispose(s.shadow); }
  if (s.renderer) { s.renderer.dispose(); s.renderer.forceContextLoss(); }
  const fresh = s.canvas.cloneNode(false); s.canvas.replaceWith(fresh);
  $$('[data-angle]', pv).forEach(x => x.classList.remove('is-on'));
  $('.pv__loading', pv).textContent = 'Loading the 3D view';
  const ins = $('[data-inside]', pv); ins.disabled = false;
  pv.hidden = true;
  document.body.classList.remove('is-locked');
  if (s.opts.lenis) s.opts.lenis.start();
  if (!fromPop && !silent && history.state && history.state.nexeraView) history.back();
  if (!silent || fromPop) {
    const back = s.fromEl && (s.fromEl.querySelector('[data-view]') || s.fromEl);
    if (back && back.focus) back.focus({ preventScroll: true });
  }
}
