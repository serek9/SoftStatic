var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop as a room (Phase 36, PLAN_SHOP.md): a little room seen from above at a
// three-quarter angle, floating in black in the middle of the 640×360 view. The fisher walks it
// tile by tile (a tap turns, a hold walks), the dog follows a tile behind, and what he faces is
// what Space talks to. This file is the room; js/ui/room.js has the walk and the people,
// js/ui/room_kit.js the parts, js/ui/shop.js the scene.
// Phase 124 (the user, 2026-11-17: "don't stop until it is practically the same"): the room is
// the user's reference picture itself, sampled to 384×340 and kept as palette keys
// (js/gfx/shop_art.js), with the boy, the dog and Rusty painted out, since the walk draws them.
// The counter, the floor lamp, the drinks fridge and the monstera are cut from it, each with its
// own mask, and drawn in order of their feet with the people, so the fisher passes before and
// behind them. Live over it: Rusty behind his counter, the dark at night in fine warm steps
// with the lamps' pools, the string lights', the lamps' and the tank's glows, dust in the
// lamplight, the steam off his mug, someone on the far shore now and then. The layout is the
// map's (Phase 117): the walk and every talk are as they were.
G.ui = G.ui || {};
G.ui.shopRoom = (function () {
  var A = G.gfx.paint, P = G.gfx.sprites.PALETTE, S = G.gfx.sprites, K = G.ui.roomKit, R = G.ui.room, X = G.gfx.pix, tone = X.tone;
  // The back wall stands two tiles tall over TOP (84): the room fills the view from y 10 to 350.
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, TOP = 84, RH = H + TOP, OX = (640 - W) >> 1, OY = ((360 - RH) >> 1) + TOP;
  var STEP = R.STEP, SW = 16;                                 // SW: the side walls' painted thickness

  // The map: w the back wall and what is built into it (rows 0 and 1), s side or south wall, d the
  // door, m the mat (the way out), r the rug, . the floor.
  var MAP = [
    'wwwwwwwwwwww',
    'swwwwwwwwwws',
    's..........s',
    's...rrr....s',
    's...rrr....s',
    's...rrr....s',
    's.....m....s',
    'ssssssdsssss'
  ];
  // Objects: their tiles (c, r, w, h), whether they block, and what Space does facing them.
  var OBJECTS = [
    { id: 'rack', c: 1, r: 1, w: 2, h: 1, block: true, talk: 'rack' },        // rods, reels and lines
    { id: 'jar', c: 3, r: 1, w: 1, h: 1, block: true, talk: 'jar' },          // the cabinet of tins and the unlabelled jar
    { id: 'case', c: 4, r: 1, w: 1, h: 1, block: true, talk: 'lures' },       // the chalkboard of lures (Phase 43)
    { id: 'fern', c: 5, r: 1, w: 1, h: 1, block: true, talk: '' },
    { id: 'gear', c: 6, r: 1, w: 1, h: 1, block: true, talk: 'gear' },        // the cubby under the lava lamp
    { id: 'guitar', c: 7, r: 1, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'behind', c: 8, r: 1, w: 3, h: 1, block: true, talk: '' },         // Rusty's side of the counter
    { id: 'counter', c: 8, r: 2, w: 3, h: 2, block: true, talk: 'rusty' },
    { id: 'worms', c: 1, r: 2, w: 1, h: 1, block: true, talk: 'worms' },
    { id: 'crickets', c: 1, r: 3, w: 1, h: 1, block: true, talk: 'crickets' },
    { id: 'tank', c: 1, r: 4, w: 1, h: 1, block: true, talk: 'tank' },
    { id: 'freezer', c: 1, r: 5, w: 1, h: 2, block: true, talk: 'cat' },
    { id: 'lamp', c: 3, r: 4, w: 1, h: 1, block: true, talk: '' },
    { id: 'cooler', c: 10, r: 4, w: 1, h: 2, block: true, talk: 'cooler' },   // the drinks fridge
    { id: 'palm', c: 10, r: 6, w: 1, h: 1, block: true, talk: '' }
  ];
  var DOOR = [6, 7], MAT = [6, 6], RUSTY = [9, 1];
  var WK = R.walker(MAP, OBJECTS, MAT);

  function ty(r) { return TOP + r * T; }
  var FY = ty(2);                                             // where the floor starts (148)
  var LAMP = [105, 170], DESK = [268, 148], LAVA = [207, 60], TANK = [45, 232], HANG = [[127, 26], [313, 26]], MUG = [325, 172];
  var WIN2 = [292, 30, 58, 54];                               // the east window's glass, for the figure on the far shore

  // ---- The picture --------------------------------------------------------------------------
  function paintArt(c, x0, y0, w, h, inside) {
    var art = G.gfx.shopArt, rows = art.rows, keys = art.keys, CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
    for (var y = y0; y < y0 + h; y++) {
      var row = rows[y], run = -1, rx = 0;
      for (var x = x0; x <= x0 + w; x++) {
        var k = x < x0 + w && (!inside || inside(x, y)) ? CH.indexOf(row[x]) : -1;
        if (k !== run) { if (run >= 0) { c.fillStyle = P[keys[run]]; c.fillRect(rx - x0, y - y0, x - rx, 1); } run = k; rx = x; }
      }
    }
  }
  // The props cut from it: a rectangle, a mask of what is the thing itself, and the foot it
  // stands on (room px).
  var CUTS = [
    { id: 'counter', x: 246, y: 156, w: 123, h: 63, foot: ty(4), inside: null },
    { id: 'lamp', x: 86, y: 154, w: 39, h: 86, foot: ty(5) - 4, inside: function (x, y) { return (y < 186 && Math.abs(x - 105) < 7 + (y - 154) * 0.38) || (y >= 186 && y < 230 && Math.abs(x - 105) < 4) || (y >= 230 && Math.abs(x - 105) < 13); } },
    { id: 'fridge', x: 317, y: 196, w: 49, h: 68, foot: ty(6) - 10, inside: null },
    { id: 'palm', x: 303, y: 250, w: 64, h: 62, foot: ty(7), inside: function (x, y) { var u = (x - 335) / 32, v = (y - 270) / 20; return u * u + v * v <= 1 || (y >= 280 && x >= 318 && x <= 352); } }
  ];

  var base = null, props = null, bakeMs = 0;
  function bake() {
    if (!base) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      base = G.gfx.bake.cached('shop:art124', function () { return G.gfx.bake.layer(W, RH, function (c) { paintArt(c, 0, 0, W, RH, null); }); });
      props = [];
      for (var i = 0; i < CUTS.length; i++) (function (q) {
        props.push({ img: G.gfx.bake.cached('shop:cut124:' + q.id, function () { return G.gfx.bake.layer(q.w, q.h, function (c) { paintArt(c, q.x, q.y, q.w, q.h, q.inside); }); }), x: q.x, y: q.y, foot: q.foot });
      })(CUTS[i]);
      if (t0) bakeMs = performance.now() - t0;
    }
    return base;
  }

  // What the shelves hold (Phase 38): the picture shows the rack, the tank and the crate as they
  // are; the counts are kept for dbg.
  var shown = { rods: 0, minnows: 0, crickets: 0 };
  function count(stock) {
    var n = 0, rods = G.data.gear.rods;
    for (var i = 1; i < rods.length; i++) if (!((stock.rods && stock.rods.indexOf(i) >= 0) || rods[i].ice)) n++;
    shown.rods = n; shown.minnows = stock.minnows; shown.crickets = stock.crickets;
  }

  // ---- Light, life and the strange ----------------------------------------------------------
  var mask = null;
  function softMask(w, h, pools) {
    return G.gfx.bake.layer(w, h, function (c) {
      c.fillStyle = P.cedar_deep;                                                                // a warm dark, never a cold one
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
  function drawLight(ctx, env, t, rusty, ox, oy) {
    var i, n = env.night;
    if (!mask) mask = softMask(W, RH, [{ x: LAMP[0], y: LAMP[1] + 40, r: 150, sx: 1.4 }, { x: DESK[0], y: DESK[1] + 10, r: 80 }, { x: W >> 1, y: 30, r: 50, sx: 3.6 },
      { x: 341, y: 230, r: 50 }, { x: TANK[0], y: TANK[1], r: 44 }, { x: W >> 1, y: 240, r: 90, sx: 1.6 }]);
    ctx.globalAlpha = 0.12 + 0.5 * n; ctx.drawImage(mask, ox, oy); ctx.globalAlpha = 1;
    if (env.grey > 0.02) { ctx.globalAlpha = 0.06 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(ox + 16, oy + 16, W - 32, RH - 48); ctx.globalAlpha = 1; }
    var bulbs = G.gfx.shopArt.bulbs, WB = ['lamp_glow', 'mustard_lit', 'signal_amber'];
    for (i = 0; i < bulbs.length; i++) {
      var b = bulbs[i], o = 0.7 + 0.3 * Math.sin(t * 0.6 + i * 1.7);
      ctx.fillStyle = P[WB[i % 3]]; ctx.globalAlpha = (0.05 + 0.14 * n) * o;
      ctx.fillRect(ox + b[0] - 4, oy + b[1] - 3, 9, 7); ctx.fillRect(ox + b[0] - 2, oy + b[1] - 5, 5, 11);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < HANG.length; i++) K.glow(ctx, ox + HANG[i][0], oy + HANG[i][1] + 10, 14, 'lamp_glow', 0.03 + 0.06 * n);
    K.glow(ctx, ox + LAMP[0], oy + LAMP[1], 26, 'lamp_glow', 0.04 + 0.08 * n);
    K.glow(ctx, ox + LAMP[0], oy + LAMP[1] + 62, 46, 'signal_amber', 0.02 + 0.05 * n);
    K.glow(ctx, ox + DESK[0], oy + DESK[1], 20, 'lamp_glow', 0.03 + 0.06 * n);
    K.glow(ctx, ox + LAVA[0], oy + LAVA[1], 12, 'orange_lit', 0.03 + 0.05 * n + 0.01 * Math.sin(t * 0.8));
    K.glow(ctx, ox + TANK[0], oy + TANK[1], 22, 'crt_glow', 0.02 + 0.04 * n);
    if (n > 0.3) {                                                                                 // dust in the lamplight
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.4 * n;
      for (i = 0; i < 11; i++) { var a = t * (0.05 + i * 0.011) + i * 2.1, r = 10 + (i * 7) % 34; ctx.fillRect(Math.round(ox + LAMP[0] + 20 + Math.cos(a) * r * 1.1), Math.round(oy + LAMP[1] + 20 + Math.sin(a * 1.3) * r * 0.8), 1, 1); }
      ctx.globalAlpha = 1;
    }
    if (!rusty || rusty.fr !== 2) {                                                                // steam off his mug
      ctx.fillStyle = P.fog_light;
      for (i = 0; i < 3; i++) { var v = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.45 * (1 - v); ctx.fillRect(ox + MUG[0] + Math.round(Math.sin(v * 6 + i)), oy + MUG[1] - 2 - Math.floor(v * 12), 1, 1); }
      ctx.globalAlpha = 1;
    }
  }
  function drawStrange(ctx, env, ox, oy) {
    if (env.strange !== 'figure') return;                                                          // someone on the far shore (Phase 39)
    var a = Math.min(1, Math.min(env.st, 1 - env.st) * 4);
    if (a <= 0) return;
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = P.fog_mid;
    var fx = ox + WIN2[0] + 38, fy = oy + WIN2[1] + 32;
    ctx.fillRect(fx, fy, 2, 2); ctx.fillRect(fx - 1, fy + 2, 4, 6); ctx.globalAlpha = 1;
  }

  // Draws the room, Rusty behind his counter, the props, the dog and the fisher in order of
  // their feet. rusty: {face, fr} (Phase 37); stock: what the shelves hold (38); env: the hour,
  // the light and the strange (39).
  var order = [];
  function draw(ctx, st, t, hour, rusty, stock, env) {
    var ox = OX, oy = OY - TOP, i;
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    ctx.drawImage(bake(), ox, oy);
    if (stock) count(stock);
    if (env) drawStrange(ctx, env, ox, oy);
    var f = R.walkers(st, T, ox, oy + TOP), fr = R.frames(st);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    if (rusty) order.push(FY, 100);
    order.push(f[3] - oy, 101, f[1] - oy + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {                              // a small sort, no allocation
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) ctx.drawImage(props[id].img, ox + props[id].x, oy + props[id].y);
      else if (id === 100) { var rs = R.sprite('rusty', rusty.face, rusty.fr); ctx.drawImage(rs, ox + 305 - (rs.width >> 1), oy + 122); }
      else if (id === 101) R.drawFigure(ctx, 'dog', st.dog.face, fr[1], f[2], f[3]);
      else R.drawFigure(ctx, 'fisher', st.face, fr[0], f[0], f[1]);
    }
    if (env) drawLight(ctx, env, t, rusty, ox, oy);
  }

  function sprite(kind, dir, fr, lk) { return R.sprite(kind, dir, fr, lk); }

  return { T: T, COLS: COLS, ROWS: ROWS, OX: OX, OY: OY, TOP: TOP, STEP: STEP, MAP: MAP, OBJECTS: OBJECTS, DOOR: DOOR, MAT: MAT, RUSTY: RUSTY,
    create: WK.create, step: WK.step, facing: WK.facing, isBlocked: WK.isBlocked, draw: draw, bake: bake, sprite: sprite, prebake: R.prebake,
    bakeMs: function () { return bakeMs; }, blocked: WK.blocked, shown: function () { return shown; },
    // Phase 64 (dbg.roomLife): the live things in the room.
    life: function () { return { room: 'shop', live: 3, things: ['rusty', 'the lamps’ and lights’ glow', 'steam off his mug', 'dust in the lamplight', 'the far shore'] }; } };
})();
