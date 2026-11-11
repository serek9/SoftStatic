// Phase 110: reproducible location art baselines and composition studies.
// Tooling only; never loaded by the game. No production dependencies are added.
// node tools/locations.js --out tmp/location-art-110 [--only fog,harts,sound]
// node tools/locations.js --list | --check tmp/location-art-110
// Requires Playwright (like tools/lures.js). NODE_PATH may point to a temporary install.
// PLAYWRIGHT_EXECUTABLE_PATH optionally selects an installed Chromium-family browser.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const crypto = require('node:crypto');
const os = require('node:os');
const ROOT = path.resolve(__dirname, '..');
const SEED = 21;
const HOURS = { dawn: 6.25, grey: 12.5, dusk: 18.6, night: 23 };
const args = process.argv.slice(2);
function arg(k, fallback) { const i = args.indexOf(k); return i < 0 ? fallback : args[i + 1]; }
function assert(ok, msg) { if (!ok) throw new Error(msg); }
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function inventory() {
  const c = vm.createContext({ console });
  const files = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/src="(data\/loc_[^"]+\.js)"/g);
  for (const [, file] of files) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), c, { filename: file });
  return JSON.parse(JSON.stringify(Object.values(c.G.data.locations).map(l => ({
    id: l.id, name: l.name, width: l.width, waterY: l.waterY, maxDepthM: l.maxDepth * 0.25,
    water: l.water, ice: !!l.ice, layers: l.layers.map(q => ({ id: q.id, kind: q.kind, parallax: q.parallax })),
    reaches: l.reaches.map(r => ({ id: r.id, name: r.name, bounds: r.x,
      x: Math.round((r.x[0] + r.x[1]) / 2), cameraX: Math.max(0, Math.min(l.width - 320, Math.round((r.x[0] + r.x[1]) / 2) - 160)) }))
  }))));
}

// Only injected into the isolated test page. Virtual RAF fixes simulation time while
// performance.now remains real, so timings measure rendering CPU cost, not virtual time.
function scheduler() {
  let queue = [], time = 0;
  window.requestAnimationFrame = fn => (queue.push(fn), queue.length);
  window.cancelAnimationFrame = () => {};
  window.__artAdvance = n => {
    const costs = [];
    for (let i = 0; i < n; i++) {
      const next = queue; queue = []; time += 1000 / 60;
      const t = performance.now(); next.forEach(fn => fn(time)); costs.push(performance.now() - t);
    }
    return costs;
  };
}
function instrument() {
  const B = G.gfx.bake, cached = B.cached, drop = B.drop, cache = new Map();
  B.cached = function (key, make) { const cv = cached(key, make); cache.set(key, cv); return cv; };
  B.drop = function (prefix) { drop(prefix); for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key); };
  window.__artCache = () => {
    let pixels = 0; for (const cv of cache.values()) pixels += cv.width * cv.height;
    return { entries: cache.size, pixels, rgbaBytes: pixels * 4 };
  };
}
function setupFixture(f) {
  assertTour();
  const s = G.state.save, sc = G.scene.sailing;
  s.settings.tips = false; s.settings.reduceFlashes = true; s.settings.fullscreen = false;
  s.settings.music = 0; s.settings.volume = 0;
  s.gear.snow = true;
  s.pond = G.sim.pond.create();
  if (f.pond !== 'dirty') {
    s.pond.got = (1 << G.data.pond.pieces.length) - 1; s.pond.stream = true;
    s.pond.clear = f.pond === 'clearing' ? 0.5 : 1;
  }
  G.core.rng.seedAll(f.seed);
  s.clock = f.hour; sc.load(f.loc); G.state.run.fsm = 'sailing';
  sc.tp(f.x); dbg.unease(0); dbg.storm(f.storm);
  dbg.budget(f.budget || 0);
  G.core.loop.setOnStep(() => { s.clock = f.hour; sc.tp(f.x); });
  window.__artAdvance(120);
  if (f.view === 'underwater') {
    // Fixture placement uses the existing debug lure API. Do not wait for a bite or
    // let different fish histories determine the camera being compared.
    const r = G.state.run, l = sc.loc(), x = Math.min(l.width - 1, f.x + 24);
    r.fsm = 'waiting'; r.cast.bait = r.gearFx.bait;
    f.depthM = dbg.lure(Math.max(0.5, G.scene.underwater.bottomAt(l, x) * 0.25 * 0.65), x);
    r.lureIn.active = true; r.lureIn.x = x; r.lureIn.y = r.cast.ly - l.waterY;
    const tip = [0, 0], rope = G.gfx.rope;
    G.scene.boat.rodTip(r.boat, r.boat.x, l.waterY, tip);
    rope.reset(tip[0], tip[1]); rope.anchors(tip[0], tip[1], x, r.cast.ly);
    rope.setRest(Math.hypot(x - tip[0], r.cast.ly - tip[1]) * 1.04);
    for (let i = 0; i < 180; i++) {
      G.scene.underwater.viewStep(r, 1 / 60, l);
      rope.step(1 / 60, () => l.waterY);
    }
    G.ui.hud.update(1 / 60, r);
  }
  G.core.loop.setPaused(true);
  window.__artAdvance(5);
  return { loc: G.state.run.loc, camera: { ...G.state.run.cam }, boatX: G.state.run.boat.x,
    hour: s.clock, depthM: f.depthM || null, underwaterAlpha: G.state.run.uw.alpha,
    rain: sc.rain(), winter: dbg.winter(), pond: f.loc === 'pond' ? dbg.pond() : null,
    cache: window.__artCache(), bake: { ...G.gfx.bake.stats }, budget: dbg.budget(),
    tour: G.core.save.tour() };
  function assertTour() { if (!G.core.save.tour()) throw new Error('art fixtures require ?tour'); }
}

