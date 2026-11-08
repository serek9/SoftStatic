// tools/angler.js (Phase 106, PLAN_FISHING.md): the angler bot. It fishes every hook in the real
// game (headless Chromium, Playwright) at the water it suits best (BEST, from the species
// weights), the way it should be fished (TECH), sets the hook 0.25-0.5 s after the strike as a
// player would, plays the fight (reels unless the fish runs hard), sells the catch, and recasts.
// The game runs at SCALE x through the debug loop's time scale and per-step hook, so its numbers
// are in game seconds. Needs the game served:
//   python3 -m http.server 5517 --bind 127.0.0.1
//   node tools/angler.js [minutes per hook = 4] [hook,hook,...]     (exit 1 on a FAIL)
// Per hook: the time to the first fish landed, bites a minute, the share of bites hooked and of
// hooked fish landed, misses, the species, the longest dry spell (no fish after the lure), and
// bites with another fish within 24 px. Targets (PLAN_FISHING.md, the user's word: "as close to
// reality as possible, not always"): a first fish within 3 min, >= 70% hooked, dry spells < 90 s,
// no crowded bite.
const { chromium } = require('playwright');
const SCALE = 8;
const BEST = { worm: 'creek', cricket: 'creek', minnow: 'pines', unlabelled: 'creek', bobber: 'creek', deep_bobber: 'creek',
  crankbait: 'fog', big_crankbait: 'pines', deep_crankbait: 'pines', spinnerbait: 'creek', big_spinnerbait: 'pines',
  small_spoon: 'pines', heavy_spoon: 'pines', huge_spoon: 'pines', dropshot: 'creek', heavy_dropshot: 'pines', wacky_worm: 'creek',
  jighead: 'sound', deep_jighead: 'wreck', topwater: 'creek', medium_blade: 'fog', large_blade: 'pines', heavy_blade: 'pines',
  glidebait: 'pines', deep_glidebait: 'pines', minnow_swimbait: 'pines', bluegill_swimbait: 'pines' }; // the water whose start reach weighs each hook's takers most (at 08:00, the rod it needs)
const TARGET = { firstS: 180, hooked: 0.7, dryS: 90 };

