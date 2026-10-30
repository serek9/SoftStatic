var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The rod as a tapered blank (Phase 31, PLAN_ROD.md): a chain of N segments from the hands,
// the first RIGID of them the reel seat and fore grip. A blank's stiffness goes with the
// fourth power of its diameter, and the diameter thins from butt to tip, so each joint's
// compliance is seg / d⁴, scaled so every tier has the same power (the tip moves alike under
// a small load); the tier sets the taper, its action: the cheapest rod is slow and bends
// through its length, the best fast and bends in its top third. A force at the tip (the line)
// bends each joint by its compliance times the force's moment about it, so a light load bends
// only the tip and a heavy one works down into the butt, and the tip turns toward the line.
// Solved by relaxation from the last shape every step. Local frame: x forward along the
// boat's facing, y up, the hands at (0, 0). Visual only: no randomness, nothing allocated.
G.gfx = G.gfx || {};
G.gfx.rod = (function () {
  var N = 12, RIGID = 2, ITER = 6, RELAX = 0.5;
  var K = {
    len: 22,                                  // world px from the hands to the tip
    power: 1.1,                               // tip deflection per unit of perpendicular load (small loads), in rod lengths
    taper: [0.5, 0.42, 0.35, 0.3, 0.25]       // tip/butt diameter by rod tier: slow to fast
  };
  var SEG = K.len / N;
  var c = new Float32Array(N);                // compliance at joint i (the bend at the start of segment i), rad per px of moment
  var d = new Float32Array(N);                // the bend at each joint (rad); the rigid ones stay 0
  var jx = new Float32Array(N + 1), jy = new Float32Array(N + 1); // joints, local px; N is the tip
  var st = {
    tier: -1, taper: 0,
    a: 0,                 // the angle the hands hold (rad, up from the facing)
    load: 0,              // 0..1 of the rod's rating
    fx: 0, fy: 0,         // the force's direction, local
    force: null,          // dbg.rodLoad(x): a load that overrides the scene's (null: none)
    bendDeg: 0,           // the whole bend, butt to tip (degrees)
    top3: 0, butt: 0,     // the share of the bend in the top third and in the lower half
    ms: 0
  };

  // Compliance by tier: ∝ 1/d⁴ with d thinning linearly, normalised so a small perpendicular
  // load at the tip moves it by K.power rod lengths per unit (Σ cᵢ (L − sᵢ)² = power · L).
  function setTier(tier) {
    tier = Math.max(0, Math.min(K.taper.length - 1, tier | 0));
    if (tier === st.tier) return;
    st.tier = tier; st.taper = K.taper[tier];
    var sum = 0, i;
    for (i = 0; i < N; i++) {
      var s = i * SEG, r = 1 - (1 - st.taper) * s / K.len;
      c[i] = i < RIGID ? 0 : SEG / (r * r * r * r);
      sum += c[i] * (K.len - s) * (K.len - s);
    }
    for (i = 0; i < N; i++) c[i] *= K.power * K.len / sum;
  }

  function place(a) {
    var x = 0, y = 0, ang = a;
    jx[0] = 0; jy[0] = 0;
    for (var i = 0; i < N; i++) {
      ang += d[i];
      x += Math.cos(ang) * SEG; y += Math.sin(ang) * SEG;
      jx[i + 1] = x; jy[i + 1] = y;
    }
  }

  // Bends the rod. angleDeg: the hands' angle (degrees up from the facing); load: 0..1;
  // (wx, wy): the direction the line pulls the tip, in world px (y down); f: the facing.
  function solve(angleDeg, load, wx, wy, f, tier) {
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    setTier(tier);
    if (st.force !== null) load = st.force;
    load = Math.max(0, load);
    var ux = f * wx, uy = -wy, ul = Math.sqrt(ux * ux + uy * uy);
    if (ul < 1e-6) { ux = 0; uy = -1; } else { ux /= ul; uy /= ul; }
    st.a = angleDeg * Math.PI / 180; st.load = load; st.fx = ux; st.fy = uy;
    var Fx = ux * load, Fy = uy * load, i, k;
    for (k = 0; k < ITER; k++) {
      place(st.a);
      var tx = jx[N], ty = jy[N];
      for (i = RIGID; i < N; i++) d[i] += RELAX * (c[i] * ((tx - jx[i]) * Fy - (ty - jy[i]) * Fx) - d[i]);
    }
    place(st.a);
    var tot = 0, top = 0, low = 0;
    for (i = RIGID; i < N; i++) {
      var ad = Math.abs(d[i]);
      tot += ad;
      if (i * SEG >= K.len * 2 / 3) top += ad;
      if (i * SEG < K.len / 2) low += ad;
    }
    var sum = 0;
    for (i = 0; i < N; i++) sum += d[i];
    st.bendDeg = sum * 180 / Math.PI;
    st.top3 = tot > 1e-6 ? top / tot : 0;
    st.butt = tot > 1e-6 ? low / tot : 0;
    if (t0) st.ms = performance.now() - t0;
  }

  // Straightens the rod at once (a new location, a reload).
  function reset() { for (var i = 0; i < N; i++) d[i] = 0; place(st.a); }

  // The point s px along the rod (0 at the hands, K.len at the tip), local, into out.
  function at(s, out) {
    var u = Math.max(0, Math.min(N, s / SEG)), i = Math.min(N - 1, Math.floor(u)), r = u - i;
    out[0] = jx[i] + (jx[i + 1] - jx[i]) * r;
    out[1] = jy[i] + (jy[i + 1] - jy[i]) * r;
    return out;
  }

  // The tip in world px for hands at (bx, by) and facing f, into out.
  function tip(f, bx, by, out) { out[0] = bx + f * jx[N]; out[1] = by - jy[N]; return out; }

  setTier(0);
  place(0);

  return { N: N, RIGID: RIGID, SEG: SEG, K: K, st: st, jx: jx, jy: jy, d: d, solve: solve, reset: reset, at: at, tip: tip };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var s = G.gfx.rod.st;
  return 'rod tier ' + s.tier + '  load ' + s.load.toFixed(2) + '  bend ' + s.bendDeg.toFixed(0) + '°  top3 ' + (s.top3 * 100).toFixed(0) + '%  butt ' + (s.butt * 100).toFixed(0) + '%' + (s.force !== null ? '  (forced)' : '');
});