function fixtures(locations) {
  const out = [];
  for (const l of locations) {
    for (const r of l.reaches) {
      for (const [part, hour] of Object.entries(HOURS)) out.push({ loc: l.id, reach: r.id, x: r.x, part, hour, storm: 0, view: 'surface', pond: 'dirty' });
      out.push({ loc: l.id, reach: r.id, x: r.x, part: 'dusk-storm', hour: HOURS.dusk, storm: 0.8, view: 'surface', pond: 'dirty' });
      out.push({ loc: l.id, reach: r.id, x: r.x, part: 'dusk', hour: HOURS.dusk, storm: 0, view: 'underwater', pond: 'dirty' });
    }
    if (l.id === 'pond') for (const pond of ['clearing', 'clean']) for (const view of ['surface', 'underwater']) {
      out.push({ loc: l.id, reach: l.reaches[0].id, x: l.reaches[0].x, part: 'dusk', hour: HOURS.dusk, storm: 0, view, pond });
    }
  }
  return out.map(f => ({ ...f, seed: SEED, budget: 0,
    id: [f.loc, f.reach, f.part, f.view, f.loc === 'pond' ? f.pond : null].filter(Boolean).join('--') }));
}

function palette() {
  const c = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/gfx/sprites.js'), 'utf8'), c);
  return c.G.gfx.sprites.PALETTE;
}
// Deliberately broad, original value/composition studies, not production art or
// painted-over screenshots. Geometry and palette keys make the intended massing explicit.
function study(id, grey = false) {
  const P = palette();
  const presets = {
    fog: { sky: ['dusk_mauve_dk', 'dusk_mauve', 'dusk_cerise', 'dusk_coral'], far: 'hill_far', mid: 'hill_mid', near: 'pinev_dark', haze: 'fog_lav', water: 'water_slate_mid', light: 'larch_mid' },
    harts: { sky: ['mount_mid', 'mount_lit', 'fog_mid', 'fog_light'], far: 'mount_haze', mid: 'mount_mid', near: 'pine_mid', haze: 'fog_light', water: 'water_mid', light: 'birch' },
    sound: { sky: ['mount_mid', 'fog_mid', 'fog_light', 'dusk_rose'], far: 'mount_haze', mid: 'rock', near: 'rock_dark', haze: 'fog_light', water: 'water_mid', light: 'paper_dark' }
  };
  const k = presets[id], color = key => P[key];
  const rect = (key, x, y, w, h, a = 1) => `<rect fill="${color(key)}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="${a}"/>`;
  const poly = (key, points, a = 1) => `<polygon fill="${color(key)}" points="${points}" opacity="${a}"/>`;
  let sky = k.sky.map((key, i) => rect(key, 0, i * 52, 640, 53)).join('');
  sky += rect(k.haze, 0, 190, 640, 34, 0.25);
  let land;
  if (id === 'fog') {
    land = poly(k.far, '0,158 30,145 64,124 110,108 160,101 198,106 240,124 276,142 322,149 368,138 416,125 462,127 502,143 550,151 598,141 640,136 640,224 0,224');
    land += poly(k.mid, '0,188 36,171 78,168 130,183 176,201 224,209 288,210 340,203 382,190 426,180 468,184 520,198 580,206 640,194 640,224 0,224');
  } else if (id === 'harts') {
    land = poly(k.far, '0,132 44,109 83,122 126,92 156,111 188,129 222,112 252,100 287,118 330,127 372,148 423,136 464,113 505,126 550,147 602,140 640,130 640,224 0,224');
    land += poly(k.mid, '0,148 45,138 90,151 140,176 193,190 250,199 302,207 358,211 410,207 446,188 470,164 497,151 523,165 563,180 605,186 640,178 640,224 0,224');
  } else {
    land = poly(k.far, '0,214 34,210 60,211 78,204 106,206 130,215 180,214 210,219 0,224');
    land += poly(k.mid, '430,224 457,213 476,197 503,184 529,188 554,199 586,208 640,213 640,229');
  }
  // Haze interrupts the lower land; it does not bleach the foreground or whole frame.
  land += rect(k.haze, 0, 207, 640, 17, 0.28);
  let near = '';
  const groups = id === 'sound' ? [] : (id === 'fog' ? [[0,105], [424,95], [572,68]] : [[0,93], [467,78], [575,65]]);
  for (const [start, length] of groups) for (let i = 0; i < length; i += 9) {
    const x = start + i, h = 16 + ((i * 13 + start) % 23), y = 224;
    near += poly(k.near, `${x},${y-h} ${x-5},${y-13} ${x-3},${y-13} ${x-9},${y} ${x+9},${y} ${x+3},${y-13} ${x+5},${y-13}`);
  }
  if (id === 'fog') {
    near += poly('rockv', '0,224 12,204 40,197 73,202 92,213 111,224');
    near += rect('wood_dark', 515,209,31,15) + poly('night_violet', '510,210 530,198 551,210');
    near += rect('lamp_glow', 521,214,4,4) + rect('lamp_glow', 536,214,4,4);
    near += rect('night_violet', 411,181,1,43) + rect('neon_red', 410,180,3,2);
  } else if (id === 'harts') {
    near += poly('rock', '448,224 470,214 501,210 526,218 557,224');
    for (const [x, h] of [[477,43],[489,52],[510,39]]) near += rect('birch',x,224-h,2,h) + rect('moss',x-7,224-h,17,10);
    near += rect('wood_hi', 432,218,20,2) + rect('wood_dark',435,220,2,4) + rect('wood_dark',448,220,2,4);
  } else {
    near += poly('rock_dark','450,224 473,211 495,206 520,209 549,218 574,224');
    near += rect('paper_dark',501,159,8,47) + rect('stone_dark',500,155,10,6) + rect('lamp_glow',502,156,6,3);
    near += rect('wood_dark',526,211,18,8) + poly('rust_dark','523,211 535,204 547,211');
  }
  let water = rect(k.water,0,224,640,136);
  water += `<g transform="translate(0 362.88) scale(1 -0.62)" opacity="0.36">${land}${near}</g>`;
  water += rect(k.haze,0,224,640,14,0.1);
  for (let i=0;i<13;i++) water += rect(k.haze, 40+(i*83)%530, 237+i*9, 16+(i*7)%51, 1, 0.16);
  const boat = poly('wood_dark','283,284 345,284 339,292 292,292') + rect('wood_hi',285,282,57,3) + rect('coat',306,269,6,13) + rect('flesh',306,265,5,4) + rect('cap',305,263,8,2) + rect('dog',328,276,11,7) + rect('dog_hi',335,271,5,8) + `<path d="M312 274L330 253L352 247" fill="none" stroke="${color('wood_hi')}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><filter id="grey"><feColorMatrix type="saturate" values="0"/></filter></defs><g ${grey ? 'filter="url(#grey)"' : ''}>${sky}${land}${near}${water}${boat}</g></svg>`;
}

