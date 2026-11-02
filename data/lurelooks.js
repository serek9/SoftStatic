var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The lures' looks (Phase 73, PLAN_SPECIES.md 3.6), painted by js/gfx/luregen.js: one entry per
// lure id in data/gear.js (--validate fails on a lure without one). kind: the builder (float,
// crank, spinner, spoon, dropshot, wacky, jig, top, blade, glide, swim); len: the icon's px for
// end to end (about 38, as the reference's icons; a float's is its height; the size variants
// larger); uw: the same under water, in view px. The rest is the kind's own: ramps of palette keys (dark
// to light), lip lengths, blades, weights. The size variants (Big, Deep, Heavy, Huge) differ in
// size, lip, weight and colourway. Our own drawings of the common patterns: shad, firetiger,
// perch, a red-and-white spoon, a green-pumpkin worm, a rainbow-trout glide.
G.data = G.data || {};

(function () {
  var RED = ['blood', 'crimson', 'neon_red', 'pink_hi'], WHITE = ['paper_dark', 'paper', 'bone', 'ivory'];
  var CHROME = ['chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit'], GOLD = ['rust', 'leaf_gold', 'brass_hi', 'lamp_glow'];
  var CHART = ['lure_chart_0', 'lure_chart_1', 'lure_chart_2', 'lure_chart_3'], ORANGE = ['orange_dark', 'orange', 'orange_hi', 'orange_lit'];
  var BLACK = ['outline', 'ink', 'stone_dark', 'stone'], OLIVE = ['olive_dark', 'olive', 'olive_hi', 'olive_lit'];
  var PINK = ['pink_dark', 'pink', 'pink_hi', 'pink_lit'], DENIM = ['denim_dark', 'denim', 'denim_hi', 'denim_lit'];
  var TEAL = ['teal_dark', 'teal', 'teal_hi', 'teal_lit'], UMBER = ['umber_deep', 'umber_dark', 'umber', 'umber_hi'];
  var LEAD = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'], WORM = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'];
  var PERCH = ['fish_perch_1', 'fish_perch_2', 'fish_perch_3', 'fish_perch_4'], TROUT = ['fish_rainbow_0', 'fish_rainbow_1', 'fish_rainbow_2', 'fish_rainbow_3'];
  var TROUT_B = ['fish_rainbow_3', 'fish_rainbow_4', 'fish_rainbow_5', 'ivory'], GILL = ['fish_blue_0', 'fish_blue_1', 'fish_blue_2', 'fish_blue_3'];
  var BREAST = ['fish_breast_0', 'fish_breast_1', 'fish_breast_2', 'fish_breast_3'], SHAD = ['fish_tshad_0', 'fish_tshad_1', 'fish_tshad_2', 'fish_tshad_3'];
  var SILVER_B = ['chrome_hi', 'fish_tshad_4', 'chrome_lit', 'ivory'], LIP = ['stone', 'stone_hi', 'stone_lit', 'fog_light'];

  G.data.lureLooks = {
    // Floats: the classic red-and-white ball; the slip float long and slim, orange over black.
    bobber: { kind: 'float', len: 34, uw: 9, shape: 'ball', top: RED, bottom: WHITE, stem: ['paper_dark', 'bone'], worm: WORM },
    deep_bobber: { kind: 'float', len: 40, uw: 12, shape: 'pencil', top: ORANGE, bottom: BLACK, ring: WHITE, stem: ['stone', 'stone_hi'], worm: WORM },
    // Crankbaits: a small shad with a short square lip; a firetiger with a longer one; a perch
    // with the long diving bill.
    crankbait: { kind: 'crank', len: 30, uw: 10, lip: 4.5, lipAngle: 0.9, fat: 1.05, back: DENIM, belly: SILVER_B, throat: 'neon_red', scales: 'chrome_lit' },
    big_crankbait: { kind: 'crank', len: 36, uw: 13, lip: 7, lipAngle: 0.7, back: CHART, belly: ORANGE, bars: 5, barKey: 'olive_dark', iris: ['blood', 'neon_red', 'pink_hi'] },
    deep_crankbait: { kind: 'crank', len: 44, uw: 16, lip: 12, lipAngle: 0.42, fat: 0.92, back: PERCH, belly: ['fish_perch_4', 'fish_perch_5', 'cream', 'ivory'], bars: 6, barKey: 'olive_dark', throat: 'orange_hi', lipRamp: ['chrome', 'chrome_hi', 'chrome_lit', 'fog_light'] },
    // Spinnerbaits: one gold willow over a chartreuse-and-white skirt; tandem silver blades over white.
    spinnerbait: { kind: 'spinner', len: 32, uw: 12, blade: GOLD, head: CHART, skirt: [CHART, WHITE, CHART, ['lure_chart_1', 'lure_chart_3', 'ivory']], collar: RED },
    big_spinnerbait: { kind: 'spinner', len: 40, uw: 16, tandem: true, blade: CHROME, blade2: GOLD, bladeLen: 1.12, bladeW: 1.1, head: WHITE, skirt: [WHITE, ['chrome', 'chrome_hi', 'chrome_lit'], WHITE, ['lav', 'lav_hi', 'lav_lit']], collar: RED },
    // Spoons: gold with a red stripe; heavy hammered chrome with blue dots; huge red-and-white stripes.
    small_spoon: { kind: 'spoon', len: 24, uw: 8, metal: GOLD, stripe: 'neon_red' },
    heavy_spoon: { kind: 'spoon', len: 32, uw: 11, w: 1.05, metal: CHROME, hammer: true, dots: [[-7, -2.2, 1.3], [-7, 2.2, 1.3], [-2, 0, 1.2], [3.6, 0, 0.9]], dotRamp: DENIM, hook: 1.1 },
    huge_spoon: { kind: 'spoon', len: 40, uw: 14, w: 1.1, metal: WHITE, stripes: 4, stripeKey: 'crimson', hook: 1.2 },
    // Dropshots: a pink finesse worm over a small drop weight; a longer brown worm with a
    // chartreuse tail over a heavy teardrop.
    dropshot: { kind: 'dropshot', len: 24, uw: 12, worm: PINK, weight: LEAD, wt: 0.9, wormLen: 0.9 },
    heavy_dropshot: { kind: 'dropshot', len: 27, uw: 14, worm: UMBER, tail: CHART, weight: ['chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit'], wt: 1.4, wormLen: 1.05 },
    // The wacky worm: green pumpkin with flakes, an O-ring round its middle.
    wacky_worm: { kind: 'wacky', len: 34, uw: 12, worm: OLIVE, flake: 'leaf_gold', oring: 'outline' },
    // Jigs: a red round head and a white grub with a chartreuse tail; a brown football head and
    // a craw with orange claw tips.
    jighead: { kind: 'jig', len: 30, uw: 11, head: 'round', headRamp: RED, body: WHITE, tail: CHART, collar: CHART },
    deep_jighead: { kind: 'jig', len: 38, uw: 14, head: 'football', football: true, headRamp: UMBER, body: OLIVE, trailer: 'craw', tip: 'orange_hi', flake: 'leaf_gold', collar: ['umber_deep', 'umber_dark', 'umber'] },
    // The topwater: a frog popper, olive with dark spots over a cream belly, a red-and-white tail.
    topwater: { kind: 'top', len: 34, uw: 11, back: OLIVE, belly: ['paper', 'bone', 'cream', 'ivory'], spots: [[-6, -3, 1.4], [-1, -3.4, 1.6], [4, -3, 1.3], [-3.5, -0.6, 1.1], [1.8, -0.2, 1.0]], spotRamp: ['olive_dark', 'leaf_dark'], throat: 'neon_red', feather: [RED, WHITE, RED, WHITE, RED] },
    // Bladebaits: silver; gold with a black back; heavy chrome with a chartreuse back and dots.
    medium_blade: { kind: 'blade', len: 28, uw: 9, metal: CHROME, lead: LEAD },
    large_blade: { kind: 'blade', len: 34, uw: 11, metal: GOLD, backBand: BLACK, lead: ['rust_dark', 'rust', 'rust_hi', 'leaf_gold'] },
    heavy_blade: { kind: 'blade', len: 40, uw: 14, metal: CHROME, backBand: CHART, dots: 'outline', lead: BLACK, iris: ['rust', 'signal_amber', 'lamp_glow'] },
    // Glidebaits: a rainbow trout (its pink band, black spots); a big gizzard shad, its dark shoulder spot.
    glidebait: { kind: 'glide', len: 38, uw: 13, back: TROUT, belly: TROUT_B, band: 'fish_pinkband_2', spots: 'outline', fin: ['fish_finol_0', 'fish_finol_1', 'fish_finol_2', 'fish_finol_3'] },
    deep_glidebait: { kind: 'glide', len: 46, uw: 17, back: SHAD, belly: SILVER_B, shoulder: 'outline', fin: ['chrome_dark', 'chrome', 'chrome_hi', 'fog_light'] },
    // Swimbaits: a silver minnow with a blue back and a dark stripe on a lead head; a bluegill.
    minnow_swimbait: { kind: 'swim', len: 32, uw: 11, back: TEAL, belly: SILVER_B, stripe: 'teal_dark', head: LEAD, tail: TEAL },
    bluegill_swimbait: { kind: 'swim', len: 42, uw: 15, deep: true, back: GILL, belly: BREAST, bars: 6, barKey: 'fish_blue_1', ear: ['outline', 'ink'], fin: ['fish_blue_0', 'fish_blue_1', 'fish_blue_2'], tail: GILL }
  };
})();
