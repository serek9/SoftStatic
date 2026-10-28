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
  function drawRod(ctx, b, sx, wy, angle, bend) {
    var a = angle * Math.PI / 180, f = b.facing;
    var bx = sx + f * ROD.baseX, by = wy + bob(b) + ROD.baseY;
    var tx = bx + f * Math.cos(a) * ROD.len, ty = by - Math.sin(a) * ROD.len;
    var mx = (bx + tx) / 2 + f * Math.sin(a) * bend, my = (by + ty) / 2 + Math.cos(a) * bend;
    var steps = ROD.len + 4;
    ctx.fillStyle = S.PALETTE.stone_hi;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps, v = 1 - u;
      ctx.fillRect(Math.round(v * v * bx + 2 * u * v * mx + u * u * tx), Math.round(v * v * by + 2 * u * v * my + u * u * ty), 1, 1);
    }
  }

  // sx is the boat centre on screen, wy the waterline. Passengers sit behind the hull's
  // gunwale, so they are drawn first. withFisher false leaves the boat empty, rod and all (P10.2).
  function draw(ctx, b, sx, wy, withFisher, drawDog, rodAngle, rodBend) {
    var flip = b.facing < 0, y = wy + bob(b);
    if (withFisher) {
      S.draw(ctx, 'fisher', flip ? sx : sx - 7, y - 8, 0, flip);
      drawRod(ctx, b, sx, wy, rodAngle, rodBend);
    }
    if (drawDog) drawDog(ctx, flip ? sx - 14 : sx + 3, y - 8, flip);
    S.draw(ctx, 'boat_hull', sx - 13, y - 4, 0, flip);
  }

  // World x of the stern, where the wake starts.
  function stern(b) { return b.x - b.facing * 12; }

  return { P: P, ROD: ROD, create: create, step: step, draw: draw, bob: bob, stern: stern, rodTip: rodTip };
})();
