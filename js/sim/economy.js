var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Economy (V8): prices, gear effects, purchases, bait use, catches into the save,
// location unlock checks and cabin restoration. Reels and lines are linear upgrades
// (save.gear.reel = 2: the Brass Reel, owned and in use). Phase 43: rods are a rack:
// save.gear.rods lists the indices owned and save.gear.rod is the one in use; buy('rod') buys
// the next rod up the ladder (rods without ladder: false), buyRod any rod. The hook carries
// save.gear.bait, a bait or (Phase 43) a lure id; both are counted in save.baits.
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.economy = (function () {
  var OK = 0, MAXED = 1, POOR = 2, LOCKED = 3, UNKNOWN = 4;
  var TIERED = { rod: 'rods', reel: 'reels', line: 'lines' };

  // 0.7 (smallest) .. 1.5 (largest); q is the fish's size quantile 0..1.
  function sizeFactor(q, data) {
    var e = data.gear.economy;
    return e.sizeMin + (e.sizeMax - e.sizeMin) * q;
  }

  // Phase 44: a fish's size quantile from a uniform draw u (one rng.next()), skewed so small
  // individuals are common and big ones rare: q = u^sizeCurve.
  function sizeQ(u, data) { return Math.pow(u, data.gear.economy.sizeCurve); }
  // Length (cm, to 0.1) and weight (kg, to 0.01, or to the gram under 0.1 kg) at quantile q,
  // into out.len and out.w.
  function size(sp, q, out) {
    var w = sp.weightKg[0] + (sp.weightKg[1] - sp.weightKg[0]) * Math.pow(q, 1.3);
    out.len = Math.round((sp.lengthCm[0] + (sp.lengthCm[1] - sp.lengthCm[0]) * q) * 10) / 10;
    out.w = w < 0.1 ? Math.round(w * 1000) / 1000 : Math.round(w * 100) / 100;
    return out;
  }

  // Phase 68: no rarity; a species' price is its own.
  function price(sp, q, data) {
    return Math.round(sp.price * sizeFactor(q, data));
  }

  // Phase 68: the size quantiles [lo, hi] (into out) of species sp that a hook made for size
  // classes `sizes` (gear lures' sizes; none: every size) catches, by weight against
  // G.data.SIZE_CLASSES. Returns false when none of the species is that size. The weight at q
  // is w0 + (w1 - w0) × q^1.3 (size), so q = ((w - w0) / (w1 - w0))^(1 / 1.3).
  function qRange(sp, sizes, data, out) {
    out[0] = 0; out[1] = 1;
    if (!sizes) return true;
    var C = data.SIZE_CLASSES, lo = Infinity, hi = -Infinity, w0 = sp.weightKg[0], w1 = sp.weightKg[1], i;
    for (i = 0; i < C.length; i++) {
      if (sizes.indexOf(C[i].id) < 0) continue;
      var a = i ? C[i - 1].maxKg : 0, b = C[i].maxKg;
      if (a < lo) lo = a;
      if (b > hi) hi = b;
    }
    if (hi <= w0 || lo >= w1) return false;
    if (w1 > w0) {
      out[0] = lo > w0 ? Math.pow((lo - w0) / (w1 - w0), 1 / 1.3) : 0;
      out[1] = hi < w1 ? Math.pow((hi - w0) / (w1 - w0), 1 / 1.3) : 1;
    }
    return true;
  }
  // The size quantile of a fish of species sp hooked on hook id from a uniform draw u (one
  // rng.next()): the size curve (sizeQ) inside what the hook is made for (qRange).
  var QR = [0, 1];
  function hookQ(sp, id, u, data) {
    var b = baitById(id, data);
    if (!qRange(sp, b && b.sizes, data, QR)) { QR[0] = 0; QR[1] = 1; }
    return QR[0] + (QR[1] - QR[0]) * sizeQ(u, data);
  }

  // A bait or a lure (Phase 43) by id: what can go on the hook.
  function baitById(id, data) {
    var b = data.gear.baits, i;
    for (i = 0; i < b.length; i++) if (b[i].id === id) return b[i];
    b = data.gear.lures || [];
    for (i = 0; i < b.length; i++) if (b[i].id === id) return b[i];
    return null;
  }
  function isLure(id, data) {
    var l = data.gear.lures || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return true;
    return false;
  }

  // Phase 43: the rod rack.
  function ownsRod(save, i) { return save.gear.rods.indexOf(i) >= 0; }
  function nextLadderRod(save, data) {
    var r = data.gear.rods, top = -1, i;
    for (i = 0; i < r.length; i++) if (r[i].ladder !== false && ownsRod(save, i)) top = i;
    var n = r[top + 1];
    return n && n.ladder !== false ? top + 1 : -1;
  }
  // Buys rod i and puts it in hand: OK, MAXED (owned), POOR, LOCKED or UNKNOWN. Phase 80: an
  // ice rod goes in hand for the ice (save.gear.iceRod); the Ice Rod comes only with the Snow
  // Machine (LOCKED), the Hardwater Rod once every (Ice) species is in the journal.
  function buyRod(save, i, data) {
    var rod = data.gear.rods[i];
    if (!rod) return UNKNOWN;
    if (ownsRod(save, i)) return MAXED;
    if (rod.grant || (rod.need === 'iceAll' && !iceAll(save, data))) return LOCKED;
    if (save.coins < rod.cost) return POOR;
    save.coins -= rod.cost;
    save.gear.rods.push(i);
    if (rod.ice) save.gear.iceRod = i; else save.gear.rod = i;
    return OK;
  }
  // Takes an owned rod in hand: OK or LOCKED (not owned). Phase 80: an ice rod for the ice.
  function useRod(save, i, data) {
    if (!ownsRod(save, i)) return LOCKED;
    var rod = data && data.gear.rods[i];
    if (rod && rod.ice) save.gear.iceRod = i; else save.gear.rod = i;
    return OK;
  }
  // Phase 80: every (Ice) species has been caught (the Hardwater Rod's condition).
  function iceAll(save, data) {
    for (var i = 0; i < data.fish.length; i++) { var f = data.fish[i]; if (f.ice && !(save.journal[f.id] && save.journal[f.id].caught > 0)) return false; }
    return true;
  }
  // Phase 80: the Snow Machine: OK, MAXED (owned) or POOR. It brings the Ice Rod, in hand on the ice.
  function buySnow(save, data) {
    var sn = data.gear.snow;
    if (save.gear.snow) return MAXED;
    if (save.coins < sn.cost) return POOR;
    save.coins -= sn.cost;
    save.gear.snow = true;
    if (!ownsRod(save, sn.rod)) save.gear.rods.push(sn.rod);
    save.gear.iceRod = sn.rod;
    return OK;
  }
  // Phase 80: is the save on the ice now (its water has ice)?
  function onIce(save, data) { var L = data.locations[save.loc]; return !!(L && L.ice); }
  // Phase 80: can hook id go down a hole (a live bait, or a lure of G.data.ICE_TYPES)?
  function iceHook(id, data) {
    var b = baitById(id, data);
    return !!b && (!b.type || data.ICE_TYPES.indexOf(b.type) >= 0);
  }

  // The bait that will actually go on the hook: the equipped one if any is left, else worms.
  // Phase 80: on the ice a lure that needs open water is not fished either (worms go on).
  function baitInUse(save, data) {
    var b = baitById(save.gear.bait, data);
    if (!b || (!b.unlimited && !(save.baits[b.id] > 0))) b = data.gear.baits[0];
    if (b.type && onIce(save, data) && data.ICE_TYPES.indexOf(b.type) < 0) b = data.gear.baits[0];
    return b;
  }

  // Phase 53: line types (data/gear.js lineTypes), bought once and chosen like the rods.
  function lineTypeById(id, data) {
    var t = data.gear.lineTypes;
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i];
    return t[0];
  }
  function ownsLineType(save, id) { return id === 'mono' || (save.gear.lineTypes || []).indexOf(id) >= 0; }
  // Buys line type id and spools it on: OK, MAXED (owned), POOR or UNKNOWN.
  function buyLineType(save, id, data) {
    var t = lineTypeById(id, data);
    if (t.id !== id) return UNKNOWN;
    if (ownsLineType(save, id)) return MAXED;
    if (save.coins < t.cost) return POOR;
    save.coins -= t.cost;
    save.gear.lineTypes.push(id);
    save.gear.lineType = id;
    return OK;
  }
  // Spools on an owned line type: OK or LOCKED.
  function useLineType(save, id) {
    if (!ownsLineType(save, id)) return LOCKED;
    save.gear.lineType = id;
    return OK;
  }

  // Phase 80: the rod in hand here: on the ice the ice rod (the Ice Rod if none is chosen, so a
  // tour of the ice still fishes), elsewhere the open-water rod.
  function rodInHand(save, data) {
    if (!onIce(save, data)) return save.gear.rod;
    var i = save.gear.iceRod;
    return data.gear.rods[i] && data.gear.rods[i].ice ? i : data.gear.snow.rod;
  }

  // Fills out (reused object) with everything the equipped gear does.
  function effects(save, data, out) {
    var g = data.gear, s = save.gear, rod = g.rods[rodInHand(save, data)], bait = baitInUse(save, data);
    out.castMax = rod.castMax;
    out.maxMass = rod.maxMass;
    out.rodAction = rod.action;                                         // Phase 43
    out.smallHook = rod.smallHook; out.smallBoost = rod.smallBoost; out.smallMass = g.rodSmall.mass;
    out.lure = isLure(bait.id, data);
    out.swim = out.lure ? bait.swim : ''; out.sink = out.lure ? bait.sink : 1; out.maxDepthM = out.lure ? bait.maxDepthM : 99;
    out.vary = out.lure && bait.vary ? bait.vary : ''; out.dropM = out.lure && bait.dropM ? bait.dropM : 0; // Phase 69: rattle or kick; a dropshot's hook over its weight
    out.topDepthM = g.topDepthM;
    out.attract = rod.attract * bait.attract;
    out.bait = bait.id;
    out.reelSpeed = g.reels[s.reel].speed;
    var lt = lineTypeById(s.lineType, data);                            // Phase 53
    out.lineStrength = g.lines[s.line].strength * lt.strength;
    out.lineType = lt.id; out.lineRise = lt.rise; out.lineShake = lt.shake; out.lineHold = lt.hold; out.lineSeen = lt.seen; out.lineFeel = lt.feel;
    out.nightDepth = g.nightDepth;
    return out;
  }

  // The next thing to buy of a kind ('rod', 'reel', 'line'), or null.
  function nextItem(save, kind, data) {
    if (kind === 'rod') { var n = nextLadderRod(save, data); return n < 0 ? null : data.gear.rods[n]; }
    if (TIERED[kind]) return data.gear[TIERED[kind]][save.gear[kind] + 1] || null;
    return null;
  }

  // Buys the next tier (or the equipment) and equips it. Returns OK, MAXED, POOR or UNKNOWN.
  function buy(save, kind, data) {
    if (!TIERED[kind]) return UNKNOWN;
    if (kind === 'rod') { var n = nextLadderRod(save, data); return n < 0 ? MAXED : buyRod(save, n, data); }
    var item = nextItem(save, kind, data);
    if (!item) return MAXED;
    if (save.coins < item.cost) return POOR;
    save.coins -= item.cost;
    if (TIERED[kind]) save.gear[kind]++; else save.gear[kind] = true;
    return OK;
  }

  function buyBait(save, id, n, data) {
    var b = baitById(id, data);
    if (!b || b.unlimited) return UNKNOWN;
    if (save.coins < b.cost * n) return POOR;
    save.coins -= b.cost * n;
    save.baits[id] = (save.baits[id] || 0) + n;
    return OK;
  }

  // One bait goes on for a cast (a lure is not used up). Returns the id used.
  function useBait(save, data) {
    var b = baitInUse(save, data);
    if (!b.unlimited && !isLure(b.id, data)) save.baits[b.id]--;
    return b.id;
  }

  // Phase 43: the line snapped with lure id on it: one is gone. True if a lure was lost.
  function loseLure(save, id, data) {
    if (!isLure(id, data) || !(save.baits[id] > 0)) return false;
    save.baits[id]--;
    return true;
  }

  // Phase 96.4: true once the save has landed a fish (any species caught).
  function anyCaught(save) { for (var k in save.journal) if (save.journal[k].caught > 0) return true; return false; }

  // Phase 93.2: the part of the day ('dawn', 'day', 'dusk', 'night') of a game hour, from G.data.HOURS.
  function partOf(hour) {
    var H = G.data && G.data.HOURS, hh = Math.floor((((hour || 0) % 24) + 24) % 24);
    if (H) for (var k in H) if (H[k].indexOf(hh) >= 0) return k;
    return '';
  }

  // A landed fish into the save. c: {id, len, w, price, windowCatch, bait}; choice 'sell',
  // 'keep' or (Phase 51) 'release': let go, it still counts in the journal, and earns nothing.
  // Phase 94.2: the first-catch bonus for species sp: its base price, at least gear.firstCatch.min.
  function firstBonus(sp, data) { var r = data.gear.firstCatch; return r ? Math.max(r.min, Math.round(sp.price)) : 0; }
  function speciesById(id, data) { for (var i = 0; i < data.fish.length; i++) if (data.fish[i].id === id) return data.fish[i]; return null; }

  // Returns the first-catch bonus paid (Phase 94.2), 0 for a species caught before.
  function recordCatch(save, c, choice) {
    var j = save.journal[c.id], first = !j || !j.caught, sp = first ? speciesById(c.id, G.data) : null, bonus = first && sp ? firstBonus(sp, G.data) : 0;
    if (!j) j = save.journal[c.id] = { caught: 0, bestLen: 0, bestW: 0, hints: [], seen: true, phantom: false };
    j.caught++; j.seen = true; j.phantom = false;
    if (c.len > j.bestLen) { j.bestLen = c.len; j.bestAt = partOf(save.clock); }   // Phase 93.2: the part of the day of the best catch
    if (c.w > j.bestW) j.bestW = c.w;
    if (c.windowCatch) save.flags.windowCatch[c.windowCatch] = true;
    if (c.w > 0 && G.data.SIZE_CLASSES) {                                          // Phase 85: the size classes caught (for stocking the pond)
      var cls = G.data.SIZE_CLASSES[G.data.sizeClass(c.w)].id;
      if (!j.sizes) j.sizes = [];
      if (j.sizes.indexOf(cls) < 0) j.sizes.push(cls);
      j.sized = (j.sized || 0) + 1;
    }
    if (c.bait) { if (!j.took) j.took = []; if (j.took.indexOf(c.bait) < 0) j.took.push(c.bait); } // Phase 43: what it was caught on
    if (choice === 'sell') save.coins += c.price;
    else if (choice === 'release') j.released = (j.released || 0) + 1;
    else save.kept.push({ id: c.id, len: c.len, w: c.w });
    save.coins += bonus;
    return bonus;
  }

  // OK when the location can be bought now; MAXED if already open; POOR; LOCKED if its
  // condition is not met yet. Cost and condition come from the location's own file:
  // need.windowCatch is 'any' (any clock window) or a window id (the Red Room's catch).
  function canUnlock(save, locId, data) {
    var L = data.locations[locId];
    if (!L) return UNKNOWN;
    if (save.unlocks[locId]) return MAXED;
    var w = L.need && L.need.windowCatch;
    if (w) {
      var met = false;
      for (var k in save.flags.windowCatch) if (w === 'any' || k === w) met = true;
      if (!met) return LOCKED;
    }
    if (L.need && L.need.seaSeen && !(save.flags && save.flags.seaSeen)) return LOCKED; // Phase 80: the ice opens after a sea visit
    var nf = L.need && L.need.fish; // a specific species caught (V6, Phase 14)
    if (nf && !(save.journal[nf] && save.journal[nf].caught > 0)) return LOCKED;
    if (save.coins < L.cost) return POOR;
    return OK;
  }

  function unlock(save, locId, data) {
    var r = canUnlock(save, locId, data);
    if (r !== OK) return r;
    save.coins -= data.locations[locId].cost;
    save.unlocks[locId] = true;
    return OK;
  }

  // The next cabin restoration stage (V9): OK, MAXED or POOR.
  function restoreCabin(save, data) {
    var next = data.gear.cabin[save.cabinLevel + 1];
    if (!next) return MAXED;
    if (save.coins < next.cost) return POOR;
    save.coins -= next.cost;
    save.cabinLevel++;
    return OK;
  }

  return {
    TIERED: TIERED, OK: OK, MAXED: MAXED, POOR: POOR, LOCKED: LOCKED, UNKNOWN: UNKNOWN,
    partOf: partOf, anyCaught: anyCaught, firstBonus: firstBonus, sizeFactor: sizeFactor, sizeQ: sizeQ, qRange: qRange, hookQ: hookQ, size: size, price: price, baitById: baitById, isLure: isLure, baitInUse: baitInUse, effects: effects,
    ownsRod: ownsRod, nextLadderRod: nextLadderRod, buyRod: buyRod, useRod: useRod, loseLure: loseLure,
    iceAll: iceAll, buySnow: buySnow, onIce: onIce, iceHook: iceHook, rodInHand: rodInHand,
    lineTypeById: lineTypeById, ownsLineType: ownsLineType, buyLineType: buyLineType, useLineType: useLineType,
    nextItem: nextItem, buy: buy, buyBait: buyBait, useBait: useBait, recordCatch: recordCatch,
    canUnlock: canUnlock, unlock: unlock, restoreCabin: restoreCabin
  };
})();
