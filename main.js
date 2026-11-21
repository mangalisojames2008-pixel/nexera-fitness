/* =========================================================
   NexEra Fitness: page script
   Each part starts on its own, so one failure never blanks the page.
   ========================================================= */
(function () {
  'use strict';
  window.NEXFIT_READY = true;

  var EMAIL = 'nexeracommerce@gmail.com';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var R = window.NexRunner;
  var lenis = null;
  var heroState = null;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function safe(name, fn) { try { return fn(); } catch (e) { if (window.console) console.error('[NexEra] ' + name + ':', e); return null; } }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mailto(subject, body) { return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function onVisible(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) { cb(entries[0].isIntersecting); }, { rootMargin: '80px 0px' }).observe(el);
  }

  /* ---------- 1. Email links: subject and a short message filled in ---------- */
  safe('email links', function () {
    $$('[data-mail]').forEach(function (a) {
      var product = a.getAttribute('data-product');
      a.href = product
        ? mailto('Product enquiry: ' + product, 'Hi NexEra,\n\nI am interested in ' + product + '. Please send me the price and delivery details.\n\nMy name:\nMy area:\n')
        : mailto('Hello NexEra', 'Hi NexEra,\n\nMy fitness goal is:\n\nI would like to know more about:\n\nMy name:\n');
    });
  });

  /* ---------- 2. Review form: opens the visitor's email app with the review written in ---------- */
  safe('review form', function () {
    var form = $('#reviewForm');
    if (!form) return;
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
      var subject = 'NexEra review: ' + stars + (stars === 1 ? ' star' : ' stars') + ' from ' + name;
      var body = 'Rating: ' + line + ' (' + stars + ' out of 5)\nFirst name: ' + name + '\n\nReview:\n' + text +
        '\n\nNexEra may show my first name and review on the website: ' + (consent ? 'Yes' : 'No') + '\n';
      window.location.href = mailto(subject, body);
      status.textContent = 'Thank you, ' + name + '. Your email app should open now with your review ready. Press send there. If nothing opened, email it to ' + EMAIL + '.';
    });
  });

  /* ---------- 3. The cover scene ---------- */
  var scene = safe('cover scene', buildScene);

  if (!hasGsap) {
    root.classList.remove('js');
    if (scene) safe('cover still', scene.still);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  safe('smooth scroll', setupSmoothScroll);
  safe('cover animation', function () { if (scene) scene.play(); });
  safe('headings', setupSplits);
  safe('reveals', setupReveals);
  safe('tiny runner', setupMiniRunner);
  safe('marquee', setupMarquee);
  safe('number', setupStat);
  safe('steps', setupSteps);
  safe('nav', setupNavAndBar);
  safe('replay links', setupReplayLinks);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* =========================================================
     THE COVER: scenery, runner, sun and the story timeline
     ========================================================= */
  function buildScene() {
    var hero = $('.hero');
    if (!hero || !R) return null;
    var els = {
      dawn: $('.sky--dawn', hero), stars: $('.stars', hero), sun: $('.sun', hero),
      disc: $('.sun__disc', hero), glow: $('.sun__glow', hero), landDawn: $('.land__dawn', hero),
      pathGlow: $('.path__glow', hero), runnerWrap: $('.runner-wrap', hero), notif: $('.notif', hero),
      flood: $('.flood', hero), fade: $('.hero__fade', hero), ui: $('.hero__ui', hero),
      clock: $('.hero__clock', hero), time: $('.hero__time', hero), when: $('.hero__when', hero),
      wordWrap: $('.hero__word-wrap', hero), word: $('.word', hero), letters: $$('.word__l', hero),
      line: $('.hero__line', hero), ctas: $$('.hero__ctas .btn', hero), skip: $('.hero__skip', hero),
      scroll: $('.hero__scroll', hero), nav: $('#nav'), tag: $('.beacon-tag', hero)
    };
    els.skipLabel = $('.hero__skip-label', els.skip) || els.skip;
    var layerEls = {
      skyline: $('.layer--skyline', hero), trees: $('.layer--trees', hero), lamps: $('.layer--lamps', hero),
      dashes: $('.layer--dashes', hero), tufts: $('.layer--tufts', hero)
    };
    var runner = new R.Runner($('.runner', hero));
    hero.classList.add('is-live');

    /* state the timeline animates; draw() turns it into the picture */
    var S = { dawn: 0, travel: 0, sunDot: 0, sunGrow: 0, glow: 0, go: 0, w: 0, speed: 0, phone: 1, face: 1, buzz: 0, cardA: 0, cardY: 18, fly: 0, flood: 0, clock: 42 };
    heroState = S;
    var still = R.copyPose(R.POSES.phone);
    var pose = {}, runP = {};
    var phase = 0, world = 0, lastT = 0, running = false, raf = 0, visible = true;
    var g = {}, layers = [], nightEls = [], lastClock = -1, lastWhen = '';
    var tl = null, ended = false, relaxTween = null;

    function measure() {
      var cs = getComputedStyle(hero);
      g.W = hero.clientWidth; g.H = hero.clientHeight;
      g.hz = parseFloat(cs.getPropertyValue('--hz')) || 0.68;
      g.py = parseFloat(cs.getPropertyValue('--py')) || 0.78;
      g.portrait = g.W / g.H < 0.8;
      g.rh = els.runnerWrap.getBoundingClientRect().height || g.H * 0.25;
      g.rw = g.rh * 120 / 124;
      g.sunEnd = g.portrait ? Math.min(0.15 * g.H, 0.32 * g.W) : Math.min(0.2 * g.H, 0.33 * g.W);
      g.dot = Math.max(6, Math.min(g.W, g.H) * 0.011);
      g.rx0 = g.portrait ? 0.24 : 0.27; g.rx1 = g.portrait ? 0.33 : 0.42;
      g.sx0 = g.portrait ? 0.84 : 0.86; g.sx1 = g.portrait ? 0.73 : 0.63;
      g.notifW = els.notif.offsetWidth; g.notifH = els.notif.offsetHeight;
    }

    /* ----- scenery, drawn in code and repeated sideways ----- */
    function skylineTile(rand) {
      var d = '', lit = '', x = 0;
      while (x < 1190) {
        var w = 34 + rand() * 76; if (x + w > 1200) w = 1200 - x;
        var h = 40 + Math.pow(rand(), 1.6) * 170, top = 220 - h;
        d += 'M' + r1(x) + ' 221V' + r1(top) + 'H' + r1(x + w) + 'V221Z';
        if (w > 40 && rand() < 0.35) {
          var iw = w * (0.3 + rand() * 0.3), ix = x + (w - iw) / 2, ih = 8 + rand() * 22;
          d += 'M' + r1(ix) + ' ' + r1(top + 1) + 'V' + r1(top - ih) + 'H' + r1(ix + iw) + 'V' + r1(top + 1) + 'Z';
        }
        if (rand() < 0.22) { var ax = x + w * (0.3 + rand() * 0.4); d += 'M' + r1(ax) + ' ' + r1(top + 1) + 'V' + r1(top - 14 - rand() * 26) + 'h2V' + r1(top + 1) + 'Z'; }
        for (var wy = top + 10; wy < 206; wy += 14) {
          for (var wx = x + 6; wx < x + w - 9; wx += 11) { if (rand() < 0.09) lit += 'M' + r1(wx) + ' ' + r1(wy) + 'h4v6h-4Z'; }
        }
        x += w + (rand() < 0.25 ? rand() * 18 : 0);
      }
      return '<path d="' + d + '" fill="currentColor"/><path class="lit" d="' + lit + '"/>';
    }
    function circ(cx, cy, r) { return 'M' + r1(cx - r) + ' ' + r1(cy) + 'a' + r1(r) + ' ' + r1(r) + ' 0 1 0 ' + r1(2 * r) + ' 0a' + r1(r) + ' ' + r1(r) + ' 0 1 0 ' + r1(-2 * r) + ' 0Z'; }
    function treesTile(rand) {
      var d = '', x = 14;
      while (x < 986) {
        var r = 11 + rand() * 18, h = 26 + rand() * 46, base = 121, cy = base - h;
        d += 'M' + r1(x - 1.6) + ' ' + base + 'V' + r1(cy) + 'h3.2V' + base + 'Z';
        d += circ(x, cy, r) + circ(x - r * 0.62, cy + r * 0.5, r * 0.72) + circ(x + r * 0.6, cy + r * 0.45, r * 0.7);
        if (rand() < 0.5) d += circ(x + r * 2.2, base - 6, 9 + rand() * 8);
        x += r * 2 + 8 + rand() * 70;
      }
      return '<path d="' + d + '" fill="currentColor"/>';
    }
    function lampsTile() {
      return '<circle class="lamp-glow" cx="284" cy="46" r="74"/>' +
        '<ellipse class="lit" cx="284" cy="299" rx="70" ry="5" opacity=".18"/>' +
        '<path d="M247.5 301V44c0-14 10-22 24-22h14v6h-14c-10 0-16 6-16 16v257Z" fill="currentColor"/>' +
        '<path d="M272 26h26l-4 10h-18Z" fill="currentColor"/>' +
        '<rect class="lit" x="277" y="35" width="14" height="3" rx="1.5"/>';
    }
    function dashTile() {
      var s = '';
      for (var i = 0; i < 16; i++) s += '<rect x="' + (i * 80) + '" y="3" width="40" height="3" rx="1.5"/>';
      return '<g fill="currentColor">' + s + '</g>';
    }
    function tuftsTile(rand) {
      var d = '', x = 20;
      while (x < 880) {
        var n = 3 + Math.floor(rand() * 4);
        for (var i = 0; i < n; i++) {
          var bx = x + i * 4 + rand() * 3, h = 10 + rand() * 24, lean = (rand() - 0.5) * 10;
          d += 'M' + r1(bx) + ' 41L' + r1(bx + 1.6 + lean) + ' ' + r1(41 - h) + 'L' + r1(bx + 3.4) + ' 41Z';
        }
        x += 60 + rand() * 140;
      }
      return '<path d="' + d + '" fill="currentColor"/>';
    }
    function makeLayer(el, tile, seed, o) {
      var k = o.hPx / o.hU, tilePx = o.tU * k;
      var copies = Math.ceil(g.W / tilePx) + 1;
      var inner = tile(rng(seed)), body = '';
      for (var i = 0; i < copies; i++) body += '<g transform="translate(' + (o.tU * i) + ' 0)">' + inner + '</g>';
      el.innerHTML = '<svg width="' + r1(tilePx * copies) + '" height="' + r1(o.hPx) + '" viewBox="0 0 ' + (o.tU * copies) + ' ' + o.hU + '" focusable="false">' + body + '</svg>';
      layers.push({ el: el, f: o.f, tile: tilePx, top: o.bottom - o.hPx });
      nightEls = nightEls.concat($$('.lit, .lamp-glow', el));
    }
    function buildLayers() {
      layers = []; nightEls = [];
      var H = g.H, hzY = g.hz * H, pyY = g.py * H;
      makeLayer(layerEls.skyline, skylineTile, 11, { hU: 222, tU: 1200, hPx: H * (g.portrait ? 0.12 : 0.17), bottom: hzY + 3, f: 0.06 });
      makeLayer(layerEls.trees, treesTile, 23, { hU: 122, tU: 1000, hPx: H * (g.portrait ? 0.075 : 0.095), bottom: hzY + (pyY - hzY) * 0.5, f: 0.24 });
      makeLayer(layerEls.lamps, lampsTile, 5, { hU: 302, tU: 560, hPx: g.rh * 1.32, bottom: pyY + 1, f: 0.82 });
      makeLayer(layerEls.dashes, dashTile, 7, { hU: 10, tU: 1280, hPx: Math.max(6, H * 0.008), bottom: pyY + Math.max(14, H * 0.02), f: 1 });
      makeLayer(layerEls.tufts, tuftsTile, 31, { hU: 42, tU: 900, hPx: H * 0.045, bottom: pyY + H * 0.075, f: 1.35 });
      var stars = '', rand = rng(99);
      for (var i = 0; i < 90; i++) {
        var x = rand() * 1600, y = Math.pow(rand(), 1.25) * 620, r = 0.6 + rand() * 1.3, o = 0.25 + rand() * 0.75;
        stars += '<circle' + (rand() < 0.28 ? ' class="tw" style="animation-delay:-' + r1(rand() * 3.2) + 's"' : '') + ' cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '" opacity="' + r1(o) + '"/>';
      }
      els.stars.innerHTML = '<svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" focusable="false">' + stars + '</svg>';
    }

    /* ----- turn the state into the picture ----- */
    function draw(t) {
      var W = g.W, H = g.H;
      t = t || 0;
      var night = 1 - S.dawn;
      els.dawn.style.opacity = S.dawn;
      els.stars.style.opacity = 0.12 + 0.88 * night;
      els.landDawn.style.opacity = S.dawn;
      els.pathGlow.style.opacity = S.dawn;
      for (var n = 0; n < nightEls.length; n++) nightEls[n].style.opacity = night;

      var sx = lerp(g.sx0, g.sx1, S.travel) * W;
      var sy = (g.hz - lerp(0.016, 0, S.travel)) * H;
      var r = S.sunDot * g.dot + S.sunGrow * (g.sunEnd - g.dot);
      els.sun.style.transform = 'translate3d(' + r1(sx) + 'px,' + r1(sy) + 'px,0)';
      els.disc.style.transform = 'scale(' + (r / 200).toFixed(4) + ')';
      els.glow.style.transform = 'scale(' + (Math.max(r, g.dot * 4) / 200 * S.glow).toFixed(4) + ')';
      var tagA = S.sunDot * (1 - clamp((S.travel - 0.45) / 0.3, 0, 1));
      els.tag.style.opacity = r1(tagA * 100) / 100;
      if (tagA > 0.001) els.tag.style.transform = 'translate3d(' + r1(sx) + 'px,' + r1(sy - r - 14) + 'px,0) translate(-50%,-100%)';

      if (S.flood > 0.001) {
        var big = Math.sqrt(Math.pow(Math.max(sx, W - sx), 2) + Math.pow(Math.max(sy, H - sy), 2));
        els.flood.style.transform = 'translate3d(' + r1(sx - 50) + 'px,' + r1(sy - 50) + 'px,0) scale(' + (S.flood * big / 41).toFixed(3) + ')';
      } else {
        els.flood.style.transform = 'scale(0)';
      }

      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        var x = -((world * L.f) % L.tile);
        L.el.style.transform = 'translate3d(' + r1(x) + 'px,' + r1(L.top) + 'px,0)';
      }

      var rx = lerp(g.rx0, g.rx1, S.go) * W;
      els.runnerWrap.style.transform = 'translate3d(' + r1(rx - g.rw / 2) + 'px,' + r1(g.py * H - g.rh * R.FEET) + 'px,0)';

      if (runner.phone) {
        runner.phone.style.opacity = S.phone;
        runner.phone.setAttribute('transform', 'translate(0 15) rotate(' + r1(-62 + Math.sin(t * 75) * 11 * S.buzz) + ')');
      }
      if (runner.glow) runner.glow.style.opacity = S.face * (0.85 + 0.15 * Math.sin(t * 3.3));

      if (S.cardA > 0.001 && S.fly < 0.999) {
        var headTop = g.py * H - g.rh * 0.8;
        var cx0 = clamp(rx + g.rw * 0.15, g.notifW / 2 + 16, W - g.notifW / 2 - 16);
        var cy0 = Math.max(headTop - 26 - g.notifH / 2, 86 + g.notifH / 2);
        var cx = lerp(cx0, sx, S.fly), cy = lerp(cy0, sy, S.fly);
        els.notif.style.opacity = S.cardA * (1 - clamp((S.fly - 0.72) / 0.28, 0, 1));
        els.notif.style.transform = 'translate3d(' + r1(cx - g.notifW / 2) + 'px,' + r1(cy - g.notifH / 2 + S.cardY) + 'px,0) scale(' + lerp(1, 0.04, S.fly).toFixed(3) + ')';
      } else {
        els.notif.style.opacity = 0;
      }

      var m = Math.round(S.clock);
      if (m !== lastClock) { els.time.textContent = '05:' + (m < 10 ? '0' : '') + m; lastClock = m; }
      var when = S.dawn > 0.45 ? 'Sunrise' : 'Before sunrise';
      if (when !== lastWhen) { els.when.textContent = when; lastWhen = when; }
    }

    function frame(now) {
      raf = 0;
      var t = now / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 0;
      lastT = t;
      phase += S.speed * dt;
      world += S.speed * dt * R.STRIDE * (g.rh / 124);
      if (S.w > 0.001) R.lerpPose(still, R.runPose(phase, runP), S.w, pose);
      else R.copyPose(still, pose);
      if (!reduce) {
        var b = Math.sin(t * 2.1) * (1 - S.w);
        pose.lean += b * 0.7; pose.head += b * 0.5; pose.nU += b * 1.2; pose.fU -= b * 1.2;
      }
      runner.set(pose);
      draw(t);
      if (running) raf = requestAnimationFrame(frame);
    }
    function startLoop() { if (!running && !reduce) { running = true; lastT = 0; raf = requestAnimationFrame(frame); } }
    function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function drawOnce() { frame(performance.now()); }

    measure();
    buildLayers();
    drawOnce();

    var lastW = g.W, lastH = g.H, rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        measure();
        if (g.W !== lastW || Math.abs(g.H - lastH) > 90) { buildLayers(); lastW = g.W; lastH = g.H; }
        if (!running) drawOnce();
      }, 120);
    });

    /* the still final frame: reduced motion, or no animation library */
    function still_() {
      S.dawn = 1; S.travel = 1; S.sunDot = 1; S.sunGrow = 1; S.glow = 1; S.go = 1; S.w = 0; S.speed = 0;
      S.phone = 0; S.face = 0; S.cardA = 0; S.clock = 58;
      R.copyPose(R.POSES.armsUp, still);
      els.fade.style.opacity = 0;
      drawOnce();
    }

    function onEnd() {
      if (ended) return;
      ended = true;
      els.sun.classList.remove('is-beacon');
      els.skipLabel.textContent = 'Replay';
      els.skip.classList.add('is-replay');
      els.skip.setAttribute('aria-label', 'Replay the intro');
      if (!reduce) relaxTween = gsap.to(still, Object.assign({ duration: 1.1, ease: 'power2.inOut', delay: 1.4 }, R.POSES.relax));
    }

    function buildTimeline() {
      var P = R.POSES;
      function pose(name, extra) { return Object.assign({}, P[name], extra); }
      function wordOffset(axis) {
        return function () {
          var wr = els.wordWrap.getBoundingClientRect(), hr = hero.getBoundingClientRect();
          var cx = wr.left - hr.left + wr.width / 2, cy = wr.top - hr.top + wr.height / 2;
          return axis === 'x' ? g.sx1 * g.W - cx : g.hz * g.H - cy;
        };
      }
      els.skip.hidden = false;
      tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      tl.to(els.fade, { opacity: 0, duration: 1, ease: 'power1.out' }, 0)
        .fromTo(els.nav, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.6, immediateRender: true }, 8.0)
        .fromTo(els.clock, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3)
        .fromTo(els.skip, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.5)
        /* the phone buzzes, the message arrives */
        .to(S, { buzz: 1, duration: 0.1, ease: 'none' }, 0.95)
        .to(S, { buzz: 0, duration: 0.55, ease: 'power1.in' }, 1.3)
        .fromTo(S, { cardA: 0, cardY: 18 }, { cardA: 1, cardY: 0, duration: 0.6, ease: 'back.out(1.7)' }, 1.15)
        /* they look up, the message flies to the horizon and becomes the sun */
        .to(still, pose('look', { duration: 0.5, ease: 'power2.inOut' }), 2.2)
        .to(S, { fly: 1, duration: 0.75, ease: 'power2.in' }, 2.5)
        .to(S, { sunDot: 1, duration: 0.55, ease: 'back.out(3)' }, 3.18)
        .to(S, { glow: 1, duration: 0.7 }, 3.18)
        .call(function () { els.sun.classList.add('is-beacon'); }, null, 3.2)
        /* phone away, and run */
        .to(S, { phone: 0, face: 0, duration: 0.3 }, 3.3)
        .to(still, pose('ready', { duration: 0.35, ease: 'power2.inOut' }), 3.35)
        .to(S, { w: 1, duration: 0.45, ease: 'power1.inOut' }, 3.65)
        .to(S, { speed: 1.45, duration: 0.7, ease: 'power2.in' }, 3.65)
        .to(S, { dawn: 1, duration: 3.4, ease: 'power1.inOut' }, 3.8)
        .to(S, { travel: 1, duration: 3.5, ease: 'power1.inOut' }, 3.8)
        .to(S, { sunGrow: 1, duration: 3.5, ease: 'power2.in' }, 3.8)
        .to(S, { go: 1, duration: 3.4, ease: 'power1.inOut' }, 3.7)
        .to(S, { clock: 58, duration: 3.4, ease: 'none' }, 3.7)
        /* arrive, arms up */
        .to(S, { speed: 0, duration: 0.9, ease: 'power2.out' }, 6.7)
        .to(S, { w: 0, duration: 0.55, ease: 'power2.inOut' }, 7.05)
        .to(still, pose('armsUp', { duration: 0.65, ease: 'back.out(1.4)' }), 7.1)
        /* NEXERA grows out of the sun */
        .fromTo(els.word, { x: wordOffset('x'), y: wordOffset('y'), scale: 0.04, autoAlpha: 0 },
          { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 1.35, ease: 'expo.out', immediateRender: true }, 7.2)
        .fromTo(els.letters, { yPercent: 45, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 7.25)
        .fromTo(els.line, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 8.0)
        .fromTo(els.ctas, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 8.15)
        .fromTo(els.scroll, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 8.5)
        .call(onEnd, null, 8.8);
      return tl;
    }

    function hurry() { if (tl && !ended && tl.timeScale() < 4) tl.timeScale(5); }

    /* play the whole cover again from the start */
    function replay() {
      if (!tl) return false;
      if (relaxTween) relaxTween.kill();
      ended = false;
      els.skipLabel.textContent = 'Skip intro';
      els.skip.classList.remove('is-replay');
      els.skip.removeAttribute('aria-label');
      world = 0; phase = 0;
      tl.timeScale(1).restart();
      startLoop();
      return true;
    }

    function play() {
      if (reduce) {
        els.skip.hidden = true;
        still_();
        if (els.nav) els.nav.style.opacity = 1;
        return;
      }
      var started = false;
      function go() {
        if (started) return;
        started = true;
        try {
          measure();
          buildTimeline();
          startLoop();
          tl.play(0);
        } catch (e) {
          if (window.console) console.error('[NexEra] cover timeline:', e);
          if (tl) tl.kill();
          gsap.set([els.nav, els.clock, els.word, els.letters, els.line, els.ctas, els.scroll], { clearProps: 'all' });
          els.skip.hidden = true;
          still_();
        }
      }
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go);
      setTimeout(go, 1600);

      onVisible(hero, function (on) { visible = on; if (on) startLoop(); else stopLoop(); });

      els.skip.addEventListener('click', function () {
        if (!tl) return;
        if (!ended) { tl.timeScale(1).progress(1); onEnd(); return; }
        replay();
      });
      window.addEventListener('wheel', hurry, { passive: true });
      window.addEventListener('touchmove', hurry, { passive: true });
      window.addEventListener('keydown', function (e) { if (/^( |PageDown|ArrowDown|End|Spacebar)$/.test(e.key)) hurry(); });
      window.addEventListener('scroll', function () { if (window.scrollY > 8) hurry(); }, { passive: true });

      /* leaving the cover: the sunlight floods the screen */
      gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=85%', pin: true, scrub: true }
      })
        .to(els.ui, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 0)
        .to(els.wordWrap, { scale: 1.4, duration: 0.55, ease: 'power1.in' }, 0)
        .to(S, { flood: 1, duration: 1, ease: 'power2.in' }, 0);
    }

    return { play: play, still: still_, state: S, replay: replay };
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
      if (a.classList.contains('skip') || a.hasAttribute('data-replay')) return;
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var el = id === '#top' ? null : $(id);
        if (id !== '#top' && !el) return;
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
      h.innerHTML = text.split(' ').map(function (w) {
        return '<span class="w" aria-hidden="true"><span class="w__i">' + esc(w) + '</span></span>';
      }).join(' ');
      if (reduce) return;
      gsap.from($$('.w__i', h), {
        yPercent: 112, duration: 1.1, ease: 'power4.out', stagger: 0.055,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
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
  }

  /* =========================================================
     THE TINY RUNNER INSIDE "Keep ... going." (runs faster when you scroll faster)
     ========================================================= */
  function setupMiniRunner() {
    var pill = $('.pill-run');
    if (!pill || !R) return;
    var svg = $('.runner--mini', pill), dash = $('.pill-run__dash', pill);
    var mini = new R.Runner(svg), p = {};
    var phase = 0.2, off = 0, vel = 0, lastY = window.scrollY, lastT = 0, on = false, raf = 0, h = 40;
    if (reduce) return;
    gsap.fromTo(pill, { width: 0 }, { width: '2em', ease: 'none', scrollTrigger: { trigger: pill, start: 'top 95%', end: 'top 60%', scrub: true } });
    function measure() { h = svg.getBoundingClientRect().height || 40; }
    function tick(now) {
      raf = 0;
      var t = now / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 0;
      lastT = t;
      var y = window.scrollY, v = dt ? Math.abs(y - lastY) / dt : 0;
      lastY = y;
      vel += (v - vel) * 0.08;
      var speed = 1.1 + Math.min(2.8, vel / 800);
      phase += speed * dt;
      off += speed * dt * R.STRIDE * (h / 124);
      mini.set(R.runPose(phase, p));
      dash.style.transform = 'translate3d(' + r1(-(off % 30)) + 'px,0,0)';
      if (on) raf = requestAnimationFrame(tick);
    }
    measure();
    window.addEventListener('resize', measure);
    onVisible(pill, function (vis) {
      on = vis;
      if (vis && !raf) { measure(); lastT = 0; raf = requestAnimationFrame(tick); }
    });
  }

  /* =========================================================
     MARQUEE (speed and direction follow your scroll)
     ========================================================= */
  function setupMarquee() {
    var track = $('.marquee__track');
    if (!track) return;
    var group = $('.marquee__group', track);
    var gw = group.offsetWidth || 1000;
    var copies = Math.max(2, Math.ceil((window.innerWidth * 2) / gw) + 1);
    for (var i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));
    if (reduce) return;
    var x = 0, dir = 1, lastY = window.scrollY, lastT = 0, vel = 0, on = false, raf = 0;
    function measure() { gw = group.offsetWidth || gw; }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    function tick(now) {
      raf = 0;
      var t = now / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 0;
      lastT = t;
      var y = window.scrollY, dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
      vel += ((dt ? Math.abs(dy) / dt : 0) - vel) * 0.1;
      x -= dir * (55 + vel * 0.4) * dt;
      if (x <= -gw) x += gw;
      if (x > 0) x -= gw;
      track.style.transform = 'translate3d(' + r1(x) + 'px,0,0)';
      if (on) raf = requestAnimationFrame(tick);
    }
    onVisible(track.parentNode, function (vis) {
      on = vis;
      if (vis && !raf) { lastT = 0; lastY = window.scrollY; raf = requestAnimationFrame(tick); }
    });
  }

  /* =========================================================
     THE NUMBER: 150 counts up while the ring draws in five parts
     ========================================================= */
  function setupStat() {
    var arcs = $$('.stat__arcs circle'), val = $('.stat__value');
    if (!arcs.length || !val || reduce) return;
    var SEG = 172.8, target = +val.getAttribute('data-count') || 150, o = { p: 0 };
    var sr = doc.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = String(target);
    val.parentNode.insertBefore(sr, val);
    val.setAttribute('aria-hidden', 'true');
    function paint() {
      for (var i = 0; i < arcs.length; i++) arcs[i].style.strokeDashoffset = SEG * (1 - clamp(o.p * arcs.length - i, 0, 1));
      val.textContent = Math.round(o.p * target);
    }
    paint();
    gsap.to(o, {
      p: 1, ease: 'none', onUpdate: paint,
      scrollTrigger: { trigger: '.stat__ring', start: 'top 82%', end: 'center 42%', scrub: 0.6 }
    });
  }

  /* =========================================================
     HOW IT WORKS: each card eases back as the next one stacks on it
     ========================================================= */
  function setupSteps() {
    if (reduce) return;
    var steps = $$('.step');
    steps.forEach(function (s, i) {
      var next = steps[i + 1];
      if (!next) return;
      gsap.to(s, {
        scale: 0.94, ease: 'none',
        scrollTrigger: {
          trigger: next, start: 'top bottom', scrub: true,
          end: function () { return 'top ' + (parseFloat(getComputedStyle(next).top) || 100) + 'px'; }
        }
      });
    });
  }

  /* =========================================================
     "REPLAY THE INTRO" LINKS: back to the top, then play the cover again
     ========================================================= */
  function setupReplayLinks() {
    $$('[data-replay]').forEach(function (a) {
      if (reduce) { var li = a.closest('li'); (li || a).hidden = true; return; }
      a.addEventListener('click', function (e) {
        if (!scene || !scene.replay) return;
        e.preventDefault();
        var done = false;
        function go() { if (!done) { done = true; scene.replay(); } }
        if (window.scrollY < 4) { go(); return; }
        if (lenis) { lenis.scrollTo(0, { duration: 1.2, onComplete: go }); setTimeout(go, 1700); }
        else { window.scrollTo(0, 0); setTimeout(go, 60); }
      });
    });
  }

  /* =========================================================
     NAV COLOURS AND THE PHONE BAR
     ========================================================= */
  function setupNavAndBar() {
    var nav = $('#nav'), bar = $('.phonebar'), secs = $$('[data-nav]');
    var story = $('#story'), fin = $('#start');
    var pending = false;
    function update() {
      pending = false;
      var theme = null, probe = 34;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { theme = secs[i].getAttribute('data-nav'); break; }
      }
      if (!theme) theme = heroState && heroState.flood > 0.55 ? 'paper' : 'night';
      nav.setAttribute('data-theme', theme);
      nav.classList.toggle('is-solid', window.scrollY > 40);
      if (bar && story && fin) {
        var vh = window.innerHeight;
        var on = story.getBoundingClientRect().top < vh * 0.6 && fin.getBoundingClientRect().top > vh * 0.7;
        bar.classList.toggle('is-on', on);
      }
    }
    function queue() { if (!pending) { pending = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }
})();
