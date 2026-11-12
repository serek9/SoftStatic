// tools/reel.js (Phase 110): every hook cast, left to settle (on the bed for a sinking one) and
// reeled in with the reel held until it lifts out at the boat, in the real game (headless
// Chromium, Playwright; fish stepping stubbed out so no bite cuts the retrieve; the game at 8x).
// Two casts each (charge 0.3 and 0.9). FAIL if any hook takes over LIMIT game s or never comes
// out. Needs the game served:
//   python3 -m http.server 5517 --bind 127.0.0.1
//   node tools/reel.js [water,water = pines] [hook,hook,...] [pump]     (exit 1 on a FAIL)
// Phase 113: pump reels in pulses (0.5 s held, 0.3 s let go), the way a player taps it in;
// its limit is 20 s.
const { chromium } = require('playwright');
const PUMP = process.argv[4] === 'pump', LIMIT = PUMP ? 20 : 15;
const HOOKS = 'worm,cricket,minnow,unlabelled,bobber,deep_bobber,crankbait,big_crankbait,deep_crankbait,spinnerbait,big_spinnerbait,small_spoon,heavy_spoon,huge_spoon,dropshot,heavy_dropshot,wacky_worm,jighead,deep_jighead,topwater,medium_blade,large_blade,heavy_blade,glidebait,deep_glidebait,minnow_swimbait,bluegill_swimbait'.split(',');
(async () => {
  const locs = (process.argv[2] || 'pines').split(','), hooks = process.argv[3] ? process.argv[3].split(',') : HOOKS;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:5517/?debug&seed=7&tour'); await p.waitForTimeout(1500);
  await p.evaluate(() => { dbg.caught(1); G.state.save.gear.rods = [0, 1, 2, 3, 4, 5]; G.state.save.settings.tips = false; G.sim.fish_ai.stepSchool = function () {}; dbg.rod(99); });
  let bad = 0;
  for (const loc of locs) {
    if (await p.evaluate(l => G.state.save.loc !== l, loc)) { await p.evaluate(l => dbg.travel(l), loc); await p.waitForTimeout(7000); }
    await p.evaluate(() => { G.sim.fish_ai.stepSchool = function () {}; });
    for (const h of hooks) {
      const row = [];
      for (const ch of [0.3, 0.9]) {
        await p.evaluate(h => { G.state.save.baits[h] = 9; dbg.tackle(null, h); dbg.hour(12); }, h);
        await p.waitForTimeout(150);
        const r = await p.evaluate(async ([ch, PUMP]) => {
          const I = G.core.input, run = () => G.state.run, wy = () => G.scene.sailing.loc().waterY;
          dbg.cast(ch);
          const M = { t: 0, phase: 'wait', reelT: 0, depth0: 0, maxStall: 0 };
          let lastY = 0, still = 0;
          G.core.loop.setOnStep(function (dt) {
            const r = run(), f = r.fsm; M.t += dt;
            if (M.phase === 'wait') {
              I.inject('action', false);
              if (f === 'waiting') { M.phase = 'reel'; M.depth0 = +((r.cast.ly - wy()) / 4).toFixed(1); lastY = r.cast.ly; }
              return;
            }
            if (M.phase === 'reel') {
              I.inject('action', !PUMP || (M.reelT % 0.8) < 0.5); M.reelT += dt;
              if (f === 'sailing') { M.phase = 'done'; I.inject('action', false); }
            }
          });
          G.core.loop.setScale(8);
          for (let i = 0; i < 400 && M.phase !== 'done' && M.reelT < 90; i++) await new Promise(res => setTimeout(res, 100));
          const out = { depth: M.depth0, secs: +M.reelT.toFixed(1), out: M.phase === 'done', fsm: run().fsm, at: +((run().cast.ly - wy()) / 4).toFixed(1) };
          // home anyway
          G.core.loop.setOnStep(function () { I.inject('action', run().fsm !== 'sailing'); });
          for (let i = 0; i < 300 && run().fsm !== 'sailing'; i++) { await new Promise(res => setTimeout(res, 100)); if (i > 150) { run().fsm = 'sailing'; } }
          G.core.loop.setOnStep(null); G.core.loop.setScale(1); I.inject('action', false);
          return out;
        }, [ch, PUMP]);
        if (!r.out || r.secs > LIMIT) bad++;
        row.push(r.out ? r.depth + 'm ' + r.secs + 's' : 'STUCK ' + r.depth + 'm->' + r.at + 'm ' + r.fsm);
        await p.waitForTimeout(300);
      }
      console.log(loc.padEnd(6), h.padEnd(18), row.join('   |   '));
    }
  }
  console.log(bad ? 'FAIL: ' + bad + ' retrieve(s) over ' + LIMIT + ' s or stuck' : 'PASS: every hook comes in within ' + LIMIT + ' s');
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
