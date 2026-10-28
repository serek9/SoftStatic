var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Gear and economy data (V8). Every item does something mechanical:
//   rod:   castMax (px a full cast reaches), maxMass (kg, D4: heavier fish never bite), attract
//   reel:  speed (D shrink while reeling a tired fish, V4)
//   line:  strength (how fast tension builds against a pulling fish, V4)
//   bait:  attract (fish turn up sooner) and rareBoost (rare and legendary weights)
//   lantern: deep fish show in colour at night; depth finder: depth bands on the HUD
// Costs are tuned with `node tools/balance.js --pacing` against the V8 targets.
G.data = G.data || {};
G.data.gear = {
  rods: [
    { id: 'rod_0', name: 'Cane Rod', cost: 0, castMax: 110, maxMass: 3, attract: 1.0 },
    { id: 'rod_1', name: 'Fibreglass Rod', cost: 90, castMax: 122, maxMass: 4.5, attract: 1.05 },
    { id: 'rod_2', name: 'Graphite Rod', cost: 420, castMax: 134, maxMass: 7, attract: 1.1 },
    { id: 'rod_3', name: 'Lacquered Rod', cost: 1400, castMax: 146, maxMass: 11, attract: 1.15 },
    { id: 'rod_4', name: 'The Long Rod', cost: 4200, castMax: 160, maxMass: 18, attract: 1.2 }
  ],
  reels: [
    { id: 'reel_0', name: 'Tin Reel', cost: 0, speed: 0.12 },
    { id: 'reel_1', name: 'Click Reel', cost: 70, speed: 0.15 },
    { id: 'reel_2', name: 'Brass Reel', cost: 300, speed: 0.19 },
    { id: 'reel_3', name: 'Quiet Reel', cost: 1100, speed: 0.24 },
    { id: 'reel_4', name: 'Reel That Hums', cost: 3600, speed: 0.30 }
  ],
  lines: [
    { id: 'line_0', name: 'Cotton Line', cost: 0, strength: 1.0 },
    { id: 'line_1', name: 'Nylon Line', cost: 40, strength: 1.25 },
    { id: 'line_2', name: 'Braided Line', cost: 260, strength: 1.6 },
    { id: 'line_3', name: 'Wire Leader', cost: 950, strength: 2.0 },
    { id: 'line_4', name: 'Hair-Fine Line', cost: 3200, strength: 2.6 }
  ],
  // cost is per bait; 0 with unlimited: true never runs out. label false: the shelf item
  // with no label and a strange price (V10.7); it is a real rare bait.
  baits: [
    { id: 'worm', name: 'Nightcrawlers', cost: 0, unlimited: true, attract: 1.0, rareBoost: 1.0 },
    { id: 'cricket', name: 'Crickets', cost: 3, attract: 1.25, rareBoost: 1.0 },
    { id: 'minnow', name: 'Minnows', cost: 6, attract: 1.4, rareBoost: 1.3 },
    { id: 'unlabelled', name: '', label: false, cost: 47, attract: 1.1, rareBoost: 3.0 }
  ],
  lantern: { id: 'lantern', name: 'Storm Lantern', cost: 250, nightDepth: 999 },     // px: no night silhouettes
  depthFinder: { id: 'depth_finder', name: 'Depth Finder', cost: 180, bands: 4 },  // m between bands on the HUD
  nightDepth: 56, // px (14 m): without the lantern, fish deeper than this show only as silhouettes at night

  // The fight model's constants (V4); sim/fight.js reads these.
  fight: {
    pull0: 1.2, pull1: 3, tired0: 1, tired1: 2.5,
    pullRise: 0.5, easeFall: 0.7, run: 0.03,
    tiredRise: 0.06, release: 0.45, recover: 0.03,
    slipT: 0.6, slipD: 0.1, escape: 3,
    d0: 0.6
  },

  // Prices (V8): base × rarityMult × sizeFactor, sizeFactor from sizeMin to sizeMax.
  economy: { rarityMult: { common: 1, uncommon: 2.5, rare: 8, legendary: 40 }, sizeMin: 0.7, sizeMax: 1.5 },

  // Location unlocks (V6). TODO(P11.1): each location file carries its own cost.
  unlocks: {
    fog: { cost: 0 },
    creek: { cost: 300 },
    pines: { cost: 1500 },
    red: { cost: 6000, windowCatch: true } // plus a catch made during a clock window
  },

  // Passive mode earns this share of active income (D5). The only place it is set.
  passive: { incomeMult: 0.6 }
};
