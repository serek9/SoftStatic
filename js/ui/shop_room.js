var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop as a room (Phase 36, PLAN_SHOP.md): a little room seen from above at a
// three-quarter angle, floating in black in the middle of the 640×360 view, as a building is
// in a retro Pokémon game. The fisher walks it tile by tile (a tap turns, a hold walks), the
// dog follows a tile behind, and what he faces is what Space talks to. This file is the room;
// js/ui/room.js has the walk and the people, js/ui/room_kit.js the parts, js/ui/shop.js the scene.
// Phase 56: repainted at the lakes' density, lofi and worn: a tall back wall of 70s panelling
// under a beam strung with bulbs, two windows onto the lake (a dim BAIT neon in one), a wall
// trophy, a fish chart, a pegboard of lure packets, a clock and a calendar; the rack, the jar
// shelf, the lure case and the gear shelf; a guitar on its amp; behind Rusty a back counter
// with a coffee maker, a boombox and a small CRT showing a fishing show; the counter a prop
// he stands behind, with the till stuck at 3:33, a banker's lamp, a bell and an ashtray; a
// bait station of cooler, cricket cage and aerated tank; a chest freezer, a tall plant, a 70s
// rug, a worn path to the counter. Visual and input only: no randomness, nothing saved.
G.ui = G.ui || {};
G.ui.shopRoom = (function () {
  var A = G.gfx.paint, P = G.gfx.sprites.PALETTE, K = G.ui.roomKit, R = G.ui.room, X = G.gfx.pix, tone = X.tone;
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, OX = (640 - W) >> 1, OY = (360 - H) >> 1, TOP = 44, RH = H + TOP;
  var STEP = R.STEP;

  // The map: w wall face (the north wall, seen), W a window in it, s side or south wall (its
  // top seen), d the door, m the mat, r the rug, . the floor.
  var MAP = [
    'wwwWWwwwwWWw',
    's..........s',
    's..........s',
    's..........s',
    's...rrr....s',
    's...rrr....s',
    's.....m....s',
    'ssssssdsssss'
  ];
  // Objects: their tiles (c, r, w, h), whether they block, and what Space does facing them.
  // `talk` is the scene's: 'rusty' (the counter), a shelf (Phase 38), 'guitar' (Phase 56).
  var OBJECTS = [
    { id: 'rack', c: 1, r: 1, w: 2, h: 1, block: true, talk: 'rack' },        // rods, reels and lines
    { id: 'jar', c: 3, r: 1, w: 1, h: 1, block: true, talk: 'jar' },          // the low shelf and the unlabelled jar
    { id: 'case', c: 4, r: 1, w: 1, h: 1, block: true, talk: 'lures' },       // Phase 43: the lure case under the window
    { id: 'gear', c: 6, r: 1, w: 1, h: 1, block: true, talk: 'gear' },        // the gear shelf (Phase 79b: nothing sold on it now)
    { id: 'counter', c: 8, r: 2, w: 1, h: 2, block: true, talk: 'rusty' },
    { id: 'counter2', c: 9, r: 3, w: 2, h: 1, block: true, talk: 'rusty' },
    { id: 'behind', c: 8, r: 1, w: 3, h: 1, block: true, talk: '' },         // Rusty's side of the counter
    { id: 'behind2', c: 9, r: 2, w: 2, h: 1, block: true, talk: '' },
    { id: 'worms', c: 1, r: 3, w: 1, h: 1, block: true, talk: 'worms' },
    { id: 'crickets', c: 1, r: 4, w: 1, h: 1, block: true, talk: 'crickets' },
    { id: 'tank', c: 1, r: 5, w: 1, h: 1, block: true, talk: 'tank' },
    // Phase 56: the room's things in its corners and between the shelves.
    { id: 'fern', c: 5, r: 1, w: 1, h: 1, block: true, talk: '' },
    { id: 'guitar', c: 7, r: 1, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'freezer', c: 1, r: 6, w: 1, h: 1, block: true, talk: 'cat' },
    { id: 'palm', c: 10, r: 6, w: 1, h: 1, block: true, talk: '' },
    { id: 'lamp', c: 3, r: 4, w: 1, h: 1, block: true, talk: '' },
    // Phase 64: a drinks cooler humming by the east wall; the freezer's cat.
    { id: 'cooler', c: 10, r: 5, w: 1, h: 1, block: true, talk: 'cooler' }
  ];
  var DOOR = [6, 7], MAT = [6, 6], RUSTY = [9, 2], CLOCK = 7;
  var WK = R.walker(MAP, OBJECTS, MAT);

  // Room pixels: tile (c, r) has its top left at (c*T, TOP + r*T); the room is drawn at
  // (OX, OY - TOP), so the back wall rises above row 0 into the dark.
  function tx(c) { return c * T; }
  function ty(r) { return TOP + r * T; }
  var LAMP = [3 * T + 16, ty(4) + 4];                       // the floor lamp by the rug
  var DESK = [8 * T + 16, ty(2.3)];                         // the banker's lamp on the counter
  var WINS = [[3, 2], [9, 2]];                              // the windows: first column, width in tiles
  function glassRect(i) { var c = WINS[i][0]; return [tx(c) + 5, 11, WINS[i][1] * T - 10, TOP - 4]; }

  // The baked light: the lamp's warmth, the desk lamp, a little from the windows.
  function light(x, y) {
    var d = Math.hypot((x - LAMP[0]) / 150, (y - LAMP[1]) / 105), e = Math.hypot((x - DESK[0]) / 70, (y - DESK[1]) / 55);
    var L = 0.38 + Math.max(0, 1 - d) * 0.45 + Math.max(0, 1 - e) * 0.25;
    for (var i = 0; i < WINS.length; i++) { var g = glassRect(i), w = Math.hypot((x - g[0] - g[2] / 2) / 60, (y - 40) / 50); L += Math.max(0, 1 - w) * 0.12; }
    return Math.min(1, L);
  }
  // The worn path from the door to the counter, lighter boards.
  function wear(x, y) {
    var px = x - (6 * T + 16), py = y - ty(5);
    var a = Math.abs(px - py * -0.3) < 20 && y > ty(3) ? 0.08 : 0;
    var b = Math.abs(y - ty(4.5)) < 14 && x > 6 * T && x < 10 * T ? 0.06 : 0;
    return a + b;
  }

  // ---- Painting ---------------------------------------------------------------------------
  var box = A.box, px = A.px;
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'], WOODK = K.WOOD;
  function img(c, im, x, y) { c.drawImage(im, Math.round(x), Math.round(y)); A.reset(); }

  // The procedural shop material family. All geometry is native and baked; shared
  // room-kit/cabin painters and the complete walk map remain untouched.
  var STUDY_WOOD = ['shop117_edge', 'shop117_wood_dk', 'shop117_wood', 'shop117_wood_mid', 'shop117_wood_hi', 'shop117_wood_lit'];
  var STUDY_METAL = ['shop117_edge', 'shop117_metal_dk', 'shop117_metal', 'shop117_metal_hi'];
  var ENAMEL = ['shop117_edge', 'shop117_paint_dk', 'shop117_paint', 'shop117_paint_hi'];
  var PAPER = ['shop117_cloth_dk', 'shop117_cloth', 'shop117_paper'];
  var CLAY = ['shop117_clay_dk', 'shop117_clay', 'shop117_clay_hi'];
  function solid(c, x0, y0, w, h, keys) {
    A.area(c, x0, y0, w, h, function (x, y) {
      var u = x - x0, v = y - y0, right = w - 1 - u, bottom = h - 1 - v;
      if ((u < 2 && v < 2 && u + v < 2) || (right < 2 && v < 2 && right + v < 2)) return '';
      if (v === 0) return keys[keys.length - 1];
      if (u === 0) return keys[Math.max(0, keys.length - 2)];
      if (right < 2 || bottom < 2) return keys[0];
      if (v < 3) return keys[Math.max(0, keys.length - 2)];
      return keys[Math.max(1, keys.length - 3)];
    });
  }
  function shopProp(kind) {
    return G.gfx.bake.cached('shop:prop119:' + kind, function () {
      var w = kind === 'snake' ? 16 : (kind === 'guitar' ? 20 : (kind === 'banker' ? 18 : (kind === 'crt' ? 32 : (kind === 'cooler' ? 28 : 30))));
      var h = kind === 'guitar' ? 44 : (kind === 'banker' ? 15 : (kind === 'radio' ? 17 : (kind === 'amp' ? 23 : (kind === 'cooler' ? 52 : 30))));
      var g = X.grid(w, h), i;
      if (kind === 'guitar') {
        g.poly([[6,20],[4,23],[5,27],[1,31],[1,38],[5,42],[13,42],[18,38],[18,31],[14,27],[14,22],[11,20]], 'shop117_clay_dk');
        g.ell(9,34,7,7,CLAY,{}); g.ell(10,25,4,5,CLAY,{});
        g.rect('shop117_wood_dk',9,5,3,28); g.rect('shop117_wood_hi',10,5,1,27);
        g.ell(10,30,2.5,2.5,'shop117_edge',{}); g.rect('shop117_paper',6,37,8,1);
        g.slab(7,0,6,8,STUDY_METAL); for(i=1;i<7;i+=2){g.set('shop117_paper',6,i);g.set('shop117_paper',13,i);}
      } else if (kind === 'banker') {
        g.ell(9,12,7,2.2,STUDY_METAL,{}); g.rect('shop117_metal',8,5,2,7);
        g.poly([[3,1],[14,1],[17,4],[16,7],[2,7],[1,4]],'shop117_paint_dk');
        g.poly([[4,2],[13,2],[15,4],[3,4]],'shop117_paint_hi');g.rect('shop117_paint',3,4,12,2);g.rect('shop117_lamp',4,7,11,1);
      } else if (kind === 'snake' || kind === 'fern' || kind === 'trail') {
        var cx=w>>1;
        if(kind==='snake') for(i=0;i<5;i++){var x=2+i*3,y=3+(i%3)*3;g.poly([[x,22],[x-1,y+3],[x,y],[x+2,y+2],[x+2,22]],i%2?'shop117_leaf':'shop117_leaf_hi');g.line('shop117_leaf_dk',x,21,x,y+4);}
        else {
          for(i=0;i<5;i++){var xx=3+i*5,yy=7+(i%2)*5;g.line('shop117_leaf_dk',cx,23,xx,yy);g.poly([[xx,yy-4],[xx+4,yy-2],[xx+5,yy+3],[xx+2,yy+5],[xx-2,yy+1]],'shop117_leaf');g.line('shop117_leaf_hi',xx,yy-2,xx+2,yy+2);}
          if(kind==='trail')for(i=0;i<4;i++){g.line('shop117_leaf_dk',22+i,17,20+i,28);g.ell(21+i,22+(i%2)*4,2.5,2,'shop117_leaf',{});}
        }
        g.poly([[cx-6,21],[cx+6,21],[cx+5,28],[cx+3,29],[cx-4,29],[cx-5,27]],'shop117_clay');g.rect('shop117_clay_hi',cx-7,20,14,2);g.rect('shop117_edge',cx-4,20,8,1);g.line('shop117_clay_dk',cx+4,23,cx+4,27);
      } else if(kind==='cooler') {
        g.poly([[3,0],[25,0],[27,2],[27,49],[24,51],[3,51],[0,48],[0,3]],'shop117_paint_dk');
        g.rect('shop117_paint',2,3,24,45);g.rect('shop117_paint_hi',3,2,22,2);
        g.slab(3,1,22,7,PAPER);g.rect('shop117_rug',6,4,15,2);g.rect('shop117_edge',3,9,22,37);g.rect('shop117_metal_hi',24,20,1,12);
      } else if(kind==='amp') {
        g.slab(1,2,28,21,ENAMEL);g.rect('shop117_cloth_dk',4,7,22,12);g.rect('shop117_cloth',5,8,20,10);
        for(i=0;i<5;i++)g.rect('shop117_wood',5+i*4,8,1,10);g.rect('shop117_edge',6,0,16,2);g.set('shop117_lamp',6,4);g.set('shop117_metal_hi',11,4);
      } else if(kind==='radio') {
        g.slab(0,3,30,14,STUDY_METAL);g.rect('shop117_metal',7,0,16,2);
        for(i=0;i<2;i++){g.ell(6+i*18,10,4.5,4.5,'shop117_metal_dk',{});g.ell(6+i*18,10,2,2,'shop117_edge',{});g.set('shop117_metal_hi',4+i*18,8);}
        g.rect('shop117_edge',11,7,8,6);g.rect('shop117_cloth',12,9,6,2);g.rect('shop117_lamp',12,5,5,1);
      } else if(kind==='crt') {
        g.poly([[3,0],[29,0],[31,3],[31,24],[28,27],[3,27],[0,23],[0,3]],'shop117_paint_dk');g.rect('shop117_paint',3,2,26,23);g.rect('shop117_paint_hi',4,2,24,2);
        g.rect('shop117_edge',5,3,18,14);g.rect('crt_dark',6,4,16,12);g.rect('shop117_metal_dk',25,7,3,9);g.set('shop117_lamp',26,21);g.rect('shop117_edge',6,28,21,2);
      }
      g.outline('shop117_edge');return g.canvas();
    });
  }
  function materialStudy(c) {
    // Broad boards with a top plane and a recessed join; a few chosen strokes replace
    // the old continuous grain/nail pattern. Lighting is sampled once per board.
    var x0 = T, y0 = ty(1), w = W - 2 * T, h = H - 2 * T;
    A.area(c, x0, y0, w, h, function (x, y) {
      var row = Math.floor((y - y0) / 14), v = (y - y0) % 14;
      var offset = (row % 3) * 23, segment = Math.floor((x - x0 + offset) / 68), u = (x - x0 + offset) % 68;
      var lit = light(x0 + segment * 68 + 34 - offset, y0 + row * 14 + 7);
      if (v === 13 || u === 0) return 'shop117_wood_dk';
      if (v === 0) return 'shop117_wood_mid';
      if (v === 12 || u === 1) return 'shop117_wood_dk';
      if (v === 6 && u > 17 && u < 34) return 'shop117_wood_dk';
      return tone(STUDY_WOOD, 0.28 + lit * 0.25 + (K.hash(row, segment + 61) - 0.5) * 0.1);
    });
    // A wall bay with wide structural boards, a bevelled beam and three quiet planes.
    var wx = T, ww = W - 2 * T;
    A.area(c, wx, 7, ww, TOP + 32 - 7, function (x, y) {
      var u = (x - wx) % 16;
      if (u === 0 || y === TOP + 30) return 'shop117_edge';
      if (u === 1) return 'shop117_wood_hi';
      if (u > 13) return 'shop117_wood_dk';
      return y > TOP + 4 ? 'shop117_wood' : 'shop117_wood_mid';
    });
    box(c, 'shop117_edge', wx, 0, ww, 7);
    box(c, 'shop117_wood_hi', wx + 2, 1, ww - 4, 2);
    box(c, 'shop117_wood', wx, 3, ww, 2);
    box(c, 'shop117_wood_dk', wx + 1, 5, ww - 2, 1);
    // The rail is a solid piece with a visible upper ledge, not another dark stripe.
    box(c, 'shop117_edge', wx, TOP + 1, ww, 5);
    box(c, 'shop117_wood_hi', wx + 1, TOP + 1, ww - 2, 2);
    box(c, 'shop117_wood', wx + 1, TOP + 3, ww - 2, 2);
  }
  function roomEdges(c) {
    for (var side = 0; side < 2; side++) {
      var x0 = side ? W - T : 0;
      A.area(c, x0, 0, T, RH, function (x, y) {
        var edge = side ? x - x0 : T - 1 - x;
        if ((x === 0 || x === W - 1) && (y < 3 || y > RH - 4)) return '';
        if (edge === 0) return 'shop117_edge';
        if (edge === 1) return 'shop117_wood_mid';
        if (edge < 4) return 'shop117_wood_dk';
        return y % 14 === 13 ? 'shop117_edge' : 'wood_deep';
      });
    }
    var y0 = ty(7);
    A.area(c, T, y0, W - T * 2, T, function (x, y) {
      if (x >= tx(DOOR[0]) && x < tx(DOOR[0] + 1)) return y < y0 + 3 ? 'shop117_wood_dk' : 'night_deep';
      var u = (x - T) % 16;
      if (y === y0) return 'shop117_wood_hi';
      if (y < y0 + 3) return 'shop117_wood';
      if (u < 2 || y > RH - 3) return 'shop117_edge';
      return u === 2 ? 'shop117_wood' : 'shop117_wood_dk';
    });
    box(c, 'shop117_metal_dk', tx(DOOR[0]) + 3, y0 + 12, T - 6, 2);
  }
  function wovenRug(c) {
    var x0 = 4 * T + 2, y0 = ty(4) + 4, w = 3 * T - 4, h = 2 * T - 10;
    box(c, 'shop117_edge', x0, y0 + 2, w + 1, h + 1);
    A.area(c, x0, y0, w, h, function (x, y) {
      var u = x - x0, v = y - y0, e = Math.min(u, w - 1 - u, v, h - 1 - v);
      if (e < 2) return 'shop117_rug_dk';
      if (e < 4) return 'shop117_ochre';
      if (e < 7) return 'shop117_rug';
      if (e < 8) return 'shop117_rug_hi';
      var diamond = Math.abs(u - w / 2) * 0.55 + Math.abs(v - h / 2);
      if (diamond < 6) return 'shop117_ochre';
      if (diamond < 8) return 'shop117_rug_dk';
      if (diamond > 18 && diamond < 20) return 'shop117_rug_hi';
      return 'shop117_rug';
    });
    for (var y = 2; y < h; y += 3) { box(c, 'shop117_cloth', x0 - 3, y0 + y, 3, 1); box(c, 'shop117_cloth', x0 + w, y0 + y, 3, 1); }
  }
  function studyLamp() {
    var g = X.grid(22, 54);
    g.ell(11, 51, 10, 2, 'shop117_edge', {});
    g.ell(11, 49, 8.5, 2.6, STUDY_METAL, { rim: 0.1 });
    g.rect('shop117_metal_dk', 9, 17, 4, 32);
    g.rect('shop117_metal', 10, 18, 2, 29); g.rect('shop117_metal_hi', 10, 19, 1, 27);
    // A bell-shaped linen shade: chunky faceted volume rather than thin vertical pleats.
    g.poly([[6,1],[16,1],[18,4],[21,15],[20,18],[2,18],[1,15],[4,4]], function (x, y) {
      if (y > 15) return 'shop117_cloth_dk';
      if (x < 5 || x > 17) return 'shop117_cloth_dk';
      if (x < 9 || x > 14) return 'shop117_cloth';
      return 'shop117_cloth_hi';
    });
    g.line('shop117_paper', 7, 1, 15, 1);
    g.line('shop117_lamp', 4, 17, 18, 17);
    g.set('shop117_metal', 15, 19); g.set('shop117_metal_dk', 15, 20);
    g.outline('shop117_edge');
    return g.canvas();
  }
  function studyPlant() {
    var g = X.grid(28, 40), leaves = ['shop117_leaf_dk', 'shop117_leaf', 'shop117_leaf_hi'];
    g.line(leaves[0], 14, 31, 13, 9); g.line(leaves[1], 15, 30, 17, 10);
    g.poly([[13,17],[5,15],[2,10],[3,5],[9,4],[13,7]], leaves[0]);
    g.poly([[3,7],[8,5],[12,8],[12,14],[7,13]], leaves[1]);
    g.poly([[14,13],[17,3],[23,1],[27,5],[26,11],[21,15]], leaves[1]);
    g.poly([[17,5],[23,2],[25,5],[21,10],[16,12]], leaves[2]);
    g.poly([[13,26],[5,25],[0,20],[1,16],[6,14],[11,18]], leaves[0]);
    g.poly([[2,18],[6,16],[10,19],[11,23],[5,22]], leaves[1]);
    g.poly([[14,25],[19,17],[25,17],[27,21],[26,27],[22,30],[16,29]], leaves[1]);
    g.poly([[19,19],[24,18],[25,22],[21,26],[17,27]], leaves[2]);
    g.line(leaves[0], 4, 8, 12, 15); g.line(leaves[0], 23, 5, 15, 13);
    g.line(leaves[0], 3, 19, 12, 24); g.line(leaves[0], 24, 21, 16, 28);
    // A heavy terracotta lip, recessed soil and a tapered pot with distinct faces.
    g.poly([[7,30],[21,30],[20,37],[18,39],[10,39],[8,37]], 'shop117_clay_dk');
    g.poly([[8,31],[14,31],[14,38],[10,37]], 'shop117_clay_hi');
    g.poly([[14,31],[20,31],[19,37],[14,38]], 'shop117_clay');
    g.rect('shop117_clay_hi', 6, 29, 16, 2); g.rect('shop117_clay_dk', 7, 31, 14, 1);
    g.rect('shop117_edge', 9, 29, 10, 1);
    g.outline('shop117_edge'); return g.canvas();
  }
  function studyCounterCorner(c) {
    var g = X.grid(32, 80);
    g.poly([[4,0],[28,0],[30,2],[30,31],[28,33],[2,33],[2,3]], 'shop117_edge');
    g.poly([[5,1],[27,1],[29,3],[29,30],[3,30],[3,4]], 'shop117_wood_mid');
    g.poly([[5,1],[27,1],[28,3],[4,3]], 'shop117_wood_hi');
    g.poly([[3,5],[5,3],[5,30],[3,32]], 'shop117_wood');
    g.rect('shop117_wood', 8, 24, 11, 1); g.rect('shop117_wood_hi', 7, 9, 14, 1);
    // Leave the glass and its stock unobscured. Below it: an enamel cabinet with a
    // recessed panel and a substantial lip, within the original counter footprint.
    g.poly([[2,62],[29,62],[30,64],[30,76],[28,78],[4,78],[2,76]], 'shop117_paint_dk');
    g.rect('shop117_paint', 4, 65, 24, 9); g.rect('shop117_paint_hi', 5, 65, 22, 1);
    g.rect('shop117_metal_dk', 7, 68, 18, 4); g.rect('shop117_paint', 8, 69, 16, 3);
    g.rect('shop117_wood_hi', 3, 62, 26, 2); g.rect('shop117_metal_dk', 4, 76, 24, 2);
    c.clearRect(2, 0, 3, 1); c.clearRect(2, 1, 1, 1);
    g.paint(c, 0, 0); A.reset();
  }

  function paintBase(c) {
    A.reset();
    materialStudy(c);
    roomEdges(c);
    // The rug and the mat.
    wovenRug(c);
    A.area(c, tx(6) + 3, ty(6) + 6, T - 6, T - 9, function (x, y) { return (y - ty(6)) % 4 === 0 ? 'shop117_cloth_dk' : 'shop117_paint_dk'; });
    box(c, 'outline', tx(6) + 3, ty(6) + T - 3, T - 6, 1);
    // Cobwebs in the top corners; a loose board.
    for (var w = 0; w < 2; w++) { var cx = w ? W - T - 1 : T, dir = w ? -1 : 1; for (var k = 0; k < 4; k++) A.line(c, 'fog_mid', cx, 7, cx + dir * (22 - k * 5), 7 + k * 5); for (k = 1; k < 3; k++) A.line(c, 'fog_dark', cx + dir * k * 7, 7, cx, 7 + k * 7); }
    box(c, 'panel_deep', tx(3) + 4, ty(6) + 15, 30, 1); box(c, 'panel_hi', tx(3) + 4, ty(6) + 8, 30, 1);
    // The string lights' cable along the beam.
    cable = K.lightCable(c, T + 4, W - T - 4, 7, 46, 5);
    wallThings(c);
    shelves(c);
    behindCounter(c);
    baitStation(c);
    A.reset();
  }
  var cable = [];

  // The back wall: windows, the trophy, the chart, the clock and calendar, the pegboard.
  function wallThings(c) {
    var i;
    for(i=0;i<WINS.length;i++){
      var g=glassRect(i);solid(c,g[0]-5,g[1]-5,g[2]+10,g[3]+11,STUDY_WOOD);
      box(c,'shop117_edge',g[0]-1,g[1]-1,g[2]+2,g[3]+2);box(c,'night_deep',g[0],g[1],g[2],g[3]);
      solid(c,g[0]-7,g[1]+g[3]+3,g[2]+14,5,STUDY_WOOD);
    }
    // Carved plaque, pinned field chart and a heavy clock, all in native planes.
    A.blob(c,tx(2),26,26,11,STUDY_WOOD,{rim:0.12});
    var fi=0;for(i=0;i<G.data.fish.length;i++)if(G.data.fish[i].id==='yellow_perch')fi=i;
    var fp=G.gfx.fishgen.portrait(fi,40,14,false);img(c,fp,tx(2)-(fp.width>>1),26-(fp.height>>1));
    solid(c,tx(2)-8,33,16,3,STUDY_METAL);
    solid(c,tx(5)+4,12,24,30,PAPER);box(c,'shop117_rug',tx(5)+6,14,17,2);
    for(i=0;i<4;i++){var y=19+i*5;A.blob(c,tx(5)+13,y,5,1.6,['shop117_leaf_dk','shop117_leaf','shop117_leaf_hi'],{});box(c,'shop117_cloth_dk',tx(5)+21,y,4,1);}
    px(c,'shop117_metal_hi',tx(5)+15,12);
    A.blob(c,tx(CLOCK)+16,20,8,8,STUDY_WOOD,{rim:0.15});A.blob(c,tx(CLOCK)+16,20,6,6,PAPER,{rim:0});
    for(i=0;i<12;i++)px(c,'shop117_wood_dk',Math.round(tx(CLOCK)+16+Math.sin(i*Math.PI/6)*5),Math.round(20-Math.cos(i*Math.PI/6)*5));
    solid(c,tx(CLOCK)+8,31,16,14,PAPER);box(c,'shop117_paint',tx(CLOCK)+9,32,14,4);
    for(i=0;i<9;i++)px(c,i===6?'shop117_rug':'shop117_cloth_dk',tx(CLOCK)+10+(i%5)*3,39+Math.floor(i/5)*3);
    solid(c,tx(8)+1,9,T-2,36,STUDY_WOOD);box(c,'shop117_wood_dk',tx(8)+3,11,T-6,32);
    for(i=0;i<8;i++){var x=tx(8)+4+(i%4)*6,y=13+Math.floor(i/4)*15;px(c,'shop117_metal_hi',x+2,y);if(i===5)continue;
      solid(c,x,y+2,5,10,i%3===0?CLAY:ENAMEL);box(c,'shop117_paper',x+1,y+4,3,3);px(c,'shop117_ochre',x+2,y+5);}
  }

  // The rack, the jar shelf, the lure case, the fern, the gear shelf, the guitar on its amp.
  function shelves(c) {
    var x=tx(1),y=ty(1),i;
    solid(c,x+4,y-26,56,5,STUDY_WOOD);solid(c,x+2,y+6,60,18,ENAMEL);
    box(c,'shop117_paint_dk',x+4,y+12,56,10);for(i=0;i<5;i++){box(c,'shop117_edge',x+8+i*10,y+8,4,3);}
    solid(c,x+6,y+14,13,8,STUDY_WOOD);box(c,'shop117_paper',x+9,y+16,7,2);solid(c,x+44,y+14,14,8,STUDY_METAL);A.blob(c,x+51,y+18,3,3,ENAMEL,{});
    x=tx(3);solid(c,x+2,y+4,28,20,STUDY_WOOD);box(c,'shop117_edge',x+5,y+15,22,7);box(c,'shop117_wood',x+15,y+15,2,7);
    for(i=0;i<3;i++){var jx=x+4+i*8;solid(c,jx,y-6,7,10,i===1?ENAMEL:CLAY);box(c,'shop117_metal',jx,y-7,7,2);if(i!==1){box(c,'shop117_paper',jx+1,y-2,5,3);px(c,'shop117_wood_dk',jx+3,y-1);}else px(c,'shop117_paint_hi',jx+3,y-3);}
    x=tx(4);solid(c,x+2,y+2,28,19,STUDY_WOOD);box(c,'shop117_paint_dk',x+5,y+5,22,11);
    for(i=0;i<12;i++){var xx=x+6+(i%6)*4,yy=y+7+Math.floor(i/6)*5;box(c,i%2?'shop117_paper':'shop117_ochre',xx,yy,2,1);px(c,'shop117_metal',xx+2,yy+1);}
    A.line(c,'shop117_metal_hi',x+6,y+5,x+12,y+5);box(c,'shop117_wood_dk',x+4,y+21,3,5);box(c,'shop117_wood_dk',x+25,y+21,3,5);
    solid(c,tx(5)+8,y+14,16,5,STUDY_WOOD);box(c,'shop117_wood_dk',tx(5)+10,y+19,2,9);box(c,'shop117_wood_dk',tx(5)+20,y+19,2,9);
    img(c,shopProp('fern'),tx(5)+2,y-16);A.line(c,'shop117_metal',tx(5)+28,y+26,tx(5)+30,y-14);A.blob(c,tx(5)+30,y-20,5,6,STUDY_METAL,{rim:0.1});
    x=tx(6);solid(c,x+1,y-30,30,56,STUDY_WOOD);box(c,'shop117_edge',x+4,y-27,23,50);
    for(i=0;i<3;i++)solid(c,x+3,y-14+i*14,26,3,STUDY_WOOD);
    solid(c,x+5,y-8,9,6,CLAY);solid(c,x+15,y-6,8,4,ENAMEL);A.blob(c,x+10,y+20,6,3,['shop117_cloth_dk','shop117_cloth','shop117_paper'],{});A.blob(c,x+10,y+20,2,1,'shop117_edge',{});
    solid(c,x+18,y+16,9,8,CLAY);box(c,'shop117_paper',x+20,y+18,5,2);
    img(c,shopProp('amp'),tx(7)+3,y+4);img(c,shopProp('guitar'),tx(7)+15,y-18);
  }

  // Behind the counter: a back counter with the coffee maker, the boombox and its tapes, the
  // CRT (its screen live), a stack of cans.
  var tvRect = null;
  function behindCounter(c) {
    var x=tx(8),y=ty(1),i;
    solid(c,x+1,y-4,3*T-3,24,STUDY_WOOD);box(c,'shop117_edge',x+4,y+6,3*T-9,12);
    for(i=1;i<6;i++)box(c,'shop117_wood',x+3+i*15,y+6,2,12);
    solid(c,x+4,y-20,12,16,ENAMEL);box(c,'shop117_edge',x+7,y-12,7,6);A.blob(c,x+10,y-8,4,3,CLAY,{});px(c,'shop117_lamp',x+13,y-18);
    img(c,shopProp('radio'),x+18,y-17);
    for(i=0;i<4;i++){solid(c,x+18+i*6,y-1,5,3,i%2?CLAY:ENAMEL);}
    img(c,shopProp('crt'),tx(10)-2,y-32);tvRect=[tx(10)+4,y-28,16,12];
    for(i=0;i<6;i++){var xx=tx(10)+19+(i%3)*4,yy=y-9-Math.floor(i/3)*6;solid(c,xx,yy,3,5,i%2?CLAY:ENAMEL);box(c,'shop117_paper',xx,yy+2,2,1);}
  }

  // The bait station against the west wall: the worm cooler, the cricket cage, the tank.
  function baitStation(c) {
    var x=tx(1),y=ty(3),i;
    solid(c,x+3,y+6,26,20,PAPER);solid(c,x+2,y-2,28,9,PAPER);box(c,'shop117_paint',x+4,y+18,24,3);
    for(i=0;i<3;i++){A.blob(c,x+8+i*8,y+2,3,2,STUDY_WOOD,{});A.line(c,'shop117_rug',x+6+i*8,y+2,x+10+i*8,y+1);}
    box(c,'shop117_rug',x+6,y+10,10,4);box(c,'shop117_paper',x+8,y+11,6,1);
    y=ty(4);solid(c,x+4,y+16,24,12,STUDY_WOOD);solid(c,x+3,y-2,26,19,STUDY_WOOD);box(c,'shop117_edge',x+5,y,22,15);
    for(i=0;i<5;i++)box(c,'shop117_metal',x+7+i*4,y+1,1,13);for(i=0;i<3;i++)box(c,'shop117_metal_dk',x+5,y+3+i*4,22,1);
    y=ty(5);solid(c,x+3,y+18,26,10,ENAMEL);solid(c,x+3,y-4,26,23,STUDY_METAL);box(c,'water_dark',x+4,y-3,24,21);box(c,'water_hi',x+4,y-3,24,2);
    box(c,'shop117_cloth_dk',x+4,y+14,24,4);for(i=0;i<4;i++)box(c,'shop117_cloth',x+5+i*6,y+14+(i%2),3,1);
    A.line(c,'shop117_leaf',x+7,y+14,x+6,y+4);A.line(c,'shop117_leaf_hi',x+8,y+14,x+10,y+6);solid(c,x+24,y-6,4,4,ENAMEL);A.line(c,'shop117_metal_dk',x+26,y-2,x+26,y+12);box(c,'shop117_metal_hi',x+5,y-2,5,1);
  }

  // Props drawn in order of their feet with the people: the counter, the freezer, the palm.
  function paintCounter(c) {
    var g=X.grid(96,82);
    g.poly([[4,0],[27,0],[30,3],[30,28],[90,28],[94,32],[94,76],[91,80],[4,80],[1,76],[1,4]],'shop117_edge');
    g.poly([[5,1],[26,1],[28,4],[28,31],[91,31],[92,34],[92,62],[3,62],[3,5]],'shop117_wood_mid');
    g.poly([[5,1],[26,1],[27,3],[5,3]],'shop117_wood_hi');g.rect('shop117_wood_hi',29,31,61,2);
    g.rect('shop117_wood',4,5,2,25);g.rect('shop117_wood',5,60,86,2);g.rect('shop117_wood',42,44,18,1);g.rect('shop117_wood_hi',47,48,23,1);
    g.rect('shop117_paint_dk',3,64,89,14);g.rect('shop117_paint',5,65,85,10);g.rect('shop117_paint_hi',5,65,85,1);
    for(var i=0;i<3;i++){var x=7+i*27;g.rect('shop117_metal_dk',x,68,23,6);g.rect('shop117_paint',x+1,69,21,4);}
    g.rect('shop117_wood_hi',4,62,87,2);g.rect('shop117_metal_dk',5,76,84,2);
    g.slab(4,33,24,25,STUDY_METAL);g.rect('shop117_rug_dk',6,35,20,21);
    for(i=0;i<9;i++){var xx=8+(i%3)*6,yy=38+Math.floor(i/3)*6;g.rect(i%2?'shop117_ochre':'shop117_paper',xx,yy,3,2);g.set('shop117_metal_hi',xx+3,yy+2);}
    g.line('shop117_metal_hi',6,35,13,35);g.line('shop117_metal',21,53,25,49);
    g.slab(66,20,23,14,STUDY_METAL);g.rect('shop117_edge',69,22,15,4);for(i=0;i<3;i++)g.set('shop117_lamp',71+i*4,23);
    for(i=0;i<8;i++)g.set('shop117_paper',69+(i%4)*4,28+Math.floor(i/4)*3);
    g.ell(49,37,3.5,2,['shop117_wood_dk','shop117_ochre','shop117_wood_lit'],{});g.set('shop117_ochre',49,34);
    g.ell(37,39,4,2,STUDY_METAL,{});g.rect('shop117_paper',38,38,3,1);
    g.slab(53,39,12,7,PAPER);g.rect('shop117_cloth_dk',55,41,8,1);g.rect('shop117_cloth_dk',55,43,6,1);
    g.slab(8,22,9,10,CLAY);g.rect('shop117_metal',8,20,9,2);g.set('shop117_paper',11,26);g.set('shop117_ochre',14,29);
    g.paint(c,0,0);img(c,shopProp('banker'),7,12);A.reset();
  }

  function paintFreezer(c) {
    solid(c,1,8,30,22,ENAMEL);solid(c,0,0,32,10,PAPER);
    box(c,'shop117_metal_hi',11,9,9,2);box(c,'shop117_edge',12,11,7,1);
    solid(c,4,15,15,6,CLAY);box(c,'shop117_paper',6,17,10,1);box(c,'shop117_paint_dk',22,23,6,5);px(c,'shop117_lamp',28,13);
  }

  // ---- Baking ------------------------------------------------------------------------------
  var base = null, front = null, props = null, bakeMs = 0;
  function bake() {
    if (!base) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      base = G.gfx.bake.cached('shop:room56', function () { return G.gfx.bake.layer(W, RH, paintBase); });
      front = G.gfx.bake.cached('shop:front56', function () {
        return G.gfx.bake.layer(W, RH, function (c) {
          for (var i = 0; i < WINS.length; i++) { var g = glassRect(i); box(c,'shop117_wood',g[0]+(g[2]>>1)-1,g[1],3,g[3]); box(c,'shop117_wood_hi',g[0]+(g[2]>>1)-1,g[1],1,g[3]); box(c,'shop117_wood',g[0],g[1]+(g[3]>>1)-1,g[2],3); box(c,'shop117_wood_hi',g[0],g[1]+(g[3]>>1)-1,g[2],1); }
          // A plant on each sill, a trailing pothos over the first.
          c.drawImage(shopProp('snake'), glassRect(0)[0] + 2, TOP - 22);
          c.drawImage(shopProp('trail'), glassRect(1)[0] + glassRect(1)[2] - 26, TOP - 22);
          A.reset();
        });
      });
      props = [
        { img: G.gfx.bake.cached('shop:counter56', function () { return G.gfx.bake.layer(3 * T, 2 * T + 18, paintCounter); }), x: tx(8), y: ty(2) - 14, foot: ty(4) },
        { img: G.gfx.bake.cached('shop:freezer56', function () { return G.gfx.bake.layer(32, 31, paintFreezer); }), x: tx(1), y: ty(6) - 2, foot: ty(7) - 1 },
        { img: G.gfx.bake.cached('shop:lamp117', studyLamp), x: tx(3) + 5, y: ty(5) - 56, foot: ty(5) - 2 },
        { img: G.gfx.bake.cached('shop:palm117', studyPlant), x: tx(10) + 2, y: ty(7) - 42, foot: ty(7) - 1 },
        { img: G.gfx.bake.cached('shop:cooler64', function () { return shopProp('cooler'); }), x: tx(10) + 2, y: ty(6) - 53, foot: ty(6) - 1 }
      ];
      // Phase 64: what moves on the props, drawn with them in their place in the order: the
      // lava lamp on the counter, the cat on the freezer, the lit drinks in the cooler.
      props[1].live = function (ctx, x, y, t) { K.cat(ctx, x + 6, y + 8, t); };
      props[4].live = function (ctx, x, y, t, env) { K.coolerInside(ctx, x + 4, y + 10, t, env ? env.night : 0); };
      if (t0) bakeMs = performance.now() - t0;
    }
    return base;
  }

  // What the shelves hold (Phase 38): every rod not yet his on the rack (Phase 43), the
  // minnows and crickets left this visit (Phase 79b: the lantern and the finder are gone).
  var shown = { rods: 0, minnows: 0, crickets: 0 };
  function drawStock(ctx, stock, t, ox, oy) {
    var x0 = ox + tx(1), y0 = oy + ty(1), i, n = 0, rods = G.data.gear.rods;
    for (i = 1; i < rods.length; i++) {
      if ((stock.rods && stock.rods.indexOf(i) >= 0) || rods[i].ice) continue; // Phase 80: the ice rods are kept behind the counter
      var x = x0 + 9 + (i - 1) * 10;
      ctx.fillStyle = P.outline; ctx.fillRect(x, y0 - 30, 3, 41);
      ctx.fillStyle = P[rods[i].look[0]]; ctx.fillRect(x + 1, y0 - 30, 1, 41);
      for (var gi = 0; gi < 3; gi++) { ctx.fillStyle = P.chrome_hi; ctx.fillRect(x, y0 - 26 + gi * 9, 1, 1); }
      ctx.fillStyle = P.wood_lit; ctx.fillRect(x, y0 + 2, 3, 8); ctx.fillStyle = P.wood_mid; ctx.fillRect(x + 2, y0 + 2, 1, 8);
      ctx.fillStyle = P.chrome; ctx.fillRect(x + 2, y0 - 2, 3, 3); ctx.fillStyle = P.chrome_lit; ctx.fillRect(x + 2, y0 - 2, 1, 1);
      n++;
    }
    shown.rods = n;
    // Minnows in the tank, crickets in the cage now and then hopping.
    var mx = ox + tx(1) + 5, my = oy + ty(5) - 1;
    shown.minnows = stock.minnows;
    for (i = 0; i < stock.minnows; i++) {
      var ph = t * (0.35 + i * 0.07) + i * 1.7, u = (Math.sin(ph) + 1) / 2, dir = Math.cos(ph) > 0;
      ctx.fillStyle = P.water_foam; ctx.fillRect(mx + Math.round(u * 18), my + (i * 5) % 13, 3, 1);
      ctx.fillStyle = P.chrome_lit; ctx.fillRect(mx + Math.round(u * 18) + (dir ? 2 : 0), my + (i * 5) % 13, 1, 1);
    }
    var cx = ox + tx(1) + 6, cy = oy + ty(4) + 1;
    shown.crickets = stock.crickets;
    for (i = 0; i < stock.crickets; i++) {
      var hop = (t * 0.6 + i * 0.37) % 1 < 0.06 ? 2 : 0;
      ctx.fillStyle = P.outline; ctx.fillRect(cx + 1 + (i * 7) % 18, cy + 4 + ((i * 5) % 9) - hop, 2, 1); ctx.fillStyle = P.wood; ctx.fillRect(cx + 3 + (i * 7) % 18, cy + 3 + ((i * 5) % 9) - hop, 1, 1);
    }
    ctx.fillStyle = P.reed_hi;                                                          // the cage's mesh over them
    for (i = 0; i < 6; i++) ctx.fillRect(cx - 1 + i * 4, cy - 1, 1, 15);
    for (i = 0; i < 4; i++) ctx.fillRect(cx - 1, cy - 1 + i * 4, 22, 1);
  }

  // ---- Light, life and the strange (Phase 39) -------------------------------------------
  // env: {hour, night, grey, rain, fog, flash, strange, st}: the windows show the lake at the
  // hour; at night the room darkens but for the lamps' stepped pools.
  var FIGURE_WIN = 10, mask = null;
  function clearAt(x, y) {
    for (var i = 0; i < WINS.length; i++) { var g = glassRect(i); if (x >= g[0] && x < g[0] + g[2] && y >= g[1] && y < g[1] + g[3]) return true; }
    return tvRect && x >= tvRect[0] && x < tvRect[0] + tvRect[2] && y >= tvRect[1] && y < tvRect[1] + tvRect[3];
  }
  function drawLive(ctx, env, t, rusty, ox, oy) {
    var i;
    for (i = 0; i < WINS.length; i++) {
      var g = glassRect(i), fig = env.strange === 'figure' && WINS[i][0] + WINS[i][1] - 1 === FIGURE_WIN ? Math.min(1, Math.min(env.st, 1 - env.st) * 4) : 0;
      K.glass(ctx, ox + g[0], oy + g[1], g[2], g[3], env, t, fig);
    }
    ctx.drawImage(front, ox, oy);
    // The BAIT neon in the first window: pink tubes, a flicker every 17 s.
    var g0 = glassRect(0), nx = ox + g0[0] + 8, ny = oy + g0[1] + 6, on = (t % 17) > 0.35 || ((t * 20) | 0) % 2;
    neon(ctx, 'BAIT', nx, ny, on, env.night);
    // The clock's hands at the game hour (39.3 runs them back).
    var cx = ox + tx(CLOCK) + 16, cy = oy + 20, back = env.strange === 'clock' ? env.st * 4 * Math.PI : 0;
    var ha = (((env.hour % 12) + 12) % 12) / 12 * 2 * Math.PI, ma = (env.hour % 1) * 2 * Math.PI - back;
    ctx.fillStyle = P.outline;
    for (i = 1; i <= 4; i++) ctx.fillRect(Math.round(cx + Math.sin(ma) * i), Math.round(cy - Math.cos(ma) * i), 1, 1);
    for (i = 1; i <= 3; i++) ctx.fillRect(Math.round(cx + Math.sin(ha) * i * 0.8), Math.round(cy - Math.cos(ha) * i * 0.8), 1, 1);
    ctx.fillStyle = P.neon_red; ctx.fillRect(cx, cy, 1, 1);
    // The CRT behind the counter, a fishing show on it.
    if (tvRect) K.screen(ctx, ox + tvRect[0], oy + tvRect[1], tvRect[2], tvRect[3], t, 1);
  }
  // A word in neon tubes (the font's own pixels, doubled, outlined): lit or dark.
  function neon(ctx, s, x, y, on, night) {
    var F = G.gfx.sprites;
    if (on && night > 0.2) { ctx.globalAlpha = 0.18 * night; ctx.fillStyle = P.neon_pink; ctx.fillRect(x - 3, y - 3, F.measure(s) + 6, 11); ctx.globalAlpha = 1; }
    F.drawText(ctx, s, x, y, on ? 'neon_pink_hi' : 'pink_dark');
    F.drawText(ctx, s, x + 1, y, on ? 'neon_pink' : 'pink_dark');
  }
  var floorGlow = null;
  function bakeLight() {
    if (mask) return;
    mask = G.gfx.bake.layer(W, RH, function (c) {
      for (var y=0;y<RH;y+=2) for(var x=0;x<W;x+=2) {
        if(clearAt(x,y))continue;
        var lamp=Math.max(0,1-Math.pow((x-LAMP[0])/100,2)-Math.pow((y-LAMP[1]+8)/95,2));
        var desk=Math.max(0,1-Math.pow((x-DESK[0])/62,2)-Math.pow((y-DESK[1])/70,2));
        c.globalAlpha=.49-Math.max(lamp*.38,desk*.37);c.fillStyle=P.shop117_edge;c.fillRect(x,y,2,2);
      } c.globalAlpha=1;
    });
    floorGlow=G.gfx.bake.layer(W,RH,function(c){
      for(var y=ty(2);y<ty(7);y+=2)for(var x=T;x<W-T;x+=2){
        var a=Math.max(0,1-Math.pow((x-LAMP[0]-28)/88,2)-Math.pow((y-ty(5))/46,2));
        var b=Math.max(0,1-Math.pow((x-DESK[0]+15)/65,2)-Math.pow((y-ty(4))/31,2));
        c.globalAlpha=Math.max(a*.19,b*.13);c.fillStyle=P.shop117_lamp;c.fillRect(x,y,2,2);
      }c.globalAlpha=1;
    });
  }
  function drawLight(ctx, env, t, rusty, ox, oy) {
    var i;
    if (env.night > 0.02) {
      bakeLight();
      ctx.globalAlpha = env.night; ctx.drawImage(mask, ox, oy); ctx.globalAlpha = 1;
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.45 * env.night;                 // dust in the lamplight
      for (i = 0; i < 11; i++) {
        var a = t * (0.05 + i * 0.011) + i * 2.1, r = 10 + (i * 7) % 34;
        ctx.fillRect(Math.round(ox + LAMP[0] + 24 + Math.cos(a) * r * 1.1), Math.round(oy + LAMP[1] - 20 + Math.sin(a * 1.3) * r * 0.8), 1, 1);
      }
      ctx.globalAlpha = 1;
    } else if (env.grey > 0.02) { ctx.globalAlpha = 0.07 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(ox + T, oy + TOP + 2, W - 2 * T, RH - TOP - 2); ctx.globalAlpha = 1; }
    for(i=0;i<cable.length;i++){var bulb=cable[i];ctx.fillStyle=P.shop117_metal_dk;ctx.fillRect(ox+bulb[0],oy+bulb[1],2,2);ctx.fillStyle=P[i%4===0?'shop117_cloth':'shop117_lamp'];ctx.fillRect(ox+bulb[0],oy+bulb[1]+2,1,2);}
    moths(ctx, env, t, ox, oy);
    K.lavaLamp(ctx, ox + tx(6) + 22, oy + ty(1) - 30, t, true, env.night);             // Phase 64: on top of the gear shelf
    if (tvRect) K.glare(ctx, ox + tvRect[0], oy + tvRect[1], tvRect[2], tvRect[3]);
    // The floor lamp's shade, lit at night.
    if(env.night>.3){ctx.globalAlpha=env.night*.3;ctx.fillStyle=P.shop117_lamp;ctx.fillRect(ox+tx(3)+10,oy+ty(5)-53,11,12);ctx.globalAlpha=1;}
    // The tank's bubbles; steam from Rusty's cup; smoke from the ashtray.
    ctx.fillStyle = P.water_foam;
    for (i = 0; i < 4; i++) { var u = (t * 0.5 + i / 4) % 1; ctx.fillRect(ox + tx(1) + 26 - (i % 2), oy + ty(5) + 11 - Math.floor(u * 15), 1, 1); }
    var cupX = ox + tx(9) + 22, cupY = oy + ty(3) - 4;
    if (!rusty || rusty.fr !== 2) {
      ctx.fillStyle = P.outline; ctx.fillRect(cupX - 1, cupY - 1, 6, 6); ctx.fillStyle = P.cream; ctx.fillRect(cupX, cupY, 4, 4); ctx.fillStyle = P.paper_dark; ctx.fillRect(cupX + 3, cupY + 1, 1, 3);
      ctx.fillStyle = P.fog_light;
      for (i = 0; i < 3; i++) { var v = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.5 * (1 - v); ctx.fillRect(cupX + 2 + Math.round(Math.sin(v * 6 + i)), cupY - 2 - Math.floor(v * 10), 1, 1); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = P.stone_hi;
    for (i = 0; i < 3; i++) { var s = (t * 0.25 + i / 3) % 1; ctx.globalAlpha = 0.4 * (1 - s); ctx.fillRect(ox + tx(8) + 42 + Math.round(Math.sin(s * 5 + i * 2) * 2), oy + ty(3) + 2 - Math.floor(s * 18), 1, 1); }
    ctx.globalAlpha = 1;
  }
  // Phase 64: the varnished boards give back what is lit: the floor lamp's shade at night, the
  // cooler's glass, the lava lamp on the counter's top; the windows give back the lamps.
  function reflections(ctx, env, t, ox, oy) {
    var n = env.night;
    bakeLight();ctx.globalAlpha=.4+.6*n;ctx.drawImage(floorGlow,ox,oy);ctx.globalAlpha=1;
    for (var i = 0; i < WINS.length; i++) { var g = glassRect(i); K.glassLamps(ctx, ox + g[0], oy + g[1], g[2], g[3], n); }
  }
  // Moths round the floor lamp's shade and the banker's lamp at night.
  function moths(ctx, env, t, ox, oy) {
    if (env.night < 0.4) return;
    ctx.fillStyle = P.paper;
    for (var i = 0; i < 3; i++) {
      var a = t * (2.1 + i * 0.7) + i * 2, L = i < 2 ? LAMP : DESK, r = i < 2 ? 7 + i * 3 : 5;
      ctx.fillRect(Math.round(ox + L[0] + Math.cos(a) * r), Math.round(oy + L[1] - (i < 2 ? 22 : 8) + Math.sin(a * 1.7) * r * 0.6), 1 + (Math.floor(t * 12 + i) & 1), 1);
    }
  }
  var bp = [];
  function bulbPts(ox, oy) { if (bp.length !== cable.length) { bp.length = 0; for (var i = 0; i < cable.length; i++) bp.push([0, 0]); } for (i = 0; i < cable.length; i++) { bp[i][0] = ox + cable[i][0]; bp[i][1] = oy + cable[i][1]; } return bp; }

  // Draws the room, the glass, Rusty behind his counter, the props, the dog and the fisher in
  // order of their feet. rusty: {face, fr} (Phase 37); stock: what the shelves hold (38); env:
  // the hour, the light and the strange (39).
  var order = [];
  function draw(ctx, st, t, hour, rusty, stock, env) {
    var ox = OX, oy = OY - TOP, i;
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    ctx.drawImage(bake(), ox, oy);
    if (env) drawLive(ctx, env, t, rusty, ox, oy);
    else ctx.drawImage(front, ox, oy);
    if (stock) drawStock(ctx, stock, t, ox, oy);
    if (env) reflections(ctx, env, t, ox, oy);
    // Everything that stands, in order of its feet.
    var f = R.walkers(st, T, ox, oy - 0 + TOP), fr = R.frames(st);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    if (rusty) order.push(ty(3) - 2, 100);
    order.push(f[3] - oy, 101, f[1] - oy + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {                              // a small sort, no allocation
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) { ctx.drawImage(props[id].img, ox + props[id].x, oy + props[id].y); if (props[id].live) props[id].live(ctx, ox + props[id].x, oy + props[id].y, t, env); }
      else if (id === 100) drawFigure(ctx, 'rusty', rusty.face, rusty.fr, ox + tx(RUSTY[0]) + 16, oy + ty(3) - 2);
      else if (id === 101) drawFigure(ctx, 'dog', st.dog.face, fr[1], f[2], f[3]);
      else drawFigure(ctx, 'fisher', st.face, fr[0], f[0], f[1]);
    }
    if (env) drawLight(ctx, env, t, rusty, ox, oy);
  }

  // Shop figures have their own native geometry; cabin figures and their cache are untouched.
  var figures = {};
  function shopLook(kind, lk) {
    var list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers;
    return typeof lk === 'object' && lk ? lk : G.data.lookOf(list, lk || (G.state.save.look && G.state.save.look[kind]));
  }
  function sprite(kind, dir, fr, lk) {
    var L = shopLook(kind, lk), key = kind + L.id + dir + fr;
    if (figures[key]) return figures[key];
    if (dir === 'left') return (figures[key] = G.gfx.bake.flipped(sprite(kind, 'right', fr, L), 'x'));
    var side = dir === 'right', back = dir === 'up', dog = kind === 'dog', s = dog ? L.size : 1;
    var raw = X.grid(dog ? Math.ceil((side ? 40 : 32) * s) + 1 : 32, dog ? Math.ceil(32 * s) + 1 : 48);
    var g = dog ? X.scaled(raw, s) : raw, stride = fr === 1 ? 2 : fr === 2 ? -2 : 0;
    if (dog) {
      var C = L.coat, E = L.ear, M = L.muzzle, sit = fr === 3;
      if (side) {
        g.poly([[7,20],[10,15],[25,15],[29,19],[27,25],[10,25]], C[1]);
        g.rect(C[2],11,16,13,3); g.rect(C[0],10,24,16,2);
        g.line(C[1],9,19,4,sit ? 25 : 14); g.line(C[2],5,15,3,L.tail === 'curl' ? 11 : 16);
        for (var leg=0;leg<2;leg++) { var xx=leg ? 25 : 11, step=leg ? -stride : stride; g.rect(L.paleLegs ? M[1] : C[0],xx+step,24,3,sit ? 5 : 6); g.rect(M[2],xx+step,29,4,1); }
        g.poly([[23,15],[24,8],[30,7],[34,11],[34,15],[37,16],[36,20],[29,21]],C[1]);
        g.rect(M[1],31,16,6,3); g.rect(E[1],24,10,4,L.ears === 'prick' ? 4 : 10); g.set('shop117_edge',32,12); g.rect('shop117_edge',36,16,2,2);
        if(L.ears==='prick')g.poly([[24,10],[24,4],[28,9]],E[0]);
      } else {
        g.poly([[10,17],[22,17],[24,25],[21,29],[11,29],[8,25]],C[1]); g.rect(L.chest,13,21,6,6);
        g.rect(M[1],10+stride,27,4,3); g.rect(M[1],18-stride,27,4,3);
        g.poly([[10,9],[14,7],[20,7],[23,10],[22,20],[18,23],[12,21],[9,17]],back ? C[0] : C[1]);
        g.rect(E[1],8,10,4,L.ears==='prick'?4:10);g.rect(E[0],21,10,4,L.ears==='prick'?4:10);
        if(L.ears==='prick'){g.poly([[9,11],[10,4],[14,9]],E[0]);g.poly([[19,9],[23,4],[24,12]],E[0]);}
        if(!back){g.rect(M[1],12,16,9,4);g.set('shop117_edge',12,13);g.set('shop117_edge',20,13);g.rect('shop117_edge',15,16,3,2);if(L.face)g.rect(M[2],16,9,2,7);}
      }
      if(L.curly)for(var ci=0;ci<6;ci++)g.rect(C[2],10+(ci*7)%15,18+(ci*3)%7,2,2);
    } else {
      var rusty=kind==='rusty', CO=rusty?['shop117_clay_dk','shop117_clay','shop117_clay_hi']:L.coat;
      var SK=rusty?['skin_shadow','flesh','skin_hi','bone']:L.skin, HK=rusty?['shop117_paint_dk','shop117_paint','shop117_paint_hi']:L.hatKeys;
      var tr=rusty?'denim_dark':L.trousers;
      g.rect(tr,11,35,5,9-Math.max(0,stride));g.rect(tr,18,35,5,9-Math.max(0,-stride));
      g.rect('shop117_edge',10,43-Math.max(0,stride),7,3);g.rect('shop117_edge',18,43-Math.max(0,-stride),7,3);
      g.poly([[10,23],[22,23],[24,26],[23,36],[10,36],[8,27]],CO[1]);g.rect(CO[2],11,24,3,9);g.rect(CO[0],21,25,3,11);
      g.rect(CO[1],7,26+stride,4,10);g.rect(CO[0],24,26-stride,3,10);g.rect(SK[1],7,35+stride,3,3);g.rect(SK[0],24,35-stride,3,3);
      if(!back){g.rect(CO[0],16,25,1,11);g.rect(CO[0],11,30,4,3);g.rect(CO[2],11,30,4,1);g.set('shop117_metal_hi',17,28);}
      else {g.rect(CO[0],11,26,11,1);g.rect(CO[2],11,24,10,1);}
      if(L.check && !rusty)for(var ch=0;ch<3;ch++)g.rect(L.check,11,27+ch*3,10,1);
      g.rect(SK[0],14,21,5,3);
      g.poly([[11,10],[20,10],[23,13],[23,20],[20,23],[13,23],[10,20],[9,14]],back?(rusty?'shop117_cloth_dk':L.hair):SK[1]);
      if(!back){g.rect(SK[2],11,13,3,7);g.rect(SK[0],21,14,2,6);g.rect(SK[1],side?23:9,16,2,4);if(fr!==1||!rusty){g.set('shop117_edge',side?20:13,16);if(!side)g.set('shop117_edge',20,16);}g.rect(SK[0],side?22:16,18,2,2);g.rect('shop117_clay_dk',side?19:15,21,4,1);
        if(rusty||L.beard){var beard=rusty?'shop117_paper':L.beard[1];g.poly([[11,19],[14,21],[20,21],[23,18],[21,24],[15,25],[11,22]],beard);}
        if(rusty){g.rect('shop117_metal_dk',11,15,5,3);g.rect('shop117_metal_dk',18,15,5,3);g.rect('shop117_metal_hi',12,16,3,1);g.set('shop117_metal_hi',19,16);g.set('shop117_metal_dk',16,16);}
      }
      var hat=rusty?'cap':L.hat;
      g.poly([[10,10],[12,7],[20,7],[23,10],[23,13],[10,13]],HK[1]);g.rect(HK[2],12,8,6,2);g.rect(HK[0],10,12,14,2);
      if(hat==='cap')g.rect(HK[0],side?19:10,13,side?9:15,2);
      if(hat==='bucket'){g.rect(HK[1],8,13,18,2);g.rect(HK[0],9,15,16,1);}
      if(hat==='knit')g.rect(HK[2],11,12,12,2);
      if(hat==='lamp'){g.rect('shop117_edge',15,10,5,4);g.rect('shop117_lamp',16,11,3,2);}
      if(rusty&&fr===2){g.rect(CO[0],20,24,6,4);g.rect('shop117_paper',21,22,4,4);}
      if(rusty&&fr===3){g.rect('shop117_paper',10,29,16,6);g.rect('shop117_cloth_dk',12,31,5,1);g.rect('shop117_cloth_dk',19,31,5,1);}
    }
    raw.outline('shop117_edge'); return (figures[key]=raw.canvas());
  }
  function prebake(kind, lk) { var dirs=['down','up','right','left'];for(var d=0;d<4;d++)for(var f=0;f<4;f++)sprite(kind,dirs[d],f,lk); }
  function drawFigure(ctx,kind,dir,fr,x,y) {var a=R.anchor(kind,dir);R.shadow(ctx,x,y,kind==='dog'?16:18);ctx.drawImage(sprite(kind,dir,fr),Math.round(x-a[0]),Math.round(y-a[1]));}

  return { T: T, COLS: COLS, ROWS: ROWS, OX: OX, OY: OY, TOP: TOP, STEP: STEP, MAP: MAP, OBJECTS: OBJECTS, DOOR: DOOR, MAT: MAT, RUSTY: RUSTY,
    create: WK.create, step: WK.step, facing: WK.facing, isBlocked: WK.isBlocked, draw: draw, bake: bake, sprite: sprite, prebake: prebake,
    bakeMs: function () { return bakeMs; }, blocked: WK.blocked, shown: function () { return shown; },
    // Phase 64 (dbg.roomLife): the live things in the room.
    life: function () { var n = 0; for (var i = 0; i < (props || []).length; i++) if (props[i].live) n++; return { room: 'shop', stylePhase: 121, study: ['wall/floor bay', 'linen lamp', 'enamel counter corner', 'faceted monstera'], live: n, things: ['lava lamp on the gear shelf', 'cat on the freezer', 'cooler', 'moths', 'reflections', 'glare'] }; } };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  return G.core.state.sceneName() === 'shop' ? 'shop style 117: procedural wall/floor, lamp, counter corner, plant study' : '';
});
