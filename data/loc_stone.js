var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Stonehorn River (Phase 74, PLAN_WATERS.md 2; the reference's Grizzlyridge River): a cold
// mountain river of the north Pacific slope under snowy peaks and spruce. Two reaches: Boulder
// Run (rapids, a fast current) and Osprey Bluff (a deep green pool under a cliff). Phase 74
// paints it with the existing layer kinds; the white water, the bluff and the nest are Phase 77.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.stone = {
  id: 'stone',
  name: 'Stonehorn River',
  cost: 3400,
  width: 1300,
  waterY: 112,
  maxDepth: 32,
  seed: 8423,
  start: 170, // just past the pier's reach, so arriving does not open its panel
  dock: { x: 96, reach: 60 },
  water: 'river',
  reaches: [
    { id: 'boulder_run', name: 'Boulder Run', x: [0, 700] },
    { id: 'osprey_bluff', name: 'Osprey Bluff', x: [700, 1300] }
  ],
  // A choppy, quick surface (view px; see loc_fog.js).
  swell: { amp: 2.4, mirror: 1.3, waves: [[40, 28, 0.45], [21, 18, 0.35], [10, 12, 0.2]] },
  // About half again Blackwater's current (G.data.riverDrift); per reach in Phase 77.
  current: { dir: 1, speed: 4.6, ramp: 2, sway: 0.5, period: 6, slack: 0.45, bottom: 0.25 },
  drift: function (seed, t, depth, onBottom) { return G.data.riverDrift(this, seed, t, depth, onBottom); },

  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.05, base: 90, amp: 62, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_high', kind: 'fog', parallax: 0.1, y: 70, h: 18, color: 'fog_mid', alpha: 0.14, drift: 0.8 },
    { id: 'ridge', kind: 'mountains', parallax: 0.16, base: 102, amp: 30, color: 'mount_mid', lit: 'mount_lit', dark: 'night_deep', haze: 'fog_dark' },
    { id: 'spruce', kind: 'forest', parallax: 0.3, base: 106, height: 22, gap: [2, 5], mix: { spruce: 0.7, pine: 0.3 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 98, h: 10, color: 'fog_light', alpha: 0.12, drift: 2.6 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 40, gap: [12, 44], mix: { spruce: 0.6, pine: 0.25, dead: 0.15 }, place: 8431,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' } } },
    { id: 'bank', kind: 'bank', parallax: 0.7, height: 6, reeds: 0.15, rockEvery: 12, reedH: 10, place: 8447, trunks: 2,
      rock: { dark: 'rock_dark', mid: 'rock', lit: 'rock_lit' }, features: [{ kind: 'posts', x: 90, n: 3 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 120, glowX: 260 },
  mist: { h: 6, alpha: 0.12, drift: 3.4 },
  life: {
    under: { cray: 3, snail: 2, fry: 4, tad: 0, turtle: false, eel: false, mussel: 2, caddis: true, litter: ['lure'], roots: 1, tree: 0, ribbon: 0.01, fern: 0.004, lily: 0, algae: 0.3 },
    above: {
      ducks: { p: 0.9, x: [700, 1150], young: 2, hours: [[6, 19.5]] },
      heron: { x: [1150, 1270], hours: [[5, 10], [16.5, 21]] },
      kingfisher: { perches: [{ x: 420, y: 30 }, { x: 980, y: 28 }], hours: [[6.5, 18.5]] },
      deer: { layer: 'bank', x: [520, 700], hours: [[5, 7.5], [17.5, 20]] }
    }
  },

  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 8402 },
    { id: 'snag_a', kind: 'snag', x: 540 }
  ],

  underwater: {
    bottomAmp: 12, rock: 'stone_dark', silt: 'stone_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.02, shaftEvery: 150,
    snags: [{ x: 540, top: 0 }, { x: 860, top: 18 }]
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 32 },
    { id: 'pocket_water', kind: 'open', x: 380, r: 26 },
    { id: 'bluff_pool', kind: 'open', x: 940, r: 30, attract: 1.3 },
    { id: 'undercut', kind: 'hidden', x: 1160, r: 22, attract: 1.6 }
  ]
};
