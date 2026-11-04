// Headless checks over the pure sim and the data (§6). Never by playing.
//   node tools/balance.js --validate [--strict]   data and code checks; exit 1 on any error
//                                                 (--strict also fails incomplete rosters)
//   node tools/balance.js --pacing                active-player model against the V8 targets
//   node tools/balance.js --saves                 saves from each milestone load and play (14.8)
//   node tools/balance.js --replay <seed> [min]   a deterministic headless session, run twice;
//                                                 prints its hash and fails if the runs differ
//   node tools/balance.js --passive               Phase 52: no income without fishing (passive mode
//                                                 and time away are gone)
//   node tools/balance.js --fight                 how fights end by player and gear tier (Phase 23)
//   node tools/balance.js --rod                   the rod's bend: shapes, action, springing (PLAN_ROD.md)
//   node tools/balance.js --homes                 where each species lives, against PLAN_WATERS.md §3 (Phase 75)
//   node tools/balance.js --first                 a fresh save's first fish inside 60 s on 20 seeds (Phase 96.4)
// It loads the same files index.html loads, in the same order, into a vm context.
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ---- Loading ------------------------------------------------------------------------------

// The core/data/sim scripts index.html loads, plus the generator for look checks.
function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const all = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const keep = all.filter(f => f === 'js/core/rng.js' || f === 'js/core/save.js' || f.startsWith('data/') || f.startsWith('js/sim/'));
  return keep.concat(['js/gfx/sprites.js', 'js/gfx/fishgen.js', 'js/gfx/luregen.js']);
}

function load() {
  // The browser's text and base64 helpers, which core/save.js uses for its export string (--saves).
  const ctx = vm.createContext({ TextEncoder, TextDecoder, btoa, atob });
  for (const f of scriptList()) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  ctx.G.state = ctx.G.state || {};
  return ctx.G;
}

// ---- --validate ---------------------------------------------------------------------------

// Phase 70 (PLAN_SPECIES.md 3.5): every anatomy spec in data/fishlooks.js belongs to a species,
// names only palette keys, paints (its portrait, and its swimmer in every frame), and its native
// portrait fits 104×60.
// Phase 73 (PLAN_SPECIES.md 3.6): every lure in data/gear.js has a look in data/lurelooks.js
// (and no look is for anything else); its icon paints at its native size (about 38 px wide:
// 20-48 wide and at most 40 tall; a float nose up, 12-20 wide and 30-44 tall) and fitted into
// the list's, the chip's and the setup panel's boxes; its sprite paints in every heading and frame, inside a 40 px box; all of it in palette
// keys only. The size variants of a type are each larger than the one before.
let lureArtInfo = '';
function validateLureArt(G, err) {
  const d = G.data, LG = G.gfx.luregen, PAL = G.gfx.sprites.PALETTE, looks = d.lureLooks, lures = d.gear.lures;
  if (!looks || !LG) { err('lurelooks: data/lurelooks.js or js/gfx/luregen.js is not loaded'); return; }
  const keys = new Set(), dims = [];
  let sprites = 0;
  function palette(gr, where) { LG.keysOf(gr).forEach(k => { keys.add(k); if (!PAL[k]) err(where + ' paints "' + k + '", not a palette key'); }); }
  for (const id in looks) if (!lures.some(l => l.id === id)) err('lurelook ' + id + ': no such lure');
  lures.forEach(l => {
    const L = looks[l.id];
    if (!L) { err('lure ' + l.id + ': no look in data/lurelooks.js (no icon, no sprite)'); return; }
    if (!LG.KINDS[L.kind]) { err('lurelook ' + l.id + ': kind ' + L.kind); return; }
    if (!(L.len >= 24 && L.len <= 48 && L.uw >= 8 && L.uw <= 20)) err('lurelook ' + l.id + ': len 24..48, uw 8..20');
    try {
      const ic = LG.icon(l.id), up = LG.KINDS[L.kind].upright;
      if (up ? !(ic.W >= 12 && ic.W <= 20 && ic.H >= 30 && ic.H <= 44) : !(ic.W >= 20 && ic.W <= 48 && ic.H <= 40)) err('lurelook ' + l.id + ': icon ' + ic.W + 'x' + ic.H + (up ? ' (a float: 12-20 wide, 30-44 tall)' : ' (20-48 wide, at most 40 tall)'));
      if (LG.filled(ic) < ic.W * ic.H * 0.15) err('lurelook ' + l.id + ': icon nearly empty');
      palette(ic, 'lurelook ' + l.id + ' icon');
      dims.push(l.id + ' ' + ic.W + 'x' + ic.H);
      [[16, 14], [16, 10], [46, 34]].forEach(([w, h]) => { const f = LG.icon(l.id, w, h); if (f.W > w || f.H > h) err('lurelook ' + l.id + ': fitted to ' + w + 'x' + h + ' it is ' + f.W + 'x' + f.H); palette(f, 'lurelook ' + l.id + ' small icon'); });
      const B = LG.box(l.id);
      if (B.S > 40) err('lurelook ' + l.id + ': sprite box ' + B.S + ' px (at most 40)');
      for (let fr = 0; fr < LG.frames(l.id); fr++) for (let k = 0; k < LG.DIRS; k++) {
        const sp = LG.sprite(l.id, k, fr);
        if (!LG.filled(sp)) err('lurelook ' + l.id + ': sprite frame ' + fr + ' heading ' + k + ' is empty');
        palette(sp, 'lurelook ' + l.id + ' sprite');
        sprites++;
      }
    } catch (e) { err('lurelook ' + l.id + ': does not paint: ' + e.message); }
  });
  // the size variants: each a bigger icon and sprite than the smaller one of its type
  d.LURE_TYPES.forEach(t => {
    const of = lures.filter(l => l.type === t && looks[l.id]).sort((a, b) => d.SIZE_CLASSES.indexOf(a.sizes[0]) - d.SIZE_CLASSES.indexOf(b.sizes[0]));
    for (let i = 1; i < of.length; i++) if (!(looks[of[i].id].len > looks[of[i - 1].id].len && looks[of[i].id].uw > looks[of[i - 1].id].uw)) err('lurelook ' + of[i].id + ': not larger than ' + of[i - 1].id);
  });
  lureArtInfo = 'lure art: ' + Object.keys(looks).length + ' looks, ' + sprites + ' sprites (heading x frame), ' + keys.size + ' palette keys; icons ' + dims.join(', ');
}

let looksInfo = '';
function validateLooks(G, err) {
  const d = G.data, FG = G.gfx.fishgen, PAL = G.gfx.sprites.PALETTE, looks = d.fishLooks;
  if (!looks) { err('fishlooks: data/fishlooks.js is not loaded'); return; }
  const sizes = [];
  function keysIn(v, where, id) {
    if (typeof v === 'string') { if (!PAL[v]) err('fishlook ' + id + ': ' + where + ' "' + v + '" is not a palette key'); return; }
    if (Array.isArray(v)) v.forEach((x, i) => keysIn(x, where + '[' + i + ']', id));
    else if (v && typeof v === 'object') for (const k in v) if (k !== 'k') keysIn(v[k], where + '.' + k, id);
  }
  const num = v => typeof v === 'number' && isFinite(v);
  for (const id in looks) {
    const L = looks[id], i = d.fish.findIndex(f => f.id === id);
    if (i < 0) { err('fishlook ' + id + ': no such species'); continue; }
    if (!(num(L.px) && L.px >= 40 && L.px <= 104)) err('fishlook ' + id + ': px 40..104');
    if (!Array.isArray(L.body) || L.body.length < 4 || L.body.some((p, j) => !(p.length === 3 && p[1] < p[2] && (!j || p[0] > L.body[j - 1][0])))) err('fishlook ' + id + ': body [x, top, bottom], x rising, top above bottom');
    if (!Array.isArray(L.ramp) || L.ramp.length < 4 || L.ramp.length > 6 || !Array.isArray(L.stops) || L.stops.length !== L.ramp.length - 1) err('fishlook ' + id + ': ramp of 4-6 keys, one stop fewer');
    if (!L.head || !num(L.head.gill) || !Array.isArray(L.head.eye) || !Array.isArray(L.head.mouth) || !L.head.iris) err('fishlook ' + id + ': head gill, eye, mouth, iris');
    if (!L.tail || !num(L.tail.len) || !num(L.tail.spread)) err('fishlook ' + id + ': tail len, spread');
    if (!Array.isArray(L.fin) || L.fin.length !== 4) err('fishlook ' + id + ': fin ramp of 4 keys');
    if (!Array.isArray(L.fins) || !L.fins.length) err('fishlook ' + id + ': fins');
    keysIn({ ramp: L.ramp, fin: L.fin, iris: L.head && L.head.iris, rim: L.head && L.head.rim, teeth: (L.head && L.head.teeth) || [], // teeth, lead, speck, halo: Phase 71
      tail: L.tail && [L.tail.ramp || [], L.tail.tip || [], L.tail.lead || [], L.tail.speck ? L.tail.speck.key : []],
      zones: (L.zones || []).map(z => z.ramp), fins: (L.fins || []).map(f => [f.ramp || [], f.mottle || [], f.spot ? f.spot[4] : [], (f.lead || []).filter(x => typeof x === 'string'), f.speck ? f.speck.key : []]),
      marks: (L.marks || []).map(m => [m.key || [], m.halo || [], m.rim || []]), // rim: Phase 72
      barbels: ((L.head && L.head.barbels) || []).map(b => [b.key || [], b.tip || []]) }, 'keys', id); // Phase 72
    try {
      const g = FG.paintFit(id, L, 1e4, 1e4), wh = FG.cropSize(g), w = wh[0], h = wh[1];
      sizes.push(id + ' ' + w + 'x' + h);
      if (w > 104 || h > 60) err('fishlook ' + id + ': native portrait ' + w + 'x' + h + ' (must fit 104x60)');
      FG.specKeys(g).forEach(k => { if (!PAL[k]) err('fishlook ' + id + ': paints "' + k + '", not a palette key'); });
      [[96, 56], [46, 36]].forEach(([bw, bh]) => { const s = FG.cropSize(FG.paintFit(id, L, bw, bh)); if (s[0] > bw || s[1] > bh) err('fishlook ' + id + ': painted for ' + bw + 'x' + bh + ' it is ' + s[0] + 'x' + s[1]); });
      const sl = FG.swimLen(d.fish[i]);
      [0, 1, 3, 4, 5, 6, 7].forEach(fr => {
        const s = FG.paintSpec(id, L, sl, sl, fr, true);
        if (!(s.W <= sl && s.H <= sl)) err('fishlook ' + id + ': swimmer frame ' + fr + ' is ' + s.W + 'x' + s.H + ', past its ' + sl + ' px box');
        FG.specKeys(s).forEach(k => { if (!PAL[k]) err('fishlook ' + id + ': swimmer paints "' + k + '"'); });
      });
    } catch (e) { err('fishlook ' + id + ': does not paint: ' + e.message); }
  }
  const placeholders = FG.fishLooks().placeholder; // Phase 72: none may remain
  if (placeholders.length) err('fishlooks: ' + placeholders.length + ' species still a placeholder: ' + placeholders.join(', '));
  looksInfo = 'fish looks: ' + Object.keys(looks).length + ' painted (' + sizes.join(', ') + '), ' + placeholders.length + ' placeholder';
}

const BANNED = /\b(window|document|Math\.random|Date|performance|requestAnimationFrame|localStorage)\b/;

function stripCode(src) { return src.replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/\/\/.*$/gm, ''); }

