var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Economy (V8): prices, gear effects, purchases, bait use, catches into the save,
// location unlock checks and cabin restoration. Gear tiers are linear upgrades:
// save.gear.rod = 2 means the Graphite Rod is owned and in use.
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

  function baitById(id, data) {
    var b = data.gear.baits;
    for (var i = 0; i < b.length; i++) if (b[i].id === id) return b[i];
    return null;
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
    if (TIERED[kind]) return data.gear[TIERED[kind]][save.gear[kind] + 1] || null;
    if (kind === 'lantern' || kind === 'depthFinder') return save.gear[kind] ? null : data.gear[kind];
    return null;
  }

  // Buys the next tier (or the equipment) and equips it. Returns OK, MAXED, POOR or UNKNOWN.
  function buy(save, kind, data) {
    if (!TIERED[kind] && kind !== 'lantern' && kind !== 'depthFinder') return UNKNOWN;
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

  // One bait goes on for a cast. Returns the id used.
  function useBait(save, data) {
    var b = baitInUse(save, data);
    if (!b.unlimited) save.baits[b.id]--;
    return b.id;
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
    sizeFactor: sizeFactor, price: price, baitById: baitById, baitInUse: baitInUse, effects: effects,
    nextItem: nextItem, buy: buy, buyBait: buyBait, useBait: useBait, recordCatch: recordCatch,
    canUnlock: canUnlock, unlock: unlock, restoreCabin: restoreCabin
  };
})();
