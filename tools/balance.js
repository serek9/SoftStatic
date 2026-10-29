// Headless checks over the pure sim and the data (§6). Never by playing.
//   node tools/balance.js --validate [--strict]   data and code checks; exit 1 on any error
//                                                 (--strict also fails incomplete rosters)
//   node tools/balance.js --pacing                active-player model against the V8 targets
//   node tools/balance.js --saves                 saves from each milestone load and play (14.8)
//   node tools/balance.js --replay <seed> [min]   a deterministic headless session, run twice;
//                                                 prints its hash and fails if the runs differ
//   node tools/balance.js --passive               passive income against active (V7: 60% ±5%),
//                                                 and time away fished twice gives the same result
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
  return keep.concat(['js/gfx/sprites.js', 'js/gfx/fishgen.js']);
}

function load() {
  // The browser's text and base64 helpers, which core/save.js uses for its export string (--saves).
  const ctx = vm.createContext({ TextEncoder, TextDecoder, btoa, atob });
  for (const f of scriptList()) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  ctx.G.state = ctx.G.state || {};
  return ctx.G;
}

// ---- --validate ---------------------------------------------------------------------------

const BANNED = /\b(window|document|Math\.random|Date|performance|requestAnimationFrame|localStorage)\b/;
const ROSTER = { common: 4, uncommon: 3, rare: 1, legendary: 1 }; // per location (V5)

