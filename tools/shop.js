// Phase 116: artwork loading, shop transactions, cosmetic looks, warm render caches,
// failed-asset fallback and a genuinely offline reload. Needs the game served locally.
// node tools/shop.js [http://127.0.0.1:5517] [optional screenshot directory]
// CHROMIUM_EXECUTABLE may point to an existing system Chromium.
const { chromium } = require('playwright');
const assert = require('assert').strict, fs = require('fs'), path = require('path');
const origin = process.argv[2] || 'http://127.0.0.1:5517', output = process.argv[3];
if (output) fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {});
  try {
    const errors = [], page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(origin + '/?debug&seed=7&nosw');
    await page.waitForFunction(() => G.ui.shopArt.ready());
    await page.evaluate(() => { dbg.hour(19.2); G.core.state.change('shop'); G.core.loop.setPaused(true); });
    const result = await page.evaluate(() => {
      const room = G.ui.shopRoom, shop = G.ui.shop, save = G.state.save;
      const blocked = room.blocked().length, walk = dbg.shopWalk('RRUUU');
      const queue = [[room.MAT[0], room.MAT[1]]], visited = new Set(), reachable = new Set();
      const directions = [['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]];
      for (let q = 0; q < queue.length; q++) {
        const [x,y] = queue[q], key = x + ':' + y; if (visited.has(key)) continue; visited.add(key);
        for (const [face,dx,dy] of directions) {
          const st = room.create(); st.c = x; st.r = y; st.face = face;
          const target = room.facing(st); if (target) reachable.add(target);
          if (!room.isBlocked(x + dx,y + dy) && !visited.has((x + dx) + ':' + (y + dy))) queue.push([x + dx,y + dy]);
        }
      }
      save.coins = 10000;
      const lure = G.data.gear.lures[0]; save.baits[lure.id] = 0;
      shop.shelf('lures', 0);
      const coins = save.coins, before = save.baits[lure.id]; shop.act();
      const transaction = { spent: coins - save.coins, count: save.baits[lure.id] - before, cost: lure.pack * lure.cost, pack: lure.pack };
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const c = cv.getContext('2d');
      const env = { hour: 19.2, night: 0.2, grey: 0, rain: 0.6, fog: 0.5, flash: 0, strange: '', st: 0.5 };
      const stock = { rods: save.gear.rods, minnows: 7, crickets: 6 }, rusty = { face: 'down', fr: 0 };
      room.draw(c, room.create(), 4, env.hour, rusty, stock, env);
      const fisher = save.look.fisher, dog = save.look.dog, start = G.gfx.bake.stats.canvases;
      const inks = [], ctxState = [];
      for (let look = 0; look < 4; look++) for (const dir of ['down', 'right', 'up', 'left']) for (let pose = 0; pose < 3; pose++) {
        save.look.fisher = G.data.looks.fishers[look].id; save.look.dog = G.data.looks.dogs[look].id;
        const st = room.create(); st.face = dir; st.dog.face = dir; st.dog.sit = pose === 0;
        st.moving = pose > 0; st.t = pose ? 0.5 : 1; st.steps = pose; st.tc = st.c + (dir === 'right' ? 1 : 0);
        env.strange = pose === 1 ? 'figure' : (pose === 2 ? 'clock' : '');
        room.draw(c, st, 4, env.hour, rusty, stock, env);
        ctxState.push(c.globalAlpha === 1 && c.globalCompositeOperation === 'source-over');
        const pixels = c.getImageData(0, 0, 640, 360).data; let sum = 0;
        // Hash the player/dog area, independent of the shared room background.
        for (let y = 250; y < 320; y++) for (let x = 280; x < 400; x++) {
          const p = (y * 640 + x) * 4; sum = (Math.imul(sum, 31) + pixels[p] + pixels[p + 1] * 3 + pixels[p + 2] * 7) >>> 0;
        }
        inks.push(sum);
      }
      const addedCanvases = G.gfx.bake.stats.canvases - start;
      save.look.fisher = fisher; save.look.dog = dog;
      return { artwork: G.ui.shopArt.info(), blocked, reachable: Array.from(reachable).sort(), walk, panel: shop.info().open, transaction, rendered: inks.length, distinct: new Set(inks).size, addedCanvases, contextRestored: ctxState.every(Boolean) };
    });
    assert.equal(result.blocked, 61); assert.equal(result.walk.faced, 'rusty'); assert.equal(result.panel, 'items');
    assert.deepEqual(result.reachable, ['cat','cooler','crickets','gear','guitar','jar','lures','rack','rusty','tank','worms']);
    assert.equal(result.transaction.spent, result.transaction.cost); assert.equal(result.transaction.count, result.transaction.pack);
    assert.equal(result.artwork.frames, 56); assert(result.distinct > 20); assert.equal(result.addedCanvases, 0); assert(result.contextRestored);
    if (output) {
      await page.evaluate(() => { G.core.state.change('shop'); document.querySelectorAll('pre').forEach(e => { e.style.display = 'none'; }); });
      await page.screenshot({ path: path.join(output, 'shop.png') });
    }
    await page.close();
    const broken = await browser.newPage(); broken.on('pageerror', e => errors.push(String(e)));
    await broken.route('**/assets/shop/room.png', r => r.abort());
    await broken.goto(origin + '/?debug&seed=7&nosw');
    await broken.waitForFunction(() => G.ui.shopArt.info().failed.length > 0);
    const fallback = await broken.evaluate(() => { G.core.state.change('shop'); const c = document.createElement('canvas'); c.width = 640; c.height = 360; G.ui.shop.draw(c.getContext('2d')); return { art: G.ui.shopArt.ready(), walk: dbg.shopWalk('RRUUU') }; });
    assert.equal(fallback.art, false); assert.equal(fallback.walk.faced, 'rusty');
    await broken.close();
    const context = await browser.newContext(), offline = await context.newPage();
    offline.on('pageerror', e => errors.push(String(e)));
    await offline.goto(origin + '/?debug&seed=7&sw');
    await offline.evaluate(() => navigator.serviceWorker.ready);
    await offline.waitForFunction(() => !!navigator.serviceWorker.controller);
    const cached = await offline.evaluate(async () => {
      const cache = await caches.open('softstatic-v1');
      return Promise.all(['assets/shop/room.png', 'assets/shop/characters.png', 'assets/shop/dog-walk.png'].map(async p => !!(await cache.match(p))));
    });
    assert(cached.every(Boolean)); await context.setOffline(true);
    await offline.reload(); await offline.waitForFunction(() => G.ui.shopArt.ready());
    const offlineWalk = await offline.evaluate(() => { G.core.state.change('shop'); return dbg.shopWalk('RRUUU'); });
    assert.equal(offlineWalk.faced, 'rusty'); await context.close(); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ...result, failedAssetFallback: 'PASS', offlineReload: 'PASS', pageErrors: errors.length }));
    console.log('PASS: miniature shop artwork, 48 pose/look combinations, purchase, fallback and offline play');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