let sizeInfo = '', lineInfo = '', rosterInfo = '', lureInfo = '';
function validate(G, opts) {
  const errors = [], warnings = [], d = G.data;
  const err = m => errors.push(m), warn = m => warnings.push(m);

  // Banned globals in sim and data (§0.5).
  for (const dir of ['js/sim', 'data']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(n => n.endsWith('.js'))) {
      const m = stripCode(fs.readFileSync(path.join(ROOT, dir, f), 'utf8')).match(BANNED);
      if (m) err(dir + '/' + f + ': uses ' + m[0]);
    }
  }

  // Fish schema, cross-references, depth <= maxDepth (V5).
  const ref = { locations: d.locations, looks: d.fishLooks };
  d.validateFish(d.fish, ref).forEach(e => err('fish ' + e));
  G.sim.clock.validateWindows(d.windows).forEach(e => err('window ' + e));
  if (d.anomalies) d.validateAnomalies(d.anomalies, { locations: d.locations }).forEach(e => err('anomaly ' + e));
  else err('anomalies: data/anomalies.js is not loaded');
  validateLooks(G, err);
  validateLureArt(G, err);

  const g = d.gear;
  // Phase 68: every bait a species takes exists, and every water has fish. Small fish (3-10 cm)
  // are whichever real species are that small (the Phase 44 rule of two or three a water is gone).
  d.fish.forEach(f => f.baitLikes.forEach(b => { if (!g.baits.some(x => x.id === b)) err('fish ' + f.id + ': baitLikes ' + b + ' is not a bait'); }));
  for (const id in d.locations) {
    const here = d.fish.filter(f => f.locations.includes(id));
    if (here.length < 6 && !d.locations[id].pond) err('roster ' + id + ': ' + here.length + ' species (want 6 or more)');
    const nd = d.locations[id].need; // Phase 80: only the ice's sea visit (need.seaSeen) is a condition again
    if (nd && (!d.locations[id].ice || Object.keys(nd).some(k => k !== 'seaSeen' && k !== 'text') || nd.seaSeen !== true)) err('location ' + id + ': need was removed in Phase 68 (the waters open by cost); only the ice has need.seaSeen');
  }
  rosterInfo = 'species by water: ' + Object.keys(d.locations).map(id => id + ' ' + d.fish.filter(f => f.locations.includes(id)).length).join(', ') +
    ', waiting for the sea ' + d.fish.filter(f => !f.locations.length).length + '; small: ' + d.fish.filter(d.isSmall).map(f => f.id).join(', ');
  d.fish.filter(d.isSmall).forEach(f => {
    if (f.lengthCm[0] < 3 || f.weightKg[0] < 0.005 || f.weightKg[1] > 0.06) err('fish ' + f.id + ': a small fish is 3-10 cm and 5-60 g');
  });
  // Phase 44: the size curve. 10,000 draws a species through economy.sizeQ: the median length
  // under the range's midpoint and the top 5% in the range's top tenth.
  const E = G.sim.economy, rq = new G.core.rng.Rng(4401), qs = new Float64Array(10000);
  let medMax = 0, p95Min = 1;
  d.fish.forEach(f => {
    for (let i = 0; i < qs.length; i++) qs[i] = E.sizeQ(rq.next(), d);
    qs.sort();
    const med = qs[qs.length >> 1], p95 = qs[Math.floor(qs.length * 0.95)]; // length is linear in q
    medMax = Math.max(medMax, med); p95Min = Math.min(p95Min, p95);
    if (!(med < 0.5)) err('fish ' + f.id + ': size curve median ' + med.toFixed(3) + ' of its range (want under 0.5)');
    if (!(p95 >= 0.9)) err('fish ' + f.id + ': size curve top 5% from ' + p95.toFixed(3) + ' of its range (want 0.9+)');
  });
  sizeInfo = 'size curve (' + d.fish.length + ' species x 10,000): median at most ' + medMax.toFixed(3) + ' of the range, top 5% from ' + p95Min.toFixed(3);
  validateLocations(G, err);

  // Gear: 5 tiers each, tier 0 free, every tier dearer and better (V8: every item has an effect).
  // Phase 43: the rods off the ladder (the ultralight wand) are checked on their own below.
  [['rods', ['castMax', 'maxMass', 'attract']], ['reels', ['speed']], ['lines', ['strength']]].forEach(([kind, fx]) => {
    const t = kind === 'rods' ? g.rods.filter(r => r.ladder !== false) : g[kind];
    if (!t || t.length !== 5) { err('gear ' + kind + ': needs 5 tiers'); return; }
    if (t[0].cost !== 0) err('gear ' + kind + ': tier 0 must be free');
    for (let i = 1; i < 5; i++) {
      if (!(t[i].cost > t[i - 1].cost)) err('gear ' + t[i].id + ': must cost more than ' + t[i - 1].id);
      fx.forEach(k => { if (!(typeof t[i][k] === 'number' && t[i][k] > t[i - 1][k])) err('gear ' + t[i].id + ': ' + k + ' must improve on ' + t[i - 1].id); });
    }
  });
  const seenBait = {};
  g.baits.forEach(b => {
    if (typeof b.attract !== 'number') err('bait ' + b.id + ': attract');
    if (b.rareBoost !== undefined) err('bait ' + b.id + ': rareBoost was removed in Phase 68');
    if (b.as !== undefined && !g.baits.some(x => x.id === b.as && !x.as)) err('bait ' + b.id + ': as must be another bait');
    const key = String(b.attract);
    if (seenBait[key]) err('bait ' + b.id + ': does the same as ' + seenBait[key]);
    seenBait[key] = b.id;
  });
  // Phase 43: every rod's power, action, small-fish numbers and look; the lures; fish.lures.
  const PAL = G.gfx.sprites.PALETTE;
  g.rods.forEach(r => {
    if (typeof r.power !== 'string' || !(r.action >= 0 && r.action <= 4 && Number.isInteger(r.action))) err('rod ' + r.id + ': power and action 0..4');
    if (!(r.smallHook > 0 && r.smallHook <= 1) || !(r.smallBoost >= 1)) err('rod ' + r.id + ': smallHook 0..1 and smallBoost >= 1');
    if (!Array.isArray(r.look) || r.look.length !== 2 || !r.look.every(k => PAL[k])) err('rod ' + r.id + ': look must be two palette keys');
  });
  if (!g.rods.some(r => r.ladder === false && r.smallBoost > 1)) err('rods: needs a small-fish rod off the ladder');
  if (!(g.rodSmall.frac > 0 && g.rodSmall.frac < 1 && g.rodSmall.mass > 0)) err('rodSmall');
  // Phase 69: the 23 lures' actions; bed went with the grub; vary (rattle, kick) on lift and mid.
  const SWIM = ['mid', 'dive', 'top', 'lift', 'float', 'flutter', 'dropshot', 'wacky', 'glide'], lureIds = (g.lures || []).map(l => l.id);
  const VARY = { rattle: 'lift', kick: 'mid' };
  (g.lures || []).forEach(l => {
    if (!(l.cost > 0 && l.pack >= 1 && l.attract > 0 && SWIM.includes(l.swim) && l.sink >= 0 && l.maxDepthM >= 0)) err('lure ' + l.id + ': cost, pack, attract, swim, sink, maxDepthM');
    if (l.rareBoost !== undefined) err('lure ' + l.id + ': rareBoost was removed in Phase 68');
    if (!d.LURE_TYPES.includes(l.type)) err('lure ' + l.id + ': type ' + l.type);                                   // Phase 68
    const cls = d.SIZE_CLASSES.map(c => c.id);
    if (!Array.isArray(l.sizes) || !l.sizes.length || l.sizes.some(s => !cls.includes(s)) || l.sizes.some((s, i) => i && cls.indexOf(s) !== cls.indexOf(l.sizes[i - 1]) + 1)) err('lure ' + l.id + ': sizes must be adjacent size classes');
    if (g.baits.some(b => b.id === l.id)) err('lure ' + l.id + ': shares an id with a bait');
    if (l.carries !== undefined && !g.baits.some(b => b.id === l.carries && b.unlimited)) err('lure ' + l.id + ': carries must be a bait that never runs out');
    if ((l.swim === 'float') !== (l.carries !== undefined)) err('lure ' + l.id + ': a float rig, and only a float rig, carries a bait');
    if (l.vary !== undefined && VARY[l.vary] !== l.swim) err('lure ' + l.id + ': vary ' + l.vary + ' goes with swim ' + VARY[l.vary]);                  // Phase 69
    if ((l.swim === 'dropshot') !== (l.dropM > 0)) err('lure ' + l.id + ': a dropshot, and only a dropshot, hangs its hook dropM m over the weight');
    if (l.look !== undefined) err('lure ' + l.id + ': the placeholder look went in Phase 73 (data/lurelooks.js has its art)');
  });
  if (lureIds.length !== 23) err('lures: the reference has 23, not ' + lureIds.length);
  for (const k in g.oldLures || {}) if (!lureIds.includes(g.oldLures[k])) err('oldLures: ' + k + ' goes to unknown lure ' + g.oldLures[k]);
  ['spinner', 'plug', 'grub', 'popper', 'jig', 'bobber', 'spoon'].forEach(k => { if (!(g.oldLures || {})[k]) err('oldLures: the old ' + k + ' goes nowhere'); });
  // Phase 69 (was Phase 68's "every lure in every water on the cane rod"): every lure has a
  // species that takes it in some water on some rod of the rack, through the sim's own
  // interest(); and every placed species has a lure that fits its type and size.
  const heaviest = Math.max(...g.rods.map(r => r.maxMass)), lureWaters = {};
  lureIds.forEach(l => {
    lureWaters[l] = Object.keys(d.locations).filter(id => d.fish.some(f => f.locations.includes(id) && G.sim.fish_ai.interest(f, l, true) > 0 && f.mass <= heaviest));
    if (!lureWaters[l].length) err('lure ' + l + ': nothing in any water takes it on any rod');
  });
  d.fish.forEach(f => { if (f.locations.length && Object.keys(f.lureTypes).length && !lureIds.some(l => !g.lures.find(x => x.id === l).carries && G.sim.fish_ai.interest(f, l, true) > 0)) err('fish ' + f.id + ': no lure fits its types and its size'); });
  // Phase 75: every reach of every water holds three species or more, each of which something
  // sold takes there (a lure that fits its type and size, or, for one that ignores lures, a
  // live bait), and some lure takes something in it.
  for (const id in d.locations) for (const R of d.locations[id].reaches || []) {
    if (d.locations[id].pond) continue; // Phase 83: the pond holds only what is stocked
    const here = d.fish.filter(f => d.homeOf(f, id, R.id)), q = 'reach ' + id + ':' + R.id + ': ';
    if (here.length < 3) err(q + here.length + ' species (want 3 or more)');
    here.forEach(f => {
      const lured = lureIds.some(l => !g.lures.find(x => x.id === l).carries && G.sim.fish_ai.interest(f, l, true) > 0);
      if (!lured && !(Object.keys(f.lureTypes).length === 0 && f.baitLikes.some(b => g.baits.some(x => x.id === b)))) err(q + f.id + ' is taken by nothing sold');
    });
    if (!lureIds.some(l => here.some(f => G.sim.fish_ai.interest(f, l, true) > 0))) err(q + 'no lure takes anything here');
  }
  lureInfo = 'lures by water: ' + Object.keys(d.locations).map(w => w + ' ' + lureIds.filter(l => lureWaters[l].includes(w)).length).join(', ') + ' (of ' + lureIds.length + ')';
  // Phase 47: the looks (four fishers, four dogs): their shapes and every key in the palette.
  if (d.looks) d.validateLooks(d.looks, PAL).forEach(e => err('look ' + e));
  else err('looks: data/looks.js is not loaded');
  if (g.lantern || g.depthFinder) err('the lantern and the depth finder are gone (Phase 79b)'); // the user's word, 2026-11-03
  if (!(g.nightDepth > 0)) err('nightDepth: fish deeper than this are silhouettes at night');
  ['pull0', 'pull1', 'tired0', 'tired1', 'pullRise', 'easeFall', 'run', 'tiredRise', 'release', 'recover', 'slipT', 'slipD', 'escape', 'd0',
    'holdLate', 'slackT', 'holdLoss', 'jumpLoss', 'shakeLen0', 'shakeLen1', 'shakeGap0', 'shakeGap1', 'shakeRise', 'jumpRate', 'jumpLen', 'jumpHigh', 'jumpSpike']
    .forEach(k => { if (!(typeof g.fight[k] === 'number' && g.fight[k] > 0)) err('fight constant ' + k); });

  // Phase 53: line types. Monofilament is the line the game was tuned with (all ones, free);
  // at least one line is unseen, or line-shy fish could never be caught.
  const LT = g.lineTypes || [], mono = LT[0];
  if (!mono || mono.id !== 'mono' || mono.cost !== 0 || mono.strength !== 1 || mono.rise !== 1 || mono.shake !== 1 || mono.hold !== 0 || !mono.seen) err('lineTypes: the first must be free monofilament with every factor 1');
  LT.forEach(t => {
    ['strength', 'rise', 'shake', 'feel', 'sinkG', 'belly', 'alpha'].forEach(k => { if (!(typeof t[k] === 'number' && t[k] > 0)) err('lineType ' + t.id + ': ' + k); });
    if (!(t.hold >= 0 && t.hold < 0.3) || !PAL[t.key]) err('lineType ' + t.id + ': hold or key');
  });
  if (!LT.some(t => !t.seen)) err('lineTypes: no line hides from line-shy fish');
  d.fish.forEach(f => { if (f.lineShy !== undefined && f.lineShy !== true) err('fish ' + f.id + ': lineShy must be true or absent'); });
  const shy = d.fish.filter(f => f.lineShy).map(f => f.id);
  lineInfo = 'line-shy species (' + shy.length + '): ' + shy.join(', ');

  // Phase 91.1: sw.js caches exactly what the page needs: index.html, the manifest, its icons
  // and every script index.html loads, each once, and nothing that is not there.
  validateWorker(err);

  // Phase 52: passive income is gone; nothing may bring it back (V7, D5 retired).
  if (g.passive) err('gear.passive: passive mode was removed in Phase 52');
  if (G.sim.passive) err('js/sim/passive.js: passive mode was removed in Phase 52');

  return { errors, warnings };
}