function html(report) {
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  return `<!doctype html><meta charset="utf-8"><title>SoftStatic — Phase 110 art review</title>
<style>body{background:#15151d;color:#d6d0cf;font:15px/1.5 system-ui;max-width:1400px;margin:40px auto;padding:0 24px}h1,h2{font-weight:500}p{max-width:850px}img{width:100%;image-rendering:pixelated}figure{margin:0;background:#20202a;padding:12px}figcaption{font-size:13px;padding:8px 0}section,.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}a{color:#d8bddf}select{padding:8px} @media(max-width:800px){section,.grid{grid-template-columns:1fr}}</style>
<h1>Locations with air and distance</h1><p>Phase 110 • seed ${SEED} • original composition studies and unchanged game baselines. Studies show proposed massing, colour and open space; they are not finished art or implemented gameplay.</p>
<h2>Composition and value studies</h2><div class="grid">${['fog','harts','sound'].map(id => `<figure><img src="studies/${id}.png"><img src="studies/${id}-value.png"><figcaption>${esc(report.studies[id])}</figcaption></figure>`).join('')}</div>
<h2>Current game: every reach</h2><p>Native 640×360 captures. Four hours, storm and underwater per reach; pond restoration variants. Desktop and phone captures include the full viewport and touch overlay. Measurements are desktop browser CPU render samples, not physical phone benchmarks.</p>
<label>Filter water <select id="filter"><option value="">All locations</option>${report.locations.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>
<section>${report.captures.map(c=>`<figure data-loc="${c.loc}"><a href="${c.file}"><img loading="lazy" src="${c.file}"></a><figcaption>${esc(c.id)} · x ${c.x} · ${c.hour.toFixed(2)}h · ${esc(c.profile)} · ${c.storm ? 'storm '+c.storm : 'storm off'}${c.metrics.depthM ? ' · '+c.metrics.depthM.toFixed(1)+'m deep' : ''}</figcaption></figure>`).join('')}</section>
<script>document.querySelector('select').onchange=e=>document.querySelectorAll('section figure').forEach(f=>f.hidden=!!e.target.value&&f.dataset.loc!==e.target.value)</script>`;
}

