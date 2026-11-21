/* =========================================================
   NexEra runner: a jointed pictogram figure drawn in SVG.
   One figure, real joints (hip, knee, ankle, shoulder, elbow, neck),
   so the run is a proper run cycle and the poses blend smoothly.
   Used by the cover and by the tiny runner inside a headline.
   ========================================================= */
(function (global) {
  'use strict';

  /* Limb lengths and thicknesses, in figure units (the figure is about 100 units tall). */
  var LEN = { torso: 29, neck: 31, head: 7.8, thigh: 23, shin: 23, foot: 8, upper: 16, fore: 15 };
  var WID = { torso: 11.5, thigh: 9.6, shin: 8, foot: 6, upper: 7.4, fore: 6.4 };
  var SHOULDER = -27;

  /* Angles in degrees.
     T thigh (forward +), K knee bend, F foot (toe down +),
     U upper arm (forward +), E elbow bend (forearm forward +),
     lean (torso forward +), head (nod down +), lift (extra hop, flight phase). */
  var POSES = {
    phone:  { nT: 3,  nK: 4,  nF: 0,  fT: -4, fK: 3,  fF: 0,  nU: 24,  nE: 100, fU: -6,  fE: 14, lean: 3,  head: 22,  lift: 0 },
    look:   { nT: 3,  nK: 4,  nF: 0,  fT: -4, fK: 3,  fF: 0,  nU: 18,  nE: 92,  fU: -4,  fE: 12, lean: 2,  head: -8,  lift: 0 },
    ready:  { nT: 12, nK: 22, nF: 0,  fT: -10, fK: 16, fF: 10, nU: -28, nE: 88, fU: 30,  fE: 96, lean: 11, head: -6,  lift: 0 },
    armsUp: { nT: 4,  nK: 3,  nF: 0,  fT: -4, fK: 3,  fF: 0,  nU: 142, nE: 10,  fU: 166, fE: 6,  lean: -3, head: -16, lift: 0 },
    relax:  { nT: 3,  nK: 3,  nF: 0,  fT: -4, fK: 3,  fF: 0,  nU: -5,  nE: 22,  fU: 7,   fE: 18, lean: 0,  head: -4,  lift: 0 }
  };
  var KEYS = Object.keys(POSES.phone);

  /* One leg over one stride (q from 0 to 1): [q, thigh, knee, foot].
     Contact at .25, toe-off at .58, heel kick at .8, knee drive at .1. */
  var LEG = [
    [0.00, 10, 104, 24],
    [0.10, 40, 82, 14],
    [0.18, 45, 46, 4],
    [0.25, 30, 18, -2],
    [0.35, 12, 34, 0],
    [0.48, -8, 22, 10],
    [0.58, -20, 20, 34],
    [0.68, -22, 60, 34],
    [0.80, -10, 98, 30]
  ];
  /* How far the ground moves in one stride, in figure units (matches the foot in stance). */
  var STRIDE = 118;

  function wrap(q) { return q - Math.floor(q); }

  /* Smooth periodic interpolation through the leg keyframes (Catmull-Rom). */
  function sampleLeg(q, out) {
    q = wrap(q);
    var n = LEG.length, i = n - 1;
    for (var k = 0; k < n; k++) { if (LEG[k][0] > q) { i = k - 1; break; } }
    if (i < 0) i = n - 1;
    var a = LEG[(i - 1 + n) % n], b = LEG[i], c = LEG[(i + 1) % n], d = LEG[(i + 2) % n];
    var q0 = b[0], q1 = c[0] <= q0 ? c[0] + 1 : c[0];
    var qq = q < q0 ? q + 1 : q;
    var t = (qq - q0) / (q1 - q0), t2 = t * t, t3 = t2 * t;
    for (var ch = 1; ch < 4; ch++) {
      out[ch - 1] = 0.5 * ((2 * b[ch]) + (-a[ch] + c[ch]) * t + (2 * a[ch] - 5 * b[ch] + 4 * c[ch] - d[ch]) * t2 + (-a[ch] + 3 * b[ch] - 3 * c[ch] + d[ch]) * t3);
    }
    return out;
  }

  var tmpN = [0, 0, 0], tmpF = [0, 0, 0];
  var TAU = Math.PI * 2;

  /* The running pose at stride phase p (0 to 1). */
  function runPose(p, out) {
    out = out || {};
    sampleLeg(p, tmpN);
    sampleLeg(p + 0.5, tmpF);
    out.nT = tmpN[0]; out.nK = tmpN[1]; out.nF = tmpN[2];
    out.fT = tmpF[0]; out.fK = tmpF[1]; out.fF = tmpF[2];
    var s = Math.sin(TAU * p);
    out.nU = 4 - 40 * s; out.nE = 90 - 20 * s;
    out.fU = 4 + 40 * s; out.fE = 90 + 20 * s;
    out.lean = 11 + 1.5 * Math.sin(TAU * 2 * p);
    out.head = -7 - 1.5 * Math.sin(TAU * 2 * p);
    var f = Math.cos(TAU * 2 * (p - 0.165));
    out.lift = 3.2 * Math.max(0, f) * Math.max(0, f);
    return out;
  }

  function lerpPose(a, b, t, out) {
    out = out || {};
    for (var i = 0; i < KEYS.length; i++) { var k = KEYS[i]; out[k] = a[k] + (b[k] - a[k]) * t; }
    return out;
  }

  function copyPose(src, out) {
    out = out || {};
    for (var i = 0; i < KEYS.length; i++) out[KEYS[i]] = src[KEYS[i]];
    return out;
  }

  /* ---------- markup ---------- */
  function f(n) { return Math.round(n * 100) / 100; }

  function legMarkup(side, T, K, F) {
    var c = side === 'n' ? 'r-near' : 'r-far';
    return '<g data-j="' + side + 'T" transform="rotate(' + f(-T) + ')">' +
      '<line class="' + c + '" x1="0" y1="0" x2="0" y2="' + LEN.thigh + '" stroke-width="' + WID.thigh + '"/>' +
      '<g data-j="' + side + 'K" transform="translate(0 ' + LEN.thigh + ') rotate(' + f(K) + ')">' +
      '<line class="' + c + '" x1="0" y1="0" x2="0" y2="' + LEN.shin + '" stroke-width="' + WID.shin + '"/>' +
      '<g data-j="' + side + 'F" transform="translate(0 ' + LEN.shin + ') rotate(' + f(F) + ')">' +
      '<line class="' + c + '" x1="-1.5" y1="0" x2="' + LEN.foot + '" y2="0" stroke-width="' + WID.foot + '"/>' +
      '</g></g></g>';
  }

  function armMarkup(side, U, E, withPhone) {
    var c = side === 'n' ? 'r-near' : 'r-far';
    var phone = withPhone
      ? '<g class="r-phone" transform="translate(0 ' + LEN.fore + ') rotate(-62)">' +
        '<rect x="-3.1" y="-6.2" width="6.2" height="12.4" rx="1.6" class="r-phone__body"/>' +
        '<rect x="-2.2" y="-5.3" width="4.4" height="10.6" rx="1" class="r-phone__screen"/>' +
        '</g>'
      : '';
    return '<g data-j="' + side + 'U" transform="translate(0 ' + SHOULDER + ') rotate(' + f(-U) + ')">' +
      '<line class="' + c + '" x1="0" y1="0" x2="0" y2="' + LEN.upper + '" stroke-width="' + WID.upper + '"/>' +
      '<g data-j="' + side + 'E" transform="translate(0 ' + LEN.upper + ') rotate(' + f(-E) + ')">' +
      '<line class="' + c + '" x1="0" y1="0" x2="0" y2="' + LEN.fore + '" stroke-width="' + WID.fore + '"/>' +
      phone +
      '</g></g>';
  }

  /* The inner SVG markup for a figure in a given pose. viewBox: -60 -112 120 124, feet on y = 0. */
  function markup(pose, opts) {
    opts = opts || {};
    var p = pose || POSES.armsUp;
    var hipY = -groundOffset(p);
    var lean = f(p.lean);
    return '' +
      '<ellipse class="r-shadow" cx="2" cy="1.2" rx="20" ry="2.6"/>' +
      '<g data-j="hip" transform="translate(0 ' + f(hipY) + ')">' +
        '<g data-j="lean" transform="rotate(' + lean + ')">' + armMarkup('f', p.fU, p.fE, false) + '</g>' +
        legMarkup('f', p.fT, p.fK, p.fF) +
        '<g data-j="lean" transform="rotate(' + lean + ')">' +
          '<line class="r-near" x1="0" y1="2" x2="0" y2="' + (-LEN.torso) + '" stroke-width="' + WID.torso + '"/>' +
          '<g data-j="head" transform="translate(0 ' + (-LEN.neck) + ') rotate(' + f(p.head) + ')">' +
            (opts.glow ? '<ellipse class="r-glow" cx="10" cy="-4" rx="16" ry="13"/>' : '') +
            '<circle class="r-head" cx="0.5" cy="-9.5" r="' + LEN.head + '"/>' +
          '</g>' +
        '</g>' +
        legMarkup('n', p.nT, p.nK, p.nF) +
        '<g data-j="lean" transform="rotate(' + lean + ')">' + armMarkup('n', p.nU, p.nE, !!opts.phone) + '</g>' +
      '</g>';
  }

  /* How far below the hip the lowest point of either foot is, so the figure always stands on y = 0. */
  var D2R = Math.PI / 180;
  function legDrop(T, K, F) {
    var a1 = T * D2R, a2 = (T - K) * D2R, r3 = (-T + K + F) * D2R;
    var ankle = LEN.thigh * Math.cos(a1) + LEN.shin * Math.cos(a2);
    var toe = ankle + LEN.foot * Math.sin(r3);
    var heel = ankle - 1.5 * Math.sin(r3);
    return Math.max(ankle, toe, heel) + WID.foot / 2;
  }
  function groundOffset(p) {
    return Math.max(legDrop(p.nT, p.nK, p.nF), legDrop(p.fT, p.fK, p.fF)) + (p.lift || 0);
  }

  /* ---------- live figure ---------- */
  function Runner(svg) {
    this.svg = svg;
    var j = {};
    var list = svg.querySelectorAll('[data-j]');
    for (var i = 0; i < list.length; i++) {
      var name = list[i].getAttribute('data-j');
      if (name === 'lean') { (j.lean = j.lean || []).push(list[i]); } else { j[name] = list[i]; }
    }
    this.j = j;
    this.shadow = svg.querySelector('.r-shadow');
    this.phone = svg.querySelector('.r-phone');
    this.glow = svg.querySelector('.r-glow');
  }

  Runner.prototype.set = function (p) {
    var j = this.j;
    var drop = groundOffset(p);
    var lean = 'rotate(' + f(p.lean) + ')';
    j.hip.setAttribute('transform', 'translate(0 ' + f(-drop) + ')');
    for (var i = 0; i < j.lean.length; i++) j.lean[i].setAttribute('transform', lean);
    j.head.setAttribute('transform', 'translate(0 ' + (-LEN.neck) + ') rotate(' + f(p.head) + ')');
    j.nT.setAttribute('transform', 'rotate(' + f(-p.nT) + ')');
    j.nK.setAttribute('transform', 'translate(0 ' + LEN.thigh + ') rotate(' + f(p.nK) + ')');
    j.nF.setAttribute('transform', 'translate(0 ' + LEN.shin + ') rotate(' + f(p.nF) + ')');
    j.fT.setAttribute('transform', 'rotate(' + f(-p.fT) + ')');
    j.fK.setAttribute('transform', 'translate(0 ' + LEN.thigh + ') rotate(' + f(p.fK) + ')');
    j.fF.setAttribute('transform', 'translate(0 ' + LEN.shin + ') rotate(' + f(p.fF) + ')');
    j.nU.setAttribute('transform', 'translate(0 ' + SHOULDER + ') rotate(' + f(-p.nU) + ')');
    j.nE.setAttribute('transform', 'translate(0 ' + LEN.upper + ') rotate(' + f(-p.nE) + ')');
    j.fU.setAttribute('transform', 'translate(0 ' + SHOULDER + ') rotate(' + f(-p.fU) + ')');
    j.fE.setAttribute('transform', 'translate(0 ' + LEN.upper + ') rotate(' + f(-p.fE) + ')');
    if (this.shadow) {
      var s = 1 - Math.min(0.35, (p.lift || 0) * 0.08);
      this.shadow.setAttribute('transform', 'scale(' + f(s) + ' 1)');
    }
  };

  global.NexRunner = {
    POSES: POSES,
    STRIDE: STRIDE,
    VIEWBOX: '-60 -112 120 124',
    FEET: 112 / 124,
    runPose: runPose,
    lerpPose: lerpPose,
    copyPose: copyPose,
    markup: markup,
    Runner: Runner
  };
})(typeof window !== 'undefined' ? window : globalThis);
