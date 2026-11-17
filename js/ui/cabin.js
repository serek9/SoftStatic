var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The cabin (9.6, V9, V10.9), reached from the map or the pier. Kept fish are mounted on its
// plaques, heaviest first. Some trophies face the door when you come in; how many follows the
// unease of the water you came from (§2). That is decided in enter() and only there, so a trophy
// never turns while it is on screen (draw only reads `turned`).
// Phase 56: a room you walk into, like the bait shop (js/ui/room.js walks it, js/ui/room_kit.js
// has the parts). Phase 83 (PLAN_WINTER.md 2.4): a back door opens onto the Back Pond
// (data/loc_pond.js): walking out of it, or Space at it, goes down to the pond's dock and the boat
// moored there; coming in from the pond he stands inside it. The front door always goes out to
// Fogbound's pier, and Esc or M goes back the way he came in. Phase 85 (PLAN_WINTER.md 2.5): the
// CRT's channels and Pond Cam (the time it is watched counts in save.pond.watch); a kept fish of
// trophy weight hangs a small brass tag under its plaque.
// Phase 128 (the user, 2026-11-17: "the cabin is always like this, no need to repair it"): the
// room is the user's own picture (js/gfx/cabin_art.js, 64 keys pv*), at 528×352, nearly the whole
// view, so every detail reads. No stages and no repairs (data/gear.js cabin and the "cabin
// restored" milestone are gone; save.cabinLevel is kept in old saves and read by nothing). The
// back door is the green door with the red panes in the back wall (out by walking up from the mat
// before it); four plaques, as drawn, hold the four heaviest kept fish; the computer on the desk
// is where the fisher and the dog are chosen (the mirror is gone). The shelf, the desk, the TV,
// the table, the sofa, the bed and the music corner are cut from the picture (its cuts) and drawn
// in order of their feet with the walkers, so he passes behind them. Live over the picture: the
// windows by the hour, the stove's fire, the red panes breathing, the lamps' glow, the TV (the
// sun as drawn, the console's game, Pond Cam), the computer's cursor, the record turning, steam
// off the mug, the dark at night in warm steps with the lamps' pools.
G.ui = G.ui || {};
G.ui.cabin = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, K = G.ui.roomKit, R = G.ui.room;
  // The picture's size and place; the walk's tiles (T) from (GX, GY): row 0 is the back wall and
  // what stands against it, rows 1-8 the floor, the mat (m) inside the front door.
  var W = 528, RH = 352, OX = (640 - W) >> 1, OY = (360 - RH) >> 1, T = 32, GX = 20, GY = 50;
  var MAP = [
    'wwwwwwwwwwwwwww',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '.......m.......'
  ];
  // Talk: what Space does facing it (use(), below).
  var OBJECTS = [
    { id: 'bench', c: 0, r: 0, w: 2, h: 1, block: true, talk: 'bench' },
    { id: 'sink', c: 2, r: 0, w: 2, h: 1, block: true, talk: 'sink' },
    { id: 'cooker', c: 4, r: 0, w: 1, h: 1, block: true, talk: 'cooker' },
    { id: 'fridge', c: 5, r: 0, w: 1, h: 1, block: true, talk: 'fridge' },
    { id: 'plaques', c: 6, r: 0, w: 4, h: 1, block: true, talk: 'plaques' },
    { id: 'backdoor', c: 10, r: 0, w: 1, h: 1, block: true, talk: 'backdoor' },
    { id: 'stove', c: 11, r: 0, w: 1, h: 1, block: true, talk: 'stove' },
    { id: 'bike', c: 12, r: 0, w: 2, h: 1, block: true, talk: 'bike' },
    { id: 'rods', c: 14, r: 0, w: 1, h: 1, block: true, talk: 'rods' },
    { id: 'desk', c: 0, r: 4, w: 2, h: 2, block: true, talk: 'pc' },
    { id: 'chair', c: 1, r: 6, w: 1, h: 1, block: true, talk: 'pc' },
    { id: 'plant', c: 0, r: 6, w: 1, h: 1, block: true, talk: '' },
    { id: 'shelf', c: 2, r: 3, w: 1, h: 2, block: true, talk: 'books' },
    { id: 'monstera', c: 3, r: 4, w: 1, h: 1, block: true, talk: '' },
    { id: 'tv', c: 6, r: 3, w: 2, h: 1, block: true, talk: 'tv' },
    { id: 'table', c: 6, r: 4, w: 2, h: 2, block: true, talk: 'tv' },
    { id: 'sofa', c: 6, r: 6, w: 2, h: 1, block: true, talk: 'sofa' },
    { id: 'sidelamp', c: 5, r: 6, w: 1, h: 1, block: true, talk: 'lamp' },
    { id: 'post', c: 11, r: 3, w: 1, h: 2, block: true, talk: '' },
    { id: 'bed', c: 12, r: 3, w: 2, h: 2, block: true, talk: 'bed' },
    { id: 'night', c: 14, r: 3, w: 1, h: 1, block: true, talk: 'redlamp' },
    { id: 'guitar', c: 11, r: 6, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'music', c: 12, r: 6, w: 2, h: 1, block: true, talk: 'keys' },
    { id: 'stool', c: 12, r: 7, w: 1, h: 1, block: true, talk: 'keys' },
    { id: 'records', c: 14, r: 6, w: 1, h: 1, block: true, talk: 'records' }
  ];
  var MAT = [7, 8], BACK = [10, 1], PLQ_C = 6;                                   // the tile inside the back door; the plaques' first column
  var WK = R.walker(MAP, OBJECTS, MAT, [{ c: BACK[0], r: BACK[1], dir: 'up', id: 'back' }]);
  // Places in the picture (room px).
  var PLQ = [223, 248, 272, 297], PLQ_Y = 40, PLQ_W = 18, PLQ_H = 12, FISH_W = 22, FISH_H = 10;
  var GLASS = [[91, 25, 36, 30], [148, 25, 32, 27]], FIRE = [382, 72, 9, 6], PANES = [343, 31, 16, 20];
  var SCREEN = [231, 138, 30, 21], PC = [46, 186, 13, 6], OIL = [190, 242], RED = [466, 140], MUG = [226, 205], DISC = [483, 244];

  // ---- The picture ------------------------------------------------------------------------------
  var CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
  // Paints the picture's rectangle (x0, y0, w, h) at the canvas' origin; spans (optional): per row,
  // the first and one past the last pixel to paint.
  function paintArt(c, x0, y0, w, h, spans) {
    var art = G.gfx.cabinArt, rows = art.rows, keys = art.keys;
    for (var y = y0; y < y0 + h; y++) {
      var row = rows[y], a = spans ? x0 + spans[(y - y0) * 2] : x0, b = spans ? x0 + spans[(y - y0) * 2 + 1] : x0 + w, run = -1, rx = a;
      for (var x = a; x <= b; x++) {
        var k = x < b ? CH.indexOf(row[x]) : -1;
        if (k !== run) { if (run >= 0) { c.fillStyle = P[keys[run]]; c.fillRect(rx - x0, y - y0, x - rx, 1); } run = k; rx = x; }
      }
    }
  }
  function artKey(x, y) { var a = G.gfx.cabinArt; return a.keys[CH.indexOf(a.rows[y][x])]; }

  var base = null, props = null, mask = null, coin = null, bakeMs = 0;
  function bake() {
    if (base) return;
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0, cuts = G.gfx.cabinArt.cuts;
    base = G.gfx.bake.cached('cabin:art128', function () { return G.gfx.bake.layer(W, RH, function (c) { paintArt(c, 0, 0, W, RH, null); }); });
    props = [];
    for (var i = 0; i < cuts.length; i++) (function (q) {
      props.push({ id: q.id, img: G.gfx.bake.cached('cabin:cut128:' + q.id, function () { return G.gfx.bake.layer(q.w, q.h, function (c) { paintArt(c, q.x, q.y, q.w, q.h, q.spans); }); }), x: q.x, y: q.y, foot: q.foot });
    })(cuts[i]);
    mask = softMask(W, RH, [{ x: 388, y: 84, r: 80, sx: 1.4 }, { x: OIL[0], y: OIL[1] + 8, r: 70 }, { x: RED[0], y: RED[1] + 8, r: 56 },
      { x: SCREEN[0] + 15, y: SCREEN[1] + 26, r: 44, sx: 1.5 }, { x: PC[0] + 6, y: PC[1] + 6, r: 34 }, { x: 132, y: 52, r: 60, sx: 2.2 }, { x: 350, y: 54, r: 30 }]);
    coin = G.gfx.bake.layer(8, 8, function (c) { var g = G.gfx.pix.grid(8, 8); g.ell(4, 4, 3.6, 3.6, ['rust', 'leaf_gold', 'brass_hi'], { bias: 0.1 }); g.rect('rust', 3, 3, 2, 2); g.rect('brass_hi', 2, 2, 1, 1); g.paint(c, 0, 0); });
    if (t0) bakeMs = performance.now() - t0;
  }
  // The dark at night: a warm dark in fine steps, clear in the lamps' pools.
  function softMask(w, h, pools) {
    return G.gfx.bake.layer(w, h, function (c) {
      c.fillStyle = P.cedar_deep;
      for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) {
        var best = 9;
        for (var i = 0; i < pools.length; i++) { var p = pools[i], dx = (x - p.x) / (p.sx || 1.2), dy = y - p.y; best = Math.min(best, Math.sqrt(dx * dx + dy * dy) / p.r); }
        var a = Math.round(Math.max(0, Math.min(1, (best - 0.3) / 0.9)) * 10) / 10 * 0.6;
        if (!a) continue;
        c.globalAlpha = a; c.fillRect(x, y, 2, 2);
      }
      c.globalAlpha = 1;
    });
  }

  // ---- State ----------------------------------------------------------------------------------
  var t = 0;
  var mounted = [];   // {spIdx, img, flipImg, name, len, trophy}, decided in enter()
  var turned = [];    // per mounted trophy: faces the door; decided in enter() only
  var order = [];
  var from = 'front', stored = 0, walk = null, faced = '', held = [], txt = { title: 'THE CABIN', next: '', stored: '', coins: '' }, lastCoins = -1;
  // Phase 129: the heading (the cabin, the coins, the keys) shows on the first visit, then only
  // with the pause list's Key hints at 'always'; a message box still opens at Space.
  var firstVisit = true, R_NONE = [];
  function headOn() { return firstVisit || !!G.state.save.settings.hints; }
  var open = '', lines = [], tvMode = 0, tvT = 0, recordT = -1, chordN = 0, sayN = {};
  var env = { hour: 0, night: 0, grey: 0, rain: 0, fog: 0, flash: 0 };
  var BOX = { x: 24, y: 296, w: 592, h: 56 }, HEAD = { x: 120, y: 316, w: 400, h: 40 };
  var R_BOX = [[BOX.x, BOX.y - 13, BOX.w, BOX.h + 13]], R_HEAD = [[HEAD.x, HEAD.y - 13, HEAD.w, HEAD.h]]; // 8.4 #38
  // Phase 90: on the UI layer the box and the heading sit at the picture's foot there.
  var uiv = -1;
  function uiLay() {
    var U = G.ui.panel;
    if (uiv === U.ver()) return;
    uiv = U.ver();
    if (U.on()) { var p = U.pic(); BOX.x = p[0] + 16; BOX.w = p[2] - 32; BOX.h = 56; BOX.y = p[1] + p[3] - 8 - BOX.h; HEAD.w = Math.min(400, p[2] - 16); HEAD.x = p[0] + ((p[2] - HEAD.w) >> 1); HEAD.h = 40; HEAD.y = p[1] + p[3] - 4 - HEAD.h; }
    else { BOX.x = 24; BOX.y = 296; BOX.w = 592; BOX.h = 56; HEAD.x = 120; HEAD.y = 316; HEAD.w = 400; HEAD.h = 40; }
    var b = R_BOX[0], h = R_HEAD[0];
    b[0] = BOX.x; b[1] = BOX.y - 13; b[2] = BOX.w; b[3] = BOX.h + 13; h[0] = HEAD.x; h[1] = HEAD.y - 13; h[2] = HEAD.w; h[3] = HEAD.h;
  }

  function texts() {
    txt.next = mounted.length ? mounted.length + (mounted.length === 1 ? ' fish' : ' fish') + ' on the wall' : 'Keep a fish to hang one.';
    txt.stored = stored > 0 ? '+' + stored + ' in the icebox' : '';
  }

  function speciesIndex(id) {
    for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) return i;
    return -1;
  }

  // Everything that must not change while the trophies are visible is decided here.
  function enter() {
    var save = G.state.save, kept = save.kept, i, j;
    bake();
    t = 0; open = ''; faced = ''; held.length = 0; tvMode = 0; recordT = -1;
    from = G.state.run.loc === 'pond' ? 'back' : 'front';                         // Phase 83: which door he came in by
    firstVisit = !(save.tipsDone && save.tipsDone.cabin);                          // Phase 129
    walk = from === 'back' ? WK.create({ c: BACK[0], r: BACK[1], face: 'down', dc: BACK[0] - 1, dr: BACK[1] }) : WK.create();
    R.prebake('fisher'); R.prebake('dog');                                          // so no step bakes a frame
    var ord = [];
    for (i = 0; i < kept.length; i++) if (speciesIndex(kept[i].id) >= 0) ord.push(i);
    ord.sort(function (a, b) { return kept[b].w - kept[a].w || a - b; });
    mounted.length = 0; turned.length = 0;
    for (i = 0; i < ord.length && i < PLQ.length; i++) {
      var k = kept[ord[i]], sp = speciesIndex(k.id);
      mounted.push({ trophy: k.w >= G.sim.pond.trophyKg(G.data.fish[sp]), spIdx: sp, img: G.gfx.fishgen.portrait(sp, FISH_W, FISH_H, false), flipImg: G.gfx.fishgen.portraitFlipped(sp, FISH_W, FISH_H), name: G.data.fish[sp].name, len: Math.round(k.len) + ' cm' });
      turned.push(false);
    }
    stored = ord.length - mounted.length;
    // How many face the door follows unease; which ones is a visual choice (G.vrng).
    var u = G.state.run.loc ? G.sim.unease.get(save, G.state.run.loc) : 0, n = Math.round(u * mounted.length);
    for (i = 0; i < n; i++) {
      do { j = G.vrng.int(0, mounted.length - 1); } while (turned[j]);
      turned[j] = true;
    }
    texts();
  }

  function exit() {}

  // Phase 83: out by a door. The back door goes down to the pond's dock (the boat moored there);
  // the front door to Fogbound's pier. The water is loaded here, behind the scene change, and
  // the pier's panel waits until the boat leaves and comes back (as after the map's trips).
  function leave(door) {
    var run = G.state.run, sc = G.scene.sailing, L = G.data.locations, sv = G.state.save;
    (sv.tipsDone || (sv.tipsDone = {})).cabin = true;                              // Phase 129: the heading's first visit is over
    if (door === 'back') {
      if (run.loc !== 'pond') { sc.load('pond'); sc.tp(L.pond.dock.x - 30); }
      G.ui.dock.disarm(); G.core.save.autosave('travel');
    } else if (run.loc !== 'fog') {
      sc.load('fog'); sc.tp(L.fog.dock.x + 30);
      G.ui.dock.disarm(); G.core.save.autosave('travel');
    }
    G.core.state.change('sailing');
  }

  function say(s) { uiLay(); lines = F.wrap(s, BOX.w - 32); open = 'box'; }
  // A thing's lines in turn, each Space the next.
  var SAYS = {
    bench: ['The workbench. Pliers, a vice, a red toolbox. Nothing here needs fixing.', 'Hooks sorted by size in the little drawers. Someone took care over it. You, probably.'],
    sink: ['The lake through the glass, and the old pier with the birch leaning over it.', 'A cup in the sink, rinsed. You do not remember using it.'],
    cooker: ['Four rings. The kettle is still warm.'],
    fridge: ['Cold beer, eggs, a jar of something pickled. The motor shudders and holds.', 'A note on the door in your handwriting: CHECK THE PIER. You do not remember writing it.'],
    stove: ['The fire ticks and settles. Warm.'],
    bike: ['A bike on the wall. The tyres have been flat for years.', 'A helmet, a pack, a plant somebody waters.'],
    rods: ['Old rods in their rack. Not for using; for remembering.'],
    books: ['Paperbacks swollen with damp. A field guide to freshwater fish, your name inside the cover.', 'A tide table for a sea that is nowhere near here.'],
    sofa: ['The sofa still keeps the shape of whoever sat in it.', 'A red blanket, folded. The mug on the table is still warm.'],
    lamp: ['An oil lamp. The flame does not move when you breathe on it.'],
    redlamp: ['A red lamp by the bed. You never switch it on. It is always on.']
  };
  function sayNext(id) { var a = SAYS[id], n = sayN[id] | 0; sayN[id] = n + 1; say(a[n % a.length]); }

  // What Space does facing each thing.
  function use(what) {
    if (what === 'pc') { G.ui.menu.open('look', 'cabin'); return; }                 // Phase 128: the computer is where the look is chosen
    if (what === 'backdoor') { leave('back'); return; }                             // Phase 83: out to the pond
    if (what === 'plaques') {
      var i = walk.c - PLQ_C, a = mounted[i];
      if (i < 0 || i >= PLQ.length) return;
      say(a ? a.name + ', ' + a.len + '.' + (a.trophy ? ' A trophy.' : '') + (stored > 0 ? '  ' + stored + ' more in the icebox.' : '') : 'An empty plaque. Keep a fish to hang one.');
      return;
    }
    if (what === 'guitar') { G.audio.engine.cue('strum', 0, chordN++ % 4); return; }
    if (what === 'keys') { G.audio.engine.cue('keys', 0, chordN++ % 4); return; }
    if (what === 'records') { if (recordT < 0) { recordT = t; G.audio.engine.cue('record'); } else recordT = -1; return; }
    if (what === 'tv') { tvMode = (tvMode + 1) % 3; tvT = t; return; }              // Phase 85: the sun as drawn, the game, Pond Cam
    if (what === 'bed') { uiLay(); lines = F.wrap('Under the quilt. Rest until:', BOX.w - 32); var pn = PARTS.indexOf(partNow(G.state.save.clock)); restSel = (pn + 1) % PARTS.length; open = 'rest'; return; } // Phase 93.1
    if (SAYS[what]) sayNext(what);
  }

  function envStep(dt) {
    var save = G.state.save, sc = G.scene.sailing, Lt = sc.light(G.sim.clock.wrap(save.clock));
    env.hour = save.clock; env.night = Lt.night; env.grey = Lt.grey;
    sc.stormTick(dt);
    env.rain = sc.rain(); env.fog = sc.fogAlpha(); env.flash = sc.flash();
  }

  // ---- Phase 93.1 (PLAN_PLAYABILITY.md): rest until a part of the day -------------------------
  // The bed here, and the pier's Wait row (G.ui.dock), offer dawn, day, dusk or night. A short
  // fade out, the clock set to that part's first hour (G.data.HOURS), the fish in view sent off
  // quietly (fish_ai.scatter), an autosave, and a fade back in. Never with a line out or a fish
  // on (only from the sailing fsm, as the pier's panel; the cabin has no line). A UI action:
  // the sim's clock just carries on from the new hour.
  var PARTS = ['dawn', 'day', 'dusk', 'night'], PART_ROWS = ['Dawn', 'Day', 'Dusk', 'Night'], REST_FADE = 0.45;
  var rest = { phase: '', t: 0, to: '', n: 0, last: '' };
  function partStart(p) { var h = G.data.HOURS[p]; return h ? h[0] : -1; }
  function partNow(hour) { var hh = Math.floor(G.sim.clock.wrap(hour)); for (var k in G.data.HOURS) if (G.data.HOURS[k].indexOf(hh) >= 0) return k; return ''; }
  function canRest() { var r = G.state.run; return !rest.phase && !(r && r.fsm && r.fsm !== 'sailing'); }
  function restUntil(p) {
    if (partStart(p) < 0 || !canRest()) return false;
    rest.phase = 'out'; rest.t = 0; rest.to = p;
    G.audio.engine.play('uiOk');
    return true;
  }
  // One step; true while the fade has the keys.
  function restStep(dt) {
    if (!rest.phase) return false;
    rest.t += dt;
    if (rest.phase === 'out' && rest.t >= REST_FADE) {
      G.state.save.clock = partStart(rest.to);
      var r = G.state.run;
      if (r && r.school) G.sim.fish_ai.scatter(r.school);
      G.core.save.autosave('rest');
      rest.phase = 'in'; rest.t = 0; rest.n++; rest.last = rest.to;
    } else if (rest.phase === 'in' && rest.t >= REST_FADE) rest.phase = '';
    return true;
  }
  function restAlpha() { return rest.phase === 'out' ? Math.min(1, rest.t / REST_FADE) : (rest.phase === 'in' ? Math.max(0, 1 - rest.t / REST_FADE) : 0); }
  var restSel = 0;
  function restRects() {
    var U = G.ui.panel, bh = U.btnH(), gap = 6, x = BOX.x + 14, y = BOX.y + BOX.h - U.PAD - bh, out = [];
    for (var i = 0; i < PART_ROWS.length; i++) { var w = Math.max(56, U.buttonW(PART_ROWS[i])); out.push([x, y, w, bh]); x += w + gap; }
    return out;
  }

  function update(dt) {
    var inp = G.core.input;
    t += dt;
    G.sim.clock.step(G.state.save, null, dt, G.rng, G.data);
    envStep(dt);
    if (restStep(dt)) return;                                                         // Phase 93.1: the fade has the keys
    if (recordT >= 0 && t - recordT > 9) recordT = -1;                               // the side ends
    if (tvMode === 2 && G.state.save.pond) G.state.save.pond.watch = (G.state.save.pond.watch || 0) + dt; // Phase 85: Fishwatch
    if (open) {
      if (inp.pressed('map') || inp.pressed('back')) { open = ''; return; }
      if (open === 'rest') {                                                         // Phase 93.1: the bed's four buttons
        var lr = (inp.pressed('right') ? 1 : 0) - (inp.pressed('left') ? 1 : 0);
        if (lr) { restSel = (restSel + lr + PARTS.length) % PARTS.length; G.audio.engine.play('uiMove'); }
        if (inp.pressed('action')) { open = ''; restUntil(PARTS[restSel]); }
        return;
      }
      if (inp.pressed('action')) open = '';
      return;
    }
    if (inp.pressed('back') || inp.pressed('map')) { leave(from); return; }
    var steps0 = walk.steps;
    WK.step(walk, dt, R.heldDir(inp, held));
    if (walk.exit) { leave(walk.exit); return; }
    if (walk.steps !== steps0) G.audio.engine.cue('step');
    faced = WK.facing(walk);
    if (inp.pressed('action') && faced) use(faced);
  }

  // ---- Drawing --------------------------------------------------------------------------------
  // Phase 128: the picture alive, from the scene's time only.
  function alive(ctx, ox, oy) {
    var i, k, n = env.night, hr = ((env.hour % 24) + 24) % 24, day = hr > 8 && hr < 17 ? Math.min(1, Math.min(hr - 8, 17 - hr)) : 0;
    // The windows: lighter by day, deep blue with stars by night, rain running down, a flash.
    for (i = 0; i < GLASS.length; i++) {
      var gl = GLASS[i], gx = ox + gl[0], gy = oy + gl[1];
      if (day > 0) { ctx.globalAlpha = 0.2 * day; ctx.fillStyle = P.fog_light; ctx.fillRect(gx, gy, gl[2], gl[3] >> 1); ctx.globalAlpha = 0.1 * day; ctx.fillRect(gx, gy + (gl[3] >> 1), gl[2], gl[3] - (gl[3] >> 1)); }
      if (n > 0.05) {
        ctx.globalAlpha = 0.5 * n; ctx.fillStyle = P.night_blue; ctx.fillRect(gx, gy, gl[2], gl[3]); ctx.globalAlpha = 1;
        ctx.fillStyle = P.fog_light;
        for (k = 0; k < 5; k++) if (Math.sin(t * (0.7 + k * 0.31) + k * 2 + i) > 0.3) ctx.fillRect(gx + 3 + ((k * 13 + i * 7) % (gl[2] - 6)), gy + 2 + ((k * 5) % 11), 1, 1);
        if (i === 1 && n > 0.4) { ctx.fillStyle = P[Math.sin(t * 0.37) > -0.7 ? 'lamp_glow' : 'signal_amber']; ctx.fillRect(gx + 22, gy + 17, 1, 1); } // a light across the lake
      }
      if (env.rain > 0.05) {
        ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.4;
        var nr = Math.round(env.rain * 7);
        for (k = 0; k < nr; k++) { var v = (t * (0.45 + (k % 4) * 0.1) + k * 0.37) % 1; ctx.fillRect(gx + 2 + ((k * 11 + i * 5) % (gl[2] - 4)), gy + Math.floor(v * (gl[3] - 4)), 1, 3); }
      }
      if (env.flash > 0) { ctx.globalAlpha = 0.55 * env.flash; ctx.fillStyle = P.fog_light; ctx.fillRect(gx, gy, gl[2], gl[3]); }
      ctx.globalAlpha = 1;
    }
    // The stove's fire: tongues rising and falling ten times a second, embers below.
    var tq = Math.floor(t * 10) / 10, fx = ox + FIRE[0], fy = oy + FIRE[1];
    for (k = 0; k < 3; k++) {
      var h = 2 + Math.round(1.5 + Math.sin(tq * 5.3 + k * 1.9) + 0.6 * Math.sin(tq * 9.1 + k));
      ctx.fillStyle = P.flame; ctx.fillRect(fx + 1 + k * 3, fy + FIRE[3] - 1 - h, 2, h);
      ctx.fillStyle = P.lamp_glow; ctx.fillRect(fx + 1 + k * 3 + (k & 1), fy + FIRE[3] - 1 - (h >> 1), 1, h >> 1);
    }
    for (k = 0; k < 4; k++) { ctx.fillStyle = P[Math.sin(tq * 7 + k * 2.3) > 0 ? 'signal_amber' : 'rust_hi']; ctx.fillRect(fx + k * 2 + 1, fy + FIRE[3] - 1, 1, 1); }
    K.glow(ctx, fx + 4, fy + 3, 12, 'flame', 0.05 + 0.04 * n + 0.015 * Math.sin(tq * 13));
    // The back door's red panes, breathing.
    K.glow(ctx, ox + PANES[0] + 8, oy + PANES[1] + 10, 14, 'neon_red', 0.03 + 0.05 * n + 0.02 * Math.sin(t * 0.6));
    // The lamps.
    var fl = Math.sin(t * 3.1) * 0.5 + Math.sin(t * 7.3) * 0.3;
    K.glow(ctx, ox + OIL[0], oy + OIL[1], 10, 'flame', 0.06 + 0.06 * n + 0.02 * fl);
    ctx.fillStyle = P[fl > 0.3 ? 'lamp_glow' : 'signal_amber']; ctx.fillRect(ox + OIL[0], oy + OIL[1] - 1, 1, 2);
    K.glow(ctx, ox + RED[0], oy + RED[1], 12, 'neon_red', 0.05 + 0.07 * n);
    // The computer's cursor.
    if (Math.floor(t * 1.6) & 1) { ctx.fillStyle = P.crt_glow; ctx.fillRect(ox + PC[0] + 2 + (Math.floor(t / 4) % 3) * 3, oy + PC[1] + 2, 2, 1); }
    // The record turning while it plays; notes drifting up.
    if (recordT >= 0) {
      var ra = (t - recordT) * 4.5;
      ctx.fillStyle = P.fog_light; ctx.fillRect(Math.round(ox + DISC[0] + Math.cos(ra) * 5), Math.round(oy + DISC[1] + Math.sin(ra) * 2), 1, 1);
      for (i = 0; i < 2; i++) {
        var nu = (t * 0.25 + i * 0.5) % 1;
        if (nu > 0.75) continue;
        var nx = ox + DISC[0] - 2 + i * 6 + Math.round(Math.sin(nu * 9 + i) * 2), ny = oy + DISC[1] - 8 - Math.floor(nu * 24);
        ctx.globalAlpha = Math.min(1, (0.75 - nu) * 3) * 0.8; ctx.fillStyle = P.mustard_lit;
        ctx.fillRect(nx, ny, 2, 2); ctx.fillRect(nx + 1, ny - 4, 1, 4); ctx.fillRect(nx + 2, ny - 4, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
  // The TV's screen (drawn with the TV): the sun as drawn, breathing; the console's game; Pond Cam.
  function screen(ctx, x, y) {
    var w = SCREEN[2], h = SCREEN[3];
    if (tvMode === 2) pondCam(ctx, x, y, w, h);
    else if (tvMode === 1) K.console90sScreen(ctx, x, y, w, h, t - tvT);
    else {
      ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 1.3); ctx.fillStyle = P.crt_glow; ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 0.12; ctx.fillStyle = P.ink; ctx.fillRect(x, y + (Math.floor(t * 9) % h), w, 1);   // a slow roll
      ctx.globalAlpha = 1;
      return;
    }
    K.glare(ctx, x, y, w, h);
  }
  // Steam off the mug on the table.
  function steam(ctx, ox, oy) {
    ctx.fillStyle = P.fog_light;
    for (var i = 0; i < 3; i++) { var v = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.45 * (1 - v); ctx.fillRect(ox + MUG[0] + Math.round(Math.sin(v * 6 + i)), oy + MUG[1] - Math.floor(v * 12), 1, 1); }
    ctx.globalAlpha = 1;
  }

  function draw(ctx) {
    drawRoom(ctx);
    var a = restAlpha();
    if (a > 0) { G.core.view.begin(ctx, true); G.ui.menu.dim(ctx, a); }            // Phase 93.1: the rest's fade
  }
  function drawRoom(ctx) {
    var save = G.state.save, ox = OX, oy = OY, i;
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    ctx.drawImage(base, ox, oy);
    alive(ctx, ox, oy);
    // The trophies on their plaques; turned ones face the door.
    for (i = 0; i < mounted.length; i++) {
      var m = mounted[i], im = turned[i] ? m.flipImg : m.img, cx = ox + PLQ[i] + (PLQ_W >> 1), cy = oy + PLQ_Y + 5;
      ctx.drawImage(im, cx - (im.width >> 1), cy - (im.height >> 1));
      if (m.trophy) {                                                              // Phase 85: the trophy's brass tag under its plaque
        var tgx = ox + PLQ[i] + PLQ_W - 8, tgy = oy + PLQ_Y + PLQ_H + 1;
        ctx.fillStyle = P.outline; ctx.fillRect(tgx + 3, tgy - 1, 1, 2); ctx.fillRect(tgx - 1, tgy + 1, 9, 5);
        ctx.fillStyle = P.brass_hi; ctx.fillRect(tgx, tgy + 2, 7, 3); ctx.fillStyle = P.rust; ctx.fillRect(tgx + 1, tgy + 3, 5, 1);
      }
    }
    // Everything that stands, in order of its feet.
    var f = R.walkers(walk, T, ox + GX, oy + GY), fr = R.frames(walk);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    order.push(f[3] - oy, 101, f[1] - oy + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {                              // a small sort, no allocation
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) {
        var p = props[id];
        ctx.drawImage(p.img, ox + p.x, oy + p.y);
        if (p.id === 'tv') screen(ctx, ox + SCREEN[0], oy + SCREEN[1]);
        else if (p.id === 'table') steam(ctx, ox, oy);
      }
      else if (id === 101) R.drawFigure(ctx, 'dog', walk.dog.face, fr[1], f[2], f[3]);
      else R.drawFigure(ctx, 'fisher', walk.face, fr[0], f[0], f[1]);
    }
    // The dark, the grey of a dull day, the lamps' and the screens' glow over it.
    var n = env.night;
    ctx.globalAlpha = 0.12 + 0.68 * n; ctx.drawImage(mask, ox, oy); ctx.globalAlpha = 1;
    if (env.grey > 0.02) { ctx.globalAlpha = 0.06 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(ox + 14, oy + 14, W - 28, RH - 28); ctx.globalAlpha = 1; }
    if (n > 0.2) {
      K.glow(ctx, ox + OIL[0], oy + OIL[1] + 4, 22, 'lamp_glow', 0.05 * n);
      K.glow(ctx, ox + RED[0], oy + RED[1] + 6, 20, 'neon_red', 0.05 * n);
      K.glow(ctx, ox + FIRE[0] + 4, oy + FIRE[1] + 10, 26, 'flame', 0.05 * n);
      K.glow(ctx, ox + SCREEN[0] + 15, oy + SCREEN[1] + 12, 20, 'crt_glow', (tvMode ? 0.06 : 0.035) * n);
      K.glow(ctx, ox + PC[0] + 6, oy + PC[1] + 3, 10, 'crt_glow', 0.05 * n);
    }
    if (env.flash > 0) { ctx.globalAlpha = 0.1 * env.flash; ctx.fillStyle = P.fog_light; ctx.fillRect(0, 0, 640, 360); ctx.globalAlpha = 1; }
    // The words: the cabin, coins and what is on the wall along the bottom; or a message.
    var U = G.ui.panel, ctx0 = ctx;
    uiLay(); ctx = U.begin(ctx0);                                                   // Phase 90: on the UI layer
    if (open) {
      U.frame(ctx, BOX.x, BOX.y - U.TAB, BOX.w, BOX.h + U.TAB, open === 'rest' ? 'REST' : 'CABIN');
      if (open === 'rest') {                                                         // Phase 93.1: a line and the four buttons
        F.drawText(ctx, lines[0] || '', BOX.x + 14, BOX.y + 6, 'bone');
        var rr = restRects(), pn = partNow(save.clock);
        for (i = 0; i < rr.length; i++) {
          var b = rr[i], st = i === restSel ? (G.core.input.held('action') ? 2 : 1) : 0;
          U.button(ctx, PART_ROWS[i], b[0], b[1], b[2], b[3], st);
          if (PARTS[i] === pn) partIcon(ctx, PARTS[i], b[0] + b[2] - 9, b[1] + 2);
        }
        var lx = rr[rr.length - 1][0] + rr[rr.length - 1][2] + 12, ly = rr[0][1] + ((rr[0][3] - U.KEY_H) >> 1);
        if (!U.touch()) { lx += U.hint(ctx, 'A/D', 'choose', lx, ly); U.hint(ctx, 'ESC', 'not now', lx, ly); }
        else U.hint(ctx, 'ESC', 'not now', lx, ly);
        return;
      }
      for (i = 0; i < lines.length && i < 2; i++) F.drawText(ctx, lines[i], BOX.x + 14, BOX.y + 10 + i * (F.LINE_H + 6), 'bone');
      if (headOn()) U.hint(ctx, 'SPACE', 'ok', BOX.x + 14, BOX.y + BOX.h - U.PAD - U.KEY_H);
      return;
    }
    if (!headOn()) return;
    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '  ' + save.coins; }
    U.frame(ctx, HEAD.x, HEAD.y - U.TAB, HEAD.w, HEAD.h, txt.title, txt.coins, 'bone');
    ctx.drawImage(coin, U.asideX(HEAD.x, HEAD.w, txt.coins), HEAD.y - U.TAB + 4);
    var ty0 = HEAD.y + 2;
    F.drawText(ctx, txt.next, U.left(HEAD.x), ty0, 'signal_amber');
    if (txt.stored) F.drawText(ctx, txt.stored, HEAD.x + HEAD.w - U.PAD - F.measure(txt.stored), ty0, 'fog_light');
    var kx = U.left(HEAD.x), ky = HEAD.y + HEAD.h - U.TAB - U.KEY_H - 2;
    kx += U.hint(ctx, 'SPACE', faced ? HINT[faced] || 'look' : 'use', kx, ky);
    U.hint(ctx, 'ESC', 'leave', kx, ky);
  }
  // Phase 85: Pond Cam: the pond seen from under the dock (a teal gradient, weed swaying up from
  // the bottom, a few motes), its stocked fish crossing slowly at their own depths, each drawn
  // from its swimmer at the screen's scale; a red dot blinks in the corner. Read-only: positions
  // come from hashes and the scene's time.
  function pondCam(ctx, x, y, w, h) {
    var p = G.state.save.pond, st = p ? p.stock : [], i, H2 = G.gfx.sprites.hash;
    ctx.fillStyle = P.water_deep; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = P.water_dark; ctx.fillRect(x, y, w, Math.round(h * 0.55));
    ctx.fillStyle = P.water_mid; ctx.fillRect(x, y, w, 2);
    for (i = 0; i < 7; i++) {                                                          // the weed
      var wx = x + 2 + ((i * 37) % (w - 4)), wh = 4 + (H2(i, 5) % Math.max(1, h - 8)), sway = Math.round(Math.sin(t * 0.8 + i) * 1.2);
      ctx.fillStyle = P[i & 1 ? 'moss_dark' : 'moss']; ctx.fillRect(wx, y + h - wh, 1, wh); ctx.fillRect(wx + sway, y + h - wh - 2, 1, 2);
    }
    for (i = 0; i < st.length; i++) {
      var sp = -1;
      for (var q = 0; q < G.data.fish.length; q++) if (G.data.fish[q].id === st[i].id) { sp = q; break; }
      if (sp < 0) continue;
      var dir = (H2(i, 7) & 1) ? 1 : -1, sp_ = 2 + (H2(i, 8) % 4), span = w + 16, u = ((t * sp_ + H2(i, 9) % span) % span), fx = dir > 0 ? x - 8 + u : x + w + 8 - u;
      var fy = y + 3 + (H2(i, 10) % Math.max(1, h - 9)) + Math.round(Math.sin(t * 0.6 + i) * 1);
      var cv = G.gfx.fishgen.swimmer(sp, Math.floor(t * 3 + i) & 1, false, dir < 0), fh = Math.max(2, Math.min(5, Math.round(st[i].len / 12))), fw = Math.round(cv.width * fh / cv.height);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(fx - fw / 2), fy, fw, fh); ctx.restore();
    }
    ctx.globalAlpha = 0.25; ctx.fillStyle = P.fog_light;
    for (i = 0; i < 5; i++) ctx.fillRect(x + ((H2(i, 11) % w + t * 1.5) % w), y + ((H2(i, 12) % h + t * 0.7) % h), 1, 1);
    ctx.globalAlpha = 1;
    if (Math.floor(t * 1.5) & 1) { ctx.fillStyle = P.neon_red; ctx.fillRect(x + 2, y + 2, 2, 2); }
  }


  // Phase 93: the parts of the day as 7×7 marks: dawn a half sun on a line, day a sun, dusk a
  // low sun, night a crescent moon (palette keys; the journal's pages use them too).
  var PART_ICON = {
    dawn: [['ink', 0, 6, 7, 1], ['signal_amber', 2, 3, 3, 3], ['signal_amber', 1, 4, 5, 2], ['lamp_glow', 3, 1, 1, 1], ['lamp_glow', 0, 2, 1, 1], ['lamp_glow', 6, 2, 1, 1]],
    day: [['lamp_glow', 2, 1, 3, 5], ['lamp_glow', 1, 2, 5, 3], ['bone', 3, 0, 1, 1], ['bone', 3, 6, 1, 1], ['bone', 0, 3, 1, 1], ['bone', 6, 3, 1, 1]],
    dusk: [['rust_hi', 2, 2, 3, 4], ['rust_hi', 1, 3, 5, 3], ['ink', 0, 5, 7, 2], ['rust', 1, 6, 5, 1]],
    night: [['bone', 2, 0, 3, 1], ['bone', 1, 1, 2, 5], ['bone', 2, 6, 3, 1], ['bone', 3, 1, 1, 1], ['bone', 3, 5, 1, 1]]
  };
  function partIcon(ctx, p, x, y) { var r = PART_ICON[p]; if (!r) return; for (var i = 0; i < r.length; i++) { ctx.fillStyle = P[r[i][0]]; ctx.fillRect(x + r[i][1], y + r[i][2], r[i][3], r[i][4]); } }
  var WORD = { backdoor: 'OUT', pc: 'LOOK', plaques: 'READ', guitar: 'PLAY', keys: 'PLAY', records: 'PLAY', tv: 'TV', bed: 'REST' }; // Phase 58; anything else LOOK
  var HINT = { backdoor: 'the pond', pc: 'fisher & dog', plaques: 'read', guitar: 'play', keys: 'play', records: 'play', tv: 'channel', bed: 'rest' };

  return {
    native: true,
    enter: enter, exit: exit, update: update, draw: draw, use: use,
    // Phase 93.1: resting, shared with the pier's panel (dock.js)
    PARTS: PARTS, PART_ROWS: PART_ROWS, partStart: partStart, partNow: partNow, canRest: canRest, restUntil: restUntil, restStep: restStep, restAlpha: restAlpha, partIcon: function (c, p, x, y) { partIcon(c, p, x, y); },
    restInfo: function () { return { phase: rest.phase, to: rest.to, last: rest.last, n: rest.n, open: open === 'rest', sel: PARTS[restSel] }; },
    // Phase 58: a panel is open over the room (the touch pad hides), and the touch action
    // button's word for what he faces.
    busy: function () { return open !== ''; },
    rects: function () { uiLay(); return open ? R_BOX : (headOn() ? R_HEAD : R_NONE); }, // 8.4 #38: what the ESC key keeps off
    // Phase 59.2: a touch with the box open. A message: a tap on the box is Space (ok).
    tap: function (gx0, gy0) {
      uiLay();
      var U = G.ui.panel, gx = U.ux(gx0), gy = U.uy(gy0), onBox = gx >= BOX.x && gx < BOX.x + BOX.w && gy >= BOX.y - U.TAB && gy < BOX.y + BOX.h;
      if (!open) return '';
      if (open === 'rest') {                                                         // Phase 93.1: a button rests until its part; ESC's hint closes
        var rr = restRects();
        for (var k = 0; k < rr.length; k++) if (U.inside(rr[k], gx, gy)) { restSel = k; return 'action'; }
        var ex = rr[3][0] + rr[3][2] + 12;
        if (gx >= ex && gx < ex + U.hintW('ESC', 'not now') && gy >= rr[0][1] && gy < rr[0][1] + rr[0][3]) return 'back';
        return 'none';
      }
      return onBox ? 'action' : 'none';
    },
    word: function () { return open !== '' || !walk || !faced ? '' : (WORD[faced] || 'LOOK'); },
    // dbg: what is on the wall now; where he is and what he faces.
    state: function () { return { tvMode: ['sun', 'game', 'pond cam'][tvMode], from: from, plaques: PLQ.length, mounted: mounted.length, turned: turned.filter(Boolean).length, facing: turned.slice(), stored: stored, at: walk ? [walk.c, walk.r, walk.face] : null, faced: faced, open: open, record: recordT >= 0, blocked: WK.blocked().length, cuts: props ? props.length : 0, bakeMs: Math.round(bakeMs) }; },
    // Phase 64 (dbg.roomLife): the live things and their state.
    life: function () { return { room: 'cabin', live: 11, things: ['windows by the hour', 'stove fire', 'red panes', 'oil lamp', 'red lamp', 'tv', 'computer', 'record', 'steam', 'trophies', 'the dark'], tv: ['sun', 'game', 'pond cam'][tvMode] }; },
    walkPath: function (path) { if (!walk) return 'not in the cabin'; var nb = WK.walkPath(walk, path || ''); faced = WK.facing(walk); return { c: walk.c, r: walk.r, face: walk.face, faced: faced, blocked: nb, exit: walk.exit }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  if (G.core.state.sceneName() !== 'cabin') return '';
  var s = G.ui.cabin.state();
  return 'cabin  mounted ' + s.mounted + '/' + s.plaques + '  facing door ' + s.turned + '  icebox ' + s.stored + '  at ' + s.at + '  faces ' + (s.faced || '-');
});
