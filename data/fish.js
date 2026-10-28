var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish data (V5), clock windows (§0.8) and rarity weights.
// Units: habitat depths in metres (px = m × 4), speed in fight units (V4: D grows by speed × 0.03/s;
// the swimming AI moves at speed × 10 px/s), awareness in px,
// caution 0..1 (chance to back off after nibbling), mass in kg (typical weight;
// the rod's mass limit is checked against it, D4).
G.data = G.data || {};

G.data.windows = [
  { id: 'owl_247', from: 2.5, to: 3 + 10 / 60, cue: 2 + 47 / 60 },  // 02:30-03:10, owl at 02:47
  { id: 'owl_333', from: 3 + 20 / 60, to: 4, cue: 3 + 33 / 60 }     // 03:20-04:00, owl at 03:33
];

G.data.rarity = { common: 62, uncommon: 26, rare: 10, legendary: 2 };

// Placeholder Fogbound species. TODO(P14.1): the full roster (4 common, 3 uncommon, 1 rare, 1 legendary).
G.data.fish = [
  {
    id: 'gloam_perch', name: 'Gloam Perch', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.4, strength: 0.6, fatigue: 0.12, mass: 0.35,
    lengthCm: [14, 26], weightKg: [0.15, 0.5], awareness: 46, caution: 0.35,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 6,
    desc: 'It had a human tooth. The others were normal.', hintRefs: [],
    look: { base: 'perch', wrongness: 1, parts: ['human_mouth'], palette: 'olive', seed: 101 }
  },
  {
    id: 'mist_carp', name: 'Mist Carp', rarity: 'uncommon', locations: ['fog'],
    habitat: { depthMin: 6, depthMax: 20 }, speed: 1.0, strength: 1.0, fatigue: 0.07, mass: 2.2,
    lengthCm: [40, 70], weightKg: [1.2, 3.0], awareness: 38, caution: 0.5,
    baitLikes: ['worm'], timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], windows: [], uneaseMin: 0, price: 22,
    desc: 'Heavier in the grey hours, when the fog sits low on the water.', hintRefs: ['hour:grey'],
    look: { base: 'carp', wrongness: 1, parts: ['zipper'], palette: 'bronze', seed: 202 }
  },
  {
    // Window-only: bites only on a cast latched in the 02:47 window.
    id: 'owl_eel', name: 'Two-Forty-Seven', rarity: 'rare', locations: ['fog'],
    habitat: { depthMin: 12, depthMax: 24 }, speed: 1.6, strength: 1.3, fatigue: 0.09, mass: 1.4,
    lengthCm: [60, 110], weightKg: [0.8, 2.2], awareness: 60, caution: 0.55,
    baitLikes: ['minnow', 'worm'], timeLikes: [], windows: ['owl_247'], uneaseMin: 0, price: 90,
    desc: 'Its eyes were already open when the owl called.', hintRefs: ['window:owl_247'],
    look: { base: 'eel', wrongness: 2, parts: ['owl_eyes', 'tail_face'], palette: 'ink', seed: 303 }
  },
  {
    // Needs high unease: only after sitting still a long while at night.
    id: 'hollow_pike', name: 'Hollow Pike', rarity: 'uncommon', locations: ['fog'],
    habitat: { depthMin: 4, depthMax: 16 }, speed: 2.2, strength: 1.6, fatigue: 0.08, mass: 2.8,
    lengthCm: [55, 95], weightKg: [1.6, 4.0], awareness: 70, caution: 0.6,
    baitLikes: ['minnow', 'worm'], timeLikes: [22, 23, 0, 1, 2, 3, 4], windows: [], uneaseMin: 0.6, price: 60,
    desc: 'It only comes once you have waited. It knows you waited.', hintRefs: ['unease'],
    look: { base: 'pike', wrongness: 3, parts: ['vertebrae', 'human_eyes', 'static'], palette: 'silver', seed: 404 }
  }
];

