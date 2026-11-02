var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fish's anatomy specs (Phase 70, PLAN_SPECIES.md 3.5), painted by js/gfx/fishgen.js
// (paintSpec; the format is described there). One entry per species id in data/fish.js; a
// species with none keeps the placeholder painter until Phases 71-72. Body lengths run from the
// tail's root (x 0) to the snout (x 1), y down from the middle line; depths v run 0 (back) to 1
// (belly). Colours are palette keys (js/gfx/sprites.js, the fish_ ramps). Painted from the real
// fish and the reference icons for size and detail: our own drawing, facing right as the game's
// fish do.
G.data = G.data || {};

(function () {
  var FIN_OL = ['fish_finol_0', 'fish_finol_1', 'fish_finol_2', 'fish_finol_3'];
  var FIN_GR = ['fish_fingr_0', 'fish_fingr_1', 'fish_fingr_2', 'fish_fingr_3'];
  var FIN_OR = ['fish_orange_0', 'fish_orange_1', 'fish_orange_2', 'fish_orange_3'];
  function ramp(n) { return ['fish_' + n + '_0', 'fish_' + n + '_1', 'fish_' + n + '_2', 'fish_' + n + '_3', 'fish_' + n + '_4', 'fish_' + n + '_5']; }
  // The fins most of these share: a pelvic hanging back under the pectoral, a pectoral over the flank.
  function pelvic(x, len, r) { return { k: 'pelvic', x: x, v: 0.9, ang: 124, len: len * 1.4, spread: 46, prof: [0.7, 1, 0.9, 0.6], rays: 6, ramp: r }; }
  function pectoral(x, v, len, r) { return { k: 'pectoral', x: x + 0.01, v: v, ang: 172, len: len * 1.6, spread: 64, prof: [0.4, 0.75, 0.95, 1, 0.8], rays: 8, front: true, clear: true, ramp: r }; }

  G.data.fishLooks = {
    // ---- perches ----
    yellow_perch: {
      px: 86,
      body: [[0, -0.056, 0.05], [0.12, -0.101, 0.09], [0.3, -0.162, 0.134], [0.5, -0.196, 0.151], [0.66, -0.19, 0.146], [0.8, -0.158, 0.127], [0.92, -0.09, 0.077], [1, -0.031, 0.034]],
      ramp: ramp('perch'), stops: [0.1, 0.22, 0.4, 0.62, 0.8], sheen: [0.26, 0.38],
      head: { gill: 0.74, bulge: 0.053, pre: 0.8, eye: [0.885, -0.055, 0.043], iris: 'fish_eye_gold', rim: 'fish_perch_0', mouth: [0.012, 0.11, 0.008, 1], lip: true, cheek: 1 },
      lateral: { v: 0.24, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.14, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.176, fork: 0.4, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.45, b: 0.72, h: 0.221, prof: [0.55, 0.95, 1, 0.92, 0.8, 0.62, 0.42, 0.25], rays: 13, spiny: true, lean: 0.35 },
        { k: 'dorsal', a: 0.2, b: 0.43, h: 0.143, prof: [0.7, 1, 0.95, 0.85, 0.65, 0.4], rays: 12, lean: 0.3 },
        { k: 'anal', a: 0.17, b: 0.31, h: 0.13, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 8, lean: 0.3, ramp: FIN_OR },
        pelvic(0.66, 0.13, FIN_OR), pectoral(0.7, 0.55, 0.13)
      ],
      marks: [{ k: 'bars', xs: [0.1, 0.22, 0.34, 0.46, 0.57, 0.67], w: 0.055, v0: 0, v1: 0.74, taper: 0.55, slant: -0.02, d: -2 }]
    },
    walleye: {
      px: 100,
      body: [[0, -0.054, 0.048], [0.15, -0.096, 0.084], [0.4, -0.138, 0.12], [0.6, -0.144, 0.12], [0.78, -0.13, 0.11], [0.92, -0.076, 0.062], [1, -0.032, 0.031]],
      ramp: ramp('walleye'), stops: [0.1, 0.24, 0.42, 0.66, 0.84], sheen: [0.28, 0.4],
      head: { gill: 0.75, bulge: 0.045, pre: 0.81, eye: [0.89, -0.04, 0.046], iris: 'fish_eye_glass', rim: 'fish_walleye_0', mouth: [0.008, 0.15, 0.01, 0], lip: true, cheek: 1 },
      lateral: { v: 0.3, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.9, d: -1 },
      tail: { len: 0.19, spread: 0.162, fork: 0.42, rays: 15, tip: 'fish_walleye_5' }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.7, h: 0.143, prof: [0.6, 1, 0.95, 0.85, 0.72, 0.55, 0.4], rays: 13, spiny: true, lean: 0.3, spot: [0.72, 1, 0, 0.55, 'fish_walleye_0'] },
        { k: 'dorsal', a: 0.18, b: 0.4, h: 0.124, prof: [0.8, 1, 0.92, 0.8, 0.6, 0.4], rays: 14, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.3, h: 0.111, prof: [0.8, 1, 0.85, 0.55, 0.35], rays: 10, lean: 0.3, spot: [0, 0.3, 0.55, 1, 'fish_walleye_5'] },
        pelvic(0.67, 0.11), pectoral(0.71, 0.58, 0.11)
      ],
      marks: [{ k: 'saddles', xs: [0.14, 0.29, 0.44, 0.57, 0.69], w: 0.085, v0: 0, v1: 0.46, taper: 0.35, d: -2 }]
    },
    // ---- sunfish & bass ----
    rock_bass: {
      px: 80,
      body: [[0, -0.069, 0.063], [0.15, -0.149, 0.127], [0.4, -0.23, 0.19], [0.6, -0.236, 0.19], [0.8, -0.186, 0.156], [0.93, -0.099, 0.079], [1, -0.035, 0.035]],
      ramp: ramp('rock'), stops: [0.1, 0.24, 0.42, 0.64, 0.84], sheen: [0.24, 0.36],
      head: { gill: 0.73, bulge: 0.060, pre: 0.79, eye: [0.87, -0.06, 0.061], iris: 'fish_eye_red', rim: 'fish_rock_0', mouth: [0.008, 0.14, 0.012, 2], lip: true, cheek: 1 },
      lateral: { v: 0.24, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.18, spread: 0.189, fork: 0.22, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.74, h: 0.143, prof: [0.5, 0.9, 1, 0.95, 0.9, 0.85, 0.85], rays: 11, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.18, b: 0.46, h: 0.182, prof: [0.8, 1, 1, 0.9, 0.7, 0.45], rays: 11, lean: 0.3 },
        { k: 'anal', a: 0.15, b: 0.4, h: 0.182, prof: [0.4, 0.8, 1, 0.95, 0.75, 0.45], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.55, 0.14)
      ],
      marks: [
        { k: 'stripes', vs: [0.32, 0.42, 0.52, 0.62, 0.72, 0.82], w: 1, dots: 3, broken: 0.3, x0: 0.04, x1: 0.71, d: -2 },
        { k: 'blotch', x: 0.735, v: 0.32, rx: 0.014, ry: 0.07, key: 'fish_rock_0' }
      ]
    },
    smallmouth_bass: {
      px: 90,
      body: [[0, -0.063, 0.057], [0.15, -0.115, 0.103], [0.4, -0.172, 0.149], [0.6, -0.178, 0.149], [0.8, -0.149, 0.124], [0.93, -0.086, 0.079], [1, -0.035, 0.037]],
      ramp: ramp('smb'), stops: [0.1, 0.24, 0.44, 0.66, 0.84], sheen: [0.25, 0.38],
      head: { gill: 0.74, bulge: 0.053, pre: 0.8, eye: [0.885, -0.05, 0.046], iris: 'fish_eye_red', rim: 'fish_smb_0', mouth: [0.012, 0.14, 0.012, 2], lip: true, cheek: 1 },
      lateral: { v: 0.3, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.19, spread: 0.176, fork: 0.28, rays: 15, ramp: ['fish_smb_2', 'fish_smb_3', 'fish_orange_1', 'fish_orange_2'] }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.44, b: 0.68, h: 0.13, prof: [0.5, 0.9, 1, 0.95, 0.85, 0.7, 0.6], rays: 10, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.44, h: 0.156, prof: [0.75, 0.95, 1, 0.9, 0.7, 0.45], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.17, b: 0.33, h: 0.13, prof: [0.85, 1, 0.85, 0.6, 0.35], rays: 10, lean: 0.3 },
        pelvic(0.66, 0.11), pectoral(0.7, 0.6, 0.12)
      ],
      marks: [
        { k: 'bars', xs: [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.67], w: 0.05, v0: 0.04, v1: 0.8, taper: 0.4, d: -2 },
        { k: 'stripes', vs: [0.42, 0.58], w: 1, x0: 0.76, x1: 0.86, d: -2 }
      ]
    },
    largemouth_bass: {
      px: 96,
      body: [[0, -0.066, 0.06], [0.15, -0.12, 0.108], [0.4, -0.186, 0.162], [0.6, -0.192, 0.162], [0.8, -0.168, 0.143], [0.93, -0.097, 0.09], [1, -0.042, 0.048]],
      ramp: ramp('lmb'), stops: [0.1, 0.24, 0.42, 0.64, 0.82], sheen: [0.22, 0.34],
      head: { gill: 0.73, bulge: 0.060, pre: 0.79, eye: [0.875, -0.05, 0.041], iris: 'fish_eye_gold', rim: 'fish_lmb_0', mouth: [0.016, 0.22, 0.02, 3], lip: true, cheek: 1 },
      lateral: { v: 0.36, arch: 0.04, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.19, spread: 0.176, fork: 0.25, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.48, b: 0.7, h: 0.143, prof: [0.5, 0.95, 1, 0.9, 0.75, 0.5, 0.3], rays: 10, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.44, h: 0.169, prof: [0.6, 0.95, 1, 0.9, 0.7, 0.45], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.17, b: 0.33, h: 0.143, prof: [0.85, 1, 0.85, 0.6, 0.35], rays: 11, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.58, 0.13)
      ],
      marks: [{ k: 'band', v0: 0.38, v1: 0.54, x0: 0.02, x1: 0.73, jag: 0.12, d: -2 }]
    },
    bluegill: {
      px: 68,
      body: [[0, -0.07, 0.065], [0.12, -0.16, 0.15], [0.32, -0.26, 0.235], [0.52, -0.275, 0.245], [0.72, -0.22, 0.2], [0.88, -0.13, 0.11], [1, -0.043, 0.037]],
      ramp: ramp('blue'), stops: [0.1, 0.22, 0.38, 0.56, 0.74], sheen: [0.22, 0.34],
      zones: [{ x0: 0.4, x1: 0.92, v0: 0.5, v1: 1, ramp: ['fish_blue_2', 'fish_blue_3', 'fish_blue_4', 'fish_breast_0', 'fish_breast_2', 'fish_breast_3'] }],
      head: { gill: 0.74, bulge: 0.068, pre: 0.8, eye: [0.88, -0.07, 0.054], iris: 'fish_eye_gold', rim: 'fish_blue_0', mouth: [0.008, 0.05, 0, 0] },
      lateral: { v: 0.2, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1, n: 0.35 },
      tail: { len: 0.17, spread: 0.203, fork: 0.2, rays: 14 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.74, h: 0.156, prof: [0.5, 0.9, 1, 0.95, 0.85, 0.8], rays: 10, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.16, b: 0.46, h: 0.195, prof: [0.8, 1, 1, 0.9, 0.7, 0.4], rays: 12, lean: 0.3, spot: [0.72, 1, 0, 0.45, 'fish_blue_0'] },
        { k: 'anal', a: 0.14, b: 0.4, h: 0.169, prof: [0.5, 0.9, 1, 0.9, 0.7, 0.4], rays: 11, lean: 0.3 },
        pelvic(0.64, 0.13),
        { k: 'pectoral', x: 0.7, v: 0.5, ang: 160, len: 0.18, spread: 40, prof: [0.5, 0.8, 1, 0.85, 0.5], rays: 9, front: true }
      ],
      marks: [
        { k: 'saddles', xs: [0.14, 0.26, 0.38, 0.5, 0.62], w: 0.06, v0: 0.05, v1: 0.72, taper: 0.2, d: -1 },
        { k: 'blotch', x: 0.725, v: 0.32, rx: 0.025, ry: 0.1, key: 'fish_blue_0' }
      ]
    },
    crappie: {
      px: 84,
      body: [[0, -0.068, 0.063], [0.15, -0.158, 0.147], [0.38, -0.236, 0.226], [0.58, -0.236, 0.215], [0.78, -0.181, 0.159], [0.92, -0.097, 0.061], [1, -0.055, 0.012]],
      ramp: ramp('crap'), stops: [0.1, 0.24, 0.42, 0.62, 0.82], sheen: [0.24, 0.36],
      head: { gill: 0.74, bulge: 0.068, pre: 0.8, eye: [0.88, -0.065, 0.054], iris: 'fish_eye_gold', rim: 'fish_crap_0', mouth: [-0.015, 0.13, 0.035, 0], lip: true, cheek: 1 },
      lateral: { v: 0.24, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.18, spread: 0.203, fork: 0.25, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.38, b: 0.56, h: 0.143, prof: [0.4, 0.8, 1, 0.95, 0.9], rays: 7, spiny: true, lean: 0.3, mottle: 'fish_crap_1' },
        { k: 'dorsal', a: 0.14, b: 0.38, h: 0.221, prof: [0.85, 1, 0.95, 0.8, 0.6, 0.35], rays: 15, lean: 0.3, mottle: 'fish_crap_1' },
        { k: 'anal', a: 0.13, b: 0.42, h: 0.221, prof: [0.35, 0.7, 0.95, 1, 0.85, 0.6, 0.35], rays: 17, lean: 0.3, mottle: 'fish_crap_1' },
        pelvic(0.64, 0.12), pectoral(0.7, 0.55, 0.13)
      ],
      marks: [
        { k: 'spots', n: 70, x0: 0.03, x1: 0.74, v0: 0.04, v1: 0.9, r: 1.2, seed: 7001, d: -2 },
        { k: 'spots', n: 40, x0: 0.05, x1: 0.85, v0: 0.02, v1: 0.6, r: 0.8, seed: 7002, d: -1 }
      ]
    },
    // ---- temperate bass ----
    white_bass: {
      px: 86,
      body: [[0, -0.061, 0.055], [0.15, -0.121, 0.105], [0.38, -0.209, 0.165], [0.58, -0.22, 0.165], [0.78, -0.173, 0.137], [0.92, -0.095, 0.07], [1, -0.035, 0.034]],
      ramp: ramp('silver'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.22, 0.34],
      head: { gill: 0.74, bulge: 0.060, pre: 0.8, eye: [0.885, -0.055, 0.054], iris: 'fish_eye_gold', rim: 'fish_silver_0', mouth: [0.008, 0.12, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.28, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.203, fork: 0.45, rays: 16 }, fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.68, h: 0.208, prof: [0.5, 0.95, 1, 0.9, 0.7, 0.45, 0.25], rays: 9, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.4, h: 0.156, prof: [0.7, 1, 0.9, 0.75, 0.55, 0.4], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.32, h: 0.156, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.58, 0.13)
      ],
      marks: [{ k: 'stripes', vs: [0.18, 0.3, 0.42, 0.54, 0.66], w: 1, x0: 0.03, x1: 0.72, broken: 0.25, d: -2 }]
    },
    hybrid_striped_bass: {
      px: 96,
      body: [[0, -0.056, 0.05], [0.15, -0.112, 0.101], [0.38, -0.185, 0.157], [0.58, -0.19, 0.157], [0.78, -0.158, 0.127], [0.92, -0.087, 0.064], [1, -0.034, 0.034]],
      ramp: ramp('silver'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.22, 0.34],
      head: { gill: 0.74, bulge: 0.060, pre: 0.8, eye: [0.885, -0.05, 0.049], iris: 'fish_eye_gold', rim: 'fish_silver_0', mouth: [0.008, 0.13, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.26, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.189, fork: 0.45, rays: 16 }, fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.68, h: 0.195, prof: [0.5, 0.95, 1, 0.9, 0.7, 0.45, 0.25], rays: 9, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.4, h: 0.15, prof: [0.7, 1, 0.9, 0.75, 0.55, 0.4], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.32, h: 0.143, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.58, 0.12)
      ],
      marks: [{ k: 'stripes', vs: [0.16, 0.27, 0.38, 0.49, 0.6, 0.71], w: 1, x0: 0.03, x1: 0.72, broken: 0.45, d: -2 }]
    },
    striped_bass: {
      px: 104,
      body: [[0, -0.052, 0.048], [0.15, -0.098, 0.092], [0.38, -0.155, 0.132], [0.58, -0.161, 0.132], [0.78, -0.137, 0.111], [0.92, -0.079, 0.06], [1, -0.032, 0.03]],
      ramp: ramp('silver'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.2, 0.32],
      head: { gill: 0.75, bulge: 0.053, pre: 0.81, eye: [0.89, -0.045, 0.041], iris: 'fish_eye_gold', rim: 'fish_silver_0', mouth: [0.006, 0.13, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.4, arch: 0.04, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.176, fork: 0.42, rays: 16 }, fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.47, b: 0.68, h: 0.169, prof: [0.5, 0.95, 1, 0.9, 0.7, 0.45, 0.25], rays: 9, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.4, h: 0.137, prof: [0.7, 1, 0.9, 0.75, 0.55, 0.4], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.31, h: 0.13, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.11), pectoral(0.7, 0.58, 0.11)
      ],
      marks: [{ k: 'stripes', vs: [0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74], w: 1.2, x0: 0.02, x1: 0.73, d: -3 }]
    }
  };
})();