function validateWorker(err) {
  const swPath = path.join(ROOT, 'sw.js');
  if (!fs.existsSync(swPath)) { err('sw.js: missing (Phase 91.1)'); return; }
  const sw = fs.readFileSync(swPath, 'utf8'), m = sw.match(/var FILES = \[([\s\S]*?)\];/);
  if (!m) { err('sw.js: no FILES list'); return; }
  const list = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  const want = ['./', 'index.html', 'manifest.webmanifest'].concat(man.icons.map(i => i.src), [...html.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"/g)].map(x => x[1]));
  const uniq = [...new Set(want)];
  uniq.forEach(f => { if (!list.includes(f)) err('sw.js: ' + f + ' is loaded by the page but not cached'); });
  list.forEach((f, i) => {
    if (!uniq.includes(f)) err('sw.js: caches ' + f + ', which the page does not load');
    if (list.indexOf(f) !== i) err('sw.js: ' + f + ' listed twice');
    if (f !== './' && !fs.existsSync(path.join(ROOT, f))) err('sw.js: ' + f + ' does not exist');
  });
  workerInfo = 'sw.js caches ' + list.length + ' files, matching index.html';
}
let workerInfo = '';

// Location files (V6, P11): the fields the game reads, spots inside the world, at most one
// hidden spot, a current that gives finite speeds, and moving structures placed inside the
// world, apart, and the same for the same seed.
function validateLocations(G, err) {
  const d = G.data, num = v => typeof v === 'number' && isFinite(v);
  for (const id in d.locations) {
    const L = d.locations[id], p = 'location ' + id + ': ';
    if (L.id !== id) err(p + 'id does not match its key');
    if (typeof L.name !== 'string' || !L.name) err(p + 'name');
    if (!num(L.cost) || L.cost < 0) err(p + 'cost');
    ['width', 'waterY', 'maxDepth', 'seed', 'start'].forEach(k => { if (!num(L[k]) || L[k] <= 0) err(p + k); });
    if (!(L.start > 0 && L.start < L.width)) err(p + 'start outside the world');
    if (!L.layers || !L.layers.length || !L.layers.some(l => l.kind === 'landmarks')) err(p + 'layers (needs a landmarks layer)');
    if (!L.underwater) err(p + 'underwater');
    (L.landmarks || []).forEach(m => { if (!(m.x >= 0 && m.x < L.width)) err(p + 'landmark ' + m.id + ' outside the world'); });
    const spots = L.spots || [];
    spots.forEach(s => { if (!(s.x >= 0 && s.x < L.width && s.r > 0)) err(p + 'spot ' + s.id + ' x or r'); });
    if (spots.filter(s => s.kind === 'hidden').length > 1) err(p + 'more than one hidden spot (the dog stares once)');
    if (L.need && L.need.windowCatch && L.need.windowCatch !== 'any' && !d.windows.some(w => w.id === L.need.windowCatch)) err(p + 'need.windowCatch: unknown window');
    // Phase 80 (PLAN_WINTER.md 2.2): an ice water: free, opened by a sea visit, its ice 1-3 m
    // thick, 1-8 holes, skinning over in 1-10 game minutes; no current, and not a river or sea.
    if (L.ice) {
      const I = L.ice;
      if (L.cost !== 0 || !(L.need && L.need.seaSeen === true)) err(p + 'the ice costs nothing and opens after a sea visit (need.seaSeen)');
      if (!(num(I.thick) && I.thick >= 4 && I.thick <= 12 && num(I.holes) && I.holes >= 1 && I.holes <= 8 && num(I.freeze) && I.freeze >= 1 / 60 && I.freeze <= 10 / 60)) err(p + 'ice {thick 4-12 px, holes 1-8, freeze 1-10 game minutes}');
      if (L.water !== 'lake' || L.drift || (L.current && L.current.speed)) err(p + 'the ice is a lake with no drift');
    }
    // Phase 83 (PLAN_WINTER.md 2.4): the Back Pond: a free lake, off the chart, reached by the
    // cabin's back door; its stream's lip inside the world; a capacity of 1-16; no wild fish.
    if (L.pond) {
      const Pd = L.pond;
      if (L.cost !== 0 || L.need || L.ice || L.water !== 'lake') err(p + 'the pond is a free lake with no condition');
      if (!(num(Pd.stream) && Pd.stream > 0 && Pd.stream < L.width / 2 && Number.isInteger(Pd.cap) && Pd.cap >= 1 && Pd.cap <= 16)) err(p + 'pond {stream x in the west half, cap 1-16}');
      if (d.fish.some(f => f.locations.includes(id))) err(p + 'no wild fish live in the pond (it is stocked)');
      if (!(L.landmarks || []).some(m => m.kind === 'stream' && m.x === Pd.stream)) err(p + 'no stream landmark at pond.stream');
    }
    // Phase 84: the pond's trash (data/pond.js): 7 kinds, 3 small, 2 medium and 2 large; as many
    // pieces of each as its n, 21 in all, every one on the bed inside the world and none under
    // another; weights, pulls and the half-width the lure touches at; the stream's price and the
    // rod a large piece needs (a rod sold holds it).
    if (L.pond) {
      const D = d.pond;
      if (!D) err(p + 'data/pond.js is not loaded');
      else {
        const sz = D.kinds.map(k => k.size).join(',');
        if (sz !== 'small,small,small,medium,medium,large,large') err(p + 'trash kinds: 3 small, 2 medium, 2 large (' + sz + ')');
        D.kinds.forEach(k => { if (!(k.n >= 1 && num(k.kg) && k.kg > 0 && k.kg <= 30 && num(k.pull) && k.pull > 0 && k.pull < 1 && k.half >= 1 && typeof k.card === 'string' && k.card)) err(p + 'trash ' + k.id + ': n, kg, pull, half, card'); });
        const want = D.kinds.reduce((a, k) => a + k.n, 0);
        if (want !== 21 || D.pieces.length !== want) err(p + 'trash pieces ' + D.pieces.length + ' (want 21, as the kinds\' n)');
        D.kinds.forEach(k => { if (D.pieces.filter(q => q[0] === k.id).length !== k.n) err(p + 'trash ' + k.id + ': ' + D.pieces.filter(q => q[0] === k.id).length + ' pieces, want ' + k.n); });
        D.pieces.forEach((q, i) => { const k = D.kinds.find(x => x.id === q[0]); if (!k || !(q[1] - k.half >= 4 && q[1] + k.half <= L.width - 4)) err(p + 'trash piece ' + i + ' (kind, x inside the world)'); });
        for (let i = 0; i < D.pieces.length; i++) for (let j = 0; j < i; j++) { const a = D.pieces[i], b = D.pieces[j], ka = D.kinds.find(x => x.id === a[0]), kb = D.kinds.find(x => x.id === b[0]); if (ka && kb && Math.abs(a[1] - b[1]) < ka.half + kb.half + 2) err(p + 'trash pieces ' + j + ' and ' + i + ' overlap'); }
        if (!(D.streamCost > 0 && D.rodKg > 0 && d.gear.rods.some(r => !r.ice && r.maxMass >= D.rodKg) && D.clearHours > 0 && D.shyHours > 0)) err(p + 'pond: streamCost, rodKg (a rod holds it), clearHours, shyHours');
      }
    }
    // Phase 74 (PLAN_WATERS.md): a kind of water, reaches that cover the width in order with
    // no gap or overlap, and a pier (dock) inside the world with a pier landmark at it.
    if (!['lake', 'river', 'sea'].includes(L.water)) err(p + 'water must be lake, river or sea');
    if (L.water === 'river' ? !(L.current && !L.current.lake) : !(L.current && L.current.lake)) err(p + 'a river has a current, a lake or a sea a wind drift (current.lake)');
    const R = L.reaches || [];
    if (!R.length) err(p + 'reaches');
    R.forEach((r, i) => {
      if (typeof r.id !== 'string' || !r.id || typeof r.name !== 'string' || !r.name) err(p + 'reach ' + i + ': id and name');
      if (!(Array.isArray(r.x) && r.x.length === 2 && r.x[0] < r.x[1])) err(p + 'reach ' + r.id + ': x [from, to]');
      else if (r.x[0] !== (i ? R[i - 1].x[1] : 0)) err(p + 'reach ' + r.id + ': starts at ' + r.x[0] + ' (a gap or an overlap)');
    });
    if (R.length && R[R.length - 1].x[1] !== L.width) err(p + 'reaches end at ' + R[R.length - 1].x[1] + ', not the width ' + L.width);
    if (new Set(R.map(r => r.id)).size !== R.length) err(p + 'two reaches share an id');
    if (!(L.dock && num(L.dock.x) && L.dock.x > 0 && L.dock.x < L.width && L.dock.reach > 0)) err(p + 'dock {x, reach} inside the world');
    else if (!(L.landmarks || []).some(m => m.kind === 'pier' && m.x === L.dock.x)) err(p + 'no pier landmark at the dock');
    // Phase 76: The Cabin at Fogbound's pier only. The user's fixes (2026-11-03): no signposts,
    // and every pier runs out from the shore (from 'left' or 'right'), its water end on its side.
    if (L.dock) {
      if (!!L.dock.cabin !== (id === 'fog' || !!L.pond)) err(p + 'The Cabin is offered at Fogbound\'s pier and the Back Pond\'s dock only'); // Phase 83: the back door
      if ((L.landmarks || []).some(m => m.kind === 'sign')) err(p + 'no signposts at the piers');
      const pr = (L.landmarks || []).find(m => m.kind === 'pier' && m.x === L.dock.x);
      if (pr && !(pr.from === 'left' ? pr.x < L.width / 2 : pr.from === 'right' && pr.x > L.width / 2)) err(p + 'the pier must run out from the nearer shore (from: left or right)');
    }
    if (!(L.start > 0 && L.start < L.width)) err(p + 'start');
    if (L.drift) {
      for (let t = 0; t < 30; t += 0.5) for (const depth of [0, L.maxDepth]) for (const x of [undefined, 1, L.width / 2, L.width - 1]) {
        const v = L.drift(12345, t, depth, false, 0, x);
        if (!num(v) || Math.abs(v) > 40) err(p + 'drift gives ' + v + ' px/s at t ' + t + ' x ' + x);
      }
    }
    // Phase 78: a bed shape ([[x, depth px], ...]): in order across the world, 4 px to maxDepth,
    // and deep enough in each reach for every home there (its shallowest depth within the reach).
    const sh = L.underwater && L.underwater.shape;
    if (sh) {
      if (!Array.isArray(sh) || sh.length < 2 || sh[0][0] !== 0 || sh[sh.length - 1][0] !== L.width) err(p + 'underwater.shape runs from x 0 to the width');
      sh.forEach((q, i) => { if (!(num(q[0]) && num(q[1]) && q[1] >= 4 && q[1] <= L.maxDepth && (!i || q[0] > sh[i - 1][0]))) err(p + 'underwater.shape point ' + i + ' (x in order, depth 4..maxDepth)'); });
      const deepIn = (x0, x1) => { let m = 0; for (let x = x0; x < x1; x++) { let j = 0; while (j < sh.length - 2 && x > sh[j + 1][0]) j++; const a = sh[j], b = sh[j + 1], f = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0]))); m = Math.max(m, a[1] + (b[1] - a[1]) * f); } return m; };
      for (const sp of d.fish) for (const hm of (sp.homes || [])) {
        if (hm.loc !== id) continue;
        const rs = hm.reaches && hm.reaches.length ? R.filter(r => hm.reaches.includes(r.id)) : R;
        rs.forEach(r => { const m = deepIn(r.x[0], r.x[1]); if (m < hm.depth[0] * 4 + 4) err(p + 'the bed in ' + r.id + ' (' + (m / 4).toFixed(1) + ' m) is too shallow for ' + sp.id + ' at ' + hm.depth[0] + '-' + hm.depth[1] + ' m'); });
      }
    }
    // Phase 79: the sea's parts: a sea block only at sea (tide 0-4 px, storm lift 1-3, caps
    // 0-0.6, kelp on the water inside the world), a swell clamp 3-6 view px, kelp forests and
    // rock beds inside the world in order, the wreck's hull, a lighthouse on a headland, and
    // the headland, skerries, breakwater and wreck painted by a sea's scenery module.
    if (L.sea) {
      const Sx = L.sea;
      if (L.water !== 'sea') err(p + 'sea: only at sea');
      if (Sx.tide && !(num(Sx.tide.amp) && Sx.tide.amp > 0 && Sx.tide.amp <= 4 && num(Sx.tide.high) && Sx.tide.high >= 0 && Sx.tide.high < 24)) err(p + 'sea.tide {amp 0-4 px, high 0-24 h}');
      if (Sx.storm !== undefined && !(num(Sx.storm) && Sx.storm >= 1 && Sx.storm <= 3)) err(p + 'sea.storm must be 1-3');
      if (Sx.caps !== undefined && !(num(Sx.caps) && Sx.caps >= 0 && Sx.caps <= 0.6)) err(p + 'sea.caps must be 0-0.6');
      (Sx.kelpTop || []).forEach(q => { if (!(q[0] >= 0 && q[1] <= L.width && q[0] < q[1])) err(p + 'sea.kelpTop [from, to]'); });
    } else if (L.water === 'sea') err(p + 'a sea needs its sea block (tide, storm, caps)');
    if (L.swell && L.swell.clamp !== undefined && !(num(L.swell.clamp) && L.swell.clamp >= 3 && L.swell.clamp <= 6)) err(p + 'swell.clamp must be 3-6 view px');
    const U_ = L.underwater || {};
    [['kelp', 3], ['rockBed', 2]].forEach(([k, n]) => (U_[k] || []).forEach((q, i, a) => {
      if (!(q.length === n && q[0] >= 0 && q[1] <= L.width && q[0] < q[1] && (!i || q[0] >= a[i - 1][1]) && (n < 3 || (q[2] > 0 && q[2] <= 0.3)))) err(p + 'underwater.' + k + ' ' + JSON.stringify(q));
    }));
    if (U_.kelp && L.water !== 'sea') err(p + 'underwater.kelp: kelp grows at sea');
    if (U_.hulk && !(num(U_.hulk.x) && U_.hulk.half > 0 && U_.hulk.x - U_.hulk.half >= 0 && U_.hulk.x + U_.hulk.half <= L.width)) err(p + 'underwater.hulk {x, half} inside the world');
    (L.landmarks || []).forEach(m => {
      if (['headland', 'skerries', 'haulout', 'breakwater', 'mooring', 'schooner'].includes(m.kind) && !['sound', 'wreck'].includes(L.scenery)) err(p + 'landmark ' + m.id + ': a ' + m.kind + ' needs a sea\'s scenery');
      if ((m.kind === 'skerries' || m.kind === 'haulout') && !(Array.isArray(m.hs) && m.hs.length && m.hs.every(v => v > 0 && v <= 14) && m.half > 0)) err(p + 'landmark ' + m.id + ': hs (each rock\'s height 0-14) and half');
      if (m.kind === 'headland' && !(m.half > 0 && m.h > 0 && (!m.light || (m.light.x > m.x - m.half && m.light.x < m.x + m.half && m.light.tower > 0)))) err(p + 'landmark ' + m.id + ': half, h and a light {x on the headland, tower}');
      if (m.kind === 'mooring' && !['teal', 'rust'].includes(m.hull)) err(p + 'landmark ' + m.id + ': hull teal or rust');
    });
    (L.underwater && L.underwater.weedBeds || []).forEach(q => { if (!(q[0] >= 0 && q[1] <= L.width && q[0] < q[1] && q[2] > 0 && q[2] <= 1)) err(p + 'underwater.weedBeds [from, to, density 0-1]'); });
    // Phase 77: a river's current per reach (G.data.reachK): known reaches, flow 0–3, sink 0–1.
    if (L.current && L.current.reach) {
      if (L.water !== 'river') err(p + 'current.reach is for rivers');
      for (const rid in L.current.reach) {
        const q = L.current.reach[rid];
        if (!R.some(r => r.id === rid)) err(p + 'current.reach.' + rid + ': no such reach');
        if (q.flow !== undefined && !(num(q.flow) && q.flow > 0 && q.flow <= 3)) err(p + 'current.reach.' + rid + '.flow must be in (0, 3]');
        if (q.sink !== undefined && !(num(q.sink) && q.sink > 0 && q.sink <= 1)) err(p + 'current.reach.' + rid + '.sink must be in (0, 1]');
      }
    }
    validateLife(L, p, err);
    if (L.place) {
      const a = L.place(777, []), b = L.place(777, []);
      if (a.length !== L.movers.length || a.some((x, i) => x !== b[i])) err(p + 'place is not deterministic');
      if (a.some(x => !(x >= 0 && x < L.width))) err(p + 'place puts a structure outside the world');
      for (let i = 0; i < a.length; i++) for (let k = 0; k < i; k++) if (Math.abs(a[i] - a[k]) < L.moverGap) err(p + 'place puts two structures closer than moverGap');
    }
  }
}

// Phase 49: a water's life table (loc.life): `under` with every field the bake and the scene
// read; `above` with known creatures, hours as [from, to] pairs in 0..24, places inside the
// world or the named layer, perches above the water. Shore layers' features are known kinds.
const UNDER_KEYS = ['cray', 'snail', 'fry', 'tad', 'turtle', 'eel', 'mussel', 'caddis', 'litter', 'roots', 'tree', 'ribbon', 'fern', 'lily', 'algae'];
const ABOVE_KINDS = ['ducks', 'heron', 'kingfisher', 'loon', 'dragonflies', 'frog', 'striders', 'deer', 'beaver', 'fox', 'gulls', 'osprey', 'eagle', 'otter', 'seal', 'cormorant', 'hare', 'raven', 'moose']; // Phase 83: the moose; Phase 77: the osprey and the eagle; Phase 78: the otter; Phase 79: the seal and the cormorant; Phase 82: the hare and the raven
const SHORE_KINDS = { bank: ['posts', 'moored', 'lodge', 'duckbox'], zigzag: ['pot', 'chair', 'table', 'door'] };
function validateLife(L, p, err) {
  const life = L.life, num = v => typeof v === 'number' && isFinite(v);
  (L.layers || []).forEach(l => {
    const w = 320 + Math.ceil((L.width - 320) * l.parallax);
    if (SHORE_KINDS[l.kind]) (l.features || []).forEach(f => { if (!SHORE_KINDS[l.kind].includes(f.kind) || !(f.x >= 0 && f.x < w)) err(p + 'layer ' + l.id + ': feature ' + f.kind + ' at ' + f.x + ' (kind or x)'); });
    if (l.place !== undefined && (!num(l.place) || l.place <= 0)) err(p + 'layer ' + l.id + ': place must be a positive seed');
  });
  if (!life) { err(p + 'life (needs under and above)'); return; }
  const u = life.under;
  if (!u) err(p + 'life.under'); else UNDER_KEYS.forEach(k => { if (u[k] === undefined) err(p + 'life.under.' + k); });
  // Phase 79: the sea floor's life, optional: crabs in place of crayfish, starfish in place of snails.
  if (u) {
    ['crab', 'star', 'anemone', 'flat'].forEach(k => { if (u[k] !== undefined && !(Number.isInteger(u[k]) && u[k] >= 0 && u[k] <= 20)) err(p + 'life.under.' + k + ' must be a count 0-20'); });
    if (u.crab > 0 && u.cray > 0) err(p + 'life.under: crabs or crayfish, not both');
    if (u.star > 0 && u.snail > 0) err(p + 'life.under: starfish or snails, not both');
    if ((u.crab > 0 || u.star > 0 || u.flat > 0 || u.anemone > 0) && L.water !== 'sea') err(p + 'life.under: crabs, starfish, anemones and flatfish live at sea');
    if (u.flat > 4) err(p + 'life.under.flat: at most 4');
    if (u.flat > 0 && L.underwater.rockBed && !(L.underwater.rockBed.reduce((a, r) => a - (r[1] - r[0]), L.width) > 60)) err(p + 'life.under.flat: no sand for the flatfish');
  }
  // Phase 82: under the ice, winter: no crayfish, tadpoles, turtles, eels or lilies (the ten (Ice) fish, a few snails and fry).
  if (u && L.ice && ['cray', 'tad', 'lily'].some(k => u[k] > 0) || (u && L.ice && (u.turtle || u.eel))) err(p + 'life.under: nothing of summer under the ice');
  const a = life.above;
  if (!a) { err(p + 'life.above'); return; }
  const hoursOk = hs => Array.isArray(hs) && hs.length && hs.every(h => Array.isArray(h) && h.length === 2 && h.every(v => num(v) && v >= 0 && v <= 24) && h[0] !== h[1]);
  const layerOf = id => (L.layers || []).find(l => l.id === id);
  for (const k in a) {
    const c = a[k], q = p + 'life.above.' + k + ': ';
    if (!ABOVE_KINDS.includes(k)) { err(q + 'unknown creature'); continue; }
    if (!hoursOk(c.hours)) err(q + 'hours must be [[from, to], ...] in 0..24');
    if (c.call && !hoursOk(c.call)) err(q + 'call hours');
    const lay = c.layer ? layerOf(c.layer) : null;
    if (c.layer && !lay) err(q + 'no layer ' + c.layer);
    const pp = lay ? lay.parallax : (c.p || 1), w = 320 + Math.ceil((L.width - 320) * pp);
    const inW = x => num(x) && x >= 0 && x <= w;
    if (c.x) { const xs = Array.isArray(c.x[0]) ? c.x : [c.x]; xs.forEach(r => { if (!(inW(r[0]) && inW(r[1]) && r[0] < r[1])) err(q + 'x range ' + r); }); }
    (c.perches || []).forEach(s => { if (!(inW(s.x) && num(s.y) && s.y > 0)) err(q + 'perch ' + JSON.stringify(s)); });
    if (k === 'beaver' && !(lay && (lay.features || []).some(f => f.kind === 'lodge'))) err(q + 'its layer needs a lodge');
    if (k === 'frog' && !(u && u.lily > 0)) err(q + 'needs lilies (life.under.lily)');
    if (k === 'kingfisher' && !(c.perches || []).length) err(q + 'needs perches');
    if (k === 'gulls' && !(c.n > 0 && c.perches && c.perches.length >= c.n)) err(q + 'n and perches');
    if ((k === 'ducks' || k === 'loon') && !(c.p > 0 && c.p <= 1)) err(q + 'p (parallax)');
    // Phase 77: the osprey nests on a landmark with a nest above the water, and fishes inside the world
    if (k === 'osprey') { const lm = (L.landmarks || []).find(m => m.id === c.landmark); if (!(lm && lm.nest && inW(lm.nest.x) && num(lm.nest.y) && lm.nest.y > 0)) err(q + 'landmark with a nest {x, y}'); if (!c.x) err(q + 'x (the water it fishes)'); }
    // Phase 82: the winter animals: hares (1-3) on a layer, ravens (1-3) with a height range, both on the ice only; a white fox there too.
    if ((k === 'hare' || k === 'raven') && !L.ice) err(q + 'a winter animal, on the ice only');
    if (k === 'hare' && !(c.n >= 1 && c.n <= 3 && lay && c.x)) err(q + 'n (1-3), layer and x');
    if (k === 'raven' && !(c.n >= 1 && c.n <= 3 && c.x && Array.isArray(c.y) && c.y[0] > 0 && c.y[0] < c.y[1])) err(q + 'n (1-3), x, y [lo, hi] above the ice');
    if (k === 'moose' && !(lay && num(lay.base) && c.x && L.pond)) err(q + 'the moose drinks at the pond, on a layer with a base');
    if (k === 'fox' && c.white && !L.ice) err(q + 'a white fox lives on the ice');
    if (k === 'fox' && lay && !num(lay.base)) err(q + 'its layer needs a base (the ground it stands on)');
    if (L.ice && ['ducks', 'heron', 'kingfisher', 'loon', 'dragonflies', 'frog', 'striders', 'beaver', 'otter', 'seal', 'cormorant'].includes(k)) err(q + 'nothing of open water lives on the ice');
    if (k === 'otter' && !(c.n >= 1 && c.n <= 3 && c.x && (!c.log || (L.landmarks || []).some(m => m.id === c.log && m.len > 0)))) err(q + 'n (1-3), x, and log: a landmark with len');
    // Phase 79: seals haul out on spots above the water (at least one) and swim inside x; the
    // cormorant perches above the water and fishes inside x. Both at sea only.
    if ((k === 'seal' || k === 'cormorant') && L.water !== 'sea') err(q + 'lives at sea');
    if (k === 'seal' && !(c.n >= 1 && c.n <= 4 && c.x && Array.isArray(c.spots) && c.spots.length >= 1 && c.spots.every(s => inW(s.x) && num(s.y) && s.y > 0 && s.x >= c.x[0] && s.x <= c.x[1]))) err(q + 'n (1-4), x, and spots {x, y} above the water inside x');
    if (k === 'cormorant' && !(c.x && (c.perches || []).length >= 1 && c.perches.length <= 2)) err(q + 'x and 1-2 perches');
    if (k === 'eagle' && !(c.n >= 1 && c.n <= 3 && Array.isArray(c.y) && c.y[0] > 0 && c.y[0] < c.y[1] && c.x)) err(q + 'n (1-3), x and y [low, high]');
  }
}