async function renderBoards(page, out, report) {
    // Contact sheets make the complete audit reviewable without opening 158 files.
    const dusk = report.captures.filter(c=>c.profile==='native' && c.part==='dusk' && c.view==='surface' && c.pond==='dirty');
    await page.setViewportSize({width:1280,height:Math.ceil(dusk.length/4)*206});
    await page.setContent('<style>body{margin:0;background:#15151d;color:#d6d0cf;font:12px system-ui;display:grid;grid-template-columns:repeat(4,320px)}figure{margin:0;height:206px}img{width:320px;height:180px;image-rendering:pixelated}figcaption{padding:3px 8px}</style>'+dusk.map(c=>'<figure><img src="data:image/png;base64,'+fs.readFileSync(path.join(out,c.file)).toString('base64')+'"><figcaption>'+c.loc+' / '+c.reach+'</figcaption></figure>').join(''));
    await page.screenshot({path:path.join(out,'all-reaches-dusk.png'),fullPage:true});
    await page.setViewportSize({width:1280,height:550});
    await page.setContent('<style>body{margin:0;background:#15151d;color:#d6d0cf;font:14px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px;box-sizing:border-box}figure{margin:0}img{width:100%;image-rendering:pixelated}p{margin:8px 0}</style>'+['fog','harts','sound'].map(id=>'<figure><p>'+id.toUpperCase()+' — COMPOSITION / VALUE STUDY</p>'+['','-value'].map(suffix=>'<img src="data:image/png;base64,'+fs.readFileSync(path.join(out,'studies',id+suffix+'.png')).toString('base64')+'">').join('')+'</figure>').join(''));
    await page.screenshot({path:path.join(out,'composition-studies.png')});
}

