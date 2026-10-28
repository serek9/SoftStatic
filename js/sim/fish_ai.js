var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish AI (V3.4). Two halves:
//  - speciesWeights / pickSpecies: which species turns up, from rarity × bait × depth ×
//    hour × unease × clock window. Species heavier than the rod can hold are never picked;
//    they only set ctx.tooHeavyNear so the scene can hint at them (D4).
//  - the spatial school: up to 8 fish that wander, notice the lure, approach, circle it,
//    nibble, then bite or leave.
// Pure: no DOM, no Math.random, no Date; all randomness from the rng passed in.
G.sim = G.sim || {};
G.sim.fish_ai = (function () {
  var MAX = 8;
  var W = {
    baitLiked: 2, baitOther: 0.6, // baitLikes match / no match (no effect when baitLikes is empty)
    depthFalloff: 4,              // m outside the habitat at which weight bottoms out
    depthFloor: 0.05,
    hourLiked: 1.6, hourOther: 0.7, // timeLikes match / no match (no effect when empty)
    uneaseShift: 0.5              // × (1 + unease × wrongness × this)
  };
  var A = {
    spawnMin: 1.5, spawnMax: 4,   // s between spawns while the lure is in
    spawnNear: 90, spawnFar: 140, // px from the lure on either side
    despawn: 180,                 // px from the lure at which a leaving fish is gone
    noticePause: 0.6,             // s
    inspectR: 10,                 // px circle radius around the lure
    biteHold: 2                   // s a biting fish waits before leaving   TODO(P7.1): the hook window
  };
  var INTERESTED = { notice: 1, approach: 1, inspect: 1, nibble: 1, bite: 1 };

  // ---- Species selection ------------------------------------------------------------

  function weightOf(f, ctx) {
    if (f.locations.indexOf(ctx.loc) < 0) return 0;
    if (ctx.unease < f.uneaseMin) return 0;
    if (f.windows.length) {
      var open = false;
      for (var j = 0; j < f.windows.length; j++) {
        var win = G.sim.clock.windowById(ctx.windows, f.windows[j]);
        if (win && G.sim.clock.eligible(ctx.latched, ctx.hour, win)) open = true;
      }
      if (!open) return 0;
    }
    var v = ctx.rarity[f.rarity];
    if (f.baitLikes.length) v *= f.baitLikes.indexOf(ctx.bait) >= 0 ? W.baitLiked : W.baitOther;
    if (ctx.depthM !== null) {
      var h = f.habitat, out = ctx.depthM < h.depthMin ? h.depthMin - ctx.depthM : (ctx.depthM > h.depthMax ? ctx.depthM - h.depthMax : 0);
      if (out > 0) v *= Math.max(W.depthFloor, 1 - out / W.depthFalloff);
    }
    if (f.timeLikes.length) v *= f.timeLikes.indexOf(Math.floor(ctx.hour)) >= 0 ? W.hourLiked : W.hourOther;
    return v * (1 + ctx.unease * f.look.wrongness * W.uneaseShift);
  }

  // ctx: {species, rarity, windows, loc, depthM (null = any), hour, unease, bait, latched,
  // rodMaxMass}. Fills ctx.weights (one per species) and ctx.tooHeavyNear. Returns the total.
  function speciesWeights(ctx) {
    var list = ctx.species, w = ctx.weights, total = 0;
    if (!w || w.length !== list.length) w = ctx.weights = new Float64Array(list.length);
    ctx.tooHeavyNear = false;
    for (var i = 0; i < list.length; i++) {
      var v = weightOf(list[i], ctx);
      if (v > 0 && list[i].mass > ctx.rodMaxMass) { ctx.tooHeavyNear = true; v = 0; }
      w[i] = v;
      total += v;
    }
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
        species: data.fish, rarity: data.rarity, windows: data.windows, loc: '', depthM: null, hour: 0,
        unease: 0, bait: '', latched: {}, rodMaxMass: 0, weights: null, tooHeavyNear: false,
        maxDepthPx: 0, floorAt: null // floorAt(x) -> bottom depth in px; null uses maxDepthPx
      }
    };
    for (var i = 0; i < MAX; i++) {
      s.fish.push({ active: false, uid: 0, sp: -1, x: 0, y: 0, vx: 0, vy: 0, home: 0, dir: 1,
        state: 'wander', t: 0, turnT: 0, circles: 0, ang: 0, swept: 0, nibbles: 0, nibbleN: 0, nibbleT: 0 });
    }
    return s;
  }

  function floor(school, x) {
    var c = school.ctx;
    return c.floorAt ? c.floorAt(x) : c.maxDepthPx;
  }

  function clampDepth(school, f, y) {
    var lo = 3, hi = floor(school, f.x) - 2;
    return y < lo ? lo : (y > hi ? hi : y);
  }

  function setState(f, s) { f.state = s; f.t = 0; }

  // Puts species sp in a free slot at (x, y). Returns the fish, or null if all 8 are taken.
  function spawn(school, sp, x, y, dir, rng, data) {
    for (var i = 0; i < MAX; i++) {
      var f = school.fish[i];
      if (f.active) continue;
      var h = data.fish[sp].habitat;
      f.active = true; f.uid = ++school.uid; f.sp = sp;
      f.x = x; f.y = y; f.vx = 0; f.vy = 0; f.dir = dir;
      f.home = clampDepth(school, f, rng.range(h.depthMin, h.depthMax) * 4);
      f.turnT = rng.range(2, 6); f.circles = 0; f.ang = 0; f.swept = 0; f.nibbles = 0; f.nibbleN = 0; f.nibbleT = 0;
      setState(f, 'wander');
      return f;
    }
    return null;
  }

  function baitOk(sp, bait) { return sp.baitLikes.length === 0 || sp.baitLikes.indexOf(bait) >= 0; }

  function ease(v, target, k, dt) { return v + (target - v) * Math.min(1, k * dt); }

  // One fish, one fixed step. lure: {active, x, y (depth px), bait}.
  function stepFish(f, lure, dt, rng, data, school) {
    var sp = data.fish[f.sp], speed = sp.speed;
    var dx = lure.x - f.x, dy = lure.y - f.y, dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    f.t += dt;
    if (!lure.active && f.state !== 'leave') setState(f, 'leave'); // reeled in: everyone drifts off

    switch (f.state) {
      case 'wander':
        f.turnT -= dt;
        if (f.turnT <= 0) {
          f.turnT = rng.range(2, 6);
          if (rng.next() < 0.35) f.dir = -f.dir;
          f.home = clampDepth(school, f, f.home + rng.range(-6, 6));
        }
        f.vx = ease(f.vx, f.dir * speed * 0.35, 2, dt);
        f.vy = (f.home - f.y) * 0.5;
        if (lure.active && dist < sp.awareness && baitOk(sp, lure.bait)) setState(f, 'notice');
        break;

      case 'notice': // a pause, turning toward the lure
        f.vx = ease(f.vx, 0, 3, dt); f.vy = ease(f.vy, 0, 3, dt);
        f.dir = dx >= 0 ? 1 : -1;
        if (f.t >= A.noticePause) setState(f, 'approach');
        break;

      case 'approach':
        f.vx = ease(f.vx, dx / dist * speed * 0.6, 3, dt);
        f.vy = ease(f.vy, dy / dist * speed * 0.6, 3, dt);
        if (dist < A.inspectR + 2) {
          setState(f, 'inspect');
          f.circles = rng.int(1, 3);
          f.ang = Math.atan2(f.y - lure.y, f.x - lure.x);
          f.swept = 0;
          f.dir = rng.next() < 0.5 ? 1 : -1; // which way round
        }
        break;

      case 'inspect': // circle the lure circles times (a flattened circle)
        var w = speed * 0.4 / A.inspectR;
        f.ang += f.dir * w * dt;
        f.swept += w * dt;
        var tx = lure.x + Math.cos(f.ang) * A.inspectR, ty = lure.y + Math.sin(f.ang) * A.inspectR * 0.5;
        f.vx = (tx - f.x) * 6; f.vy = (ty - f.y) * 6;
        if (f.swept >= 6.2832) {
          f.swept = 0;
          if (--f.circles <= 0) {
            setState(f, 'nibble');
            f.nibbleN = rng.int(2, 4); f.nibbles = 0; f.nibbleT = rng.range(0.25, 0.6);
            f.dir = f.x < lure.x ? 1 : -1;
          }
        }
        break;

      case 'nibble': // nose at the lure; small tugs, then the caution roll
        f.vx = (lure.x - f.dir * 5 - f.x) * 5; f.vy = (lure.y - f.y) * 5;
        f.nibbleT -= dt;
        if (f.nibbleT <= 0) {
          f.nibbles++;
          f.nibbleT = rng.range(0.25, 0.6);
          if (f.nibbles >= f.nibbleN) setState(f, rng.next() >= sp.caution ? 'bite' : 'leave');
        }
        break;

      case 'bite':
        f.vx = (lure.x - f.dir * 5 - f.x) * 5; f.vy = (lure.y - f.y) * 5;
        if (f.t >= A.biteHold) setState(f, 'leave'); // TODO(P7.1): hooking replaces this
        break;

      case 'leave':
        var away = f.x >= lure.x ? 1 : -1;
        f.dir = away;
        f.vx = ease(f.vx, away * speed * 1.5, 2, dt);
        f.vy = ease(f.vy, (f.home - f.y) * 0.5, 2, dt);
        if (Math.abs(f.x - lure.x) > A.despawn) f.active = false;
        break;
    }
    f.x += f.vx * dt;
    f.y = clampDepth(school, f, f.y + f.vy * dt);
  }

  // The whole school for one fixed step: spawning near the lure, then every fish.
  function stepSchool(school, lure, dt, rng, data) {
    if (lure.active) {
      school.spawnT -= dt;
      if (school.spawnT <= 0) {
        school.spawnT = rng.range(A.spawnMin, A.spawnMax);
        if (count(school) < MAX) {
          var sp = pickSpecies(school.ctx, rng);
          if (sp >= 0) {
            var side = rng.next() < 0.5 ? -1 : 1, x = lure.x + side * rng.range(A.spawnNear, A.spawnFar);
            var h = data.fish[sp].habitat;
            spawn(school, sp, x, rng.range(h.depthMin, h.depthMax) * 4, -side, rng, data);
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

  function clear(school) { for (var i = 0; i < MAX; i++) school.fish[i].active = false; school.spawnT = 0; }

  return {
    MAX: MAX, W: W, A: A,
    weightOf: weightOf, speciesWeights: speciesWeights, pickSpecies: pickSpecies,
    createSchool: createSchool, spawn: spawn, stepFish: stepFish, stepSchool: stepSchool,
    count: count, interested: interested, clear: clear
  };
})();