// ---- Headless session (used by --replay and --pacing) ----------------------------------------
// A scripted active player: cast, sink to a depth, wait, hook most bites, fight with the
// auto-player, sell, buy along a plan. Everything runs through the real sim modules at the
// fixed 1/60 step. Since Phase 14 it moves to each water it opens (not the last: it stops
// when that opens). In the Pines it fishes minnows it buys (P.baitAt). Phase 74: the Red
// Room's key-fish hunt is gone with it; Russetwood is the last water it opens.

const DT = 1 / 60;
const P = {
  castTime: 4,     // s: charge, flight, splash
  reelTime: 3,     // s: reeling in an empty lure
  cardTime: 4,     // s: lift and card
  giveUp: 60,      // s without a bite before recasting
  hookRate: 0.9,   // share of bites hooked (the rest are missed and may come back)
  hookDelay: 0.5,  // s to react to a bite
  skill: 0.85,     // fight skill of an attentive player
  depthM: 8,       // the player's usual depth (per water: depthAt)
  depthAt: { fog: 8, creek: 6, copper: 5, pines: 8, harts: 8, stone: 4, russet: 8, sound: 12, wreck: 12, tamarack: 8 },
  // Phase 68: the live bait it fishes at each water. The Pines' (and Russetwood's and the seas') best fish
  // (pike, muskie, the striped bass hybrid) take minnows, not worms, so there it buys minnows
  // a pack at a time with its own coins (worms when it cannot afford a pack).
  baitAt: { fog: 'worm', creek: 'worm', copper: 'worm', pines: 'minnow', harts: 'worm', stone: 'worm', russet: 'minnow', sound: 'minnow', wreck: 'minnow', tamarack: 'minnow' },
  lureX: 600
};
// Phase 53: 'fluoro' buys the fluorocarbon spool and puts it on (line-shy fish then bite).
// Phase 74: the Red Room is retired; the model opens Russetwood in its place (the same cost,
// the same step in V8's pacing: location 4 of the model's route) and stops there.
// Phase 80 (PLAN_WINTER.md 5): after Russetwood (where --pacing's 20 seeds stop) the plan goes
// on to a sea, then the Snow Machine and the ice, which opens free after the sea; --pacing runs
// one seed on through them (pacingIce).
// Phase 96: with waters near Cast n Chill's prices the model goes for the next water before the
// next tier of gear (the creek after the first line, Russetwood after the Pines).
const PLAN = ['line', 'creek', 'reel', 'rod', 'fluoro', 'line', 'rod', 'reel', 'pines', 'russet', 'line', 'rod', 'reel', 'line', 'rod', 'reel', 'sound', 'snow', 'tamarack'];

function session(G, seed, opts) {
  const S = G.sim, rng = new G.core.rng.Rng(seed), data = G.data;
  const save = G.core.save.defaults();
  const school = S.fish_ai.createSchool(data), bite = S.bite.create(), fight = S.fight.create();
  const fx = {}, lure = { active: false, x: (opts && opts.x) || P.lureX, y: 0, bait: 'worm', work: 1 }, latched = {}; // Phase 75: --tackle fishes each reach (opts.x); work: the model works every lure as it should be (the user's fixes)
  const uIn = { loc: 'fog', still: true, atShop: false }, bIn = { reel: false, auto: false }, fIn = { reel: false };
  Object.assign(school.ctx, { loc: 'fog', maxDepthPx: data.locations.fog.maxDepth, latched });
  const st = { phase: 'cast', t: 0, time: 0, hash: 7, catches: 0, attempts: 0, events: [], plan: 0, hookUid: 0, willHook: false, cur: null, mix: {}, coinsAt: [],
    loc: 'fog', depthM: P.depthAt.fog };

  // Travels to water id (when the model has opened it): the school there starts empty.
  function moveTo(id) {
    if (opts && opts.stay) return;
    st.loc = id; uIn.loc = id; school.ctx.loc = id; school.ctx.maxDepthPx = data.locations[id].maxDepth;
    save.loc = id; if (data.locations[id].water === 'sea') save.flags.seaSeen = true; // Phase 80: as sailing.load does
    for (const f of school.fish) f.active = false;
    lure.active = false; st.phase = 'cast'; st.t = 0;
  }

  // Phase 43 (--tackle): fish one water with one rod and one hook, the hook topped up and its
  // cost counted (baits per cast, lures when the line snaps).
  st.spent = 0; st.earned = {}; st.timeAt = {};
  if (opts && opts.loc) {
    if (opts.loc === 'tamarack') { save.gear.snow = true; save.gear.rods.push(6); save.gear.iceRod = opts.iceRod !== undefined ? opts.iceRod : 6; } // Phase 80: on the ice with an ice rod
    st.loc = opts.loc; uIn.loc = opts.loc; school.ctx.loc = opts.loc; school.ctx.maxDepthPx = data.locations[opts.loc].maxDepth; st.depthM = P.depthAt[opts.loc];
    save.unlocks[opts.loc] = true; save.loc = opts.loc;
  }
  if (opts && opts.rod !== undefined) {
    save.gear.rods = [0, opts.rod].concat(save.gear.snow ? [6] : []); save.gear.reel = save.gear.line = Math.min(4, opts.rod);
    if (data.gear.rods[opts.rod].ice) save.gear.iceRod = opts.rod; else save.gear.rod = opts.rod; // Phase 80: an ice rod for the ice
  }
  function topUp() {
    if (!opts || !opts.bait) return;
    save.gear.bait = opts.bait;
    const b = S.economy.baitById(opts.bait, data);
    if (!b.unlimited && !(save.baits[b.id] > 0)) save.baits[b.id] = 99;
    if (!b.unlimited && !b.swim) st.spent += b.cost;
  }

  // Phase 68: the pacing model's bait for this water (P.baitAt), bought when it runs out.
  function modelBait() {
    const id = P.baitAt[st.loc] || 'worm', b = S.economy.baitById(id, data);
    save.gear.bait = id;
    if (!b.unlimited && !(save.baits[id] > 0) && S.economy.buyBait(save, id, b.pack, data) === S.economy.OK) st.spent += b.cost * b.pack;
  }

  function h(v) { st.hash = (Math.imul(st.hash ^ (v | 0), 0x01000193) >>> 0); }
  function event(what) { st.events.push({ t: st.time, catches: st.catches, coins: save.coins, what }); }

  function shop() {
    while (st.plan < PLAN.length) {
      const k = PLAN[st.plan], E = S.economy;
      const r = data.locations[k] ? E.unlock(save, k, data) : (k === 'fluoro' ? E.buyLineType(save, k, data) : (k === 'snow' ? E.buySnow(save, data) : E.buy(save, k, data)));
      if (r === E.OK || r === E.MAXED) { if (r === E.OK) { event(k); if (data.locations[k] && k !== 'russet') moveTo(k); } st.plan++; } else break;
    }
  }

  function step() {
    st.time += DT;
    st.timeAt[st.loc] = (st.timeAt[st.loc] || 0) + DT;
    S.economy.effects(save, data, fx);
    S.clock.step(save, null, DT, rng, data);
    uIn.still = st.phase !== 'cast';
    S.unease.step(save, uIn, DT, rng, data);
    const c = school.ctx;
    c.hour = save.clock; c.unease = S.unease.get(save, st.loc); c.bait = lure.bait; c.rodMaxMass = fx.maxMass;
    c.attract = fx.attract; c.depthM = lure.y * 0.25; c.first = !S.economy.anyCaught(save); // Phase 96.4
    c.lure = lure.lure = fx.lure; c.smallBoost = fx.smallBoost; c.smallMass = fx.smallMass; // Phase 43
    c.lineSeen = fx.lineSeen && !(opts && opts.unseen); // Phase 53
    st.t += DT;
    switch (st.phase) {
      case 'cast':
        if (st.t >= P.castTime) {
          st.phase = 'sink'; st.t = 0; st.attempts++;
          topUp();
          if (!opts) modelBait();
          lure.active = true; lure.y = 0; lure.bait = S.economy.useBait(save, data);
          st.depthM = (opts && opts.depthM) || P.depthAt[st.loc];
          S.economy.effects(save, data, fx);
          // a lure fishes its own depth: fish rise to a surface lure; the player reels a plug down to its depth
          if (fx.lure) st.depthM = fx.swim === 'top' ? fx.topDepthM : Math.min(st.depthM, fx.maxDepthM);
          S.clock.clearLatch(latched); S.clock.latch(latched, save.clock, data.windows);
        }
        break;
      case 'sink':
        lure.y = Math.min(st.depthM * 4, lure.y + 12 * DT * (fx.lure ? Math.max(0.25, fx.sink) : 1));
        if (lure.y >= st.depthM * 4) { st.phase = 'wait'; st.t = 0; }
        break;
      case 'wait':
        if (bite.slot >= 0 && school.fish[bite.slot].uid !== st.hookUid) { st.hookUid = school.fish[bite.slot].uid; st.willHook = rng.next() < P.hookRate; }
        bIn.reel = bite.slot >= 0 && st.willHook && bite.t >= P.hookDelay;
        if (S.bite.step(bite, bIn, DT, rng, data, school) === S.bite.HOOK) {
          const f = school.fish[bite.slot], sp = data.fish[f.sp], q = S.economy.hookQ(sp, lure.bait, rng.next(), data), sz = S.economy.size(sp, q, {});
          st.cur = { sp: f.sp, id: sp.id, q, len: sz.len, w: sz.w,
            price: S.economy.price(sp, q, data), windowCatch: Object.keys(latched)[0] || null };
          S.fight.start(fight, f.sp, sp, fx, rng, data, S.bite.hold(bite.t, data)); // Phase 23: the hold from the hook-set time
          f.active = false; S.fish_ai.scatter(school); S.bite.reset(bite);
          lure.active = false; st.phase = 'fight'; st.t = 0; h(f.sp);
        } else if (st.t >= P.giveUp) { lure.active = false; st.phase = 'reel'; st.t = 0; }
        break;
      case 'fight': {
        fIn.reel = S.fight.autoPlayer(fight, P.skill, rng) === 1;
        const r = S.fight.step(fight, fIn, DT, rng, data);
        if (r === S.fight.WIN) { st.phase = 'card'; st.t = 0; }
        else if (r !== S.fight.NONE) {
          if (r === S.fight.SNAP && S.economy.loseLure(save, lure.bait, data)) st.spent += S.economy.baitById(lure.bait, data).cost;
          st.phase = 'reel'; st.t = 0; h(r);
        }
        break;
      }
      case 'card':
        if (st.t >= P.cardTime) {
          S.economy.recordCatch(save, st.cur, 'sell');
          st.earned[st.loc] = (st.earned[st.loc] || 0) + st.cur.price; // Phase 80: what each water paid
          if (!st.catches) st.firstAt = st.time; // Phase 96.4: game seconds to the first fish landed
          st.catches++; st.mix[st.cur.id] = (st.mix[st.cur.id] || 0) + 1; h(save.coins);
          if (!opts || opts.shop !== false) shop();
          st.phase = 'cast'; st.t = 0;
        }
        break;
      case 'reel':
        if (st.t >= P.reelTime) { st.phase = 'cast'; st.t = 0; }
        break;
    }
    S.fish_ai.stepSchool(school, lure, DT, rng, data);
    if ((Math.round(st.time * 60) % 60) === 0) {
      for (const f of school.fish) if (f.active) { h(f.x * 100); h(f.y * 100); h(f.state.length); }
      if (Math.round(st.time) % 1800 === 0) st.coinsAt.push([Math.round(st.time / 60), save.coins]);
    }
  }

  return { st, save, school, bite, step, run(seconds, until) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) { step(); if (until && until(st, save)) break; } return st; } };
}

// ---- --tackle (Phase 43) ---------------------------------------------------------------------
// Each hook (the live baits and the lures) fished for an hour at each water with the rod of
// that stage (Fogbound the fibreglass, the creek the graphite, the Pines the lacquered, the
// Red Room the long rod), 4 seeds: catches and coins an hour, net of what the hook cost.
// Phase 53: the line is left out of it (unseen: line-shy fish bite as on fluorocarbon, the
// fight is monofilament's), so the lures are compared as they were before the line types.
// Phase 69: 23 lures, many made for big fish only, so a lure is fished (and judged) only at
// the waters where something takes it on that stage's rod ('-' elsewhere). Target: every lure
// fishes some water, and at every water it fishes earns at least 50% of what worms earn (it is
// worth buying over the free bait) and at most 200% of the best live bait there (it does not
// outclass what the shop already sells: a lure made for the big fish of a water hooks them at
// their top sizes, so the big waters' lures are measured against their minnows). The
// waters run in processes at once (--tackle-water w prints one water's numbers as JSON).

