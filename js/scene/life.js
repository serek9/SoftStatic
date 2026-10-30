var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Phase 48: life under water (PLAN_TACKLE.md 2.9). Presentation only: everything here is
// stepped in update() from G.vrng and drawn from its own arrays, and never touches a catch.
//   on the bed: crayfish that walk, rest and back off tail first from a splash or the lure
//   near them; snails crawling over the boulders, pulling into their shells at a splash;
//   silt that puffs up wherever something touches the bed (a crayfish, the eel, the lure
//   dragged or hopped along the bottom, a fish nosing it);
//   in the water: clouds of fry by the weed and tadpoles near the shore, which part around
//   anything that comes near (a fish, the lure, the hooked fish, the turtle, the eel) and
//   re-form; a perch that now and then darts through a cloud; a turtle crossing at mid
//   depth; an eel along the bed at night.
// The static things (mussels, caddis cases, litter, roots, a drowned tree, algae, the new
// weeds) are painted into the cross-section's layers by underwater.prepare from the same
// table (WATERS). Coordinates are world x and depth px below the waterline, like the school.
// TODO(P49.1): the diving duck's feet and body passing down and up, and the heron's beak
// coming down through the surface for a small fish, arrive with the birds above the water.
G.scene = G.scene || {};
G.scene.life = (function () {
  var HI = 2, S = G.gfx.sprites, P = S.PALETTE, B = G.gfx.bake;

  // Each water's own table. cray, snail: how many; fry, tad: clouds of fry by the weed and of
  // tadpoles near the shore; turtle, eel: whether they live here. Painted by underwater.prepare:
  // mussel (count), caddis (cases on the snags), litter (one each, in order), roots, tree (a
  // drowned tree on the bed), ribbon and fern (weeds per world px), lily (stems to pads at the
  // surface), algae (the share of boulders that carry it).
  var WATERS = {
    fog:   { cray: 7, snail: 8, fry: 5, tad: 2, turtle: true,  eel: true, mussel: 10, caddis: false, litter: ['bottle', 'lure', 'bottle'], roots: 2, tree: 1, ribbon: 0.025, fern: 0.02, lily: 5, algae: 0.6 },
    creek: { cray: 9, snail: 4, fry: 4, tad: 2, turtle: false, eel: true, mussel: 6, caddis: true, litter: ['bottle', 'lure'], roots: 5, tree: 0, ribbon: 0.03, fern: 0.008, lily: 0, algae: 0.5 },
    pines: { cray: 5, snail: 5, fry: 3, tad: 0, turtle: true,  eel: true, mussel: 4, caddis: false, litter: ['tyre', 'bottle', 'lure', 'tyre'], roots: 1, tree: 1, ribbon: 0.012, fern: 0.02, lily: 3, algae: 0.3 },
    red:   { cray: 2, snail: 2, fry: 2, tad: 0, turtle: false, eel: true, mussel: 0, caddis: false, litter: ['lure'], roots: 0, tree: 0, ribbon: 0.012, fern: 0.01, lily: 0, algae: 0.2 }
  };
  var NONE = { cray: 0, snail: 0, fry: 0, tad: 0, turtle: false, eel: false, mussel: 0, caddis: false, litter: [], roots: 0, tree: 0, ribbon: 0, fern: 0, lily: 0, algae: 0 };
  function table(id) { return WATERS[id] || NONE; }

  var L = {
    crayV: 2, crayBack: 16, crayBackT: 0.7, // px/s walking, px/s backing off at first, s it lasts
    crayR0: 36, crayRK: 30,                 // px: a splash this near (plus RK × power) makes it back off
    crayNear: 12,                           // px: anything this near does too
    snailV: 0.25, snailR: 30, snailHide: 4, // px/s, px of a splash that sends it in, s it stays in
    K: 2.2, D: 2.6,                         // the cloud's spring (1/s², 1/s): back in place in 2-4 s
    push: 420, vmax: 40,                    // px/s² away from a threat, px/s at most
    sepX: 2, sepY: 1,                       // px: no two fry nearer than this across while nearer than sepY down
    dart0: 35, dart1: 80, dartV: 46,        // s between a perch darting through a cloud, its px/s
    turtle0: 70, turtle1: 150, turtleV: 5,  // s between turtles, px/s
    eel0: 50, eel1: 110, eelV: 9, eelLen: 26 // s between eels (night only), px/s, body length px
  };

  // ---- Sprites: rows of view pixels in palette keys, baked once, drawn at 1/HI ---------------
  var spr = {};
  function sprite(name, map, frames) {
    var d = spr[name];
    if (d) return d;
    d = spr[name] = { w: frames[0][0].length, h: frames[0].length, cv: [], fl: [] };
    for (var f = 0; f < frames.length; f++) {
      var cv = B.canvas(d.w, d.h), c = cv.getContext('2d');
      for (var y = 0; y < d.h; y++) for (var x = 0; x < d.w; x++) {
        var ch = frames[f][y].charAt(x);
        if (ch === '.') continue;
        c.fillStyle = P[map[ch]];
        c.fillRect(x, y, 1, 1);
      }
      d.cv.push(cv); d.fl.push(B.flipped(cv, 'x'));
    }
    return d;
  }
  // Facing right; the bottom row sits on the bed.
  function crayArt() {
    return sprite('cray', { o: 'rust_dark', r: 'rust', h: 'rust_hi', e: 'ink' }, [
      ['..........hh',
       '...rrrrr.hr.',
       'orrrhrrrrr..',
       'oorrrrrrre..',
       '.o.r.r.r....'],
      ['..........hh',
       '...rrrrr.hr.',
       'orrrhrrrrr..',
       'oorrrrrrre..',
       '..r.r.r.r...']
    ]);
  }
  function snailArt() {
    return sprite('snail', { b: 'wood_mid', h: 'wood_lit', d: 'wood_dark', f: 'stone', t: 'stone_hi' }, [
      ['..bbb...',
       '.bhhbb.t',
       '.bdhbbf.',
       'ffffffff'],
      ['..bbb...',
       '.bhhbb..',
       '.bdhbb..',
       '.dddd...']
    ]);
  }
  function turtleArt() {
    var m = { k: 'moss_dark', m: 'moss', h: 'moss_lit', s: 'moss_hi', p: 'moss', e: 'ink' };
    var top = ['......kkkkkk........',
               '....kmmhmmhmk.......',
               '...kmmmmmmmmmk.ss...',
               '..kmmhmmmhmmmmkssse.'];
    return sprite('turtle', m, [
      top.concat(['.ppkkkkkkkkkkkk.ss..', 'pp....pp....pp......']),
      top.concat(['..pkkkkkkkkkkkk.ss..', '...pp....pp.pp......'])
    ]);
  }
  function tadArt() {
    return sprite('tad', { k: 'wood_deep', e: 'wood_dark' }, [
      ['...kk', 'kkkke', '...kk'],
      ['k..kk', '.kkke', '...kk']
    ]);
  }

  // ---- State (typed arrays, sized once) --------------------------------------------------
  var CMAX = 12, cxs = new Float32Array(CMAX), cys = new Float32Array(CMAX), cdir = new Int8Array(CMAX), cmode = new Uint8Array(CMAX);
  var ct = new Float32Array(CMAX), cph = new Float32Array(CMAX), creact = new Float32Array(CMAX), cthr = new Float32Array(CMAX), csilt = new Float32Array(CMAX), cn = 0;
  var NMAX = 10, nx = new Float32Array(NMAX), ny = new Float32Array(NMAX), ndir = new Int8Array(NMAX), nhide = new Float32Array(NMAX), nr = new Int16Array(NMAX), nn = 0;
  var rocks = null; // the boulders' {x, cy, rw, rh} from the bake (world px)
  // Clouds: kind 0 fry, 1 tadpoles; members per cloud from k0[c] to k0[c] + kn[c].
  var QMAX = 7, FMAX = 96, PER_FRY = 14, PER_TAD = 6;
  var qkind = new Uint8Array(QMAX), qx = new Float32Array(QMAX), qy = new Float32Array(QMAX), k0 = new Int16Array(QMAX), kn = new Int16Array(QMAX), qbroke = new Float32Array(QMAX), qn = 0;
  var fx_ = new Float32Array(FMAX), fy = new Float32Array(FMAX), fvx = new Float32Array(FMAX), fvy = new Float32Array(FMAX), fox = new Float32Array(FMAX), foy = new Float32Array(FMAX), fph = new Float32Array(FMAX), fface = new Int8Array(FMAX), fnum = 0;
  // Threats this step: x, depth, reach.
  var TMAX = 16, tx = new Float32Array(TMAX), ty = new Float32Array(TMAX), tr = new Float32Array(TMAX), tn = 0;
  // The rare visitors.
  var dart = { on: false, x: 0, y: 0, dir: 1, go: 0, wait: 0, ph: 0 };
  var turtle = { on: false, x: 0, y: 0, dir: 1, wait: 0, ph: 0, y0: 0 };
  var eel = { on: false, x: 0, y: 0, dir: 1, wait: 0, ph: 0, silt: 0 };
  var EELN = 14, ex = new Float32Array(EELN), ey = new Float32Array(EELN);
  // Silt: a small pool of slow motes.
  var SMAX = 64, sx = new Float32Array(SMAX), sy = new Float32Array(SMAX), svx = new Float32Array(SMAX), svy = new Float32Array(SMAX), sl = new Float32Array(SMAX), sm = new Float32Array(SMAX), sn = 0;
  var siltKey = 'wood_mid', locId = '', curLoc = null, lureSilt = 0, lastLx = 0, nose = new Float32Array(8);
  var react = { lastDelay: 0 }; // dbg: the last splash's slowest crayfish reaction (s)
  var stats = { ms: 0, bedMs: 0, waterMs: 0 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function U() { return G.scene.underwater; }
  function bed(x) { return U().bottomAt(curLoc, x) + 1; }

  // Places a water's creatures (on arrival; the bake has run, so the boulders and weeds are known).
  function setup(loc) {
    var T = table(loc.id), set = U().prepare(loc), r = G.vrng, i, j;
    curLoc = loc; locId = loc.id; rocks = set.rocks || [];
    siltKey = S.shift(loc.underwater.silt, 1);
    cn = Math.min(CMAX, T.cray);
    for (i = 0; i < cn; i++) {
      cxs[i] = r.range(30, loc.width - 30); cys[i] = bed(cxs[i]); cdir[i] = r.next() < 0.5 ? -1 : 1;
      cmode[i] = r.next() < 0.5 ? 0 : 1; ct[i] = r.range(1, 6); cph[i] = r.next(); creact[i] = -1; csilt[i] = r.range(0, 1);
    }
    nn = Math.min(NMAX, T.snail, rocks.length);
    for (i = 0; i < nn; i++) {
      nr[i] = Math.floor(i * rocks.length / Math.max(1, nn)); var rk = rocks[nr[i]];
      nx[i] = rk.x + r.range(-rk.rw * 0.6, rk.rw * 0.6); ndir[i] = r.next() < 0.5 ? -1 : 1; nhide[i] = 0;
      ny[i] = rockTop(rk, nx[i]);
    }
    // Fry by the weed strands (spread along the water), tadpoles near the two shores.
    qn = 0; fnum = 0;
    var strands = (set.strands || []).slice().sort(function (p, q) { return p.x - q.x; }); // once per water, on arrival
    for (i = 0; i < T.fry && qn < QMAX && strands.length; i++) {
      var st = strands[Math.floor((i + r.range(0.1, 0.9)) * strands.length / T.fry)];
      addCloud(0, st.x + r.range(-6, 6), st.base - st.h * r.range(0.5, 0.9), PER_FRY);
    }
    for (i = 0; i < T.tad && qn < QMAX; i++) addCloud(1, i % 2 ? loc.width - r.range(40, 140) : r.range(40, 140), r.range(5, 13), PER_TAD);
    for (j = 0; j < fnum; j++) fface[j] = r.next() < 0.5 ? -1 : 1;
    dart.on = turtle.on = eel.on = false;
    dart.wait = r.range(15, 40); turtle.wait = r.range(25, 60); eel.wait = r.range(20, 50);
    sn = 0;
  }
  // Rest offsets on a loose grid, so a cloud at rest has no two fry overlapping.
  function addCloud(kind, x, y, n) {
    var c = qn++, cols = kind ? 3 : 5, gx = kind ? 4 : 2.6, gy = kind ? 2.5 : 1.7;
    qkind[c] = kind; qx[c] = x; qy[c] = y; k0[c] = fnum; kn[c] = 0; qbroke[c] = 0;
    for (var i = 0; i < n && fnum < FMAX; i++) {
      var k = fnum++, row = (i / cols) | 0, col = i % cols;
      fox[k] = (col - (cols - 1) / 2) * gx + (row & 1 ? gx * 0.5 : 0) + G.vrng.range(-0.3, 0.3);
      foy[k] = (row - 1) * gy + G.vrng.range(-0.2, 0.2);
      fx_[k] = x + fox[k]; fy[k] = y + foy[k]; fvx[k] = fvy[k] = 0; fph[k] = G.vrng.range(0, 6.28);
      kn[c]++;
    }
  }
  function rockTop(rk, x) {
    var u = clamp((x - rk.x) / rk.rw, -0.95, 0.95);
    return rk.cy - rk.rh * Math.sqrt(1 - u * u);
  }

  // A splash at the surface (fx.listen): crayfish within reach back off (after a reaction of
  // at most 0.3 s, the nearer the sooner); snails pull in.
  function onSplash(x, power) {
    if (!curLoc) return;
    var R = L.crayR0 + L.crayRK * Math.min(1, power), worst = -1;
    for (var i = 0; i < cn; i++) {
      var d = Math.abs(cxs[i] - x);
      if (d > R || cmode[i] === 2 || creact[i] >= 0) continue;
      creact[i] = 0.08 + d / 400; cthr[i] = x;
      if (creact[i] > worst) worst = creact[i];
    }
    if (worst >= 0) react.lastDelay = worst;
    for (var j = 0; j < nn; j++) if (Math.abs(nx[j] - x) < L.snailR) nhide[j] = L.snailHide;
  }
  G.gfx.fx.listen(onSplash);

  function siltPuff(x, y, n) {
    for (var i = 0; i < n && sn < SMAX; i++) {
      var k = sn++;
      sx[k] = x + G.vrng.range(-1.5, 1.5); sy[k] = y - G.vrng.range(0, 1);
      svx[k] = G.vrng.range(-3, 3); svy[k] = -G.vrng.range(1.5, 4);
      sl[k] = sm[k] = G.vrng.range(1.2, 2.4);
    }
  }

  function addThreat(x, y, r) { if (tn < TMAX) { tx[tn] = x; ty[tn] = y; tr[tn] = r; tn++; } }

  // ---- Step (underwater.viewStep, while the cross-section shows) --------------------------------
  function step(run, dt, loc) {
    var t0 = performance.now();
    if (locId !== loc.id) setup(loc);
    var T = table(loc.id), r = G.vrng, wy = loc.waterY, camC = run.cam.x + 160, i, j, k;
    var night = !G.sim.clock.isGrey(G.state.save.clock || 0);
    // What the small things keep away from.
    tn = 0;
    var school = run.school, under = U().UNDER[run.fsm] === 1, c = run.cast;
    if (school) for (i = 0; i < school.fish.length; i++) {
      var f = school.fish[i];
      if (!f.active) continue;
      addThreat(f.x, f.y, 18);
      // A fish nosing the bed stirs the silt.
      if (i < 8) { nose[i] -= dt; if (nose[i] <= 0 && f.y > U().bottomAt(loc, f.x) - 4 && f.spd > 1.5) { nose[i] = 0.6; siltPuff(f.x, bed(f.x), 1); } }
    }
    if (run.hook && (run.fsm === 'hooked' || run.fsm === 'fighting')) addThreat(run.hook.x, run.hook.y, 24);
    if (under) {
      var ld = c.ly - wy, floor = U().bottomAt(loc, c.lx);
      addThreat(c.lx, ld, 14);
      // The lure on the bed: dragged along or hopped, it lifts silt.
      lureSilt -= dt;
      if (ld >= floor - 1.5 && Math.abs(c.lx - lastLx) > 0.05 && lureSilt <= 0) { lureSilt = 0.2; siltPuff(c.lx, bed(c.lx), 2); }
      for (i = 0; i < cn; i++) if (cmode[i] !== 2 && creact[i] < 0 && Math.abs(cxs[i] - c.lx) < L.crayNear && Math.abs(cys[i] - ld) < 10) { creact[i] = 0.1; cthr[i] = c.lx; }
    }
    lastLx = c.lx;
    if (dart.on) addThreat(dart.x, dart.y, 26);
    if (turtle.on) addThreat(turtle.x, turtle.y, 26);
    if (eel.on) addThreat(eel.x, eel.y, 20);

    // Crayfish: walk, rest, turn; back off tail first, facing what scared them.
    for (i = 0; i < cn; i++) {
      if (creact[i] >= 0) {
        creact[i] -= dt;
        if (creact[i] < 0) { cmode[i] = 2; ct[i] = L.crayBackT; cdir[i] = cthr[i] >= cxs[i] ? 1 : -1; siltPuff(cxs[i], cys[i], 5); }
      }
      if (cmode[i] === 0) {
        cxs[i] += cdir[i] * L.crayV * dt; cph[i] += dt * 3; ct[i] -= dt;
        csilt[i] -= dt; if (csilt[i] <= 0) { csilt[i] = 0.8; siltPuff(cxs[i] - cdir[i] * 2, cys[i], 1); }
        if (cxs[i] < 20 || cxs[i] > loc.width - 20) { cdir[i] = cxs[i] < 20 ? 1 : -1; cxs[i] = clamp(cxs[i], 20, loc.width - 20); }
        if (ct[i] <= 0) { cmode[i] = 1; ct[i] = r.range(2, 6); }
      } else if (cmode[i] === 1) {
        ct[i] -= dt;
        if (ct[i] <= 0) { cmode[i] = 0; ct[i] = r.range(3, 8); if (r.next() < 0.5) cdir[i] = -cdir[i]; }
      } else {
        cxs[i] = clamp(cxs[i] - cdir[i] * L.crayBack * (ct[i] / L.crayBackT) * dt, 20, loc.width - 20); cph[i] += dt * 8; ct[i] -= dt;
        if (ct[i] <= 0) { cmode[i] = 1; ct[i] = r.range(3, 6); }
      }
      cys[i] = bed(cxs[i]);
    }
    // Snails crawl over their boulder and turn at its edges; in their shells after a splash.
    for (i = 0; i < nn; i++) {
      if (nhide[i] > 0) { nhide[i] -= dt; continue; }
      var rk = rocks[nr[i]];
      nx[i] += ndir[i] * L.snailV * dt;
      if (Math.abs(nx[i] - rk.x) > rk.rw * 0.8) { ndir[i] = nx[i] > rk.x ? -1 : 1; nx[i] = rk.x + clamp(nx[i] - rk.x, -rk.rw * 0.8, rk.rw * 0.8); }
      ny[i] = rockTop(rk, nx[i]);
    }

    // The clouds: each fry springs back to its place in the cloud and is pushed away from
    // anything near; then a hard spacing pass keeps any two apart.
    for (var q = 0; q < qn; q++) {
      if (Math.abs(qx[q] - camC) > 400) continue;
      var a0 = k0[q], a1 = a0 + kn[q], broke = false;
      for (k = a0; k < a1; k++) {
        fph[k] += dt * (qkind[q] ? 9 : 2);
        var wob = qkind[q] ? 0.6 : 1.2, gx = qx[q] + fox[k] + Math.sin(fph[k] * 0.5) * wob, gy = qy[q] + foy[k] + Math.cos(fph[k] * 0.37) * wob * 0.5;
        var ax = (gx - fx_[k]) * L.K - fvx[k] * L.D, ay = (gy - fy[k]) * L.K - fvy[k] * L.D;
        for (j = 0; j < tn; j++) {
          var dx = fx_[k] - tx[j], dy = fy[k] - ty[j], d2 = dx * dx + dy * dy, R = tr[j];
          if (d2 >= R * R) continue;
          var d = Math.sqrt(d2) || 0.01, s = L.push * (1 - d / R) / d;
          ax += dx * s; ay += dy * s; broke = true;
        }
        fvx[k] += ax * dt; fvy[k] += ay * dt;
        var sp = Math.sqrt(fvx[k] * fvx[k] + fvy[k] * fvy[k]);
        if (sp > L.vmax) { fvx[k] *= L.vmax / sp; fvy[k] *= L.vmax / sp; }
        fx_[k] += fvx[k] * dt; fy[k] = Math.max(1, fy[k] + fvy[k] * dt);
        if (Math.abs(fvx[k]) > 3) fface[k] = fvx[k] > 0 ? 1 : -1;
      }
      if (broke) qbroke[q] = 0; else qbroke[q] += dt;
      for (var it = 0; it < 3; it++) for (k = a0; k < a1; k++) for (j = k + 1; j < a1; j++) {
        var ddx = fx_[j] - fx_[k], ddy = fy[j] - fy[k], ox = L.sepX - Math.abs(ddx), oy = L.sepY - Math.abs(ddy);
        if (ox <= 0 || oy <= 0) continue;
        if (oy * L.sepX < ox * L.sepY) { var py = (ddy >= 0 ? 1 : -1) * (oy * 0.5 + 0.01); fy[k] -= py; fy[j] += py; }
        else { var px = (ddx >= 0 ? 1 : -1) * (ox * 0.5 + 0.01); fx_[k] -= px; fx_[j] += px; }
      }
    }

    // A perch darts through a cloud that is in view now and then.
    if (dart.on) {
      dart.x += dart.dir * L.dartV * dt; dart.go += L.dartV * dt; dart.ph += dt * 5;
      if (dart.go > 220) dart.on = false;
    } else if ((dart.wait -= dt) <= 0) {
      dart.wait = r.range(L.dart0, L.dart1);
      for (q = 0; q < qn; q++) if (qkind[q] === 0 && Math.abs(qx[q] - camC) < 140) { spawnDart(q); break; }
    }
    // A turtle crossing the view at mid depth, slowly, bobbing.
    if (turtle.on) {
      turtle.x += turtle.dir * L.turtleV * dt; turtle.ph += dt;
      turtle.y = turtle.y0 + Math.sin(turtle.ph * 0.5) * 3;
      if ((turtle.x - camC) * turtle.dir > 230) turtle.on = false;
    } else if (T.turtle && (turtle.wait -= dt) <= 0) { turtle.wait = r.range(L.turtle0, L.turtle1); spawn('turtle'); }
    // An eel along the bed at night, its body following its head.
    if (eel.on) {
      eel.x += eel.dir * L.eelV * dt; eel.ph += dt * 4; eel.y = bed(eel.x) - 2.5;
      eel.silt -= dt; if (eel.silt <= 0) { eel.silt = 0.5; siltPuff(eel.x - eel.dir * 6, bed(eel.x - eel.dir * 6), 1); }
      for (i = 0; i < EELN; i++) {
        var bx = eel.x - eel.dir * i * L.eelLen / EELN;
        ex[i] = bx; ey[i] = Math.min(bed(bx) - 1.5, eel.y + Math.sin(eel.ph - i * 0.55) * (0.4 + i * 0.12));
      }
      if ((eel.x - camC) * eel.dir > 200) eel.on = false;
    } else if (T.eel && night && (eel.wait -= dt) <= 0) { eel.wait = r.range(L.eel0, L.eel1); spawn('eel'); }

    // Silt drifts up a little, slows, and settles away; the current carries it.
    var flow = U().flow(loc, loc.maxDepth * 0.75);
    for (i = sn - 1; i >= 0; i--) {
      sl[i] -= dt;
      if (sl[i] <= 0) { sn--; sx[i] = sx[sn]; sy[i] = sy[sn]; svx[i] = svx[sn]; svy[i] = svy[sn]; sl[i] = sl[sn]; sm[i] = sm[sn]; continue; }
      svx[i] *= 1 - 1.5 * dt; svy[i] *= 1 - 1.2 * dt;
      sx[i] += (svx[i] + flow) * dt; sy[i] += svy[i] * dt;
    }
    stats.ms = performance.now() - t0;
  }

  function spawnDart(q) {
    dart.on = true; dart.dir = G.vrng.next() < 0.5 ? -1 : 1; dart.x = qx[q] - dart.dir * 110; dart.y = qy[q] + G.vrng.range(-2, 2); dart.go = 0;
  }
  // Starts a visitor now (the rhythms are long; dbg.lifeSpawn uses this). False if it cannot be here.
  function spawn(kind) {
    var run = G.state.run, loc = curLoc, camC = run.cam.x + 160, r = G.vrng;
    if (!loc) return false;
    if (kind === 'dart') {
      for (var q = 0; q < qn; q++) if (qkind[q] === 0 && Math.abs(qx[q] - camC) < 140) { spawnDart(q); return true; }
      return false;
    }
    if ((kind === 'turtle' || kind === 'eel') && !table(loc.id)[kind]) return false; // not in this water
    var dir = r.next() < 0.5 ? -1 : 1, x = clamp(camC - dir * 172, 10, loc.width - 10);
    if (kind === 'turtle') {
      turtle.on = true; turtle.dir = dir; turtle.x = x; turtle.y0 = turtle.y = r.range(20, Math.max(24, loc.maxDepth * 0.5)); turtle.ph = 0;
      return true;
    }
    if (kind === 'eel') {
      eel.on = true; eel.dir = dir; eel.x = x; eel.y = bed(x) - 2.5; eel.ph = 0; eel.silt = 0;
      for (var i = 0; i < EELN; i++) { ex[i] = x - dir * i * L.eelLen / EELN; ey[i] = eel.y; }
      return true;
    }
    return false;
  }

  // ---- Draw (underwater.draw) --------------------------------------------------------------
  function img(ctx, d, f, flip, x, y) { // centre x, bottom y (world, screen-offset)
    ctx.drawImage(flip ? d.fl[f] : d.cv[f], Math.round((x - d.w / (2 * HI)) * HI) / HI, Math.round((y - d.h / HI) * HI) / HI, d.w / HI, d.h / HI);
  }
  // On the bed, before the weeds: crayfish, snails, the eel, the silt.
  function drawBed(ctx, loc, camPx, wyS, alpha) {
    if (locId !== loc.id) return;
    var t0 = performance.now(), i, d, x0 = camPx - 12, x1 = camPx + 332;
    d = crayArt();
    for (i = 0; i < cn; i++) if (cxs[i] > x0 && cxs[i] < x1) img(ctx, d, cmode[i] === 1 ? 0 : (Math.floor(cph[i] * 2) & 1), cdir[i] < 0, cxs[i] - camPx, wyS + cys[i]);
    d = snailArt();
    for (i = 0; i < nn; i++) if (nx[i] > x0 && nx[i] < x1) img(ctx, d, nhide[i] > 0 ? 1 : 0, ndir[i] < 0, nx[i] - camPx, wyS + ny[i] + 0.5);
    if (eel.on) {
      for (i = EELN - 1; i >= 0; i--) {
        var w = i < 2 ? 1.5 : (i > EELN - 4 ? 1 : 1.5), xs = Math.round((ex[i] - camPx) * HI) / HI, ys = Math.round((wyS + ey[i] - w / 2) * HI) / HI;
        ctx.fillStyle = P.wood_deep; ctx.fillRect(xs, ys, 2, w);
        ctx.fillStyle = P.wood_dark; ctx.fillRect(xs, ys, 2, 0.5);
      }
      ctx.fillStyle = P.ink; ctx.fillRect(Math.round((ex[0] - camPx + eel.dir * 1.5) * HI) / HI, Math.round((wyS + ey[0] - 0.5) * HI) / HI, 0.5, 0.5);
    }
    ctx.fillStyle = P[siltKey];
    for (i = 0; i < sn; i++) {
      ctx.globalAlpha = alpha * 0.55 * Math.min(1, sl[i] / sm[i] * 1.6);
      ctx.fillRect(Math.round((sx[i] - camPx) * HI) / HI, Math.round((wyS + sy[i]) * HI) / HI, 0.5, 0.5);
    }
    ctx.globalAlpha = alpha;
    stats.bedMs = performance.now() - t0;
  }
  // In the water, after the weeds: fry, tadpoles, the darting perch, the turtle.
  function drawWater(ctx, loc, camPx, wyS, alpha) {
    if (locId !== loc.id) return;
    var t0 = performance.now(), q, k, x0 = camPx - 12, x1 = camPx + 332, td = tadArt(), FG = G.gfx.fishgen;
    for (q = 0; q < qn; q++) {
      if (qx[q] < x0 - 30 || qx[q] > x1 + 30) continue;
      var a1 = k0[q] + kn[q];
      if (qkind[q] === 1) {
        for (k = k0[q]; k < a1; k++) img(ctx, td, Math.floor(fph[k] / 3.14) & 1, fface[k] < 0, fx_[k] - camPx, wyS + fy[k] + 0.75);
        continue;
      }
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = P.water_foam;
      for (k = k0[q]; k < a1; k++) ctx.fillRect(Math.round((fx_[k] - camPx - 0.75) * HI) / HI, Math.round((wyS + fy[k]) * HI) / HI, 1.5, 0.5);
      ctx.fillStyle = P.ink;
      for (k = k0[q]; k < a1; k++) ctx.fillRect(Math.round((fx_[k] - camPx + (fface[k] > 0 ? 0.25 : -0.75)) * HI) / HI, Math.round((wyS + fy[k]) * HI) / HI, 0.5, 0.5);
      ctx.globalAlpha = alpha;
    }
    if (dart.on) {
      var cv = FG.baseSwimmer('perch', 1, FG.BEAT[Math.floor(dart.ph * 4) & 3], true, dart.dir < 0);
      ctx.globalAlpha = alpha * 0.85;
      ctx.drawImage(cv, Math.round((dart.x - camPx - cv.width / (2 * HI)) * HI) / HI, Math.round((wyS + dart.y - cv.midY / HI) * HI) / HI, cv.width / HI, cv.height / HI);
      ctx.globalAlpha = alpha;
    }
    if (turtle.on) img(ctx, turtleArt(), Math.floor(turtle.ph * 1.6) & 1, turtle.dir < 0, turtle.x - camPx, wyS + turtle.y + 3);
    stats.waterMs = performance.now() - t0;
  }

  // dbg.life(): what lives here now.
  function state() {
    var out = { loc: locId, cray: [], snails: [], clouds: [], dart: dart.on ? { x: +dart.x.toFixed(1), y: +dart.y.toFixed(1) } : null,
      turtle: turtle.on ? { x: +turtle.x.toFixed(1), y: +turtle.y.toFixed(1) } : null, eel: eel.on ? { x: +eel.x.toFixed(1), y: +eel.y.toFixed(1) } : null,
      silt: sn, threats: tn, lastReact: +react.lastDelay.toFixed(3), waits: { dart: +dart.wait.toFixed(1), turtle: +turtle.wait.toFixed(1), eel: +eel.wait.toFixed(1) }, ms: +stats.ms.toFixed(3), bedMs: +stats.bedMs.toFixed(3), waterMs: +stats.waterMs.toFixed(3) };
    for (var i = 0; i < cn; i++) out.cray.push({ x: +cxs[i].toFixed(1), y: +cys[i].toFixed(1), mode: ['walk', 'rest', 'back'][cmode[i]], dir: cdir[i], react: creact[i] >= 0 ? +creact[i].toFixed(3) : -1 });
    for (i = 0; i < nn; i++) out.snails.push({ x: +nx[i].toFixed(1), y: +ny[i].toFixed(1), hidden: nhide[i] > 0 });
    for (var q = 0; q < qn; q++) {
      var a0 = k0[q], a1 = a0 + kn[q], mxd = 0, ov = 0, k, j;
      for (k = a0; k < a1; k++) {
        mxd = Math.max(mxd, Math.abs(fx_[k] - qx[q] - fox[k]) + Math.abs(fy[k] - qy[q] - foy[k]));
        for (j = k + 1; j < a1; j++) if (Math.abs(fx_[j] - fx_[k]) < 1.5 && Math.abs(fy[j] - fy[k]) < 0.5) ov++;
      }
      out.clouds.push({ kind: qkind[q] ? 'tad' : 'fry', x: +qx[q].toFixed(1), y: +qy[q].toFixed(1), n: kn[q], off: +mxd.toFixed(2), calm: +qbroke[q].toFixed(2), overlaps: ov });
    }
    return out;
  }
  // dbg: every fry of every cloud (x, depth), for overlap and re-forming checks.
  function fry() { var o = []; for (var k = 0; k < fnum; k++) o.push([fx_[k], fy[k]]); return o; }

  return { WATERS: WATERS, table: table, L: L, step: step, drawBed: drawBed, drawWater: drawWater, spawn: spawn, state: state, fry: fry, stats: stats, onSplash: onSplash };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var s = G.scene.life.state();
  if (!s.loc) return 'life: -';
  var back = 0; for (var i = 0; i < s.cray.length; i++) if (s.cray[i].mode === 'back') back++;
  return 'life cray ' + s.cray.length + (back ? ' (' + back + ' back)' : '') + '  snails ' + s.snails.length + '  clouds ' + s.clouds.length + '  silt ' + s.silt +
    (s.dart ? '  DART' : '') + (s.turtle ? '  TURTLE' : '') + (s.eel ? '  EEL' : '') + '  ' + s.ms.toFixed(2) + ' ms';
});