function verify(dir) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
  assert(r.captures.length > 0, 'no captures');
  assert(new Set(r.captures.map(c=>c.id+'--'+c.profile)).size === r.captures.length, 'duplicate fixture');
  for (const l of r.locations) for (const reach of l.reaches) {
    const captures = r.captures.filter(c=>c.loc===l.id && c.reach===reach.id && c.profile==='native' && c.pond==='dirty');
    for (const part of Object.keys(HOURS).concat('dusk-storm')) assert(captures.some(c=>c.part===part && c.view==='surface'), 'missing '+l.id+'/'+reach.id+'/'+part);
    assert(captures.some(c=>c.view==='underwater' && c.metrics.underwaterAlpha > 0.95), 'missing cutaway '+l.id+'/'+reach.id);
    for (const c of captures) assert(Math.abs(c.metrics.boatX - reach.x)<0.1, 'boat drift '+c.id);
  }
  for (const l of r.locations) for (const profile of ['desktop','phone']) assert(r.captures.some(c=>c.loc===l.id && c.profile===profile), 'missing viewport '+l.id+'/'+profile);
  if (r.locations.some(l=>l.id==='pond')) for (const pond of ['clearing','clean']) for (const view of ['surface','underwater']) assert(r.captures.some(c=>c.loc==='pond' && c.pond===pond && c.view===view), 'missing pond '+pond+'/'+view);
  for (const c of r.captures) {
    assert(c.metrics.tour, 'saving fixture '+c.id);
    assert(c.errors.length === 0, 'page errors '+c.id+': '+c.errors.join('; '));
    const bytes = fs.readFileSync(path.join(dir,c.file)); assert(hash(bytes)===c.sha256, 'image mismatch '+c.file);
    assert(bytes.readUInt32BE(16)===c.imageWidth && bytes.readUInt32BE(20)===c.imageHeight, 'image size '+c.file);
  }
  for (const id of ['fog','harts','sound']) for (const suffix of ['', '-value']) assert(fs.existsSync(path.join(dir,'studies',id+suffix+'.png')), 'missing study '+id+suffix);
  assert(r.cacheRevisit.after.entries === r.cacheRevisit.before.entries, 'retained cache grew on same-water revisit');
  console.log(`locations: PASS (${r.locations.length} waters, ${r.locations.reduce((n,l)=>n+l.reaches.length,0)} reaches, ${r.captures.length} captures, 3 colour/value studies, 0 page errors)`);
  return r;
}