// Phase 75: each reach of a water is fished on its own and a hook is judged by its best reach
// there (tackleReaches below); the table shows that reach's numbers.
// Phase 74: nine waters, each with the rod of its stage (by cost: the fibreglass at Fogbound,
// the graphite at the creek and Copperbend, the lacquered at the Pines, Hartsmere and
// Stonehorn, the long rod at Russetwood and the seas).
// Phase 81: and Tamarack Lake on the Ice Rod (index 6), with only the hooks that go down a hole.
const TACKLE_WATERS = { fog: 1, creek: 2, copper: 2, pines: 3, harts: 3, stone: 3, russet: 4, sound: 4, wreck: 4, tamarack: 6 };
function tackleHooks(d, w) { return ['worm', 'cricket', 'minnow'].concat(d.gear.lures.map(l => l.id)).filter(id => !w || !d.locations[w].ice || d.ICE_TYPES.indexOf((d.gear.lures.find(l => l.id === id) || {}).type || 'float') >= 0); }
// Phase 75: a water is fished reach by reach (each at its middle), and a hook is judged at a
// water by its best reach, as a player fishes it where it works. In each reach it is fished at
// the depth its takers live at (the median of the middles of their homes' depths there; the
// lure's own depth limits still apply), so a heavy bladebait is fished on the halibut's bed and
// a float near the top. A hook fishes a reach if something living there takes it on that
// stage's rod.
function tackleTakers(G, hk, w, reach) {
  const d = G.data, lure = d.gear.lures.some(l => l.id === hk), max = d.gear.rods[TACKLE_WATERS[w]].maxMass;
  return d.fish.map(f => [f, d.homeOf(f, w, reach)]).filter(([f, h]) => h && f.mass <= max && G.sim.fish_ai.interest(f, hk, lure) > 0);
}
function tackleWater(w) {
  const G = load(), d = G.data, L = d.locations[w], out = {};
  for (const hk of tackleHooks(d, w)) {
    for (const R of L.reaches) {
      const tk = tackleTakers(G, hk, w, R.id);
      if (!tk.length) continue;
      const mids = tk.map(([f, h]) => (h.depth[0] + h.depth[1]) / 2).sort((a, b) => a - b), depthM = Math.min(L.maxDepth / 4 - 0.5, mids[mids.length >> 1]);
      let coins = 0, catches = 0;
      for (let sd = 1; sd <= 4; sd++) {
        const s = session(G, sd * 97, { stay: true, shop: false, loc: w, rod: TACKLE_WATERS[w], bait: hk, unseen: true, x: Math.round((R.x[0] + R.x[1]) / 2), depthM }); // Phase 53: the line out of the picture
        const c0 = s.save.coins; s.run(3600);
        coins += s.save.coins - c0 - s.st.spent; catches += s.st.catches;
      }
      if (!out[hk] || coins / 4 > out[hk].coins) out[hk] = { coins: coins / 4, catches: catches / 4, reach: R.id, depthM };
    }
  }
  return out;
}

function tackleCheck() {
  const G = load(), d = G.data, hooks = tackleHooks(d), cp = require('child_process');
  const res = {};
  return Promise.all(Object.keys(TACKLE_WATERS).map(w => new Promise((ok, no) => {
    cp.execFile(process.execPath, [__filename, '--tackle-water', w], { maxBuffer: 1 << 24 }, (e, so) => { if (e) no(e); else { res[w] = JSON.parse(so); ok(); } });
  }))).then(() => {
    console.log('net coins an hour (catches an hour) over 4 seeds x 60 min; - where nothing takes it on that rod');
    console.log('hook              ' + Object.keys(TACKLE_WATERS).map(w => w.padStart(16)).join(''));
    for (const hk of hooks) {
      let row = hk.padEnd(18);
      for (const w in TACKLE_WATERS) { const r = res[w][hk]; row += (r ? Math.round(r.coins) + ' (' + r.catches.toFixed(1) + ')' : '-').padStart(16); }
      console.log(row);
    }
    let bad = 0, lo = Infinity, hi = 0;
    for (const l of d.gear.lures) {
      const ws = Object.keys(TACKLE_WATERS).filter(w => res[w][l.id]);
      if (!ws.length) { bad++; console.log('FAIL ' + l.id + ' fishes no water on its stage\'s rod'); }
      for (const w of ws) {
        const best = Math.max(...['worm', 'cricket', 'minnow'].map(b => res[w][b] ? res[w][b].coins : -Infinity)), c = res[w][l.id].coins; // Phase 75: a bait nothing here takes is not fished
        const r = c / Math.max(1, res[w].worm ? res[w].worm.coins : 1), rb = c / Math.max(1, best);
        lo = Math.min(lo, r); hi = Math.max(hi, rb);
        if (r < 0.5) { bad++; console.log('FAIL ' + l.id + ' at ' + w + ': ' + (100 * r).toFixed(0) + '% of worms'); }
        if (rb > 2) { bad++; console.log('FAIL ' + l.id + ' at ' + w + ': ' + (100 * rb).toFixed(0) + '% of the best live bait'); }
      }
    }
    console.log((bad ? 'FAIL' : 'PASS') + ' every lure (' + d.gear.lures.length + ') fishes some water, and earns 50%+ of worms and at most 200% of the best live bait at every water it fishes (lowest ' + (100 * lo).toFixed(0) + '% of worms, highest ' + (100 * hi).toFixed(0) + '% of the best bait)');
    return bad ? 1 : 0;
  });
}

