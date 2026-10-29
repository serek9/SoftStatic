var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The boat (V3.1): smooth acceleration and drag, a slow drift when idle, a 1 px bob,
// and the "nearly stopped" flag that later gates casting.
G.scene = G.scene || {};
G.scene.boat = (function () {
  var S = G.gfx.sprites;
  var P = {
    accel: 70,       // px/s² while a direction is held
    reverse: 110,    // px/s² when holding against the current motion
    maxV: 42,        // px/s
    drag: 1.4,       // 1/s, how fast speed relaxes toward the drift when nothing is held
    driftV: 1.2,     // px/s, peak idle drift
    driftRate: 0.13, // rad/s, how slowly the drift changes direction
    stopV: 2.5,      // px/s, below this the boat counts as nearly stopped
    margin: 16       // px kept from each world edge
  };

  function rep(ch, n) { var s = ''; while (n-- > 0) s += ch; return s; }

  // Phase 18: the boat, the fisher and the gear are painted in the 640×360 view's pixels
  // (HI per world pixel) and drawn at 1/HI size, in the same world boxes as before: a wooden
  // rowboat with lapped planks, a lit gunwale, a rust stripe and an outboard motor; the
  // fisher in a red cap and a green field jacket, hands on the rod; a lantern on a pole.
  // Each faces right; mirrored copies are made on first use.
  var A = G.gfx.paint, HI = 2;
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi'], STONES = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var COAT = ['ink', 'coat_dark', 'coat', 'coat_hi'], SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], CAP = ['rust_dark', 'cap', 'rust_hi'];
  var ART = {
    hull: { w: 68, h: 16, paint: function (c) {
      // Per column: the gunwale rises to the bow; the bottom sweeps up to meet it at the bow
      // and rounds off at the stern. Lapped planks follow the gunwale; a rust stripe.
      A.area(c, 0, 0, 68, 16, function (x, y) {
        var top = Math.max(0, Math.round(4 - Math.max(0, x - 54) * 0.55));
        var bot = Math.round(15 - Math.max(0, 6 - x) * 0.9 - Math.max(0, x - 50) * 0.5 - Math.max(0, x - 60) * 0.4);
        if (y < top || y > bot || x > 66) return '';
        var r = y - top;
        if (y === bot || x === 0 || (x > 60 && y === top + 1 && x === 66)) return 'ink';
        if (r === 0) return 'wood_hi';
        if (r === 1) return 'wood_mid';
        if (r === 5 || r === 6) return r === 5 ? 'rust_hi' : 'rust';
        if (r % 3 === 1) return 'wood_dark';                                        // the lapped planks
        if (y >= bot - 1) return 'wood_deep';
        return r > 8 ? 'wood_dark' : 'wood';
      });
      A.box(c, 'wood_lit', 4, 4, 48, 1);
      for (var x = 12; x < 52; x += 13) A.px(c, 'stone_hi', x, 6);                   // oarlock and rivets
      A.box(c, 'wood_deep', 20, 2, 3, 2); A.box(c, 'wood_dark', 20, 1, 3, 1);          // an oarlock
    } },
    motor: { w: 10, h: 16, paint: function (c) {
      A.blob(c, 5, 4, 4.5, 3.8, STONES, { bias: 0.15 }); A.box(c, 'stone_dark', 1, 6, 8, 2);
      A.box(c, 'rust_hi', 2, 3, 5, 1);
      A.slab(c, 4, 8, 3, 6, STONES); A.slab(c, 2, 13, 7, 3, STONES);
    } },
    fisher: { w: 20, h: 26, paint: function (c, sip) {
      // Jacket: shoulders, a back, the arms reaching forward to the rod (or the cup).
      A.blob(c, 9, 19, 8, 8, COAT, { bias: 0.05 });
      A.box(c, 'coat_dark', 3, 20, 2, 6);
      A.limb(c, 12, 15, 16, 19, 2.6, COAT, 0.1);
      if (!sip) { A.limb(c, 15, 19, 18, 18, 2.2, COAT, 0.1); A.blob(c, 18.5, 18, 1.8, 1.6, SKIN, { bias: 0.1 }); }
      else { A.limb(c, 14, 18, 15, 13, 2.2, COAT, 0.1); A.blob(c, 15, 12, 1.6, 1.6, SKIN); A.slab(c, 15, 9, 3, 4, STONES); }
      A.box(c, 'coat_hi', 5, 14, 6, 1);
      // Head, collar, a stubbled jaw, the cap with its brim forward.
      A.box(c, 'coat_dark', 6, 13, 8, 2);
      A.blob(c, 10, 9, 4.5, 4.8, SKIN, { bias: 0.1 });
      A.box(c, 'skin_shadow', 10, 12, 4, 1); A.px(c, 'skin_shadow', 13, 11);
      A.px(c, 'ink', 12, 8); A.px(c, 'skin_hi', 13, 9); A.px(c, 'flesh_dark', 7, 9);
      A.blob(c, 9, 4.5, 5, 3.5, CAP, { bias: 0.1 }); A.box(c, 'rust_dark', 4, 6, 10, 1);
      A.box(c, 'cap', 12, 5, 5, 2); A.box(c, 'rust_dark', 12, 6, 5, 1);                 // the brim
      A.box(c, 'stone_dark', 5, 7, 2, 4);                                              // hair at the back
    } },
    lantern: { w: 6, h: 8, paint: function (c) {
      A.box(c, 'stone_dark', 2, 0, 2, 1); A.box(c, 'stone_dark', 1, 1, 4, 1);
      A.box(c, 'stone_dark', 0, 2, 6, 5); A.box(c, 'lamp_glow', 1, 2, 4, 4); A.box(c, 'cream', 2, 3, 1, 2);
      A.box(c, 'stone', 1, 7, 4, 1);
    } }
  };
  var art = {};
  function img(name, flip, arg) {
    var key = name + (arg ? '+' : '') + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(img(name, false, arg), 'x'));
    var a = ART[name];
    return (art[key] = G.gfx.bake.layer(a.w, a.h, function (c) { A.reset(); a.paint(c, arg); A.reset(); }));
  }
  // Draws a painted image at world (x, y), at 1/HI size.
  function put(ctx, cv, x, y) { ctx.drawImage(cv, x, y, cv.width / HI, cv.height / HI); }

  var ROD_KEYS = ['stone_hi', 'wood_hi', 'rust_hi', 'moss_hi', 'bone'];
  var halo = null;

  // A soft round glow in dusk_high (the ceiling), baked once; drawn at low alpha at night.
  function bakeHalo() {
    var R = 30, cv = G.gfx.bake.canvas(R * 2 + 1, R * 2 + 1), ctx = cv.getContext('2d');
    ctx.fillStyle = S.PALETTE.dusk_high;
    for (var y = -R; y <= R; y++) {
      for (var x = -R; x <= R; x++) {
        var d = Math.sqrt(x * x + y * y) / R;
        if (d > 1) continue;
        ctx.globalAlpha = Math.round((1 - d) * (1 - d) * 4) / 10; // 4 stepped rings, 0.4 at most
        ctx.fillRect(x + R, y + R, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    return cv;
  }

  function create(x) { return { x: x, vx: 0, t: 0, facing: 1, stopped: true }; }

  // move is the input axis (-1, 0, 1). worldW clamps the boat inside the location.
  function step(b, move, dt, worldW) {
    b.t += dt;
    if (move !== 0) {
      b.vx += move * (b.vx * move < 0 ? P.reverse : P.accel) * dt;
      b.facing = move;
    } else {
      var drift = P.driftV * Math.sin(b.t * P.driftRate);
      b.vx += (drift - b.vx) * Math.min(1, P.drag * dt);
    }
    if (b.vx > P.maxV) b.vx = P.maxV;
    else if (b.vx < -P.maxV) b.vx = -P.maxV;
    b.x += b.vx * dt;
    if (b.x < P.margin) { b.x = P.margin; if (b.vx < 0) b.vx = 0; }
    else if (b.x > worldW - P.margin) { b.x = worldW - P.margin; if (b.vx > 0) b.vx = 0; }
    b.stopped = Math.abs(b.vx) < P.stopV;
  }

  function bob(b) { return Math.round(Math.sin(b.t * 1.9) * 0.8); }

  // The rod: a straight 22 px pole from the fisher's hands (Phase 15: the larger fisher's).
  // angle is in degrees up from the facing direction (90 = straight up, above 90 leans back).
  var ROD = { len: 22, baseX: 3, baseY: -6 };

  // Writes the rod tip into out for a boat centred at cx (world or screen) with waterline wy.
  function rodTip(b, cx, wy, angle, out) {
    var a = angle * Math.PI / 180, f = b.facing;
    out[0] = cx + f * ROD.baseX + f * Math.cos(a) * ROD.len;
    out[1] = wy + bob(b) + ROD.baseY - Math.sin(a) * ROD.len;
    return out;
  }

  // Draws the rod as a quadratic curve. bend > 0 bows its middle forward and down
  // (loaded), bend < 0 bows it back (the whip of a cast). The tip stays where rodTip says.
  function drawRod(ctx, b, sx, wy, angle, bend, key) {
    var a = angle * Math.PI / 180, f = b.facing;
    var bx = sx + f * ROD.baseX, by = wy + bob(b) + ROD.baseY;
    var tx = bx + f * Math.cos(a) * ROD.len, ty = by - Math.sin(a) * ROD.len;
    var mx = (bx + tx) / 2 + f * Math.sin(a) * bend, my = (by + ty) / 2 + Math.cos(a) * bend;
    var steps = (ROD.len + 4) * HI;
    ctx.fillStyle = S.PALETTE[key || 'stone_hi'];
    for (var i = 0; i <= steps; i++) {
      var u = i / steps, v = 1 - u;
      ctx.fillRect(Math.round((v * v * bx + 2 * u * v * mx + u * u * tx) * HI) / HI, Math.round((v * v * by + 2 * u * v * my + u * u * ty) * HI) / HI, 1 / HI, i < steps * 0.25 ? 2 / HI : 1 / HI);
    }
    ctx.fillStyle = S.PALETTE.ink;                                                     // the reel
    ctx.fillRect(Math.round((bx + f * 2.5) * HI) / HI - 1, Math.round((by + 0.5) * HI) / HI, 2, 1.5);
  }

  // sx is the boat centre on screen, wy the waterline. Passengers sit behind the hull's
  // gunwale, so they are drawn first. withFisher false leaves the boat empty, rod and all (P10.2).
  // gear (optional): {rod: tier, lantern: bool, finder: bool, night: 0..1}.
  function draw(ctx, b, sx, wy, withFisher, drawDog, rodAngle, rodBend, gear) {
    var flip = b.facing < 0, y = wy + bob(b), f = b.facing, P = S.PALETTE;
    if (withFisher) {
      var sip = gear && gear.sip;
      put(ctx, img('fisher', flip, sip), flip ? sx - 3 : sx - 6, y - 15);
      if (sip) { // steam from the cup, rising and thinning
        ctx.fillStyle = P.fog_light;
        for (var k = 0; k < 4; k++) {
          var u = (b.t * 0.8 + k / 4) % 1, cx = flip ? sx - 2.5 : sx + 2.5;
          ctx.globalAlpha = 0.5 * (1 - u);
          ctx.fillRect(cx + Math.round(Math.sin(u * 6 + k) * 2) / HI, y - 11.5 - Math.round(u * 12) / HI, 1 / HI, 1 / HI);
        }
        ctx.globalAlpha = 1;
      }
      drawRod(ctx, b, sx, wy, rodAngle, rodBend, gear ? ROD_KEYS[Math.min(gear.rod, ROD_KEYS.length - 1)] : null);
    }
    if (drawDog) drawDog(ctx, flip ? sx - 16 : sx + 4, y - 14, flip);
    if (gear && gear.lantern) {
      var px = sx - f * 13;                                   // a pole at the stern, its arm out back
      ctx.fillStyle = P.wood_dark;
      ctx.fillRect(px, y - 18, 1, 15);
      ctx.fillRect(f > 0 ? px - 2 : px, y - 18, 3, 1 / HI);
      ctx.fillStyle = P.wood; ctx.fillRect(px, y - 18, 1 / HI, 15);
      var lx = px - f * 2;
      if (gear.night > 0) {
        if (!halo) halo = bakeHalo();
        ctx.globalAlpha = gear.night;
        ctx.drawImage(halo, lx - 15, y - 30, 30.5, 30.5);
        ctx.globalAlpha = 1;
      }
      put(ctx, img('lantern', false), lx - 1.5, y - 17.5);
    }
    put(ctx, img('motor', flip), flip ? sx + 16 : sx - 21, y - 7);
    put(ctx, img('hull', flip), sx - 17, y - 6);
    if (gear && gear.finder && (Math.floor(b.t * 1.25) & 1)) {
      ctx.fillStyle = P.neon_teal; ctx.fillRect(sx - f * 10, y - 3.5, 1, 1 / HI);
    }
    // Contact shadow on the water under the hull (below the waterline, so the mirror pass,
    // which only keeps rows above it, never shows it).
    ctx.globalAlpha = 0.5; ctx.fillStyle = P.water_deep;
    ctx.fillRect(sx - 15, wy + 2, 30, 1 / HI); ctx.fillRect(sx - 13, wy + 2.5, 26, 1 / HI); ctx.fillRect(sx - 11, wy + 3, 22, 1 / HI);
    ctx.globalAlpha = 1;
  }

  // World x of the stern, where the wake starts.
  function stern(b) { return b.x - b.facing * 19; }

  return { P: P, ROD: ROD, create: create, step: step, draw: draw, bob: bob, stern: stern, rodTip: rodTip };
})();