async function main() {
  const all = inventory();
  if (args.includes('--list')) { console.log(JSON.stringify(all,null,2)); return; }
  if (args.includes('--check')) { verify(path.resolve(arg('--check'))); return; }
  const only = arg('--only','').split(',').filter(Boolean);
  assert(only.every(id=>all.some(l=>l.id===id)), 'unknown --only location');
  const locations = only.length ? all.filter(l=>only.includes(l.id)) : all;
  const out = path.resolve(arg('--out', path.join(ROOT,'tmp/location-art-110')));
  assert(out !== ROOT && !fs.existsSync(path.join(out,'manifest.json')), 'use a fresh output directory (baseline already exists)');
  fs.mkdirSync(path.join(out,'captures'),{recursive:true}); fs.mkdirSync(path.join(out,'studies'),{recursive:true});
  const { chromium } = require('playwright');
  const source = fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace('<!-- boot -->', `<script>(${instrument.toString()})();</script><!-- boot -->`);
  const server = http.createServer((req,res)=>{
    const file = path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);
    if (file!==ROOT && !file.startsWith(ROOT+path.sep)) { res.writeHead(403).end(); return; }
    try { const index = file===ROOT || file===path.join(ROOT,'index.html');
      const body = index ? source : fs.readFileSync(file);
      res.setHeader('Content-Type',index ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream'); res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const base = `http://127.0.0.1:${server.address().port}/?debug&tour&seed=${SEED}&nosw`;
    const report = { version:1, seed:SEED, hours:HOURS, locations, captures:[],
      environment:{ browser:await browser.version(), platform:process.platform, arch:process.arch, cpu:os.cpus()[0]?.model, timing:'240 frozen RAF draw samples; performance.now CPU duration; no GPU completion or physical-device measurement', cache:'tracked baked cache entries and RGBA pixel estimate, excludes non-cache canvases/GPU overhead' },
      sourceHashes:Object.fromEntries(['index.html',...Array.from(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/src="([^"]+\.js)"/g),m=>m[1])].map(file=>[file,hash(fs.readFileSync(path.join(ROOT,file)))])),
      studies: {
        fog:'Fogbound — cabin window at right; open central water; three overlapping rounded land masses; local lavender haze. Mast and falls remain secondary anchors.',
        harts:'Hartsmere — birch point and bench at right; long open lake at centre-left; broken ridge profiles behind progressively quieter woodland.',
        sound:'Coldharbor — small lighthouse on right headland; open left horizon; sky and sea dominate; low skerries establish coastal scale.'
      } };
    const profiles = { native:{viewport:{width:640,height:360},deviceScaleFactor:1}, desktop:{viewport:{width:1280,height:720},deviceScaleFactor:1}, phone:{viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true} };
    for (const [profile,options] of Object.entries(profiles)) {
      const context = await browser.newContext(options);
      await context.addInitScript(scheduler);
      const page = await context.newPage(); let errors = [];
      page.on('pageerror',e=>errors.push(String(e)));
      page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
      page.on('requestfailed',r=>errors.push('request failed: '+r.url()));
      // Hide only debug DOM text; screenshot the complete viewport for device profiles.
      const rows = profile==='native' ? fixtures(locations) : locations.map(l=>({ ...fixtures([l]).find(f=>f.part==='dusk'&&f.view==='surface'), budget:0 }));
      for (const f of rows) {
        errors = []; await page.goto(base); await page.waitForFunction(()=>window.G?.scene?.sailing?.loc());
        await page.addStyleTag({content:'body>pre{display:none!important}'});
        const metrics = await page.evaluate(setupFixture,f);
        assert(metrics.loc===f.loc && metrics.tour, 'fixture did not load '+f.id);
        if (profile==='native' && report.captures.length===0) {
          const sample = await page.evaluate(()=>window.__artAdvance(240));
          sample.sort((a,b)=>a-b); metrics.render = {samples:sample.length,medianMs:sample[120],p95Ms:sample[228],maxMs:sample[239]};
          const before = await page.evaluate(()=>window.__artCache());
          const after = await page.evaluate(id=>{G.scene.sailing.load(id); window.__artAdvance(5);return window.__artCache();},f.loc);
          report.cacheRevisit={loc:f.loc,before,after};
          // Recreate the fixture after the cache probe before taking its image.
          await page.goto(base); await page.waitForFunction(()=>window.G?.scene?.sailing?.loc());
          await page.addStyleTag({content:'body>pre{display:none!important}'});
          Object.assign(metrics,await page.evaluate(setupFixture,f));
        } else if (profile!=='native' || f.part==='dusk' && f.view==='surface') {
          const sample = await page.evaluate(()=>window.__artAdvance(240)); sample.sort((a,b)=>a-b);
          metrics.render={samples:sample.length,medianMs:sample[120],p95Ms:sample[228],maxMs:sample[239]};
        }
        const file = `captures/${f.id}--${profile}.png`;
        // At native size the viewport is exactly the 640×360 game canvas. Capture
        // through the compositor too: browser canvas-readback privacy protection
        // can perturb toDataURL pixels independently of the rendered scene.
        const bytes = await page.screenshot();
        fs.writeFileSync(path.join(out,file),bytes);
        report.captures.push({...f,profile,file,metrics,errors:errors.slice(),sha256:hash(bytes),imageWidth:bytes.readUInt32BE(16),imageHeight:bytes.readUInt32BE(20)});
        assert(errors.length===0, 'page errors: '+errors.join('; '));
      }
      await context.close(); console.log(`captured ${profile}: ${rows.length} views`);
    }
    const page = await browser.newPage({viewport:{width:640,height:360},deviceScaleFactor:1});
    for (const id of ['fog','harts','sound']) for (const grey of [false,true]) {
      const svg=study(id,grey), name=id+(grey?'-value':'');
      fs.writeFileSync(path.join(out,'studies',name+'.svg'),svg);
      await page.setContent(`<style>body{margin:0}</style>${svg}`);
      await page.screenshot({path:path.join(out,'studies',name+'.png')});
    }
    fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(out,'index.html'),html(report));
    await renderBoards(page, out, report);
    verify(out); console.log('review: '+path.join(out,'index.html'));
  } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
}
if (require.main === module) main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports = { inventory, fixtures, verify, renderBoards };
