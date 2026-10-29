var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Pines (V6.3): an autumn woodland lake. An abandoned road runs into the water, a
// yellow traffic light blinks over it (faster as a clock window nears, fastest inside one),
// an owl sits on a dead branch, and a diner and its empty parking lot glow across the lake
// under a fluorescent lamp. The moving parts are drawn by the 'pines' scenery module
// (js/scene/scenery.js); everything here is data.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.pines = {
  id: 'pines',
  name: 'The Pines',
  cost: 1500,
  width: 1300,
  waterY: 112,
  maxDepth: 112,
  seed: 6271,
  start: 200,
  scenery: 'pines',

  layers: [
    { id: 'ridge', kind: 'mountains', parallax: 0.08, base: 96, amp: 40, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_far', kind: 'fog', parallax: 0.18, y: 90, h: 12, color: 'fog_mid', alpha: 0.18, drift: 1 },
    { id: 'autumn', kind: 'forest', parallax: 0.25, base: 104, height: 22, gap: [2, 6], mix: { round: 0.65, pine: 0.35 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'leaf_rust', lit: 'leaf_gold', trunk: 'wood_dark' } } },
    // The far shore: the diner (neon sign) and its parking lot (fluorescent lamps).
    { id: 'farshore', kind: 'farshore', parallax: 0.35, color: 'night_deep', base: 106,
      features: [{ kind: 'diner', x: 250 }, { kind: 'lot', x: 296, lamps: 3 }] },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 102, h: 9, color: 'fog_light', alpha: 0.12, drift: 2 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 32, gap: [24, 70], mix: { round: 0.6, pine: 0.4 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'leaf_rust', lit: 'leaf_gold', trunk: 'wood_dark' } } },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 3, reeds: 0.7, rockEvery: 44 },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only (see loc_fog.js).
  sky: { moonX: 200, glowX: 40 },
  mist: { h: 5, alpha: 0.07, drift: 2.5 },

  // The pier has the same seed as Fogbound's, so it is the same pier, plank for plank (11.4).
  // signal: blinks every `period` s; within `lead` game hours of a clock window it speeds up
  // toward `fast`, and inside a window it blinks at `fast`.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 330, seed: 3301 },
    { id: 'signal', kind: 'signal', x: 640, period: 1.4, fast: 0.45, lead: 1 },
    { id: 'road', kind: 'road', x: 900 },
    { id: 'owl_branch', kind: 'owl_branch', x: 1170 }
  ],

  underwater: {
    bottomAmp: 40, rock: 'stone_dark', silt: 'rust_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.04, shaftEvery: 160
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 330, r: 36 },
    { id: 'under_light', kind: 'open', x: 640, r: 30 },
    { id: 'lane_deep', kind: 'legendary', x: 770, r: 22, legend: 4, where: 'where the road\'s lane runs deep, past the light' },
    { id: 'drowned_road', kind: 'open', x: 900, r: 34 },
    { id: 'culvert', kind: 'hidden', x: 1030, r: 22, attract: 1.6, rare: 2 }
  ]
};
