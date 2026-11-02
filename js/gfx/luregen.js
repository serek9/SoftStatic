var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The lure painter (Phase 73, PLAN_SPECIES.md 3.6). Each of the 23 lures is drawn from its look in
// data/lurelooks.js: a kind (the builder below: crank, spinner, spoon, ...) and its own sizes,
// lip, weight and colourway. A builder turns a look and a frame into shapes in design units (the
// lure about 38 long, facing right, v down, lit from above); the raster samples those shapes at
// any scale and heading, so the shop's icon (about 38 px, its native size), the small icons of
// the lists and the HUD's chip, and the sprite under water in each of 16 headings are all
// painted at their own resolution from the one description, never scaled. Frames carry each
// action: the blades turning, the paddle tail beating, the glide's sway, the wacky worm's
// shimmy, the spoon's flash, the popper's spit. Pure and deterministic: grids of palette keys;
// only the *Img functions bake canvases, on first use.
G.gfx = G.gfx || {};
G.gfx.luregen = (function () {
  var BASE = 38, DIRS = 16;
  var HOOK = ['chrome', 'chrome_hi'], WIRE = ['chrome', 'chrome_lit'], LINE = 'fog_light';
  var DARK = ['outline', 'ink', 'stone_dark'];

  // ---- Shapes ---------------------------------------------------------------------------------
  // Every shape has t (its type) and either ramp (keys dark to light) or key. Optional: id (a
  // marking's clip names it), clip (drawn only over that shape), flat (wire, hooks, line: no
  // outline, no shaded edge), only ('icon' or 'uw'), lift (added to its light), and rot about
  // (pu, pv) (a jointed part). Types:
  //   body  pts [[u, top, bottom], ...] u rising; split and belly: a second ramp below split
  //   ell   cx cy rx ry (rot)        poly pts [[u, v], ...]
  //   tube  pts [[u, v, width], ...] a stroke, rounded at its joins
  //   ring  cx cy r w (half [du, dv]: only the half that way)      dot  cx cy r
  // Markings (with clip): bars u0 u1 n w f1 (slant), band f0 f1 (u0 u1), flake dens (keys).
  function smooth(pts, col, u) {
    var n = pts.length;
    if (u <= pts[0][0]) return pts[0][col];
    for (var i = 0; i < n - 1; i++) {
      if (u > pts[i + 1][0]) continue;
      var p0 = pts[Math.max(0, i - 1)][col], p1 = pts[i][col], p2 = pts[i + 1][col], p3 = pts[Math.min(n - 1, i + 2)][col];
      var t = (u - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
    }
    return pts[n - 1][col];
  }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  // How much of shape p covers (u, v): its light 0..1, or -1 outside. st.f: where a body or a
  // tube was hit across its depth (0 its top, 1 its bottom), for the markings over it.
  function cover(p, u, v, st) {
    if (p.rot) { var du = u - p.pu, dv = v - p.pv, c = Math.cos(-p.rot), s = Math.sin(-p.rot); u = p.pu + du * c - dv * s; v = p.pv + du * s + dv * c; }
    var f, d, i;
    switch (p.t) {
      case 'body': {
        var P = p.pts;
        if (u < P[0][0] || u > P[P.length - 1][0]) return -1;
        var top = smooth(P, 1, u), bot = smooth(P, 2, u);
        if (v < top || v > bot || bot - top < 0.05) return -1;
        f = (v - top) / (bot - top); st.f = f;
        var sp = p.split || 1;
        if (f <= sp) { var g = f / sp; return g < 0.18 ? 0.55 + g * 2.3 : 1 - (g - 0.18) * 0.62; }
        st.belly = true;
        return 0.92 - Math.pow((f - sp) / (1 - sp), 1.6) * 0.8;
      }
      case 'ell': {
        var eu = u - p.cx, ev = v - p.cy;
        if (p.erot) { var ec = Math.cos(-p.erot), es = Math.sin(-p.erot), t0 = eu * ec - ev * es; ev = eu * es + ev * ec; eu = t0; }
        d = (eu / p.rx) * (eu / p.rx) + (ev / p.ry) * (ev / p.ry);
        if (d > 1) return -1;
        st.f = (ev / p.ry + 1) / 2;
        return 0.92 - st.f * 0.75 + (1 - d) * 0.15 - (eu / p.rx) * 0.08;
      }
      case 'poly': {
        var Q = p.pts, inside = false, vmin = 1e9, vmax = -1e9;
        for (i = 0; i < Q.length; i++) {
          var a = Q[i], b = Q[(i + 1) % Q.length];
          if (a[1] < vmin) vmin = a[1];
          if (a[1] > vmax) vmax = a[1];
          if ((a[1] > v) !== (b[1] > v) && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        if (!inside) return -1;
        st.f = (v - vmin) / Math.max(0.01, vmax - vmin);
        return 1 - st.f * 0.85;
      }
      case 'tube': {
        var T = p.pts, best = 1e9, bw = 0, side = 0;
        for (i = 0; i < T.length - 1; i++) {
          var ax = T[i][0], ay = T[i][1], bx = T[i + 1][0], by = T[i + 1][1], sx = bx - ax, sy = by - ay, L2 = sx * sx + sy * sy;
          var k = L2 > 0 ? clamp01(((u - ax) * sx + (v - ay) * sy) / L2) : 0, qx = ax + sx * k - u, qy = ay + sy * k - v, dd = Math.sqrt(qx * qx + qy * qy);
          var w = (p.flat ? Math.max(st.mw, T[i][2] + (T[i + 1][2] - T[i][2]) * k) : T[i][2] + (T[i + 1][2] - T[i][2]) * k) / 2;
          if (dd - w < best) { best = dd - w; bw = w; side = L2 > 0 ? ((u - ax) * -sy + (v - ay) * sx) / Math.sqrt(L2) : 0; } // across the stroke: + below it
        }
        if (best > 0) return -1;
        st.f = clamp01((side / Math.max(0.3, bw) + 1) / 2);
        return 0.95 - st.f * 0.8;
      }
      case 'ring': {
        var ru = u - p.cx, rv = v - p.cy, rr = Math.sqrt(ru * ru + rv * rv);
        if (Math.abs(rr - p.r) > Math.max(p.w, p.flat ? st.mw : 0) / 2) return -1;
        if (p.half && ru * p.half[0] + rv * p.half[1] < 0) return -1;
        return rv < 0 ? 0.9 : 0.4;
      }
      case 'dot': {
        var xu = u - p.cx, xv = v - p.cy;
        if (xu * xu + xv * xv > p.r * p.r) return -1;
        return 0.8 - xv / p.r * 0.3;
      }
      case 'bars': {
        if (st.f > (p.f1 === undefined ? 1 : p.f1) || st.f < (p.f0 || 0)) return -1;
        var bu = u + (p.slant || 0) * v;
        if (bu < p.u0 || bu > p.u1) return -1;
        var per = (p.u1 - p.u0) / p.n, m = ((bu - p.u0) % per + per) % per;
        return m < p.w ? 0.5 + (p.fade ? (1 - st.f) * 0.5 : 0) : -1;
      }
      case 'band': {
        if (st.f < p.f0 || st.f > p.f1) return -1;
        if (p.u0 !== undefined && u < p.u0) return -1;
        if (p.u1 !== undefined && u > p.u1) return -1;
        return 1 - (st.f - p.f0) / Math.max(0.01, p.f1 - p.f0) * 0.8;
      }
      case 'flake': {
        var h = hash(Math.floor(u * (p.res || 1.4)) + 4099, Math.floor(v * (p.res || 1.4)) + 77);
        return h < p.dens ? h / p.dens : -1;
      }
    }
    return -1;
  }
  function keyOf(p, t) {
    if (p.key) return p.key;
    var r = p.ramp, n = r.length;
    return r[Math.max(0, Math.min(n - 1, Math.floor(clamp01(t + (p.lift || 0)) * n)))];
  }
  function belly(p, t) { var r = p.belly, n = r.length; return r[Math.max(0, Math.min(n - 1, Math.floor(clamp01(t + (p.lift || 0)) * n)))]; }

  // The bounds of a shape in design units: [u0, v0, u1, v1].
  function bounds(p) {
    var i, b = [1e9, 1e9, -1e9, -1e9], pts, ext = 0;
    function add(u, v, e) {
      if (p.rot) { var du = u - p.pu, dv = v - p.pv, c = Math.cos(p.rot), s = Math.sin(p.rot); u = p.pu + du * c - dv * s; v = p.pv + du * s + dv * c; }
      b[0] = Math.min(b[0], u - e); b[1] = Math.min(b[1], v - e); b[2] = Math.max(b[2], u + e); b[3] = Math.max(b[3], v + e);
    }
    switch (p.t) {
      case 'body': for (i = 0; i < p.pts.length; i++) { add(p.pts[i][0], p.pts[i][1], 0.4); add(p.pts[i][0], p.pts[i][2], 0.4); } break;
      case 'ell': ext = Math.max(p.rx, p.ry); add(p.cx, p.cy, ext); break;
      case 'poly': for (i = 0; i < p.pts.length; i++) add(p.pts[i][0], p.pts[i][1], 0); break;
      case 'tube': for (i = 0; i < p.pts.length; i++) add(p.pts[i][0], p.pts[i][1], p.pts[i][2] / 2); break;
      case 'ring': add(p.cx, p.cy, p.r + p.w / 2); break;
      case 'dot': add(p.cx, p.cy, p.r); break;
      default: return null;                                                         // markings stay within what they clip
    }
    return b;
  }

  // ---- Parts shared by the builders -----------------------------------------------------------
  // A treble hanging from its eye at (u, v), its shank h long toward angle dir (down is PI/2):
  // two bends either side and their points coming back up (the third hook is edge on, behind).
  function treble(out, u, v, h, dir, only) {
    var dx = Math.cos(dir), dy = Math.sin(dir), cx = u + dx * h, cy = v + dy * h, r = h * 0.3, nx = -dy, ny = dx;
    out.push({ t: 'ring', cx: u - dx * 0.55, cy: v - dy * 0.55, r: 0.6, w: 0.5, ramp: HOOK, flat: true, only: only });
    out.push({ t: 'tube', pts: [[u, v, 0.7], [cx, cy, 0.7]], ramp: HOOK, flat: true, only: only });
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      var bx = cx + nx * r * sgn, by = cy + ny * r * sgn, px = cx + nx * r * 2 * sgn, py = cy + ny * r * 2 * sgn;
      out.push({ t: 'ring', cx: bx, cy: by, r: r, w: 0.65, half: [dx, dy], ramp: HOOK, flat: true, only: only });
      out.push({ t: 'tube', pts: [[px, py, 0.6], [px - dx * h * 0.42, py - dy * h * 0.42, 0.5]], ramp: HOOK, flat: true, only: only });
    }
  }
  // An eye: the iris ring, the pupil and its glint.
  function eye(out, u, v, r, iris, clip) {
    out.push({ t: 'dot', cx: u, cy: v, r: r, key: 'outline', clip: clip });
    out.push({ t: 'dot', cx: u, cy: v, r: r * 0.82, ramp: iris, clip: clip });
    out.push({ t: 'dot', cx: u + r * 0.1, cy: v + r * 0.05, r: r * 0.46, key: 'outline', clip: clip });
    out.push({ t: 'dot', cx: u - r * 0.3, cy: v - r * 0.35, r: r * 0.28, key: 'ivory', clip: clip, only: 'icon' });
  }
  function ring(out, u, v, r, only) { out.push({ t: 'ring', cx: u, cy: v, r: r, w: 0.55, ramp: WIRE, flat: true, only: only }); }
  function scaleV(pts, k) { var o = []; for (var i = 0; i < pts.length; i++) o.push([pts[i][0], pts[i][1] * k, pts[i][2] * k]); return o; }

  // ---- The builders, one per kind (data/lurelooks.js), facing right -------------------------
  var KINDS = {};

  // The float rig: the float nose up (its stem at +u), the line under it with a split shot and
  // the worm on the hook (those only on the icon: under water the scene hangs the worm itself).
  KINDS.float = {
    frames: 2, upright: true,
    build: function (L, fr) {
      var o = [], lift = fr ? 0.12 : 0;
      if (L.shape === 'pencil') {
        var bp = [[-9, -0.6, 0.6], [-7.5, -2.2, 2.2], [-3, -3.4, 3.4], [2, -3.3, 3.3], [6.5, -2.2, 2.2], [8, -1.2, 1.2], [8.6, -0.5, 0.5]];
        o.push({ t: 'body', pts: bp, ramp: L.bottom, id: 'f', lift: lift });
        o.push({ t: 'band', clip: 'f', f0: 0, f1: 1, u0: 1.2, ramp: L.top, lift: lift });
        o.push({ t: 'band', clip: 'f', f0: 0, f1: 1, u0: -0.4, u1: 1.2, ramp: L.ring });
        o.push({ t: 'tube', pts: [[8, 0, 1.1], [15, 0, 0.9]], ramp: L.stem, flat: true });
        o.push({ t: 'tube', pts: [[13, 0, 1.3], [15.4, 0, 1.3]], ramp: L.top });
        o.push({ t: 'tube', pts: [[-9, 0, 0.9], [-10.5, 0, 0.9]], ramp: L.stem, flat: true });
      } else {
        o.push({ t: 'ell', cx: 0, cy: 0, rx: 6.4, ry: 6.4, ramp: L.bottom, id: 'f', lift: lift });
        o.push({ t: 'ell', cx: 0, cy: 0, rx: 6.4, ry: 6.4, ramp: L.top, id: 'f', lift: lift, half: 1 });
        o.push({ t: 'tube', pts: [[0.1, -6.5, 0.6], [0.1, 6.5, 0.6]], key: 'outline', clip: 'f' });
        o.push({ t: 'tube', pts: [[6, 0, 1.4], [9.5, 0, 1.2]], ramp: L.stem, flat: true });
        o.push({ t: 'ring', cx: 10.2, cy: 0, r: 0.8, w: 0.5, ramp: WIRE, flat: true });
        o.push({ t: 'tube', pts: [[-6, 0, 1.2], [-8, 0, 1]], ramp: L.stem, flat: true });
      }
      // under it, on the icon only: the line, a split shot, the hook and its worm
      var y = L.shape === 'pencil' ? -10.5 : -8;
      o.push({ t: 'tube', pts: [[y, 0, 0.55], [-25, 0, 0.55]], key: LINE, flat: true, only: 'icon' });
      o.push({ t: 'dot', cx: y - 6, cy: 0, r: 1.1, ramp: ['stone_dark', 'stone', 'stone_hi'], only: 'icon' });
      o.push({ t: 'tube', pts: [[-25, 0, 0.7], [-28.5, 0, 0.7]], ramp: HOOK, flat: true, only: 'icon' });
      o.push({ t: 'ring', cx: -28.5, cy: 1.2, r: 1.2, w: 0.6, half: [-1, 0], ramp: HOOK, flat: true, only: 'icon' });
      o.push({ t: 'tube', pts: [[-27, 0.6, 1.7], [-29, 2.4, 1.7], [-28.2, 4.6, 1.6], [-25.6, 5.4, 1.5], [-24.4, 7.4, 1.3]], ramp: L.worm, only: 'icon' });
      o.push({ t: 'tube', pts: [[-27, -0.6, 1.7], [-29.4, -2.2, 1.6], [-28.4, -4.4, 1.4], [-26.2, -4.8, 1.2]], ramp: L.worm, only: 'icon' });
      return o;
    }
  };

  // A crankbait: a fat body, a lip whose length is how deep it dives, two trebles. Frame 1: the
  // flank's flash as it wobbles.
  KINDS.crank = {
    frames: 2,
    build: function (L, fr) {
      var o = [], lip = L.lip, fat = L.fat || 1;
      var bp = scaleV([[-15, -0.8, 0.8], [-13, -3, 3], [-8, -6.2, 5.8], [-1, -7, 6.4], [6, -6, 5.6], [10, -4.2, 4.4], [12.5, -1.6, 2.2], [13.4, -0.2, 0.6]], fat);
      var la = L.lipAngle || 0.75, lx = Math.cos(la), ly = Math.sin(la);
      o.push({ t: 'poly', pts: [[10, 1.4], [13, -0.2], [13 + lip * lx + 0.8, -0.2 + lip * ly - 0.6], [10.8 + lip * lx, 2.2 + lip * ly]], ramp: L.lipRamp || ['stone', 'stone_hi', 'stone_lit', 'fog_light'] });
      o.push({ t: 'body', pts: bp, ramp: L.back, belly: L.belly, split: 0.55, id: 'b' });
      if (L.bars) o.push({ t: 'bars', clip: 'b', u0: -11, u1: 7, n: L.bars, w: 1.5, f1: 0.62, slant: 0.25, key: L.barKey });
      if (L.throat) o.push({ t: 'band', clip: 'b', f0: 0.72, f1: 1, u0: 5, key: L.throat });
      if (L.scales) o.push({ t: 'flake', clip: 'b', dens: 0.18, res: 1.1, key: L.scales, only: 'icon' });
      if (fr) o.push({ t: 'band', clip: 'b', f0: 0.3, f1: 0.52, u0: -6, u1: 4, key: L.belly[L.belly.length - 1] });
      o.push({ t: 'ring', cx: 3.5, cy: 0.4, r: 5.2 * fat, w: 0.7, half: [1, 0], key: L.back[0], clip: 'b' });
      eye(o, 8.6, -1.9 * fat, 2.0, L.iris || ['rust', 'signal_amber', 'lamp_glow'], 'b');
      ring(o, 12.8 + lip * lx * 0.35, 0.3 + lip * ly * 0.35, 0.9);
      treble(o, 1, 6.4 * fat, 4.6, Math.PI / 2);
      ring(o, -15.6, 0, 0.8);
      treble(o, -16.4, 0.6, 4.4, Math.PI * 0.62);
      return o;
    }
  };

  // A spinnerbait: the wire bent like a safety pin, the blades on its upper arm (frames turn them:
  // face on, three-quarter, edge on, its back), the lead head and the skirt on the lower one.
  KINDS.spinner = {
    frames: 4,
    build: function (L, fr) {
      var o = [], cf = [1, 0.6, 0.18, 0.6][fr], lift = fr === 3 ? -0.3 : (fr === 1 ? 0.12 : 0);
      o.push({ t: 'tube', pts: [[13, -2.5, 0.75], [-4, -8.6, 0.65]], ramp: WIRE, flat: true });
      o.push({ t: 'tube', pts: [[13, -2.5, 0.8], [6.2, 3.4, 0.8]], ramp: WIRE, flat: true });
      ring(o, 13.6, -2.4, 0.9);
      if (L.tandem) {
        o.push({ t: 'tube', pts: [[4.6, -5.6, 0.6], [2.6, -6.4, 0.6]], ramp: WIRE, flat: true });
        o.push({ t: 'ell', cx: 0.3, cy: -6.6, rx: 2.8, ry: Math.max(0.5, 2.6 * [0.6, 1, 0.6, 0.18][fr]), ramp: L.blade2 || L.blade, lift: fr === 0 ? -0.25 : 0 });
      }
      o.push({ t: 'ring', cx: -4.6, cy: -8.9, r: 0.7, w: 0.5, ramp: WIRE, flat: true });
      o.push({ t: 'ell', cx: -10.6, cy: -9.5, rx: 6.2 * (L.bladeLen || 1), ry: Math.max(0.5, 2.4 * cf * (L.bladeW || 1)), erot: 0.12, ramp: L.blade, lift: lift });
      if (cf > 0.5) o.push({ t: 'tube', pts: [[-14.6, -9.9, 0.5], [-7.4, -9.3, 0.5]], key: L.blade[L.blade.length - 1], only: 'icon', clip: undefined });
      // the hook's shank under the skirt, then the skirt, then its point coming up through it
      o.push({ t: 'tube', pts: [[4, 4.4, 0.8], [-9.6, 4.6, 0.8]], ramp: HOOK, flat: true });
      var S = L.skirt;
      for (var k = 0; k < 7; k++) {
        var wv = Math.sin(fr * Math.PI / 2 + k * 1.3) * 0.7, end = -15.5 - (k % 3) * 1.2;
        o.push({ t: 'tube', pts: [[2.6, 3.4 + k * 0.38, 1.1], [-5, 2.6 + k * 0.95 + wv * 0.5, 1.0], [end, 1.6 + k * 1.45 + wv, 0.7]], ramp: S[k % S.length] });
      }
      o.push({ t: 'ell', cx: 2.4, cy: 4.4, rx: 1.1, ry: 2.7, ramp: L.collar || S[0] });
      o.push({ t: 'ell', cx: 5.4, cy: 4.4, rx: 3.5, ry: 2.9, ramp: L.head, id: 'h' });
      eye(o, 6.6, 3.7, 1.3, L.iris || ['blood', 'neon_red', 'pink_hi'], 'h');
      o.push({ t: 'ring', cx: -10, cy: 2.2, r: 2.4, w: 0.7, half: [-1, 0], ramp: HOOK, flat: true });
      o.push({ t: 'tube', pts: [[-10, -0.2, 0.6], [-7.2, -0.2, 0.5]], ramp: HOOK, flat: true });
      return o;
    }
  };

  // A spoon: a cupped metal teardrop, narrow at the line, a treble behind. Frame 1: its flash.
  KINDS.spoon = {
    frames: 2,
    build: function (L, fr) {
      var o = [], w = L.w || 1;
      var bp = scaleV([[-13, -0.6, 0.6], [-12, -3.6, 3.6], [-8, -5.6, 5.6], [-2, -5.4, 5.4], [5, -3.8, 3.8], [10, -2.1, 2.1], [12.3, -0.8, 0.8]], w);
      o.push({ t: 'body', pts: bp, ramp: L.metal, id: 'b', lift: fr ? 0.28 : 0 });
      if (L.stripes) o.push({ t: 'bars', clip: 'b', u0: -16, u1: 14, n: L.stripes, w: 2.4, slant: 0.7, key: L.stripeKey });
      if (L.stripe) o.push({ t: 'band', clip: 'b', f0: 0.4, f1: 0.6, u0: -9, u1: 8, key: L.stripe });
      if (L.hammer) o.push({ t: 'flake', clip: 'b', dens: 0.16, res: 0.9, key: L.metal[L.metal.length - 1], only: 'icon' });
      if (L.dots) for (var i = 0; i < L.dots.length; i++) o.push({ t: 'dot', cx: L.dots[i][0], cy: L.dots[i][1] * w, r: L.dots[i][2], ramp: L.dotRamp, clip: 'b' });
      o.push({ t: 'bars', clip: 'b', u0: fr ? -7 : 1, u1: (fr ? -7 : 1) + 3, n: 1, w: 1.3, slant: -0.55, f0: 0.08, f1: 0.55, key: L.metal[L.metal.length - 1] }); // the shine across its cup
      ring(o, 13.5, 0, 1.1);
      ring(o, -14, 0, 0.9);
      treble(o, -14.8, 0.4, 4.4 * (L.hook || 1), Math.PI * 0.68);
      return o;
    }
  };

  // A dropshot rig: the hook (the lure's point) on the line, a worm hooked through its nose,
  // the weight under it on the line (icon only: under water the scene puts it on the bed).
  KINDS.dropshot = {
    frames: 4, centre: [-7, 0],
    build: function (L, fr) {
      var o = [], wt = L.wt || 1, wl = L.wormLen || 1, pts = [];
      o.push({ t: 'tube', pts: [[0, -14, 0.5], [0, 9, 0.5]], key: LINE, flat: true, only: 'icon' });
      o.push({ t: 'tube', pts: [[0, 9, 0.5], [0, 11.5, 0.5]], key: LINE, flat: true, only: 'icon' });
      o.push({ t: 'ell', cx: 0, cy: 12 + 2.4 * wt, rx: 1.7 * wt, ry: 2.8 * wt, ramp: L.weight, only: 'icon' });
      ring(o, 0, 11.4, 0.7, 'icon');
      o.push({ t: 'tube', pts: [[0, -1, 0.7], [3, -1, 0.7]], ramp: HOOK, flat: true });
      for (var i = 0; i <= 9; i++) {
        var s = i / 9, a = s * s * 1.8;
        pts.push([2.4 - s * 21 * wl, -1.6 + Math.sin(s * 5 + fr * Math.PI / 2) * a, 2.7 - s * 1.5]);
      }
      o.push({ t: 'tube', pts: pts, ramp: L.worm, id: 'w' });
      o.push({ t: 'bars', clip: 'w', u0: -3.4, u1: 1.6, n: 4, w: 0.5, key: L.worm[0] });
      if (L.tail) o.push({ t: 'tube', pts: pts.slice(6), ramp: L.tail });
      o.push({ t: 'ring', cx: 3.2, cy: -2.3, r: 1.3, w: 0.6, half: [1, 0], ramp: HOOK, flat: true });
      o.push({ t: 'tube', pts: [[3.2, -3.6, 0.6], [1.6, -3.6, 0.5]], ramp: HOOK, flat: true });
      return o;
    }
  };

  // A wacky worm: a stick worm hooked through its middle by an O-ring, its ends drooping and
  // shimmying (the frames lift and drop them).
  KINDS.wacky = {
    frames: 4,
    build: function (L, fr) {
      var o = [], pts = [], sh = [0, 1, 0, -1][fr];
      o.push({ t: 'tube', pts: [[0.8, -7.4, 0.7], [0.8, 2.8, 0.7]], ramp: HOOK, flat: true });
      ring(o, 0.8, -8, 0.8);
      for (var i = 0; i <= 12; i++) {
        var s = i / 6 - 1;
        pts.push([s * 17, 4.2 * s * s - 1.6 + sh * 1.8 * s * s * s * s, 3.4 - Math.abs(s) * 0.7]);
      }
      o.push({ t: 'tube', pts: pts, ramp: L.worm, id: 'w' });
      o.push({ t: 'flake', clip: 'w', dens: 0.09, res: 1.6, key: L.flake, only: 'icon' });
      o.push({ t: 'bars', clip: 'w', u0: -0.9, u1: 0.9, n: 1, w: 1.1, key: L.oring || 'outline' });
      o.push({ t: 'ring', cx: 2.4, cy: 2.8, r: 1.6, w: 0.65, half: [0, 1], ramp: HOOK, flat: true });
      o.push({ t: 'tube', pts: [[4, 2.8, 0.6], [4, 0.6, 0.5]], ramp: HOOK, flat: true });
      return o;
    }
  };

  // A jig: the lead head with its eye and line tie, a trailer on the hook: a curly-tailed grub
  // (its tail curls and uncurls in the frames) or a craw (its claws flap).
  KINDS.jig = {
    frames: 4,
    build: function (L, fr) {
      var o = [], i;
      if (L.trailer === 'craw') {
        var fl = [0, 0.9, 0, -0.9][fr];
        o.push({ t: 'tube', pts: [[-9, -1, 0.5], [-17, -5.5 + fl, 0.4]], ramp: L.body, only: 'icon' });
        o.push({ t: 'tube', pts: [[-9, 1.2, 0.5], [-17.5, 6 - fl, 0.4]], ramp: L.body, only: 'icon' });
        o.push({ t: 'ell', cx: -13.6, cy: -2.2 + fl * 0.6, rx: 4.6, ry: 1.7, erot: -0.22, ramp: L.body, id: 'c1' });
        o.push({ t: 'ell', cx: -13.2, cy: 3.4 - fl * 0.6, rx: 4.4, ry: 1.6, erot: 0.26, ramp: L.body, id: 'c2' });
        o.push({ t: 'band', clip: 'c1', f0: 0, f1: 1, u1: -16, key: L.tip });
        o.push({ t: 'band', clip: 'c2', f0: 0, f1: 1, u1: -15.6, key: L.tip });
        o.push({ t: 'tube', pts: [[6, 0, 4.8], [1, 0.2, 4.6], [-5, 0.5, 3.6], [-9.5, 0.6, 2.4]], ramp: L.body, id: 'g' });
      } else {
        var cu = [4.2, 3.6, 3.0, 3.6][fr], c0 = -10.4, c1 = 3.4, tp = [];
        for (i = 0; i <= 10; i++) {
          var s = i / 10, a = -Math.PI / 2 - s * cu, r = 3.6 * (1 - 0.32 * s);
          tp.push([c0 + Math.cos(a) * r + (1 - s) * 0.4, c1 + Math.sin(a) * r, 2.4 - s * 1.3]);
        }
        o.push({ t: 'tube', pts: [[-6, 0.4, 2.4]].concat(tp), ramp: L.tail || L.body });
        o.push({ t: 'tube', pts: [[6, 0, 4.4], [2, 0, 4.6], [-2.5, 0.2, 4.0], [-6.4, 0.4, 2.8]], ramp: L.body, id: 'g' });
      }
      o.push({ t: 'bars', clip: 'g', u0: -6, u1: 3, n: 5, w: 0.55, key: L.body[0] });
      if (L.flake) o.push({ t: 'flake', clip: 'g', dens: 0.1, res: 1.6, key: L.flake, only: 'icon' });
      o.push({ t: 'tube', pts: [[-3, -1.8, 0.7], [-3, -4.4, 0.6]], ramp: HOOK, flat: true });
      o.push({ t: 'tube', pts: [[-3, -4.4, 0.5], [-1.9, -3.5, 0.4]], ramp: HOOK, flat: true });
      if (L.head === undefined) return o;
      var foot = L.football;
      o.push({ t: 'ell', cx: 6.2, cy: 0, rx: 1.0, ry: 2.6, ramp: L.collar || DARK });
      o.push({ t: 'ell', cx: foot ? 10.4 : 10, cy: 0, rx: foot ? 5.4 : 4.4, ry: foot ? 3.6 : 4.4, erot: foot ? -0.2 : 0, ramp: L.headRamp, id: 'h' });
      eye(o, 11.6, -0.8, 1.5, L.iris || ['rust', 'signal_amber', 'lamp_glow'], 'h');
      ring(o, foot ? 11.4 : 10.6, foot ? -4.4 : -5.2, 1.0);
      return o;
    }
  };

  // A topwater popper: a cupped face that spits (frame 1, under water only), a feathered tail.
  KINDS.top = {
    frames: 2,
    build: function (L, fr) {
      var o = [], i;
      for (i = 0; i < 5; i++) {
        var wv = Math.sin(fr * Math.PI + i) * 0.5;
        o.push({ t: 'tube', pts: [[-11, 0.5 + (i - 2) * 0.5, 1.2], [-15.5, (i - 2) * 1.2 + wv, 1.0], [-20.5, (i - 2) * 1.9 + wv, 0.6]], ramp: L.feather[i % L.feather.length] });
      }
      o.push({ t: 'body', pts: [[-12.5, -1.6, 1.6], [-10, -3.4, 3.4], [-3, -5, 5], [6, -5.2, 5.2], [10.6, -5, 5], [11.4, -4.6, 4.6]], ramp: L.back, belly: L.belly, split: 0.55, id: 'b' });
      if (L.spots) for (i = 0; i < L.spots.length; i++) o.push({ t: 'dot', cx: L.spots[i][0], cy: L.spots[i][1], r: L.spots[i][2], ramp: L.spotRamp, clip: 'b' });
      if (L.throat) o.push({ t: 'band', clip: 'b', f0: 0.7, f1: 1, u0: 6, key: L.throat });
      o.push({ t: 'poly', pts: [[11.2, -4.7], [12.6, -4.5], [11.1, 0], [12.6, 4.5], [11.2, 4.7]], ramp: DARK });
      eye(o, 7.6, -1.8, 2.0, L.iris || ['rust', 'signal_amber', 'lamp_glow'], 'b');
      ring(o, 12.8, -0.2, 0.8);
      treble(o, 1, 5.4, 4.4, Math.PI / 2);
      if (fr) for (i = 0; i < 6; i++) o.push({ t: 'dot', cx: 14 + (i % 3) * 2.2, cy: -3 + i * 1.3 - (i % 2) * 1.6, r: 0.9, key: 'water_foam', only: 'uw' });
      return o;
    }
  };

  // A bladebait: a thin metal fish with a lead nose, line holes along its back (the snap in
  // one), trebles under the belly and behind. Frame 1: the flash as it shivers.
  KINDS.blade = {
    frames: 2,
    build: function (L, fr) {
      var o = [];
      o.push({ t: 'body', pts: [[-12.4, -1.2, 1.2], [-10, -3.4, 2.8], [-4, -6.4, 5], [3, -7, 5.8], [8, -5.4, 6.2], [11, -2.4, 5.4], [12.4, 0.4, 3.4]], ramp: L.metal, id: 'b', lift: fr ? 0.25 : 0 });
      if (L.backBand) o.push({ t: 'band', clip: 'b', f0: 0, f1: 0.3, ramp: L.backBand });
      if (L.dots) o.push({ t: 'flake', clip: 'b', dens: 0.12, res: 0.7, key: L.dots, only: 'icon' });
      o.push({ t: 'band', clip: 'b', f0: 0.42, f1: 1, u0: 5.5, ramp: L.lead });
      eye(o, 9, 1.8, 1.6, L.iris || ['blood', 'neon_red', 'pink_hi'], 'b');
      o.push({ t: 'dot', cx: -4.2, cy: -5.2, r: 0.55, key: 'outline', clip: 'b' });
      o.push({ t: 'dot', cx: -1.2, cy: -5.9, r: 0.55, key: 'outline', clip: 'b' });
      o.push({ t: 'dot', cx: 1.8, cy: -6.2, r: 0.55, key: 'outline', clip: 'b' });
      o.push({ t: 'ring', cx: -1.2, cy: -7.9, r: 1.5, w: 0.55, ramp: WIRE, flat: true });
      treble(o, 4, 6.4, 4.4, Math.PI / 2);
      treble(o, -12.8, 0.8, 4.2, Math.PI * 0.66);
      return o;
    }
  };

  // A glidebait: two jointed halves (the frames swing the back one: its glide), a soft tail, a
  // treble under each. Painted as a fish (a back, a band along its flank, spots).
  KINDS.glide = {
    frames: 4,
    build: function (L, fr) {
      var o = [], ang = [0, 0.13, 0, -0.13][fr], R = { rot: ang, pu: 0, pv: 0 }, i;
      function rr(p) { p.rot = R.rot; p.pu = 0; p.pv = 0; return p; }
      o.push(rr({ t: 'poly', pts: [[-14.6, -0.9], [-19.6, -5], [-18.2, 0], [-19.6, 5], [-14.6, 0.9]], ramp: L.fin }));
      o.push(rr({ t: 'body', pts: [[-15.2, -1.6, 1.6], [-11, -3.4, 3.2], [-5, -4.6, 4.1], [-0.7, -4.6, 4.1]], ramp: L.back, belly: L.belly, split: 0.5, id: 'r' }));
      o.push({ t: 'body', pts: [[0.7, -4.6, 4.2], [4, -5.2, 4.8], [10, -4.6, 4.3], [14, -3, 3], [16.4, -1.1, 1.3], [17.2, 0, 0.4]], ramp: L.back, belly: L.belly, split: 0.5, id: 'f' });
      o.push({ t: 'tube', pts: [[-1.2, 0, 1.4], [1.2, 0, 1.4]], ramp: ['chrome_dark', 'chrome'] });
      var parts = ['r', 'f'];
      for (i = 0; i < 2; i++) {
        if (L.band) o.push(i ? { t: 'band', clip: parts[i], f0: 0.4, f1: 0.56, key: L.band } : rr({ t: 'band', clip: parts[i], f0: 0.4, f1: 0.56, key: L.band }));
        if (L.spots) o.push(i ? { t: 'flake', clip: parts[i], dens: 0.12, res: 0.75, key: L.spots, only: 'icon' } : rr({ t: 'flake', clip: parts[i], dens: 0.12, res: 0.75, key: L.spots, only: 'icon' }));
      }
      if (L.shoulder) o.push({ t: 'dot', cx: 8.4, cy: -1.4, r: 1.5, key: L.shoulder, clip: 'f' });
      o.push({ t: 'ring', cx: 9.8, cy: 0.2, r: 4.6, w: 0.6, half: [1, 0], key: L.back[0], clip: 'f' });
      eye(o, 13.2, -1.2, 1.8, L.iris || ['rust', 'signal_amber', 'lamp_glow'], 'f');
      ring(o, 17.6, -0.2, 0.8);
      treble(o, 6, 4.8, 4.2, Math.PI / 2);
      var t2 = []; treble(t2, -7, 4.2, 4, Math.PI / 2);
      for (i = 0; i < t2.length; i++) o.push(rr(t2[i]));
      return o;
    }
  };

  // A swimbait: a soft fish on a jighead (its hook point out of the back) with a paddle tail
  // that beats (the frames swing it, foreshortened edge on in the middle of the beat).
  KINDS.swim = {
    frames: 4,
    build: function (L, fr) {
      var o = [], d = L.deep ? 1 : 0, i;
      var bp = d ? [[-10, -1.4, 1.4], [-7, -5, 4.6], [-1, -9, 8], [5, -8.6, 7.6], [10, -5.6, 5.2], [13, -2.4, 2.2], [13.8, 0, 0.6]]
        : [[-11, -1.1, 1.1], [-8, -2.8, 2.6], [-2, -4.6, 4.2], [5, -4.8, 4.4], [10, -3.8, 3.6], [13.5, -1.8, 2], [14.6, 0, 0.5]];
      var tu = d ? -10 : -11, ph = [0.32, 0.12, -0.32, 0.12][fr], wf = [1, 0.55, 1, 0.55][fr], ph2 = d ? 5.4 : 3.6;
      o.push({ t: 'poly', pts: [[tu + 0.6, -0.8], [tu - 2.8 * wf, -ph2], [tu - 3.8 * wf, -ph2 * 0.9], [tu - 3.8 * wf, ph2 * 0.9], [tu - 2.8 * wf, ph2], [tu + 0.6, 0.8]], ramp: L.tail || L.back, rot: ph, pu: tu, pv: 0 });
      if (d) {
        o.push({ t: 'poly', pts: [[-6, -4], [-3, -10.6], [4, -10.6], [7, -6.8]], ramp: L.fin });
        o.push({ t: 'poly', pts: [[-6, 3.6], [-3, 9.4], [2, 8.6]], ramp: L.fin });
      }
      o.push({ t: 'body', pts: bp, ramp: L.back, belly: L.belly, split: d ? 0.62 : 0.5, id: 'b' });
      if (L.bars) o.push({ t: 'bars', clip: 'b', u0: -6, u1: 9, n: L.bars, w: 1.6, f1: 0.8, key: L.barKey });
      if (L.stripe) o.push({ t: 'band', clip: 'b', f0: 0.44, f1: 0.52, u1: 9, key: L.stripe });
      if (L.ear) o.push({ t: 'ell', cx: 8.6, cy: -0.6, rx: 1.6, ry: 1.2, ramp: L.ear, clip: 'b' });
      o.push({ t: 'ring', cx: 6.6 + d, cy: 0, r: 4.4 + d * 1.6, w: 0.6, half: [1, 0], key: L.back[0], clip: 'b' });
      eye(o, d ? 11 : 11.6, d ? -1.8 : -1, d ? 1.8 : 1.5, L.iris || ['rust', 'signal_amber', 'lamp_glow'], 'b');
      if (L.head) o.push({ t: 'band', clip: 'b', f0: 0, f1: 1, u0: 12.4, ramp: L.head });
      o.push({ t: 'tube', pts: [[0, d ? -8.8 : -4.6, 0.7], [0, d ? -11 : -6.8, 0.6]], ramp: HOOK, flat: true });
      o.push({ t: 'tube', pts: [[0, d ? -11 : -6.8, 0.5], [1.1, d ? -10.1 : -5.9, 0.4]], ramp: HOOK, flat: true });
      ring(o, d ? 14.4 : 15.2, -0.2, 0.8);
      return o;
    }
  };

  // ---- Raster -----------------------------------------------------------------------------------
  function looks() { return G.data.lureLooks || {}; }
  function lookOf(id) { var L = looks()[id]; if (!L) throw new Error('no lure look for ' + id); return L; }
  function kindOf(id) { var L = lookOf(id), K = KINDS[L.kind]; if (!K) throw new Error('lure ' + id + ': no kind ' + L.kind); return K; }
  function shapes(id, fr, mode) {
    var all = kindOf(id).build(lookOf(id), fr), out = [];
    for (var i = 0; i < all.length; i++) if (!all[i].only || all[i].only === mode) out.push(all[i]);
    return out;
  }
  // The union of the shapes' bounds: [u0, v0, u1, v1].
  function boundsOf(sh) {
    var b = [1e9, 1e9, -1e9, -1e9];
    for (var i = 0; i < sh.length; i++) { var q = bounds(sh[i]); if (!q) continue; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); }
    return b;
  }

  // Samples the shapes into a W×H grid of keys. (ox, oy): where the design origin falls; sc:
  // px a design unit; heading ang (0 right; the shapes turned to it), mirror: v flipped (a lure
  // facing left is mirrored, not upside down). icon: the outline round it; else the lower edge
  // takes each shape's darkest key (lit from above, as the baits are).
  // Wire, hooks and line are at least a pixel wide (st.mw), so they never break into dots;
  // under water a sprite this small (sc under HOOK_SC) leaves its hooks out.
  var HOOK_SC = 0.45;
  function raster(sh, W, H, ox, oy, sc, ang, mirror, icon) {
    var g = new Array(W * H), flat = new Uint8Array(W * H), dark = new Array(W * H), st = { f: 0, belly: false, mw: 0.95 / sc }, ca = Math.cos(ang), sa = Math.sin(ang), i, j, k;
    if (!icon && sc < HOOK_SC) { var kept = []; for (k = 0; k < sh.length; k++) if (sh[k].ramp !== HOOK) kept.push(sh[k]); sh = kept; }
    for (j = 0; j < H; j++) for (i = 0; i < W; i++) {
      var dx = (i + 0.5 - ox) / sc, dy = (j + 0.5 - oy) / sc, u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) * (mirror ? -1 : 1);
      var key = '', own = '', fl = 0, dk = '', baseF = 0;
      for (k = 0; k < sh.length; k++) {
        var p = sh[k];
        if (p.clip) { if (own !== p.clip) continue; st.f = baseF; }
        if (p.half === 1 && u < 0) continue;                                        // the float's top half
        st.belly = false;
        var t = cover(p, u, v, st);
        if (t < 0) continue;
        key = st.belly && p.belly ? belly(p, t) : keyOf(p, t);
        if (!p.clip) { own = p.id || ''; baseF = st.f; fl = p.flat ? 1 : 0; dk = p.ramp ? p.ramp[0] : p.key; }
      }
      g[j * W + i] = key; flat[j * W + i] = fl; dark[j * W + i] = dk;
    }
    var out = g.slice();
    for (j = 0; j < H; j++) for (i = 0; i < W; i++) {
      var q = j * W + i;
      if (icon) {
        if (g[q]) continue;
        for (k = 0; k < 4; k++) {
          var ni = i + [1, -1, 0, 0][k], nj = j + [0, 0, 1, -1][k];
          if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
          var n = nj * W + ni;
          if (g[n] && !flat[n]) { out[q] = 'outline'; break; }
        }
      } else if (g[q] && !flat[q] && (j === H - 1 || !g[q + W])) out[q] = dark[q];
    }
    return { W: W, H: H, g: out };
  }

  // A lure's icon: its native size (the look's len px from end to end), or fitted in
  // maxW × maxH when given (the lists and the HUD's chip), outlined. A float stands nose up.
  function icon(id, maxW, maxH, fr) {
    var K = kindOf(id), L = lookOf(id), sh = shapes(id, fr || 0, 'icon'), b = boundsOf(sh), up = !!K.upright;
    var bw = up ? b[3] - b[1] : b[2] - b[0], bh = up ? b[2] - b[0] : b[3] - b[1], sc = L.len / (b[2] - b[0]);
    if (maxW) sc = Math.min(sc, (maxW - 2) / bw, (maxH - 2) / bh);
    var W = Math.ceil(bw * sc) + 2, H = Math.ceil(bh * sc) + 2;
    // the origin within: right of the leftmost point (nose up: below the highest)
    var ox = up ? 1 + (-b[1]) * sc : 1 + (-b[0]) * sc, oy = up ? 1 + b[2] * sc : 1 + (-b[1]) * sc;
    return raster(sh, W, H, ox, oy, sc, up ? -Math.PI / 2 : 0, false, true);
  }

  // A lure's sprite under water, heading slot k of DIRS, frame fr: a square box, the lure the
  // look's uw view px (half a world px each) from end to end, centred on it (or the kind's centre).
  var boxes = {};
  function box(id) {
    if (boxes[id]) return boxes[id];
    var L = lookOf(id), K = kindOf(id), b0 = boundsOf(shapes(id, 0, 'uw')), sc = L.uw / (b0[2] - b0[0]), c = K.centre || [0, 0], R = 0, f, i;
    for (f = 0; f < K.frames; f++) {
      var b = boundsOf(shapes(id, f, 'uw')), cs = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]];
      for (i = 0; i < 4; i++) R = Math.max(R, Math.sqrt((cs[i][0] - c[0]) * (cs[i][0] - c[0]) + (cs[i][1] - c[1]) * (cs[i][1] - c[1])));
    }
    var S = 2 * Math.ceil(R * sc) + 2;
    return (boxes[id] = { S: S, sc: sc, c: c });
  }
  function sprite(id, k, fr) {
    var B = box(id), a = k / DIRS * 2 * Math.PI, ca = Math.cos(a), mir = ca < -0.01;
    // the look's centre at the box's middle: the origin is offset from it along the heading
    var cu = B.c[0] * B.sc, cv = B.c[1] * B.sc * (mir ? -1 : 1), ox = B.S / 2 - (cu * ca - cv * Math.sin(a)), oy = B.S / 2 - (cu * Math.sin(a) + cv * ca);
    return raster(shapes(id, fr % kindOf(id).frames, 'uw'), B.S, B.S, ox, oy, B.sc, a, mir, false);
  }
  // Where the line ties on, from the sprite's middle, for a dropshot (its hook) in view px.
  function anchor(id) { var B = box(id); return [-B.c[0] * B.sc, -B.c[1] * B.sc]; }

  function keysOf(gr) { var seen = {}, out = []; for (var i = 0; i < gr.g.length; i++) if (gr.g[i] && !seen[gr.g[i]]) { seen[gr.g[i]] = 1; out.push(gr.g[i]); } return out; }
  function filled(gr) { var n = 0; for (var i = 0; i < gr.g.length; i++) if (gr.g[i]) n++; return n; }

  // ---- Baked (the browser only) -----------------------------------------------------------------
  var imgs = {};
  function bakeGrid(gr) { return G.gfx.bake.layer(gr.W, gr.H, function (c) { G.gfx.paint.area(c, 0, 0, gr.W, gr.H, function (x, y) { return gr.g[y * gr.W + x]; }); }); }
  function iconImg(id, maxW, maxH) { var key = 'i:' + id + ':' + (maxW || 0) + ':' + (maxH || 0); return imgs[key] || (imgs[key] = bakeGrid(icon(id, maxW, maxH, 0))); }
  var spr = {};
  function spriteImg(id, k, fr) {
    var t = spr[id] || (spr[id] = []), q = k * 4 + (fr & 3);
    return t[q] || (t[q] = bakeGrid(sprite(id, k, fr)));
  }
  function frames(id) { return kindOf(id).frames; }

  return { BASE: BASE, DIRS: DIRS, KINDS: KINDS, icon: icon, sprite: sprite, box: box, anchor: anchor, frames: frames, keysOf: keysOf, filled: filled,
    iconImg: iconImg, spriteImg: spriteImg, has: function (id) { return !!looks()[id]; } };
})();
