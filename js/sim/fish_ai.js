var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish AI (V3.4). Two halves:
//  - speciesWeights / pickSpecies: which species turns up, from the water × bait or lure ×
//    depth × hour (Phase 68: no rarity, unease or clock window). Species heavier than the rod can hold are never picked;
//    they only set ctx.tooHeavyNear so the scene can hint at them (D4).
//  - the spatial school: up to 8 fish that wander, notice the lure, approach, circle it,
//    nibble, then bite or leave.
// Pure: no DOM, no Math.random, no Date; all randomness from the rng passed in.
G.sim = G.sim || {};
G.sim.fish_ai = (function () {
  var MAX = 8;
  var W = {
    baitLiked: 2,                 // a live bait it takes, or its favourite lure type (×2 the species weight); Phase 68: no baitOther
    lureLoved: 1.3,               // × awareness: a lure it loves (its flash, its wobble) draws it from farther
    depthFalloff: 4,              // m outside the habitat at which weight bottoms out
    depthFloor: 0.05,
    hourLiked: 1.6, hourOther: 0.7, // timeLikes match / no match (no effect when empty)
    coverK: 1,                    // Phase 69: × (share of its sizes the lure is made for)^coverK, the weight and the arrivals
    // The user's fixes (2026-11-03): a lure has to be worked (lure.work 0..1, from the scene: how
    // well its retrieve suits it; a live bait is always 1). Under workMin no fish notices it, and
    // one already after it gives up within deadGive s; the better it is worked the farther it
    // draws (awareness × workAware0 + (1 - workAware0) × work); a fish that has looked it over
    // turns it down with chance refuseK × (1 - work). And not every fish that comes by is
    // feeding: passBy of them swim past whatever is on the hook (arrivals are that much more
    // frequent, so a well-fished hook meets as many takers as before).
    workMin: 0.2, workAware0: 0.4, refuseK: 0.7, passBy: 0.25
  };
  var A = {
    spawnMin: 1.5, spawnMax: 4,   // s between spawns while the lure is in
    spawnNear: 90, spawnFar: 140, // px from the lure on either side
    despawn: 180,                 // px from the lure at which a leaving fish is gone
    noticePause: 0.6,             // s
    inspectR: 10,                 // px circle radius around the lure
    biteHold: 2.5,                // s; only if nothing resolves the bite (sim/bite.js does, in 2 s)
    swimPx: 10,                   // px/s per unit of species speed (speed is in fight units, V4)
    scent: 3,                     // × awareness: how far a wandering fish senses the lure is there
    drift: 0.75,                  // chance per turn that it heads toward the lure
    deadGive: 1.5,                // s: the user's fixes: a fish after a lure gone dead gives up after this
    passT: 8                      // s: and a fish only passing by swims on after this (it does not keep a place in the school)
  };
  // Phase 28: how a fish swims. It has a heading (yaw: 0 swimming right, PI left, between them
  // across the view; pitch: up or down, never steeper than asin 0.6) and a speed, and steers
  // them toward the velocity its state wants, at the rates below. Speeds in px/s, rates per s.
  var M = {
    turn0: 2.4, turnK: 1,         // rad/s of yaw: turn0 + turnK × species speed (a reversal 0.7-0.9 s)
    pitchMax: 0.6435,             // rad (asin 0.6): vertical speed at most 0.6 of the speed
    pitchRate: 1.6,               // rad/s
    accel: 1.5,                   // × its top speed per s
    brake: 3,                     // 1/s, slowing toward a lower target
    burstHi: 1.45,                // burst toward this × the target speed ...
    burst0: 0.4, burst1: 1,       // ... for this long (s, by a hash of the fish and the burst) ...
    glideDrag: 0.9,               // 1/s, then glide, slowing ...
    glideLo: 0.55, glideMax: 2,   // ... until under glideLo × the target, or glideMax s
    arrive: 20,                   // px: approaching, it slows inside this
    circleK: 2.5,                 // 1/s: circling, how hard it closes on its place on the circle
    lead: 0.35,                   // rad: circling, how far ahead on the circle it aims
    dartIn: 2, dartOut: 7, dartK: 9, // nibbling: px from the lure in and back out, and how fast
    holdK: 6                      // 1/s: biting, how it holds at the lure
  };
  var INTERESTED = { notice: 1, approach: 1, inspect: 1, nibble: 1, bite: 1 };
  // How interested a fish in each state is, for the dog (V3.8): 0..1.
  var INTEREST = { notice: 0.4, approach: 0.5, inspect: 0.7, nibble: 0.85, bite: 1 };

  // ---- Species selection ------------------------------------------------------------

  // Phase 68: every species that lives here starts at 1; what is on the hook (2 its favourite,
  // 1 taken, 0 ignored), the depth and the hour weigh it from there. Phase 75: "here" is its
  // home in this water and reach (G.data.homeOf), whose depth and hours it weighs by.
  function weightOf(f, ctx) {
    var hm = G.data.homeOf(f, ctx.loc, ctx.reach);
    if (!hm) return 0;
    var v = TAKE_W[interest(f, ctx.bait, ctx.lure)];
    if (!v) return 0;
    if (ctx.smallBoost && f.mass <= ctx.smallMass) v *= ctx.smallBoost;             // Phase 43: the ultralight rod
    if (ctx.depthM !== null) {
      var h = hm.habitat, out = ctx.depthM < h.depthMin ? h.depthMin - ctx.depthM : (ctx.depthM > h.depthMax ? ctx.depthM - h.depthMax : 0);
      if (out > 0) v *= Math.max(W.depthFloor, 1 - out / W.depthFalloff);
    }
    if (hm.timeLikes.length) v *= hm.timeLikes.indexOf(Math.floor(ctx.hour)) >= 0 ? W.hourLiked : W.hourOther;
    if (f.turnUp) v *= f.turnUp;                                                       // Phase 80: the (Ice) species' rarity
    full = v;
    if (COVER[0] < 1) v *= Math.pow(COVER[0], W.coverK);                                // Phase 69: only the fish of its sizes come
    return v;
  }
  var full = 0; // weightOf's weight before the size cover (for ctx.cover)

  // ctx: {species, loc, depthM (null = any), hour, unease, bait, lure, rodMaxMass}. Fills ctx.weights (one per species) and ctx.tooHeavyNear. Returns the total.
  function speciesWeights(ctx) {
    var list = ctx.species, w = ctx.weights, total = 0, whole = 0;
    if (!w || w.length !== list.length) w = ctx.weights = new Float64Array(list.length);
    ctx.tooHeavyNear = false;
    for (var i = 0; i < list.length; i++) {
      var v = weightOf(list[i], ctx);
      if (v > 0 && list[i].mass > ctx.rodMaxMass) { ctx.tooHeavyNear = true; v = 0; }
      w[i] = v;
      total += v;
      if (v > 0) whole += full;
    }
    // Phase 69: a lure made for big fish draws fewer: the arrivals slow by the share of the
    // species' weight its sizes leave in (1 for baits and lures that cover every size here).
    ctx.cover = whole > 0 ? total / whole : 1;
    return total;
  }

  // Index into ctx.species, or -1 when nothing can turn up.
  function pickSpecies(ctx, rng) {
    speciesWeights(ctx);
    return rng.weighted(ctx.weights);
  }

  // ---- The school -----------------------------------------------------------------------

  function createSchool(data) {
    var s = {
      fish: [], spawnT: 0, uid: 0,
      ctx: {
        species: data.fish, windows: data.windows, loc: '', reach: '', depthM: null, hour: 0, // reach: Phase 75, set from the lure's x (stepSchool)
        unease: 0, bait: '', latched: {}, rodMaxMass: 0, weights: null, tooHeavyNear: false,
        lineSeen: true, // Phase 53: a line-shy species (fish.lineShy) sees this line and will not bite
        attract: 1, // gear and cast spot: attract shortens the wait between arrivals
        cover: 1,   // Phase 69: the share of the fish here the hook is sized for (speciesWeights)
        maxDepthPx: 0, floorAt: null, // floorAt(x) -> bottom depth in px; null uses maxDepthPx
        ceilPx: 0,  // Phase 81: the ice's thickness (px): fish keep under it
        flowAt: null // Phase 28: flowAt(x, depth px) -> px/s of current; null is still water
      }
    };
    for (var i = 0; i < MAX; i++) {
      s.fish.push({ active: false, uid: 0, sp: -1, x: 0, y: 0, vx: 0, vy: 0, home: 0, dir: 1,
        state: 'wander', t: 0, turnT: 0, circles: 0, ang: 0, swept: 0, nibbles: 0, nibbleN: 0, nibbleT: 0, nibbleLen: 0, missed: 0,
        yaw: 0, pitch: 0, spd: 0, back: 0, face: 1, gl: 0, glT: 0, bursts: 0, flow: 0, shied: 0, hab: null, pass: false, dead: 0 }); // Phase 28; shied: Phase 53; hab: Phase 75; pass, dead: the user's fixes
    }
    return s;
  }

  function floor(school, x) {
    var c = school.ctx;
    return c.floorAt ? c.floorAt(x) : c.maxDepthPx;
  }

  // Phase 75: a species' home in the school's water and reach (any of its homes there if the
  // reach has none, so a fish that swims across a reach's edge keeps a home).
  var ANY_HOME = { habitat: { depthMin: 0, depthMax: 1e9 }, timeLikes: [], bed: false };
  function homeHere(school, sp) {
    var c = school.ctx;
    return G.data.homeOf(sp, c.loc, c.reach) || G.data.homeOf(sp, c.loc, '') || ANY_HOME;
  }
  // Phase 75: a bottom fish's depth: 1-4 px (a metre) over the bed under it.
  function bedDepth(school, f, rng) { return clampDepth(school, f, floor(school, f.x) - rng.range(1, 4)); }

  function clampDepth(school, f, y) {
    var lo = 3 + (school.ctx.ceilPx || 0), hi = floor(school, f.x) - 2; // Phase 81: under the ice
    return y < lo ? lo : (y > hi ? hi : y);
  }

  function setState(f, s) { f.state = s; f.t = 0; }

  // Puts species sp in a free slot at (x, y). Returns the fish, or null if all 8 are taken.
  // Phase 75: it keeps its home here (f.hab: its depths; bed: it stays by the bottom).
  function spawn(school, sp, x, y, dir, rng, data) {
    for (var i = 0; i < MAX; i++) {
      var f = school.fish[i];
      if (f.active) continue;
      var hb = homeHere(school, data.fish[sp]), h = hb.habitat;
      f.active = true; f.uid = ++school.uid; f.sp = sp; f.hab = hb;
      f.x = x; f.y = y; f.vx = 0; f.vy = 0; f.dir = dir;
      f.yaw = dir >= 0 ? 0 : Math.PI; f.pitch = 0; f.spd = 0; f.back = 0; f.face = dir >= 0 ? 1 : -1; f.gl = 0; f.glT = 0; f.bursts = 0; f.flow = 0;
      f.home = hb.bed ? bedDepth(school, f, rng) : clampDepth(school, f, rng.range(h.depthMin, h.depthMax) * 4);
      f.turnT = rng.range(2, 6); f.circles = 0; f.ang = 0; f.swept = 0; f.nibbles = 0; f.nibbleN = 0; f.nibbleT = 0; f.missed = 0; f.shied = 0;
      f.pass = rng.next() < W.passBy; f.dead = 0;                                   // the user's fixes: just passing by
      setState(f, 'wander');
      return f;
    }
    return null;
  }

  // Phase 43: how much a species wants what is on the hook: 0 ignores it, 1 takes it, 2 loves
  // it. Live baits by baitLikes (listed: 2, else 0; a bait with `as` is taken as that bait);
  // Phase 68: lures by fish.lureTypes[lure.type], and only if the lure is made for fish of
  // the species' size (economy.qRange); a float rig is taken as its bait (Phase 65), and since
  // Phase 69 only by fish of its sizes (the Bobber S-M, the Deep Bobber S-L).
  var TAKE_W = [0, 1, W.baitLiked]; // the species weight by interest
  var QR = [0, 1], COVER = [1];       // COVER[0]: the share of the species' catches (by the size curve) the last hook asked about is made for
  function interest(sp, bait, lure) {
    var g = G.data.gear, i;
    COVER[0] = 1;
    if (lure) {
      var l = g.lures || [], L = null;
      for (i = 0; i < l.length; i++) if (l[i].id === bait) { L = l[i]; break; }
      if (!L) return 0;
      var v = L.carries ? interest(sp, L.carries, false) : (sp.lureTypes[L.type] || 0); // Phase 69: a float rig by its bait and its sizes
      if (!v || !G.sim.economy.qRange(sp, L.sizes, G.data, QR)) return 0;
      var ic = 1 / G.data.gear.economy.sizeCurve;                                 // q = u^curve, so u = q^(1/curve)
      COVER[0] = Math.pow(QR[1], ic) - Math.pow(QR[0], ic);
      return v;
    }
    var b = g.baits;
    for (i = 0; i < b.length; i++) if (b[i].id === bait && b[i].as) { bait = b[i].as; break; }
    return sp.baitLikes.indexOf(bait) >= 0 ? 2 : 0;
  }
  function baitOk(sp, bait, lure) { return interest(sp, bait, lure) > 0; }

  function ease(v, target, k, dt) { return v + (target - v) * Math.min(1, k * dt); }

  // 0..1 from a fish and a counter, for burst lengths: no draw from the rng, so the bursts
  // add nothing to the random stream.
  function hfrac(uid, n) {
    var h = Math.imul(uid ^ Math.imul(n + 1, 0x9e3779b1), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Steers a fish toward the ground velocity (gx, gy) its state wants, at most top px/s:
  // the swim it needs is that minus the current; yaw turns toward its horizontal sign, pitch
  // toward its slope, and speed toward its size, in bursts and glides when burst is set.
  var PI = Math.PI;
  function swim(f, sp, gx, gy, top, burst, dt) {
    var dx = gx - f.flow, dy = gy, need = Math.sqrt(dx * dx + dy * dy), max = sp.speed * A.swimPx;
    if (need > top) { dx *= top / need; dy *= top / need; need = top; }
    // Yaw: right (0) or left (PI) by the swim's horizontal sign; nearly still, it keeps facing.
    var yt = dx > 0.3 ? 0 : (dx < -0.3 ? PI : (f.yaw < PI / 2 ? 0 : PI)), turn = (M.turn0 + M.turnK * sp.speed) * dt;
    f.yaw += yt > f.yaw ? Math.min(turn, yt - f.yaw) : -Math.min(turn, f.yaw - yt);
    var pt = need > 0.05 ? Math.atan2(dy, Math.abs(dx)) : 0, pr = M.pitchRate * dt;
    pt = pt > M.pitchMax ? M.pitchMax : (pt < -M.pitchMax ? -M.pitchMax : pt);
    f.pitch += pt > f.pitch ? Math.min(pr, pt - f.pitch) : -Math.min(pr, f.pitch - pt);
    // Speed: a burst toward burstHi × the need, then a glide; or straight toward the need.
    if (burst && need > 0.5) {
      f.glT += dt;
      if (f.gl) {
        f.spd *= 1 - M.glideDrag * dt;
        if (f.spd < need * M.glideLo || f.glT > M.glideMax) { f.gl = 0; f.glT = 0; f.bursts++; }
      } else {
        var bt = need * M.burstHi;
        if (f.spd < bt) f.spd = Math.min(bt, f.spd + M.accel * max * dt); else f.spd += (bt - f.spd) * Math.min(1, M.brake * dt);
        if (f.glT > M.burst0 + (M.burst1 - M.burst0) * hfrac(f.uid, f.bursts)) { f.gl = 1; f.glT = 0; }
      }
    } else {
      f.gl = 0; f.glT = 0;
      if (f.spd < need) f.spd = Math.min(need, f.spd + M.accel * max * dt); else f.spd += (need - f.spd) * Math.min(1, M.brake * dt);
    }
    f.back *= 1 - Math.min(1, 4 * dt); // backing off the lure (hover) dies away
    f.vx = (f.spd + f.back) * Math.cos(f.pitch) * Math.cos(f.yaw) + f.flow;
    f.vy = f.spd * Math.sin(f.pitch);
  }

  // Hovering at the lure (nibbling, biting): it faces the lure (f.dir) and holds or darts to
  // world x tx by fins, backing when it must, its velocity set straight.
  function hover(f, sp, tx, ty, k, dt) {
    var max = sp.speed * A.swimPx, yt = f.dir >= 0 ? 0 : PI, turn = (M.turn0 + M.turnK * sp.speed) * dt;
    f.yaw += yt > f.yaw ? Math.min(turn, yt - f.yaw) : -Math.min(turn, f.yaw - yt);
    f.pitch += (0 - f.pitch) * Math.min(1, 3 * dt);
    var vx = (tx - f.x) * k, vy = (ty - f.y) * k;
    vx = vx > max ? max : (vx < -max ? -max : vx);
    vy = vy > max * 0.6 ? max * 0.6 : (vy < -max * 0.6 ? -max * 0.6 : vy);
    f.vx = vx; f.vy = vy; f.gl = 0; f.glT = 0;
    var fwd = vx * (f.dir >= 0 ? 1 : -1); // along its facing: forward is speed, backward is backing
    f.spd = Math.sqrt((fwd > 0 ? fwd * fwd : 0) + vy * vy); f.back = fwd < 0 ? fwd : 0;
  }

  // One fish, one fixed step. lure: {active, x, y (depth px), bait}. Phase 28: the states set a
  // velocity they want and the fish steers toward it (swim) or hovers (hover); the current,
  // when the water has one, carries it.
  function stepFish(f, lure, dt, rng, data, school) {
    var sp = data.fish[f.sp], speed = sp.speed * A.swimPx;
    var dx = lure.x - f.x, dy = lure.y - f.y, dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    f.t += dt;
    f.flow = school.ctx.flowAt ? school.ctx.flowAt(f.x, f.y) : 0;
    if (!lure.active && f.state !== 'leave') setState(f, 'leave'); // reeled in: everyone drifts off
    // The user's fixes: a lure gone dead in the water loses the fish after it.
    var work = lure.lure ? (lure.work === undefined ? 1 : lure.work) : 1;
    if (INTERESTED[f.state] && f.state !== 'bite') { f.dead = work < W.workMin ? f.dead + dt : 0; if (f.dead > A.deadGive) setState(f, 'leave'); }

    switch (f.state) {
      case 'wander':
        if (f.pass && f.t > A.passT) { setState(f, 'leave'); break; }
        f.turnT -= dt;
        if (f.turnT <= 0) {
          f.turnT = rng.range(2, 6);
          if (lure.active && Math.abs(dx) < sp.awareness * A.scent) {
            // Near a lure, a wandering fish drifts toward it, and toward its depth when that
            // depth is inside the fish's habitat.
            if (rng.next() < A.drift) f.dir = dx >= 0 ? 1 : -1;
            var lo = f.hab.habitat.depthMin * 4, hi = f.hab.habitat.depthMax * 4;
            f.home = clampDepth(school, f, (f.home + (lure.y < lo ? lo : (lure.y > hi ? hi : lure.y))) / 2 + rng.range(-3, 3));
          } else {
            if (rng.next() < 0.35) f.dir = -f.dir;
            f.home = f.hab.bed ? bedDepth(school, f, rng) : clampDepth(school, f, f.home + rng.range(-6, 6));
          }
        }
        // In a current a fish not drawn to the lure faces into it: it swims upstream, or slips
        // back tail first, never faster over the bed than 0.8 of the current, so it never turns
        // to swim with it. A fish heading for the lure swims after it, downstream or up.
        var gw = speed * 0.35, fa = Math.abs(f.flow), drawn = lure.active && Math.abs(dx) < sp.awareness * A.scent && f.dir * dx > 0;
        if (fa > 0.5 && !drawn && f.dir * f.flow > 0 && gw > fa * 0.8) gw = fa * 0.8;
        swim(f, sp, f.dir * gw, (f.home - f.y) * 0.5, speed, true, dt);
        if (lure.active && !f.pass && work >= W.workMin && baitOk(sp, lure.bait, lure.lure) &&
            dist < sp.awareness * (lure.lure && interest(sp, lure.bait, true) === 2 ? W.lureLoved : 1) * (lure.lure ? W.workAware0 + (1 - W.workAware0) * work : 1)) setState(f, 'notice');
        break;

      case 'notice': // a pause: it stops (holding its place in a current) and turns toward the lure
        f.dir = dx >= 0 ? 1 : -1;
        swim(f, sp, f.dir * 0.31, 0, speed, false, dt); // just enough to swing round toward it
        if (f.t >= A.noticePause) setState(f, 'approach');
        break;

      case 'approach': // toward the lure in bursts, slowing as it arrives
        var ar = dist < M.arrive ? Math.max(0.3, dist / M.arrive) : 1;
        swim(f, sp, dx / dist * speed * 0.6 * ar, dy / dist * speed * 0.6 * ar, speed, true, dt);
        if (dist < A.inspectR + 2) {
          setState(f, 'inspect');
          f.circles = rng.int(1, 3);
          f.ang = Math.atan2(f.y - lure.y, f.x - lure.x);
          f.swept = 0;
          f.dir = rng.next() < 0.5 ? 1 : -1; // which way round
        }
        break;

      case 'inspect': // circle the lure circles times (a flattened circle), steering after a point on it
        var w = speed * 0.4 / A.inspectR;
        f.ang += f.dir * w * dt;
        f.swept += w * dt;
        var la = f.ang + f.dir * M.lead, R = A.inspectR;
        var tx = lure.x + Math.cos(la) * R, ty = lure.y + Math.sin(la) * R * 0.5;
        swim(f, sp, -Math.sin(la) * R * w * f.dir + (tx - f.x) * M.circleK, Math.cos(la) * R * 0.5 * w * f.dir + (ty - f.y) * M.circleK, speed * 0.8, false, dt);
        if (f.swept >= 6.2832) {
          f.swept = 0;
          if (--f.circles <= 0 && sp.lineShy && school.ctx.lineSeen) {
            setState(f, 'leave'); f.shied = 1;           // Phase 53: close enough to see the line: it turns away
          } else if (f.circles <= 0 && lure.lure && work < 1 && rng.next() < W.refuseK * (1 - work)) {
            setState(f, 'leave');                        // the user's fixes: it has seen enough of a badly worked lure
          } else if (f.circles <= 0) {
            setState(f, 'nibble');
            f.nibbleN = rng.int(2, 4); f.nibbles = 0; f.nibbleT = f.nibbleLen = rng.range(0.25, 0.6);
            f.dir = f.x < lure.x ? 1 : -1;
          }
        }
        break;

      case 'nibble': // nose at the lure: short darts in and back, then the caution roll
        f.nibbleT -= dt;
        hover(f, sp, lure.x - f.dir * (f.nibbleT > f.nibbleLen * 0.6 ? M.dartIn : M.dartOut), lure.y, M.dartK, dt);
        if (f.nibbleT <= 0) {
          f.nibbles++;
          f.nibbleT = f.nibbleLen = rng.range(0.25, 0.6);
          if (f.nibbles >= f.nibbleN) setState(f, rng.next() >= sp.caution ? 'bite' : 'leave');
        }
        break;

      case 'bite':
        hover(f, sp, lure.x - f.dir * 4, lure.y, M.holdK, dt);
        if (f.t >= A.biteHold) setState(f, 'leave');
        break;

      case 'leave':
        var away = f.x >= lure.x ? 1 : -1;
        f.dir = away;
        swim(f, sp, away * speed * 1.5, (f.home - f.y) * 0.5, speed * 1.5, false, dt);
        if (Math.abs(f.x - lure.x) > A.despawn) f.active = false;
        break;
    }
    f.face = f.yaw < PI / 2 ? 1 : -1;
    f.x += f.vx * dt;
    f.y = clampDepth(school, f, f.y + f.vy * dt);
  }

  // The whole school for one fixed step: spawning near the lure, then every fish.
  function stepSchool(school, lure, dt, rng, data) {
    school.ctx.reach = data.reachAt(data.locations[school.ctx.loc], lure.x); // Phase 75: the reach the lure is in
    if (lure.active) {
      school.spawnT -= dt;
      if (school.spawnT <= 0) {
        school.spawnT = rng.range(A.spawnMin, A.spawnMax) * (1 - W.passBy) / ((school.ctx.attract || 1) * (school.ctx.cover || 1)); // Phase 69: cover from the last pick; the user's fixes: more come by, as some only pass
        if (count(school) < MAX) {
          var sp = pickSpecies(school.ctx, rng);
          if (sp >= 0) {
            var side = rng.next() < 0.5 ? -1 : 1, x = lure.x + side * rng.range(A.spawnNear, A.spawnFar);
            var h = homeHere(school, data.fish[sp]).habitat;
            spawn(school, sp, x, rng.range(h.depthMin, Math.min(h.depthMax, floor(school, x) / 4)) * 4, -side, rng, data);
          }
        }
      }
    } else {
      school.spawnT = 0;
    }
    for (var i = 0; i < MAX; i++) if (school.fish[i].active) stepFish(school.fish[i], lure, dt, rng, data, school);
  }

  function count(school) {
    var n = 0;
    for (var i = 0; i < MAX; i++) if (school.fish[i].active) n++;
    return n;
  }

  // How many fish are currently interested in the lure (drives waiting <-> interest).
  function interested(school) {
    var n = 0;
    for (var i = 0; i < MAX; i++) if (school.fish[i].active && INTERESTED[school.fish[i].state]) n++;
    return n;
  }

  // The interest of the most interested fish (0 when none), for the dog's point (V3.8).
  function interestLevel(school) {
    var best = 0;
    for (var i = 0; i < MAX; i++) {
      var f = school.fish[i], v = f.active ? (INTEREST[f.state] || 0) : 0;
      if (v > best) best = v;
    }
    return best;
  }

  // Every active fish swims off (a hooked fish's school scatters).
  function scatter(school) {
    for (var i = 0; i < MAX; i++) if (school.fish[i].active) setState(school.fish[i], 'leave');
  }

  function clear(school) { for (var i = 0; i < MAX; i++) school.fish[i].active = false; school.spawnT = 0; }

  return {
    MAX: MAX, W: W, A: A, M: M,
    weightOf: weightOf, speciesWeights: speciesWeights, pickSpecies: pickSpecies,
    createSchool: createSchool, spawn: spawn, stepFish: stepFish, stepSchool: stepSchool,
    interest: interest, count: count, interested: interested, interestLevel: interestLevel, scatter: scatter, clear: clear
  };
})();
