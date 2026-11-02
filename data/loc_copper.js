var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Copperbend River (Phase 74, PLAN_WATERS.md 2; the reference's Goldenfork River): a slow
// lowland river running to the Great Lakes through farmland and hardwoods. Three reaches:
// The Split (two channels meet over a gravel riffle), Lodge Pool (still water above a beaver
// dam) and Hollow Reach (a deep bend under leaning maples, morning mist). Phase 74 paints it
// with the existing layer kinds; its own scenery (the riffle, the bridge, the dam) is Phase 77.
// Same units as loc_fog.js: world pixels, layer features in layer pixels, depths in px.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.copper = {
  id: 'copper',
  name: 'Copperbend River',
  cost: 800,
  width: 1400,
  waterY: 112,
  maxDepth: 40,
  seed: 7331,
  start: 170, // just past the pier's reach, so arriving does not open its panel
  dock: { x: 96, reach: 60 },
  water: 'river',
  reaches: [
    { id: 'the_split', name: 'The Split', x: [0, 470] },
    { id: 'lodge_pool', name: 'Lodge Pool', x: [470, 940] },
    { id: 'hollow_reach', name: 'Hollow Reach', x: [940, 1400] }
  ],
  // The surface's swell (view px; see loc_fog.js): a river's short ripple, running downstream.
  swell: { amp: 1.7, mirror: 1, waves: [[48, 18, 0.45], [25, 12, 0.35], [12, 8, 0.2]] },
  // A current like Blackwater's, a little faster (G.data.riverDrift in loc_creek.js).
  current: { dir: 1, speed: 3.4, ramp: 2.5, sway: 0.4, period: 8, slack: 0.5, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom) { return G.data.riverDrift(this, seed, t, depth, onBottom); },

  layers: [
    { id: 'hills', kind: 'mountains', parallax: 0.08, base: 96, amp: 22, color: 'mount_mid', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze', snow: 'mount_lit', snowDark: 'mount_mid' },
    { id: 'fog_far', kind: 'fog', parallax: 0.18, y: 92, h: 12, color: 'fog_mid', alpha: 0.2, drift: 0.9 },
    { id: 'far_woods', kind: 'forest', parallax: 0.28, base: 104, height: 18, gap: [2, 6], mix: { round: 0.6, poplar: 0.2, pine: 0.2 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'wood_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 100, h: 10, color: 'fog_light', alpha: 0.14, drift: 1.8 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 34, gap: [10, 40], mix: { round: 0.55, birch: 0.15, poplar: 0.15, dead: 0.05, pine: 0.1 }, place: 7343,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'moss', lit: 'moss_hi', trunk: 'wood_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    { id: 'bank', kind: 'bank', parallax: 0.7, height: 5, reeds: 0.9, rockEvery: 26, reedH: 16, place: 7351, trunks: 3, cattails: 4, pads: 2,
      features: [{ kind: 'posts', x: 90, n: 3 }, { kind: 'lodge', x: 470 }, { kind: 'moored', x: 820 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 180, glowX: 40 },
  mist: { h: 6, alpha: 0.11, drift: 2.2 },
  life: {
    under: { cray: 9, snail: 6, fry: 5, tad: 2, turtle: true, eel: false, mussel: 9, caddis: true, litter: ['bottle', 'lure'], roots: 4, tree: 0, ribbon: 0.03, fern: 0.01, lily: 2, algae: 0.5 },
    above: {
      ducks: { p: 0.9, x: [220, 1250], young: 3, hours: [[5.5, 20.5]] },
      heron: { x: [1180, 1320], hours: [[4.5, 10], [16, 21.5]] },
      kingfisher: { perches: [{ x: 330, y: 29 }, { x: 1010, y: 27 }], hours: [[6, 19]] },
      dragonflies: { n: 5, x: [[40, 300], [1100, 1380]], hours: [[9, 17.5]] },
      frog: { hours: [[8, 1]] },
      striders: { n: 5, x: [[500, 800]], hours: [[8, 18.5]] },
      deer: { layer: 'bank', x: [600, 760], hours: [[5, 7.75], [17.25, 20]] },
      beaver: { layer: 'bank', hours: [[18.5, 5.5]] }
    }
  },

  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 7302 },
    { id: 'sign', kind: 'sign', x: 50 }, // Phase 76: the signpost at the pier's shore end
    { id: 'snag_a', kind: 'snag', x: 380 },
    { id: 'snag_b', kind: 'snag', x: 1120 }
  ],

  underwater: {
    bottomAmp: 14, rock: 'stone_dark', silt: 'wood_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.05, shaftEvery: 180,
    snags: [{ x: 380, top: 0 }, { x: 560, top: 22 }, { x: 1120, top: 0 }, { x: 1240, top: 26 }]
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 34 },
    { id: 'riffle_tail', kind: 'open', x: 300, r: 30 },
    { id: 'dam_pool', kind: 'open', x: 700, r: 28, attract: 1.3 },
    { id: 'maple_hole', kind: 'hidden', x: 1180, r: 24, attract: 1.6 }
  ]
};
