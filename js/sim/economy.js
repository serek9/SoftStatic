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

  function price(sp, q, data) {
    return Math.round(sp.price * data.gear.economy.rarityMult[sp.rarity] * sizeFactor(q, data));
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
  // Buys rod i and puts it in hand: OK, MAXED (owned), POOR or UNKNOWN.
  function buyRod(save, i, data) {
    var rod = data.gear.rods[i];
    if (!rod) return UNKNOWN;
    if (ownsRod(save, i)) return MAXED;
    if (save.coins < rod.cost) return POOR;
    save.coins -= rod.cost;
    save.gear.rods.push(i);
    save.gear.rod = i;
    return OK;
  }
  // Takes an owned rod in hand: OK or LOCKED (not owned).
  function useRod(save, i) {
    if (!ownsRod(save, i)) return LOCKED;
    save.gear.rod = i;
    return OK;
  }

  // The bait that will actually go on the hook: the equipped one if any is left, else worms.
  function baitInUse(save, data) {
    var b = baitById(save.gear.bait, data);
    if (!b || (!b.unlimited && !(save.baits[b.id] > 0))) b = data.gear.baits[0];
    return b;
  }

  // Fills out (reused object) with everything the equipped gear does.
  function effects(save, data, out) {
    var g = data.gear, s = save.gear, rod = g.rods[s.rod], bait = baitInUse(save, data);
    out.castMax = rod.castMax;
    out.maxMass = rod.maxMass;
    out.rodAction = rod.action;                                         // Phase 43
    out.smallHook = rod.smallHook; out.smallBoost = rod.smallBoost; out.smallMass = g.rodSmall.mass;
    out.lure = isLure(bait.id, data);
    out.swim = out.lure ? bait.swim : ''; out.sink = out.lure ? bait.sink : 1; out.maxDepthM = out.lure ? bait.maxDepthM : 99;
    out.topDepthM = g.topDepthM;
    out.attract = rod.attract * bait.attract;
    out.rareBoost = bait.rareBoost;
    out.bait = bait.id;
    out.reelSpeed = g.reels[s.reel].speed;
    out.lineStrength = g.lines[s.line].strength;
    out.nightDepth = s.lantern ? g.lantern.nightDepth : g.nightDepth;
    out.depthBands = s.depthFinder ? g.depthFinder.bands : 0;
    return out;
  }

  // The next thing to buy of a kind ('rod', 'reel', 'line', 'lantern', 'depthFinder'), or null.
  function nextItem(save, kind, data) {
    if (kind === 'rod') { var n = nextLadderRod(save, data); return n < 0 ? null : data.gear.rods[n]; }
    if (TIERED[kind]) return data.gear[TIERED[kind]][save.gear[kind] + 1] || null;
    if (kind === 'lantern' || kind === 'depthFinder') return save.gear[kind] ? null : data.gear[kind];
    return null;
  }

  // Buys the next tier (or the equipment) and equips it. Returns OK, MAXED, POOR or UNKNOWN.
  function buy(save, kind, data) {
    if (!TIERED[kind] && kind !== 'lantern' && kind !== 'depthFinder') return UNKNOWN;
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

  // A landed fish into the save. c: {id, len, w, price, hintRefs, windowCatch}; choice 'sell' or 'keep'.
  function recordCatch(save, c, choice) {
    var j = save.journal[c.id];
    if (!j) j = save.journal[c.id] = { caught: 0, bestLen: 0, bestW: 0, hints: [], seen: true, phantom: false };
    j.caught++; j.seen = true; j.phantom = false;
    if (c.len > j.bestLen) j.bestLen = c.len;
    if (c.w > j.bestW) j.bestW = c.w;
    for (var i = 0; i < c.hintRefs.length; i++) if (j.hints.indexOf(c.hintRefs[i]) < 0) j.hints.push(c.hintRefs[i]);
    if (c.windowCatch) save.flags.windowCatch[c.windowCatch] = true;
    if (c.bait) { if (!j.took) j.took = []; if (j.took.indexOf(c.bait) < 0) j.took.push(c.bait); } // Phase 43: what it was caught on
    if (choice === 'sell') save.coins += c.price;
    else save.kept.push({ id: c.id, len: c.len, w: c.w });
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
    sizeFactor: sizeFactor, price: price, baitById: baitById, isLure: isLure, baitInUse: baitInUse, effects: effects,
    ownsRod: ownsRod, nextLadderRod: nextLadderRod, buyRod: buyRod, useRod: useRod, loseLure: loseLure,
    nextItem: nextItem, buy: buy, buyBait: buyBait, useBait: useBait, recordCatch: recordCatch,
    canUnlock: canUnlock, unlock: unlock, restoreCabin: restoreCabin
  };
})();
