var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop (9.4, V9, V10.7), drawn at 640×360, a scene reached from the map. Since
// Phase 36 (PLAN_SHOP.md) it is a small room you walk into (js/ui/shop_room.js), as a
// building is in a retro Pokémon game: the fisher walks it tile by tile, the dog follows, and
// what he faces is what Space talks to. Phase 37: Rusty, behind his counter, talks in a text
// box along the bottom (one line per visit, data/dialogue.js), then offers Buy, Talk or
// Leave; Buy opens the item window: the shelf as a list, the chosen item's name, effect and
// price in the box, Space to buy (or to put a bait on the hook). Time passes here and unease
// drains (V10.1). Esc or M goes back out, or the door.
G.ui = G.ui || {};
G.ui.shop = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, M = G.ui.menu, E = G.sim.economy, A = G.gfx.paint;
  var px = A.px, box = A.box, blob = A.blob, limb = A.limb, tone = A.tone, line = A.line, slab = A.slab;

  // Shelves (the panel's tabs). kind: a gear kind for economy.buy, or 'bait' with an id.
  // Phase 43: the rack holds every rod (kind 'rod' with its index: buy it, or take one you own
  // in hand), and a case holds the lures (sold like the baits).
  var SHELVES = [
    [{ kind: 'rod', id: 0, icon: 'rod' }, { kind: 'rod', id: 5, icon: 'rod' }, { kind: 'rod', id: 1, icon: 'rod' }, { kind: 'rod', id: 2, icon: 'rod' },
     { kind: 'rod', id: 3, icon: 'rod' }, { kind: 'rod', id: 4, icon: 'rod' }, { kind: 'reel', icon: 'reel' }, { kind: 'line', icon: 'line' }],
    [{ kind: 'lantern', icon: 'lantern' }, { kind: 'depthFinder', icon: 'finder' }],
    [{ kind: 'bait', id: 'worm', icon: 'worm' }, { kind: 'bait', id: 'cricket', icon: 'cricket' },
     { kind: 'bait', id: 'minnow', icon: 'minnow' }, { kind: 'bait', id: 'unlabelled', icon: 'jar' }],
    [{ kind: 'bait', id: 'spinner', icon: 'spinner' }, { kind: 'bait', id: 'plug', icon: 'plug' }, { kind: 'bait', id: 'grub', icon: 'grub' },
     { kind: 'bait', id: 'popper', icon: 'popper' }, { kind: 'bait', id: 'jig', icon: 'jig' }]
  ];
  var SWIM_SAYS = { mid: 'Spins in mid water as you reel.', dive: 'Floats, and dives when reeled.', bed: 'Sinks to the bottom and hops.',
    top: 'Stays on top. Tap to make it pop.', lift: 'Sinks fast; jig it up and down.' };
  var TYPE = 48; // characters of speech typed a second

  // Ramps, dark to light.
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];
  var CANVAS = ['reed', 'reed_hi', 'paper_dark', 'paper', 'bone'];
  var STONE = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var ENAMEL = ['moss_dark', 'moss', 'moss_hi', 'moss_lit'];
  var CUP = ['paper_dark', 'paper', 'bone', 'cream'];
  var RUST = ['rust_dark', 'rust', 'rust_hi', 'flame'];
  var GLOW = ['signal_amber', 'lamp_glow', 'cream'];
  var LINE = ['water_mid', 'water_hi', 'water_foam', 'fog_light'];
  var WORM = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'];
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'];

  // ---- Item icons ---------------------------------------------------------------------------
  // Each is painted for a 32×32 cell scaled by s (1 on the tiles and tabs, 2 in the detail
  // box), so both sizes are painted at their own resolution. Lit from the top left.
  var ICONS = {
    rod: function (c, s) {
      limb(c, 7 * s, 26 * s, 28 * s, 4 * s, 0.7 * s, WOOD, 0.1);
      limb(c, 3 * s, 30 * s, 9 * s, 24 * s, 1.9 * s, CANVAS, 0.1);                 // the cork grip
      box(c, 'stone_hi', 10 * s, 22 * s, 2 * s, 2 * s);                             // reel seat
      blob(c, 13 * s, 25.5 * s, 2.4 * s, 2.4 * s, STONE);
      line(c, 'ink', 13 * s, 25 * s, 16 * s, 26 * s);
      for (var g = 0; g < 3; g++) px(c, 'stone_lit', ((12 + g * 5) * s) | 0, ((20 - g * 4.3) * s) | 0);
      line(c, 'fog_light', 28 * s, 4 * s, 29 * s, 5 * s); line(c, 'fog_light', 29 * s, 5 * s, 29 * s, 19 * s);
      line(c, 'stone_lit', 29 * s, 19 * s, 29 * s, 23 * s); line(c, 'stone_lit', 29 * s, 23 * s, 27 * s, 23 * s); line(c, 'stone_lit', 27 * s, 23 * s, 26 * s, 21 * s);
    },
    reel: function (c, s) {
      box(c, 'stone', 8 * s, 3 * s, 11 * s, 2 * s); box(c, 'stone_lit', 8 * s, 3 * s, 11 * s, 1);
      limb(c, 13 * s, 5 * s, 13 * s, 9 * s, 1.3 * s, STONE);
      blob(c, 13 * s, 17 * s, 9 * s, 8.5 * s, STONE, { rim: 0.3 });
      blob(c, 13 * s, 17 * s, 6.5 * s, 6 * s, LINE, { rim: 0.2 });
      for (var r = 0; r < 4; r++) line(c, 'water_hi', 8 * s, (13 + r * 2.5) * s, 18 * s, (13 + r * 2.5) * s);
      blob(c, 13 * s, 17 * s, 2.4 * s, 2.4 * s, STONE, { bias: 0.1 });
      limb(c, 15 * s, 17 * s, 26 * s, 17 * s, 0.9 * s, STONE, 0.1);
      blob(c, 27 * s, 17 * s, 2.6 * s, 2.6 * s, WOOD, { bias: 0.15 });
    },
    line: function (c, s) {
      blob(c, 16 * s, 25 * s, 12 * s, 3.5 * s, WOOD);
      for (var y = 7 * s; y < 25 * s; y++) for (var x = 7 * s; x < 25 * s; x++) {
        var v = 0.75 - (x - 7 * s) / (18 * s) * 0.6 + (((y / s) | 0) % 2 ? 0.08 : -0.08);
        px(c, tone(LINE, v, x, y), x, y);
      }
      A.box(c, 'paper', 9 * s, 13 * s, 14 * s, 6 * s); box(c, 'cream', 9 * s, 13 * s, 14 * s, 1); box(c, 'paper_dark', 9 * s, 19 * s - 1, 14 * s, 1);
      box(c, 'crimson', 10 * s, 14 * s + 1, 4 * s, 3 * s); box(c, 'wood_dark', 15 * s, 15 * s, 7 * s, 1); box(c, 'wood_dark', 15 * s, 17 * s, 5 * s, 1);
      blob(c, 16 * s, 7 * s, 12 * s, 3.5 * s, WOOD, { bias: 0.15 });
      blob(c, 16 * s, 7 * s, 3 * s, 1.2 * s, STONE);
    },
    lantern: function (c, s) {
      for (var a = 0; a <= 12; a++) { var t = a / 12 * Math.PI; px(c, 'rust_dark', (16 * s + Math.cos(t) * 6 * s) | 0, (5 * s - Math.sin(t) * 4 * s) | 0); }
      blob(c, 16 * s, 7 * s, 6 * s, 2.6 * s, RUST, { bias: 0.1 });
      blob(c, 16 * s, 16 * s, 6.5 * s, 7.5 * s, GLOW, { bias: 0.15, rim: 0.5 });
      blob(c, 15 * s, 15 * s, 2 * s, 3.5 * s, ['lamp_glow', 'cream'], { bias: 0.4 });
      for (var g = -1; g <= 1; g++) line(c, 'rust_dark', (16 + g * 5) * s, 9 * s, (16 + g * 5) * s, 23 * s);
      box(c, 'flame', 15 * s, 17 * s, 2 * s, 3 * s);
      blob(c, 16 * s, 25 * s, 9 * s, 3.8 * s, RUST);
      box(c, 'rust_dark', 8 * s, 28 * s, 16 * s, 1 * s);
    },
    finder: function (c, s) {
      slab(c, 3 * s, 5 * s, 26 * s, 20 * s, STONE);
      box(c, 'ink', 6 * s, 8 * s, 20 * s, 12 * s);
      for (var x = 6 * s; x < 26 * s; x++) {
        var by = (8 + 9 + Math.sin(x / s * 0.45) * 1.6) * s | 0;
        px(c, 'neon_teal', x, by); if (s > 1) px(c, 'teal_hi', x, by + 1);
        if ((x / s | 0) % 4 === 0) px(c, 'teal_dark', x, 8 * s + 2);
      }
      box(c, 'signal_amber', 11 * s, 12 * s, 2 * s, 1 * s); box(c, 'signal_amber', 19 * s, 14 * s, 2 * s, 1 * s);
      box(c, 'teal', 6 * s, 8 * s, 20 * s, 1);
      for (var b = 0; b < 3; b++) blob(c, (9 + b * 5) * s, 22 * s, 1.3 * s, 1.3 * s, b === 0 ? RUST : STONE, { bias: 0.2 });
      box(c, 'stone_dark', 13 * s, 25 * s, 6 * s, 2 * s); slab(c, 9 * s, 27 * s, 14 * s, 3 * s, STONE);
    },
    worm: function (c, s) {
      for (var y = 13 * s; y < 29 * s; y++) {
        var hw = (11 - (y / s - 13) * 0.22) * s;
        for (var x = -hw; x <= hw; x++) px(c, tone(CUP, 0.85 - (x / hw + 1) * 0.4 + (y / s > 27 ? -0.3 : 0), 16 * s + x, y), (16 * s + x) | 0, y);
      }
      box(c, 'crimson', 8 * s, 19 * s, 16 * s, 3 * s); box(c, 'rust_hi', 8 * s, 19 * s, 16 * s, 1);
      blob(c, 16 * s, 13 * s, 11 * s, 2.6 * s, ['wood_deep', 'wood_dark', 'wood'], { bias: -0.1 });
      limb(c, 9 * s, 12 * s, 12 * s, 6 * s, 1.2 * s, WORM, 0.1); limb(c, 12 * s, 6 * s, 15 * s, 9 * s, 1.2 * s, WORM, 0.1);
      limb(c, 19 * s, 13 * s, 21 * s, 5 * s, 1.2 * s, WORM, 0.1); limb(c, 21 * s, 5 * s, 24 * s, 7 * s, 1.2 * s, WORM, 0.1);
    },
    cricket: function (c, s) {
      box(c, 'ink', 6 * s, 9 * s, 20 * s, 16 * s);
      blob(c, 15 * s, 18 * s, 5 * s, 2.6 * s, ENAMEL, { bias: 0.1 }); blob(c, 20 * s, 17 * s, 2 * s, 2 * s, ENAMEL);
      line(c, 'moss_hi', 11 * s, 18 * s, 8 * s, 22 * s); line(c, 'moss_hi', 14 * s, 19 * s, 12 * s, 23 * s); line(c, 'moss_hi', 21 * s, 16 * s, 25 * s, 12 * s);
      for (var y = 9 * s; y < 25 * s; y++) for (var x = 6 * s; x < 26 * s; x++) if ((x + y) % (2 * s) === 0 || (x - y + 64) % (2 * s) === 0) px(c, (x + y) % (4 * s) ? 'stone' : 'stone_hi', x, y);
      slab(c, 4 * s, 7 * s, 24 * s, 3 * s, WOOD); slab(c, 4 * s, 24 * s, 24 * s, 3 * s, WOOD);
    },
    minnow: function (c, s) {
      for (var a = 0; a <= 16; a++) { var t = a / 16 * Math.PI; px(c, 'stone_hi', (16 * s + Math.cos(t) * 11 * s) | 0, (10 * s - Math.sin(t) * 7 * s) | 0); }
      for (var y = 10 * s; y < 28 * s; y++) {
        var hw = (12 - (y / s - 10) * 0.18) * s;
        for (var x = -hw; x <= hw; x++) px(c, tone(STONE, 0.9 - (x / hw + 1) * 0.42 + ((((y / s) | 0) === 15 || ((y / s) | 0) === 23) ? -0.2 : 0), 16 * s + x, y), (16 * s + x) | 0, y);
      }
      blob(c, 16 * s, 10 * s, 12 * s, 2.6 * s, LINE, { bias: 0.1, rim: 0 });
      blob(c, 13 * s, 10 * s, 3.5 * s, 1.2 * s, ['stone_hi', 'fog_light', 'cream'], { bias: 0.2 }); px(c, 'ink', (11 * s) | 0, (10 * s) | 0);
      line(c, 'fog_light', 16 * s, 10 * s, 18 * s, 9 * s); line(c, 'fog_light', 16 * s, 10 * s, 18 * s, 11 * s);
    },
    // Phase 43: the lures in the case.
    spinner: function (c, s) {
      line(c, 'stone_hi', 6 * s, 16 * s, 26 * s, 16 * s);
      blob(c, 9 * s, 16 * s, 4.5 * s, 2.6 * s, BRASS, { bias: 0.15 });                // the blade
      blob(c, 17 * s, 16 * s, 3 * s, 1.6 * s, RUST, { bias: 0.1 });
      box(c, 'ink', 23 * s, 13 * s, 1 * s, 6 * s); line(c, 'ink', 23 * s, 13 * s, 26 * s, 11 * s); line(c, 'ink', 23 * s, 19 * s, 26 * s, 21 * s);
    },
    plug: function (c, s) {
      blob(c, 15 * s, 16 * s, 9 * s, 4 * s, ['rust_dark', 'rust_hi', 'leaf_gold', 'cream'], { bias: 0.2 });
      px(c, 'ink', (21 * s) | 0, (15 * s) | 0);
      limb(c, 24 * s, 18 * s, 29 * s, 22 * s, 1.2 * s, ['stone', 'stone_hi', 'stone_lit'], 0.1); // the lip
      line(c, 'ink', 9 * s, 21 * s, 9 * s, 25 * s); line(c, 'ink', 18 * s, 21 * s, 18 * s, 25 * s);
    },
    grub: function (c, s) {
      box(c, 'stone_dark', 22 * s, 13 * s, 5 * s, 5 * s); box(c, 'stone_hi', 23 * s, 13 * s, 2 * s, 1 * s);
      limb(c, 21 * s, 15 * s, 11 * s, 16 * s, 2.4 * s, ['moss_dark', 'moss', 'moss_hi', 'moss_lit'], 0.1);
      limb(c, 11 * s, 16 * s, 6 * s, 21 * s, 1.6 * s, ['moss', 'moss_hi', 'moss_lit'], 0.1); limb(c, 6 * s, 21 * s, 9 * s, 25 * s, 1.2 * s, ['moss', 'moss_hi'], 0.1);
    },
    popper: function (c, s) {
      blob(c, 15 * s, 16 * s, 8 * s, 4.5 * s, ['rust', 'signal_amber', 'cream'], { bias: 0.15 });
      box(c, 'ink', 22 * s, 12 * s, 2 * s, 8 * s); px(c, 'ink', (19 * s) | 0, (14 * s) | 0);
      line(c, 'ink', 6 * s, 16 * s, 3 * s, 20 * s);
    },
    jig: function (c, s) {
      blob(c, 23 * s, 15 * s, 3.5 * s, 3.5 * s, STONE, { bias: 0.2 });
      for (var k = 0; k < 6; k++) limb(c, 20 * s, 15 * s, 6 * s, (9 + k * 2.6) * s, 0.8 * s, k & 1 ? RUST : ['rust_dark', 'flame', 'brass_hi'], 0.1);
    },
    jar: function (c, s) {
      for (var y = 9 * s; y < 29 * s; y++) for (var x = 6 * s; x < 26 * s; x++) {
        var nx = (x - 16 * s) / (10 * s), edge = Math.abs(nx) > 0.86 || y > 28 * s - 2;
        if ((y < 10 * s || y > 28 * s - 1) && Math.abs(nx) > 0.8) continue;
        px(c, edge ? 'fog_mid' : tone(['blood', 'crimson'], 0.55 - nx * 0.4 - (y - 9 * s) / (40 * s), x, y), x, y);
      }
      box(c, 'fog_light', 9 * s, 12 * s, 1 * s, 13 * s); box(c, 'cream', 9 * s, 13 * s, 1, 4 * s);
      slab(c, 7 * s, 4 * s, 18 * s, 5 * s, STONE);
      for (var r = 0; r < 3; r++) box(c, 'stone_dark', 8 * s, (5.5 + r * 1.3) * s, 16 * s, 1);
      blob(c, 19 * s, 18 * s, 1.8 * s, 1.6 * s, ['paper_dark', 'bone', 'cream'], { bias: 0.2 }); px(c, 'ink', (19 * s) | 0, (18 * s) | 0);
    }
  };
  var iconCache = {}, coin = null;
  // The coin beside the balance: brass, a lit edge, a stamped centre (8×8).
  function paintCoin(c) { A.reset(); blob(c, 4, 4, 3.6, 3.6, BRASS, { bias: 0.1, rim: 0 }); box(c, 'rust', 3, 3, 2, 2); px(c, 'brass_hi', 2, 2); }
  function icon(name, s) {
    var key = name + s;
    if (!iconCache[key]) iconCache[key] = G.gfx.bake.layer(32 * s, 32 * s, function (c) { A.reset(); ICONS[name](c, s); });
    return iconCache[key];
  }

  // ---- Dialogue (pure: no DOM) ------------------------------------------------------------

  // One line for this visit. Counts the visit and marks a special line as said. Returns a
  // line from D.special, or {id: '', kind: 'small', text} for small talk.
  function pickLine(save, D, hour) {
    var f = save.flags, v = ++f.shopVisits, last = 0, id, i;
    for (id in f.lines) if (f.lines[id] > last) last = f.lines[id];
    if (v - last >= D.gap) {
      for (i = 0; i < D.special.length; i++) {
        var s = D.special[i];
        if (f.lines[s.id] || v < s.after || (s.night && G.sim.clock.isGrey(hour))) continue;
        f.lines[s.id] = v; // the visit it was said on
        return s;
      }
    }
    return { id: '', kind: 'small', text: D.small[(v * 4) % D.small.length] };
  }

  // What the keeper actually says: reversed lines run backwards, repeated lines twice.
  function spoken(line) {
    if (line.kind === 'reverse') return [line.text.split('').reverse().join('')];
    if (line.kind === 'repeat') return [line.text, line.text];
    return [line.text];
  }

  // ---- Scene ----------------------------------------------------------------------------
  var row = 0, col = 0, t = 0, line_ = null;
  var R = G.ui.shopRoom, walk = null, faced = '';
  var txt = { name: [], price: '', desc: [], status: [], msg: [], msgKey: 'fog_light', coins: '' }, lastCoins = -1;
  var uneaseIn = { loc: 'fog', still: true, atShop: true };
  // Phase 37: what is open over the room: '' (walking), 'box' (Rusty talking), 'choice'
  // (Buy, Talk, Leave) or 'items' (the item window); the list it shows and the choice.
  var open = '', pages = [], page = 0, typed = 0, crimson = false, choice = 0, list = [], sel = 0, from = '';
  var CHOICES = ['BUY', 'TALK', 'LEAVE'];
  var BOX = { x: 24, y: 290, w: 592, h: 62 }, CH = { x: 488, y: 196, w: 128, h: 88 };
  // Phase 46: the item window's two panels at the top right (the list, the chosen item), and
  // the list's title for each shelf.
  var LIST = { x: 392, y: 8, w: 240, h: 140, rowH: 16, rows: 6 }, ITEM = { x: 392, y: 154, w: 240, h: 98 };
  var TITLES = { rusty: 'BUY', rack: 'THE RACK', gear: 'GEAR', worms: 'WORMS', crickets: 'CRICKETS', tank: 'THE TANK', jar: 'THE JAR', lures: 'LURES' };
  var rusty = { face: 'down', fr: 3 };
  // Phase 38: the shelves he can face, and their items ([shelf, item] in SHELVES); what they
  // show: the gear he has, and the minnows and crickets left after what he bought this visit
  // (the shop's stock is endless in the sim; the tank and the crate are full again next visit).
  var SHELF_ITEMS = { rack: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7]], gear: [[1, 0], [1, 1]], worms: [[2, 0]], crickets: [[2, 1]], tank: [[2, 2]], jar: [[2, 3]],
    lures: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]] };
  var ALL = []; (function () { for (var r = 0; r < SHELVES.length; r++) for (var c = 0; c < SHELVES[r].length; c++) ALL.push([r, c]); })();
  var stock = { rod: 0, lantern: false, finder: false, minnows: 7, crickets: 6 }, packs = { minnow: 0, cricket: 0 };
  // Phase 39: the hour and the light for the room (the lake's: Fogbound's drizzle and fog),
  // and the strange: at Fogbound's unease 0.4 or more, now and then and one at a time, the
  // clock running back for 3 s or a figure on the far shore in the window for 6 s; at 0.6 or
  // more, half the time, Rusty facing the wall when you come in, until you speak to him.
  // Quiet, short, never in the way (§0.14). G.vrng: presentation only.
  var env = { hour: 0, night: 0, grey: 0, rain: 0, fog: 0, strange: '', st: 0 };
  var odd = { kind: '', t: 0, len: 0, cool: 20, wall: false, seen: { clock: 0, figure: 0, wall: 0 } };
  var ODD_LEN = { clock: 3, figure: 6 };
  function shopUnease() { return G.sim.unease.get(G.state.save, 'fog'); }
  function envStep(dt) {
    var save = G.state.save, sc = G.scene.sailing, L = sc.light(G.sim.clock.wrap(save.clock));
    env.hour = save.clock; env.night = L.night; env.grey = L.grey;
    env.rain = sc.rain(); env.fog = sc.fogAlpha();
    var u = shopUnease();
    if (odd.kind) {
      odd.t += dt;
      if (odd.t >= odd.len) { odd.kind = ''; odd.cool = 40 + 40 * G.vrng.next(); }
    } else if (u >= 0.4) {
      odd.cool -= dt;
      if (odd.cool <= 0) { odd.kind = G.vrng.next() < 0.5 ? 'clock' : 'figure'; odd.t = 0; odd.len = ODD_LEN[odd.kind]; odd.seen[odd.kind]++; }
    }
    env.strange = odd.kind; env.st = odd.kind ? odd.t / odd.len : 0;
  }

  function stockStep() {
    var g = G.state.save.gear;
    stock.rods = g.rods; stock.lantern = !!g.lantern; stock.finder = !!g.depthFinder;
    stock.minnows = Math.max(1, 7 - 2 * packs.minnow); stock.crickets = Math.max(1, 6 - 2 * packs.cricket);
  }

  function item() { return SHELVES[row][col]; }

  function pct(r) { return Math.round((r - 1) * 100); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var ACTION = ['slow', 'moderate', 'moderate fast', 'fast', 'extra fast'];

  // Fills txt for the selected item: what it is, what it costs, what it does, and its state.
  function describe() {
    var it = item(), save = G.state.save, g = G.data.gear, desc = '', next, cur, name = '', status = '';
    txt.price = '';
    if (it.kind === 'rod') { // Phase 43: one rod of the rack
      var rd = g.rods[it.id], inHand = g.rods[save.gear.rod], own = E.ownsRod(save, it.id);
      name = rd.name;
      desc = cap(rd.power) + ', ' + ACTION[rd.action] + ' action. Holds fish up to ' + rd.maxMass + ' kg' +
        (rd.smallBoost > 1 ? '; small fish come to it.' : (rd.smallHook < 0.9 ? '; small mouths tear free of it.' : '.'));
      if (!own) txt.price = rd.cost + 'c';
      status = save.gear.rod === it.id ? 'In your hands.' : (own ? 'Yours. Space to take it.' : 'In hand: ' + inHand.name + '.');
    } else if (it.kind === 'reel' || it.kind === 'line') {
      var tiers = g[E.TIERED[it.kind]];
      cur = tiers[save.gear[it.kind]]; next = E.nextItem(save, it.kind, G.data);
      if (!next) { name = cur.name; status = 'In use. Nothing finer on the shelf.'; }
      else {
        name = next.name; txt.price = next.cost + 'c';
        if (it.kind === 'rod') desc = 'Casts ' + pct(next.castMax / cur.castMax) + '% farther and holds fish up to ' + next.maxMass + ' kg (yours: ' + cur.maxMass + ' kg).';
        if (it.kind === 'reel') desc = 'Reels a tired fish in ' + pct(next.speed / cur.speed) + '% faster.';
        if (it.kind === 'line') desc = 'Tension builds ' + Math.round((1 - cur.strength / next.strength) * 100) + '% slower while a fish pulls.';
        status = 'In use: ' + cur.name + '.';
      }
    } else if (it.kind === 'lantern' || it.kind === 'depthFinder') {
      cur = g[it.kind]; name = cur.name;
      desc = it.kind === 'lantern' ? 'Deep fish show in colour at night, not just as shapes.' : 'Marks the depth every ' + cur.bands + ' m while the lure is down.';
      if (save.gear[it.kind]) status = 'Yours already.'; else txt.price = cur.cost + 'c';
    } else {
      var b = E.baitById(it.id, G.data), have = save.baits[b.id] || 0, on = E.baitInUse(save, G.data).id === b.id;
      name = b.label === false ? '(no label)' : b.name;
      if (b.unlimited) desc = 'Free, and they never run out. Most fish take them.';
      else if (b.swim) { // Phase 43: a lure
        txt.price = b.pack + ' for ' + b.pack * b.cost + 'c';
        desc = SWIM_SAYS[b.swim] + ' Not every fish wants it. Lost if the line snaps.';
      } else {
        txt.price = b.pack + ' for ' + b.pack * b.cost + 'c';
        if (b.label === false) desc = 'No label. The jar is warm.';
        else desc = 'Fish turn up ' + pct(b.attract) + '% sooner' + (b.rareBoost > 1 ? ', and rare ones are ' + pct(b.rareBoost) + '% likelier.' : '.');
      }
      status = (b.unlimited ? '' : 'You have ' + have + '. ') + (on ? 'On the hook.' : '');
    }
    txt.name = F.wrap(name, ITEM.w - 90);
    txt.desc = F.wrap(desc, ITEM.w - 2 * G.ui.panel.PAD);
    txt.status = F.wrap(status, ITEM.w - 2 * G.ui.panel.PAD);
  }

  // One row of the item window: the item's name, its price (or its state) and a mark.
  var lab = { name: '', price: '', mark: '' };
  function label(it) {
    var save = G.state.save, g = G.data.gear;
    lab.mark = '';
    if (it.kind === 'rod') {
      var rd = g.rods[it.id], own = E.ownsRod(save, it.id);
      lab.name = rd.name; lab.price = own ? 'OWNED' : rd.cost + 'c';
      if (save.gear.rod === it.id) lab.mark = 'ON';
    } else if (it.kind === 'reel' || it.kind === 'line') {
      var next = E.nextItem(save, it.kind, G.data);
      if (next) { lab.name = next.name; lab.price = next.cost + 'c'; }
      else { lab.name = g[E.TIERED[it.kind]][save.gear[it.kind]].name; lab.price = 'BEST'; }
    } else if (it.kind === 'lantern' || it.kind === 'depthFinder') {
      lab.name = g[it.kind].name; lab.price = save.gear[it.kind] ? 'OWNED' : g[it.kind].cost + 'c';
    } else {
      var b = E.baitById(it.id, G.data);
      lab.name = b.label === false ? '(no label)' : b.name;
      lab.price = b.unlimited ? 'FREE' : b.pack * b.cost + 'c';
      if (!b.unlimited && save.baits[b.id] > 0) lab.mark = 'x' + save.baits[b.id];
      if (E.baitInUse(save, G.data).id === b.id) lab.mark = 'ON';
    }
    return lab;
  }

  function say(s, key) { txt.msg = s ? F.wrap(s, ITEM.w - 2 * G.ui.panel.PAD) : []; txt.msgKey = key || 'fog_light'; }

  function act() {
    var it = item(), save = G.state.save, r;
    if (it.kind === 'bait') {
      var b = E.baitById(it.id, G.data);
      if (b.unlimited || (save.gear.bait !== b.id && save.baits[b.id] > 0)) { save.gear.bait = b.id; describe(); say('On the hook next cast.'); return; }
      r = E.buyBait(save, b.id, b.pack, G.data);
      if (r === E.OK) { save.gear.bait = b.id; if (packs[b.id] !== undefined) packs[b.id]++; }
    } else if (it.kind === 'rod') { // Phase 43: buy it, or take it in hand if it is yours
      if (E.ownsRod(save, it.id)) { E.useRod(save, it.id); describe(); G.core.save.autosave('rod'); say('In your hands now.'); return; }
      r = E.buyRod(save, it.id, G.data);
    } else r = E.buy(save, it.kind, G.data);
    describe();
    if (r === E.OK) { G.core.save.autosave('purchase'); say('Thank you kindly.', 'moss_lit'); }
    else if (r === E.POOR) say('Not enough coins.', 'rust_hi');
    else if (r === E.MAXED) say('Nothing finer on the shelf.');
  }

  // The visit's line as pages of the text box: up to two lines each; a repeated line is said
  // twice, on its own pages; a reversed one runs backwards in crimson.
  function talk() {
    pages.length = 0;
    var said = spoken(line_);
    for (var i = 0; i < said.length; i++) {
      var ls = F.wrap(said[i], BOX.w - 32);
      for (var k = 0; k < ls.length; k += 2) pages.push(ls.slice(k, k + 2));
    }
    crimson = line_.kind === 'reverse';
    page = 0; typed = 0; open = 'box';
  }
  function pageLen() { var n = 0, p = pages[page]; for (var i = 0; i < p.length; i++) n += p[i].length; return n; }

  // The item window over the room, for every shelf (Rusty's Buy) or one shelf (Phase 38).
  function showItems(entries, src) {
    list.length = 0;
    for (var i = 0; i < entries.length; i++) list.push(entries[i]);
    sel = 0; from = src; open = 'items';
    row = list[0][0]; col = list[0][1]; describe(); say('');
  }

  function enter() {
    var save = G.state.save;
    if (!coin) coin = G.gfx.bake.layer(8, 8, paintCoin);
    row = 0; col = 0; t = 0;
    walk = R.create(); faced = ''; open = ''; R.bake();
    packs.minnow = 0; packs.cricket = 0;
    odd.kind = ''; odd.cool = 20 + 20 * G.vrng.next();
    odd.wall = shopUnease() >= 0.6 && G.vrng.next() < 0.5; // 39.3: he has his back to you
    if (odd.wall) odd.seen.wall++;
    line_ = pickLine(save, G.data.dialogue, save.clock);
    describe();
    say('');
    if (G.state.run.dog) G.scene.dog.request(G.state.run.dog, 'bell'); // Phase 42: the door's bell
  }

  function exit() {}

  var voiceIn = { on: true, block: false };
  function update(dt) {
    var save = G.state.save;
    t += dt;
    G.sim.clock.step(save, null, dt, G.rng, G.data);
    uneaseIn.loc = G.state.run.loc;
    G.sim.unease.step(save, uneaseIn, dt, G.rng, G.data);
    var steps0 = walk.steps;
    if (open) openStep(dt); else roomStep(dt);
    voiceIn.on = save.settings.dogBark !== false;                                     // Phase 42: the dog in the shop
    if (G.state.run.dog && G.scene.dog.voice(G.state.run.dog, dt, voiceIn, G.vrng)) G.audio.engine.cue('bark', G.state.run.boat ? G.state.run.boat.x : 0, G.scene.dog.barkPitch());
    rustyStep();
    stockStep();
    envStep(dt);
    if (walk.steps !== steps0) { // 39.4: a footstep; the third board from the door hums
      G.audio.engine.cue('step');
      if (walk.tc === R.MAT[0] && walk.tr === R.MAT[1] - 2) G.audio.engine.cue('creak');
    }
  }

  // Rusty reads his paper; every 11 s a sip from his cup; a blink every 4.3 s. Spoken to, he
  // looks up at whoever is at the counter (down, or left at its side).
  function rustyStep() {
    var serving = open !== '' && from === 'rusty';
    if (serving) odd.wall = false;                                                   // spoken to, he turns round
    rusty.face = odd.wall ? 'up' : (serving && walk.c < R.RUSTY[0] - 1 ? 'left' : 'down');
    if (serving) rusty.fr = (t % 4.3) > 4.12 ? 1 : 0;
    else rusty.fr = (t % 11) > 9.4 ? 2 : 3;
  }

  // The text box, the choice and the item window. Esc closes the window back to the choice
  // (from Rusty) or everything; M closes everything; nothing else moves while one is open.
  function openStep(dt) {
    var inp = G.core.input;
    if (inp.pressed('map')) { open = ''; return; }
    if (open === 'box') {
      typed += TYPE * dt;
      if (inp.pressed('back')) { open = ''; return; }
      if (inp.pressed('action')) {
        if (typed < pageLen()) typed = pageLen();                                    // Space finishes the page
        else if (++page < pages.length) typed = 0;
        else { open = 'choice'; choice = 0; }
      }
    } else if (open === 'choice') {
      if (inp.pressed('back')) { open = ''; return; }
      var ud = M.axis('up', 'down');
      if (ud) choice = (choice + ud + CHOICES.length) % CHOICES.length;
      if (inp.pressed('action')) {
        if (CHOICES[choice] === 'BUY') showItems(ALL, 'rusty');
        else if (CHOICES[choice] === 'TALK') talk();
        else open = '';
      }
    } else if (open === 'items') {
      if (inp.pressed('back')) { if (from === 'rusty') open = 'choice'; else open = ''; return; }
      var d = M.axis('up', 'down');
      if (d) { sel = (sel + d + list.length) % list.length; row = list[sel][0]; col = list[sel][1]; describe(); say(''); }
      if (inp.pressed('action')) act();
    }
  }

  // Phase 36: walking the room. The last direction pressed and still held leads; Space talks
  // to what he faces; Esc, M or the door leave.
  var DIRK = ['up', 'down', 'left', 'right'], held = [];
  function roomStep(dt) {
    var inp = G.core.input, dir = '', tapped = '', i;
    if (inp.pressed('back') || inp.pressed('map')) { G.core.state.change('sailing'); return; }
    for (i = 0; i < DIRK.length; i++) {
      var k = DIRK[i], at = held.indexOf(k);
      if (inp.pressed(k)) { if (at >= 0) held.splice(at, 1); held.push(k); tapped = k; }
      else if (!inp.held(k) && at >= 0) held.splice(at, 1);
    }
    if (held.length) dir = held[held.length - 1];
    R.step(walk, dt, dir, tapped === dir ? tapped : '');
    if (walk.exit) { G.core.state.change('sailing'); return; }
    faced = R.facing(walk);
    if (inp.pressed('action') && faced === 'rusty') { from = 'rusty'; talk(); }
    else if (inp.pressed('action') && SHELF_ITEMS[faced]) showItems(SHELF_ITEMS[faced], faced); // Phase 38: a shelf's own items
  }

  // ---- Drawing --------------------------------------------------------------------------
  // A window in the Pokémon way: ink, a dark wood frame, cream inside with a paper rule.
  function frame(ctx, x, y, w, h) {
    ctx.fillStyle = P.ink; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = P.wood_dark; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(x - 2, y - 2, w + 4, 1);
    ctx.fillStyle = P.cream; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = P.paper; ctx.fillRect(x + 2, y + h - 3, w - 4, 1); ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
  }
  function lines(ctx, ls, x, y, max, key) { for (var i = 0; i < ls.length && i < max; i++) F.drawText(ctx, ls[i], x, y + i * F.LINE_H, key); }
  // A small arrow: down (more to read) or right (the choice).
  function arrow(ctx, x, y, right) {
    ctx.fillStyle = P.wood_deep;
    for (var i = 0; i < 4; i++) { if (right) ctx.fillRect(x + i, y + i, 1, 7 - i * 2); else ctx.fillRect(x + i, y + i, 7 - i * 2, 1); }
  }

  function draw(ctx) {
    var save = G.state.save, i;
    R.draw(ctx, walk, t, save.clock, rusty, stock, env);
    if (!open) return;
    if (open === 'box' || open === 'choice') {
      frame(ctx, BOX.x, BOX.y, BOX.w, BOX.h);
      var left = Math.floor(open === 'box' ? typed : 1e9), pg = pages[Math.min(page, pages.length - 1)], key = crimson ? 'crimson' : 'wood_deep';
      for (i = 0; i < pg.length && left > 0; i++) { F.drawText(ctx, pg[i].substring(0, left), BOX.x + 14, BOX.y + 12 + i * (F.LINE_H + 6), key); left -= pg[i].length; }
      if (open === 'box' && typed >= pageLen() && ((t * 2) | 0) % 2) arrow(ctx, BOX.x + BOX.w - 20, BOX.y + BOX.h - 14, false);
    }
    if (open === 'choice') {
      frame(ctx, CH.x, CH.y, CH.w, CH.h);
      for (i = 0; i < CHOICES.length; i++) {
        F.bold(ctx, CHOICES[i], CH.x + 26, CH.y + 12 + i * 24, 'wood_deep');
        if (i === choice) arrow(ctx, CH.x + 12, CH.y + 13 + i * 24, true);
      }
    }
    if (open === 'items') {
      // Phase 46: the item window in two small panels (G.ui.panel) at the top right, the room
      // showing round them: the list (its shelf on the tab, the coins beside it), and the
      // chosen item (its name and price, what it does, its state or the last word, the keys).
      var U = G.ui.panel, x = LIST.x, y = LIST.y;
      if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '' + save.coins; }
      U.frame(ctx, x, y, LIST.w, LIST.h, TITLES[from] || 'BUY', '  ' + txt.coins, 'bone');      // room for the coin
      ctx.drawImage(coin, U.asideX(x, LIST.w, '  ' + txt.coins), y + 4);
      var rows = LIST.rows, top = Math.max(0, Math.min(sel - rows + 2, list.length - rows)); // Phase 43: the list scrolls
      if (top < 0) top = 0;
      ctx.imageSmoothingEnabled = false;
      for (i = top; i < list.length && i < top + rows; i++) {
        var it = SHELVES[list[i][0]][list[i][1]], ry = U.top(y) + (i - top) * LIST.rowH, l = label(it), on = i === sel;
        if (on) { ctx.fillStyle = P.rust_dark; ctx.fillRect(x + 3, ry - 1, LIST.w - 6, LIST.rowH); ctx.fillStyle = P.signal_amber; ctx.fillRect(x + 3, ry - 1, 1, LIST.rowH); }
        ctx.drawImage(icon(it.icon, 1), x + U.PAD + 2, ry, 14, 14);
        F.drawText(ctx, l.name, x + U.PAD + 20, ry + 3, on ? 'signal_amber' : 'bone');
        var pw = F.measure(l.price);
        F.drawText(ctx, l.price, x + LIST.w - U.PAD - pw, ry + 3, l.price === 'OWNED' || l.price === 'BEST' ? 'fog_mid' : 'rust_hi');
        if (l.mark) F.drawText(ctx, l.mark, x + LIST.w - U.PAD - 8 - pw - F.measure(l.mark), ry + 3, l.mark === 'ON' ? 'moss_lit' : 'fog_light');
      }
      if (top > 0) F.drawText(ctx, '^', x + (LIST.w >> 1) - 8, y + LIST.h - 12, 'fog_mid');           // more above, more below
      if (top + rows < list.length) F.drawText(ctx, 'v', x + (LIST.w >> 1) + 4, y + LIST.h - 14, 'fog_mid');
      x = ITEM.x; y = ITEM.y;
      U.frame(ctx, x, y, ITEM.w, ITEM.h, txt.name[0] || '', txt.price, 'signal_amber');
      lines(ctx, txt.desc, U.left(x), U.top(y), 4, 'fog_light');
      if (txt.msg.length) lines(ctx, txt.msg, U.left(x), U.top(y) + 4 * U.ROW + 2, 1, txt.msgKey);
      else lines(ctx, txt.status, U.left(x), U.top(y) + 4 * U.ROW + 2, 1, 'fog_mid');
      var hx = U.left(x), hy = y + ITEM.h - U.PAD - U.KEY_H;
      hx += U.hint(ctx, 'SPACE', 'choose', hx, hy);
      hx += U.hint(ctx, 'W/S', 'move', hx, hy);
      U.hint(ctx, 'ESC', 'back', hx, hy);
    }
  }

  return {
    native: true,
    enter: enter, exit: exit, update: update, draw: draw, pickLine: pickLine, spoken: spoken,
    line: function () { return line_; },
    // Tests: choose an item (shelf r, item c) in the window, as if the cursor were on it, and buy.
    select: function (r, c) { row = r; col = c; describe(); return txt.name.join(' '); },
    act: function () { act(); return txt.msg.join(' '); },
    text: function () { return txt; },
    // dbg.shop(): where he stands and faces, the dog, what he faces, what is open over the room.
    info: function () { return walk ? { c: walk.c, r: walk.r, face: walk.face, moving: walk.moving, steps: walk.steps, dog: [walk.dog.c, walk.dog.r, walk.dog.sit], faced: faced, open: open, page: page, pages: pages.length, choice: CHOICES[choice], items: list.length, sel: sel, from: from, rusty: [rusty.face, rusty.fr], shown: R.shown(), strange: odd.kind, oddSeen: odd.seen, env: env, bakeMs: +R.bakeMs().toFixed(1), room: [R.OX, R.OY, R.COLS * R.T, R.ROWS * R.T], blocked: R.blocked().length } : null; },
    walk: function () { return walk; },
    // dbg.shopWalk(path) (Phase 40): walks him by U, D, L and R, a tile each, through the walk's
    // own rules (turning, collisions); returns where he ended and how many steps were blocked.
    walkPath: function (path) {
      var DIR = { U: 'up', D: 'down', L: 'left', R: 'right' }, blocked = 0;
      for (var i = 0; i < path.length; i++) {
        var d = DIR[path[i].toUpperCase()];
        if (!d) continue;
        var n0 = walk.steps;
        for (var k = 0; k < 90; k++) {                                              // held until the step starts, then let go
          R.step(walk, 1 / 60, walk.steps > n0 ? '' : d, '');
          if (walk.steps > n0 && !walk.moving) break;
        }
        if (walk.steps === n0) blocked++;
      }
      R.step(walk, 1 / 60, '', '');
      faced = R.facing(walk);
      return { c: walk.c, r: walk.r, face: walk.face, faced: faced, blocked: blocked };
    },
    icon: icon
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var f = G.state.save && G.state.save.flags, l = G.ui.shop.line();
  if (!f) return 'shop: -';
  return 'shop visits ' + f.shopVisits + '  special said ' + Object.keys(f.lines).join(',') + (l && G.core.state.sceneName() === 'shop' ? '  now ' + (l.id || 'small') : '');
});