function stripCode(src) { return src.replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/\/\/.*$/gm, ''); }

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
  const ref = { locations: d.locations, windows: d.windows, bases: G.gfx.fishgen.BASE_NAMES, parts: G.gfx.fishgen.PARTS };
  d.validateFish(d.fish, ref).forEach(e => err('fish ' + e));
  G.sim.clock.validateWindows(d.windows).forEach(e => err('window ' + e));
  if (d.anomalies) d.validateAnomalies(d.anomalies, { locations: d.locations }).forEach(e => err('anomaly ' + e));
  else err('anomalies: data/anomalies.js is not loaded');
  d.fish.forEach(f => { try { G.gfx.fishgen.generate(f.look); } catch (e) { err('fish ' + f.id + ': look does not generate: ' + e.message); } });

  const g = d.gear;
  // Phase 14: every hint ref is a known kind and true of the species (the journal prints it).
  const NIGHT = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], GREY = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  d.fish.forEach(f => f.hintRefs.forEach(ref => {
    const [k, v] = ref.split(':'), p = 'fish ' + f.id + ': hint ' + ref + ' ';
    const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
    if (k === 'hour' && v === 'grey') { if (!same(f.timeLikes, GREY)) err(p + 'needs timeLikes = the grey hours'); }
    else if (k === 'hour' && v === 'night') { if (!f.timeLikes.length || !f.timeLikes.every(h => NIGHT.includes(h))) err(p + 'needs night timeLikes'); }
    else if (k === 'window') { if (!f.windows.includes(v)) err(p + 'not in its windows'); }
    else if (k === 'unease') { if (!(f.uneaseMin > 0)) err(p + 'needs uneaseMin > 0'); }
    else if (k === 'bait') { if (!f.baitLikes.includes(v) || !g.baits.some(b => b.id === v)) err(p + 'not a bait it takes'); }
    else if (k === 'depth') {
      const L = d.locations[f.locations[0]], deepest = L.maxDepth / 4;
      if (v === 'deep' && f.habitat.depthMax < deepest * 0.6) err(p + 'habitat is not deep here');
      if (v === 'shallow' && f.habitat.depthMax > 8) err(p + 'habitat is not shallow');
      if (v !== 'deep' && v !== 'shallow') err(p + 'unknown depth hint');
    } else if (k === 'spot') { if (!f.locations.some(l => (d.locations[l].spots || []).some(s => s.id === v && s.kind === 'legendary' && s.where))) err(p + 'needs a legendary spot with `where` in its waters'); }
    else if (k === 'mover') { if (!f.locations.some(l => (d.locations[l].movers || []).some(m => m.id === v && (m.rare || 1) > 1)) || !['rare', 'legendary'].includes(f.rarity)) err(p + 'needs a rare-boosting mover and a rare species'); }
    else err(p + 'unknown kind');
  }));
  for (const id in d.locations) {
    const n = d.locations[id].need && d.locations[id].need.fish;
    if (n && !d.fish.some(f => f.id === n && (!d.locations[id].need.windowCatch || f.windows.includes(d.locations[id].need.windowCatch)))) err('location ' + id + ': need.fish ' + n + ' must exist and bite in need.windowCatch');
  }

  // Roster counts per location.
  for (const id in d.locations) {
    const here = d.fish.filter(f => f.locations.includes(id)), have = {};
    here.forEach(f => { have[f.rarity] = (have[f.rarity] || 0) + 1; });
    const short = Object.keys(ROSTER).filter(r => (have[r] || 0) !== ROSTER[r]).map(r => r + ' ' + (have[r] || 0) + '/' + ROSTER[r]);
    if (short.length) (opts.strict ? err : warn)('roster ' + id + ': ' + short.join(', ') + ' (target 9 species, TODO P14)');
  }
  validateLocations(G, err);

  // Gear: 5 tiers each, tier 0 free, every tier dearer and better (V8: every item has an effect).
  [['rods', ['castMax', 'maxMass', 'attract']], ['reels', ['speed']], ['lines', ['strength']]].forEach(([kind, fx]) => {
    const t = g[kind];
    if (!t || t.length !== 5) { err('gear ' + kind + ': needs 5 tiers'); return; }
    if (t[0].cost !== 0) err('gear ' + kind + ': tier 0 must be free');
    for (let i = 1; i < 5; i++) {
      if (!(t[i].cost > t[i - 1].cost)) err('gear ' + t[i].id + ': must cost more than ' + t[i - 1].id);
      fx.forEach(k => { if (!(typeof t[i][k] === 'number' && t[i][k] > t[i - 1][k])) err('gear ' + t[i].id + ': ' + k + ' must improve on ' + t[i - 1].id); });
    }
  });
  const seenBait = {};
  g.baits.forEach(b => {
    if (typeof b.attract !== 'number' || typeof b.rareBoost !== 'number') err('bait ' + b.id + ': attract and rareBoost');
    const key = b.attract + '/' + b.rareBoost;
    if (seenBait[key]) err('bait ' + b.id + ': does the same as ' + seenBait[key]);
    seenBait[key] = b.id;
  });
  if (!g.baits.some(b => b.label === false && b.rareBoost > 1)) err('bait: the unlabelled shelf item must be a real rare bait');
  if (!(g.lantern.nightDepth > g.nightDepth)) err('lantern: must show deeper fish than without it');
  if (!(g.depthFinder.bands > 0)) err('depth finder: needs depth bands');
  ['pull0', 'pull1', 'tired0', 'tired1', 'pullRise', 'easeFall', 'run', 'tiredRise', 'release', 'recover', 'slipT', 'slipD', 'escape', 'd0']
    .forEach(k => { if (!(typeof g.fight[k] === 'number' && g.fight[k] > 0)) err('fight constant ' + k); });

  // D5: passive.incomeMult is set once, in data/gear.js, and nowhere else.
  if (!(g.passive.incomeMult > 0 && g.passive.incomeMult < 1)) err('passive.incomeMult must be between 0 and 1');
  const defs = [];
  (function walk(dir) {
    for (const n of fs.readdirSync(path.join(ROOT, dir))) {
      const p = path.join(dir, n);
      if (n === '.git' || n === 'node_modules') continue;
      if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p);
      else if (n.endsWith('.js') && p !== path.join('tools', 'balance.js') && /incomeMult\s*[:=]/.test(stripCode(fs.readFileSync(path.join(ROOT, p), 'utf8')))) defs.push(p);
    }
  })('.');
  if (defs.length !== 1 || defs[0] !== path.join('data', 'gear.js')) err('D5: incomeMult must be defined only in data/gear.js (found in ' + defs.join(', ') + ')');

  return { errors, warnings };
}

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
    if (L.need && L.need.windowCatch !== 'any' && !d.windows.some(w => w.id === L.need.windowCatch)) err(p + 'need.windowCatch: unknown window');
    if (L.drift) {
      for (let t = 0; t < 30; t += 0.5) for (const depth of [0, L.maxDepth]) {
        const v = L.drift(12345, t, depth, false);
        if (!num(v) || Math.abs(v) > 40) err(p + 'drift gives ' + v + ' px/s at t ' + t);
      }
    }
    if (L.place) {
      const a = L.place(777, []), b = L.place(777, []);
      if (a.length !== L.movers.length || a.some((x, i) => x !== b[i])) err(p + 'place is not deterministic');
      if (a.some(x => !(x >= 0 && x < L.width))) err(p + 'place puts a structure outside the world');
      for (let i = 0; i < a.length; i++) for (let k = 0; k < i; k++) if (Math.abs(a[i] - a[k]) < L.moverGap) err(p + 'place puts two structures closer than moverGap');
    }
  }
}

