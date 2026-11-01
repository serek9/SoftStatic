var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Master palette, sprite DSL and the baked bitmap font (§0.9).
// This is the only file allowed to hold hex colours; everything else names palette keys.
// Nothing here touches the DOM at load time, so the data checks also run in Node.
G.gfx = G.gfx || {};
G.gfx.sprites = (function () {
  var PALETTE = {
    night_ink: '#0b0d17', night_deep: '#131828', night_blue: '#1d2440',
    dusk_violet: '#3b3055', dusk_plum: '#5a3a5e', dusk_rose: '#8a5262',
    dusk_amber: '#b0683e', dusk_high: '#c98a5a',
    fog_dark: '#2b2f3c', fog_mid: '#4b5162', fog_light: '#7a8090',
    water_deep: '#081016', water_dark: '#0f1d26', water_mid: '#18303c', water_hi: '#2e4a56',
    rust_dark: '#3a1f18', rust: '#6b3423', rust_hi: '#9c5230',
    wood_dark: '#24190f', wood: '#4a3322', wood_hi: '#6f4f36',
    moss_dark: '#1f2a1c', moss: '#34442a', moss_hi: '#56663a',
    stone_dark: '#26262a', stone: '#46454a', stone_hi: '#6d6a6c',
    bone: '#d9cfb6', paper: '#c4b896', ink: '#17130f',
    flesh: '#b07868', flesh_dark: '#6e423a',
    blood: '#6a0f18', crimson: '#a0182a',
    neon_red: '#e0403a', neon_teal: '#3ad0c0', signal_amber: '#e8a830', lamp_glow: '#f0d890',
    black: '#000000',
    // Phase 15 (visual detail): the lit top of the water, the waterline, and the painted world.
    water_lit: '#2a5260', water_foam: '#6f97a2',
    mount_far: '#262844', mount_mid: '#2e3050', mount_lit: '#47466a', mount_haze: '#3a3c5c',
    pine_dark: '#111a20', pine_mid: '#1a2830', pine_lit: '#2b4043',
    leaf_dim: '#45261d', leaf_rust: '#83391f', leaf_gold: '#a8742a', birch: '#8c8a82',
    reed_dark: '#2f2a20', reed: '#4f4430', reed_hi: '#6f6040',
    rock_dark: '#1b1e25', rock: '#30343e', rock_lit: '#4c5262',
    dog_dark: '#6e4c2a', dog: '#a87b45', dog_hi: '#cfae78',
    coat_dark: '#2a3426', coat: '#3f4d36', coat_hi: '#5b6b48', cap: '#7a3326',
    // The bait shop's painted interior: the lit side of a face.
    skin_hi: '#cf9a82',
    // Phase 17 (640×360 interiors): longer ramps for wood, stone, skin, cloth, fire and brass.
    wood_deep: '#1a120c', wood_mid: '#5d402a', wood_lit: '#8a6444',
    stone_lit: '#908b88', hair_lit: '#b4b0a6', paper_dark: '#a3956f', cream: '#e6dcc2',
    skin_shadow: '#8e5a4c', skin_lit: '#e0b49a',
    teal_dark: '#16302e', teal: '#22494a', teal_hi: '#356a66', teal_lit: '#4d8a80',
    plum_hi: '#734862', flame: '#e07a2a', brass_hi: '#d0a050', moss_lit: '#7a8a50', rug_hi: '#b8473a',
    // Phase 47 (looks): a yellow oilskin, a faded denim, a darker skin ramp.
    slicker_dark: '#5a4a1c', slicker: '#8a7228', slicker_hi: '#b09a40',
    denim_dark: '#1c2433', denim: '#2c3a50', denim_hi: '#45597a',
    umber_deep: '#2e1c18', umber_dark: '#4a2e24', umber: '#6e4634', umber_hi: '#8e6048',
    // Phase 56 (the shop and the cabin, lofi): 70s panelling, mustard, burnt orange, olive,
    // dusty pink, lavender, a CRT's blue, chrome, brick, a guitar's sunburst, plant greens,
    // vinyl, and a dim pink neon. Interior keys only (INTERIOR below): shift() never picks
    // them, so the fish portraits and every earlier sprite keep their colours.
    panel_deep: '#2a1a10', panel: '#583822', panel_mid: '#72502e', panel_hi: '#8e663c', panel_lit: '#b08350',
    mustard_dark: '#5e4a16', mustard: '#94782a', mustard_hi: '#bc9c40', mustard_lit: '#d8bc68',
    orange_dark: '#62290f', orange: '#9c4a1c', orange_hi: '#c46e30', orange_lit: '#de9850',
    olive_dark: '#2a3016', olive: '#465024', olive_hi: '#68723a', olive_lit: '#8e9656',
    pink_dark: '#5e343c', pink: '#94606a', pink_hi: '#c08c8a', pink_lit: '#dcb4a8',
    lav_dark: '#332c46', lav: '#56507a', lav_hi: '#7e78a0', lav_lit: '#a8a2c2',
    crt_dark: '#0e1e28', crt: '#1c4252', crt_hi: '#367c8c', crt_glow: '#82c4c4',
    chrome_dark: '#353840', chrome: '#626874', chrome_hi: '#9aa0aa', chrome_lit: '#cdd1d6',
    brick_dark: '#3a1a14', brick: '#683024', brick_hi: '#8c4a36',
    leaf_deep: '#14281a', leaf_dark: '#1e3c24', leaf: '#2e5a32', leaf_hi: '#4c7c42', leaf_lit: '#76a456',
    sun_dark: '#32100a', sun: '#702614', sun_hi: '#ac521c', sun_lit: '#d89a40',
    vinyl: '#121016', vinyl_hi: '#3a3642', neon_pink: '#d0507e', neon_pink_hi: '#f0a0b8',
    ivory: '#efe6cc', denim_lit: '#6880a4', outline: '#120e0c'
  };
  // Phase 56: the interior keys above, which shift() leaves out.
  var INTERIOR = {};
  ('panel_deep panel panel_mid panel_hi panel_lit mustard_dark mustard mustard_hi mustard_lit orange_dark orange orange_hi orange_lit ' +
   'olive_dark olive olive_hi olive_lit pink_dark pink pink_hi pink_lit lav_dark lav lav_hi lav_lit crt_dark crt crt_hi crt_glow ' +
   'chrome_dark chrome chrome_hi chrome_lit brick_dark brick brick_hi leaf_deep leaf_dark leaf leaf_hi leaf_lit sun_dark sun sun_hi sun_lit ' +
   'vinyl vinyl_hi neon_pink neon_pink_hi ivory denim_lit outline').split(' ').forEach(function (k) { INTERIOR[k] = true; });

  // The dusk ceiling: keys whose prefix marks them as sky or water may not be brighter than dusk_high.
  var CEILING_KEY = 'dusk_high';
  var SKY_WATER = /^(night_|dusk_|fog_|water_)/;

  var RGB = {};
  for (var k in PALETTE) {
    var h = parseInt(PALETTE[k].slice(1), 16);
    RGB[k] = [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  }

  function lumOf(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function lum(key) { var c = RGB[key]; return lumOf(c[0], c[1], c[2]); }
  var CEILING = lum(CEILING_KEY);

  // True when an [r, g, b] colour may be used in the sky or water (e.g. a blended sky ramp).
  function skySafe(r, g, b) { return lumOf(r, g, b) <= CEILING + 0.001; }

  for (k in PALETTE) {
    if (SKY_WATER.test(k) && lum(k) > CEILING + 0.001) throw new Error('palette: ' + k + ' is brighter than ' + CEILING_KEY);
  }

  // shift(key, dir): the palette key that is one step lighter (dir 1) or darker (dir -1)
  // than key in about the same hue; key itself when there is none. Used to shade painted
  // sprites (fishgen portraits) without naming colours.
  var shifted = {};
  function shift(key, dir) {
    var id = key + dir;
    if (shifted[id] !== undefined) return shifted[id];
    var c = RGB[key], L = lum(key), m = (c[0] + c[1] + c[2]) / 3, best = key, bd = 1e9;
    for (var k in PALETTE) {
      if (k === key || k === 'black' || INTERIOR[k]) continue;
      var dl = (lum(k) - L) * dir;
      if (dl < 8 || dl > 80) continue;
      var q = RGB[k], qm = (q[0] + q[1] + q[2]) / 3;
      var dist = Math.abs((c[0] - m) - (q[0] - qm)) + Math.abs((c[1] - m) - (q[1] - qm)) + Math.abs((c[2] - m) - (q[2] - qm)) + Math.abs(dl - 30) * 0.6;
      if (dist < bd) { bd = dist; best = k; }
    }
    shifted[id] = best;
    return best;
  }

  // ---- Sprite DSL ----------------------------------------------------------
  // def('name', {a: 'rust', b: 'bone'}, frames): frames is one array of row strings, or an
  // array of them for animation. '.' is transparent; every other char must be in the map,
  // and every map value must be a palette key.
  var defs = {};
  var names = [];

  function def(name, map, frames) {
    if (typeof frames[0] === 'string') frames = [frames];
    var h = frames[0].length, w = frames[0][0].length;
    for (var c in map) if (!RGB[map[c]]) throw new Error('sprite ' + name + ': "' + map[c] + '" is not a palette key');
    for (var f = 0; f < frames.length; f++) {
      if (frames[f].length !== h) throw new Error('sprite ' + name + ' frame ' + f + ': height differs');
      for (var y = 0; y < h; y++) {
        var row = frames[f][y];
        if (row.length !== w) throw new Error('sprite ' + name + ' frame ' + f + ' row ' + y + ': width differs');
        for (var x = 0; x < w; x++) {
          var ch = row.charAt(x);
          if (ch !== '.' && !map[ch]) throw new Error('sprite ' + name + ': "' + ch + '" is not in its map');
        }
      }
    }
    if (!defs[name]) names.push(name);
    defs[name] = { name: name, w: w, h: h, n: frames.length, map: map, frames: frames, strip: null, flip: null };
  }

  // All frames side by side in one canvas, baked on first use.
  function strip(d) {
    if (d.strip) return d.strip;
    var cv = G.gfx.bake.canvas(d.w * d.n, d.h), ctx = cv.getContext('2d');
    for (var f = 0; f < d.n; f++) {
      for (var y = 0; y < d.h; y++) {
        var row = d.frames[f][y];
        for (var x = 0; x < d.w; x++) {
          var ch = row.charAt(x);
          if (ch === '.') continue;
          ctx.fillStyle = PALETTE[d.map[ch]];
          ctx.fillRect(f * d.w + x, y, 1, 1);
        }
      }
    }
    d.strip = cv;
    return cv;
  }

  function get(name) {
    var d = defs[name];
    if (!d) throw new Error('unknown sprite: ' + name);
    return d;
  }

  // Draws frame `frame` (wrapped) at whole-pixel x, y. flip mirrors it horizontally.
  function draw(ctx, name, x, y, frame, flip) {
    var d = get(name), f = (frame | 0) % d.n;
    var src = strip(d);
    if (flip) {
      if (!d.flip) d.flip = G.gfx.bake.flipped(src, 'x');
      src = d.flip;
      f = d.n - 1 - f; // the mirrored strip has its frames in reverse order
    }
    ctx.drawImage(src, f * d.w, 0, d.w, d.h, x | 0, y | 0, d.w, d.h);
  }

  // Checks a baked sprite against its definition, pixel by pixel. Returns the number of wrong pixels.
  function verify(name) {
    var d = get(name), cv = strip(d);
    var px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, bad = 0;
    for (var f = 0; f < d.n; f++) {
      for (var y = 0; y < d.h; y++) {
        for (var x = 0; x < d.w; x++) {
          var i = (y * cv.width + f * d.w + x) * 4, ch = d.frames[f][y].charAt(x);
          if (ch === '.') { if (px[i + 3] !== 0) bad++; continue; }
          var c = RGB[d.map[ch]];
          if (px[i] !== c[0] || px[i + 1] !== c[1] || px[i + 2] !== c[2] || px[i + 3] !== 255) bad++;
        }
      }
    }
    return bad;
  }

  // Asymmetric on purpose, so a flip is visible.
  def('test', { o: 'bone', r: 'rust', d: 'night_ink', a: 'signal_amber' }, [
    ['..oooo..',
     '.orrrro.',
     'ordrrdro',
     'orrrrrro',
     'oaarrrro',
     'ordrrdro',
     '.orrrro.',
     '..oooo..'],
    ['..oooo..',
     '.orrrro.',
     'orrrrrro',
     'ordrrdro',
     'oaarrrro',
     'orrrrrro',
     '.orrrro.',
     '..oooo..']
  ]);

  // ---- Bitmap font ---------------------------------------------------------
  // Printable ASCII, 6 rows per glyph: caps and digits use rows 0-4, lowercase x-height is
  // rows 1-4, descenders reach row 5. Widths vary; the advance is width + 1.
  var FONT_H = 6, LINE_H = 8;
  var GLYPHS = {
    ' ': '... ... ... ... ... ...', '!': '# # # . # .', '"': '#.# #.# ... ... ... ...',
    '#': '.#.#. ##### .#.#. ##### .#.#. .....', '$': '.## ##. .#. .## ##. ...',
    '%': '#.# ..# .#. #.. #.# ...', '&': '.#. #.# .#. #.# .## ...', "'": '# # . . . .',
    '(': '.# #. #. #. .# ..', ')': '#. .# .# .# #. ..', '*': '... #.# .#. #.# ... ...',
    '+': '... .#. ### .#. ... ...', ',': '. . . . # #', '-': '... ... ### ... ... ...',
    '.': '. . . . # .', '/': '..# ..# .#. #.. #.. ...',
    '0': '### #.# #.# #.# ### ...', '1': '.#. ##. .#. .#. ### ...', '2': '##. ..# .#. #.. ### ...',
    '3': '##. ..# .#. ..# ##. ...', '4': '#.# #.# ### ..# ..# ...', '5': '### #.. ##. ..# ##. ...',
    '6': '.## #.. ### #.# ### ...', '7': '### ..# .#. .#. .#. ...', '8': '### #.# ### #.# ### ...',
    '9': '### #.# ### ..# ##. ...',
    ':': '. # . # . .', ';': '. # . # # .', '<': '..# .#. #.. .#. ..# ...', '=': '... ### ... ### ... ...',
    '>': '#.. .#. ..# .#. #.. ...', '?': '##. ..# .#. ... .#. ...', '@': '.##. #..# #.## #... .##. ....',
    'A': '.#. #.# ### #.# #.# ...', 'B': '##. #.# ##. #.# ##. ...', 'C': '.## #.. #.. #.. .## ...',
    'D': '##. #.# #.# #.# ##. ...', 'E': '### #.. ##. #.. ### ...', 'F': '### #.. ##. #.. #.. ...',
    'G': '.## #.. #.# #.# .## ...', 'H': '#.# #.# ### #.# #.# ...', 'I': '### .#. .#. .#. ### ...',
    'J': '..# ..# ..# #.# .#. ...', 'K': '#.# #.# ##. #.# #.# ...', 'L': '#.. #.. #.. #.. ### ...',
    'M': '#...# ##.## #.#.# #...# #...# .....', 'N': '#..# ##.# #.## #..# #..# ....',
    'O': '.#. #.# #.# #.# .#. ...', 'P': '##. #.# ##. #.. #.. ...', 'Q': '.#. #.# #.# #.# .## ...',
    'R': '##. #.# ##. #.# #.# ...', 'S': '.## #.. .#. ..# ##. ...', 'T': '### .#. .#. .#. .#. ...',
    'U': '#.# #.# #.# #.# ### ...', 'V': '#.# #.# #.# .#. .#. ...',
    'W': '#...# #...# #.#.# ##.## #...# .....', 'X': '#.# #.# .#. #.# #.# ...',
    'Y': '#.# #.# .#. .#. .#. ...', 'Z': '### ..# .#. #.. ### ...',
    '[': '## #. #. #. ## ..', '\\': '#.. #.. .#. ..# ..# ...', ']': '## .# .# .# ## ..',
    '^': '.#. #.# ... ... ... ...', '_': '... ... ... ... ... ###', '`': '#. .# .. .. .. ..',
    'a': '... .## #.# #.# .## ...', 'b': '#.. ##. #.# #.# ##. ...', 'c': '... .## #.. #.. .## ...',
    'd': '..# .## #.# #.# .## ...', 'e': '... .#. ### #.. .## ...', 'f': '.## #.. ### #.. #.. ...',
    'g': '... .## #.# .## ..# ##.', 'h': '#.. ##. #.# #.# #.# ...', 'i': '# . # # # .',
    'j': '.# .. .# .# .# #.', 'k': '#.. #.# ##. ##. #.# ...', 'l': '#. #. #. #. .# ..',
    'm': '..... ####. #.#.# #.#.# #.#.# .....', 'n': '... ##. #.# #.# #.# ...', 'o': '... .#. #.# #.# .#. ...',
    'p': '... ##. #.# ##. #.. #..', 'q': '... .## #.# .## ..# ..#', 'r': '... #.# ##. #.. #.. ...',
    's': '... .## #.. ..# ##. ...', 't': '.#. ### .#. .#. ..# ...', 'u': '... #.# #.# #.# .## ...',
    'v': '... #.# #.# #.# .#. ...', 'w': '..... #...# #.#.# #.#.# .#.#. .....', 'x': '... #.# .#. .#. #.# ...',
    'y': '... #.# #.# .## ..# ##.', 'z': '... ### ..# .#. ### ...',
    '{': '.## .#. ##. .#. .## ...', '|': '# # # # # #', '}': '##. .#. .## .#. ##. ...',
    '~': '.... .#.# #.#. .... .... ....'
  };

  // Integer hash, used for handwriting jitter so it is deterministic and never touches G.vrng.
  function hash(a, b) {
    var h = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul((b + 0x632BE5AB) | 0, 0xC2B2AE35);
    h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D);
    h ^= h >>> 15; h = Math.imul(h, 0x846CA68B);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // A bitmap font from a glyph table (rows of '.' and '#' separated by spaces; a glyph with
  // fewer than h rows is padded with blank rows below). wander is the handwriting jitter's
  // step in pixels. Returns {FONT_H, LINE_H, drawText, measure, wrap, bold, measureBold}.
  function makeFont(glyphs, h, lineH, wander) {
    var gx = new Int16Array(128), gw = new Uint8Array(128), W = 0, rowsOf = {};
    for (var c = 32; c < 127; c++) {
      var ch = String.fromCharCode(c), g = glyphs[ch];
      if (!g) throw new Error('font: missing glyph ' + JSON.stringify(ch));
      var rows = g.split(' ');
      if (rows.length > h) throw new Error('font: glyph ' + JSON.stringify(ch) + ' has more than ' + h + ' rows');
      while (rows.length < h) rows.push(new Array(rows[0].length + 1).join('.'));
      for (var r = 0; r < h; r++) {
        if (rows[r].length !== rows[0].length || /[^.#]/.test(rows[r])) throw new Error('font: glyph ' + JSON.stringify(ch) + ' row ' + r);
      }
      rowsOf[c] = rows; gx[c] = W; gw[c] = rows[0].length; W += rows[0].length;
    }

    var atlas = null;        // opaque glyph mask, baked on first use
    var tinted = {};         // palette key -> atlas recoloured to that key

    function bakeAtlas() {
      atlas = G.gfx.bake.canvas(W, h);
      var ctx = atlas.getContext('2d');
      ctx.fillStyle = PALETTE.bone;
      for (var c = 32; c < 127; c++) {
        for (var y = 0; y < h; y++) for (var x = 0; x < gw[c]; x++) if (rowsOf[c][y].charAt(x) === '#') ctx.fillRect(gx[c] + x, y, 1, 1);
      }
    }

    function fontIn(key) {
      var t = tinted[key];
      if (t) return t;
      if (!RGB[key]) throw new Error('text colour "' + key + '" is not a palette key');
      if (!atlas) bakeAtlas();
      t = G.gfx.bake.canvas(W, h);
      var ctx = t.getContext('2d');
      ctx.drawImage(atlas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = PALETTE[key];
      ctx.fillRect(0, 0, W, h);
      tinted[key] = t;
      return t;
    }

    function code(str, i) {
      var c = str.charCodeAt(i);
      return (c >= 32 && c < 127) ? c : 63; // anything unprintable draws as '?'
    }

    // Draws str with its top-left at x, y. '\n' starts a new line.
    // jitter 0..1 is the "handwriting" amount: glyphs wander up to one step (two above 0.66)
    // and spacing loosens. The same str, seed and jitter always give the same pixels.
    // extra widens each glyph by drawing it again 1 px to the right (bold).
    function draw(ctx, str, x, y, colorKey, jitter, seed, extra) {
      var img = fontIn(colorKey || 'bone'), cx = x | 0, cy = y | 0;
      jitter = jitter || 0; seed = seed | 0; extra = extra | 0;
      for (var i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) === 10) { cx = x | 0; cy += lineH; continue; }
        var c = code(str, i), dx = 0, dy = 0;
        if (jitter > 0) {
          var hh = hash(seed, i);
          if ((hh & 1023) < jitter * 1024) dy = (hh & 1024) ? wander : -wander;
          if (jitter > 0.66 && ((hh >>> 11) & 1023) < (jitter - 0.66) * 3 * 1024) dy *= 2;
          if (((hh >>> 21) & 255) < jitter * 96) dx = (hh & (1 << 30)) ? 1 : 0;
        }
        ctx.drawImage(img, gx[c], 0, gw[c], h, cx + dx, cy + dy, gw[c], h);
        if (extra) ctx.drawImage(img, gx[c], 0, gw[c], h, cx + dx + 1, cy + dy, gw[c], h);
        cx += gw[c] + 1 + extra + dx;
      }
    }

    // Width in pixels of the widest line (without jitter).
    function measureW(str, extra) {
      var w = 0, best = 0;
      for (var i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) === 10) { if (w > best) best = w; w = 0; continue; }
        w += gw[code(str, i)] + 1 + extra;
      }
      if (w > best) best = w;
      return best > 0 ? best - 1 : 0;
    }
    function measure(str) { return measureW(str, 0); }

    // Splits text into lines no wider than width px, breaking between words.
    function wrap(text, width) {
      var words = text.split(' '), out = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var next = line ? line + ' ' + words[i] : words[i];
        if (measure(next) > width && line) { out.push(line); line = words[i]; } else line = next;
      }
      if (line) out.push(line);
      return out;
    }

    return {
      FONT_H: h, LINE_H: lineH, measure: measure, wrap: wrap,
      drawText: function (ctx, str, x, y, key, jitter, seed) { draw(ctx, str, x, y, key, jitter, seed, 0); },
      bold: function (ctx, str, x, y, key) { draw(ctx, str, x, y, key, 0, 0, 1); },
      measureBold: function (str) { return measureW(str, 1); }
    };
  }

  // The 320×180 font (scenes not yet converted to 640×360) and the fine font of the 640×360
  // scenes (Phase 17): capitals 7 px tall, x-height 5, descenders 2.
  var BASE = makeFont(GLYPHS, FONT_H, LINE_H, 1);
  var FINE = makeFont({
    ' ': '... ...',
    '!': '# # # # # . #', '"': '#.# #.#', '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
    '$': '..#.. .#### #.#.. .###. ..#.# ####. ..#..', '%': '##... ##..# ...#. ..#.. .#... #..## ...##',
    '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#', "'": '# #',
    '(': '..# .#. #.. #.. #.. .#. ..#', ')': '#.. .#. ..# ..# ..# .#. #..',
    '*': '..... ..#.. #.#.# .###. #.#.# ..#..', '+': '..... ..#.. ..#.. ##### ..#.. ..#..',
    ',': '.. .. .. .. .. .# .# #.', '-': '.... .... .... #### ....', '.': '.. .. .. .. .. ## ##',
    '/': '....# ....# ...#. ..#.. .#... #.... #....',
    '0': '.###. #...# #..## #.#.# ##..# #...# .###.', '1': '.#. ##. .#. .#. .#. .#. ###',
    '2': '.###. #...# ....# ...#. ..#.. .#... #####', '3': '##### ...#. ..#.. ...#. ....# #...# .###.',
    '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.', '5': '##### #.... ####. ....# ....# #...# .###.',
    '6': '..##. .#... #.... ####. #...# #...# .###.', '7': '##### ....# ...#. ..#.. .#... .#... .#...',
    '8': '.###. #...# #...# .###. #...# #...# .###.', '9': '.###. #...# #...# .#### ....# ...#. .##..',
    ':': '.. .. ## ## .. ## ##', ';': '.. .. ## ## .. ## ## #.',
    '<': '...# ..#. .#.. #... .#.. ..#. ...#', '=': '.... .... #### .... #### ....',
    '>': '#... .#.. ..#. ...# ..#. .#.. #...', '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
    '@': '.###. #...# #.### #.#.# #.### #.... .###.',
    'A': '.###. #...# #...# ##### #...# #...# #...#', 'B': '####. #...# #...# ####. #...# #...# ####.',
    'C': '.###. #...# #.... #.... #.... #...# .###.', 'D': '####. #...# #...# #...# #...# #...# ####.',
    'E': '##### #.... #.... ####. #.... #.... #####', 'F': '##### #.... #.... ####. #.... #.... #....',
    'G': '.###. #...# #.... #.### #...# #...# .####', 'H': '#...# #...# #...# ##### #...# #...# #...#',
    'I': '### .#. .#. .#. .#. .#. ###', 'J': '...# ...# ...# ...# ...# #..# .##.',
    'K': '#...# #..#. #.#.. ##... #.#.. #..#. #...#', 'L': '#.... #.... #.... #.... #.... #.... #####',
    'M': '#...# ##.## #.#.# #.#.# #...# #...# #...#', 'N': '#...# #...# ##..# #.#.# #..## #...# #...#',
    'O': '.###. #...# #...# #...# #...# #...# .###.', 'P': '####. #...# #...# ####. #.... #.... #....',
    'Q': '.###. #...# #...# #...# #.#.# #..#. .##.#', 'R': '####. #...# #...# ####. #.#.. #..#. #...#',
    'S': '.#### #.... #.... .###. ....# ....# ####.', 'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    'U': '#...# #...# #...# #...# #...# #...# .###.', 'V': '#...# #...# #...# #...# #...# .#.#. ..#..',
    'W': '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.', 'X': '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    'Y': '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', 'Z': '##### ....# ...#. ..#.. .#... #.... #####',
    '[': '### #.. #.. #.. #.. #.. ###', '\\': '#.... #.... .#... ..#.. ...#. ....# ....#',
    ']': '### ..# ..# ..# ..# ..# ###', '^': '..#.. .#.#. #...#', '_': '..... ..... ..... ..... ..... ..... ..... #####',
    '`': '#. .#',
    'a': '..... ..... .###. ....# .#### #...# .####', 'b': '#.... #.... #.##. ##..# #...# #...# ####.',
    'c': '.... .... .### #... #... #... .###', 'd': '....# ....# .##.# #..## #...# #...# .####',
    'e': '..... ..... .###. #...# ##### #.... .###.', 'f': '..## .#.. #### .#.. .#.. .#.. .#..',
    'g': '..... ..... .#### #...# #...# #...# .#### ....# .###.', 'h': '#.... #.... #.##. ##..# #...# #...# #...#',
    'i': '.#. ... ##. .#. .#. .#. ###', 'j': '...# .... ..## ...# ...# ...# ...# #..# .##.',
    'k': '#... #... #..# #.#. ##.. #.#. #..#', 'l': '##. .#. .#. .#. .#. .#. ###',
    'm': '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#', 'n': '..... ..... #.##. ##..# #...# #...# #...#',
    'o': '..... ..... .###. #...# #...# #...# .###.', 'p': '..... ..... ####. #...# #...# #...# ####. #.... #....',
    'q': '..... ..... .#### #...# #...# #...# .#### ....# ....#', 'r': '.... .... #.## ##.. #... #... #...',
    's': '.... .... .### #... .##. ...# ###.', 't': '.#.. .#.. #### .#.. .#.. .#.. ..##',
    'u': '..... ..... #...# #...# #...# #..## .##.#', 'v': '..... ..... #...# #...# #...# .#.#. ..#..',
    'w': '..... ..... #...# #...# #.#.# #.#.# .#.#.', 'x': '..... ..... #...# .#.#. ..#.. .#.#. #...#',
    'y': '..... ..... #...# #...# #...# #...# .#### ....# .###.', 'z': '..... ..... ##### ...#. ..#.. .#... #####',
    '{': '..## .#.. .#.. #... .#.. .#.. ..##', '|': '# # # # # # # # #', '}': '##.. ..#. ..#. ...# ..#. ..#. ##..',
    '~': '..... ..... .#... #.#.# ...#.'
  }, 9, 12, 1);

  return {
    PALETTE: PALETTE, RGB: RGB, CEILING_KEY: CEILING_KEY, CEILING: CEILING, SKY_WATER: SKY_WATER,
    lum: lum, skySafe: skySafe, shift: shift,
    def: def, get: get, draw: draw, verify: verify, names: names,
    FONT_H: FONT_H, LINE_H: LINE_H, drawText: BASE.drawText, measure: BASE.measure, wrap: BASE.wrap, hash: hash,
    makeFont: makeFont, fine: FINE
  };
})();
