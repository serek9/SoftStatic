var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fogbound Lake (V6.1): the starting location.
// x values are world pixels, except layer `features`, which are in that layer's own pixels
// (a layer with parallax p is 320 + (width - 320) × p wide). Depths are pixels (metres = px × 0.25).
G.data = G.data || {};
G.data.locations = G.data.locations || {};

// Phase 22: the lakes' current, a slow wind drift. px/s the lure drifts at t s after landing,
// on the cast with this seed, at depth px (onBottom: it only creeps), with wind 0..1 (the
// grey hours). Phase 26: the seed sets which way the wind blows for the cast, and its strength
// sways by ±sway over `period` s, so every cast drifts (it used to turn through zero); with
// turns: true (the Red Room) it turns round instead, once in `period` s. It builds over `ramp`
// s and slows with depth (slack: the share lost at maxDepth). Pure, like the creek's drift
// (11.1): a cast's path is fixed by its seed, the clock and the fixed dt.
G.data.lakeDrift = function (L, seed, t, depth, onBottom, wind) {
  var c = L.current, hs = Math.imul(seed | 0, 0x9e3779b1) >>> 0, ph = hs / 4294967296 * 6.2832, dir;
  if (c.turns) dir = Math.tanh(3 * Math.cos(ph + t * 6.2832 / c.period));
  else dir = ((hs >>> 7) & 1 ? 1 : -1) * (1 + c.sway * Math.sin(ph + t * 6.2832 / c.period));
  var v = (c.speed + c.wind * (wind || 0)) * (1 - Math.exp(-t / c.ramp)) * dir;
  v *= 1 - c.slack * Math.min(1, Math.max(0, depth) / L.maxDepth);
  return v * (onBottom ? c.bottom : 1);
};
G.data.locations.fog = {
  id: 'fog',
  name: 'Fogbound Lake',
  cost: 0,
  width: 1200,
  waterY: 112,
  maxDepth: 96,
  seed: 4021,
  start: 180,
  // Phase 20: the surface's swell, in the 640×360 view's pixels: amp is the largest height,
  // waves are [wavelength px, speed px/s, share of amp]; mirror scales how much it shivers
  // the reflection. Fogbound is low and slow.
  swell: { amp: 1.3, mirror: 0.8, waves: [[96, 9, 0.5], [41, -6, 0.3], [23, 4, 0.2]] },
  // Phase 22: a slow wind drift (G.data.lakeDrift above); lake: true, no current streaks. Phase 26: one way per cast.
  current: { lake: true, speed: 0.25, wind: 0.1, sway: 0.2, ramp: 4, period: 240, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  // Back to front. Every layer is baked once and only drawn with drawImage.
  // Phase 15: painted layers (js/gfx/paint.js): far peaks, a nearer ridge with the tower and
  // the mast, a pine forest, tall pines and birches near the water, and a reedy, rocky shore.
  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.05, base: 92, amp: 50, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_high', kind: 'fog', parallax: 0.08, y: 66, h: 22, color: 'fog_mid', alpha: 0.16, drift: 0.7 },
    { id: 'ridge', kind: 'mountains', parallax: 0.14, base: 102, amp: 24, color: 'mount_mid', lit: 'mount_lit', dark: 'night_deep', haze: 'fog_dark', featureKey: 'night_deep',
      features: [{ kind: 'tower', x: 120 }, { kind: 'mast', x: 330 }] },
    { id: 'fog_far', kind: 'fog', parallax: 0.2, y: 84, h: 20, color: 'fog_mid', alpha: 0.32, drift: 1.2 },
    { id: 'trees', kind: 'forest', parallax: 0.3, base: 106, height: 17, gap: [2, 6], mix: { pine: 0.75, spruce: 0.25 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 97, h: 12, color: 'fog_light', alpha: 0.16, drift: 2.4 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 36, gap: [8, 46], mix: { pine: 0.62, spruce: 0.22, birch: 0.08, dead: 0.08 }, place: 4417,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    // Phase 49: the shore's things, scattered from its own placement seed (place): pads on the
    // water, fallen trunks, cattail clumps; features stand where the data puts them (layer px).
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 4, reeds: 0.8, rockEvery: 38, place: 7741, pads: 7, trunks: 2, cattails: 4,
      features: [{ kind: 'posts', x: 180, n: 5 }, { kind: 'moored', x: 236 }, { kind: 'lodge', x: 560 }, { kind: 'duckbox', x: 700 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only. sky: where the moon and the dusk glow sit (sky px); mist: a low band on
  // the water that drifts over the boat (fog layers drift by their own `drift`, px/s).
  sky: { moonX: 92, glowX: 236 },
  mist: { h: 7, alpha: 0.13, drift: 3 },

  // Life (presentation only, js/scene/life.js). under (Phase 48): how many crayfish, snails,
  // fry clouds and tadpole clouds, whether a turtle and an eel live here, and what the bake
  // paints on the bed (mussels, caddis cases, litter, roots, a drowned tree, algae, ribbon and
  // fern weed per px, lily stems). above (Phase 49): who lives on the water, on the shore and
  // in the air, each with hours: [[from, to], ...] in game hours (wrapping past midnight), and
  // where: x [lo, hi] in its own layer's px (p: its parallax, 1 = the boat's distance),
  // perches {x, y: px above the waterline}, layer: the painted layer it walks on.
  life: {
    under: { cray: 7, snail: 8, fry: 5, tad: 2, turtle: true, eel: true, mussel: 10, caddis: false, litter: ['bottle', 'lure', 'bottle'], roots: 2, tree: 1, ribbon: 0.025, fern: 0.02, lily: 5, algae: 0.6 },
    above: {
      ducks: { p: 0.9, x: [330, 960], young: 4, hours: [[5, 21]] },
      heron: { x: [1060, 1170], hours: [[4.5, 10], [16, 22]] },
      kingfisher: { perches: [{ x: 985, y: 25 }, { x: 331, y: 26 }, { x: 560, y: 25 }], hours: [[6, 18.5]] },
      loon: { p: 0.85, x: [200, 880], hours: [[0, 24]], call: [[4.5, 6.5], [18, 21.5]] },
      dragonflies: { n: 5, x: [[20, 200], [1000, 1180]], hours: [[9, 17.5]] },
      frog: { hours: [[7, 2]] },
      striders: { n: 6, x: [[20, 180], [1020, 1180]], hours: [[8, 18.5]] },
      deer: { layer: 'shore', x: [300, 470], hours: [[4.75, 7.5], [17.5, 20.25]] },
      beaver: { layer: 'shore', hours: [[19, 5]] }
    }
  },

  // On the water at the boat's distance (parallax 1): x is where the landmark is centred.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 300, seed: 3301 }, // the same pier stands in The Pines (11.4)
    { id: 'marker_a', kind: 'marker', x: 560 },
    { id: 'wreck', kind: 'wreck', x: 770 },
    { id: 'marker_b', kind: 'marker', x: 985 }
  ],

  // The cross-section (V3.3). The bottom wanders between maxDepth - bottomAmp and maxDepth,
  // and touches maxDepth somewhere. shaftEvery is the spacing of light shafts in px.
  underwater: {
    bottomAmp: 24, rock: 'stone_dark', silt: 'wood_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.07, shaftEvery: 150
  },

  // Where casts land matters (sim/unease.js castBoost): attract (fish turn up sooner), rare
  // (× rare and legendary weights) and legend (× legendary weights) for a lure landing
  // within r px. kind 'hidden': the dog stares at it once (10.3). kind 'legendary': the dog
  // barks toward it while a legendary species lives here.
  spots: [
    { id: 'pier_shade', kind: 'open', x: 300, r: 36 },
    { id: 'channel', kind: 'open', x: 560, r: 40 },
    { id: 'wreck_hollow', kind: 'open', x: 770, r: 30 },
    { id: 'cold_hole', kind: 'legendary', x: 880, r: 22, legend: 4, where: 'over the cold hole, past the wreck' },
    { id: 'reed_gap', kind: 'hidden', x: 1110, r: 24, attract: 1.6, rare: 2 }
  ]
};