(async () => {
  const minutes = +(process.argv[2] || 4), hooks = (process.argv[3] || Object.keys(BEST).join(',')).split(',');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:5517/?debug&seed=31&tour'); await p.waitForTimeout(1500);
  await p.evaluate(() => { dbg.caught(1); const g = G.state.save.gear; g.rods = [0, 1, 2, 3, 4, 5]; G.state.save.settings.tips = false; });
  const rows = [];
  for (const hook of hooks) {
    const loc = BEST[hook] || 'fog';
    // to the water (from the boat, between casts), at 08:00, the hook on the Lacquered Rod
    // home first: reel in whatever is out (fast), play out any fish, close any card or menu
    await p.evaluate(async () => {
      const I = G.core.input; let k = 0;
      G.core.loop.setOnStep(function () {
        const r = G.state.run; k++;
        I.inject('down', false);
        if (r.fsm === 'card' || G.ui.menu.current() || G.ui.setup.isOpen() || G.ui.dock.isOpen()) { I.inject('action', false); if (k % 20 === 0) I.inject(r.fsm === 'card' ? 'action' : 'back', true); else { I.inject('back', false); } return; }
        I.inject('action', r.fsm !== 'sailing');
      });
      G.core.loop.setScale(8);
      for (let i = 0; i < 240 && !(G.state.run.fsm === 'sailing' && !G.ui.menu.current() && !G.ui.dock.isOpen()); i++) await new Promise(res => setTimeout(res, 250));
      G.core.loop.setOnStep(null); G.core.loop.setScale(1); I.inject('action', false); I.inject('back', false);
    });
    if (await p.evaluate(l => G.state.save.loc !== l, loc)) {
      const said = await p.evaluate(l => dbg.travel(l), loc); await p.waitForTimeout(6500);
      if (await p.evaluate(l => G.state.save.loc !== l, loc)) console.log('# could not travel to ' + loc + ': ' + said);
    }
    await p.evaluate(h => { const L = G.data.gear.lures.find(l => l.id === h); G.state.save.baits[h] = 999; dbg.tackle(L && L.sizes.some(z => z === 'XL' || z === 'XXL') ? 4 : 3, h); dbg.hour(8); }, hook); // the Long Rod for the XL and XXL lures
    const r = await p.evaluate(async ([minutes, SCALE]) => {
      const I = G.core.input, run = () => G.state.run, gx = () => G.state.run.gearFx;
      const S0 = G.scene.underwater.strike().n, M = { t: 0, bites: 0, hooked: 0, landed: 0, missed: 0, firstAt: null, species: {}, dry: 0, dryMax: 0, crowded: 0, lostFight: 0, casts: 0 };
      const B = { phase: 'cast', t: 0, cyc: 0, held: { action: false, down: false }, react: -1, lastSlot: -1, hookedNow: false, sinceBite: 0, n: 0 };
      function hold(name, on) { if (B.held[name] !== on) { I.inject(name, on); B.held[name] = on; } }
      function tap(name) { I.inject(name, true); B.tapNext = name; }
      const style = () => { const g = gx(), c = run().cast; const lure = g.lure && (c.bait || g.bait) === g.bait; return lure ? (g.vary || g.swim) : (c.bait || g.bait); };
      const depth = () => { const c = run().cast; return c.ly - G.scene.sailing.loc().waterY; };
      const bed = () => { const m = run().cast.m; return m && m.onBed; };
      function technique(dt) {
        const s = style(), fsm = run().fsm, c = run().cast;
        B.t += dt;
        if (fsm === 'sinking') {
          hold('action', false); hold('down', false);
          const lim = G.data.locations[G.state.save.loc].maxDepth; // px
          if ((s === 'mid' || s === 'kick' || s === 'glide' || s === 'minnow') && depth() > Math.min(lim * 0.5, (gx().maxDepthM || 99) * 4 * 0.8)) tap('action');
          if (s === 'flutter' && depth() > lim * 0.6) tap('action');
          B.t = 0; return;
        }
        if (fsm !== 'waiting' && fsm !== 'interest') return;
        const T = B.t;
        const cyc = (on, off) => { const u = T % (on + off); hold('action', u < on); };
        switch (s) {
          case 'worm': case 'unlabelled': case 'minnow': case 'float':
            hold('action', false); if (T > 45 && T < 45.4) hold('action', true); else hold('action', false); if (T > 46 && T < 47) hold('down', true); else hold('down', false); if (T > 50) B.t = 0; break;
          case 'cricket': hold('action', T % 4 < 0.15); break;
          case 'dropshot': cyc(0.15, 1.6); break;
          case 'wacky': { const u = T % 3.2; hold('action', u < 0.25); hold('down', !bed() && u > 0.4 && u < 1.2); break; }
          case 'lift': case 'rattle': { const u = T % 1.1; hold('action', u < 0.3); hold('down', !bed() && u > 0.35 && u < 1.0 && Math.floor(T / 1.1) % 4 === 3); break; }
          case 'flutter': cyc(0.6, 1.2); break;
          case 'mid': case 'kick': case 'glide': case 'dive': { const u = T % 4; hold('action', u < 3 ? (u % 0.75) < 0.45 : false); break; } // pulsed, a pause each 4 s
          case 'top': { const u = T % 4; if (u < 2.4) { if ((u % 0.8) < dt * 1.5) tap('action'); else hold('action', false); } else hold('action', u > 3 && u < 3.35); break; } // pop, pop, pop, rest, a short skitter
          default: hold('action', false);
        }
      }
      function step(dt) {
        if (B.tapNext) { I.inject(B.tapNext, false); B.tapNext = null; }
        const r = run(), fsm = r.fsm;
        M.t += dt;
        if (fsm === 'sailing') { hold('action', false); hold('down', false); B.idle = (B.idle || 0) + dt; if (G.ui.menu.current() || G.ui.setup.isOpen() || G.ui.dock.isOpen()) { if (B.idle > 0.5) { tap('back'); B.idle = 0; } return; } if (r.boat.stopped || r.boat.vx === 0 || B.idle > 3) { G.scene.sailing.forceCast(0.8 + 0.15 * ((M.casts * 7) % 3) / 2); M.casts++; B.t = 0; B.idle = 0; } return; }
        if (fsm === 'card') { hold('down', false); B.n++; if (B.n % 30 === 0) tap('action'); else hold('action', false); return; }
        if (fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing') {
          hold('down', false); B.lastSlot = -1;
          const F = r.fight;
          hold('action', fsm !== 'fighting' || F.mode !== 'pull' || F.T < 0.55);
          return;
        }
        // the lure is in: a dry spell is time with no fish after it
        const interested = G.sim.fish_ai.interested(r.school) > 0;
        if (interested) { M.dry = 0; } else { M.dry += dt; if (M.dry > M.dryMax) M.dryMax = M.dry; }
        if (r.bite.slot >= 0) {
          if (B.lastSlot < 0) {
            M.bites++; B.react = 0.25 + 0.25 * ((M.bites * 37) % 11) / 10; hold('action', false); hold('down', false);
            const L = r.lureIn; let near = 0; for (const f of r.school.fish) if (f.active && f.state !== 'leave' && Math.hypot(f.x - L.x, f.y - L.y) < 24) near++;
            if (near > 1) { M.crowded++; (M.crowdWho = M.crowdWho || []).push(r.school.fish.filter(f => f.active && f.state !== 'leave' && Math.hypot(f.x - L.x, f.y - L.y) < 24).map(f => f.state + (f.uid === r.school.suitor ? '*' : '') + (f.pass ? 'p' : '')).join(',')); }
          }
          B.react -= dt; if (B.react <= 0) hold('action', true);
          B.lastSlot = r.bite.slot; return;
        }
        if (B.lastSlot >= 0) { if (r.fsm !== 'hooked') M.missed++; B.lastSlot = -1; hold('action', false); }
        technique(dt);
      }
      let lastFsm = '';
      G.core.loop.setOnStep(function (dt) {
        step(dt);
        const f = run().fsm;
        if (f === 'hooked' && lastFsm !== 'hooked') M.hooked++;
        if (f === 'card' && lastFsm !== 'card') { M.landed++; if (M.firstAt === null) M.firstAt = M.t; const sp = G.data.fish[run().hook.sp].id; M.species[sp] = (M.species[sp] || 0) + 1; }
        if (f === 'sailing' && lastFsm === 'fighting') M.lostFight++;
        lastFsm = f;
      });
      G.core.loop.setScale(SCALE);
      while (M.t < minutes * 60) await new Promise(res => setTimeout(res, 250));
      G.core.loop.setOnStep(null); G.core.loop.setScale(1);
      M.bites = Math.max(M.bites, G.scene.underwater.strike().n - S0, M.hooked + M.missed); // a strike while reeling is hooked at once (the bot never sees its bite)
      I.inject('action', false); I.inject('down', false);
      return M;
    }, [minutes, SCALE]);
    const row = { hook, loc, firstS: r.firstAt === null ? null : +r.firstAt.toFixed(0), bitesMin: +(r.bites / minutes).toFixed(2), hooked: r.bites ? +(r.hooked / r.bites).toFixed(2) : null,
      landed: r.landed, lostFight: r.lostFight, missed: r.missed, dryMaxS: +r.dryMax.toFixed(0), crowded: r.crowded, crowdWho: r.crowdWho, casts: r.casts, species: r.species };
    rows.push(row); console.log(JSON.stringify(row));
  }
  let bad = 0;
  for (const r of rows) {
    const fails = [];
    if (r.firstS === null || r.firstS > TARGET.firstS) fails.push('first fish ' + (r.firstS === null ? 'none' : r.firstS + ' s'));
    if (r.hooked !== null && r.hooked < TARGET.hooked) fails.push('hooked ' + Math.round(r.hooked * 100) + '%');
    if (r.dryMaxS >= TARGET.dryS) fails.push('dry ' + r.dryMaxS + ' s');
    if (r.crowded) fails.push(r.crowded + ' crowded bites');
    if (fails.length) bad++;
    console.log((fails.length ? 'FAIL ' : 'PASS ') + r.hook + ' at ' + r.loc + ': first ' + r.firstS + ' s, ' + r.bitesMin + ' bites/min, ' + (r.hooked === null ? '-' : Math.round(r.hooked * 100) + '%') + ' hooked, ' + r.landed + ' landed, dry ' + r.dryMaxS + ' s' + (fails.length ? '  (' + fails.join(', ') + ')' : ''));
  }
  console.log((bad ? bad + ' FAIL' : 'all PASS') + ' of ' + rows.length + '; page errors ' + errs.length + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
