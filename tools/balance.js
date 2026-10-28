// Headless checks over the pure sim and the data (§6). Never by playing.
//   node tools/balance.js --validate [--strict]   data and code checks; exit 1 on any error
//                                                 (--strict also fails incomplete rosters)
//   node tools/balance.js --pacing                active-player model against the V8 targets
//   node tools/balance.js --replay <seed> [min]   a deterministic headless session, run twice;
//                                                 prints its hash and fails if the runs differ
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
  const ctx = vm.createContext({});
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

  // Roster counts per location.
  for (const id in d.locations) {
    const here = d.fish.filter(f => f.locations.includes(id)), have = {};
    here.forEach(f => { have[f.rarity] = (have[f.rarity] || 0) + 1; });
    const short = Object.keys(ROSTER).filter(r => (have[r] || 0) !== ROSTER[r]).map(r => r + ' ' + (have[r] || 0) + '/' + ROSTER[r]);
    if (short.length) (opts.strict ? err : warn)('roster ' + id + ': ' + short.join(', ') + ' (target 9 species, TODO P14)');
  }
  for (const id in d.gear.unlocks) if (!d.locations[id]) warn('unlock ' + id + ': location not in data yet (TODO P11)');

  // Gear: 5 tiers each, tier 0 free, every tier dearer and better (V8: every item has an effect).
  const g = d.gear;
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

// ---- Headless session (used by --replay and --pacing) ----------------------------------------
// A scripted active player on Fogbound: cast, sink to a depth, wait, hook most bites, fight
// with the auto-player, sell, buy along a plan. Everything runs through the real sim modules
// at the fixed 1/60 step.

const DT = 1 / 60;
const P = {
  castTime: 4,     // s: charge, flight, splash
  reelTime: 3,     // s: reeling in an empty lure
  cardTime: 4,     // s: lift and card
  giveUp: 60,      // s without a bite before recasting
  hookRate: 0.9,   // share of bites hooked (the rest are missed and may come back)
  hookDelay: 0.5,  // s to react to a bite
  skill: 0.85,     // fight skill of an attentive player
  depthM: 8,       // the player's usual depth
  lureX: 600
};
const PLAN = ['line', 'reel', 'rod', 'lantern', 'depthFinder', 'creek', 'line', 'rod', 'reel', 'pines', 'line', 'rod', 'reel', 'red', 'line', 'rod', 'reel'];

function session(G, seed, opts) {
  const S = G.sim, rng = new G.core.rng.Rng(seed), data = G.data;
  const save = G.core.save.defaults(), loc = data.locations.fog;
  const school = S.fish_ai.createSchool(data), bite = S.bite.create(), fight = S.fight.create();
  const fx = {}, lure = { active: false, x: P.lureX, y: 0, bait: 'worm' }, latched = {};
  const uIn = { loc: 'fog', still: true, atShop: false }, bIn = { reel: false, auto: false }, fIn = { reel: false };
  Object.assign(school.ctx, { loc: 'fog', maxDepthPx: loc.maxDepth, latched });
  const st = { phase: 'cast', t: 0, time: 0, hash: 7, catches: 0, attempts: 0, events: [], plan: 0, hookUid: 0, willHook: false, cur: null, mix: {}, coinsAt: [] };

  function h(v) { st.hash = (Math.imul(st.hash ^ (v | 0), 0x01000193) >>> 0); }
  function event(what) { st.events.push({ t: st.time, catches: st.catches, coins: save.coins, what }); }

  function shop() {
    while (st.plan < PLAN.length) {
      const k = PLAN[st.plan], E = S.economy;
      const r = data.gear.unlocks[k] ? E.unlock(save, k, data) : E.buy(save, k, data);
      if (r === E.OK || r === E.MAXED) { if (r === E.OK) event(k); st.plan++; } else break;
    }
  }

  function step() {
    st.time += DT;
    S.economy.effects(save, data, fx);
    S.clock.step(save, null, DT, rng, data);
    uIn.still = st.phase !== 'cast';
    S.unease.step(save, uIn, DT, rng, data);
    const c = school.ctx;
    c.hour = save.clock; c.unease = S.unease.get(save, 'fog'); c.bait = lure.bait; c.rodMaxMass = fx.maxMass;
    c.attract = fx.attract; c.rareBoost = fx.rareBoost; c.depthM = lure.y * 0.25;
    st.t += DT;
    switch (st.phase) {
      case 'cast':
        if (st.t >= P.castTime) {
          st.phase = 'sink'; st.t = 0; st.attempts++;
          lure.active = true; lure.y = 0; lure.bait = S.economy.useBait(save, data);
          S.clock.clearLatch(latched); S.clock.latch(latched, save.clock, data.windows);
        }
        break;
      case 'sink':
        lure.y = Math.min(P.depthM * 4, lure.y + 12 * DT);
        if (lure.y >= P.depthM * 4) { st.phase = 'wait'; st.t = 0; }
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
          shop();
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
  console.log('Active-player model (Fogbound roster only until P11/P14; ' + JSON.stringify(P) + ')\n');
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
  if (!args.some(a => ['--validate', '--replay', '--pacing'].includes(a))) {
    console.log('usage: node tools/balance.js --validate [--strict] | --pacing | --replay <seed> [minutes]');
    code = 2;
  }
  process.exit(code);
}

module.exports = { load, validate, session, replay, pacing, PLAN, P };