// ---- --homes (Phase 75) ---------------------------------------------------------------------
// PLAN_WATERS.md §3 placed every species by water, reach, depth and hour. This prints those
// tables from the data (fish.js homes) and checks them against the plan's, row by row: the
// same species in the same reaches, at the same depths, on the bottom or not, at the same hours.
function homesCheck() {
  const G = load(), d = G.data;
  const md = fs.readFileSync(path.join(ROOT, 'PLAN_WATERS.md'), 'utf8'), mw = fs.readFileSync(path.join(ROOT, 'PLAN_WINTER.md'), 'utf8');
  // Phase 80: and PLAN_WINTER.md §3, the ice fish of Tamarack Lake.
  const sec = md.slice(md.indexOf('## 3. Where each species lives'), md.indexOf('## 4. Design')) + '\n' + mw.slice(mw.indexOf('## 3. Where each ice fish lives'), mw.indexOf('## 4. Phases'));
  const byName = n => {
    const exact = d.fish.find(f => f.name === n.trim()); // Phase 80: "Yellow Perch (Ice)" is its own species
    if (exact) return exact;
    n = n.replace(/\(.*?\)/g, '').trim();
    return d.fish.find(f => f.name === n) || d.fish.find(f => f.name.startsWith(n + ' ')) || null;
  };
  const hoursOf = s => s.trim() === 'any' ? [] : s.split(/[,\/]/).map(x => x.trim()).filter(Boolean).sort();
  const depthOf = s => { const m = s.match(/([\d.]+)–([\d.]+) m/) || s.match(/([\d.]+)–([\d.]+)/); return m ? [+m[1], +m[2]] : null; };
  const plan = [], probs = [];
  let water = null, reach = '*';
  for (const line of sec.split('\n')) {
    const hd = line.match(/^### (.+?) \(/);
    if (hd) { water = Object.values(d.locations).find(L => L.name === hd[1]); reach = '*'; if (!water) probs.push('unknown water in the plan: ' + hd[1]); continue; }
    if (!water) continue;
    if (line.startsWith('|')) {
      const c = line.split('|').slice(1, -1).map(x => x.trim());
      if (c[0] === 'Species' || c[0] === 'Reach' || /^-+$/.test(c[0])) continue;
      let sp, dep, when;
      if (c.length === 4) { if (c[0]) { const r = water.reaches.find(x => x.name === c[0]); if (!r) probs.push('unknown reach ' + c[0]); reach = r ? r.id : '?'; } [sp, dep, when] = c.slice(1); }
      else [sp, dep, when] = c;
      plan.push({ w: water.id, r: reach, sp, dep, when });
    } else if (line.includes(' · ')) {
      for (let item of line.replace(/\.\s*\(.*$/, '').replace(/\.$/, '').split(' · ')) {
        const m = item.trim().match(/^(.+?) ([\d.]+–[\d.]+)( bed,)? (.+)$/);
        if (!m) { probs.push('cannot read "' + item + '"'); continue; }
        plan.push({ w: water.id, r: '*', sp: m[1], dep: m[2] + (m[3] ? ', bed' : ''), when: m[4] });
      }
    }
  }
  const key = (w, r, id) => w + ' ' + r + ' ' + id, want = {};
  for (const p of plan) {
    const f = byName(p.sp);
    if (!f) { probs.push('plan names an unknown species: ' + p.sp); continue; }
    want[key(p.w, p.r, f.id)] = { depth: depthOf(p.dep), bed: /bed/.test(p.dep), hours: hoursOf(p.when) };
  }
  const have = {};
  for (const f of d.fish) for (const h of f.homes) for (const r of (h.reaches.length ? h.reaches : ['*'])) have[key(h.loc, r, f.id)] = { depth: h.depth, bed: !!h.bed, hours: h.hours.slice().sort() };
  for (const k in want) {
    const a = want[k], b = have[k];
    if (!b) { probs.push('in the plan, not in the data: ' + k); continue; }
    if (a.depth[0] !== b.depth[0] || a.depth[1] !== b.depth[1] || a.bed !== b.bed || a.hours.join() !== b.hours.join()) probs.push(k + ': plan ' + JSON.stringify(a) + ', data ' + JSON.stringify(b));
  }
  for (const k in have) if (!want[k]) probs.push('in the data, not in the plan: ' + k);
  // The tables, from the data.
  for (const id in d.locations) {
    const L = d.locations[id];
    console.log('\n' + L.name + ' (' + L.maxDepth / 4 + ' m, ' + L.water + ')');
    for (const R of L.reaches) {
      const rows = [];
      for (const f of d.fish) for (const h of f.homes) if (h.loc === id && (!h.reaches.length || h.reaches.includes(R.id))) rows.push('  ' + (L.reaches.length > 1 ? R.name.padEnd(16) : '') + f.name.padEnd(22) + (h.depth[0] + '-' + h.depth[1] + ' m' + (h.bed ? ', bed' : '')).padEnd(14) + (h.hours.join(', ') || 'any'));
      rows.forEach(r => console.log(r));
    }
  }
  const unplaced = d.fish.filter(f => !f.homes.length).map(f => f.id);
  console.log('\n' + Object.keys(want).length + ' plan rows, ' + Object.keys(have).length + ' data rows, ' + d.fish.length + ' species' + (unplaced.length ? ', unplaced: ' + unplaced.join(', ') : ', every one placed'));
  probs.forEach(p => console.log('FAIL ' + p));
  console.log((probs.length || unplaced.length ? 'FAIL' : 'PASS') + ' the data matches PLAN_WATERS.md §3 and PLAN_WINTER.md §3 (' + probs.length + ' difference(s))');
  return probs.length || unplaced.length ? 1 : 0;
}

// ---- --replay -----------------------------------------------------------------------------

function replay(seed, minutes) {
  const a = session(load(), seed).run(minutes * 60), b = session(load(), seed).run(minutes * 60);
  console.log('replay seed ' + seed + ', ' + minutes + ' min: hash ' + a.hash + ' / ' + b.hash + ', ' + a.catches + ' catches, ' + a.attempts + ' casts');
  if (a.hash !== b.hash || a.catches !== b.catches) { console.log('FAIL: the two runs differ'); return 1; }
  console.log('PASS: identical');
  return 0;
}

// ---- --pacing -----------------------------------------------------------------------------
// V8 targets: first upgrade after about 6 catches, location 2 after about 40 minutes,
// location 4 after several hours. Run over several seeds; the median must sit in each band.

// Phase 96 (PLAN_PLAYABILITY.md §6): prices nearer Cast n Chill's, and the bands with them (the
// plan's proposal; V8's were 4-8 catches, the creek 30-50 min, Russetwood 150-360 min). The sea
// (Coldharbor Sound) is a band of its own now, so the model plays on to it.
const TARGETS = [
  { what: 'first upgrade', key: 'first', unit: 'catches', lo: 3, hi: 6 },
  { what: 'location 2 (creek)', key: 'creek', unit: 'min', lo: 10, hi: 20 },
  { what: 'location 4 (russet)', key: 'russet', unit: 'min', lo: 60, hi: 150 }, // Phase 74: Russetwood in the Red Room's place
  { what: 'a sea (sound)', key: 'sound', unit: 'min', lo: 150, hi: 300 }
];

function pacing() {
  // 20 seeds (Phase 23): over 5, the median moved by 7 minutes whenever the random stream was
  // reshuffled (the creek: 46.1 before Phase 23 and 53.5 after, though 20 seeds give 51.5 and 46.3).
  const seeds = [], rows = [];
  for (let i = 1; i <= 20; i++) seeds.push(i * 11);
  for (const seed of seeds) {
    const s = session(load(), seed);
    s.run(8 * 3600, st => st.events.some(e => e.what === 'sound'));
    const ev = s.st.events, at = k => ev.find(e => e.what === k);
    rows.push({ seed, first: ev[0] ? ev[0].catches : null, firstWhat: ev[0] && ev[0].what, creek: at('creek') && at('creek').t / 60, pines: at('pines') && at('pines').t / 60,
      firstAt: s.st.firstAt, russet: at('russet') && at('russet').t / 60, sound: at('sound') && at('sound').t / 60, catches: s.st.catches, mix: s.st.mix, events: ev, coinsAt: s.st.coinsAt, windowCatch: Object.keys(s.save.flags.windowCatch) });
  }
  const median = k => { const v = rows.map(r => r[k]).filter(x => x != null).sort((a, b) => a - b); return v.length === rows.length ? v[Math.floor(v.length / 2)] : null; };
  console.log('Active-player model (moves to each water it opens; fishes minnows in the Pines; ' + JSON.stringify(P) + ')\n');
  const r0 = rows[0];
  console.log('Seed ' + r0.seed + ' timeline:');
  r0.events.forEach(e => console.log('  ' + (e.t / 60).toFixed(1).padStart(6) + ' min  ' + String(e.catches).padStart(4) + ' catches  ' + e.what));
  console.log('  coins held every 30 min: ' + r0.coinsAt.map(c => c[0] + 'm:' + c[1]).join(' '));
  console.log('  catch mix: ' + JSON.stringify(r0.mix) + '  window catches: ' + r0.windowCatch.join(',') + '\n');
  console.log('seed   first upgrade        creek     pines    russet     sound');
  rows.forEach(r => console.log(String(r.seed).padEnd(6) + ' ' + (r.first + ' catches (' + r.firstWhat + ')').padEnd(20) + ' ' + (r.creek ? r.creek.toFixed(1) : '-').padStart(6) + 'm  ' + (r.pines ? r.pines.toFixed(1) : '-').padStart(6) + 'm  ' + (r.russet ? r.russet.toFixed(1) : '-').padStart(6) + 'm  ' + (r.sound ? r.sound.toFixed(1) : '-').padStart(6) + 'm'));
  console.log('');
  let failed = 0;
  failed += pacingIce(seeds[0]);

  for (const t of TARGETS) {
    const m = median(t.key), pass = m != null && m >= t.lo && m <= t.hi;
    if (!pass) failed++;
    console.log((pass ? 'PASS ' : 'FAIL ') + t.what + ': median ' + (m == null ? 'never' : m.toFixed(1) + ' ' + t.unit) + ' (target ' + t.lo + '-' + t.hi + ' ' + t.unit + ')');
  }
  return failed ? 1 : 0;
}

// ---- --first (Phase 96.4) ------------------------------------------------------------------
// A gentler first session: on each of the pacing's 20 seeds a fresh save lands its first fish
// (the card done) inside 60 s of game time; and once one is landed the bias is off (the next
// cast's school has no eager fish).
function firstCheck() {
  const seeds = [], got = [];
  for (let i = 1; i <= 20; i++) seeds.push(i * 11);
  let after = 0;
  for (const seed of seeds) {
    const G = load(), s = session(G, seed);
    s.run(600, st => st.catches > 0);
    got.push(s.st.firstAt == null ? Infinity : s.st.firstAt);
    if (G.sim.economy.anyCaught(s.save) === false) after++;
  }
  const max = Math.max(...got), sorted = got.slice().sort((a, b) => a - b), ok = max < 60;
  console.log('first fish landed (s of game time): ' + got.map(v => v.toFixed(1)).join(' '));
  console.log((ok ? 'PASS ' : 'FAIL ') + 'every fresh save lands a fish inside 60 s: median ' + sorted[sorted.length >> 1].toFixed(1) + ' s, slowest ' + max.toFixed(1) + ' s');
  const off = after === 0;
  console.log((off ? 'PASS ' : 'FAIL ') + 'the first-taker bias is off once a fish is landed (fish_ai ctx.first false on all ' + seeds.length + ')');
  return ok && off ? 0 : 1;
}

// Phase 80 (PLAN_WINTER.md 2.2 and 5): one seed played on past Russetwood: a sea, the Snow
// Machine, then the ice (free once a sea has been seen). Checks: the ice cannot be opened before
// a sea visit; the model reaches it only after the sea and the snowmobile; and it is not a
// shortcut: the ice pays no more an hour than the sea before it did.
// Phase 96: the sea against the ice, an hour fished at each with the model's bait there (the sea
// on the Long Rod, the ice on the Ice Rod), net of bait, on three seeds. With the Snow Machine at
// 1250 the model is at sea only some 17 minutes before it buys it, too short to rate the sea.
function iceVsSea(seed) {
  const rows = [];
  for (const sd of [seed, seed * 2, seed * 3]) {
    const r = {};
    for (const loc of ['sound', 'tamarack']) {
      const s = session(load(), sd, { loc, rod: loc === 'tamarack' ? 6 : 4, bait: P.baitAt[loc] || 'worm', stay: true, shop: false });
      s.run(3600); r[loc] = Math.round((s.st.earned[loc] || 0) - (s.st.spent || 0));
    }
    rows.push(r);
  }
  const sea = rows.reduce((a, r) => a + r.sound, 0) / rows.length, ice = rows.reduce((a, r) => a + r.tamarack, 0) / rows.length;
  console.log('An hour each (seeds ' + seed + ', ' + seed * 2 + ', ' + seed * 3 + '): the sea ' + rows.map(r => r.sound).join('/') + ', the ice ' + rows.map(r => r.tamarack).join('/') + ' coins net; mean ' + Math.round(sea) + ' vs ' + Math.round(ice));
  return ice > 0 && ice <= sea;
}

function pacingIce(seed) {
  const G = load(), E = G.sim.economy, fresh = G.core.save.defaults();
  let bad = 0;
  const early = E.canUnlock(fresh, 'tamarack', G.data) === E.LOCKED;
  const s = session(G, seed);
  s.run(16 * 3600, st => st.events.some(e => e.what === 'tamarack') && st.timeAt.tamarack > 3600);
  const ev = s.st.events, at = k => ev.find(e => e.what === k), t = k => at(k) ? (at(k).t / 60).toFixed(1) + ' min' : 'never';
  const rate = w => s.st.timeAt[w] ? s.st.earned[w] / (s.st.timeAt[w] / 3600) : 0;
  console.log('Seed ' + seed + ' played on to the ice: russet ' + t('russet') + ', sound ' + t('sound') + ', snow ' + t('snow') + ', tamarack ' + t('tamarack') +
    '; coins an hour at russet ' + Math.round(rate('russet')) + ', sound ' + Math.round(rate('sound')) + ', tamarack ' + Math.round(rate('tamarack')) + ' (' + ((s.st.timeAt.tamarack || 0) / 60).toFixed(0) + ' min on the ice)');
  const order = at('sound') && at('snow') && at('tamarack') && at('sound').t <= at('snow').t && at('snow').t <= at('tamarack').t;
  const checks = [
    ['the ice is locked before a sea visit', early],
    ['the snowmobile and the ice come after the sea', !!order],
    ['the ice pays at most what the sea does an hour (no shortcut)', iceVsSea(seed)]
  ];
  for (const [what, ok] of checks) { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) bad++; }
  console.log('');
  return bad;
}

// ---- --saves ------------------------------------------------------------------------------
// 14.8: a save as each milestone wrote it (the shapes of save.js defaults() at those commits,
// with some play in them) must load in today's game: through the real export/import string,
// migrated to the current version, with every field today's defaults have, and usable by
// the economy and the unlock checks.

const OLD_SAVES = [
  { from: 'Phase 1 (2f90f2b), v1', save: { version: 1, coins: 12, gear: {}, baits: {}, journal: {}, kept: [], cabinLevel: 0, unlocks: {}, unease: {}, clock: 0, lastSeen: 0, flags: {}, tapes: [], settings: {}, rng: null } },
  { from: 'Milestone A, Phase 7 (1b6ab97), v1', save: { version: 1, coins: 140, gear: {}, baits: {}, journal: { gloam_perch: { caught: 9, bestLen: 24.1, bestW: 0.44, hints: [], seen: 1 }, mist_carp: { caught: 2, bestLen: 61, bestW: 2.6, hints: ['hour:grey'], seen: 1 } },
    kept: [{ id: 'mist_carp', len: 61, w: 2.6 }], cabinLevel: 0, unlocks: {}, unease: { fog: 0.4 }, clock: 22.5, lastSeen: 0, flags: {}, tapes: [], settings: {}, rng: 123456789 } },
  { from: 'Phase 8 (855d35a), v2', save: { version: 2, coins: 410, gear: { rod: 1, reel: 1, line: 1, lantern: true, depthFinder: false, bait: 'cricket' }, baits: { cricket: 7 }, journal: { gloam_perch: { caught: 30, bestLen: 25, bestW: 0.49, hints: [], seen: 1 } },
    kept: [], cabinLevel: 0, unlocks: { fog: true, creek: true }, unease: { fog: 0.2 }, clock: 3.1, lastSeen: 0, flags: { windowCatch: { owl_247: true } }, tapes: [], settings: {}, rng: 99 } },
  { from: 'Phase 9 (29a69dc), v3', save: { version: 3, coins: 900, gear: { rod: 2, reel: 1, line: 2, lantern: true, depthFinder: true, bait: 'minnow' }, baits: { minnow: 3, unlabelled: 1 }, journal: { owl_eel: { caught: 1, bestLen: 90, bestW: 1.8, hints: ['window:owl_247'], seen: 1, read: 1 } },
    kept: [{ id: 'owl_eel', len: 90, w: 1.8 }], cabinLevel: 2, unlocks: { fog: true, creek: true }, loc: 'creek', unease: { fog: 0.1, creek: 0.5 }, clock: 12, lastSeen: 0,
    flags: { windowCatch: { owl_247: true }, lines: { coffee: 3 }, shopVisits: 6, heavy: { fog: true } }, tapes: [], settings: { volume: 0.4, mute: true }, rng: 7 } },
  { from: 'Milestone B, Phase 10 (b041d97), v4', save: { version: 4, coins: 2500, gear: { rod: 3, reel: 3, line: 3, lantern: true, depthFinder: true, bait: 'worm' }, baits: {}, journal: { hollow_pike: { caught: 4, bestLen: 80, bestW: 3.2, hints: ['unease'], seen: 1, late: { bait: true }, lateNew: true } },
    kept: [], cabinLevel: 3, unlocks: { fog: true, creek: true, pines: true }, loc: 'pines', unease: { pines: 0.9 }, clock: 2.7, lastSeen: 0,
    flags: { windowCatch: { owl_333: true }, lines: {}, shopVisits: 2, heavy: {}, anomalies: { lit_window: 2 }, dogStare: { fog: true }, lateAt: 30 }, tapes: [], settings: { volume: 0.8, mute: false }, rng: 5 } },
  { from: 'Phase 12 (159b20d), v4 with tapes and a phantom', save: { version: 4, coins: 6100, gear: { rod: 4, reel: 4, line: 4, lantern: true, depthFinder: true, bait: 'unlabelled' }, baits: { unlabelled: 2 }, journal: { owl_eel: { caught: 0, bestLen: 0, bestW: 0, hints: [], seen: 0, phantom: true } },
    kept: [], cabinLevel: 4, unlocks: { fog: true, creek: true, pines: true, red: true }, loc: 'red', unease: { red: 0.3 }, clock: 9, lastSeen: 1700000000000,
    flags: { windowCatch: { owl_247: true }, lines: {}, shopVisits: 9, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [{ loc: 'fog', kind: 'away', entries: [], caught: 3, lost: 0, coins: 20, secs: 600 }], settings: { volume: 1, mute: false }, rng: 11 } },
  // Phase 47: a v5 save from before the looks (Phase 46, 148a0b9), one with a look chosen, and one whose look was hand-edited.
  { from: 'Phase 46 (148a0b9), v5 with a rack and lures', save: { version: 5, coins: 800, gear: { rod: 5, rods: [0, 1, 5], reel: 1, line: 1, lantern: false, depthFinder: false, bait: 'spinner' }, baits: { spinner: 2, grub: 4 }, journal: {},
    kept: [], cabinLevel: 1, unlocks: { fog: true }, loc: 'fog', unease: { fog: 0.1 }, clock: 20, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 3, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: false }, rng: 3 } },
  { from: 'Phase 47, v5 with a look', save: { version: 5, coins: 50, gear: { rod: 0, rods: [0], reel: 0, line: 0, lantern: false, depthFinder: false, bait: 'worm' }, baits: {}, journal: {},
    kept: [], cabinLevel: 0, unlocks: { fog: true }, loc: 'fog', unease: {}, clock: 19, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 0, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true }, look: { fisher: 'headlamp', dog: 'husky' }, rng: 4 }, look: { fisher: 'headlamp', dog: 'husky' } },
  { from: 'Phase 47, v5 with a hand-edited look', save: { version: 5, coins: 50, gear: { rod: 0, rods: [0], reel: 0, line: 0, lantern: false, depthFinder: false, bait: 'worm' }, baits: {}, journal: {},
    kept: [], cabinLevel: 0, unlocks: { fog: true }, loc: 'fog', unease: {}, clock: 19, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 0, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true }, look: { fisher: 7 }, rng: 4 }, look: { fisher: 'red_cap', dog: 'golden' } },
  // Phase 53: a v6 save with braid on the reel and fluorocarbon owned, and a released fish.
  { from: 'Phase 53, v6 with line types', save: { version: 6, coins: 300, gear: { rod: 1, rods: [0, 1], reel: 1, line: 2, lineType: 'braid', lineTypes: ['mono', 'fluoro', 'braid'], lantern: false, depthFinder: false, bait: 'worm' }, baits: {},
    journal: { mist_carp: { caught: 1, bestLen: 50, bestW: 1.9, hints: ['line'], seen: true, phantom: false, released: 1 } }, kept: [], cabinLevel: 0, unlocks: { fog: true }, loc: 'fog', unease: {}, clock: 12, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 1, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true }, look: { fisher: 'red_cap', dog: 'golden' }, rng: 6 }, lineType: 'braid' },
  // Phase 68: a v6 save from Phase 67 (6a4f20d) with old species in the journal and on the wall: they are dropped, the rest stays.
  { from: 'Phase 67 (6a4f20d), v6 with old fish kept', save: { version: 6, coins: 1234, gear: { rod: 2, rods: [0, 1, 2], reel: 2, line: 2, lineType: 'mono', lineTypes: ['mono'], lantern: true, depthFinder: false, bait: 'bobber' }, baits: { bobber: 2, spoon: 1 },
    journal: { sleeper: { caught: 1, bestLen: 150, bestW: 9.1, hints: ['spot:cold_hole'], seen: true, phantom: false, late: { bait: true } }, pier_roach: { caught: 12, bestLen: 20, bestW: 0.3, hints: [], seen: true, phantom: false, took: ['worm'] } },
    kept: [{ id: 'sleeper', len: 150, w: 9.1 }, { id: 'pier_roach', len: 20, w: 0.3 }], cabinLevel: 2, unlocks: { fog: true, creek: true }, loc: 'creek', unease: { creek: 0.2 }, clock: 21, lastSeen: 0,
    flags: { windowCatch: { owl_247: true }, lines: { carp_fog: true }, shopVisits: 14, heavy: { fog: true }, anomalies: {}, dogStare: { fog: true }, lateAt: 13 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true, fullscreen: true }, look: { fisher: 'red_cap', dog: 'golden' }, rng: 8 } },
  // Phase 69: a v7 save from Phase 68 (c1ca9e4) with every one of the seven old lures: each count goes to its new lure, the spoon on the hook too.
  { from: 'Phase 68 (c1ca9e4), v7 with the seven old lures', save: { version: 7, coins: 640, gear: { rod: 1, rods: [0, 1], reel: 1, line: 1, lineType: 'mono', lineTypes: ['mono'], lantern: false, depthFinder: false, bait: 'spoon' },
    baits: { spinner: 3, plug: 1, grub: 8, popper: 2, jig: 4, bobber: 6, spoon: 5, minnow: 9 }, journal: { yellow_perch: { caught: 5, bestLen: 22, bestW: 0.2, hints: [], seen: true, phantom: false, took: ['worm', 'grub', 'spinner', 'spoon'] } }, kept: [], cabinLevel: 1, unlocks: { fog: true }, loc: 'fog', unease: {}, clock: 20, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 4, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true, fullscreen: true }, look: { fisher: 'red_cap', dog: 'golden' }, rng: 9 },
    baits: { spinnerbait: 3, crankbait: 1, wacky_worm: 8, topwater: 2, jighead: 4, bobber: 6, small_spoon: 5, minnow: 9 }, bait: 'small_spoon' }
,
  // Phase 79b: a v9 save with the lantern and the finder bought: 250 + 180 come back, both go.
  { from: 'Phase 79 (d24232d), v9 with the lantern and the finder', save: { version: 9, coins: 1000, gear: { rod: 1, rods: [0, 1], reel: 1, line: 1, lineType: 'mono', lineTypes: ['mono'], lantern: true, depthFinder: true, bait: 'worm' },
    baits: {}, journal: {}, kept: [], cabinLevel: 1, unlocks: { fog: true, creek: true }, loc: 'creek', unease: {}, clock: 12, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 2, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true, fullscreen: true }, look: { fisher: 'red_cap', dog: 'golden' }, rng: 9 } },
  // Phase 80: a v10 save that has opened Coldharbor Sound: it has been out to sea (flags.seaSeen), so the ice is open to it; no Snow Machine yet.
  { from: 'Phase 79b (c183807), v10 out at sea', save: { version: 10, coins: 3100, gear: { rod: 4, rods: [0, 1, 2, 3, 4], reel: 4, line: 4, lineType: 'braid', lineTypes: ['mono', 'braid'], bait: 'minnow' },
    baits: { minnow: 4 }, journal: { striped_bass: { caught: 3, bestLen: 80, bestW: 6.1, hints: [], seen: true, phantom: false } }, kept: [], cabinLevel: 4, unlocks: { fog: true, creek: true, pines: true, russet: true, sound: true }, loc: 'sound', unease: {}, clock: 6, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 30, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true, fullscreen: true }, look: { fisher: 'red_cap', dog: 'golden' }, rng: 10 }, lineType: 'braid' },
  // Phase 84: a v11 save on the ice with the Snow Machine and the Ice Rod: it gains the Back Pond as it was (all the trash, the stream jammed, nothing stocked).
  { from: 'Phase 82 (aa9a4e8), v11 on the ice', save: { version: 11, coins: 5200, gear: { rod: 4, rods: [0, 1, 2, 3, 4, 6], reel: 4, line: 4, lineType: 'braid', lineTypes: ['mono', 'braid'], bait: 'huge_spoon', snow: true, iceRod: 6 },
    baits: { huge_spoon: 2 }, journal: { ice_yellow_perch: { caught: 2, bestLen: 24, bestW: 0.2, hints: [], seen: true, phantom: false } }, kept: [], cabinLevel: 4, unlocks: { fog: true, creek: true, pines: true, russet: true, sound: true }, loc: 'tamarack', unease: {}, clock: 12, lastSeen: 0,
    flags: { windowCatch: {}, lines: {}, shopVisits: 40, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0, seaSeen: true }, tapes: [], settings: { volume: 0.8, mute: false, dogBark: true, fullscreen: true }, look: { fisher: 'red_cap', dog: 'golden' }, rng: 11 }, lineType: 'braid', bait: 'huge_spoon' }
];

