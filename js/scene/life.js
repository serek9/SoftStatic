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
// table. Coordinates are world x and depth px below the waterline, like the school.
// Phase 49: life above the water (the second half of this file): water birds, small life on
// the surface, animals on the shore, and the liminal touches that come with unease.
G.scene = G.scene || {};
G.scene.life = (function () {
  var HI = 2, S = G.gfx.sprites, P = S.PALETTE, B = G.gfx.bake;

  // Each water's own table, in its location file since Phase 49 (loc.life.under; see
  // data/loc_fog.js). cray, snail: how many; fry, tad: clouds of fry by the weed and of
  // tadpoles near the shore; turtle, eel: whether they live here; the rest the bake paints.
  var NONE = { cray: 0, snail: 0, fry: 0, tad: 0, turtle: false, eel: false, mussel: 0, caddis: false, litter: [], roots: 0, tree: 0, ribbon: 0, fern: 0, lily: 0, algae: 0 };
  function table(id) { var l = G.data.locations[id]; return (l && l.life && l.life.under) || NONE; }

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
    eel0: 50, eel1: 110, eelV: 9, eelLen: 26, // s between eels (night only), px/s, body length px
    starV: 0.1,                                // Phase 79: px/s a starfish creeps over its rock
    flatR: 14, flatV: 18, flatSettle: 0.6      // px from the lure (on the bed) that lifts a flatfish, px/s it glides, s it takes to settle
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
  // Phase 79: the sea floor's: a shore crab (claws up, legs walking) and a starfish on a rock.
  function crabArt() {
    return sprite('crab', { o: 'umber_dark', r: 'umber', h: 'umber_hi', e: 'ink', c: 'rust_hi' }, [
      ['.c.......c.', 'cc.e...e.cc', '.crrhhhrrc.', '..rrrrrrr..', '.o.o...o.o.'],
      ['.c.......c.', 'cc.e...e.cc', '.crrhhhrrc.', '..rrrrrrr..', 'o.o.....o.o']
    ]);
  }
  function starArt() {
    return sprite('star', { o: 'orange_dark', r: 'orange', h: 'orange_hi' }, [
      ['...h...', '.orhro.', 'oorrroo'],
      ['...h...', '..rhr..', 'oorrroo']
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
  var fgone = new Float32Array(FMAX); // Phase 49: s until a fry a bird took is back in its cloud (a new one joins)
  // Threats this step: x, depth, reach.
  var TMAX = 16, tx = new Float32Array(TMAX), ty = new Float32Array(TMAX), tr = new Float32Array(TMAX), tn = 0;
  // The rare visitors.
  // Phase 79: flatfish lying on the sand (mode 0), gliding off when the lure comes (1), settling (2).
  var FLMAX = 4, flx = new Float32Array(FLMAX), fltx = new Float32Array(FLMAX), flt = new Float32Array(FLMAX), flph = new Float32Array(FLMAX), fldir = new Int8Array(FLMAX), flm = new Uint8Array(FLMAX), fln = 0, flLifts = 0;
  var crabs = false, stars = false; // Phase 79: the walkers are crabs and the climbers starfish (the sea)
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
    crabs = (T.crab || 0) > 0; stars = (T.star || 0) > 0;
    cn = Math.min(CMAX, crabs ? T.crab : T.cray);
    if (loc.pond && G.state.save && G.state.save.pond && G.sim.pond.clean(G.state.save.pond, G.data)) cn = Math.min(CMAX, T.crayClean || 0); // Phase 84: crayfish once the pond is clean
    for (i = 0; i < cn; i++) {
      cxs[i] = r.range(30, loc.width - 30); cys[i] = bed(cxs[i]); cdir[i] = r.next() < 0.5 ? -1 : 1;
      cmode[i] = r.next() < 0.5 ? 0 : 1; ct[i] = r.range(1, 6); cph[i] = r.next(); creact[i] = -1; csilt[i] = r.range(0, 1);
    }
    nn = Math.min(NMAX, stars ? T.star : T.snail, rocks.length);
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
    for (j = 0; j < fnum; j++) { fface[j] = r.next() < 0.5 ? -1 : 1; fgone[j] = 0; }
    fln = Math.min(FLMAX, T.flat || 0); flLifts = 0;
    for (i = 0; i < fln; i++) { flx[i] = sandX(loc, r, i); flm[i] = 0; flt[i] = r.range(30, 80); fldir[i] = r.next() < 0.5 ? -1 : 1; flph[i] = r.range(0, 6); }
    dart.on = turtle.on = eel.on = false;
    dart.wait = r.range(15, 40); turtle.wait = r.range(25, 60); eel.wait = r.range(20, 50);
    sn = 0;
    aboveSetup(loc, set);
  }
  // Phase 79: a place on the sand (not on the water's rock bed), for a flatfish.
  function onRock(loc, x) { var RB = loc.underwater.rockBed || []; for (var i = 0; i < RB.length; i++) if (x >= RB[i][0] && x < RB[i][1]) return true; return false; }
  function sandX(loc, r, n) {
    var x = 0;
    for (var k = 0; k < 12; k++) {
      x = r.range(30, loc.width - 30);
      var ok = !onRock(loc, x);
      for (var j = 0; j < n && ok; j++) if (Math.abs(flx[j] - x) < 40) ok = false; // apart from the others
      if (ok) break;
    }
    return x;
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
    if (!stars) for (var j = 0; j < nn; j++) if (Math.abs(nx[j] - x) < L.snailR) nhide[j] = L.snailHide; // a starfish does not pull in
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
    aboveStep(run, dt, loc); // Phase 49: the birds and the shore first (a bird under water is a threat below)
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
    aboveThreats(run);

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
      nx[i] += ndir[i] * (stars ? L.starV : L.snailV) * dt;
      if (Math.abs(nx[i] - rk.x) > rk.rw * 0.8) { ndir[i] = nx[i] > rk.x ? -1 : 1; nx[i] = rk.x + clamp(nx[i] - rk.x, -rk.rw * 0.8, rk.rw * 0.8); }
      ny[i] = rockTop(rk, nx[i]);
    }

    // Phase 79: flatfish: lying in the sand they are a faint outline and two eyes; the lure
    // dragged near (or a fish nosing over) lifts one in a puff of sand, it glides off low,
    // undulating, and settles, sand drifting over it. Now and then one shifts by itself.
    for (i = 0; i < fln; i++) {
      flph[i] += dt;
      if (flm[i] === 0) {
        var scare = under && Math.abs(c.lx - flx[i]) < L.flatR && c.ly - wy > bed(flx[i]) - 10;
        for (j = 0; j < tn && !scare; j++) if (Math.abs(tx[j] - flx[i]) < 8 && ty[j] > bed(flx[i]) - 8) scare = true;
        if (scare || (flt[i] -= dt) <= 0) {
          fldir[i] = scare ? (flx[i] >= c.lx ? 1 : -1) : (r.next() < 0.5 ? -1 : 1);
          fltx[i] = clamp(flx[i] + fldir[i] * r.range(30, 60), 30, loc.width - 30);
          if (onRock(loc, fltx[i])) fltx[i] = clamp(flx[i] - fldir[i] * r.range(30, 60), 30, loc.width - 30), fldir[i] = -fldir[i];
          flm[i] = 1; flph[i] = 0; siltPuff(flx[i], bed(flx[i]), 6); if (scare) flLifts++;
        }
      } else if (flm[i] === 1) {
        var fd = fltx[i] - flx[i];
        flx[i] += clamp(fd, -L.flatV * dt, L.flatV * dt);
        if (Math.abs(fd) < 0.5) { flm[i] = 2; flt[i] = L.flatSettle; siltPuff(flx[i], bed(flx[i]), 5); }
      } else if ((flt[i] -= dt) <= 0) { flm[i] = 0; flt[i] = r.range(40, 90); }
    }

    // The clouds: each fry springs back to its place in the cloud and is pushed away from
    // anything near; then a hard spacing pass keeps any two apart.
    for (var q = 0; q < qn; q++) {
      if (Math.abs(qx[q] - camC) > 400) continue;
      var a0 = k0[q], a1 = a0 + kn[q], broke = false;
      for (k = a0; k < a1; k++) {
        if (fgone[k] > 0) fgone[k] -= dt;
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
  // The eel from its points (head first), and its eye. Phase 50.1: the gallery draws one too.
  function drawEel(ctx, X, Y, dir, camPx, wyS) {
    for (var i = EELN - 1; i >= 0; i--) {
      var w = i < 2 ? 1.5 : (i > EELN - 4 ? 1 : 1.5), xs = Math.round((X[i] - camPx) * HI) / HI, ys = Math.round((wyS + Y[i] - w / 2) * HI) / HI;
      ctx.fillStyle = P.wood_deep; ctx.fillRect(xs, ys, 2, w);
      ctx.fillStyle = P.wood_dark; ctx.fillRect(xs, ys, 2, 0.5);
    }
    ctx.fillStyle = P.ink; ctx.fillRect(Math.round((X[0] - camPx + dir * 1.5) * HI) / HI, Math.round((wyS + Y[0] - 0.5) * HI) / HI, 0.5, 0.5);
  }
  // On the bed, before the weeds: crayfish, snails, the eel, the silt.
  function drawBed(ctx, loc, camPx, wyS, alpha) {
    if (locId !== loc.id) return;
    var t0 = performance.now(), i, d, x0 = camPx - 12, x1 = camPx + 332;
    d = crabs ? crabArt() : crayArt();
    for (i = 0; i < cn; i++) if (cxs[i] > x0 && cxs[i] < x1) img(ctx, d, cmode[i] === 1 ? 0 : (Math.floor(cph[i] * 2) & 1), cdir[i] < 0, cxs[i] - camPx, wyS + cys[i]);
    d = stars ? starArt() : snailArt();
    for (i = 0; i < nn; i++) if (nx[i] > x0 && nx[i] < x1) img(ctx, d, stars ? (Math.floor(nx[i] * 3) & 1) : (nhide[i] > 0 ? 1 : 0), ndir[i] < 0, nx[i] - camPx, wyS + ny[i] + 0.5);
    for (i = 0; i < fln; i++) {                                                   // Phase 79: the flatfish
      var FX = flx[i] - camPx;
      if (FX < -12 || FX > 332) continue;
      var lift = flm[i] === 1 ? Math.min(3, flph[i] * 8) * (Math.abs(fltx[i] - flx[i]) < 6 ? Math.abs(fltx[i] - flx[i]) / 6 : 1) : 0, FY = wyS + bed(flx[i]) - 1 - lift;
      ctx.globalAlpha = alpha * (flm[i] === 0 ? 0.55 : 0.9);
      ctx.fillStyle = P.stone_dark; ctx.fillRect(Math.round((FX - 4.5) * HI) / HI, Math.round(FY * HI) / HI, 9, 1);
      ctx.fillRect(Math.round((FX - 3) * HI) / HI, Math.round((FY - 0.5 + (flm[i] === 1 ? Math.sin(flph[i] * 14) * 0.5 : 0)) * HI) / HI, 6, 0.5);
      if (flm[i] === 1) { ctx.fillStyle = P.stone; for (var fe = -4; fe <= 4; fe += 2) ctx.fillRect(Math.round((FX + fe) * HI) / HI, Math.round((FY + 1 + (Math.sin(flph[i] * 14 + fe) > 0 ? 0 : 0.5)) * HI) / HI, 1, 0.5); }
      ctx.globalAlpha = alpha; ctx.fillStyle = P.ink;
      ctx.fillRect(Math.round((FX + fldir[i] * 2.5) * HI) / HI, Math.round((FY - 0.5) * HI) / HI, 0.5, 0.5); ctx.fillRect(Math.round((FX + fldir[i] * 3.5) * HI) / HI, Math.round((FY - 0.5) * HI) / HI, 0.5, 0.5);
    }
    if (eel.on) drawEel(ctx, ex, ey, eel.dir, camPx, wyS);
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
        for (k = k0[q]; k < a1; k++) if (fgone[k] <= 0) img(ctx, td, Math.floor(fph[k] / 3.14) & 1, fface[k] < 0, fx_[k] - camPx, wyS + fy[k] + 0.75);
        continue;
      }
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = P.water_foam;
      for (k = k0[q]; k < a1; k++) if (fgone[k] <= 0) ctx.fillRect(Math.round((fx_[k] - camPx - 0.75) * HI) / HI, Math.round((wyS + fy[k]) * HI) / HI, 1.5, 0.5);
      ctx.fillStyle = P.ink;
      for (k = k0[q]; k < a1; k++) if (fgone[k] <= 0) ctx.fillRect(Math.round((fx_[k] - camPx + (fface[k] > 0 ? 0.25 : -0.75)) * HI) / HI, Math.round((wyS + fy[k]) * HI) / HI, 0.5, 0.5);
      ctx.globalAlpha = alpha;
    }
    if (dart.on) {
      var cv = FG.shadow('yellow_perch', 34, FG.BEAT[Math.floor(dart.ph * 4) & 3], dart.dir < 0); // Phase 72: a perch's silhouette (was the bare perch body plan)
      ctx.globalAlpha = alpha * 0.85;
      ctx.drawImage(cv, Math.round((dart.x - camPx - cv.width / (2 * HI)) * HI) / HI, Math.round((wyS + dart.y - cv.midY / HI) * HI) / HI, cv.width / HI, cv.height / HI);
      ctx.globalAlpha = alpha;
    }
    if (turtle.on) img(ctx, turtleArt(), Math.floor(turtle.ph * 1.6) & 1, turtle.dir < 0, turtle.x - camPx, wyS + turtle.y + 3);
    drawUnder(ctx, camPx, wyS, alpha); // Phase 49: what the birds and the frog put under the surface
    stats.waterMs = performance.now() - t0;
  }

  // ==== Phase 49: life above the water ======================================================
  // Who lives where and when is the water's table (loc.life.above). Water birds keep away
  // from the boat (ducks paddle off, slip past behind it, or the hen dives; the heron, the
  // kingfisher and the gulls fly; the loon dives and comes up far off); the heron's strike and
  // every dive go on under the surface in the cross-section; the deer, the beaver and the fox
  // live on their painted layers at those layers' parallax. With unease from LA.limU the
  // liminal touches come, slowly: ducks that all turn to face the boat, a heron that stands all
  // night without moving, a deer with no reflection. Positions: x in each creature's own
  // layer's px (its screen x is x - cam × p; p 1 is world x); y in px above the waterline.
  var LA = {
    limU: 0.6, limRate: 0.25, fade: 2,                         // unease for the touches, 1/s they come in, s to fade in or out
    duckV: 2, duckFlee: 7, duckR: 64, duckDive0: 25, duckDive1: 50, faceEvery: 1.2,
    heronR: 45, heronV: 1.5, heronFly: 16,
    kingR: 40, kingDive0: 6, kingDive1: 14, kingV: 34,
    loonV: 1.5, loonR: 55, loonDive0: 20, loonDive1: 45, loonUV: 12, loonCall0: 40, loonCall1: 90,
    flyV: 40, frogR: 50, deerR: 70, deerWalk: 3, beaverV: 4, beaverR: 50, foxV: 6, gullR: 45, gullBack: 80,
    ospV: 26, ospY: 46, ospDrop: 80, ospCatch: 0.5, osp0: 18, osp1: 45,     // Phase 77: px/s, its hover's height, px/s down, its luck, s on the nest
    otterV: 6, otterUV: 11, otterR: 45,                                         // Phase 78: px/s swimming and under, px from the boat that sends one under
    hareHop: 14, hareR: 55, hareFlee: 30, ravenV: 9,                           // Phase 82: px/s a hop and a flight off, px (on screen) that sends one off; px/s a raven flies
    mooseR: 40, mooseWalk: 2.5, mooseWade: 3                             // Phase 82: px/s a hop and a flight off, px (on screen) that sends one off; px/s a raven flies
  };
  var ab = { loc: null, T: {}, lim: 0, ghost: 0, mirror: false, night: false, h: 0, lilies: [], layer: {}, lodge: -1, moored: [] };
  function hrs(list, h) {
    if (!list) return false;
    for (var i = 0; i < list.length; i++) { var a = list[i][0], b = list[i][1]; if (a <= b ? h >= a && h < b : h >= a || h < b) return true; }
    return false;
  }
  function toward(v, to, s) { return v < to ? Math.min(to, v + s) : Math.max(to, v - s); }
  function ease(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function sgn(v) { return v < 0 ? -1 : 1; }

  // Sprites (view px, facing right; the bottom row sits on the water or the ground).
  function duckArt() {
    // A hen: mottled brown, a dark eye stripe, the blue-green patch on her wing, an orange bill.
    var m = { g: 'umber', e: 'ink', b: 'rust_hi', p: 'umber_hi', r: 'umber', w: 'umber_hi', s: 'umber_dark', t: 'umber_dark', c: 'teal' };
    return sprite('duck', m, [
      ['........gg...', '.......gggg..', '.......eeebb.', '.......pgg...', '.......rr....', 'tt.wwswwrrr..', 'tswwcccwwrr..', '.sssssssss...'],
      ['.............', 'tt...........', 'tsw..........', '.swww........', '..swwwwr.....', '...sswwwrr...', '....ssswwr...', '......ssrr...']
    ]);
  }
  function youngArt() { return sprite('duckling', { b: 'umber_dark', h: 'brass_hi', e: 'ink', o: 'umber' }, [['..bb.', '.bhe.', 'bbbbo', '.bbb.']]); }
  function duckUnderArt() {
    var m = { w: 'umber', s: 'umber_dark', g: 'umber', e: 'ink', b: 'rust_hi', o: 'rust_hi' };
    return sprite('duckUnder', m, [
      ['....wwwwgg.', '.sswwwwwgeb', '..ssssss...', '...o..o....', '..oo.oo....'],
      ['....wwwwgg.', '.sswwwwwgeb', '..ssssss...', '..o..o.....', '...oo.oo...']
    ]);
  }
  function heronBodyArt() {
    return sprite('heron', { s: 'stone', h: 'stone_hi', d: 'stone_dark' }, [
      ['......sssss...', '...ssshhhhhs..', '..sshhhhhhhhs.', '.ssshhhhhhhs..', 'ssdsssshhss...', 'sddssssss.....', 'dd..sss.......', 'd.............']
    ]);
  }
  function kingArt() {
    var m = { t: 'teal', T: 'teal_hi', e: 'ink', B: 'stone_dark', f: 'flame' };
    return sprite('kingfisher', m, [
      ['..TTT...', '.tttteBB', '.tfff...', '.ffff...', '..tt....', '..t.....'],
      ['TT......', '.ttttteB', '..ff..B.', '........', '........', '........'],
      ['........', '.ttttteB', '.Tff...B', 'TT......', '........', '........']
    ]);
  }
  function loonArt() {
    var m = { k: 'ink', p: 'paper', e: 'blood', b: 'stone_dark', s: 'night_deep', o: 'ink' };
    return sprite('loon', m, [
      ['..........kk...', '.........kkkeb.', '.........kk....', '.kpkpkpkpkk....', 'kkkkkkkkkkk....', '.sssssssss.....'],
      ['.kkkkkkkkkkeb..', 'skkpkpkpkkk....', '.ssss..........', 'oo.............', '...............', '...............']
    ]);
  }
  function frogArt() {
    return sprite('frog', { m: 'moss', h: 'moss_hi', e: 'ink', d: 'moss_dark' }, [
      ['...mm...', '.mmmhe..', 'mmmmmm..', 'd.d..d..'],
      ['........', '......me', '.mmmmmmm', 'dd......']
    ]);
  }
  function deerArt() {
    var m = { b: 'umber', d: 'umber_dark', w: 'paper', k: 'ink', h: 'umber_hi' };
    var body = ['.bbbbbbbbbb.....', 'wbbhhhhbbbbb....', '.bbbbbbbbbbb....', '.dbbbbbbbbbd....'];
    var up = ['...........d.d..', '...........bbb..', '...........bbbbk', '...........bb...', '..........bb....', '.........bb.....'];
    var stand = ['.d.d.....d.d....', '.d.d.....d.d....', '.d.d.....d.d....', '.d.d.....d.d....'];
    var walk = ['..d.d....d.d....', '.d...d..d...d...', '.d...d..d...d...', 'd.....dd.....d..'];
    var none = ['................', '................', '................', '................', '................', '................'];
    return sprite('deer', m, [
      up.concat(body, stand),
      none.concat(['.bbbbbbbbbbb....', 'wbbhhhhbbbbbb...', '.bbbbbbbbbbbbb..', '.dbbbbbbbbd.bbb.', '.d.d.....d.d.bbb', '.d.d.....d.d..bk', '.d.d.....d.d....', '.d.d.....d.d....']),
      up.concat(body, walk)
    ]);
  }
  function foxArt() {
    var m = { r: 'rust', p: 'paper', k: 'ink', h: 'rust_hi' };
    return sprite('fox', m, [
      ['.........r.r.', '.........rrrk', 'rr.rhhhrrrrp.', 'pr.rrrrrrrr..', '...rrrrrrr...', '...k.k..k.k..'],
      ['.........r.r.', '.........rrrk', 'rr.rhhhrrrrp.', 'pr.rrrrrrrr..', '...rrrrrrr...', '....kk..kk...'],
      ['.........r.r.', '.........rrrk', '.........rrp.', '........rrr..', '..pr..rrrrr..', '...rrrrrrrk..']
    ]);
  }
  // Phase 82: the winter animals. A snowshoe hare in its white coat (dark ear tips, a dark eye):
  // sitting, and stretched out mid-hop.
  function hareArt() {
    var m = { w: 'paper', s: 'stone_hi', k: 'ink', e: 'ink' };
    return sprite('hare', m, [
      ['.......k..', '.......wk.', '......wwe.', '..wwwwwww.', '.wwwwwwws.', '.swwwwws..', '..ss..ss..'],
      ['..........', '........kk', '.......wwe', 'swwwwwwww.', '.wwwwwwws.', 'ss.....ss.', '..........']
    ]);
  }
  // A raven: black, a heavy bill and a wedge tail; wings up and down.
  function ravenArt() {
    var m = { k: 'ink', b: 'night_deep', g: 'stone_dark' };
    return sprite('raven', m, [
      ['k.........k...', '.kk......kk....', '..kkkbkkkk.....', '....kkkkkkkg...', '...kk..........'],
      ['..............', '...............', '..kkkbkkkkkkg..', '.kk.kkkkk......', 'k........k.....']
    ]);
  }
  // Phase 83: a bull moose: a long dark body high on its legs, the hump over the shoulders, a
  // long heavy head with the bell under it and broad flat antlers; head up, head down in the
  // weed, walking.
  function mooseArt() {
    var m = { b: 'umber_dark', h: 'umber_deep', a: 'umber_hi', l: 'umber', d: 'ink', k: 'ink' };
    return sprite('moose', m, [
      ['..............a..a.a....', '.............aaa.aaa....', '..............aabaa.....', '...............bbbb.....', '..............bbbbbbb...', '..............bbbbbbbbk.', '.......hhhh..bbb...bb...', '..hhhhhbbbbbbbbd........', '.bbbbbbbbbbbbbbd........', 'bbbbbbbbbbbbbbb.........', 'bbbbbbbbbbbbbb..........', '.bbbbbbbbbbbbb..........', '..bbb......bbb..........', '..l.l......l.l..........', '..l.l......l.l..........', '..l.l......l.l..........', '..d.d......d.d..........'],
      ['........................', '........................', '........................', '........................', '........................', '........................', '.......hhhh.............', '..hhhhhbbbbbb...........', '.bbbbbbbbbbbbbb.........', 'bbbbbbbbbbbbbbbb........', 'bbbbbbbbbbbbbbbbb.a.a...', '.bbbbbbbbbbbbb.bbaaa....', '..bbb......bbb..bbbbb...', '..l.l......l.l...bbbbk..', '..l.l......l.l..........', '..l.l......l.l..........', '..d.d......d.d..........'],
      ['..............a..a.a....', '.............aaa.aaa....', '..............aabaa.....', '...............bbbb.....', '..............bbbbbbb...', '..............bbbbbbbbk.', '.......hhhh..bbb...bb...', '..hhhhhbbbbbbbbd........', '.bbbbbbbbbbbbbbd........', 'bbbbbbbbbbbbbbb.........', 'bbbbbbbbbbbbbb..........', '.bbbbbbbbbbbbb..........', '..bbb......bbb..........', '...l.l....l.l...........', '..l...l..l...l..........', '..l...l..l...l..........', '.d.....dd.....d.........']
    ]);
  }
  // Phase 82: the snow fox in its winter white (A.fox.white).
  function foxWhiteArt() {
    var m = { r: 'paper', p: 'bone', k: 'ink', h: 'fog_light' };
    return sprite('foxWhite', m, [
      ['.........r.r.', '.........rrrk', 'rr.rhhhrrrrp.', 'pr.rrrrrrrr..', '...rrrrrrr...', '...k.k..k.k..'],
      ['.........r.r.', '.........rrrk', 'rr.rhhhrrrrp.', 'pr.rrrrrrrr..', '...rrrrrrr...', '....kk..kk...'],
      ['.........r.r.', '.........rrrk', '.........rrp.', '........rrr..', '..pr..rrrrr..', '...rrrrrrrk..']
    ]);
  }
  function gullArt() {
    var m = { w: 'paper', e: 'ink', b: 'brass_hi', s: 'stone_hi', k: 'ink', o: 'rust_hi' };
    return sprite('gull', m, [
      ['.....ww....', '....wwweb..', '.sssswww...', 'kssssww....', '..wwww.....', '...o.o.....'],
      ['kss.....ssk', '..sswwwss..', '....wwwweb.', '...........', '...........', '...........'],
      ['...........', '...wwwwweb.', '..sswwwss..', 'kss.....ssk', '...........', '...........']
    ]);
  }

  // Phase 77: the osprey (white below, dark brown above, the dark band through its eye; frames:
  // perched, wings up, wings down, the stoop) and the bald eagle (dark, white head and tail;
  // gliding and a beat). Rows shorter than the widest are padded on the right.
  function padded(frames) {
    var w = 0, f, r;
    for (f = 0; f < frames.length; f++) for (r = 0; r < frames[f].length; r++) w = Math.max(w, frames[f][r].length);
    for (f = 0; f < frames.length; f++) for (r = 0; r < frames[f].length; r++) while (frames[f][r].length < w) frames[f][r] += '.';
    return frames;
  }
  function ospreyArt() {
    var m = { w: 'paper', d: 'umber_dark', D: 'umber_deep', e: 'ink', b: 'stone_dark', y: 'stone_hi' };
    return sprite('osprey', m, padded([
      ['.................', '.......ww........', '......wweb.......', '......eDwbb......', '......dwww.......', '.....ddwww.......', '.....ddwww.......', '.....dddww.......', '.....ddd.........', '......yy.........'],
      ['.................', 'D...............D', 'Dd.............dD', '.ddd.........ddd.', '..ddww..w..wwdd..', '....dwwwwwebdd...', '......ddwww......', '........dd.......', '.................', '.................'],
      ['.................', '.................', '.................', '........ww.......', '.......wwweb.....', '..ddwwwwwwwwwdd..', '.ddd...ddd...ddd.', 'Dd.............dD', 'D...............D', '.................'],
      ['.......D.D.......', '.......ddd.......', '......dddd.......', '......ddwd.......', '.......dww.......', '.......www.......', '.......wwe.......', '........wb.......', '........yy.......', '.................']
    ]));
  }
  function eagleArt() {
    var m = { d: 'umber_deep', D: 'umber_dark', w: 'paper', e: 'ink', b: 'brass_hi' };
    return sprite('eagle', m, padded([
      ['dd.................dd', '.ddd.............ddd.', '...dDdd...ww..dDdd...', '.....dddDDdwwebd.....', '......wwddddd........', '......ww.............'],
      ['.....................', '.....................', '..........www........', '..ddddDDDddwwebdddd..', '.ddd..wwdddd.....ddd.', 'dd....ww...........dd']
    ]));
  }

  // Phase 78: the otter swimming (head up, then the arch of a dive) and sitting up on a log.
  function otterArt() {
    var m = { d: 'umber_dark', D: 'umber', e: 'ink', n: 'ink', w: 'umber_hi' };
    return sprite('otter', m, padded([
      ['..........', '.......Dd.', '.......dde', '..ddd..ddn', '.dDDDddd..'],
      ['...DDd....', '..DddddD..', '.dd....dd.', 'd.......dn', '..........']
    ]));
  }
  function otterSitArt() {
    var m = { d: 'umber_dark', D: 'umber', e: 'ink', n: 'ink', w: 'umber_hi' };
    return sprite('otterSit', m, padded([
      ['...dd...', '..ddde..', '..dwwn..', '..dDw...', '.ddDw...', '.dDDd...', '.dDDd...', '.ddDdd..', 'ddd.ddd.', 'd.......'],
      ['..dd....', '.ddde...', '.dwwn...', '..dDw...', '.ddDw...', '.dDDd...', '.dDDd...', '.ddDdd..', 'ddd.ddd.', 'd.......']
    ]));
  }

  // Phase 79: the harbour or grey seal hauled out on its rock (lying, then the banana with head
  // and tail up), its head up in the water watching, and swimming under; the cormorant perched
  // (wings folded, then held out to dry), flying low, swimming low with its neck up.
  function sealArt() {
    var m = { s: 'stone', h: 'stone_hi', k: 'stone_dark', e: 'ink', n: 'ink', l: 'stone_lit' };
    return sprite('seal', m, [
      ['................', '.......sssssss..', '...sssshhlhhhsse', 's.sshhkhhhkhhhsn', 'sssssssssssssss.'],
      ['.............ss.', '............sse.', 's..sssssssssshsn', 'sssshhkhhhkhhhs.', '.sssssssssssss..']
    ]);
  }
  function sealHeadArt() { return sprite('sealHead', { s: 'stone', h: 'stone_hi', e: 'ink', n: 'ink' }, [['..ss.', '.shse', '.sssn', 'sss..'], ['.....', '..ss.', '.shse', 'ssssn']]); }
  function sealSwimArt() {
    return sprite('sealSwim', { s: 'stone_dark', h: 'stone', e: 'ink', n: 'ink' }, [
      ['......ssss....', '..sssshhhhsse.', 'ssssssssssssn.', 's.............'],
      ['......ssss....', 's.sssshhhhsse.', '.sssssssssssn.', '..............']
    ]);
  }
  function cormArt() {
    var m = { k: 'ink', g: 'night_deep', b: 'stone_dark', y: 'brass_hi', f: 'stone_dark' };
    return sprite('cormorant', m, padded([
      ['....kk', '...kkkb', '...ky', '..kgk', '..kgk', '..kgk', '..kkk', '..kk', '..ff'],
      ['.....kk....', '....kkkb...', 'k...ky....k', 'kk.kkgk..kk', '.kkkkgkkkk.', '..kkkgkkk..', '....kkk....', '....kk.....', '....ff.....']
    ]));
  }
  function cormFlyArt() {
    var m = { k: 'ink', g: 'night_deep', b: 'stone_dark', y: 'brass_hi' };
    return sprite('cormFly', m, [
      ['k.........k..', '.kk.....kk...', '..kkkgkkkkkkb', '.....kk......'],
      ['.............', 'kkkkgkkkkkkkb', '.kk..kk..kk..', 'k.........k..']
    ]);
  }
  function cormSwimArt() { return sprite('cormSwim', { k: 'ink', g: 'night_deep', b: 'stone_dark', y: 'brass_hi' }, [['......kk.', '......kkb', '......ky.', 'kgkkkkk..'], ['.........', '.......kk', '......kkb', 'kgkkkkkk.']]); }

  // The creatures (one family, one heron, ... per water; a few small arrays).
  var dk = { on: false, a: 0, x: 0, dir: 1, v: 0, mode: 0, t: 0, wait: 0, dvx: 0, dy: 0, ph: 0, faced: 0, faceT: 0, tgt: 0, under: false }; // mode 0 paddle 1 flee 2 pass 3 dive 4 face
  var YMAX = 6, yx = new Float32Array(YMAX), yph = new Float32Array(YMAX), ydir = new Int8Array(YMAX), yn = 0;
  var hr = { on: false, a: 0, x: 0, dir: -1, mode: 0, t: 0, wait: 0, reach: 0, tx: 0, fish: 0, ph: 0, lift: 0, vx: 0, struck: false }; // 0 stand 1 stalk 2 strike 3 fly 5 still
  var kf = { on: false, a: 0, i: 0, x: 0, y: 0, mode: 0, t: 0, dur: 0, x0: 0, y0: 0, x1: 0, y1: 0, fish: 0, dir: 1, ph: 0, wait: 0, leaving: false }; // 0 perch 1 dive 2 under 3 up 4 fly
  var ln = { on: false, a: 0, x: 0, dir: 1, mode: 0, t: 0, dur: 0, ux: 0, uy: 0, uvx: 0, dive: 0, call: 0, ph: 0, dmax: 0 }; // 0 swim 1 under
  var DMAX = 8, dfx = new Float32Array(DMAX), dfy = new Float32Array(DMAX), dtx = new Float32Array(DMAX), dty = new Float32Array(DMAX), dhov = new Float32Array(DMAX), dzone = new Uint8Array(DMAX), dfn = 0, dfa = 0;
  var fr = { on: false, a: 0, i: 0, x: 0, mode: 0, t: 0, x0: 0, dir: 1, h: 0, ux: 0, uy: 0, wait: 0, ph: 0 }; // 0 sit 1 jump 2 under
  var RMAX_ = 8, rx_ = new Float32Array(RMAX_), rvx = new Float32Array(RMAX_), rt = new Float32Array(RMAX_), rzone = new Uint8Array(RMAX_), rn = 0, ra = 0;
  var dr = { on: false, a: 0, x: 0, dir: 1, mode: 0, t: 0, wait: 0, ph: 0, leaving: false }; // 0 walk in 1 drink 2 look 3 leave
  var mo = { on: false, a: 0, x: 0, dir: 1, mode: 0, t: 0, wait: 0, ph: 0, leaving: false, wade: 0 }; // Phase 83: the moose: 0 walk in 1 eat weed 2 look 3 leave; wade 0..1 how far in
  var bv = { on: false, x: 0, dir: 1, mode: 0, t: 0, wait: 0, ph: 0 }; // 0 swim 1 dive
  var fo = { on: false, a: 0, x: 0, dir: 1, mode: 0, t: 0, wait: 0, ph: 0, sits: 0 }; // 0 trot 1 sit 2 leave
  var GMAX = 4, gx = new Float32Array(GMAX), gy = new Float32Array(GMAX), gmode = new Uint8Array(GMAX), gt = new Float32Array(GMAX), gph = new Float32Array(GMAX), gcx = new Float32Array(GMAX), gang = new Float32Array(GMAX), gper = new Uint8Array(GMAX), gn = 0, ga = 0; // 0 sit 1 fly 2 back
  // Phase 77: the osprey (mode 0 perched on its nest, 1 out to the pool, 2 hovering, 3 the stoop,
  // 4 in the water, 5 climbing out, 6 home) and up to EMAX eagles circling (x, y px above the water).
  var os = { on: false, a: 0, x: 0, y: 0, nx: -1, ny: 0, dir: 1, mode: 0, t: 0, wait: 0, ph: 0, tx: 0, fish: 0, vx: 0 };
  var EMAX = 3, ecx = new Float32Array(EMAX), ecy = new Float32Array(EMAX), er = new Float32Array(EMAX), eang = new Float32Array(EMAX), ew = new Float32Array(EMAX), ev = new Float32Array(EMAX), eph = new Float32Array(EMAX), en = 0, ea = 0;
  // Phase 78: up to OTMAX otters (mode 0 swimming at the surface, 1 under, 2 sitting on the log);
  // x world px; lt: where along the log one sits (0 its root end .. 1 its tip).
  var OTMAX = 3, otx = new Float32Array(OTMAX), ottx = new Float32Array(OTMAX), ott = new Float32Array(OTMAX), otph = new Float32Array(OTMAX), otlt = new Float32Array(OTMAX), otdir = new Int8Array(OTMAX), otm = new Uint8Array(OTMAX), otn = 0, ota = 0;
  var otLog = null;
  // Phase 79: up to SEMAX seals (mode 0 out on a rock spot, 1 head up in the water, 2 under;
  // spot: which haul-out spot it has, -1 none) and up to CMMAX cormorants (0 perched, 1 flying
  // out, 2 swimming, 3 under, 4 flying home; y px above the water or depth under it).
  var SEMAX = 4, sex = new Float32Array(SEMAX), setx = new Float32Array(SEMAX), set_ = new Float32Array(SEMAX), seph = new Float32Array(SEMAX), sedir = new Int8Array(SEMAX), sem = new Uint8Array(SEMAX), sespot = new Int8Array(SEMAX), sen = 0, sea_ = 0;
  var CMMAX = 2, cmx = new Float32Array(CMMAX), cmy = new Float32Array(CMMAX), cmtx = new Float32Array(CMMAX), cmt = new Float32Array(CMMAX), cmph = new Float32Array(CMMAX), cmdir = new Int8Array(CMMAX), cmm = new Uint8Array(CMMAX), cmwing = new Float32Array(CMMAX), cmuvx = new Float32Array(CMMAX), cmdeep = new Float32Array(CMMAX), cmdives = new Uint8Array(CMMAX), cmn = 0, cma = 0;
  // Phase 82: up to HAMAX snowshoe hares on a shore layer (mode 0 sitting, 1 hopping, 2 bounding
  // off into the woods) and up to RVMAX ravens (x world px, y px above the ice, wandering flight).
  var HAMAX = 3, hax = new Float32Array(HAMAX), hat = new Float32Array(HAMAX), haph = new Float32Array(HAMAX), hadir = new Int8Array(HAMAX), ham = new Uint8Array(HAMAX), haa = new Float32Array(HAMAX), han = 0, haA = 0;
  var RVMAX = 3, rvx_ = new Float32Array(RVMAX), rvy = new Float32Array(RVMAX), rvtx = new Float32Array(RVMAX), rvty = new Float32Array(RVMAX), rvph = new Float32Array(RVMAX), rvdir = new Int8Array(RVMAX), rvcall = new Float32Array(RVMAX), rvn = 0, rva = 0;
  var acts = { mooseOff: 0, hareFlee: 0, ravenCalls: 0, strikes: 0, takes: 0, dives: 0, plops: 0, calls: 0, slaps: 0, plunges: 0, fish: 0, otterDives: 0, sealDives: 0, hauls: 0, cormDives: 0 }; // dbg: how often each has happened

  function aboveSetup(loc, set) {
    var A = (loc.life && loc.life.above) || {}, r = G.vrng, i;
    ab.loc = loc; ab.T = A; ab.lim = 0; ab.ghost = 0; ab.lilies = set.lilies || [];
    ab.layer = {}; ab.lodge = -1; ab.moored = [];
    for (i = 0; i < loc.layers.length; i++) {
      var Ly = loc.layers[i];
      ab.layer[Ly.id] = Ly;
      for (var k = 0; k < (Ly.features || []).length; k++) {
        var f = Ly.features[k];
        if (f.kind === 'lodge' && A.beaver && A.beaver.layer === Ly.id) ab.lodge = f.x;
        if (f.kind === 'moored') ab.moored.push({ x: f.x, p: Ly.parallax });
      }
    }
    dk.on = hr.on = kf.on = ln.on = fr.on = dr.on = bv.on = fo.on = mo.on = false; mo.wait = r.range(2, 10); mo.wade = 0;
    dk.wait = r.range(1, 6); hr.wait = r.range(1, 6); kf.wait = r.range(1, 6); ln.wait = r.range(1, 6); fr.wait = r.range(1, 4);
    dr.wait = r.range(2, 10); bv.wait = r.range(5, 25); fo.wait = r.range(3, 15);
    yn = A.ducks ? Math.min(YMAX, A.ducks.young || 0) : 0;
    dfn = A.dragonflies ? Math.min(DMAX, A.dragonflies.n) : 0; dfa = 0;
    for (i = 0; i < dfn; i++) { dzone[i] = i % A.dragonflies.x.length; var z = A.dragonflies.x[dzone[i]]; dfx[i] = dtx[i] = r.range(z[0], z[1]); dfy[i] = dty[i] = r.range(3, 14); dhov[i] = r.range(0, 2); }
    rn = A.striders ? Math.min(RMAX_, A.striders.n) : 0; ra = 0;
    for (i = 0; i < rn; i++) { rzone[i] = i % A.striders.x.length; var zs = A.striders.x[rzone[i]]; rx_[i] = r.range(zs[0], zs[1]); rvx[i] = 0; rt[i] = r.range(0, 1.5); }
    os.on = false; os.nx = -1; os.wait = r.range(2, 8); os.fish = 0;
    if (A.osprey) for (i = 0; i < loc.landmarks.length; i++) if (loc.landmarks[i].id === A.osprey.landmark && loc.landmarks[i].nest) { os.nx = loc.landmarks[i].nest.x; os.ny = loc.landmarks[i].nest.y + 1; }
    en = A.eagle ? Math.min(EMAX, A.eagle.n || 1) : 0; ea = 0;
    for (i = 0; i < en; i++) { ecx[i] = r.range(A.eagle.x[0], A.eagle.x[1]); ecy[i] = r.range(A.eagle.y[0], A.eagle.y[1]); er[i] = r.range(18, 36); eang[i] = r.range(0, 6.28); ew[i] = (r.next() < 0.5 ? -1 : 1) * r.range(0.22, 0.34); ev[i] = (r.next() < 0.5 ? -1 : 1) * r.range(2, 4); eph[i] = r.range(0, 9); }
    otn = A.otter ? Math.min(OTMAX, A.otter.n || 1) : 0; ota = 0; otLog = null;
    if (A.otter) for (i = 0; i < loc.landmarks.length; i++) if (loc.landmarks[i].id === A.otter.log) otLog = loc.landmarks[i];
    for (i = 0; i < otn; i++) { otx[i] = ottx[i] = r.range(A.otter.x[0], A.otter.x[1]); otm[i] = 0; ott[i] = r.range(4, 12); otph[i] = r.range(0, 6); otdir[i] = 1; }
    sen = A.seal ? Math.min(SEMAX, A.seal.n || 1) : 0; sea_ = 0;
    for (i = 0; i < sen; i++) {
      var hasSpot = i < A.seal.spots.length;
      sespot[i] = hasSpot ? i : -1; sem[i] = hasSpot ? 0 : 1; sex[i] = setx[i] = hasSpot ? A.seal.spots[i].x : r.range(A.seal.x[0], A.seal.x[1]);
      set_[i] = r.range(20, 80); seph[i] = r.range(0, 9); sedir[i] = r.next() < 0.5 ? -1 : 1;
    }
    cmn = A.cormorant ? Math.min(CMMAX, A.cormorant.perches.length) : 0; cma = 0;
    for (i = 0; i < cmn; i++) { cmx[i] = A.cormorant.perches[i].x; cmy[i] = A.cormorant.perches[i].y; cmm[i] = 0; cmt[i] = r.range(8, 40); cmph[i] = r.range(0, 6); cmdir[i] = i & 1 ? -1 : 1; cmwing[i] = r.next() < 0.5 ? r.range(5, 15) : 0; cmdives[i] = 0; }
    han = A.hare ? Math.min(HAMAX, A.hare.n || 1) : 0; haA = 0;                    // Phase 82
    for (i = 0; i < han; i++) { hax[i] = r.range(A.hare.x[0], A.hare.x[1]); ham[i] = 0; hat[i] = r.range(2, 8); haph[i] = r.range(0, 6); hadir[i] = r.next() < 0.5 ? -1 : 1; haa[i] = 1; }
    rvn = A.raven ? Math.min(RVMAX, A.raven.n || 1) : 0; rva = 0;
    for (i = 0; i < rvn; i++) { rvx_[i] = rvtx[i] = r.range(A.raven.x[0], A.raven.x[1]); rvy[i] = rvty[i] = r.range(A.raven.y[0], A.raven.y[1]); rvph[i] = r.range(0, 6); rvdir[i] = 1; rvcall[i] = r.range(10, 40); }
    gn = A.gulls ? Math.min(GMAX, A.gulls.n, A.gulls.perches.length) : 0; ga = 0;
    for (i = 0; i < gn; i++) { gper[i] = i; gx[i] = A.gulls.perches[i].x; gy[i] = A.gulls.perches[i].y; gmode[i] = 0; gt[i] = 0; gph[i] = r.range(0, 6); }
    for (var q in acts) acts[q] = 0;
  }

  // A fry or tadpole near (x, depth) within r: taken by a bird (gone for 20-40 s). True if one was.
  function takePrey(x, y, r) {
    for (var k = 0; k < fnum; k++) {
      if (fgone[k] > 0 || Math.abs(fx_[k] - x) > r || Math.abs(fy[k] - y) > r) continue;
      fgone[k] = G.vrng.range(20, 40); acts.takes++;
      return true;
    }
    return false;
  }
  // The nearest fry or tadpole between world x lo and hi shallower than maxD, or -1.
  function preyNear(lo, hi, maxD, from) {
    var best = -1, bd = 1e9;
    for (var k = 0; k < fnum; k++) {
      if (fgone[k] > 0 || fx_[k] < lo || fx_[k] > hi || fy[k] > maxD) continue;
      var d = Math.abs(fx_[k] - from);
      if (d < bd) { bd = d; best = fx_[k]; }
    }
    return best;
  }

  function aboveStep(run, dt, loc) {
    var A = ab.T, b = run.boat, cam = run.cam.x, h = G.sim.clock.wrap(G.state.save.clock || 0), r = G.vrng, i;
    ab.h = h; ab.night = !G.sim.clock.isGrey(h);
    var lt = G.sim.unease.get(G.state.save, loc.id) >= LA.limU ? 1 : 0;
    ab.lim = toward(ab.lim, lt, LA.limRate * dt);
    if (!b) return;
    var bs = b.x - cam; // the boat on screen
    if (A.ducks) ducksStep(A.ducks, dt, cam, bs, h, r, loc);
    if (A.heron) heronStep(A.heron, dt, b, h, r, loc);
    if (A.kingfisher) kingStep(A.kingfisher, dt, b, h, r, loc);
    if (A.loon) loonStep(A.loon, dt, cam, bs, h, r, loc);
    if (dfn) {
      var dz = A.dragonflies;
      dfa = toward(dfa, hrs(dz.hours, h) ? 1 : 0, dt / LA.fade);
      for (i = 0; i < dfn; i++) {
        if (dhov[i] > 0) { dhov[i] -= dt; continue; }
        var ddx = dtx[i] - dfx[i], ddy = dty[i] - dfy[i], dd = Math.sqrt(ddx * ddx + ddy * ddy), st = 40 * dt;
        if (dd <= st) {
          dfx[i] = dtx[i]; dfy[i] = dty[i]; dhov[i] = r.range(0.4, 2);
          var z = dz.x[dzone[i]];
          dtx[i] = r.range(z[0], z[1]); dty[i] = r.range(3, 14);
          if (Math.abs(dtx[i] - b.x) < 24) dtx[i] = clamp(b.x + sgn(dtx[i] - b.x) * 24, z[0], z[1]); // not over the boat
        } else { dfx[i] += ddx / dd * st; dfy[i] += ddy / dd * st; }
      }
    }
    if (A.frog) frogStep(A.frog, dt, b, h, r, loc);
    if (rn) {
      ra = toward(ra, hrs(A.striders.hours, h) ? 1 : 0, dt / LA.fade);
      for (i = 0; i < rn; i++) {
        var zr = A.striders.x[rzone[i]];
        rx_[i] += rvx[i] * dt; rvx[i] *= Math.max(0, 1 - 2.5 * dt); rt[i] -= dt;
        if (rx_[i] < zr[0] || rx_[i] > zr[1]) { rx_[i] = clamp(rx_[i], zr[0], zr[1]); rvx[i] = -rvx[i]; }
        if (rt[i] <= 0) {
          rt[i] = r.range(0.5, 1.6); rvx[i] = (r.next() < 0.5 ? -1 : 1) * r.range(8, 14);
          if (ra > 0.5 && rx_[i] > cam - 4 && rx_[i] < cam + 324) G.gfx.fx.ripple(rx_[i], loc.waterY + 1, 0, 2.5, 0.7); // each stroke rings the water
        }
      }
    }
    if (A.deer) deerStep(A.deer, dt, cam, bs, h, r);
    ab.ghost = toward(ab.ghost, ab.lim > 0.5 && dr.on ? 1 : 0, dt / 3); // the deer's reflection goes, slowly
    if (A.moose) mooseStep(A.moose, dt, cam, bs, h, r);                          // Phase 83
    if (A.beaver && ab.lodge >= 0) beaverStep(A.beaver, dt, cam, bs, h, r, loc);
    if (A.fox) foxStep(A.fox, dt, h, r);
    if (gn) gullStep(A.gulls, dt, b, h, r);
    if (A.osprey && os.nx >= 0) ospreyStep(A.osprey, dt, b, h, r, loc);
    if (en) eagleStep(A.eagle, dt, h);
    if (otn) otterStep(A.otter, dt, b, h, r, loc);
    if (sen) sealStep(A.seal, dt, b, h, r, loc);
    if (cmn) cormStep(A.cormorant, dt, b, h, r, loc);
    if (han) hareStep(A.hare, dt, cam, bs, h, r);                               // Phase 82
    if (rvn) ravenStep(A.raven, dt, b, h, r);
  }

  // Phase 82: snowshoe hares sit in the snow at the edge of the woods, hop a few lengths now and
  // then, and bound off into the trees when the machine comes within hareR px on screen (they
  // come back, one by one, a while after it has gone). On a layer (A.hare.layer), at its parallax.
  function hareStep(T, dt, cam, bs, h, r) {
    var want = hrs(T.hours, h), p = ab.layer[T.layer] ? ab.layer[T.layer].parallax : 1;
    haA = toward(haA, want ? 1 : 0, dt / LA.fade);
    for (var i = 0; i < han; i++) {
      var sx = hax[i] - cam * p;
      haph[i] += dt; hat[i] -= dt;
      if (ham[i] === 2) {                                                        // bounding off
        hax[i] += hadir[i] * LA.hareFlee * dt; haa[i] = Math.max(0, haa[i] - dt / 1.2);
        if (hat[i] <= 0) { ham[i] = 0; haa[i] = 0; hat[i] = r.range(25, 60); hax[i] = r.range(T.x[0], T.x[1]); }
        continue;
      }
      if (haa[i] < 1 && ham[i] === 0 && hat[i] <= 0) haa[i] = Math.min(1, haa[i] + dt / 2);  // coming back out of the trees
      if (Math.abs(sx - bs) < LA.hareR && haa[i] > 0.3) { ham[i] = 2; hadir[i] = sx > bs ? 1 : -1; hat[i] = 1.4; acts.hareFlee++; continue; }
      if (ham[i] === 1) { hax[i] += hadir[i] * LA.hareHop * dt; if (hat[i] <= 0) { ham[i] = 0; hat[i] = r.range(3, 9); } }
      else if (hat[i] <= 0 && haa[i] >= 1) { ham[i] = 1; hat[i] = r.range(0.4, 1.2); hadir[i] = r.next() < 0.5 ? -1 : 1; }
      if (hax[i] < T.x[0]) { hax[i] = T.x[0]; hadir[i] = 1; } else if (hax[i] > T.x[1]) { hax[i] = T.x[1]; hadir[i] = -1; }
    }
  }
  // Phase 82: ravens wander over the ice and the woods in slow loose lines, now and then a deep
  // croak; they keep well up (A.raven.y) and turn away from the machine.
  function ravenStep(T, dt, b, h, r) {
    rva = toward(rva, hrs(T.hours, h) ? 1 : 0, dt / LA.fade);
    for (var i = 0; i < rvn; i++) {
      rvph[i] += dt;
      var dx = rvtx[i] - rvx_[i], dy = rvty[i] - rvy[i], d = Math.sqrt(dx * dx + dy * dy), st = LA.ravenV * dt;
      if (d <= st + 0.5) { rvtx[i] = r.range(T.x[0], T.x[1]); rvty[i] = r.range(T.y[0], T.y[1]); if (Math.abs(rvtx[i] - b.x) < 40) rvtx[i] = clamp(b.x + sgn(rvtx[i] - b.x) * 60, T.x[0], T.x[1]); }
      else { rvx_[i] += dx / d * st; rvy[i] += dy / d * st; rvdir[i] = dx < 0 ? -1 : 1; }
      if ((rvcall[i] -= dt) <= 0) { rvcall[i] = r.range(25, 70); if (rva > 0.5) { G.audio.engine.cue('raven', rvx_[i]); acts.ravenCalls++; } }
    }
  }

  // Phase 79: seals lie out on their rocks; the boat within sealR slides them into the water,
  // where they come up farther off and watch it (heads up, turned to it) from a distance,
  // dive and come up again, and haul out once it has gone. A seal never comes near the boat.
  var SEAL = { R: 60, watch: 140, V: 3, UV: 12, haulFar: 90 };
  function spotFree(T, k) { for (var j = 0; j < sen; j++) if (sespot[j] === k) return false; return true; }
  function sealStep(T, dt, b, h, r, loc) {
    sea_ = toward(sea_, hrs(T.hours, h) ? 1 : 0, dt / LA.fade);
    var lo = T.x[0], hi = T.x[1];
    for (var i = 0; i < sen; i++) {
      seph[i] += dt; set_[i] -= dt;
      var d = b.x - sex[i], ad = Math.abs(d);
      if (sem[i] === 0) {                                                        // out on the rock
        if (ad < SEAL.R || set_[i] <= 0 && r.next() < 0.4) {
          sem[i] = 2; set_[i] = r.range(2.5, 4.5); sespot[i] = -1; acts.sealDives++;
          setx[i] = clamp(sex[i] - sgn(d || 1) * r.range(40, 80), lo, hi);
          G.gfx.fx.splash(sex[i], loc.waterY, 0.25); ring(sex[i], 0.45, loc);
        } else if (set_[i] <= 0) set_[i] = r.range(10, 30);
        continue;
      }
      if (sem[i] === 2) {                                                        // under, swimming on
        sex[i] += clamp(setx[i] - sex[i], -SEAL.UV * dt, SEAL.UV * dt);
        if (set_[i] <= 0 && Math.abs(b.x - sex[i]) > SEAL.R * 0.7) { sem[i] = 1; set_[i] = r.range(8, 20); ring(sex[i], 0.25, loc); seph[i] = 0; }
        continue;
      }
      if (ad < SEAL.R * 0.75) {                                                  // the boat came: under and away
        sem[i] = 2; set_[i] = r.range(3, 5); acts.sealDives++; ring(sex[i], 0.3, loc);
        setx[i] = clamp(sex[i] - sgn(d || 1) * r.range(50, 90), lo, hi); continue;
      }
      if (ad < SEAL.watch) { sedir[i] = sgn(d); continue; }                        // heads up, watching it
      var tx = setx[i] - sex[i];
      if (Math.abs(tx) > 0.5) { sedir[i] = sgn(tx); sex[i] += clamp(tx, -SEAL.V * dt, SEAL.V * dt); }
      if (set_[i] > 0) continue;
      var k = -1;
      for (var q = 0; q < T.spots.length && k < 0; q++) if (spotFree(T, q) && Math.abs(b.x - T.spots[q].x) > SEAL.haulFar) k = q;
      if (k >= 0 && r.next() < 0.5) {                                            // out onto a rock
        if (Math.abs(T.spots[k].x - sex[i]) < 1.5) { sem[i] = 0; sespot[i] = k; sex[i] = T.spots[k].x; set_[i] = r.range(30, 90); sedir[i] = r.next() < 0.5 ? -1 : 1; ring(sex[i], 0.2, loc); acts.hauls++; }
        else { setx[i] = T.spots[k].x; set_[i] = 0.5; }
      } else { sem[i] = 2; set_[i] = r.range(3, 6); setx[i] = r.range(lo, hi); ring(sex[i], 0.2, loc); acts.sealDives++; }
    }
  }

  // Phase 79: cormorants sit on the rocks, holding their wings out to dry now and then, fly out
  // low over the water, swim low and dive (a long while under, in the cross-section, after the
  // fry), come up, and after a few dives fly home. The boat near the rock sends one off.
  var CORM = { R: 40, flyV: 30, swimV: 3, UV: 14 };
  function cormStep(T, dt, b, h, r, loc) {
    var want = hrs(T.hours, h);
    cma = toward(cma, want ? 1 : 0, dt / LA.fade);
    for (var i = 0; i < cmn; i++) {
      var pp = T.perches[i], m = cmm[i];
      cmph[i] += dt; cmt[i] -= dt; if (cmwing[i] > 0) cmwing[i] -= dt;
      if (m === 0) {
        cmx[i] = pp.x; cmy[i] = pp.y;
        if ((Math.abs(b.x - pp.x) < CORM.R || cmt[i] <= 0) && want) {
          cmtx[i] = clamp(pp.x + (Math.abs(b.x - pp.x) < CORM.R ? sgn(pp.x - b.x) : (r.next() < 0.5 ? -1 : 1)) * r.range(50, 120), T.x[0], T.x[1]);
          if (Math.abs(cmtx[i] - b.x) < 50) cmtx[i] = clamp(b.x + sgn(cmtx[i] - b.x || 1) * 70, T.x[0], T.x[1]);
          cmm[i] = 1; cmwing[i] = 0; cmdives[i] = 0;
        } else if (cmt[i] <= 0) cmt[i] = 5;
        continue;
      }
      if (m === 1 || m === 4) {                                                  // flying low
        var gx = m === 1 ? cmtx[i] : pp.x, gy = m === 1 ? 0 : pp.y, dx = gx - cmx[i];
        cmdir[i] = sgn(dx);
        cmx[i] += clamp(dx, -CORM.flyV * dt, CORM.flyV * dt);
        var far = Math.abs(dx) > 20 ? Math.max(gy, 5) : gy;
        cmy[i] += clamp(far - cmy[i], -10 * dt, 10 * dt);
        if (Math.abs(dx) < 0.5 && Math.abs(cmy[i] - gy) < 0.5) {
          if (m === 1) { cmm[i] = 2; cmy[i] = 0; cmt[i] = r.range(3, 8); ring(cmx[i], 0.3, loc); }
          else { cmm[i] = 0; cmt[i] = r.range(25, 70); cmwing[i] = r.next() < 0.7 ? r.range(10, 20) : 0; cmdir[i] = r.next() < 0.5 ? -1 : 1; }
        }
        continue;
      }
      if (m === 2) {                                                             // swimming low
        cmx[i] = clamp(cmx[i] + cmdir[i] * CORM.swimV * dt, T.x[0], T.x[1]);
        var near = Math.abs(b.x - cmx[i]) < CORM.R * 0.9;
        if (!want && !near) { cmm[i] = 4; continue; }
        if (near || cmt[i] <= 0) {
          if (cmdives[i] >= 3 && !near) { cmm[i] = 4; continue; }
          cmm[i] = 3; cmt[i] = r.range(6, 14); cmdives[i]++; acts.cormDives++;
          cmuvx[i] = (near ? sgn(cmx[i] - b.x) : (r.next() < 0.5 ? -1 : 1)) * CORM.UV;
          cmdeep[i] = Math.min(r.range(10, 30), Math.max(4, G.scene.underwater.bottomAt(loc, cmx[i]) - 4));
          ring(cmx[i], 0.25, loc); cmy[i] = 0;
        }
        continue;
      }
      cmx[i] = clamp(cmx[i] + cmuvx[i] * dt, T.x[0], T.x[1]);                   // under
      if (cmx[i] <= T.x[0] || cmx[i] >= T.x[1]) cmuvx[i] = -cmuvx[i];
      cmy[i] += clamp((cmt[i] > 1.2 ? cmdeep[i] : 0) - cmy[i], -9 * dt, 9 * dt);
      if (takePrey(cmx[i], cmy[i], 5)) acts.fish++;
      if (cmt[i] <= 0 && cmy[i] < 0.5) { cmm[i] = 2; cmy[i] = 0; cmdir[i] = sgn(cmuvx[i]); cmt[i] = r.range(3, 8); ring(cmx[i], 0.2, loc); }
    }
  }

  // Phase 78: the otters play about the cove: they swim with their heads up, arch and dive,
  // come up somewhere else, and now and then haul out on the deadfall to sit up and look about.
  // The boat near sends a swimmer under and away, and slides a sitter off the log.
  function otterLogXY(i, out) {                                                   // where along the log (world x, px over the water)
    var L = otLog, len = L.len || 50, t = otlt[i];
    out[0] = L.x + L.dir * len * t; out[1] = 8 - 6.5 * t;
  }
  var olog = [0, 0];
  function otterStep(T, dt, b, h, r, loc) {
    ota = toward(ota, hrs(T.hours, h) ? 1 : 0, dt / LA.fade);
    var lo = T.x[0], hi = T.x[1];
    for (var i = 0; i < otn; i++) {
      otph[i] += dt; ott[i] -= dt;
      var near = Math.abs(b.x - otx[i]) < LA.otterR;
      if (otm[i] === 2) {                                                        // on the log
        if (near || ott[i] <= 0 || ota < 0.5) {
          otterLogXY(i, olog); otx[i] = olog[0]; otm[i] = 1; ott[i] = r.range(2, 3.5); ring(otx[i], 0.25, loc); acts.otterDives++;
          ottx[i] = clamp(otx[i] + sgn(otx[i] - b.x) * r.range(20, 50), lo, hi);
        }
        continue;
      }
      if (otm[i] === 1) {                                                        // under: swimming on below
        otx[i] += clamp(ottx[i] - otx[i], -LA.otterUV * dt, LA.otterUV * dt);
        if (ott[i] <= 0 && !(Math.abs(b.x - otx[i]) < LA.otterR * 0.7)) { otm[i] = 0; ott[i] = r.range(3, 9); ring(otx[i], 0.2, loc); otph[i] = 0; }
        continue;
      }
      if (near) {                                                                // the boat: under and away
        otm[i] = 1; ott[i] = r.range(2.5, 4); ring(otx[i], 0.3, loc); acts.otterDives++;
        ottx[i] = clamp(otx[i] + sgn(otx[i] - b.x) * r.range(40, 70), lo, hi);
        continue;
      }
      var dx = ottx[i] - otx[i];
      if (Math.abs(dx) < 1) ottx[i] = r.range(lo, hi);
      else { otdir[i] = sgn(dx); otx[i] += otdir[i] * LA.otterV * dt; }
      if (ott[i] <= 0) {
        if (otLog && ota > 0.5 && r.next() < 0.35) {                            // out onto the log
          otlt[i] = r.range(0.35, 0.9); otterLogXY(i, olog);
          if (Math.abs(b.x - olog[0]) > LA.otterR * 1.5) { otm[i] = 2; otx[i] = olog[0]; ott[i] = r.range(6, 16); otdir[i] = r.next() < 0.5 ? -1 : 1; ring(olog[0], 0.15, loc); continue; }
        }
        otm[i] = 1; ott[i] = r.range(1.5, 3.5); ring(otx[i], 0.2, loc); acts.otterDives++; otph[i] = 0;
        ottx[i] = clamp(otx[i] + otdir[i] * r.range(15, 40), lo, hi);
      }
    }
  }

  // Phase 77: the osprey fishes the pool below its nest: it sits a while, flies out, hangs on
  // beating wings over the water, folds and drops feet first, and climbs out, with a fish now
  // and then, back to the nest. Never near the boat: it picks water away from it.
  function ospreyStep(T, dt, b, h, r, loc) {
    var want = hrs(T.hours, h), lo = T.x[0], hi = T.x[1], v, dx;
    if (!os.on) {
      if (!want || (os.wait -= dt) > 0) return;
      os.on = true; os.a = 0; os.x = os.nx; os.y = os.ny; os.mode = 0; os.t = r.range(4, 12); os.dir = 1;
      return;
    }
    os.ph += dt;
    if (os.fish > 0 && os.mode === 0) os.fish -= dt;
    if (os.mode === 0) {
      os.a = toward(os.a, want ? 1 : 0, dt / LA.fade);
      if (!want && os.a <= 0) { os.on = false; os.wait = r.range(20, 60); return; }
      if (want && (os.t -= dt) <= 0) {
        os.tx = r.range(lo, hi);
        if (Math.abs(os.tx - b.x) < 60) os.tx = clamp(b.x + sgn(os.tx - b.x || 1) * 80, lo, hi);
        if (Math.abs(os.tx - b.x) < 50) { os.t = 5; return; }                   // nowhere away from the boat: wait
        os.mode = 1; os.fish = 0;
      }
      return;
    }
    os.a = toward(os.a, 1, dt / LA.fade);
    if (os.mode === 1) {                                                         // out to the water, at height
      dx = os.tx - os.x; os.dir = sgn(dx);
      os.x += clamp(dx, -LA.ospV * dt, LA.ospV * dt); os.y += clamp(LA.ospY - os.y, -12 * dt, 12 * dt);
      if (Math.abs(dx) < 1 && Math.abs(os.y - LA.ospY) < 2) { os.mode = 2; os.t = r.range(1.5, 3.5); }
    } else if (os.mode === 2) {                                                  // hovering, looking down
      os.y = LA.ospY + Math.sin(os.ph * 7) * 0.6;
      if ((os.t -= dt) <= 0) {
        if (Math.abs(b.x - os.x) < 50 || !want) { os.mode = 6; return; }          // the boat came: home
        os.mode = 3;
      }
    } else if (os.mode === 3) {                                                  // the stoop
      os.y -= LA.ospDrop * dt; os.x += os.dir * 6 * dt;
      if (os.y <= 0) {
        os.y = 0; os.mode = 4; os.t = 0;
        G.gfx.fx.splash(os.x, loc.waterY, 0.35); ring(os.x, 0.7, loc); G.audio.engine.cue('dive', os.x); acts.plunges++;
        if (r.next() < LA.ospCatch) { os.fish = 30; acts.fish++; }
      }
    } else if (os.mode === 4) {                                                  // under, a moment
      if ((os.t += dt) >= 0.45) { os.mode = 5; ring(os.x, 0.3, loc); }
    } else if (os.mode === 5) {                                                  // climbing out, shaking off
      os.y += 16 * dt; os.x += os.dir * 4 * dt;
      if (os.y >= 30) os.mode = 6;
    } else {                                                                     // home to the nest
      dx = os.nx - os.x; v = os.ny - os.y; os.dir = sgn(dx);
      os.x += clamp(dx, -LA.ospV * dt, LA.ospV * dt); os.y += clamp(v, -14 * dt, 14 * dt);
      if (Math.abs(dx) < 0.5 && Math.abs(v) < 0.5) { os.x = os.nx; os.y = os.ny; os.mode = 0; os.t = r.range(LA.osp0, LA.osp1); os.dir = 1; }
    }
  }

  // Phase 77: bald eagles soar in wide slow circles high over the valley (an ellipse: seen
  // from the side), drifting along it, gliding mostly, a few beats now and then.
  function eagleStep(T, dt, h) {
    ea = toward(ea, hrs(T.hours, h) ? 1 : 0, dt / (LA.fade * 2));
    for (var i = 0; i < en; i++) {
      eang[i] += ew[i] * dt; eph[i] += dt;
      ecx[i] += ev[i] * dt;
      if ((ecx[i] < T.x[0] && ev[i] < 0) || (ecx[i] > T.x[1] && ev[i] > 0)) ev[i] = -ev[i];
    }
  }
  function eagleX(i) { return ecx[i] + Math.cos(eang[i]) * er[i]; }
  function eagleY(i) { return ecy[i] + Math.sin(eang[i]) * er[i] * 0.22; }

  // Ducks: a hen and her young paddle about their stretch of water, further out than the boat.
  function ducksStep(T, dt, cam, bs, h, r, loc) {
    var want = hrs(T.hours, h), p = T.p, lo = T.x[0], hi = T.x[1], d = dk.x - cam * p - bs, i, faceOn = ab.lim > 0.5 && want;
    if (!dk.on) {
      if (!want || (dk.wait -= dt) > 0) return;
      var far = Math.abs(lo - cam * p - bs) > Math.abs(hi - cam * p - bs) ? lo : hi; // come in at the end away from the boat
      dk.on = true; dk.a = 0; dk.x = far; dk.dir = far === lo ? 1 : -1; dk.mode = 0; dk.v = 0; dk.tgt = r.range(lo, hi); dk.t = r.range(LA.duckDive0, LA.duckDive1); dk.faced = 0; dk.under = false;
      for (i = 0; i < yn; i++) { yx[i] = dk.x - dk.dir * (5 + 4 * i); yph[i] = r.range(0, 6); ydir[i] = dk.dir; }
      return;
    }
    dk.a = toward(dk.a, want ? 1 : 0, dt / LA.fade);
    if (!want && dk.a <= 0) { dk.on = false; dk.wait = r.range(10, 30); return; }
    dk.ph += dt;
    if (faceOn && dk.mode !== 3 && dk.mode !== 4) { dk.mode = 4; dk.faceT = 0; dk.faced = 0; }
    if (dk.mode === 4 && !faceOn) dk.mode = 0;
    var vt = 0;
    if (dk.mode === 0) {
      vt = LA.duckV;
      if (Math.abs(dk.tgt - dk.x) < 2) { dk.tgt = r.range(lo, hi); }
      dk.dir = sgn(dk.tgt - dk.x);
      if (Math.abs(d) < LA.duckR) { dk.mode = 1; dk.dir = sgn(d); }
      else if ((dk.t -= dt) <= 0 && Math.abs(d) > LA.duckR * 2) { dk.mode = 3; dk.t = 0; dk.dvx = sgn(dk.tgt - dk.x) * r.range(3, 6); dk.dy = 0; }
    } else if (dk.mode === 1) {
      vt = LA.duckFlee; dk.dir = sgn(d);
      if ((dk.dir > 0 && dk.x >= hi - 1) || (dk.dir < 0 && dk.x <= lo + 1)) { dk.mode = 2; dk.dir = -dk.dir; } // cornered: slip past behind the boat
      else if (Math.abs(d) > LA.duckR * 1.6) { dk.mode = 0; dk.tgt = clamp(dk.x + dk.dir * 30, lo, hi); }
    } else if (dk.mode === 2) {
      vt = LA.duckFlee;
      if (d * dk.dir > LA.duckR) { dk.mode = 0; dk.tgt = clamp(dk.x + dk.dir * 30, lo, hi); }
      else if (dk.x <= lo + 1 || dk.x >= hi - 1) { dk.mode = 1; dk.dir = sgn(d); }   // the boat followed them round: away again
    } else if (dk.mode === 3) {
      // The hen dives: tips up, goes under, swims down and along, comes up a little way off.
      dk.t += dt; vt = 0;
      if (dk.t >= 0.4 && !dk.under && dk.t < 3.9) { dk.under = true; ring(dk.x - cam * p + cam, 0.2, loc); G.audio.engine.cue('dive', dk.x - cam * p + cam); acts.dives++; }
      if (dk.under) {
        var u = dk.t - 0.4;
        dk.dy = u < 1.2 ? 16 * ease(u / 1.2) : (u < 2.3 ? 16 : 16 * (1 - ease((u - 2.3) / 1.2)));
        dk.x = clamp(dk.x + dk.dvx * dt, lo, hi);
      }
      if (dk.t >= 3.9) {
        dk.under = false; dk.dy = 0; dk.mode = 0; dk.t = r.range(LA.duckDive0, LA.duckDive1); ring(dk.x - cam * p + cam, 0.25, loc);
        if (Math.abs(d) < LA.duckR) { dk.mode = 1; dk.dir = sgn(d); } // up beside the boat: off at once
      }
    } else {
      // Liminal: the paddling stops; one by one, the hen first, they turn to face the boat.
      dk.faceT -= dt;
      if (dk.faceT <= 0 && dk.faced <= yn) { dk.faced++; dk.faceT = LA.faceEvery; }
    }
    dk.v = toward(dk.v, vt, (dk.mode === 4 ? 0.8 : 6) * dt);
    if (dk.mode !== 3) dk.x = clamp(dk.x + dk.dir * dk.v * dt, lo, hi);
    for (i = 0; i < yn; i++) {
      var tx = dk.mode === 3 ? yx[i] : dk.x - dk.dir * (5 + 4 * i), ox = yx[i];
      yx[i] += (tx - yx[i]) * Math.min(1, dt * 2.5);
      yph[i] += dt;
      if (dk.mode === 4) { if (dk.faced > i + 1) ydir[i] = sgn(bs - (yx[i] - cam * p)); }
      else if (Math.abs(yx[i] - ox) > 0.3 * dt) ydir[i] = sgn(yx[i] - ox);
    }
  }
  function duckFace() { return dk.mode === 4 && dk.faced > 0 ? sgn(G.state.run.boat.x - G.state.run.cam.x - (dk.x - G.state.run.cam.x * ab.T.ducks.p)) : dk.dir; }

  // A ring and a dent where something goes in or comes up (world x).
  function ring(x, power, loc) {
    G.gfx.fx.ripple(x, loc.waterY + 1, 1, 5 + 6 * power, 1.2);
    G.gfx.surface.poke(x, 0.15 * power + 0.05, 1.5);
  }

  // The heron stalks the shallows near a shore and strikes at what swims there.
  function heronStep(T, dt, b, h, r, loc) {
    var still = ab.lim > 0.5 && ab.night, want = hrs(T.hours, h) || still, lo = T.x[0], hi = T.x[1];
    if (!hr.on) {
      if (!want || (hr.wait -= dt) > 0) return;
      var home = still ? (lo + hi) / 2 : r.range(lo, hi);
      if (!still && Math.abs(b.x - home) < LA.heronR * 2) { hr.wait = 3; return; }
      hr.on = true; hr.a = 0; hr.x = home; hr.dir = r.next() < 0.5 ? -1 : 1; hr.mode = still ? 5 : 0; hr.t = r.range(2, 5); hr.reach = 0; hr.lift = 0; hr.fish = 0;
      return;
    }
    hr.ph += dt;
    if (hr.fish > 0) hr.fish -= dt;
    if (hr.mode === 3) {
      // Flying off: a slow climb away from the boat, fading as it goes.
      hr.x += hr.vx * dt; hr.lift += 8 * dt; hr.t += dt;
      if (hr.t > 1.5) hr.a = toward(hr.a, 0, dt / LA.fade);
      if (hr.a <= 0) { hr.on = false; hr.wait = r.range(40, 80); }
      return;
    }
    hr.a = toward(hr.a, 1, dt / (still ? 4 : LA.fade));
    if (still) { // stands there all night: no strike, no flight, no turn
      if (hr.mode === 2 && hr.t < 0.75) { hr.t += dt; hr.reach = strikeReach(hr.t); return; }
      hr.mode = 5; hr.reach = toward(hr.reach, 0, dt); return;
    }
    if (hr.mode === 5) { hr.mode = 0; hr.t = r.range(3, 7); }
    if (!want || Math.abs(b.x - hr.x) < LA.heronR) { // leaves: away from the boat
      hr.mode = 3; hr.t = 0; hr.reach = 0; hr.vx = sgn(hr.x - b.x) * LA.heronFly; hr.dir = sgn(hr.vx);
      return;
    }
    if (hr.mode === 0) {
      hr.reach = 0;
      if ((hr.t -= dt) <= 0) {
        var px = preyNear(lo - 10, hi + 10, 12, hr.x);
        if (px >= 0) { hr.mode = 1; hr.dir = sgn(px - hr.x); hr.tx = clamp(px - hr.dir * 9, lo, hi); }
        else if (r.next() < 0.35) { hr.mode = 2; hr.t = 0; hr.struck = false; } // at something we cannot see (it comes up empty unless a fry is there)
        else { hr.t = r.range(3, 7); if (r.next() < 0.3) hr.dir = -hr.dir; }
      }
    } else if (hr.mode === 1) {
      var dx = hr.tx - hr.x;
      if (Math.abs(dx) < 0.5) { hr.mode = 2; hr.t = 0; hr.struck = false; }
      else hr.x += sgn(dx) * Math.min(Math.abs(dx), LA.heronV * dt);
    } else if (hr.mode === 2) {
      hr.t += dt; hr.reach = strikeReach(hr.t);
      if (!hr.struck && hr.t >= 0.18) {
        hr.struck = true; acts.strikes++;
        var bx = hr.x + hr.dir * 10;
        G.gfx.fx.splash(bx, loc.waterY, 0.1); ring(bx, 0.3, loc); G.audio.engine.cue('strike', bx);
        if (takePrey(bx, 4, 8)) hr.fish = 2.5;
      }
      if (hr.t >= 0.75) { hr.mode = 0; hr.reach = 0; hr.t = r.range(5, 10); }
    }
  }
  function strikeReach(t) { return t < 0.18 ? ease(t / 0.18) : (t < 0.33 ? 1 : (t < 0.75 ? 1 - ease((t - 0.33) / 0.42) : 0)); }

  // The kingfisher: on a perch over the water, it drops in after a fry and flies back up.
  function kingStep(T, dt, b, h, r, loc) {
    var want = hrs(T.hours, h), P_ = T.perches, i;
    if (!kf.on) {
      if (!want || (kf.wait -= dt) > 0) return;
      var best = farPerch(P_, b.x, -1);
      if (best < 0) { kf.wait = 4; return; }
      kf.on = true; kf.a = 0; kf.i = best; kf.x = P_[best].x; kf.y = P_[best].y; kf.mode = 0; kf.t = r.range(LA.kingDive0, LA.kingDive1); kf.dir = r.next() < 0.5 ? -1 : 1; kf.leaving = false;
      return;
    }
    kf.ph += dt;
    if (kf.fish > 0) kf.fish -= dt;
    if (kf.mode === 4) { // flying to a perch, or away
      kf.t += dt;
      var u = Math.min(1, kf.t / kf.dur);
      kf.x = kf.x0 + (kf.x1 - kf.x0) * u; kf.y = kf.y0 + (kf.y1 - kf.y0) * u + Math.sin(u * Math.PI) * 6;
      if (kf.leaving) { kf.a = toward(kf.a, 0, dt / 1.2); if (kf.a <= 0) { kf.on = false; kf.wait = r.range(30, 60); } return; }
      if (u >= 1) { kf.mode = 0; kf.t = r.range(LA.kingDive0, LA.kingDive1); }
      return;
    }
    kf.a = toward(kf.a, 1, dt / LA.fade);
    if (kf.mode === 0 && (!want || Math.abs(b.x - kf.x) < LA.kingR)) { kingFlee(P_, b, want, r); return; }
    if (kf.mode === 0) {
      if ((kf.t -= dt) <= 0 && Math.abs(b.x - kf.x) > LA.kingR * 2) { kf.mode = 1; kf.t = 0; kf.x0 = kf.x; kf.y0 = kf.y; kf.x1 = kf.x + kf.dir * 8; }
    } else if (kf.mode === 1) { // the drop
      kf.t += dt;
      var v = Math.min(1, kf.t / 0.35);
      kf.x = kf.x0 + (kf.x1 - kf.x0) * v; kf.y = kf.y0 * (1 - v * v);
      if (v >= 1) { kf.mode = 2; kf.t = 0; G.gfx.fx.splash(kf.x, loc.waterY, 0.12); ring(kf.x, 0.3, loc); G.audio.engine.cue('dive', kf.x); acts.dives++; if (takePrey(kf.x, 4, 8)) kf.fish = 4; }
    } else if (kf.mode === 2) { // under for a moment
      kf.t += dt; kf.y = -3 - 2 * Math.sin(Math.min(1, kf.t / 0.3) * Math.PI);
      if (kf.t >= 0.3) { kf.mode = 3; kf.t = 0; kf.y = 0; ring(kf.x, 0.15, loc); }
    } else if (kf.mode === 3) { // back up to the perch
      kf.t += dt;
      var w = Math.min(1, kf.t / 0.6), pp = P_[kf.i];
      kf.x = kf.x1 + (pp.x - kf.x1) * w; kf.y = pp.y * ease(w);
      if (w >= 1) { kf.mode = 0; kf.x = pp.x; kf.y = pp.y; kf.t = r.range(LA.kingDive0, LA.kingDive1); kf.dir = r.next() < 0.5 ? -1 : 1; }
    }
    if ((kf.mode === 0 || kf.mode === 3) && Math.abs(b.x - kf.x) < LA.kingR) kingFlee(P_, b, want, r); // back on the perch (or nearly) with the boat there: off
  }
  function kingFlee(P_, b, want, r) {
    var nb = want ? farPerch(P_, b.x, kf.i) : -1;
    kf.mode = 4; kf.t = 0; kf.x0 = kf.x; kf.y0 = kf.y;
    if (nb >= 0) { kf.i = nb; kf.x1 = P_[nb].x; kf.y1 = P_[nb].y; }
    else { kf.leaving = true; kf.x1 = kf.x + sgn(kf.x - b.x) * 160; kf.y1 = kf.y + 20; }
    kf.dur = Math.abs(kf.x1 - kf.x0) / LA.kingV + 0.3; kf.dir = sgn(kf.x1 - kf.x0);
  }
  // The perch farthest from the boat that is at least twice kingR from it (not `not`), or -1.
  function farPerch(P_, bx, not) {
    var best = -1, bd = LA.kingR * 2;
    for (var i = 0; i < P_.length; i++) if (i !== not && Math.abs(P_[i].x - bx) > bd) { bd = Math.abs(P_[i].x - bx); best = i; }
    return best;
  }

  // The loon: far out, it swims slowly, dives (to get away, or to feed) and comes up elsewhere,
  // and calls at dusk and dawn.
  function loonStep(T, dt, cam, bs, h, r, loc) {
    var want = hrs(T.hours, h), p = T.p, lo = T.x[0], hi = T.x[1], d = ln.x - cam * p - bs;
    if (!ln.on) {
      if (!want || (ln.wait -= dt) > 0) return;
      ln.on = true; ln.a = 0; ln.x = Math.abs(lo - cam * p - bs) > Math.abs(hi - cam * p - bs) ? lo + 20 : hi - 20; ln.dir = r.next() < 0.5 ? -1 : 1; ln.mode = 0;
      ln.dive = r.range(LA.loonDive0, LA.loonDive1); ln.call = r.range(5, 20);
      return;
    }
    ln.a = toward(ln.a, want ? 1 : 0, dt / LA.fade);
    if (!want && ln.a <= 0) { ln.on = false; ln.wait = r.range(20, 40); return; }
    ln.ph += dt;
    if (ln.mode === 0) {
      ln.x += ln.dir * LA.loonV * dt;
      if (ln.x < lo || ln.x > hi) { ln.x = clamp(ln.x, lo, hi); ln.dir = -ln.dir; }
      var flee = Math.abs(d) < LA.loonR;
      if (flee || (ln.dive -= dt) <= 0) {
        ln.mode = 1; ln.t = 0; ln.ux = ln.x; ln.uy = 0;
        ln.uvx = (flee ? sgn(d) : (r.next() < 0.5 ? -1 : 1)) * LA.loonUV; ln.dur = flee ? r.range(8, 11) : r.range(5, 9); ln.dmax = r.range(14, 24);
        ring(ln.x - cam * p + cam, 0.3, loc); G.audio.engine.cue('dive', ln.x - cam * p + cam); acts.dives++;
      }
      if (hrs(T.call, h) && ab.lim < 0.5 && (ln.call -= dt) <= 0) { ln.call = r.range(LA.loonCall0, LA.loonCall1); G.audio.engine.cue('loon', ln.x - cam * p + cam); acts.calls++; }
    } else {
      ln.t += dt;
      ln.ux = clamp(ln.ux + ln.uvx * dt, lo, hi);
      if (ln.ux <= lo || ln.ux >= hi) ln.uvx = -ln.uvx;
      ln.uy = Math.min(ln.uy + ln.dmax * dt, ln.t < 1.5 ? ln.dmax * ease(ln.t / 1.5) : (ln.t > ln.dur - 1.5 ? ln.dmax * (1 - ease((ln.t - ln.dur + 1.5) / 1.5)) : ln.dmax));
      var du = ln.ux - cam * p - bs;
      if (ln.t >= ln.dur && Math.abs(du) < LA.loonR * 1.5) { ln.dur = ln.t + 2; ln.uvx = sgn(du) * LA.loonUV; } // the boat is over it: on under, away
      else if (ln.t >= ln.dur) { ln.mode = 0; ln.x = ln.ux; ln.dir = sgn(ln.uvx); ln.dive = r.range(LA.loonDive0, LA.loonDive1); ring(ln.x - cam * p + cam, 0.25, loc); }
    }
  }

  // The frog sits on a lily pad, plops in when the boat comes, and climbs back on later.
  function frogStep(T, dt, b, h, r, loc) {
    var L_ = ab.lilies, want = hrs(T.hours, h), i;
    if (!L_.length) return;
    if (!fr.on) {
      if (!want || (fr.wait -= dt) > 0) return;
      var best = -1, bd = 80;
      for (i = 0; i < L_.length; i++) if (Math.abs(L_[i].x - b.x) > bd) { bd = Math.abs(L_[i].x - b.x); best = i; }
      if (best < 0) { fr.wait = 3; return; }
      fr.on = true; fr.a = 0; fr.i = best; fr.x = L_[best].x; fr.mode = 0; fr.dir = r.next() < 0.5 ? -1 : 1;
      return;
    }
    fr.ph += dt;
    if (fr.mode === 0) {
      fr.a = toward(fr.a, want ? 1 : 0, dt / LA.fade);
      if (!want && fr.a <= 0) { fr.on = false; fr.wait = r.range(20, 40); return; }
      if (Math.abs(b.x - fr.x) < LA.frogR) { fr.mode = 1; fr.t = 0; fr.x0 = fr.x; fr.dir = sgn(fr.x - b.x); fr.a = Math.max(fr.a, 0.5); }
    } else if (fr.mode === 1) {
      fr.t += dt;
      var u = Math.min(1, fr.t / 0.35);
      fr.x = fr.x0 + fr.dir * 6 * u; fr.h = 4 * Math.sin(u * Math.PI);
      if (u >= 1) {
        fr.mode = 2; fr.t = 0; fr.ux = fr.x; fr.uy = 0; fr.h = 0;
        G.gfx.fx.splash(fr.x, loc.waterY, 0.05); ring(fr.x, 0.2, loc); G.audio.engine.cue('plop', fr.x); acts.plops++;
      }
    } else {
      fr.t += dt; fr.ux += fr.dir * 8 * dt; fr.uy = Math.min(7, fr.t * 6);
      if (fr.t >= 1.6) { fr.on = false; fr.wait = r.range(25, 50); }
    }
  }

  // The deer comes down to drink at dawn and dusk; at the boat it looks up, then goes.
  function deerStep(T, dt, cam, bs, h, r) {
    var want = hrs(T.hours, h), Ly = ab.layer[T.layer], p = Ly.parallax;
    if (!dr.on) {
      if (!want || (dr.wait -= dt) > 0) return;
      var x = r.range(T.x[0], T.x[1]);
      if (Math.abs(x - cam * p - bs) < LA.deerR * 1.5) { dr.wait = 4; return; }
      dr.on = true; dr.a = 0; dr.x = x; dr.dir = r.next() < 0.5 ? -1 : 1; dr.mode = 0; dr.t = 4; dr.leaving = false;
      return;
    }
    dr.ph += dt;
    var d = dr.x - cam * p - bs;
    if (dr.mode === 3) {
      dr.x += dr.dir * LA.deerWalk * dt; dr.a = toward(dr.a, 0, dt / 2.5);
      if (dr.a <= 0) { dr.on = false; dr.wait = r.range(60, 120); }
      return;
    }
    dr.a = toward(dr.a, 1, dt / LA.fade);
    if (!dr.leaving && (!want || Math.abs(d) < LA.deerR)) { dr.leaving = true; dr.mode = 2; dr.t = 1.2; dr.dir = d > 0 ? 1 : -1; } // looks up, then walks off away from the boat
    if (dr.mode === 0) { dr.x += dr.dir * 1 * dt; if ((dr.t -= dt) <= 0) { dr.mode = 1; dr.t = r.range(4, 9); } }
    else if (dr.mode === 1) { if ((dr.t -= dt) <= 0) { dr.mode = 2; dr.t = r.range(1.5, 3); } }
    else if (dr.mode === 2) {
      if ((dr.t -= dt) <= 0) {
        if (dr.leaving) dr.mode = 3; else { dr.mode = 1; dr.t = r.range(4, 9); }
      }
    }
  }

  // Phase 83: the moose comes down to the far shore at dawn and dusk, wades in to its knees and
  // eats weed, head down, lifting it now and then to look about; it is unbothered by the boat
  // unless it comes within mooseR px (on screen), when it looks up and walks off.
  function mooseStep(T, dt, cam, bs, h, r) {
    var want = hrs(T.hours, h), Ly = ab.layer[T.layer], p = Ly.parallax;
    if (!mo.on) {
      if (!want || (mo.wait -= dt) > 0) return;
      var x = r.range(T.x[0], T.x[1]);
      if (Math.abs(x - cam * p - bs) < LA.mooseR * 1.5) { mo.wait = 4; return; }
      mo.on = true; mo.a = 0; mo.x = x; mo.dir = r.next() < 0.5 ? -1 : 1; mo.mode = 0; mo.t = 5; mo.leaving = false; mo.wade = 0;
      return;
    }
    mo.ph += dt;
    var d = mo.x - cam * p - bs;
    if (mo.mode === 3) {
      mo.x += mo.dir * LA.mooseWalk * dt; mo.wade = toward(mo.wade, 0, dt / 2); mo.a = toward(mo.a, 0, dt / 3);
      if (mo.a <= 0) { mo.on = false; mo.wait = r.range(90, 160); }
      return;
    }
    mo.a = toward(mo.a, 1, dt / LA.fade);
    if (!mo.leaving && (!want || Math.abs(d) < LA.mooseR)) { mo.leaving = true; mo.mode = 2; mo.t = 1.5; mo.dir = d > 0 ? 1 : -1; acts.mooseOff++; }
    if (mo.mode === 0) { mo.x += mo.dir * 1.2 * dt; mo.wade = toward(mo.wade, 1, dt / 4); if ((mo.t -= dt) <= 0) { mo.mode = 1; mo.t = r.range(6, 14); } }
    else if (mo.mode === 1) { if ((mo.t -= dt) <= 0) { mo.mode = 2; mo.t = r.range(2, 4); } }
    else if (mo.mode === 2) { if ((mo.t -= dt) <= 0) { if (mo.leaving) mo.mode = 3; else { mo.mode = mo.wade < 1 ? 0 : 1; mo.t = r.range(6, 14); } } }
  }

  // The beaver swims to its lodge with a V behind it, and slaps its tail and dives at the boat.
  function beaverStep(T, dt, cam, bs, h, r, loc) {
    var want = hrs(T.hours, h), p = ab.layer[T.layer].parallax, L0 = ab.lodge;
    if (!bv.on) {
      if (!want || (bv.wait -= dt) > 0) return;
      var side = r.next() < 0.5 ? -1 : 1, x = L0 + side * r.range(70, 140);
      if (Math.abs(x - cam * p - bs) < LA.beaverR * 1.5) { bv.wait = 5; return; }
      bv.on = true; bv.x = x; bv.dir = -side; bv.mode = 0; bv.t = 0;
      return;
    }
    bv.ph += dt;
    if (bv.mode === 0) {
      bv.x += bv.dir * LA.beaverV * dt;
      if (Math.abs(bv.x - cam * p - bs) < LA.beaverR) { bv.mode = 1; bv.t = 0; bv.slap = true; G.audio.engine.cue('slap', bv.x - cam * p + cam); acts.slaps++; }
      else if ((bv.x - L0) * bv.dir >= -2 || !want) { bv.mode = 1; bv.t = 0; bv.slap = false; }
    } else if ((bv.t += dt) >= 0.6) { bv.on = false; bv.wait = bv.slap ? r.range(60, 120) : r.range(30, 70); }
  }

  // The fox crosses the diner's lot at night, sitting a while under a lamp.
  function foxStep(T, dt, h, r) {
    var want = hrs(T.hours, h), lo = T.x[0], hi = T.x[1];
    if (!fo.on) {
      if (!want || (fo.wait -= dt) > 0) return;
      fo.on = true; fo.a = 0; fo.dir = r.next() < 0.5 ? -1 : 1; fo.x = fo.dir > 0 ? lo : hi; fo.mode = 0; fo.t = r.range(3, 8); fo.sits = 0;
      return;
    }
    fo.ph += dt;
    if (!want && fo.mode !== 2) fo.mode = 2; // its hours are over: it goes on its way, fading
    if (fo.mode === 0) {
      fo.x += fo.dir * LA.foxV * dt; fo.a = toward(fo.a, 1, dt / LA.fade);
      if ((fo.t -= dt) <= 0 && fo.sits < 2 && want) { fo.mode = 1; fo.t = r.range(3, 6); fo.sits++; }
      if ((fo.dir > 0 && fo.x >= hi) || (fo.dir < 0 && fo.x <= lo)) fo.mode = 2;
    } else if (fo.mode === 1) { if ((fo.t -= dt) <= 0) { fo.mode = 0; fo.t = r.range(4, 9); } }
    else { fo.x += fo.dir * LA.foxV * dt; fo.a = toward(fo.a, 0, dt / LA.fade); if (fo.a <= 0) { fo.on = false; fo.wait = r.range(40, 90); } }
  }

  // Gulls stand along the pier's rail by day; at the boat they lift off and circle out over the
  // water away from it, and come back when it has gone.
  function gullStep(T, dt, b, h, r) {
    var want = hrs(T.hours, h);
    ga = toward(ga, want ? 1 : 0, dt / LA.fade);
    for (var i = 0; i < gn; i++) {
      var pp = T.perches[gper[i]];
      gph[i] += dt;
      if (gmode[i] === 0) {
        gx[i] = pp.x; gy[i] = pp.y;
        if (Math.abs(b.x - pp.x) < LA.gullR) { gmode[i] = 1; gt[i] = 0; gcx[i] = pp.x + sgn(pp.x - b.x) * (40 + i * 6); gang[i] = Math.PI; }
      } else if (gmode[i] === 1) {
        gt[i] += dt; gang[i] += dt * (0.9 + i * 0.15);
        var tx = gcx[i] + Math.cos(gang[i]) * 20, ty = 34 + i * 4 + Math.sin(gang[i]) * 5;
        gx[i] += (tx - gx[i]) * Math.min(1, dt * 1.5); gy[i] += (ty - gy[i]) * Math.min(1, dt * 1.5);
        if (gt[i] > 8 && Math.abs(b.x - pp.x) > LA.gullBack && want) { gmode[i] = 2; gt[i] = 0; }
      } else {
        gx[i] += (pp.x - gx[i]) * Math.min(1, dt * 1.2); gy[i] += (pp.y - gy[i]) * Math.min(1, dt * 1.2);
        if (Math.abs(b.x - pp.x) < LA.gullR) { gmode[i] = 1; gt[i] = 0; }
        else if (Math.abs(gx[i] - pp.x) < 0.5 && Math.abs(gy[i] - pp.y) < 0.5) gmode[i] = 0;
      }
    }
  }

  // What the birds and the frog put under the surface: the small things keep away from them too.
  function aboveThreats(run) {
    var cam = run.cam.x;
    if (dk.on && dk.under) addThreat(dk.x - cam * ab.T.ducks.p + cam, dk.dy, 16);
    if (ln.on && ln.mode === 1) addThreat(ln.ux - cam * ab.T.loon.p + cam, ln.uy, 18);
    if (hr.on && hr.reach > 0.5) addThreat(hr.x + hr.dir * 10, 3, 10);
    if (kf.on && kf.mode === 2) addThreat(kf.x, -kf.y, 8);
    if (fr.on && fr.mode === 2) addThreat(fr.ux, fr.uy, 8);
    for (var i = 0; i < cmn; i++) if (cmm[i] === 3) addThreat(cmx[i], cmy[i], 10);   // Phase 79
    for (i = 0; i < sen; i++) if (sem[i] === 2) addThreat(sex[i], 8, 18);
  }

  // ---- Drawing above the water ---------------------------------------------------------------
  function sp(c, x) { return Math.round(x * HI) / HI; }
  function px1(c, key, x, y, w, h) { c.fillStyle = P[key]; c.fillRect(Math.round(x * HI) / HI, Math.round(y * HI) / HI, w, h); }

  // Before the landmarks (parallax 1) layer: the birds further out than the boat (ducks, loon).
  function drawFar(c, camPx, wyS) {
    if (!ab.loc) return;
    var A = ab.T, surf = G.gfx.surface, i;
    if (dk.on && dk.a > 0) {
      var p = A.ducks.p, X = dk.x - camPx * p;
      if (X > -20 && X < 340) {
        var bob = surf.at(X + camPx) / HI, fd = duckFace(), d = duckArt(), y = youngArt();
        c.globalAlpha = dk.a;
        for (i = 0; i < yn; i++) img(c, y, 0, ydir[i] < 0, yx[i] - camPx * p, wyS - surf.at(yx[i] - camPx * p + camPx) / HI + 0.5 + Math.sin(yph[i] * 3) * 0.25);
        if (dk.mode !== 3 || dk.t < 0.4) img(c, d, dk.mode === 3 ? 1 : 0, fd < 0, X, wyS - bob + 1 + (dk.mode === 3 ? 0.5 : Math.sin(dk.ph * 2) * 0.25));
        c.globalAlpha = 1;
      }
    }
    if (ln.on && ln.a > 0 && ln.mode === 0) {
      var LX = ln.x - camPx * A.loon.p;
      if (LX > -20 && LX < 340) { c.globalAlpha = ln.a; img(c, loonArt(), 0, ln.dir < 0, LX, wyS - surf.at(LX + camPx) / HI + 1.5); c.globalAlpha = 1; }
    }
  }

  // After each painted layer: what lives on it (ox: that layer's scroll in world px).
  function afterLayer(c, id, ox, wyS) {
    if (!ab.loc) return;
    var A = ab.T, Ly = ab.layer[id], i;
    if (!Ly) return;
    if (A.deer && A.deer.layer === id && dr.on && dr.a > 0) {
      var ga_ = ab.mirror ? 1 - ab.ghost : 1, frame = dr.mode === 1 ? 1 : (dr.mode === 0 || dr.mode === 3 ? (Math.floor(dr.ph * 3) & 1 ? 2 : 0) : 0);
      if (ga_ > 0.01) { c.globalAlpha = dr.a * ga_; img(c, deerArt(), frame, dr.dir < 0, dr.x - ox, wyS - (Ly.height || 4) + 1.5); c.globalAlpha = 1; }
    }
    if (A.moose && A.moose.layer === id && mo.on && mo.a > 0) {                      // Phase 83: the moose, its legs in the water as it wades
      var mf = mo.mode === 1 ? 1 : (mo.mode === 0 || mo.mode === 3 ? (Math.floor(mo.ph * 2) & 1 ? 2 : 0) : 0);
      c.globalAlpha = mo.a; img(c, mooseArt(), mf, mo.dir < 0, mo.x - ox, wyS - (Ly.height || 4) + 1.5 + mo.wade * LA.mooseWade); c.globalAlpha = 1;
    }
    if (A.beaver && A.beaver.layer === id && bv.on) drawBeaver(c, bv.x - ox, wyS, bv);
    if (A.hare && A.hare.layer === id && haA > 0) {                               // Phase 82: the hares
      var HA = hareArt();
      for (i = 0; i < han; i++) { if (haa[i] <= 0) continue; c.globalAlpha = haA * haa[i]; img(c, HA, ham[i] ? (Math.floor(haph[i] * 8) & 1) : 0, hadir[i] < 0, hax[i] - ox, wyS - (Ly.height || 4) + 1.5 - (ham[i] ? Math.abs(Math.sin(haph[i] * 12)) * 1.5 : 0)); }
      c.globalAlpha = 1;
    }
    if (A.fox && A.fox.layer === id && fo.on && fo.a > 0) {
      c.globalAlpha = fo.a;
      img(c, A.fox.white ? foxWhiteArt() : foxArt(), fo.mode === 1 ? 2 : (Math.floor(fo.ph * 6) & 1), fo.dir < 0, fo.x - ox, wyS - (ab.loc.waterY - Ly.base) - 0.5);
      c.globalAlpha = 1;
    }
    // A moored boat's lantern at night (its glow reflects with the rest of the layer).
    var nf = G.scene.sailing.light(ab.h).night;
    if (nf > 0.05) for (i = 0; i < ab.moored.length; i++) {
      var m = ab.moored[i];
      if (m.p !== Ly.parallax) continue;
      var lx = m.x + 5 - ox, ly = wyS - 10.5, fl = 0.85 + 0.15 * ((S.hash(i + 3, Math.floor(G.state.run.boat.t * 6)) & 3) / 3);
      if (lx < -8 || lx > 328) continue;
      c.globalAlpha = 0.14 * nf * fl; c.fillStyle = P.lamp_glow; c.fillRect(sp(c, lx - 3), sp(c, ly - 2.5), 7.5, 6);
      c.globalAlpha = nf * fl; c.fillRect(sp(c, lx), sp(c, ly), 1.5, 1);
      c.globalAlpha = 1;
    }
    if (Ly.kind === 'landmarks') drawNear(c, ox, wyS);
  }

  function drawBeaver(c, X, wyS, B) {
    B = B || bv;
    if (X < -20 || X > 340) return;
    var y = wyS - 1;
    if (B.mode === 0) {
      c.globalAlpha = 0.5; c.fillStyle = P.water_foam;
      for (var s = 1; s <= 12; s++) { var bx = X - B.dir * (2 + s), off = s * 0.28; c.fillRect(sp(c, bx), sp(c, y + 1 - off * 0.2), 0.5, 0.5); c.fillRect(sp(c, bx), sp(c, y + 1 + off * 0.45), 0.5, 0.5); }
      c.globalAlpha = 1;
      px1(c, 'umber_dark', X - 2, y - 0.5, 4, 1.5); px1(c, 'umber', X - 1.5 + B.dir * 0.5, y - 1, 3, 0.5);
      px1(c, 'ink', X + B.dir * 1.5, y - 0.5, 0.5, 0.5);
    } else if (B.t < 0.35) {
      px1(c, 'umber_dark', X - B.dir * 1.5, y - 2 + B.t * 4, 1.5, 2); // the tail goes up and over
      c.globalAlpha = 0.6; px1(c, 'water_foam', X - 3, y + 0.5, 6, 0.5); c.globalAlpha = 1;
    }
  }

  // After the landmarks: the heron, the kingfisher, the gulls, the dragonflies (all at parallax 1).
  function drawNear(c, camPx, wyS) {
    var i;
    if (rvn && rva > 0) {                                                        // Phase 82: the ravens
      var RV = ravenArt();
      c.globalAlpha = rva;
      for (i = 0; i < rvn; i++) { var RX = rvx_[i] - camPx; if (RX > -12 && RX < 332) img(c, RV, Math.floor(rvph[i] * 3) & 1, rvdir[i] < 0, RX, wyS - rvy[i]); }
      c.globalAlpha = 1;
    }
    if (en && ea > 0) {                                                          // Phase 77: the eagles, high up
      var E = eagleArt();
      c.globalAlpha = ea;
      for (i = 0; i < en; i++) {
        var EX = eagleX(i) - camPx;
        if (EX < -12 || EX > 332) continue;
        img(c, E, (eph[i] % 7) < 0.5 && (Math.floor(eph[i] * 6) & 1) ? 1 : 0, -Math.sin(eang[i]) * ew[i] < 0, EX, wyS - eagleY(i));
      }
      c.globalAlpha = 1;
    }
    if (otn && ota > 0) {                                                        // Phase 78: the otters
      var OT = otterArt(), OS = otterSitArt(), surf = G.gfx.surface;
      c.globalAlpha = ota;
      for (i = 0; i < otn; i++) {
        if (otm[i] === 1) continue;
        var TX = otx[i] - camPx;
        if (TX < -10 || TX > 330) continue;
        if (otm[i] === 2) { otterLogXY(i, olog); img(c, OS, (Math.floor(otph[i] / 2.5) & 1), otdir[i] < 0, olog[0] - camPx, wyS - olog[1]); continue; }
        var wyO = wyS - surf.at(otx[i]) / HI + 1.5, arch = otph[i] < 0.3;
        if (!arch) { c.fillStyle = P.water_foam; c.globalAlpha = ota * 0.45; for (var sw = 1; sw <= 8; sw++) { var wx = TX - otdir[i] * (2 + sw); c.fillRect(sp(c, wx), sp(c, wyO - 0.5 - sw * 0.06), 0.5, 0.5); c.fillRect(sp(c, wx), sp(c, wyO + sw * 0.12), 0.5, 0.5); } c.globalAlpha = ota; }
        img(c, OT, arch ? 1 : 0, otdir[i] < 0, TX, wyO);
      }
      c.globalAlpha = 1;
    }
    if (os.on && os.a > 0 && os.mode !== 4) {                                    // Phase 77: the osprey
      var O = ospreyArt(), OX = os.x - camPx, of = os.mode === 0 ? 0 : (os.mode === 3 ? 3 : (Math.floor(os.ph * (os.mode === 2 ? 12 : 6)) & 1 ? 1 : 2));
      if (OX > -12 && OX < 332) {
        c.globalAlpha = os.a;
        img(c, O, of, os.dir < 0, OX, wyS - os.y);
        if (os.fish > 0 && os.mode !== 0) px1(c, 'stone_hi', OX - 1, wyS - os.y + 0.5, 3, 0.5); // a fish in its feet
        c.globalAlpha = 1;
      }
    }
    if (sen && sea_ > 0) {                                                       // Phase 79: the seals
      var SO = sealArt(), SH = sealHeadArt(), sf = G.gfx.surface;
      c.globalAlpha = sea_;
      for (i = 0; i < sen; i++) {
        var SX = sex[i] - camPx;
        if (sem[i] === 2 || SX < -12 || SX > 332) continue;
        if (sem[i] === 0) img(c, SO, (Math.floor(seph[i] / 4) % 3) === 1 ? 1 : 0, sedir[i] < 0, SX, wyS - ab.T.seal.spots[sespot[i]].y);
        else img(c, SH, Math.floor(seph[i] / 1.6) & 1, sedir[i] < 0, SX, wyS - sf.at(sex[i]) / HI + 1.5);
      }
      c.globalAlpha = 1;
    }
    if (cmn && cma > 0) {                                                        // Phase 79: the cormorants
      var CP = cormArt(), CF = cormFlyArt(), CS = cormSwimArt(), sf2 = G.gfx.surface;
      c.globalAlpha = cma;
      for (i = 0; i < cmn; i++) {
        var CX = cmx[i] - camPx;
        if (cmm[i] === 3 || CX < -12 || CX > 332) continue;
        if (cmm[i] === 0) img(c, CP, cmwing[i] > 0 ? 1 : 0, cmdir[i] < 0, CX, wyS - cmy[i]);
        else if (cmm[i] === 2) img(c, CS, (Math.floor(cmph[i] / 3) & 1), cmdir[i] < 0, CX, wyS - sf2.at(cmx[i]) / HI + 1.5);
        else img(c, CF, Math.floor(cmph[i] * 7) & 1, cmdir[i] < 0, CX, wyS - cmy[i] - 1);
      }
      c.globalAlpha = 1;
    }
    if (hr.on && hr.a > 0) drawHeron(c, camPx, wyS, false);
    if (kf.on && kf.a > 0 && kf.mode !== 2) {
      var K = kingArt(), kfr = kf.mode === 0 ? 0 : (Math.floor(kf.ph * 14) & 1 ? 1 : 2);
      c.globalAlpha = kf.a;
      img(c, K, kfr, kf.dir < 0, kf.x - camPx, wyS - kf.y + (kf.mode === 0 ? 0 : 1.5));
      if (kf.fish > 0 && kf.mode === 0) px1(c, 'water_foam', kf.x - camPx + kf.dir * 3, wyS - kf.y - 2, 1, 0.5);
      c.globalAlpha = 1;
    }
    if (gn && ga > 0) {
      var Gs = gullArt();
      c.globalAlpha = ga;
      for (i = 0; i < gn; i++) {
        var fly = gmode[i] !== 0 || Math.abs(gx[i] - ab.T.gulls.perches[gper[i]].x) > 0.5;
        var gpx = ab.T.gulls.perches[gper[i]].x, left = gmode[i] === 1 ? Math.sin(gang[i]) > 0 : (gmode[i] === 2 ? gpx < gx[i] : (Math.floor(gph[i] / 3) & 1) === 1);
        img(c, Gs, fly ? (Math.floor(gph[i] * 5) & 1 ? 1 : 2) : 0, left, gx[i] - camPx, wyS - gy[i]);
      }
      c.globalAlpha = 1;
    }
    if (dfn && dfa > 0) {
      for (i = 0; i < dfn; i++) {
        var X = dfx[i] - camPx, Y = wyS - dfy[i], fl = (Math.floor(G.state.run.boat.t * 30 + i) & 1);
        if (X < -2 || X > 322) continue;
        dragonfly(c, X, Y, fl, dfa);
      }
      c.globalAlpha = 1;
    }
  }

  // A dragonfly (its wings flicker with fl) at alpha a, and a pond skater on the surface at y.
  function dragonfly(c, X, Y, fl, a) {
    c.globalAlpha = a; px1(c, 'teal_hi', X - 1, Y, 2, 0.5);
    c.globalAlpha = a * 0.5; px1(c, 'paper', X - 0.5, Y - (fl ? 0.5 : 0), 1, 0.5);
  }
  function strider(c, RX, ry) {
    px1(c, 'ink', RX - 0.5, ry, 1, 0.5);
    c.fillStyle = P.stone_dark;
    c.fillRect(sp(c, RX - 1.5), sp(c, ry + 0.5), 0.5, 0.5); c.fillRect(sp(c, RX + 1), sp(c, ry + 0.5), 0.5, 0.5);
    c.fillRect(sp(c, RX - 1), sp(c, ry - 0.5), 0.5, 0.5); c.fillRect(sp(c, RX + 0.5), sp(c, ry - 0.5), 0.5, 0.5);
  }

  // The heron: legs into the water, the body, and the neck as a curve from the shoulder to the
  // head (rest, stalk, strike), drawn above the water here and below it in drawUnder (under).
  var NECK = new Float32Array(2 * 64);
  function heronNeck(camPx, wyS, H) {
    var x = H.x - camPx, d = H.dir, k = H.mode === 1 ? 0.35 : 0, rr = H.reach, idle = H.mode === 0 ? Math.sin(H.ph * 0.7) * 0.4 : 0;
    var sx = x + d * 3, sy = wyS - 13 - H.lift;
    var hx0 = x + d * (2.5 + k * 3 + idle), hy0 = wyS - 21.5 + k * 3 - H.lift, cx0 = x - d * 0.5, cy0 = wyS - 17 - H.lift;
    var hx = hx0 + (x + d * 9 - hx0) * rr, hy = hy0 + (wyS + 2.5 - hy0) * rr, cx = cx0 + (x + d * 9 - cx0) * rr, cy = cy0 + (wyS - 13 - cy0) * rr;
    if (H.mode === 3) { hx = x + d * 4; hy = wyS - 15 - H.lift; cx = x + d * 1; cy = wyS - 17 - H.lift; } // tucked in flight
    var len = Math.abs(hx - sx) + Math.abs(hy - sy), n = Math.min(63, Math.ceil(len * HI) + 1);
    for (var i = 0; i <= n; i++) {
      var u = i / n, a = (1 - u) * (1 - u), b2 = 2 * u * (1 - u), c2 = u * u;
      NECK[2 * i] = a * sx + b2 * cx + c2 * hx; NECK[2 * i + 1] = a * sy + b2 * cy + c2 * hy;
    }
    return n;
  }
  function drawHeron(c, camPx, wyS, under, H) {
    H = H || hr;
    var x = H.x - camPx, d = H.dir, i, n;
    if (x < -30 || x > 350) return;
    c.globalAlpha = (under ? 0.8 : 1) * H.a;
    // Legs: wading, stepping while it stalks; trailing behind in flight.
    var st = H.mode === 1 ? Math.sin(H.ph * 6) * 1 : 0;
    for (var l = 0; l < 2; l++) {
      var lx = x + (l ? 1 : -1) * 0.75, fx = lx + (l ? st : -st);
      for (var yy = 0; yy < 12; yy += 0.5) {
        var Y = wyS - 9 + yy, X = lx + (fx - lx) * yy / 12;
        if (H.mode === 3) { X = x - d * (2 + yy * 0.8); Y = wyS - 10 - H.lift + yy * 0.1; }
        if (under ? Y < wyS : Y >= wyS) continue;
        px1(c, 'stone_dark', X, Y, 0.5, 0.5);
      }
    }
    if (!under) {
      img(c, heronBodyArt(), 0, d < 0, x - d * 1, wyS - 8 - H.lift);
      if (H.mode === 3) { var up = Math.floor(H.ph * 4) & 1; px1(c, 'stone', x - 5, wyS - 14 - H.lift + (up ? -3 : 1), 10, 1.5); } // a slow wingbeat
    }
    n = heronNeck(camPx, wyS, H);
    for (i = 0; i <= n; i++) {
      var NX = NECK[2 * i], NY = NECK[2 * i + 1];
      if (under ? NY < wyS : NY >= wyS) continue;
      px1(c, 'stone_hi', NX, NY, 0.5, 1); px1(c, 'stone', NX - d * 0.5, NY, 0.5, 1);
    }
    // The head and the beak, pointing along the neck's end.
    var hx = NECK[2 * n], hy = NECK[2 * n + 1], tx = hx - NECK[2 * n - 2], ty = hy - NECK[2 * n - 1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
    tx /= tl; ty /= tl;
    if (H.reach < 0.2 && H.mode !== 3) { tx = d; ty = 0.15; }
    if (under ? hy >= wyS - 1 : hy < wyS) {
      px1(c, 'stone_hi', hx - 1, hy - 1, 2, 1.5);
      px1(c, 'ink', hx - d * 1.5, hy - 1, 1.5, 0.5);
      px1(c, 'ink', hx + d * 0.25, hy - 0.5, 0.5, 0.5);
    }
    for (var s = 0; s < 8; s++) {
      var bx = hx + tx * (1 + s * 0.5), by = hy - 0.5 + ty * (1 + s * 0.5);
      if (under ? by < wyS : by >= wyS) continue;
      px1(c, 'brass_hi', bx, by, 0.5, 0.5);
    }
    if (H.fish > 0 && !under && hy < wyS) px1(c, 'water_foam', hx + tx * 3, hy + ty * 3 - 0.5, 1, 0.5); // a fry in its beak
    c.globalAlpha = 1;
  }

  // On the surface, after the water's line: the lily pads (the cross-section's lilies seen from
  // above), the frog on its pad, the striders.
  function drawSurface(c, camPx, camPy) {
    if (!ab.loc) return;
    var wyS = ab.loc.waterY - camPy, surf = G.gfx.surface, L_ = ab.lilies, i;
    for (i = 0; i < L_.length; i++) {
      var X = L_[i].x - camPx, hw = L_[i].w / 2;
      if (X < -10 || X > 330) continue;
      var y = wyS - surf.at(L_[i].x) / HI;
      px1(c, 'moss_dark', X - hw, y - 0.5, hw * 2, 1); px1(c, 'moss', X - hw + 0.5, y - 0.5, hw * 2 - 1.5, 0.5);
      px1(c, 'moss_dark', X + 1, y - 0.5, 0.5, 0.5);
    }
    if (fr.on && fr.mode < 2 && fr.a > 0) {
      c.globalAlpha = fr.a;
      img(c, frogArt(), fr.mode === 1 ? 1 : 0, fr.dir < 0, fr.x - camPx, wyS - surf.at(fr.x) / HI - 0.5 - fr.h);
      if (fr.mode === 0 && (Math.floor(fr.ph * 1.3) % 4) === 0) px1(c, 'moss_hi', fr.x - camPx + 0.5, wyS - surf.at(fr.x) / HI - 1, 1, 0.5); // its throat
      c.globalAlpha = 1;
    }
    if (rn && ra > 0) {
      c.globalAlpha = ra;
      for (i = 0; i < rn; i++) {
        var RX = rx_[i] - camPx;
        if (RX < -2 || RX > 322) continue;
        strider(c, RX, wyS - surf.at(rx_[i]) / HI - 0.5);
      }
      c.globalAlpha = 1;
    }
  }

  // Under the surface, in the cross-section: the heron's beak and legs, the diving hen, the
  // loon swimming under, the kingfisher's moment under, the frog swimming down.
  function drawUnder(c, camPx, wyS, alpha) {
    if (!ab.loc) return;
    var A = ab.T;
    if (hr.on && hr.a > 0 && hr.mode !== 3) drawHeron(c, camPx, wyS, true);
    c.globalAlpha = alpha * 0.9;
    if (dk.on && dk.under) img(c, duckUnderArt(), Math.floor(dk.ph * 6) & 1, dk.dvx < 0, dk.x - camPx * A.ducks.p, wyS + dk.dy + 2);
    if (ln.on && ln.mode === 1) img(c, loonArt(), 1, ln.uvx < 0, ln.ux - camPx * A.loon.p, wyS + ln.uy + 2);
    if (kf.on && kf.mode === 2) img(c, kingArt(), 1, kf.dir < 0, kf.x - camPx, wyS - kf.y + 1);
    if (fr.on && fr.mode === 2) img(c, frogArt(), 1, fr.dir < 0, fr.ux - camPx, wyS + fr.uy + 1);
    for (var i = 0; i < cmn; i++) if (cmm[i] === 3) img(c, cormFlyArt(), 1, cmuvx[i] < 0, cmx[i] - camPx, wyS + cmy[i] + 2);   // Phase 79
    for (i = 0; i < sen; i++) if (sem[i] === 2) img(c, sealSwimArt(), Math.floor(seph[i] * 3) & 1, setx[i] < sex[i], sex[i] - camPx, wyS + 10);
    c.globalAlpha = alpha;
  }

  // Phase 77: which creatures live in each reach of this water (dbg.life(), dbg.lifeAbove()):
  // from each one's range in the table (x, perches, the lodge, the osprey's nest), a layer's x
  // put back into world px as seen with the boat at the middle of the view.
  function byReach() {
    var o = {}, loc = ab.loc, A = ab.T, R = (loc && loc.reaches) || [], i, k;
    if (!loc) return o;
    for (i = 0; i < R.length; i++) o[R[i].name] = [];
    function world(x, p) { return p >= 1 ? x : (x - 160 * (1 - p)) / p; }
    function put(name, x0, x1) { for (var q = 0; q < R.length; q++) if (x0 < R[q].x[1] && x1 >= R[q].x[0] && o[R[q].name].indexOf(name) < 0) o[R[q].name].push(name); }
    for (k in A) {
      var c = A[k], p = c.layer && ab.layer[c.layer] ? ab.layer[c.layer].parallax : (c.p || 1), j;
      if (k === 'beaver') { if (ab.lodge >= 0) put(k, world(ab.lodge, p) - 40, world(ab.lodge, p) + 40); continue; }
      if (k === 'osprey') { if (os.nx >= 0) put(k, Math.min(os.nx, c.x[0]), Math.max(os.nx, c.x[1])); continue; }
      if (c.x) { var xs = Array.isArray(c.x[0]) ? c.x : [c.x]; for (j = 0; j < xs.length; j++) put(k, world(xs[j][0], p), world(xs[j][1], p)); }
      else if (c.perches) for (j = 0; j < c.perches.length; j++) put(k, c.perches[j].x, c.perches[j].x);
      if (c.spots) for (j = 0; j < c.spots.length; j++) put(k, c.spots[j].x, c.spots[j].x); // Phase 79: the seals' rocks
      else put(k, 0, loc.width);                                                   // the whole water (the frog's lilies, ...)
    }
    return o;
  }

  // dbg.lifeAbove(): who is out above the water now, and what they are doing.
  function aboveState() {
    var A = ab.T, o = { loc: ab.loc ? ab.loc.id : '', hour: +ab.h.toFixed(2), lim: +ab.lim.toFixed(2), touches: { ducksFace: dk.on && dk.mode === 4, heronStill: hr.on && hr.mode === 5, deerNoReflection: +ab.ghost.toFixed(2) }, acts: acts };
    var cam = G.state.run.cam ? G.state.run.cam.x : 0, bx = G.state.run.boat ? G.state.run.boat.x : 0;
    function scr(x, p) { return +(x - cam * p - (bx - cam)).toFixed(1); } // px from the boat on screen
    if (A.ducks) o.ducks = dk.on ? { a: +dk.a.toFixed(2), x: +dk.x.toFixed(1), fromBoat: scr(dk.x, A.ducks.p), mode: ['paddle', 'flee', 'pass', 'dive', 'face'][dk.mode], under: dk.under, depth: +dk.dy.toFixed(1), young: yn, faced: dk.faced, dirs: Array.prototype.slice.call(ydir, 0, yn).concat([duckFace()]) } : null;
    if (A.heron) o.heron = hr.on ? { a: +hr.a.toFixed(2), x: +hr.x.toFixed(1), fromBoat: scr(hr.x, 1), mode: ['stand', 'stalk', 'strike', 'fly', '', 'still'][hr.mode], reach: +hr.reach.toFixed(2), fish: hr.fish > 0 } : null;
    if (A.kingfisher) o.kingfisher = kf.on ? { a: +kf.a.toFixed(2), x: +kf.x.toFixed(1), y: +kf.y.toFixed(1), fromBoat: scr(kf.x, 1), mode: ['perch', 'dive', 'under', 'up', 'fly'][kf.mode], perch: kf.i } : null;
    if (A.loon) o.loon = ln.on ? { a: +ln.a.toFixed(2), x: +(ln.mode ? ln.ux : ln.x).toFixed(1), fromBoat: scr(ln.mode ? ln.ux : ln.x, A.loon.p), mode: ln.mode ? 'under' : 'swim', depth: +ln.uy.toFixed(1) } : null;
    if (A.dragonflies) o.dragonflies = { n: dfn, a: +dfa.toFixed(2) };
    if (A.frog) o.frog = fr.on ? { a: +fr.a.toFixed(2), x: +fr.x.toFixed(1), fromBoat: scr(fr.x, 1), mode: ['sit', 'jump', 'under'][fr.mode], pads: ab.lilies.length } : { pads: ab.lilies.length };
    if (A.striders) o.striders = { n: rn, a: +ra.toFixed(2) };
    if (A.moose) o.moose = mo.on ? { a: +mo.a.toFixed(2), x: +mo.x.toFixed(1), fromBoat: scr(mo.x, ab.layer[A.moose.layer].parallax), mode: ['walk', 'eat', 'look', 'leave'][mo.mode], wade: +mo.wade.toFixed(2) } : null; // Phase 83
    if (A.deer) o.deer = dr.on ? { a: +dr.a.toFixed(2), x: +dr.x.toFixed(1), fromBoat: scr(dr.x, ab.layer[A.deer.layer].parallax), mode: ['walk', 'drink', 'look', 'leave'][dr.mode] } : null;
    if (A.beaver) o.beaver = bv.on ? { x: +bv.x.toFixed(1), lodge: ab.lodge, fromBoat: scr(bv.x, ab.layer[A.beaver.layer].parallax), mode: bv.mode ? (bv.slap ? 'slap' : 'dive') : 'swim' } : { lodge: ab.lodge };
    if (A.fox) o.fox = fo.on ? { a: +fo.a.toFixed(2), x: +fo.x.toFixed(1), mode: ['trot', 'sit', 'leave'][fo.mode] } : null;
    if (A.osprey) o.osprey = os.on ? { a: +os.a.toFixed(2), x: +os.x.toFixed(1), y: +os.y.toFixed(1), fromBoat: scr(os.x, 1), mode: ['perch', 'out', 'hover', 'stoop', 'under', 'climb', 'home'][os.mode], fish: os.fish > 0, nest: [os.nx, os.ny] } : { nest: [os.nx, os.ny] };
    if (A.eagle) { o.eagle = { a: +ea.toFixed(2), birds: [] }; for (var e = 0; e < en; e++) o.eagle.birds.push({ x: +eagleX(e).toFixed(1), y: +eagleY(e).toFixed(1), fromBoat: scr(eagleX(e), 1) }); }
    if (A.otter) { o.otter = { a: +ota.toFixed(2), log: otLog ? otLog.id : '', otters: [] }; for (var q = 0; q < otn; q++) o.otter.otters.push({ x: +otx[q].toFixed(1), fromBoat: scr(otx[q], 1), mode: ['swim', 'under', 'log'][otm[q]] }); }
    if (A.seal) { o.seal = { a: +sea_.toFixed(2), seals: [] }; for (var sI = 0; sI < sen; sI++) o.seal.seals.push({ x: +sex[sI].toFixed(1), fromBoat: scr(sex[sI], 1), mode: ['out', 'up', 'under'][sem[sI]], spot: sespot[sI] }); }
    if (A.cormorant) { o.cormorant = { a: +cma.toFixed(2), birds: [] }; for (var cI = 0; cI < cmn; cI++) o.cormorant.birds.push({ x: +cmx[cI].toFixed(1), y: +cmy[cI].toFixed(1), fromBoat: scr(cmx[cI], 1), mode: ['perch', 'out', 'swim', 'under', 'home'][cmm[cI]], wings: cmwing[cI] > 0 && cmm[cI] === 0 }); }
    if (A.hare) { o.hare = { a: +haA.toFixed(2), hares: [] }; for (var hI = 0; hI < han; hI++) o.hare.hares.push({ x: +hax[hI].toFixed(1), mode: ['sit', 'hop', 'off'][ham[hI]], seen: +haa[hI].toFixed(2) }); } // Phase 82
    if (A.raven) { o.raven = { a: +rva.toFixed(2), birds: [] }; for (var rI = 0; rI < rvn; rI++) o.raven.birds.push({ x: +rvx_[rI].toFixed(1), y: +rvy[rI].toFixed(1), fromBoat: scr(rvx_[rI], 1) }); }
    o.reaches = byReach();
    if (A.gulls) { o.gulls = { a: +ga.toFixed(2), birds: [] }; for (var i = 0; i < gn; i++) o.gulls.birds.push({ x: +gx[i].toFixed(1), y: +gy[i].toFixed(1), fromBoat: scr(gx[i], 1), mode: ['sit', 'fly', 'back'][gmode[i]] }); }
    return o;
  }
  // Who is out (seen at all) now: the names of the creatures with a > 0. dbg and the checks.
  function showing() {
    var o = [];
    if (dk.on && dk.a > 0) o.push('ducks'); if (hr.on && hr.a > 0) o.push('heron'); if (kf.on && kf.a > 0) o.push('kingfisher');
    if (ln.on && ln.a > 0) o.push('loon'); if (dfn && dfa > 0) o.push('dragonflies'); if (fr.on && fr.a > 0) o.push('frog');
    if (rn && ra > 0) o.push('striders'); if (dr.on && dr.a > 0) o.push('deer'); if (bv.on) o.push('beaver'); if (fo.on && fo.a > 0) o.push('fox'); if (gn && ga > 0) o.push('gulls');
    if (os.on && os.a > 0) o.push('osprey'); if (en && ea > 0) o.push('eagle'); // Phase 77
    if (otn && ota > 0) o.push('otter');                                         // Phase 78
    if (sen && sea_ > 0) o.push('seal'); if (cmn && cma > 0) o.push('cormorant'); // Phase 79
    if (mo.on && mo.a > 0) o.push('moose');                                       // Phase 83
    if (han && haA > 0) o.push('hare'); if (rvn && rva > 0) o.push('raven');     // Phase 82
    return o;
  }
  // dbg.lifeSpawn for the life above: brings one on now, or makes it act now. False if it cannot.
  function spawnAbove(kind) {
    var A = ab.T, b = G.state.run.boat;
    if (kind === 'strike') { if (!hr.on || hr.mode > 1) return false; hr.mode = 2; hr.t = 0; hr.struck = false; hr.a = 1; return true; }
    if (kind === 'duckdive') { if (!dk.on || dk.mode !== 0) return false; dk.t = 0; return true; }
    if (kind === 'loondive') { if (!ln.on || ln.mode !== 0) return false; ln.dive = 0; return true; }
    if (kind === 'call') { if (!A.loon) return false; G.audio.engine.cue('loon', b.x); acts.calls++; return true; }
    if (kind === 'kingdive') { if (!kf.on || kf.mode !== 0) return false; kf.t = 0; return true; }
    if (kind === 'osprey') { if (!A.osprey || os.nx < 0) return false; if (!os.on) { os.wait = 0; return hrs(A.osprey.hours, ab.h); } return true; }
    if (kind === 'ospreydive') { if (!os.on || os.mode !== 0) return false; os.t = 0; os.a = 1; return true; } // Phase 77: out to fish now
    if (kind === 'eagle') { if (!en) return false; ea = 1; return true; }
    if (kind === 'otter') { if (!otn) return false; ota = 1; return true; }                                     // Phase 78
    if (kind === 'otterlog') { if (!otn || !otLog) return false; otlt[0] = 0.6; otm[0] = 2; ott[0] = 30; ota = 1; otterLogXY(0, olog); otx[0] = olog[0]; return true; }
    if (kind === 'seal') { if (!sen) return false; sea_ = 1; return true; }                                   // Phase 79
    if (kind === 'sealin') { for (var si = 0; si < sen; si++) if (sem[si] === 0) { set_[si] = 0; return true; } return false; }
    if (kind === 'cormorant') { if (!cmn) return false; cma = 1; return true; }
    if (kind === 'hare') { if (!han) return false; haA = 1; for (var hi = 0; hi < han; hi++) haa[hi] = 1; return true; }   // Phase 82
    if (kind === 'raven') { if (!rvn) return false; rva = 1; return true; }
    if (kind === 'cormdive') { for (var ci = 0; ci < cmn; ci++) if (cmm[ci] === 2) { cmt[ci] = 0; return true; } for (ci = 0; ci < cmn; ci++) if (cmm[ci] === 0) { cmt[ci] = 0; cma = 1; return true; } return false; }
    var map = { ducks: dk, heron: hr, kingfisher: kf, loon: ln, frog: fr, deer: dr, beaver: bv, fox: fo, moose: mo };
    if (map[kind] && A[kind] && !map[kind].on) { map[kind].wait = 0; return hrs(A[kind].hours, ab.h) || (kind === 'heron' && ab.lim > 0.5 && ab.night); }
    return false;
  }

  // dbg.life(): what lives here now.
  function state() {
    var out = { loc: locId, cray: [], snails: [], clouds: [], dart: dart.on ? { x: +dart.x.toFixed(1), y: +dart.y.toFixed(1) } : null,
      turtle: turtle.on ? { x: +turtle.x.toFixed(1), y: +turtle.y.toFixed(1) } : null, eel: eel.on ? { x: +eel.x.toFixed(1), y: +eel.y.toFixed(1) } : null,
      reaches: byReach(), silt: sn, threats: tn, lastReact: +react.lastDelay.toFixed(3), waits: { dart: +dart.wait.toFixed(1), turtle: +turtle.wait.toFixed(1), eel: +eel.wait.toFixed(1) }, ms: +stats.ms.toFixed(3), bedMs: +stats.bedMs.toFixed(3), waterMs: +stats.waterMs.toFixed(3) };
    for (var i = 0; i < cn; i++) out.cray.push({ x: +cxs[i].toFixed(1), y: +cys[i].toFixed(1), mode: ['walk', 'rest', 'back'][cmode[i]], dir: cdir[i], react: creact[i] >= 0 ? +creact[i].toFixed(3) : -1 });
    for (i = 0; i < nn; i++) out.snails.push({ x: +nx[i].toFixed(1), y: +ny[i].toFixed(1), hidden: nhide[i] > 0 });
    out.kinds = { walkers: crabs ? 'crab' : 'cray', climbers: stars ? 'star' : 'snail' }; // Phase 79
    out.flats = []; out.flatLifts = flLifts;
    for (i = 0; i < fln; i++) out.flats.push({ x: +flx[i].toFixed(1), mode: ['lie', 'glide', 'settle'][flm[i]] });
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

  // ---- Phase 50.1: for the gallery ---------------------------------------------------------
  // Every sprite baked (by name: {w, h, cv, fl}), and the drawn-in-code creatures posed from
  // the gallery's own scratch records, never the live ones. World px, the ctx at the view's scale.
  var ARTS = [mooseArt, hareArt, ravenArt, foxWhiteArt, crayArt, snailArt, turtleArt, tadArt, crabArt, starArt, sealArt, sealHeadArt, sealSwimArt, cormArt, cormFlyArt, cormSwimArt, duckArt, youngArt, duckUnderArt, heronBodyArt, kingArt, loonArt, frogArt, deerArt, foxArt, gullArt, ospreyArt, eagleArt, otterArt, otterSitArt];
  function sprites() { for (var i = 0; i < ARTS.length; i++) ARTS[i](); return spr; }
  var gH = { x: 0, dir: 1, mode: 0, reach: 0, ph: 0, lift: 0, a: 1, fish: 0 }, gB = { dir: 1, mode: 0, t: 0 };
  var gEx = new Float32Array(EELN), gEy = new Float32Array(EELN);
  var gallery = {
    // mode: 0 stand, 1 stalk, 2 strike (reach 0..1), 3 fly; under: the part below the surface.
    heron: function (c, x, wyS, mode, reach, ph, under) {
      gH.x = x; gH.mode = mode; gH.reach = reach; gH.ph = ph; gH.lift = mode === 3 ? 6 : 0; gH.fish = mode === 2 && reach > 0.9 ? 1 : 0;
      drawHeron(c, 0, wyS, !!under, gH);
    },
    beaver: function (c, x, wyS, mode, t) { gB.mode = mode; gB.t = t; drawBeaver(c, x, wyS, gB); },
    eel: function (c, x, y, dir, ph) {
      for (var i = 0; i < EELN; i++) { gEx[i] = x - dir * i * L.eelLen / EELN; gEy[i] = y + Math.sin(ph - i * 0.55) * (0.4 + i * 0.12); }
      drawEel(c, gEx, gEy, dir, 0, 0);
    },
    dragonfly: function (c, x, y, fl) { dragonfly(c, x, y, fl, 1); c.globalAlpha = 1; },
    strider: strider
  };

  return { table: table, L: L, LA: LA, step: step, drawBed: drawBed, drawWater: drawWater, spawn: function (k) { return spawn(k) || spawnAbove(k); }, state: state, fry: fry, stats: stats, onSplash: onSplash,
    // Phase 49: the life above the water.
    drawFar: drawFar, afterLayer: afterLayer, drawSurface: drawSurface, above: aboveState, showing: showing, hrs: hrs,
    mirror: function (on) { ab.mirror = on; },
    sprites: sprites, gallery: gallery }; // Phase 50.1
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var s = G.scene.life.state();
  if (!s.loc) return 'life: -';
  var back = 0; for (var i = 0; i < s.cray.length; i++) if (s.cray[i].mode === 'back') back++;
  return 'life cray ' + s.cray.length + (back ? ' (' + back + ' back)' : '') + '  snails ' + s.snails.length + '  clouds ' + s.clouds.length + '  silt ' + s.silt +
    (s.dart ? '  DART' : '') + (s.turtle ? '  TURTLE' : '') + (s.eel ? '  EEL' : '') + '  ' + s.ms.toFixed(2) + ' ms';
});
// Phase 49: who is out above the water, and the liminal touches.
if (G.core.debug) G.core.debug.addLine(function () {
  var a = G.scene.life.above(), on = G.scene.life.showing();
  if (!a.loc) return 'above: -';
  var t = a.touches;
  return 'above ' + (on.length ? on.join(' ') : 'nobody') + (a.heron ? '  heron ' + a.heron.mode : '') + (a.ducks ? '  ducks ' + a.ducks.mode : '') +
    '  lim ' + a.lim.toFixed(2) + (t.ducksFace ? '  FACE' : '') + (t.heronStill ? '  STILL' : '') + (t.deerNoReflection > 0 ? '  NO-REFLECTION ' + t.deerNoReflection : '');
});
