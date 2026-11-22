/* =========================================================
   NexEra Skin: page script
   Each part starts on its own, so one failure never blanks the page.
   The 3D cover (cover.js) and the 3D product view (viewer.js) load as modules.
   ========================================================= */
(function () {
  'use strict';
  window.NEXSKIN_READY = true;

  var DATA = window.NEXERA_SKIN || { PRODUCTS: [], TYPES: [], BRANDS: [], typeById: {}, EMAIL: 'nexeracommerce@gmail.com' };
  var EMAIL = DATA.EMAIL;
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var lenis = null, cover = null, heroState = { flood: 0 };
  var byId = {};
  DATA.PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function safe(name, fn) { try { return fn(); } catch (e) { if (window.console) console.error('[NexEra] ' + name + ':', e); return null; } }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mailto(subject, body) { return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }
  function artOf(p) { return p.thumb; }
  function onVisible(el, cb, margin) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (e) { cb(e[0].isIntersecting); }, { rootMargin: margin || '80px 0px' }).observe(el);
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -8, duration: 1.2 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  var toastTimer = 0;
  function toast(text) {
    var t = $('.toast'); if (!t) return;
    t.textContent = text; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }

  /* ---------- email links ---------- */
  safe('email links', function () {
    $$('[data-mail]').forEach(function (a) {
      a.href = mailto('Hello NexEra', 'Hi NexEra,\n\nI would like to know more about:\n\nMy name:\nMy area:\n');
    });
  });

  /* ---------- review form: opens the visitor's email app with the review written in ---------- */
  safe('review form', function () {
    var form = $('#reviewForm'); if (!form) return;
    var status = $('.form-status', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var trap = form.querySelector('[name="website"]');
      if (trap && trap.value) { status.textContent = 'Thank you.'; return; }
      var picked = form.querySelector('input[name="rating"]:checked');
      var stars = picked ? +picked.value : 0;
      var name = form.querySelector('[name="name"]').value.trim();
      var text = form.querySelector('[name="review"]').value.trim();
      var consent = form.querySelector('[name="consent"]').checked;
      var line = '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(0, 5 - stars);
      window.location.href = mailto('NexEra review: ' + stars + (stars === 1 ? ' star' : ' stars') + ' from ' + name,
        'Rating: ' + line + ' (' + stars + ' out of 5)\nFirst name: ' + name + '\n\nReview:\n' + text + '\n\nNexEra may show my first name and review on the website: ' + (consent ? 'Yes' : 'No') + '\n');
      status.textContent = 'Thank you, ' + name + '. Your email app should open now with your review ready. Press send there. If nothing opened, email it to ' + EMAIL + '.';
    });
  });

  /* =========================================================
     ORDER LIST (kept on this device only)
     ========================================================= */
  var List = safe('order list', function () {
    var KEY = 'nexera-skin-list';
    var items = [];
    try { items = JSON.parse(localStorage.getItem(KEY) || '[]').filter(function (i) { return byId[i.id] && i.qty > 0; }); } catch (e) { items = []; }
    var drawer = $('#orderlist'), panel = $('.drawer__panel', drawer), ul = $('[data-list-items]', drawer);
    var empty = $('[data-list-empty]', drawer), status = $('.drawer__status', drawer), note = $('#listNote');
    var lastFocus = null;

    function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ } }
    function count() { return items.reduce(function (n, i) { return n + i.qty; }, 0); }
    function has(id) { return items.some(function (i) { return i.id === id; }); }
    function syncButtons() {
      function sync(b, id) {
        var on = has(id);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        $('span', b).textContent = on ? 'In your list' : 'Add to list';
        $('use', b).setAttribute('href', on ? '#i-check' : '#i-plus');
      }
      $$('.card').forEach(function (c) { var b = $('[data-add]', c); if (b) sync(b, c.getAttribute('data-id')); });
      $$('[data-add-id]').forEach(function (b) { sync(b, b.getAttribute('data-add-id')); });
      var n = count();
      $$('[data-list-count]').forEach(function (el) { el.textContent = n; });
    }
    function render() {
      ul.innerHTML = items.map(function (i) {
        var p = byId[i.id];
        return '<li class="litem" data-id="' + p.id + '"><img src="' + artOf(p) + '" alt="" width="64" height="64">' +
          '<div><p class="litem__brand">' + esc(p.brandName) + '</p><p class="litem__name">' + esc(p.name) + '</p>' +
          '<button class="litem__remove" type="button" data-remove>Remove</button></div>' +
          '<div class="qty" role="group" aria-label="Amount of ' + esc(p.name) + '"><button type="button" data-dec aria-label="One less">−</button><output>' + i.qty + '</output><button type="button" data-inc aria-label="One more">+</button></div></li>';
      }).join('');
      empty.hidden = items.length > 0;
      ul.hidden = items.length === 0;
      syncButtons();
    }
    function add(id, silent) {
      var it = items.find(function (i) { return i.id === id; });
      if (it) it.qty += 1; else items.push({ id: id, qty: 1 });
      save(); render();
      var b = $('.listbtn'); if (b) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
      if (!silent) toast('Added to your order list');
    }
    function remove(id) { items = items.filter(function (i) { return i.id !== id; }); save(); render(); }
    function toggle(id) { if (has(id)) { remove(id); toast('Removed from your list'); } else add(id); }
    function text() {
      var lines = items.map(function (i, k) { var p = byId[i.id]; return (k + 1) + '. ' + p.brandName + ', ' + p.name + ' × ' + i.qty; });
      var extra = note && note.value.trim() ? '\nNote: ' + note.value.trim() + '\n' : '';
      return 'Hi NexEra,\n\nI would like to order:\n\n' + lines.join('\n') + '\n' + extra + '\nMy name:\nMy area for delivery:\n\nPlease confirm my order and the next steps.\n';
    }
    function open() {
      lastFocus = doc.activeElement;
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      $$('[data-open-list]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      if (lenis) lenis.stop();
      doc.body.classList.add('is-locked');
      setTimeout(function () { var c = $('[data-close-list].iconbtn', drawer); if (c) c.focus(); }, 60);
    }
    function close() {
      drawer.classList.remove('is-open');
      $$('[data-open-list]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (lenis) lenis.start();
      doc.body.classList.remove('is-locked');
      setTimeout(function () { drawer.hidden = true; }, reduce ? 0 : 500);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open-list]'); if (t) { e.preventDefault(); open(); return; }
      if (e.target.closest('[data-close-list]')) { close(); return; }
      var li = e.target.closest('.litem');
      if (li) {
        var id = li.getAttribute('data-id'), it = items.find(function (i) { return i.id === id; });
        if (e.target.closest('[data-inc]')) { it.qty = Math.min(99, it.qty + 1); save(); render(); }
        else if (e.target.closest('[data-dec]')) { it.qty -= 1; if (it.qty < 1) remove(id); else { save(); render(); } }
        else if (e.target.closest('[data-remove]')) remove(id);
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) close();
      if (e.key === 'Tab' && !drawer.hidden) {
        var f = $$('button, a[href], textarea, input', panel).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $('[data-send-list]', drawer).addEventListener('click', function () {
      if (!items.length) { status.textContent = 'Add a product first.'; return; }
      var href = mailto('Order request: ' + count() + (count() === 1 ? ' item' : ' items'), text());
      window.location.href = href;
      status.textContent = href.length > 1900
        ? 'Your list is long. If your email opens without all of it, tap Copy the list and paste it into the email.'
        : 'Your email app should open now with the list written in. Press send there.';
    });
    $('[data-copy-list]', drawer).addEventListener('click', function () {
      if (!items.length) { status.textContent = 'Add a product first.'; return; }
      var t = text() + '\nSend to: ' + EMAIL + '\n';
      function fallback() {
        var ta = doc.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        doc.body.appendChild(ta); ta.select();
        try { doc.execCommand('copy'); status.textContent = 'Copied. Paste it into an email to ' + EMAIL + '.'; } catch (e) { status.textContent = 'Could not copy. Please select the list and copy it.'; }
        doc.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { status.textContent = 'Copied. Paste it into an email to ' + EMAIL + '.'; }, fallback);
      else fallback();
    });
    render();
    return { add: add, toggle: toggle, has: has, open: open, close: close };
  });

  /* =========================================================
     THE RANGE: filters, search, show more
     ========================================================= */
  var Range = safe('range', function () {
    var cards = $$('#cards .card'); if (!cards.length) return null;
    var state = { brand: 'all', type: 'all', q: '' }, shown = 24, PAGE = 24;
    var countEl = $('[data-result-count]'), more = $('[data-more]'), emptyEl = $('.cards__empty'), search = $('#rangeSearch');
    function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
    function apply(keepShown) {
      if (!keepShown) shown = PAGE;
      var words = norm(state.q).split(/\s+/).filter(Boolean), n = 0;
      cards.forEach(function (c) {
        var ok = (state.brand === 'all' || c.getAttribute('data-brand') === state.brand) &&
          (state.type === 'all' || c.getAttribute('data-type') === state.type) &&
          words.every(function (w) { return c.getAttribute('data-search').indexOf(w) >= 0; });
        if (ok) n++;
        c.classList.toggle('is-hidden', !ok || n > shown);
        c.toggleAttribute('data-match', ok);
      });
      countEl.textContent = n;
      more.hidden = n <= shown;
      more.textContent = 'Show more (' + (n - shown) + ' more)';
      emptyEl.hidden = n > 0;
      $$('.chips[data-filter]').forEach(function (g) {
        var key = g.getAttribute('data-filter');
        $$('.fchip', g).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === state[key] ? 'true' : 'false'); });
      });
      if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
    }
    $$('.chips[data-filter]').forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('.fchip'); if (!b) return;
        state[g.getAttribute('data-filter')] = b.getAttribute('data-value');
        apply();
      });
    });
    var t = 0;
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value; apply(); }, 120); });
    more.addEventListener('click', function () { shown += PAGE; apply(true); });
    function set(key, value) {
      state.brand = 'all'; state.type = 'all'; state.q = ''; search.value = '';
      state[key] = value; apply();
      scrollToEl($('#range'));
    }
    /* buttons in the scroll story */
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add-id]'), v = e.target.closest('[data-view-id]'), all = e.target.closest('[data-add-routine]');
      if (a && List) List.toggle(a.getAttribute('data-add-id'));
      else if (v) openViewer(v.getAttribute('data-view-id'), v);
      else if (all && List) {
        all.getAttribute('data-add-routine').split(' ').forEach(function (id) { if (!List.has(id)) List.add(id, true); });
        toast('The four routine products are in your list');
      }
    });
    doc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter-brand]'), ty = e.target.closest('[data-filter-type]');
      if (b) { e.preventDefault(); set('brand', b.getAttribute('data-filter-brand')); }
      else if (ty) { e.preventDefault(); set('type', ty.getAttribute('data-filter-type')); }
    });
    /* card buttons */
    $('#cards').addEventListener('click', function (e) {
      var card = e.target.closest('.card'); if (!card) return;
      var id = card.getAttribute('data-id');
      if (e.target.closest('[data-add]')) { if (List) List.toggle(id); }
      else if (e.target.closest('[data-view]') || e.target.closest('.card__art')) openViewer(id, card);
    });
    /* start fetching the 3D view as soon as a finger or mouse lands on a card */
    $('#cards').addEventListener('pointerdown', prefetchViewer, { passive: true, once: true });
    $('#cards').addEventListener('pointerover', prefetchViewer, { passive: true, once: true });
    /* sticky filter bar gets a line once it is stuck */
    var filters = $('.filters');
    if (filters && 'IntersectionObserver' in window) {
      var sentinel = doc.createElement('div'); sentinel.style.height = '1px';
      filters.parentNode.insertBefore(sentinel, filters);
      new IntersectionObserver(function (en) { filters.classList.toggle('is-stuck', !en[0].isIntersecting); }, { rootMargin: '-' + (70) + 'px 0px 0px 0px' }).observe(sentinel);
    }
    apply();
    return { set: set };
  });

  /* =========================================================
     3D PRODUCT VIEW (viewer.js, loaded when first needed)
     ========================================================= */
  var viewerMod = null;
  function prefetchViewer() { if (!viewerMod) viewerMod = import('./viewer.js'); return viewerMod; }
  function openViewer(id, fromEl) {
    var p = byId[id]; if (!p) return;
    prefetchViewer().then(function (m) {
      m.open(p, {
        from: fromEl, reduce: reduce, lenis: lenis,
        inList: function () { return List ? List.has(id) : false; },
        toggle: function () { if (List) List.toggle(id); },
        ask: mailto('Product question: ' + p.brandName + ' ' + p.name, 'Hi NexEra,\n\nI have a question about ' + p.brandName + ' ' + p.name + ':\n\nMy name:\n'),
        skin: skinTimeline,
        type: DATA.typeById[p.type]
      });
    }).catch(function (e) {
      if (window.console) console.error('[NexEra] 3D view:', e);
      toast('The 3D view could not start on this device.');
    });
  }

  /* =========================================================
     SKIN DIAGRAM ANIMATIONS (used by the routine story and the 3D view)
     ========================================================= */
  function skinTimeline(svg, step) {
    if (!hasGsap) return null;
    var q = function (s) { return $$(s, svg); };
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    if (step === 'cleanse') {
      tl.from(q('.sk-bubble'), { scale: 0, transformOrigin: '50% 50%', duration: 0.35, stagger: 0.04 }, 0)
        .from(q('.sk-lift'), { y: 62, duration: 0.6, stagger: 0.05, ease: 'power1.inOut' }, 0.2)
        .from(q('.sk-left'), { opacity: 0, duration: 0.3 }, 0.55);
    } else if (step === 'treat') {
      tl.from(q('.sk-drop'), { y: -90, opacity: 0, duration: 0.45, stagger: 0.07, ease: 'power2.in' }, 0)
        .from(q('.sk-band'), { scaleX: 0, opacity: 0, transformOrigin: '50% 0%', duration: 0.55 }, 0.35)
        .to(q('.sk-drop'), { y: 40, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power1.in' }, 0.55);
    } else if (step === 'moisturise') {
      tl.from(q('.sk-water'), { scale: 0, transformOrigin: '50% 50%', duration: 0.35, stagger: 0.03 }, 0)
        .from(q('.sk-film'), { scaleX: 0, transformOrigin: '50% 50%', duration: 0.5 }, 0.2)
        .from(q('.sk-arrow'), { y: 24, opacity: 0, duration: 0.4, stagger: 0.04 }, 0.45);
    } else if (step === 'protect') {
      tl.from(q('.sk-film'), { scaleX: 0, transformOrigin: '50% 50%', duration: 0.4 }, 0)
        .from(q('.sk-dot'), { opacity: 0, duration: 0.3, stagger: 0.01 }, 0.15)
        .fromTo(q('.sk-ray'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, stagger: 0.04, ease: 'power1.in' }, 0.3)
        .from(q('.sk-spark'), { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.04 }, 0.65);
    }
    return tl;
  }
  window.NEXSKIN = { skinTimeline: skinTimeline };

  if (!hasGsap) {
    root.classList.remove('js');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  safe('smooth scroll', setupSmoothScroll);
  safe('cover', setupCover);
  safe('story', setupStory);
  safe('headings', setupSplits);
  safe('reveals', setupReveals);
  safe('routine', setupRoutine);
  safe('marquee', setupMarquee);
  safe('number', setupStat);
  safe('steps', setupSteps);
  safe('nav', setupNavAndBar);
  safe('replay links', setupReplayLinks);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* =========================================================
     THE COVER (cover.js): 3D routine. The still picture stays if 3D cannot start.
     ========================================================= */
  function setupCover() {
    var hero = $('.hero'), fade = $('.hero__fade', hero);
    var settled = false;
    function still() {
      if (settled) return; settled = true;
      gsap.to(fade, { opacity: 0, duration: 0.6 });
    }
    if (reduce) { fade.style.opacity = 0; return; }
    var fallback = setTimeout(still, reduce ? 0 : 3200);
    import('./cover.js').then(function (m) {
      return m.start(hero, {
        reduce: reduce,
        canAutoplay: function () { return !settled; },
        onReady: function () { clearTimeout(fallback); settled = true; },
        state: heroState
      });
    }).then(function (api) { cover = api; })
      .catch(function (e) { if (window.console) console.error('[NexEra] 3D cover:', e); still(); });
  }

  /* =========================================================
     SMOOTH SCROLL AND ANCHOR LINKS
     ========================================================= */
  function setupSmoothScroll() {
    if (!reduce && typeof window.Lenis !== 'undefined') {
      lenis = new Lenis({ lerp: 0.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    }
    $$('a[href^="#"]').forEach(function (a) {
      if (a.classList.contains('skip') || a.hasAttribute('data-replay') || a.hasAttribute('data-filter-brand') || a.hasAttribute('data-filter-type')) return;
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var el = id === '#top' ? null : $(id); if (id !== '#top' && !el) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(el || 0, { duration: 1.4 });
        else if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        else window.scrollTo(0, 0);
        if (el) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
      });
    });
  }

  /* =========================================================
     HEADINGS THAT BUILD WORD BY WORD, AND GENTLE REVEALS
     ========================================================= */
  function setupSplits() {
    $$('[data-split]').forEach(function (h) {
      var text = h.textContent.trim().replace(/\s+/g, ' ');
      h.setAttribute('aria-label', text);
      h.innerHTML = text.split(' ').map(function (w) { return '<span class="w" aria-hidden="true"><span class="w__i">' + esc(w) + '</span></span>'; }).join(' ');
      if (reduce) return;
      gsap.from($$('.w__i', h), { yPercent: 112, duration: 1.1, ease: 'power4.out', stagger: 0.055, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
  }
  function setupReveals() {
    if (reduce) return;
    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, { y: 36, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-reveal-stagger]').forEach(function (list) {
      gsap.from(list.children, { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, scrollTrigger: { trigger: list, start: 'top 88%', once: true } });
    });
    var first = true;
    ScrollTrigger.create({
      trigger: '#cards', start: 'top 85%', once: true,
      onEnter: function () { if (!first) return; first = false; gsap.from($$('#cards .card:not(.is-hidden)').slice(0, 8), { y: 40, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' }); }
    });
  }

  /* =========================================================
     THE SCROLL STORY (story.js): hang tag, the drop through NEXERA, one product
     per step, into the bag. With reduced motion, or if 3D cannot start, the
     still photos in the page stay.
     ========================================================= */
  function setupStory() {
    var story = $('#story');
    if (!story || reduce) return;
    import('./story.js').then(function (m) { return m.start(story); })
      .catch(function (e) { if (window.console) console.error('[NexEra] scroll story:', e); });
  }

  /* =========================================================
     01 INSIDE YOUR ROUTINE: four steps play in one pinned screen
     ========================================================= */
  function setupRoutine() {
    var sec = $('#routine'), steps = $$('.rstep', sec), bars = $$('.routine__progress i', sec);
    if (!steps.length) return;
    var tls = steps.map(function (li) { return skinTimeline($('.skin', li), li.getAttribute('data-step')); });
    if (reduce) return;
    sec.classList.add('is-pinned');
    var active = -1;
    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
      gsap.fromTo($('.rstep__text', steps[i]).children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: true });
    }
    setActive(0);
    ScrollTrigger.create({
      trigger: $('.routine__pin', sec), start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 3.2); }, pin: true, scrub: true,
      onUpdate: function (self) {
        var p = self.progress * 4, i = clamp(Math.floor(p), 0, 3);
        setActive(i);
        tls.forEach(function (tl, k) { if (tl) tl.progress(clamp((p - k) / 0.75, 0, 1)); });
        bars.forEach(function (b, k) { b.style.setProperty('--p', clamp(p - k, 0, 1).toFixed(3)); });
      }
    });
  }

  /* =========================================================
     MARQUEE (speed and direction follow your scroll)
     ========================================================= */
  function setupMarquee() {
    var track = $('.marquee__track'); if (!track) return;
    var group = $('.marquee__group', track), gw = group.offsetWidth || 1000;
    var copies = Math.max(2, Math.ceil((window.innerWidth * 2) / gw) + 1);
    for (var i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));
    if (reduce) return;
    var x = 0, dir = 1, lastY = window.scrollY, lastT = 0, vel = 0, on = false, raf = 0;
    function measure() { gw = group.offsetWidth || gw; }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    function tick(now) {
      raf = 0;
      var t = now / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 0; lastT = t;
      var y = window.scrollY, dy = y - lastY; lastY = y;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
      vel += ((dt ? Math.abs(dy) / dt : 0) - vel) * 0.1;
      x -= dir * (55 + vel * 0.4) * dt;
      if (x <= -gw) x += gw; if (x > 0) x -= gw;
      track.style.transform = 'translate3d(' + r1(x) + 'px,0,0)';
      if (on) raf = requestAnimationFrame(tick);
    }
    onVisible(track.parentNode, function (vis) { on = vis; if (vis && !raf) { lastT = 0; lastY = window.scrollY; raf = requestAnimationFrame(tick); } });
  }

  /* =========================================================
     02 THE NUMBER: 97 counts up while the sun's rays draw in
     ========================================================= */
  function setupStat() {
    var val = $('.stat__value'), rays = $$('.stat__rays path');
    if (!val || reduce) return;
    var target = +val.getAttribute('data-count') || 97, o = { p: 0 };
    var sr = doc.createElement('span'); sr.className = 'sr-only'; sr.textContent = target + '%';
    val.parentNode.parentNode.insertBefore(sr, val.parentNode);
    val.parentNode.setAttribute('aria-hidden', 'true');
    rays.forEach(function (r) { r.style.strokeDasharray = '1'; });
    function paint() {
      val.textContent = Math.round(o.p * target);
      for (var i = 0; i < rays.length; i++) rays[i].style.strokeDashoffset = (1 - clamp(o.p * 1.4 - i / rays.length * 0.4, 0, 1)).toFixed(3);
    }
    paint();
    gsap.to(o, { p: 1, ease: 'none', onUpdate: paint, scrollTrigger: { trigger: '.stat__sun', start: 'top 82%', end: 'center 45%', scrub: 0.6 } });
    gsap.to('.stat__rays', { rotate: 30, transformOrigin: '50% 50%', ease: 'none', scrollTrigger: { trigger: '.stat', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* =========================================================
     ORDERING: each card eases back as the next one stacks on it
     ========================================================= */
  function setupSteps() {
    if (reduce) return;
    var steps = $$('.step');
    steps.forEach(function (s, i) {
      var next = steps[i + 1]; if (!next) return;
      gsap.to(s, { scale: 0.94, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', scrub: true, end: function () { return 'top ' + (parseFloat(getComputedStyle(next).top) || 100) + 'px'; } } });
    });
  }

  /* =========================================================
     NAV COLOURS AND THE PHONE BAR
     ========================================================= */
  function setupNavAndBar() {
    var nav = $('#nav'), bar = $('.phonebar'), secs = $$('[data-nav]');
    var routine = $('#story') || $('#routine'), fin = $('#start'), pending = false;
    function update() {
      pending = false;
      var theme = null, probe = 34;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { theme = secs[i].getAttribute('data-nav'); break; }
      }
      if (!theme) theme = heroState.flood > 0.55 ? 'paper' : 'night';
      nav.setAttribute('data-theme', theme);
      nav.classList.toggle('is-solid', window.scrollY > 40);
      if (bar && routine && fin) {
        var vh = window.innerHeight;
        bar.classList.toggle('is-on', routine.getBoundingClientRect().top < vh * 0.6 && fin.getBoundingClientRect().top > vh * 0.7);
      }
    }
    function queue() { if (!pending) { pending = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  /* =========================================================
     "REPLAY THE INTRO": back to the top, then play the cover again
     ========================================================= */
  function setupReplayLinks() {
    $$('[data-replay]').forEach(function (a) {
      if (reduce) { var li = a.closest('li'); (li || a).hidden = true; return; }
      a.addEventListener('click', function (e) {
        if (!cover || !cover.replay) return;
        e.preventDefault();
        var done = false;
        function go() { if (!done) { done = true; cover.replay(); } }
        if (window.scrollY < 4) { go(); return; }
        if (lenis) { lenis.scrollTo(0, { duration: 1.2, onComplete: go }); setTimeout(go, 1700); }
        else { window.scrollTo(0, 0); setTimeout(go, 60); }
      });
    });
  }
})();