function savesCheck() {
  const G = load(), SV = G.core.save, d = SV.defaults(), E = G.sim.economy;
  let failed = 0;
  // Every key today's defaults have, one level into the objects (gear, flags, settings, look).
  function missing(s) {
    const out = [];
    for (const k in d) {
      if (!(k in s)) { out.push(k); continue; }
      if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && ['gear', 'flags', 'settings', 'look'].includes(k)) for (const j in d[k]) if (!(j in s[k])) out.push(k + '.' + j);
    }
    return out;
  }
  for (const o of OLD_SAVES) {
    const probs = [];
    const r = SV.importString(SV.exportString(JSON.parse(JSON.stringify(o.save))));
    if (!r.ok) probs.push('import: ' + r.error);
    else {
      const s = r.save;
      if (s.version !== SV.VERSION) probs.push('version ' + s.version);
      const miss = missing(s); if (miss.length) probs.push('missing ' + miss.join(', '));
      try {
        const fx = E.effects(s, G.data, {});
        if (!(fx.maxMass > 0 && fx.castMax > 0)) probs.push('gear effects');
        if (!Array.isArray(s.gear.rods) || !s.gear.rods.includes(s.gear.rod)) probs.push('the rod in hand is not owned');
        if (s.gear.lineType !== (o.lineType || 'mono') || !E.ownsLineType(s, s.gear.lineType) || fx.lineType !== s.gear.lineType) probs.push('line type ' + s.gear.lineType); // Phase 53
        for (const id in G.data.locations) E.canUnlock(s, id, G.data);
        for (const id in s.journal) if (!G.data.fish.some(f => f.id === id)) probs.push('journal species ' + id + ' no longer exists');
        s.kept.forEach(k => { if (!G.data.fish.some(f => f.id === k.id)) probs.push('kept species ' + k.id + ' no longer exists'); }); // Phase 68
        const og = o.save.gear || {}, coins = o.save.coins + (o.save.unlocks && o.save.unlocks.red ? SV.RED_REFUND : 0) + (og.lantern ? SV.LANTERN_REFUND : 0) + (og.depthFinder ? SV.FINDER_REFUND : 0); // Phase 74: the Red Room's cost comes back; Phase 79b: the lantern's and the finder's
        if ('lantern' in s.gear || 'depthFinder' in s.gear) probs.push('the lantern or the finder is still in the save');
        if (s.coins !== coins) probs.push('coins ' + s.coins + ' (saved ' + o.save.coins + ', want ' + coins + ')');      // Phase 68: dropping the old fish keeps the coins
        if (s.unlocks.red || (s.unease && 'red' in s.unease) || s.flags.heavy.red || s.flags.dogStare.red) probs.push('the Red Room is still in the save');
        if (o.save.loc === 'red' && s.loc !== 'fog') probs.push('a save in the Red Room resumes at ' + s.loc + ', not Fogbound');
        if (!G.data.locations[s.loc]) probs.push('resumes at unknown water ' + s.loc);
        const sea = !!(o.save.unlocks && (o.save.unlocks.sound || o.save.unlocks.wreck)); // Phase 80: v11
        if (o.save.version >= 11) { if (s.gear.snow !== o.save.gear.snow || s.gear.iceRod !== o.save.gear.iceRod || s.flags.seaSeen !== o.save.flags.seaSeen) probs.push('v11 fields changed'); }
        else if (s.flags.seaSeen !== sea || s.gear.snow !== false || s.gear.iceRod !== -1) probs.push('v11: seaSeen ' + s.flags.seaSeen + ' (want ' + sea + '), snow ' + s.gear.snow + ', iceRod ' + s.gear.iceRod);
        const pd = s.pond; // Phase 84: v12, the Back Pond as it was
        if (!pd || pd.got !== 0 || pd.stream !== false || pd.clear !== 0 || !Array.isArray(pd.stock) || pd.stock.length || G.sim.pond.left(pd, G.data) !== 21 || G.sim.pond.murk(pd, G.data) !== 1) probs.push('v12: the pond ' + JSON.stringify(pd));
        if ((E.canUnlock(s, 'tamarack', G.data) === E.LOCKED) === sea) probs.push('the ice is ' + (sea ? 'locked' : 'open') + ' to it');
        for (const id in s.baits) if (!E.baitById(id, G.data)) probs.push('counts an unknown bait or lure ' + id);      // Phase 69: the old lures mapped
        if (!E.baitById(s.gear.bait, G.data)) probs.push('unknown hook ' + s.gear.bait);
        if (o.baits && JSON.stringify(Object.keys(o.baits).sort().map(k => [k, s.baits[k]])) !== JSON.stringify(Object.keys(s.baits).sort().map(k => [k, o.baits[k]]))) probs.push('lure counts ' + JSON.stringify(s.baits));
        if (o.bait && s.gear.bait !== o.bait) probs.push('hook ' + s.gear.bait + ' (wanted ' + o.bait + ')');
        for (const id in s.journal) (s.journal[id].took || []).forEach(t => { if (!E.baitById(t, G.data)) probs.push(id + ' caught on unknown ' + t); });
        const want = o.look || { fisher: 'red_cap', dog: 'golden' }; // Phase 47: kept when chosen, the default when absent or broken
        if (s.look.fisher !== want.fisher || s.look.dog !== want.dog || G.data.lookOf(G.data.looks.fishers, s.look.fisher).id !== s.look.fisher || G.data.lookOf(G.data.looks.dogs, s.look.dog).id !== s.look.dog) probs.push('look ' + JSON.stringify(s.look));
      } catch (e) { probs.push('throws: ' + e.message); }
    }
    if (probs.length) failed++;
    console.log((probs.length ? 'FAIL ' : 'PASS ') + o.from + (probs.length ? ': ' + probs.join('; ') : ': loads as v' + SV.VERSION));
  }
  const bad = SV.importString('SS1.bm90IGEgc2F2ZQ==.0');
  console.log((bad.ok ? 'FAIL' : 'PASS') + ' a damaged string is refused (' + (bad.error || 'accepted') + ')');
  return failed || bad.ok ? 1 : 0;
}

// ---- --passive ----------------------------------------------------------------------------
// Phase 52 (the user, 2026-10-30: "remove passive income"): passive mode (TAB) and time away
// are gone. Coins come only from fish the player lands and sells. Checks: the passive sim is
// not loaded and the data has no passive multiplier; no key or button starts it; and a save
// that has been away for 8 hours loads with the same coins and journal it was saved with.

