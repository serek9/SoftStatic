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

  // Phase 15: a larger, shaded rowboat (34×8) with a rust stripe and an outboard motor at the
  // stern, and a larger fisher (10×13) in a red cap and a field jacket, hands on the rod.
  // Both face right; the hull's last two rows sit below the waterline.
  S.def('boat_hull', { k: 'wood_dark', w: 'wood', h: 'wood_hi', r: 'rust', d: 'ink' }, [
    '...............................hk.',
    'k.............................hhk.',
    'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhk.',
    'kwwwwwdwwwwwwwdwwwwwwwwdwwwwwwwwk.',
    'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk..',
    'krrrrrrrrrrrrrrrrrrrrrrrrrrrrrk...',
    '.kwwwwwwwwwwwwwwwwwwwwwwwwwwwk....',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkk.....'
  ]);
  S.def('motor', { m: 'stone', j: 'stone_hi', k: 'ink' }, [
    '.mmm.', 'mjjmk', 'mjmmk', '.mmk.', '..k..', '..k..', '..k..', '.kkk.'
  ]);
  S.def('fisher', { c: 'cap', b: 'rust_dark', h: 'stone_dark', f: 'flesh', F: 'flesh_dark', e: 'ink', o: 'coat', O: 'coat_hi', d: 'coat_dark' }, [
    '...ccc....',
    '..ccccc...',
    '..cccccbb.',
    '..hffff...',
    '..hfefF...',
    '..hffFF...',
    '...fFF....',
    '..oooooo..',
    '.ooOooooo.',
    '.ooOoooooF',
    '.oooooo...',
    '.oooooo...',
    '.dddddd...'
  ]);

  // Bought gear shows on the boat (audit P1-5): a lantern on the bow pole that glows at
  // night, a rod whose colour follows its tier, and the depth finder's small blinking light.
  S.def('lantern', { k: 'stone_dark', g: 'lamp_glow', s: 'stone' }, ['.k.', 'kgk', 'kgk', '.s.']);
  var ROD_KEYS = ['stone_hi', 'wood_hi', 'rust_hi', 'moss_hi', 'bone'];
  var halo = null;

  // A soft round glow in dusk_high (the ceiling), baked once; drawn at low alpha at night.
  function bakeHalo() {
    var R = 15, cv = G.gfx.bake.canvas(R * 2 + 1, R * 2 + 1), ctx = cv.getContext('2d');
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

  // Audit P2-2: the fisher with the thermos cup at the mouth.
  S.def('fisher_sip', { c: 'cap', b: 'rust_dark', h: 'stone_dark', f: 'flesh', F: 'flesh_dark', e: 'ink', o: 'coat', O: 'coat_hi', d: 'coat_dark', k: 'stone' }, [
    '...ccc....',
    '..ccccc...',
    '..cccccbb.',
    '..hffff...',
    '..hfefF...',
    '..hffFFk..',
    '...fFFkF..',
    '..oooooF..',
    '.ooOoooo..',
    '.ooOoooo..',
    '.oooooo...',
    '.oooooo...',
    '.dddddd...'
  ]);

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
    var steps = ROD.len + 4;
    ctx.fillStyle = S.PALETTE[key || 'stone_hi'];
    for (var i = 0; i <= steps; i++) {
      var u = i / steps, v = 1 - u;
      ctx.fillRect(Math.round(v * v * bx + 2 * u * v * mx + u * u * tx), Math.round(v * v * by + 2 * u * v * my + u * u * ty), 1, 1);
    }
  }

  // sx is the boat centre on screen, wy the waterline. Passengers sit behind the hull's
  // gunwale, so they are drawn first. withFisher false leaves the boat empty, rod and all (P10.2).
  // gear (optional): {rod: tier, lantern: bool, finder: bool, night: 0..1}.
  function draw(ctx, b, sx, wy, withFisher, drawDog, rodAngle, rodBend, gear) {
    var flip = b.facing < 0, y = wy + bob(b), f = b.facing, P = S.PALETTE;
    if (withFisher) {
      var sip = gear && gear.sip;
      S.draw(ctx, sip ? 'fisher_sip' : 'fisher', flip ? sx - 3 : sx - 6, y - 15, 0, flip);
      if (sip) { // steam from the cup, rising and thinning
        ctx.fillStyle = P.fog_light;
        for (var k = 0; k < 3; k++) {
          var u = (b.t * 0.8 + k / 3) % 1, cx = flip ? sx - 1 : sx + 1;
          ctx.globalAlpha = 0.5 * (1 - u);
          ctx.fillRect(cx + Math.round(Math.sin(u * 6 + k) * 1), y - 11 - Math.round(u * 6), 1, 1);
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
      ctx.fillRect(f > 0 ? px - 2 : px, y - 18, 3, 1);
      var lx = px - f * 2;
      if (gear.night > 0) {
        if (!halo) halo = bakeHalo();
        ctx.globalAlpha = gear.night;
        ctx.drawImage(halo, lx - 15, y - 30);
        ctx.globalAlpha = 1;
      }
      S.draw(ctx, 'lantern', lx - 1, y - 17, 0, false);
    }
    S.draw(ctx, 'motor', flip ? sx + 16 : sx - 21, y - 7, 0, flip);
    S.draw(ctx, 'boat_hull', sx - 17, y - 6, 0, flip);
    if (gear && gear.finder && (Math.floor(b.t * 1.25) & 1)) {
      ctx.fillStyle = P.neon_teal; ctx.fillRect(sx - f * 10, y - 4, 1, 1);
    }
    // Contact shadow on the water under the hull (below the waterline, so the mirror pass,
    // which only keeps rows above it, never shows it).
    ctx.globalAlpha = 0.5; ctx.fillStyle = P.water_deep;
    ctx.fillRect(sx - 15, wy + 2, 30, 1); ctx.fillRect(sx - 11, wy + 3, 22, 1);
    ctx.globalAlpha = 1;
  }

  // World x of the stern, where the wake starts.
  function stern(b) { return b.x - b.facing * 19; }

  return { P: P, ROD: ROD, create: create, step: step, draw: draw, bob: bob, stern: stern, rodTip: rodTip };
})();
