var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The rod as a tapered blank (Phase 31, PLAN_ROD.md): a chain of N segments from the hands,
// the first RIGID of them the reel seat and fore grip. A blank's stiffness goes with the
// fourth power of its diameter, and the diameter thins from butt to tip, so each joint's
// compliance is seg / d⁴, scaled so every tier has the same power (the tip moves alike under
// a small load); the tier sets the taper, its action: the cheapest rod is slow and bends
// through its length, the best fast and bends in its top third. A force at the tip (the line)
// bends each joint by its compliance times the force's moment about it, so a light load bends
// only the tip and a heavy one works down into the butt, and the tip turns toward the line.
// Two shapes are kept: the settled shape for the present load (q, found by Newton-scaled
// relaxation, warm-started every step), and the drawn shape (d), in which every joint is a
// damped spring toward q at one frequency, the blank's first mode. So the rod has inertia,
// overshoots once and settles, and while it moves its curve is a blend of settled curves: one
// smooth bend, never an S (each joint chasing its own target let the soft tip run past the
// line ahead of the butt and come back), and never a shape bent backward.
// Phase 32: the hands move the rod as a fisher would (their angle follows the scene's, eased,
// or follows it exactly for the cast's stroke), and their angular acceleration is an inertial
// load on the blank's own mass and the lure at its tip: the tip lags as the rod is swung,
// loads, and whips past when the swing stops. Impulses (a head shake) kick the drawn shape.
// The reel's handle and bail live here too. Local frame: x forward along the boat's facing, y
// up, the hands at (0, 0). Visual only: no randomness, nothing allocated.
G.gfx = G.gfx || {};
G.gfx.rod = (function () {
  var N = 12, RIGID = 2, SUB = 4, QIT = 6, QRELAX = 0.3;
  var K = {
    len: 22,                                  // world px from the hands to the tip
    power: 2.0,                               // tip deflection per unit of perpendicular load (small loads), in rod lengths
    taper: [0.32, 0.26, 0.2, 0.15, 0.12],     // tip/butt diameter by rod tier: slow to fast (real blanks: 0.1-0.3)
    hz: 3.2,                                  // the blank's first mode (Hz)
    zeta: 0.3,                                // damping ratio: a swing past straight, then still
    stretch: 0.09,                            // s: the line's stretch spreads a sudden pull (and a swing of the line) over this
    handsHz: 2.5,                             // how quickly the hands follow a new angle (critically damped)
    inertia: 0.9e-5,                          // the inertial bend per rad/s² of the hands, per unit of mass moment
    lure: 3,                                  // the lure's mass, in px of blank at the butt
    // Phase 44: a fish's load against the rod. A fish under ref × the rod's maxMass loads it by
    // (mass / (ref × maxMass))^exp, never under min: a fry barely bends the long rod and
    // bends the wand well. Heavier fish load it fully, as before.
    small: { ref: 0.15, exp: 0.6, min: 0.08 }
  };
  function fishLoad(kg, maxMass) {
    var S = K.small, r = maxMass > 0 ? kg / (S.ref * maxMass) : 1;
    return r >= 1 ? 1 : Math.max(S.min, Math.pow(r, S.exp));
  }
  var SEG = K.len / N;
  var c = new Float32Array(N);                // compliance at joint i (the bend at the start of segment i), rad per px of moment
  var d = new Float32Array(N);                // the bend at each joint (rad); the rigid ones stay 0
  var v = new Float32Array(N);                // its rate (rad/s)
  var q = new Float32Array(N);                // the settled bend at each joint for the present load
  var qx = new Float32Array(N + 1), qy = new Float32Array(N + 1); // the settled shape's joints
  var w = new Float32Array(N);                // its frequency (rad/s): one mode for all
  var Iw = new Float32Array(N);               // the blank's mass moment beyond joint i: Σ m s (s − sᵢ), m ∝ d²
  var IwL = new Float32Array(N);              // the lure's, while it hangs at the tip
  var jx = new Float32Array(N + 1), jy = new Float32Array(N + 1); // joints, local px; N is the tip
  var st = {
    tier: -1, taper: 0, f: 1,
    a: 0,                 // the angle the hands hold (rad, up from the facing), as they move
    hv: 0, al: 0,         // the hands' angular speed (rad/s) and acceleration (rad/s²)
    init: false,          // false until the hands have an angle (after a reset)
    crank: 0,             // the reel's handle, turns (0..1)
    bail: false,          // the reel's bail open (the line runs free)
    load: 0,              // 0..1 of the rod's rating, after the line's stretch
    fx: 1, fy: 0,         // the force's direction, local, after the line's stretch
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
    for (i = 0; i < N; i++) {
      c[i] *= K.power * K.len / sum;
      w[i] = 2 * Math.PI * K.hz;
      var si = i * SEG, m = 0;
      IwL[i] = K.lure * K.len * (K.len - si);
      for (var j = i; j < N; j++) {
        var sj = (j + 0.5) * SEG, rj = 1 - (1 - st.taper) * sj / K.len;
        m += rj * rj * SEG * sj * (sj - si);
      }
      Iw[i] = m;
    }
  }

  // Joints into (X, Y) for the bends b and the hands' angle a.
  function place(a, b, X, Y) {
    var x = 0, y = 0, ang = a;
    X[0] = 0; Y[0] = 0;
    for (var i = 0; i < N; i++) {
      ang += b[i];
      x += Math.cos(ang) * SEG; y += Math.sin(ang) * SEG;
      X[i + 1] = x; Y[i + 1] = y;
    }
  }

  // Steps the rod by dt. angleDeg: the hands' angle (degrees up from the facing); load: 0..1;
  // (wx, wy): the direction the line pulls the tip, in world px (y down); f: the facing.
  // The settled shape: each joint wants c × (the force's moment about it); the step toward it is
  // divided by 1 + c × (the force along the lever), the joint's own Newton term, so the soft tip
  // does not overshoot. Each drawn joint's spring is taken implicitly in SUB substeps, toward
  // the settled bend plus the inertial bend (Phase 32): −K.inertia × α × cᵢ × Iwᵢ, the same sign
  // along the blank, so a swing bends it in one curve too. direct: the hands' angle is set
  // exactly (the cast's stroke) instead of eased toward. hang: the lure hangs at the tip, so its
  // mass counts (once it flies, only the blank's own mass whips it).
  function solve(angleDeg, load, wx, wy, f, tier, dt, direct, hang) {
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    setTier(tier);
    if (st.force !== null) load = st.force;
    load = Math.max(0, load);
    dt = dt || 1 / 60;
    var ux = f * wx, uy = -wy, ul = Math.sqrt(ux * ux + uy * uy);
    if (ul < 1e-6) { ux = 0; uy = -1; } else { ux /= ul; uy /= ul; }
    // The line stretches: a sudden pull, or the line swinging round, reaches the blank over
    // K.stretch s instead of in one step (a step would whip the soft tip past the line).
    var e = Math.min(1, dt / K.stretch);
    if (f !== st.f) { st.fx = ux; st.fy = uy; st.f = f; }                     // the boat turned: the local frame flipped
    st.load += (load - st.load) * e;
    st.fx += (ux - st.fx) * e; st.fy += (uy - st.fy) * e;
    ul = Math.sqrt(st.fx * st.fx + st.fy * st.fy) || 1;
    var a = angleDeg * Math.PI / 180, hv0 = st.hv;
    if (!st.init) { st.a = a; st.hv = 0; hv0 = 0; st.init = true; }
    if (direct) { st.hv = (a - st.a) / dt; st.a = a; }
    else {
      var wh = 2 * Math.PI * K.handsHz;
      st.hv = (st.hv + dt * wh * wh * (a - st.a)) / (1 + 2 * wh * dt + wh * wh * dt * dt);
      st.a += dt * st.hv;
    }
    st.al = (st.hv - hv0) / dt;
    var Fx = st.fx / ul * st.load, Fy = st.fy / ul * st.load, h = dt / SUB, i, k, inr = K.inertia * st.al;
    for (k = 0; k < QIT; k++) {
      place(st.a, q, qx, qy);
      var tx = qx[N], ty = qy[N];
      for (i = RIGID; i < N; i++) {
        var rx = tx - qx[i], ry = ty - qy[i];
        q[i] += QRELAX * (c[i] * (rx * Fy - ry * Fx) - q[i]) / (1 + c[i] * Math.max(0, rx * Fx + ry * Fy));
      }
    }
    for (k = 0; k < SUB; k++) {
      for (i = RIGID; i < N; i++) {
        var wi = w[i];
        v[i] = (v[i] + h * wi * wi * (q[i] - inr * c[i] * (Iw[i] + (hang ? IwL[i] : 0)) - d[i])) / (1 + 2 * K.zeta * wi * h + wi * wi * h * h);
        d[i] += h * v[i];
      }
    }
    place(st.a, d, jx, jy);
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
  function reset() { for (var i = 0; i < N; i++) { d[i] = 0; v[i] = 0; q[i] = 0; } st.load = 0; st.init = false; st.hv = 0; st.al = 0; place(st.a, d, jx, jy); }

  // An impulse on the drawn shape (rad/s at the tip, less toward the butt), the way the line
  // pulls it now (a head shake knocking the tip toward the fish).
  function kick(amount) {
    var sg = 0;
    for (var i = RIGID; i < N; i++) sg += q[i];
    sg = sg < 0 ? -1 : 1;
    for (i = RIGID; i < N; i++) v[i] += sg * amount * (i - RIGID + 1) / (N - RIGID);
  }

  // The reel (32.4): the handle turns at turnsPerSec (0 still); the bail open or closed.
  function reel(dt, turnsPerSec, open) {
    st.crank = (st.crank + turnsPerSec * dt) % 1;
    st.bail = open;
  }

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
  place(0, d, jx, jy);

  return { N: N, RIGID: RIGID, SEG: SEG, K: K, st: st, jx: jx, jy: jy, d: d, v: v, q: q, solve: solve, fishLoad: fishLoad, reset: reset, kick: kick, reel: reel, at: at, tip: tip };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var s = G.gfx.rod.st;
  return 'rod tier ' + s.tier + '  load ' + s.load.toFixed(2) + '  bend ' + s.bendDeg.toFixed(0) + '°  top3 ' + (s.top3 * 100).toFixed(0) + '%  butt ' + (s.butt * 100).toFixed(0) + '%' + (s.force !== null ? '  (forced)' : '');
});
