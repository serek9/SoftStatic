// tools/lures.js (Phase 104, PLAN_FISHING.md): every hook dropped, left on a slack line and worked
// stop-and-go in the real game (headless Chromium, Playwright), its path measured and checked
// against PLAN_FISHING.md's Phase 104 table. Needs the game served:
//   python3 -m http.server 5517 --bind 127.0.0.1
//   node tools/lures.js [hook,hook,...]     (exit 1 on a FAIL)
// The rows it prints: fall {rate px/s, sway px, secs}, atStop {depth m, onBed, surface}, slack
// (Down held 2 s), retrieve (8 x 0.25 s on, 0.25 s off) {topSpeed px/s, surfaceShare, bed contacts}.
const { chromium } = require('playwright');
(async () => {
  const hooks = (process.argv[2] || 'worm,cricket,minnow,bobber,crankbait,spinnerbait,small_spoon,dropshot,wacky_worm,jighead,topwater,medium_blade,glidebait,minnow_swimbait').split(',');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:5517/?debug&seed=5&tour'); await p.waitForTimeout(1500);
  await p.evaluate(() => { dbg.caught(1); dbg.hour(12); dbg.rod(99); });
  const out = [];
  for (const h of hooks) {
    await p.evaluate(h => { G.state.save.baits[h] = 9; dbg.tackle(null, h); }, h);
    await p.waitForTimeout(200);
    await p.evaluate(() => dbg.cast(0.6));
    for (let i = 0; i < 60; i++) { if (['sinking', 'waiting', 'interest'].includes(await p.evaluate(() => G.state.run.fsm))) break; await p.waitForTimeout(100); }
    // the fall: sample until it stops sinking (or 6 s)
    const pts = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 6000) { const q = await p.evaluate(() => { const c = G.state.run.cast; return [c.x1, c.ly, G.state.run.fsm]; }); pts.push(q); if (q[2] !== 'sinking') break; await p.waitForTimeout(50); }
    const dt = (Date.now() - t0) / 1000, xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const fall = { rate: +((ys[ys.length - 1] - ys[0]) / dt).toFixed(1), sway: +(Math.max(...xs) - Math.min(...xs)).toFixed(1), secs: +dt.toFixed(1) };
    const a = await p.evaluate(() => dbg.lureMotion());
    // slack line 2 s
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(2000); const slack = await p.evaluate(() => dbg.lureMotion()); await p.keyboard.up('ArrowDown');
    const d0 = await p.evaluate(() => dbg.bail().depthM);
    // stop-and-go 4 s
    let topSpeed = 0, surf = 0, n = 0;
    for (let k = 0; k < 8; k++) {
      await p.keyboard.down('Space'); await p.waitForTimeout(250); await p.keyboard.up('Space'); await p.waitForTimeout(250);
      const m = await p.evaluate(() => dbg.lureMotion()); if (m.fsm === 'sailing') break; topSpeed = Math.max(topSpeed, m.speed); surf += m.surface ? 1 : 0; n++;
    }
    const e = await p.evaluate(() => dbg.lureMotion());
    out.push({ hook: h, fall, atStop: { depth: d0, onBed: a.onBed, surface: a.surface }, slack: { falling: slack.falling, onBed: slack.onBed, surface: slack.surface }, retrieve: { topSpeed: +topSpeed.toFixed(1), surfaceShare: n ? +(surf / n).toFixed(2) : null, bedN: e.bedN, flash: a.profile.flash || 0, thump: a.profile.thump || 0 } });
    await p.keyboard.down('Space'); for (let i = 0; i < 250; i++) { if (await p.evaluate(() => G.state.run.fsm) === "sailing") break; await p.waitForTimeout(150); } await p.keyboard.up('Space');
    await p.waitForTimeout(300);
  }
  for (const r of out) console.log(JSON.stringify(r));
  const bad = check(out);
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();


function check(rows) {
  const by = {}; rows.forEach(r => by[r.hook] = r);
const T = [
  ['cricket floats', r => r.atStop.surface && !r.slack.falling, 'cricket'],
  ['popper floats', r => r.atStop.surface, 'topwater'],
  ['crank rests at the top', r => r.atStop.depth <= 0.6, 'crankbait'],
  ['spoon flutters (sway >= 4 px)', r => r.fall.sway >= 4, 'small_spoon'],
  ['spinnerbait helicopters (falls under 0.3 of a jig)', r => r.fall.rate < 0.3 * by.jighead.fall.rate, 'spinnerbait'],
  ['jig falls fast (>= 20 px/s)', r => r.fall.rate >= 20, 'jighead'],
  ['jig hops the bed (>= 3 contacts)', r => r.retrieve.bedN >= 3, 'jighead'],
  ['bladebait falls fast (>= 20 px/s)', r => r.fall.rate >= 20, 'medium_blade'],
  ['wacky worm falls slow (< 6 px/s)', r => r.fall.rate < 6, 'wacky_worm'],
  ['dropshot weight on the bed', r => r.atStop.onBed, 'dropshot'],
  ['dropshot dragged slowly (< 8 px/s)', r => r.retrieve.topSpeed < 8, 'dropshot'],
  ['minnow sinks slower than a worm', r => r.fall.rate < by.worm.fall.rate, 'minnow'],
  ['swimbait sinks slowly (< 12 px/s)', r => r.fall.rate < 12, 'minnow_swimbait'],
  ['bobber holds its bait at 1.5 m', r => Math.abs(r.atStop.depth - 1.5) < 0.2, 'bobber']
];
let bad = 0;
for (const [name, fn, h] of T) { const r = by[h]; if (!r) continue; const ok = fn(r); if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (r ? '' : ' (no row)')); }
console.log(bad ? bad + ' FAIL' : 'all PASS');
  return bad;
}