// ---- Headless session (used by --replay and --pacing) ----------------------------------------
// A scripted active player: cast, sink to a depth, wait, hook most bites, fight with the
// auto-player, sell, buy along a plan. Everything runs through the real sim modules at the
// fixed 1/60 step. Since Phase 14 it moves to each water it opens, and once it fishes the
// Pines it hunts the Red Room's key: at the 03:33 window it fishes deep for Three-Thirty-Three.

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
  depthAt: { fog: 8, creek: 6, pines: 8, red: 8 },
  huntDepthM: 24,  // m: where it fishes for the Red Room's key fish in its window
  lureX: 600
};
const PLAN = ['line', 'reel', 'rod', 'lantern', 'depthFinder', 'creek', 'line', 'rod', 'reel', 'pines', 'line', 'rod', 'reel', 'red', 'line', 'rod', 'reel'];

function session(G, seed, opts) {
  const S = G.sim, rng = new G.core.rng.Rng(seed), data = G.data;
  const save = G.core.save.defaults();
  const school = S.fish_ai.createSchool(data), bite = S.bite.create(), fight = S.fight.create();
  const fx = {}, lure = { active: false, x: P.lureX, y: 0, bait: 'worm' }, latched = {};
  const uIn = { loc: 'fog', still: true, atShop: false }, bIn = { reel: false, auto: false }, fIn = { reel: false };
  Object.assign(school.ctx, { loc: 'fog', maxDepthPx: data.locations.fog.maxDepth, latched });
  const st = { phase: 'cast', t: 0, time: 0, hash: 7, catches: 0, attempts: 0, events: [], plan: 0, hookUid: 0, willHook: false, cur: null, mix: {}, coinsAt: [],
    loc: 'fog', depthM: P.depthAt.fog };
  const red = data.locations.red.need || {}, key = red.windowCatch && G.sim.clock.windowById(data.windows, red.windowCatch);

  // Travels to water id (when the model has opened it): the school there starts empty.
  function moveTo(id) {
    if (opts && opts.stay) return;
    st.loc = id; uIn.loc = id; school.ctx.loc = id; school.ctx.maxDepthPx = data.locations[id].maxDepth;
    for (const f of school.fish) f.active = false;
    lure.active = false; st.phase = 'cast'; st.t = 0;
  }

  function h(v) { st.hash = (Math.imul(st.hash ^ (v | 0), 0x01000193) >>> 0); }
  function event(what) { st.events.push({ t: st.time, catches: st.catches, coins: save.coins, what }); }

  function shop() {
    while (st.plan < PLAN.length) {
      const k = PLAN[st.plan], E = S.economy;
      const r = data.locations[k] ? E.unlock(save, k, data) : E.buy(save, k, data);
      if (r === E.OK || r === E.MAXED) { if (r === E.OK) { event(k); if (data.locations[k] && k !== 'red') moveTo(k); } st.plan++; } else break;
    }
  }

  function step() {
    st.time += DT;
    S.economy.effects(save, data, fx);
    S.clock.step(save, null, DT, rng, data);
    uIn.still = st.phase !== 'cast';
    S.unease.step(save, uIn, DT, rng, data);
    const c = school.ctx;
    c.hour = save.clock; c.unease = S.unease.get(save, st.loc); c.bait = lure.bait; c.rodMaxMass = fx.maxMass;
    c.attract = fx.attract; c.rareBoost = fx.rareBoost; c.depthM = lure.y * 0.25;
    st.t += DT;
    switch (st.phase) {
      case 'cast':
        if (st.t >= P.castTime) {
          st.phase = 'sink'; st.t = 0; st.attempts++;
          lure.active = true; lure.y = 0; lure.bait = S.economy.useBait(save, data);
          // The hunt: in the Pines, in (or just before) the key window, with the key not yet caught.
          const hunt = key && st.loc === 'pines' && !(save.journal[red.fish] && save.journal[red.fish].caught) &&
            G.sim.clock.wrap(save.clock) >= key.from - 0.05 && G.sim.clock.wrap(save.clock) < key.to;
          st.depthM = hunt ? P.huntDepthM : P.depthAt[st.loc];
          S.clock.clearLatch(latched); S.clock.latch(latched, save.clock, data.windows);
        }
        break;
      case 'sink':
        lure.y = Math.min(st.depthM * 4, lure.y + 12 * DT);
        if (lure.y >= st.depthM * 4) { st.phase = 'wait'; st.t = 0; }
        break;
      case 'wait':
        if (bite.slot >= 0 && school.fish[bite.slot].uid !== st.hookUid) { st.hookUid = school.fish[bite.slot].uid; st.willHook = rng.next() < P.hookRate; }
        bIn.reel = bite.slot >= 0 && st.willHook && bite.t >= P.hookDelay;
        if (S.bite.step(bite, bIn, DT, rng, data, school) === S.bite.HOOK) {
          const f = school.fish[bite.slot], sp = data.fish[f.sp], q = rng.next();
          st.cur = { sp: f.sp, id: sp.id, q, len: sp.lengthCm[0] + (sp.lengthCm[1] - sp.lengthCm[0]) * q, w: sp.weightKg[0] + (sp.weightKg[1] - sp.weightKg[0]) * Math.pow(q, 1.3),
            price: S.economy.price(sp, q, data), hintRefs: sp.hintRefs, windowCatch: Object.keys(latched)[0] || null };
          S.fight.start(fight, f.sp, sp, fx, rng, data);
          f.active = false; S.fish_ai.scatter(school); S.bite.reset(bite);
          lure.active = false; st.phase = 'fight'; st.t = 0; h(f.sp);
        } else if (st.t >= P.giveUp) { lure.active = false; st.phase = 'reel'; st.t = 0; }
        break;
      case 'fight': {
        fIn.reel = S.fight.autoPlayer(fight, P.skill, rng) === 1;
        const r = S.fight.step(fight, fIn, DT, rng, data);
        if (r === S.fight.WIN) { st.phase = 'card'; st.t = 0; }
        else if (r !== S.fight.NONE) { st.phase = 'reel'; st.t = 0; h(r); }
        break;
      }
      case 'card':
        if (st.t >= P.cardTime) {
          S.economy.recordCatch(save, st.cur, 'sell');
          st.catches++; st.mix[st.cur.id] = (st.mix[st.cur.id] || 0) + 1; h(save.coins);
          if (!opts || opts.shop !== false) shop();
          if (st.cur.id === red.fish) event('key');
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

  return { st, save, step, run(seconds, until) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) { step(); if (until && until(st, save)) break; } return st; } };
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

const TARGETS = [
  { what: 'first upgrade', key: 'first', unit: 'catches', lo: 4, hi: 8 },
  { what: 'location 2 (creek)', key: 'creek', unit: 'min', lo: 30, hi: 50 },
  { what: 'location 4 (red)', key: 'red', unit: 'min', lo: 150, hi: 360 }
];

function pacing() {
  const seeds = [11, 22, 33, 44, 55], rows = [];
  for (const seed of seeds) {
    const s = session(load(), seed);
    s.run(8 * 3600, st => st.events.some(e => e.what === 'red'));
    const ev = s.st.events, at = k => ev.find(e => e.what === k);
    rows.push({ seed, first: ev[0] ? ev[0].catches : null, firstWhat: ev[0] && ev[0].what, creek: at('creek') && at('creek').t / 60, pines: at('pines') && at('pines').t / 60,
      red: at('red') && at('red').t / 60, catches: s.st.catches, mix: s.st.mix, events: ev, coinsAt: s.st.coinsAt, windowCatch: Object.keys(s.save.flags.windowCatch) });
  }
  const median = k => { const v = rows.map(r => r[k]).filter(x => x != null).sort((a, b) => a - b); return v.length === rows.length ? v[Math.floor(v.length / 2)] : null; };
  console.log('Active-player model (moves to each water it opens; hunts the Red Room key in the Pines; ' + JSON.stringify(P) + ')\n');
  const r0 = rows[0];
  console.log('Seed ' + r0.seed + ' timeline:');
  r0.events.forEach(e => console.log('  ' + (e.t / 60).toFixed(1).padStart(6) + ' min  ' + String(e.catches).padStart(4) + ' catches  ' + e.what));
  console.log('  coins held every 30 min: ' + r0.coinsAt.map(c => c[0] + 'm:' + c[1]).join(' '));
  console.log('  catch mix: ' + JSON.stringify(r0.mix) + '  window catches: ' + r0.windowCatch.join(',') + '\n');
  console.log('seed   first upgrade        creek     pines     red');
  rows.forEach(r => console.log(String(r.seed).padEnd(6) + ' ' + (r.first + ' catches (' + r.firstWhat + ')').padEnd(20) + ' ' + (r.creek ? r.creek.toFixed(1) : '-').padStart(6) + 'm  ' + (r.pines ? r.pines.toFixed(1) : '-').padStart(6) + 'm  ' + (r.red ? r.red.toFixed(1) : '-').padStart(6) + 'm'));
  console.log('');
  let failed = 0;
  for (const t of TARGETS) {
    const m = median(t.key), pass = m != null && m >= t.lo && m <= t.hi;
    if (!pass) failed++;
    console.log((pass ? 'PASS ' : 'FAIL ') + t.what + ': median ' + (m == null ? 'never' : m.toFixed(1) + ' ' + t.unit) + ' (target ' + t.lo + '-' + t.hi + ' ' + t.unit + ')');
  }
  return failed ? 1 : 0;
}

// ---- --saves ------------------------------------------------------------------------------
// 14.8: a save as each milestone wrote it (the shapes of save.js defaults() at those commits,
// with some play in them) must load in today's game: through the real export/import string,
// migrated to the current version, with every field today's defaults have, and usable by
// the economy, the passive sim and the unlock checks.

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
    flags: { windowCatch: { owl_247: true }, lines: {}, shopVisits: 9, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0 }, tapes: [{ loc: 'fog', kind: 'away', entries: [], caught: 3, lost: 0, coins: 20, secs: 600 }], settings: { volume: 1, mute: false }, rng: 11 } }
];

