var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Back Pond (Phase 83, PLAN_WINTER.md 2.4; the reference's Old Moose Valley pond): a small
// spring-fed pond behind our cabin at Fogbound's pier, reached only through the cabin's back
// door (it is not a stop on the chart: `pond` marks it). A short dock runs out under the
// cabin's back windows at its east end, where the boat is moored; reeds and lilies along the
// shores, a stream coming in over a rock lip at its west end, a meadow and woods beyond.
// At first it is choked: the stream is jammed with branches and an old tyre, the water brown
// and still, and trash lies on the bed (Phase 84 cleans it; Phase 85 stocks it). It has no wild
// fish: what bites here is what you put in (Phase 85). No liminal layer (PLAN_WINTER.md 2.1).
// pond: the stream's lip (world x), the stocking capacity (Phase 85).
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.pond = {
  id: 'pond',
  name: 'The Back Pond',
  cost: 0,
  width: 400,
  waterY: 112,
  maxDepth: 24,
  seed: 8311,
  start: 280,
  dock: { x: 340, reach: 46, cabin: true }, // the cabin's back door is up this dock
  water: 'lake',
  scenery: 'pond', // js/scene/pond.js
  pond: { stream: 18, cap: 12 },
  reaches: [{ id: 'back_pond', name: 'The Back Pond', x: [0, 400] }],
  // Small and sheltered: barely a ripple (view px; see loc_fog.js).
  swell: { amp: 0.6, mirror: 0.9, waves: [[80, 6, 0.5], [36, -4, 0.3], [20, 3, 0.2]] },
  current: { lake: true, speed: 0.12, wind: 0.05, sway: 0.2, ramp: 4, period: 200, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.05, base: 96, amp: 30, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_far', kind: 'fog', parallax: 0.16, y: 88, h: 14, color: 'fog_mid', alpha: 0.16, drift: 0.8 },
    { id: 'far_woods', kind: 'forest', parallax: 0.26, base: 104, height: 22, gap: [2, 5], mix: { pine: 0.55, spruce: 0.3, birch: 0.15 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 101, h: 8, color: 'fog_light', alpha: 0.1, drift: 1.6 },
    // The meadow beyond the far shore: a few trees standing apart in the grass.
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 30, gap: [18, 60], mix: { birch: 0.4, pine: 0.35, spruce: 0.15, dead: 0.1 }, place: 8341,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 4, base: 110, reeds: 1, rockEvery: 44, place: 8357, pads: 6, trunks: 1, cattails: 5,
      features: [{ kind: 'duckbox', x: 150 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 120, glowX: 220 },
  mist: { h: 6, alpha: 0.12, drift: 1.6 },
  life: {
    // Its own fry and tadpoles; no crayfish until it is clean (js/scene/life.js asks the pond).
    under: { cray: 0, snail: 5, fry: 3, tad: 3, turtle: false, eel: false, mussel: 4, caddis: true, litter: [], roots: 1, tree: 0, ribbon: 0.03, fern: 0.03, lily: 6, algae: 0.8 },
    above: {
      ducks: { p: 0.9, x: [60, 300], young: 3, hours: [[5, 21]] },
      heron: { x: [40, 140], hours: [[4.5, 9]] },                               // at dawn
      dragonflies: { n: 5, x: [[10, 120], [200, 300]], hours: [[9, 18]] },
      frog: { hours: [[7, 2]] },
      striders: { n: 5, x: [[10, 140], [180, 300]], hours: [[8, 18.5]] },
      // The moose comes to drink and eat weed at the far shore at dawn and dusk (layer px).
      moose: { layer: 'shore', x: [40, 230], hours: [[4.5, 8], [17, 20.5]] }
    }
  },

  landmarks: [
    // The dock under the cabin's back windows (from the east shore), the cabin's back wall
    // above it (half its width, world px), the stream's rock lip at the west end.
    { id: 'pier', kind: 'pier', x: 340, seed: 8302, from: 'right' },
    { id: 'cabin', kind: 'backwall', x: 386, half: 24 },
    { id: 'stream', kind: 'stream', x: 18, half: 18, h: 14 }
  ],

  underwater: {
    bottomAmp: 10, rock: 'stone_dark', silt: 'umber_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.12, shaftEvery: 120,
    // The bed ([x, depth px], 4 px a metre): shallow under the stream's lip, a soft bowl to
    // 6 m in the middle, rising to 2.5 m at the dock.
    shape: [[0, 6], [40, 10], [110, 20], [190, 24], [260, 22], [330, 12], [400, 6]],
    weedBeds: [[20, 120, 0.4], [280, 380, 0.3]]
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 340, r: 30 },
    { id: 'stream_mouth', kind: 'open', x: 40, r: 26, attract: 1.3 }
  ]
};
