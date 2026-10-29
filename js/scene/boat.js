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

  S.def('boat_hull', { r: 'rust_hi', k: 'wood_dark', w: 'wood' }, [
    rep('.', 24) + 'r.',
    'r' + rep('.', 22) + 'rr.',
    'k' + rep('r', 24) + '.',
    'k' + rep('w', 23) + 'k.',
    '.k' + rep('w', 21) + 'k..',
    '..' + rep('k', 21) + '...'
  ]);

  S.def('fisher', { h: 'stone_dark', f: 'flesh_dark', c: 'rust' }, [
    '..hhh..',
    '.hhhhh.',
    '.hhhff.',
    '.hhfff.',
    '..hcc..',
    '.ccccc.',
    'ccccccc',
    'ccccccc'
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

  // The rod: a straight 16 px pole from the fisher's hands. angle is in degrees up from
  // the facing direction (90 = straight up, above 90 leans back over the stern).
  var ROD = { len: 16, baseX: -1, baseY: -5 };

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
      S.draw(ctx, 'fisher', flip ? sx : sx - 7, y - 8, 0, flip);
      drawRod(ctx, b, sx, wy, rodAngle, rodBend, gear ? ROD_KEYS[Math.min(gear.rod, ROD_KEYS.length - 1)] : null);
    }
    if (drawDog) drawDog(ctx, flip ? sx - 14 : sx + 3, y - 8, flip);
    if (gear && gear.lantern) {
      var px = sx + f * 11;                                   // the bow pole, with an arm forward
      ctx.fillStyle = P.wood_dark;
      ctx.fillRect(px, y - 14, 1, 11);
      ctx.fillRect(f > 0 ? px : px - 2, y - 14, 3, 1);
      var lx = px + f * 2;
      if (gear.night > 0) {
        if (!halo) halo = bakeHalo();
        ctx.globalAlpha = gear.night;
        ctx.drawImage(halo, lx - 15, y - 26);
        ctx.globalAlpha = 1;
      }
      S.draw(ctx, 'lantern', lx - 1, y - 13, 0, false);
    }
    S.draw(ctx, 'boat_hull', sx - 13, y - 4, 0, flip);
    if (gear && gear.finder && (Math.floor(b.t * 1.25) & 1)) {
      ctx.fillStyle = P.neon_teal; ctx.fillRect(sx - f * 9, y - 3, 1, 1);
    }
    // Contact shadow on the water under the hull (below the waterline, so the mirror pass,
    // which only keeps rows above it, never shows it).
    ctx.globalAlpha = 0.5; ctx.fillStyle = P.water_deep;
    ctx.fillRect(sx - 11, wy + 2, 22, 1); ctx.fillRect(sx - 8, wy + 3, 16, 1);
    ctx.globalAlpha = 1;
  }

  // World x of the stern, where the wake starts.
  function stern(b) { return b.x - b.facing * 12; }

  return { P: P, ROD: ROD, create: create, step: step, draw: draw, bob: bob, stern: stern, rodTip: rodTip };
})();