function savesCheck() {
  const G = load(), SV = G.core.save, d = SV.defaults(), E = G.sim.economy;
  let failed = 0;
  // Every key today's defaults have, one level into the objects (gear, flags, settings).
  function missing(s) {
    const out = [];
    for (const k in d) {
      if (!(k in s)) { out.push(k); continue; }
      if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && ['gear', 'flags', 'settings'].includes(k)) for (const j in d[k]) if (!(j in s[k])) out.push(k + '.' + j);
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
        for (const id in G.data.locations) E.canUnlock(s, id, G.data);
        const ps = G.sim.passive.create(s, s.loc || 'fog', G.data);
        G.sim.passive.plan(ps, new G.core.rng.Rng(1), G.data);
        for (const id in s.journal) if (!G.data.fish.some(f => f.id === id)) probs.push('journal species ' + id + ' no longer exists');
        if (!G.data.locations[s.loc]) probs.push('resumes at unknown water ' + s.loc);
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
// V7: passive earns about 60% of active income (passive.incomeMult, D5). Both start from a new
// save on Fogbound at 19:00 with the starter gear (the active model does not shop here) and
// fish the same game time on the same seeds. Then time away is fished twice from the same
// save and seed, which must give the same save and tape.

function passiveCheck() {
  const seeds = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110], secs = 3600;
  let act = 0, pas = 0;
  console.log('seed   active coins/h   passive coins/h   ratio   passive catches');
  for (const seed of seeds) {
    const a = session(load(), seed, { shop: false });
    a.run(secs);
    const G = load(), save = G.core.save.defaults(), ps = G.sim.passive.create(save, 'fog', G.data), rng = new G.core.rng.Rng(seed);
    let t = 0, n = 0;
    while (t < secs) { t += G.sim.passive.cycle(ps, rng, G.data); if (ps.plan.result === G.sim.passive.CAUGHT) n++; }
    const ah = a.save.coins * 3600 / secs, ph = save.coins * 3600 / t;
    act += ah; pas += ph;
    console.log(String(seed).padEnd(6) + ' ' + ah.toFixed(0).padStart(14) + ' ' + ph.toFixed(0).padStart(17) + ' ' + (ph / ah).toFixed(3).padStart(7) + ' ' + String(n).padStart(17));
  }
  const ratio = pas / act, mult = load().data.gear.passive.incomeMult;
  console.log('\npassive / active over all seeds: ' + ratio.toFixed(3) + ' (incomeMult ' + mult + '; before it: ' + (ratio / mult).toFixed(3) + ')');
  const pass = ratio >= 0.55 && ratio <= 0.65;
  console.log((pass ? 'PASS' : 'FAIL') + ' passive income ' + (ratio * 100).toFixed(1) + '% of active (target 60% ±5%)');

  const runAway = () => {
    const G = load(), save = G.core.save.defaults(), rng = new G.core.rng.Rng(4242);
    save.lastSeen = 1e12; save.clock = 23;
    const tape = G.sim.passive.away(save, 1e12 + 5 * 3600 * 1000, rng, G.data);
    return { json: JSON.stringify(save), tape };
  };
  const x = runAway(), y = runAway(), same = x.json === y.json;
  console.log('away 5 h: ' + x.tape.caught + ' caught, ' + x.tape.lost + ' lost, +' + x.tape.coins + ' coins, ' + x.tape.entries.length + ' tape lines, gap ' +
    (x.tape.gap ? x.tape.gap.from.toFixed(2) + '-' + x.tape.gap.to.toFixed(2) : 'none') + ', phantom ' + (x.tape.phantom || 'none') + ', clock ' + x.tape.from.toFixed(2) + ' -> ' + x.tape.to.toFixed(2));
  console.log((same ? 'PASS' : 'FAIL') + ' time away: the same save and seed give ' + (same ? 'the same' : 'a different') + ' result');
  return pass && same ? 0 : 1;
}

// ---- Main ---------------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  let code = 0;
  if (args.includes('--validate')) {
    const r = validate(load(), { strict: args.includes('--strict') });
    r.warnings.forEach(w => console.log('warn  ' + w));
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
  if (!args.some(a => ['--validate', '--replay', '--pacing', '--passive', '--saves'].includes(a))) {
    console.log('usage: node tools/balance.js --validate [--strict] | --pacing | --passive | --saves | --replay <seed> [minutes]');
    code = 2;
  }
  process.exit(code);
}

module.exports = { load, validate, session, replay, pacing, passiveCheck, savesCheck, PLAN, P };
