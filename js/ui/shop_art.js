var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Phase 116: the user's approved miniature-shop illustration, separated into a clean
// room plate and four-facing characters. Local assets, no runtime image service.
// The original 12x8 walk and shop economy remain owned by shop_room.js and shop.js.
G.ui = G.ui || {};
G.ui.shopArt = (function () {
  var B = G.gfx.bake, P = G.gfx.sprites.PALETTE, R = G.ui.room;
  var W = 384, H = 346, TOP = 90, OX = 128, OY = 5, T = 32;
  var DIRS = ['down', 'right', 'up', 'left'], kinds = ['fisher', 'dog', 'rusty'];
  var loaded = 0, failed = [], room = null, characters = null, dogWalk = null;
  var frames = {}, originals = {}, foreground = [], order = [];
  var windows = [[97, 33, 61, 58], [287, 33, 61, 58]];
  var normal = { hour: 19.2, night: 0.2, grey: 0, rain: 0, fog: 0.46, flash: 0, strange: '', st: 0 };
  var sources = {};

  function load(name, path) {
    var im = new Image();
    im.onload = function () {
      try {
        if (name === 'room') bakeRoom(im);
        else if (name === 'characters') bakeCharacters(im);
        else bakeDog(im);
        loaded++;
        if (ready()) prebake();
      } catch (e) { failed.push(path); if (G.core.debug) G.core.debug.log('shop art: ' + e.message); }
      sources[name] = null;
    };
    im.onerror = function () { failed.push(path); sources[name] = null; };
    sources[name] = im; im.src = path;
  }
  function patch(x, y, w, h, foot, shape, foliage) {
    foreground.push({ x: x, y: y, foot: foot, img: B.layer(w, h, function (c) {
      if (shape) { c.beginPath(); for (var i = 0; i < shape.length; i++) { if (i) c.lineTo(shape[i][0], shape[i][1]); else c.moveTo(shape[i][0], shape[i][1]); } c.closePath(); c.clip(); }
      c.drawImage(room, x, y, w, h, 0, 0, w, h);
      if (foliage) {
        // Crop the overhanging leaves, not a rectangle of floor: a player passing next
        // to the pot must not have half their head erased by the foreground patch.
        var pixels = c.getImageData(0, 0, w, h), data = pixels.data;
        for (var yy = 0; yy < h; yy++) {
          var left = w, right = -1;
          for (var xx = 0; xx < w; xx++) {
            var p = (yy * w + xx) * 4;
            if (data[p + 1] > data[p] * 0.95 && data[p + 1] > data[p + 2] * 1.25 && data[p + 1] > 30) { left = Math.min(left, xx); right = Math.max(right, xx); }
          }
          if (yy >= 38) { left = Math.min(left, 25); right = Math.max(right, 51); }
          for (xx = 0; xx < w; xx++) if (xx < left - 1 || xx > right + 1) data[(yy * w + xx) * 4 + 3] = 0;
        }
        c.putImageData(pixels, 0, 0);
      }
    }) });
  }
  function bakeRoom(im) {
    // The transparent surround is discarded; this crop preserves the approved room's
    // square proportions and fits its tall back wall inside the native 640x360 view.
    room = B.layer(W, H, function (c) { c.drawImage(im, 180, 45, 1090, 1000, 0, 0, W, H); });
    // Clear just the printed clock hands so the clock can still tell the game hour.
    var rc = room.getContext('2d'), g = G.gfx.pix.grid(25, 25);
    g.ell(12, 12, 11.5, 11.5, ['shop_wood_hi', 'shop_gold', 'shop_wood_lit'], { rim: 0.05 });
    for (var tick = 0; tick < 12; tick++) g.set('wood_dark', 12 + Math.sin(tick * Math.PI / 6) * 10, 12 - Math.cos(tick * Math.PI / 6) * 10);
    g.paint(rc, 219, 34);
    patch(244, 161, 121, 58, 219); // counter front, in front of Rusty's legs
    patch(89, 160, 36, 83, 243, [[5,0],[31,0],[36,28],[21,30],[21,73],[30,77],[30,82],[6,82],[6,77],[16,73],[16,30],[0,28]]);
    patch(316, 204, 47, 64, 268); // drinks cabinet
    patch(20, 258, 61, 54, 309);  // freezer and its sleeping cat
    patch(303, 262, 61, 53, 315, null, true); // monstera
  }
  // Extract an equal atlas cell by its opaque content. Ignore stray alpha fringe, which
  // must not move a character's foot anchor or shrink it during a turn.
  function cell(im, columns, rows, col, row, targetH, maxW) {
    var cw = im.width / columns, ch = im.height / rows;
    var raw = B.layer(Math.ceil(cw), Math.ceil(ch), function (c) { c.drawImage(im, col * cw, row * ch, cw, ch, 0, 0, cw, ch); });
    var d = raw.getContext('2d').getImageData(0, 0, raw.width, raw.height).data;
    var x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
    for (var y = 0; y < raw.height; y++) for (var x = 0; x < raw.width; x++) {
      if (d[(y * raw.width + x) * 4 + 3] < 160) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < x0) throw new Error('empty character cell ' + col + ',' + row);
    var scale = Math.min(targetH / (y1 - y0 + 1), maxW / (x1 - x0 + 1));
    var w = Math.max(1, Math.round((x1 - x0 + 1) * scale)), h = Math.max(1, Math.round((y1 - y0 + 1) * scale));
    return B.layer(w, h, function (c) { c.drawImage(raw, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, w, h); });
  }
  function strides(base, kind, dir) {
    for (var fr = 0; fr < 4; fr++) {
      frames[kind + ':' + dir + ':' + fr] = B.layer(base.width + 2, base.height + 2, function (c) {
        var bob = fr === 1 || fr === 2 ? 1 : 0, cut = Math.floor(base.height * 0.8), half = Math.floor(base.width / 2);
        c.drawImage(base, 0, 0, base.width, cut, 1, 1 + bob, base.width, cut);
        c.drawImage(base, 0, cut, half, base.height - cut, 1, 1 + cut + (fr === 1 ? -1 : 0), half, base.height - cut);
        c.drawImage(base, half, cut, base.width - half, base.height - cut, half + 1, cut + 1 + (fr === 2 ? -1 : 0), base.width - half, base.height - cut);
      });
    }
  }
  function bakeCharacters(im) {
    characters = true;
    for (var kind = 0; kind < 3; kind++) for (var col = 0; col < 4; col++) {
      var base = cell(im, 4, 3, col, kind, kind === 1 ? 31 : (kind === 2 ? 68 : 56), kind === 1 ? 34 : (kind === 2 ? 43 : 34));
      strides(base, kinds[kind], DIRS[col]);
    }
  }
  function bakeDog(im) {
    dogWalk = true;
    for (var col = 0; col < 4; col++) for (var row = 0; row < 2; row++) {
      var cv = cell(im, 4, 2, col, row, 30, 38);
      frames['trot:' + DIRS[col] + ':' + (row + 1)] = cv;
    }
  }
  function ready() { return loaded === 3 && !!room && !!characters && !!dogWalk; }
  function miniOriginal(kind, dir, fr, look) {
    var key = kind + ':' + look.id + ':' + dir + ':' + fr;
    if (originals[key]) return originals[key];
    var src = R.sprite(kind, dir, fr, look);
    // Keep all four saved outfits and dog breeds. Non-default looks retain their own
    // hats, faces and coat patterns, with the same compact head/body proportions.
    var scale = kind === 'dog' ? R.dogScale(look) / 0.7 : 1;
    var width = kind === 'dog' ? Math.round(36 * scale) : 34, height = kind === 'dog' ? Math.round(32 * scale) : 47;
    return (originals[key] = B.layer(width, height, function (c) {
      if (kind === 'dog') c.drawImage(src, 0, 0, src.width, src.height, 0, 0, width, height);
      else {
        c.drawImage(src, 6, 0, 20, 19, 1, 0, 32, 25);
        c.drawImage(src, 3, 19, 26, 15, 1, 23, 32, 14);
        c.drawImage(src, 7, 34, 18, 14, 6, 36, 23, 11);
      }
    }));
  }
  function artFor(kind, dir, fr, look, walking) {
    if (look && ((kind === 'fisher' && look.id !== 'red_cap') || (kind === 'dog' && look.id !== 'golden'))) return miniOriginal(kind, dir, fr, look);
    if (kind === 'dog' && walking) return frames['trot:' + dir + ':' + (fr === 2 ? 2 : 1)];
    return frames[kind + ':' + dir + ':' + fr] || frames[kind + ':down:0'];
  }
  function prebake() {
    if (!ready()) return;
    var looks = G.data.looks;
    for (var k = 0; k < 2; k++) {
      var list = k ? looks.dogs : looks.fishers, kind = k ? 'dog' : 'fisher';
      for (var l = 1; l < list.length; l++) for (var d = 0; d < 4; d++) for (var fr = 0; fr < 4; fr++) miniOriginal(kind, DIRS[d], fr, list[l]);
    }
  }
  function figure(c, kind, dir, fr, x, y, look, walking) {
    var im = artFor(kind, dir, fr, look, walking);
    R.shadow(c, x, y, kind === 'dog' ? 22 : 25);
    c.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height));
  }
  function weather(c, env, t) {
    for (var n = 0; n < windows.length; n++) {
      var g = windows[n], x = OX + g[0], y = OY + g[1];
      c.fillStyle = P.night_blue; c.globalAlpha = env.night * 0.42; c.fillRect(x, y, g[2], g[3]); c.globalAlpha = 1;
      if (env.fog > 0.2) { c.globalAlpha = Math.max(0, env.fog - 0.35) * 0.2; c.fillStyle = P.fog_lav; c.fillRect(x, y + 29, g[2], 22); c.globalAlpha = 1; }
      if (env.rain > 0.05) {
        c.fillStyle = P.fog_lav_hi; c.globalAlpha = env.rain * 0.3;
        for (var i = 0; i < 12; i++) c.fillRect(x + (i * 13 + 5) % g[2], y + Math.floor(((t * 0.3 + i * 0.23) % 1) * (g[3] - 4)), 1, 4);
        c.globalAlpha = 1;
      }
      if (env.strange === 'figure' && n === 1) {
        c.globalAlpha = Math.max(0, Math.min(1, Math.min(env.st, 1 - env.st) * 4)) * 0.42;
        c.fillStyle = P.fog_dark; c.fillRect(x + 40, y + 30, 2, 2); c.fillRect(x + 39, y + 32, 4, 8); c.globalAlpha = 1;
      }
      if (env.flash > 0) { c.fillStyle = P.fog_light; c.globalAlpha = env.flash * 0.2; c.fillRect(x, y, g[2], g[3]); c.globalAlpha = 1; }
    }
    var back = env.strange === 'clock' ? env.st * Math.PI * 4 : 0;
    var minute = (env.hour % 1) * Math.PI * 2 - back, hour = (env.hour % 12) / 12 * Math.PI * 2;
    c.fillStyle = P.wood_dark;
    for (var s = 1; s < 9; s++) c.fillRect(Math.round(OX + 231 + Math.sin(minute) * s), Math.round(OY + 46 - Math.cos(minute) * s), 1, 1);
    for (s = 1; s < 6; s++) c.fillRect(Math.round(OX + 231 + Math.sin(hour) * s), Math.round(OY + 46 - Math.cos(hour) * s), 1, 1);
  }
  function draw(c, st, t, rusty, stock, env) {
    if (!ready()) return false;
    env = env || normal;
    c.fillStyle = P.black; c.fillRect(0, 0, 640, 360);
    c.drawImage(room, OX, OY); weather(c, env, t);
    var f = R.walkers(st, T, OX, OY + TOP), fr = R.frames(st);
    var saveLook = G.state.save.look || {}, fisher = G.data.lookOf(G.data.looks.fishers, saveLook.fisher), dog = G.data.lookOf(G.data.looks.dogs, saveLook.dog);
    order.length = 0;
    for (var i = 0; i < foreground.length; i++) order.push(foreground[i].foot + OY, i);
    order.push(OY + 188, 100, f[3], 101, f[1] + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {
      var at = -1, y = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < y) { y = order[i]; at = i; }
      var id = order[at + 1]; order[at] = 1e9 + 1;
      if (id < 100) { var prop = foreground[id]; c.drawImage(prop.img, OX + prop.x, OY + prop.y); }
      else if (id === 100) figure(c, 'rusty', rusty ? rusty.face : 'down', rusty ? rusty.fr : 0, OX + 304, OY + 188);
      else if (id === 101) figure(c, 'dog', st.dog.face, fr[1], f[2], f[3], dog, !st.dog.sit);
      else figure(c, 'fisher', st.face, fr[0], f[0], f[1], fisher, st.moving);
    }
    // A few native-pixel bubbles and steam curls retain the room's quiet motion.
    c.fillStyle = P.shop_cream; c.globalAlpha = 0.35;
    for (i = 0; i < 3; i++) {
      var u = (t * 0.22 + i / 3) % 1;
      c.fillRect(OX + 58 + i * 3, OY + 256 - Math.floor(u * 21), 1, 1);
      c.fillRect(OX + 326 + Math.round(Math.sin(t + i)), OY + 196 - Math.floor(u * 10), 1, 1);
    }
    c.globalAlpha = 1;
    return true;
  }
  load('room', 'assets/shop/room.png');
  load('characters', 'assets/shop/characters.png');
  load('dog', 'assets/shop/dog-walk.png');
  return { ready: ready, draw: draw, prebake: prebake, info: function () { return { ready: ready(), loaded: loaded, failed: failed.slice(), frames: Object.keys(frames).length, room: [W, H], source: 'approved miniature concept' }; } };
})();