// Schema check (V5). Returns a list of problems; empty means valid.
// ref: {locations, windows, bases, parts} to check cross-references against.
// tools/balance.js --validate runs this along with its other checks.
G.data.validateFish = function (fish, ref) {
  var errs = [], seen = {}, rar = G.data.rarity;
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function pair(v) { return v && v.length === 2 && num(v[0]) && num(v[1]) && v[0] <= v[1]; }
  function strs(v) { if (!v || typeof v.length !== 'number') return false; for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string') return false; return true; }
  for (var i = 0; i < fish.length; i++) {
    var f = fish[i], p = (f && f.id ? f.id : '#' + i) + ': ';
    if (!f || typeof f.id !== 'string') { errs.push(p + 'id'); continue; }
    if (seen[f.id]) errs.push(p + 'duplicate id');
    seen[f.id] = true;
    if (typeof f.name !== 'string' || !f.name) errs.push(p + 'name');
    if (!rar[f.rarity]) errs.push(p + 'rarity "' + f.rarity + '"');
    if (!strs(f.locations) || !f.locations.length) errs.push(p + 'locations');
    else for (var j = 0; j < f.locations.length; j++) {
      var loc = ref.locations[f.locations[j]];
      if (!loc) errs.push(p + 'unknown location ' + f.locations[j]);
      else if (f.habitat && f.habitat.depthMax * 4 > loc.maxDepth) errs.push(p + 'habitat deeper than ' + loc.id + ' maxDepth');
    }
    if (!f.habitat || !num(f.habitat.depthMin) || !num(f.habitat.depthMax) || f.habitat.depthMin < 0 || f.habitat.depthMin >= f.habitat.depthMax) errs.push(p + 'habitat');
    ['speed', 'strength', 'fatigue', 'mass', 'awareness', 'price'].forEach(function (k) { if (!num(f[k]) || f[k] <= 0) errs.push(p + k); });
    if (!num(f.caution) || f.caution < 0 || f.caution > 1) errs.push(p + 'caution');
    if (!pair(f.lengthCm)) errs.push(p + 'lengthCm');
    if (!pair(f.weightKg)) errs.push(p + 'weightKg');
    else if (f.mass < f.weightKg[0] || f.mass > f.weightKg[1]) errs.push(p + 'mass outside weightKg');
    if (!strs(f.baitLikes)) errs.push(p + 'baitLikes');
    if (!f.timeLikes || !f.timeLikes.every(function (h) { return num(h) && h >= 0 && h < 24 && h % 1 === 0; })) errs.push(p + 'timeLikes');
    if (!strs(f.windows)) errs.push(p + 'windows');
    else f.windows.forEach(function (w) { if (!ref.windows.some(function (x) { return x.id === w; })) errs.push(p + 'unknown window ' + w); });
    if (!num(f.uneaseMin) || f.uneaseMin < 0 || f.uneaseMin > 1) errs.push(p + 'uneaseMin');
    if (typeof f.desc !== 'string' || !f.desc) errs.push(p + 'desc');
    if (!strs(f.hintRefs)) errs.push(p + 'hintRefs');
    var L = f.look;
    if (!L) { errs.push(p + 'look'); continue; }
    if (ref.bases.indexOf(L.base) < 0) errs.push(p + 'look.base "' + L.base + '"');
    if (!(L.wrongness >= 0 && L.wrongness <= 3 && L.wrongness % 1 === 0)) errs.push(p + 'look.wrongness');
    if (!strs(L.parts)) errs.push(p + 'look.parts');
    else {
      L.parts.forEach(function (pt) { if (ref.parts.indexOf(pt) < 0) errs.push(p + 'unknown part ' + pt); });
      // V5: wrongness 0 has no parts, 1 has one, 2 and 3 have at least two.
      var need = [0, 1, 2, 2][L.wrongness];
      if (L.wrongness === 0 ? L.parts.length !== 0 : L.parts.length < need) errs.push(p + 'parts do not match wrongness ' + L.wrongness);
    }
    if (typeof L.palette !== 'string') errs.push(p + 'look.palette');
    if (!num(L.seed)) errs.push(p + 'look.seed');
  }
  return errs;
};
