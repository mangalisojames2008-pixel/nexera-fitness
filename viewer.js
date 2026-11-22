/* =========================================================
   NexEra Skin product view (opened from "View product" on any product)
   The brand's real product photo, large, with the product's details:
   brand and type, name, chips, what this type of product does, the pack size,
   How this step works (the skin diagram for the product's routine step),
   Add to list and Ask about this. No 3D here (owner's request, 2026-11-22);
   the cover and the scroll story keep their 3D packs.
   ========================================================= */
const gsap = window.gsap;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const STEP_NAMES = { cleanse: ['01', 'Cleanse'], treat: ['02', 'Treat'], moisturise: ['03', 'Moisturise'], protect: ['04', 'Protect'] };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pv = document.getElementById('productView');
let cur = null;

export function open(p, opts = {}) {
  if (cur) close(true);
  const reduce = !!opts.reduce;
  const theme = (window.NEXERA_SKIN.THEME || {})[p.brand] || { ingredient: '#f2ca99' };
  const ui = { photo: $('.pv__photo', pv), add: $('[data-pv-add]', pv), ask: $('[data-pv-ask]', pv), close: $('[data-pv-close]', pv) };

  /* ----- the details ----- */
  pv.style.setProperty('--pv-glow', theme.ingredient);
  const word = (p.range || p.typeName).replace(/\+$/, '');
  const wordEl = $('.pv__word', pv); wordEl.textContent = word;
  wordEl.style.fontSize = `clamp(2.5rem, ${Math.min(8, 70 / Math.max(4, word.length)).toFixed(2)}vw, 6rem)`;
  $('.pv__brand', pv).textContent = p.brandName + ' · ' + p.typeName;
  $('.pv__name', pv).textContent = p.name;
  $('.pv__chips', pv).innerHTML = p.chips.concat(p.range ? [p.range + ' range'] : []).map(c => `<span class="chip">${esc(c)}</span>`).join('');
  $('.pv__what', pv).textContent = opts.type ? opts.type.what : '';
  const size = ((window.NEXERA_PACKS || {})[p.id] || {}).size;
  const sizeEl = $('.pv__size', pv); sizeEl.textContent = size || ''; sizeEl.hidden = !size;
  ui.ask.href = opts.ask || ui.ask.href;
  const syncAdd = () => { const on = opts.inList && opts.inList(); ui.add.setAttribute('aria-pressed', on ? 'true' : 'false'); ui.add.textContent = on ? 'In your list' : 'Add to list'; };
  syncAdd();

  /* the photo: the large cut-out, the card picture until it arrives */
  ui.photo.alt = 'Photo of ' + p.brandName + ' ' + p.name;
  ui.photo.src = p.thumb;
  ui.photo.hidden = false;
  const big = new Image();
  big.onload = () => { if (cur && cur.p === p) ui.photo.src = p.img; };
  big.src = p.img;

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
  document.body.classList.add('is-locked');
  if (opts.lenis) opts.lenis.stop();
  history.pushState({ nexeraView: p.id }, '');
  setTimeout(() => ui.close.focus(), 30);
  if (gsap && !reduce) {
    /* one short entrance: the photo and the details fade and rise a few pixels */
    gsap.fromTo([ui.photo].concat($$('.pv__panel > *', pv)), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power3.out', overwrite: true });
  }

  const state = { p, opts, skinTl, fromEl, listeners: [] };
  cur = state;
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); state.listeners.push([el, ev, fn, o]); };
  on(ui.close, 'click', () => close());
  on(document, 'keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') trapFocus(e);
  });
  on(window, 'popstate', () => close(true, true));
  on(ui.add, 'click', () => { if (opts.toggle) opts.toggle(); syncAdd(); });
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
  s.listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
  if (s.skinTl) s.skinTl.kill();
  pv.hidden = true;
  document.body.classList.remove('is-locked');
  if (s.opts.lenis) s.opts.lenis.start();
  if (!fromPop && !silent && history.state && history.state.nexeraView) history.back();
  if (!silent || fromPop) {
    const back = s.fromEl && (s.fromEl.querySelector('[data-view]') || s.fromEl);
    if (back && back.focus) back.focus({ preventScroll: true });
  }
}