function passiveCheck() {
  const G = load();
  let bad = 0;
  const gone = !G.sim.passive && !G.data.gear.passive;
  console.log((gone ? 'PASS' : 'FAIL') + ' no passive sim and no passive.incomeMult');
  const src = fs.readFileSync(path.join(ROOT, 'js/core/input.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const noKey = !/'passive'/.test(src) && !/Tab:/.test(src) && !/passive\.js|tape\.js|away\(/.test(html);
  console.log((noKey ? 'PASS' : 'FAIL') + ' no TAB key, no button and no time-away call at boot');
  const SV = G.core.save, s0 = SV.defaults();
  s0.coins = 37; s0.lastSeen = 1e12; s0.journal.yellow_perch = { caught: 2, bestLen: 20, bestW: 0.3, hints: [], seen: true, phantom: false };
  const r = SV.importString(SV.exportString(JSON.parse(JSON.stringify(s0))));
  const same = r.ok && r.save.coins === 37 && r.save.journal.yellow_perch.caught === 2 && Object.keys(r.save.journal).length === 1;
  console.log((same ? 'PASS' : 'FAIL') + ' a save away for hours loads as it was saved (coins ' + (r.ok ? r.save.coins : '-') + ')');
  bad = (gone ? 0 : 1) + (noKey ? 0 : 1) + (same ? 0 : 1);
  return bad ? 1 : 0;
}

// ---- --fight --------------------------------------------------------------------------------
// Phase 23: how fights end, by how they are fought, on each gear tier, over every species the
// tier's rod can hold (N fights each, hooked 0.5 s into the bite). Players: always reeling,
// never reeling, tapping (holding and letting go for random spans of 0.1–0.5 s), and the
// auto-player at several skills. Ends: landed, snapped, thrown (the hook worked loose on a
// slack line), run out (D held at 1 for 3 s). Targets (PLAN_REALISM.md 23.4) on all tiers together.

function fightCheck() {
  const G = load(), F = G.sim.fight, d = G.data, g = d.gear, N = 60;
  const hold = G.sim.bite.hold(P.hookDelay, d);
  const players = [
    ['always', () => 1], ['never', () => 0],
    ['tapping', (st, rng, m) => { if ((m.left -= DT) <= 0) { m.on = !m.on; m.left = rng.range(0.1, 0.5); } return m.on ? 1 : 0; }],
    ['skill 0.2', (st, rng) => F.autoPlayer(st, 0.2, rng)], ['skill 0.5', (st, rng) => F.autoPlayer(st, 0.5, rng)],
    ['skill 0.8', (st, rng) => F.autoPlayer(st, 0.8, rng)], ['skill 0.85', (st, rng) => F.autoPlayer(st, 0.85, rng)]
  ];
  const all = {};
  console.log('hook hold at a 0.5 s hook-set: ' + hold.toFixed(3) + '  (instant 1, late ' + g.fight.holdLate + ')');
  console.log('tier  player       landed  snapped  thrown  run out  (s to a loss)');
  // Phase 80: and the ice: the (Ice) species on the two ice rods, with the best reel and line
  // (the ice opens after the seas), as 'ice6' and 'ice7'; they are not fought on the ladder.
  const tiers = [0, 1, 2, 3, 4, 6, 7];
  for (const tier of tiers) { // the five ladder tiers (Phase 43: with the rod's small-fish hold)
    const ice = !!g.rods[tier].ice, lt = ice ? 4 : tier;
    const gear = { lineStrength: g.lines[lt].strength, reelSpeed: g.reels[lt].speed, maxMass: g.rods[tier].maxMass, smallHook: g.rods[tier].smallHook };
    const fish = d.fish.filter(f => f.mass <= g.rods[tier].maxMass && f.locations.length && !!f.ice === ice); // Phase 68: the fish of today's waters (not the sea's)
    for (const [name, play] of players) {
      const rng = new G.core.rng.Rng(4242 + tier), n = { win: 0, snap: 0, thrown: 0, run: 0, lossT: 0 };
      for (const f of fish) for (let i = 0; i < N; i++) {
        const st = F.create(), m = { on: false, left: 0 };
        F.start(st, d.fish.indexOf(f), f, gear, rng, d, hold);
        let r = F.NONE, steps = 0;
        while (r === F.NONE && steps < 60 * 600) { r = F.step(st, { reel: play(st, rng, m) === 1 }, DT, rng, d); steps++; }
        if (r === F.WIN) n.win++; else { n.lossT += st.t; if (r === F.SNAP) n.snap++; else if (st.thrown) n.thrown++; else n.run++; }
      }
      const tot = fish.length * N, a = all[name] || (all[name] = { win: 0, snap: 0, thrown: 0, run: 0, lossT: 0, tot: 0 });
      ['win', 'snap', 'thrown', 'run', 'lossT'].forEach(k => { a[k] += n[k]; }); a.tot += tot;
      const pc = k => (100 * n[k] / tot).toFixed(1).padStart(6) + '%';
      console.log((ice ? 'ice' + tier : String(tier)).padEnd(6) + name.padEnd(12) + pc('win') + ' ' + pc('snap') + ' ' + pc('thrown') + ' ' + pc('run') + '   ' + (tot - n.win ? (n.lossT / (tot - n.win)).toFixed(1) : '-'));
    }
  }
  const rate = (k, w) => all[k][w] / all[k].tot, loss = k => all[k].tot - all[k].win;
  const checks = [
    ['skill 0.85 lands at least 90%', rate('skill 0.85', 'win') >= 0.9, (100 * rate('skill 0.85', 'win')).toFixed(1) + '%'],
    ['skill 0.5 lands 65-80%', rate('skill 0.5', 'win') >= 0.65 && rate('skill 0.5', 'win') <= 0.8, (100 * rate('skill 0.5', 'win')).toFixed(1) + '%'],
    ['skill 0.5: a third of its losses or more are thrown hooks', all['skill 0.5'].thrown >= loss('skill 0.5') / 3, (100 * all['skill 0.5'].thrown / Math.max(1, loss('skill 0.5'))).toFixed(1) + '% of losses'],
    ['tapping lands 70% or less', rate('tapping', 'win') <= 0.7, (100 * rate('tapping', 'win')).toFixed(1) + '%'],
    ['never reeling loses every fish in 5-10 s', all.never.win === 0 && all.never.lossT / all.never.tot >= 5 && all.never.lossT / all.never.tot <= 10, (all.never.lossT / all.never.tot).toFixed(1) + ' s, ' + all.never.win + ' landed']
  ];
  // Phase 53: the line types on the middle tier: braid (no stretch) sets the hook firmer and
  // its strength keeps tension down, but its slack head shakes throw more hooks; fluorocarbon
  // is a little less forgiving than monofilament. Checks: every type lands 60%+ at skill 0.5
  // and 88%+ at 0.85; braid throws more hooks than mono at skill 0.5 and snaps fewer.
  const lt = {};
  console.log('\nline     player      landed  snapped  thrown  run out   (tier 2)');
  for (const t of g.lineTypes) {
    const gear = { lineStrength: g.lines[2].strength * t.strength, reelSpeed: g.reels[2].speed, maxMass: g.rods[2].maxMass, smallHook: g.rods[2].smallHook, lineRise: t.rise, lineShake: t.shake, lineHold: t.hold };
    const fish = d.fish.filter(f => f.mass <= g.rods[2].maxMass && f.locations.length && !f.ice); // Phase 68: today's waters (Phase 80: off the ice)
    lt[t.id] = {};
    for (const sk of [0.5, 0.85]) {
      const rng = new G.core.rng.Rng(777), n = { win: 0, snap: 0, thrown: 0, run: 0 };
      for (const f of fish) for (let i = 0; i < N; i++) {
        const st = F.create();
        F.start(st, d.fish.indexOf(f), f, gear, rng, d, hold);
        let r = F.NONE, steps = 0;
        while (r === F.NONE && steps < 60 * 600) { r = F.step(st, { reel: F.autoPlayer(st, sk, rng) === 1 }, DT, rng, d); steps++; }
        if (r === F.WIN) n.win++; else if (r === F.SNAP) n.snap++; else if (st.thrown) n.thrown++; else n.run++;
      }
      const tot = fish.length * N, pc = k => (100 * n[k] / tot).toFixed(1).padStart(6) + '%';
      lt[t.id][sk] = { win: n.win / tot, snap: n.snap / tot, thrown: n.thrown / tot };
      console.log(t.id.padEnd(9) + ('skill ' + sk).padEnd(11) + pc('win') + ' ' + pc('snap') + ' ' + pc('thrown') + ' ' + pc('run'));
    }
  }
  const lw = k => Math.min.apply(null, g.lineTypes.map(t => lt[t.id][k].win));
  checks.push(['every line type lands 60%+ at skill 0.5 and 88%+ at 0.85', lw(0.5) >= 0.6 && lw(0.85) >= 0.88, (100 * lw(0.5)).toFixed(1) + '%, ' + (100 * lw(0.85)).toFixed(1) + '%']);
  checks.push(['braid throws more hooks and snaps fewer lines than mono (skill 0.5)', lt.braid[0.5].thrown > lt.mono[0.5].thrown && lt.braid[0.5].snap <= lt.mono[0.5].snap,
    'thrown ' + (100 * lt.braid[0.5].thrown).toFixed(1) + '% vs ' + (100 * lt.mono[0.5].thrown).toFixed(1) + '%, snapped ' + (100 * lt.braid[0.5].snap).toFixed(1) + '% vs ' + (100 * lt.mono[0.5].snap).toFixed(1) + '%']);
  let ok = true;
  for (const [what, pass, got] of checks) { console.log((pass ? 'PASS ' : 'FAIL ') + what + ': ' + got); ok = ok && pass; }
  return ok ? 0 : 1;
}

// ---- --rod ----------------------------------------------------------------------------------
// The rod as a tapered blank (js/gfx/rod.js, Phase 31 and its fix): settled shapes over every
// tier, load, angle of the hands and direction of the line (it never bends against the line,
// never into an S, never turns its tip past the line, always settles), the action and power of
// the tiers, how closely the tip follows a tight line, and how it springs when a load comes or
// goes (one smooth curve while it moves, an overshoot, settled in under a second).

function rodCheck() {
  // The host's Math and typed arrays (8.4 #35): an empty vm context looks every global up through
  // Node's sandbox, which made a solve cost 0.052 ms here against 0.036 with these, and the
  // browser has no such lookup. rod.js is presentation; nothing it reads changes with this.
  const ctx = vm.createContext({ Math: Math, Float32Array: Float32Array, Float64Array: Float64Array });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/gfx/rod.js'), 'utf8'), ctx, { filename: 'js/gfx/rod.js' });
  const R = ctx.G.gfx.rod, N = R.N, D2R = Math.PI / 180, L = R.K.len, TIERS = R.K.taper.length;
  const dirOf = deg => [Math.cos(deg * D2R), Math.sin(deg * D2R)];      // world direction, degrees below the facing
  const step = (a, load, deg, tier) => { const d = dirOf(deg); R.solve(a, load, d[0], d[1], 1, tier, DT); };
  const settle = (a, load, deg, tier, n) => { for (let i = 0; i < (n || 600); i++) step(a, load, deg, tier); };
  const tipDeg = () => -Math.atan2(R.jy[N] - R.jy[N - 1], R.jx[N] - R.jx[N - 1]) / D2R; // degrees below the facing
  const sShape = () => { let pos = 0, neg = 0; for (let i = 0; i < N; i++) { const v = R.d[i] / D2R; if (v > 0.5) pos++; if (v < -0.5) neg++; } return pos > 0 && neg > 0; };
  const fresh = () => R.reset();
  const checks = [];
  const add = (what, pass, got) => checks.push([what, pass, got]);

  // Unloaded, straight.
  let dev = 0;
  for (let t = 0; t < TIERS; t++) { fresh(); settle(40, 0, 90, t, 60); for (let i = 0; i <= N; i++) { const s = i * R.SEG; dev = Math.max(dev, Math.hypot(R.jx[i] - Math.cos(40 * D2R) * s, R.jy[i] - Math.sin(40 * D2R) * s)); } }
  add('unloaded, every joint on the straight rod (< 0.5 px)', dev < 0.5, dev.toFixed(3) + ' px');

  // The sweep of settled shapes.
  let shapes = 0, against = 0, s = 0, past = 0, unsettled = 0, worstPast = 0;
  for (let t = 0; t < TIERS; t++) for (const a of [20, 40, 58, 70, 90]) for (const deg of [-20, 0, 30, 50, 70, 89, 120]) for (const load of [0.05, 0.2, 0.4, 0.6, 0.8, 1, 1.3]) {
    fresh(); settle(a, load, deg, t);
    shapes++;
    const x0 = R.jx[N], y0 = R.jy[N]; step(a, load, deg, t);
    if (Math.hypot(R.jx[N] - x0, R.jy[N] - y0) > 0.01) unsettled++;
    const want = Math.sign(-Math.sin((a + deg) * D2R));                    // the line's moment about the hands, straight rod
    if (Math.abs(Math.sin((a + deg) * D2R)) > 0.05 && Math.sign(R.st.bendDeg) !== want && Math.abs(R.st.bendDeg) > 0.5) against++;
    if (sShape()) s++;
    // The tip turns from the hands' direction toward the line's, the way the rod bends, and may
    // reach the line but not pass it: the bend (the tip's whole turn) is at most the turn to the line.
    const ccw = R.st.bendDeg > 0, toLine = (((ccw ? (-deg) - a : a - (-deg)) % 360) + 360) % 360;
    const over = Math.max(0, Math.abs(R.st.bendDeg) - toLine);
    if (over > 3) past++;
    worstPast = Math.max(worstPast, over);
  }
  add('settled shapes never bend against the line (' + shapes + ' shapes)', against === 0, against + ' against');
  add('settled shapes never bend into an S', s === 0, s + ' S-shapes');
  add('the tip never turns past the line (3° slack)', past === 0, past + ' past, worst ' + worstPast.toFixed(1) + '°');
  add('every shape settles (tip still to 0.01 px)', unsettled === 0, unsettled + ' unsettled');

  // Action, power and the progressive bend, pulling 50° down with the hands at 58°.
  const at = (t, load) => { fresh(); settle(58, load, 50, t); return { top3: R.st.top3, butt: R.st.butt, mis: 50 - tipDeg(), bend: R.st.bendDeg }; };
  let prog = true, progGot = [];
  for (let t = 0; t < TIERS; t++) { const a = at(t, 0.2), b = at(t, 1); if (!(b.top3 < a.top3 && b.butt > a.butt && b.butt >= 0.2)) prog = false; progGot.push(t + ': ' + a.top3.toFixed(2) + '>' + b.top3.toFixed(2) + ' / ' + a.butt.toFixed(2) + '<' + b.butt.toFixed(2)); }
  add('progressive at every tier (top third falls, lower half grows to 20%+)', prog, progGot.join('  '));
  const fast = at(TIERS - 1, 0.2), slow = at(0, 0.2);
  add('the fast tier bends 60%+ in its top third at load 0.2', fast.top3 >= 0.6, (100 * fast.top3).toFixed(0) + '%');
  add('the slow tier bends lower than the fast', slow.butt > fast.butt, slow.butt.toFixed(2) + ' vs ' + fast.butt.toFixed(2));
  const small = []; for (let t = 0; t < TIERS; t++) { fresh(); settle(50, 0.02, -40, t); small.push(Math.hypot(R.jx[N] - Math.cos(50 * D2R) * L, R.jy[N] - Math.sin(50 * D2R) * L)); }
  add('every tier has the same power (small load, ±10%)', Math.max(...small) / Math.min(...small) <= 1.1, small.map(v => v.toFixed(2)).join(' ') + ' px');
  let mis6 = 0, mis1 = 0; for (let t = 0; t < TIERS; t++) { mis6 = Math.max(mis6, Math.abs(at(t, 0.6).mis)); mis1 = Math.max(mis1, Math.abs(at(t, 1).mis)); }
  add('a tight line: the tip within 18° of it at load 0.6, 8° at load 1', mis6 <= 18 && mis1 <= 8, mis6.toFixed(1) + '°, ' + mis1.toFixed(1) + '°');

  // Phase 44: a 0.05 kg fish at a fight's load (0.6) bends the Ultralight Wand's tip 3x+ as far
  // as The Long Rod's (each rod's action and maxMass from data/gear.js).
  const gearSrc = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/gear.js'), 'utf8'), gearSrc);
  const rods = gearSrc.G.data.gear.rods, wand = rods.find(r => r.ladder === false && r.smallBoost > 1), longRod = rods.filter(r => r.ladder !== false).pop();
  const tipOff = r => { fresh(); settle(58, 0.6 * R.fishLoad(0.05, r.maxMass), 50, r.action); return Math.hypot(R.jx[N] - Math.cos(58 * D2R) * L, R.jy[N] - Math.sin(58 * D2R) * L); };
  const wOff = tipOff(wand), lOff = tipOff(longRod);
  add('a 0.05 kg fish bends the ' + wand.name + ' 3x+ as far as ' + longRod.name, wOff >= 3 * lOff, wOff.toFixed(2) + ' px vs ' + lOff.toFixed(2) + ' px (' + (wOff / lOff).toFixed(1) + 'x)');

  // Springing: one smooth curve while it moves (an S only near straight), an overshoot, settled.
  let sMoving = 0, frames = 0;
  const watch = (n, a, load, deg, t) => { for (let i = 0; i < n; i++) { step(a, load, deg, t); frames++; if (sShape() && Math.abs(R.st.bendDeg) > 6) sMoving++; } };
  for (let t = 0; t < TIERS; t++) {
    fresh(); watch(90, 58, 1, 50, t); watch(90, 58, 0, 50, t);              // a load comes, then goes
    watch(90, 58, 0.8, 50, t); watch(60, 58, 0.8, -20, t); watch(60, 58, 0.8, 50, t); // the line swings up and back
    watch(60, 90, 0.4, 50, t); watch(60, 40, 0.4, 50, t);                    // the hands lift and lower the rod
  }
  add('while it springs, one curve (no S bent more than 6°)', sMoving === 0, sMoving + ' of ' + frames + ' steps');
  let relOk = true, relGot = [];
  for (let t = 0; t < TIERS; t++) {
    fresh(); settle(58, 1, 50, t);
    const b0 = R.st.bendDeg; let flips = 0, last = Math.sign(b0), settleT = -1;
    for (let i = 1; i <= 120; i++) {
      step(58, 0, 50, t);
      const sg = Math.abs(R.st.bendDeg) > 1 ? Math.sign(R.st.bendDeg) : 0; if (sg !== 0 && sg !== last) { flips++; last = sg; }
      if (Math.abs(R.st.bendDeg) > 0.05 * Math.abs(b0)) settleT = -1; else if (settleT < 0) settleT = i * DT;
    }
    relGot.push(t + ': ' + flips + ' swing(s), ' + (settleT < 0 ? 'never' : settleT.toFixed(2) + ' s'));
    if (flips < 1 || settleT < 0.25 || settleT > 1.0) relOk = false;
  }
  add('let go at full load: it swings past straight and settles within 5% in 0.25-1.0 s', relOk, relGot.join('  '));

  // The cast (Phase 32): held back at 120° (the lure's weight on the tip), the stroke to 20° in
  // 0.12 s eased as sailing.js eases it (it gathers speed and stops short), then up to 40° in
  // 0.3 s, the lure gone from the tip. While it swings the tip trails the straight rod; the stop
  // whips it forward past straight, and it springs back past the bend it comes to rest at (the
  // line's pull and the rising hands keep that bend forward); one curve throughout.
  let castOk = true, castGot = [];
  for (let t = 0; t < TIERS; t++) {
    fresh();
    const ds = (a, l, deg, hang) => { const d = dirOf(deg); R.solve(a, l, d[0], d[1], 1, t, DT, true, hang); };
    for (let i = 0; i < 60; i++) ds(120, 0.05, 90, true);
    let trail = 0, whip = 0, castS = 0, phase = 0, low = 0, after = -1e9, rest = 0;
    const straightTip = a => [Math.cos(a * D2R) * L, Math.sin(a * D2R) * L];
    for (let i = 1; i <= 7; i++) {                                                 // the stroke, 0.12 s
      const u = Math.min(1, i * DT / 0.12), a = 120 + (20 - 120) * u * u * (2 - u);
      ds(a, 0.05, 90, true);
      const st0 = straightTip(R.st.a / D2R);
      if (R.st.bendDeg > 0) trail = Math.max(trail, Math.hypot(R.jx[N] - st0[0], R.jy[N] - st0[1]));
      if (sShape() && Math.abs(R.st.bendDeg) > 6) castS++;
    }
    for (let i = 1; i <= 120; i++) {                                               // the stop, then up to wait
      const u = Math.min(1, i * DT / 0.3), a = 20 + 20 * (1 - Math.cos(Math.PI * u)) / 2;
      ds(a, 0.06, 30, false);
      const b = R.st.bendDeg, st0 = straightTip(R.st.a / D2R), off = Math.hypot(R.jx[N] - st0[0], R.jy[N] - st0[1]);
      if (phase === 0 && b < 0) phase = 1;
      if (phase === 1) { if (b < 0) whip = Math.max(whip, off); if (b < low) low = b; else if (b > low + 1) phase = 2; }
      if (phase === 2 && i <= 60) after = Math.max(after, b);
      if (sShape() && Math.abs(b) > 6) castS++;
      rest = b;
    }
    const rebound = after - rest;
    castGot.push(t + ': trails ' + trail.toFixed(1) + ' px, whips ' + whip.toFixed(1) + ' px, rebounds ' + rebound.toFixed(0) + '°' + (castS ? ', ' + castS + ' S' : ''));
    if (trail < 3 || whip < 2 || rebound < 2 || castS > 0) castOk = false;
  }
  add('the cast: the tip trails 3+ px on the stroke, whips 2+ px past and rebounds, one curve', castOk, castGot.join('  '));

  // 8.4 #28: head shakes (sailing.js's kick, its largest, every 0.12 s for 3 s) knock a lightly
  // loaded blank only a little and never through straight; a loaded one as before.
  const shakes = (load, t) => {
    fresh(); settle(58, load, 50, t); const b0 = R.st.bendDeg; let lo = b0, hi = b0;
    for (let i = 0; i < 180; i++) { if (i % 7 === 0) R.kick(5); step(58, load, 50, t); lo = Math.min(lo, R.st.bendDeg); hi = Math.max(hi, R.st.bendDeg); }
    return { swing: Math.max(Math.abs(hi - b0), Math.abs(lo - b0)), cross: Math.sign(lo) !== Math.sign(hi) };
  };
  let shakeOk = true; const shakeGot = [];
  for (const t of [0, TIERS - 1]) {
    const light = shakes(0.05, t), full = shakes(0.8, t);
    if (light.swing > 6 || light.cross || full.swing < 20) shakeOk = false;
    shakeGot.push(t + ': ' + light.swing.toFixed(1) + '° light' + (light.cross ? ' (through straight)' : '') + ', ' + full.swing.toFixed(1) + '° loaded');
  }
  add('head shakes: a light load swings the tip under 6° and never through straight, load 0.8 still 20°+', shakeOk, shakeGot.join('  '));

  // Cost and NaN.
  let nan = false; for (let i = 0; i < 20000; i++) { R.solve(20 + (i * 37) % 80, ((i * 13) % 17) / 12, Math.sin(i * 0.3), Math.cos(i * 0.7), i % 2 ? 1 : -1, i % TIERS, DT); if (!isFinite(R.jx[N]) || !isFinite(R.jy[N])) nan = true; }
  // The cost: the best of 7 batches of 2000 solves (8.4 #35), so a batch that also timed the
  // garbage the checks above leave, or another process, does not decide it. The limit is unchanged.
  let ms = Infinity;
  for (let b = 0; b < 7; b++) {
    const t0 = process.hrtime.bigint(); for (let i = 0; i < 2000; i++) R.solve(58, ((i * 13) % 17) / 12, 1, 1, 1, i % TIERS, DT);
    ms = Math.min(ms, Number(process.hrtime.bigint() - t0) / 1e6 / 2000);
  }
  add('20,000 random steps without NaN; a step under 0.05 ms', !nan && ms < 0.05, (nan ? 'NaN, ' : '') + ms.toFixed(4) + ' ms');

  let ok = true;
  for (const [what, pass, got] of checks) { console.log((pass ? 'PASS ' : 'FAIL ') + what + ': ' + got); ok = ok && pass; }
  return ok ? 0 : 1;
}

// ---- Main ---------------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  let code = 0;
  if (args.includes('--validate')) {
    const r = validate(load(), { strict: args.includes('--strict') });
    r.warnings.forEach(w => console.log('warn  ' + w));
    if (sizeInfo) console.log('info  ' + sizeInfo);
    if (rosterInfo) console.log('info  ' + rosterInfo);
    if (looksInfo) console.log('info  ' + looksInfo);
    if (lureArtInfo) console.log('info  ' + lureArtInfo);
    if (lineInfo) console.log('info  ' + lineInfo);
    if (workerInfo) console.log('info  ' + workerInfo);
    if (lureInfo) console.log('info  ' + lureInfo);
    r.errors.forEach(e => console.log('ERROR ' + e));
    console.log(r.errors.length ? r.errors.length + ' error(s)' : 'validate: OK (' + r.warnings.length + ' warning(s))');
    if (r.errors.length) code = 1;
  }
  if (args.includes('--replay')) {
    const i = args.indexOf('--replay'), seed = parseInt(args[i + 1], 10), min = parseFloat(args[i + 2]) || 20;
    code = replay(isNaN(seed) ? 12345 : seed, min) || code;
  }
  if (args.includes('--pacing')) code = pacing() || code;
  if (args.includes('--saves')) code = savesCheck() || code;
  if (args.includes('--passive')) code = passiveCheck() || code;
  if (args.includes('--fight')) code = fightCheck() || code;
  if (args.includes('--rod')) code = rodCheck() || code;
  if (args.includes('--homes')) code = homesCheck() || code; // Phase 75
  if (args.includes('--first')) code = firstCheck() || code; // Phase 96.4
  if (args.includes('--tackle-water')) { console.log(JSON.stringify(tackleWater(args[args.indexOf('--tackle-water') + 1]))); process.exit(0); }
  if (!args.some(a => ['--validate', '--replay', '--pacing', '--passive', '--saves', '--fight', '--rod', '--tackle', '--homes', '--first'].includes(a))) {
    console.log('usage: node tools/balance.js --validate [--strict] | --pacing | --passive | --saves | --fight | --rod | --tackle | --homes | --first | --replay <seed> [minutes]');
    code = 2;
  }
  if (args.includes('--tackle')) tackleCheck().then(c => process.exit(c || code), e => { console.log('FAIL --tackle: ' + e.message); process.exit(1); }); // Phase 69: in four processes
  else process.exit(code);
}

module.exports = { load, validate, session, replay, pacing, pacingIce, passiveCheck, savesCheck, fightCheck, PLAN, P };
