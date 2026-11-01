var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// A grid of palette keys to paint small things on before they go to a canvas (Phase 56): the
// walking sprites of the shop and the cabin, and the props in those rooms. Painting into keys
// first lets a figure be built from shaded parts (ellipses, capsules, polygons), then given an
// outline that follows its silhouette, then laid down as runs of one key, under the pixel-art
// rules of 8.3 #84 (flat keys, lit from the top left, no dithering, no speckle).
// Bake time only: nothing here runs per frame.
G.gfx = G.gfx || {};
G.gfx.pix = (function () {
  function tone(keys, v) { var n = keys.length - 1; return keys[Math.round(Math.max(0, Math.min(1, v)) * n)]; }

  function Grid(w, h) { this.w = w; this.h = h; this.k = new Array(w * h); for (var i = 0; i < w * h; i++) this.k[i] = ''; }
  var P = Grid.prototype;

  P.at = function (x, y) { x |= 0; y |= 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? '' : this.k[y * this.w + x]; };
  P.set = function (key, x, y) { x = Math.round(x); y = Math.round(y); if (key && x >= 0 && y >= 0 && x < this.w && y < this.h) this.k[y * this.w + x] = key; return this; };
  P.clear = function (x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.k[y * this.w + x] = ''; return this; };
  P.rect = function (key, x, y, w, h) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) this.set(key, xx, yy); return this; };
  // fn(x, y, current) returns a key to set, or '' / undefined to leave the pixel as it is.
  P.fill = function (x0, y0, w, h, fn) {
    for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) { var k = fn(x, y, this.at(x, y)); if (k) this.set(k, x, y); }
    return this;
  };
  // Only where something is painted already (patterns over a shape: checks, stripes, grain).
  P.over = function (x0, y0, w, h, fn) {
    var self = this;
    return this.fill(x0, y0, w, h, function (x, y, cur) { return cur ? fn(x, y, cur) : ''; });
  };

  // A shaded ellipse lit from the top left (as paint.blob); o: {bias, rim, lx, ly, only}.
  P.ell = function (cx, cy, rx, ry, keys, o) {
    o = o || {};
    var bias = o.bias || 0, rim = o.rim === undefined ? 0.2 : o.rim, lx = o.lx === undefined ? 0.6 : o.lx, ly = o.ly === undefined ? 0.75 : o.ly;
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var nx = (x + 0.5 - cx - 0.5) / rx, ny = (y + 0.5 - cy - 0.5) / ry, d = nx * nx + ny * ny;
      if (d > 1) continue;
      if (o.only && !this.at(x, y)) continue;
      var v = 0.5 + 0.5 * (-nx * lx - ny * ly) + bias - (d > 0.65 ? rim * (d - 0.65) / 0.35 : 0);
      this.set(typeof keys === 'string' ? keys : tone(keys, v), x, y);
    }
    return this;
  };
  // A shaded capsule from (x0, y0) to (x1, y1) of radius r (a leg, an arm, a pipe, a neck).
  P.cap = function (x0, y0, x1, y1, r, keys, bias) {
    var dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    for (var y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
      for (var x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
        var t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2)), ex = x - (x0 + t * dx), ey = y - (y0 + t * dy);
        if (ex * ex + ey * ey > r * r + 0.25) continue;
        this.set(typeof keys === 'string' ? keys : tone(keys, 0.5 + (-ex * 0.65 - ey * 0.6) / Math.max(1, r) * 0.5 + (bias || 0)), x, y);
      }
    }
    return this;
  };
  // A 1 px line.
  P.line = function (key, x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) {
      this.set(key, x0, y0);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
    return this;
  };
  // A filled polygon [[x, y], ...]; fill is a key or fn(x, y) -> key (shading across it).
  P.poly = function (pts, fill) {
    var y0 = 1e9, y1 = -1e9, i;
    for (i = 0; i < pts.length; i++) { y0 = Math.min(y0, pts[i][1]); y1 = Math.max(y1, pts[i][1]); }
    for (var y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      var yc = y + 0.5, xs = [];
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) for (var x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(typeof fill === 'string' ? fill : fill(x, y), x, y);
    }
    return this;
  };
  // A box shaded as a solid: lit top and left edges, dark right and bottom (keys dark to light).
  P.slab = function (x, y, w, h, keys) {
    var n = keys.length - 1;
    this.rect(keys[Math.max(0, n - 2)], x, y, w, h);
    this.rect(keys[n], x, y, w, 1); this.rect(keys[n - 1], x, y + 1, 1, h - 1);
    this.rect(keys[0], x + w - 1, y + 1, 1, h - 1); this.rect(keys[0], x, y + h - 1, w, 1);
    return this;
  };
  // An outline round everything painted: every empty pixel touching a painted one (4 ways,
  // or 8 with diag) takes key, or fn(neighbour's key) -> key.
  P.outline = function (key, diag) {
    var w = this.w, h = this.h, add = [], x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (this.k[y * w + x]) continue;
      var n = this.at(x - 1, y) || this.at(x + 1, y) || this.at(x, y - 1) || this.at(x, y + 1) ||
        (diag ? (this.at(x - 1, y - 1) || this.at(x + 1, y - 1) || this.at(x - 1, y + 1) || this.at(x + 1, y + 1)) : '');
      if (n) add.push(x, y, typeof key === 'function' ? key(n) : key);
    }
    for (var i = 0; i < add.length; i += 3) this.set(add[i + 2], add[i], add[i + 1]);
    return this;
  };
  // Swaps keys by a map {from: to}.
  P.recolor = function (map) { for (var i = 0; i < this.k.length; i++) if (map[this.k[i]]) this.k[i] = map[this.k[i]]; return this; };
  // Mirror left to right.
  P.flip = function () {
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w >> 1; x++) {
      var a = y * this.w + x, b = y * this.w + this.w - 1 - x, t = this.k[a]; this.k[a] = this.k[b]; this.k[b] = t;
    }
    return this;
  };
  // Draws the grid onto ctx at (ox, oy) in runs of one key a row.
  P.paint = function (ctx, ox, oy) {
    var PAL = G.gfx.sprites.PALETTE, last = '';
    ox = ox || 0; oy = oy || 0;
    for (var y = 0; y < this.h; y++) {
      var run = '', rx = 0;
      for (var x = 0; x <= this.w; x++) {
        var k = x < this.w ? this.k[y * this.w + x] : '';
        if (k !== run) {
          if (run) { if (run !== last) { ctx.fillStyle = PAL[run]; last = run; } ctx.fillRect(ox + rx, oy + y, x - rx, 1); }
          run = k; rx = x;
        }
      }
    }
    if (G.gfx.paint) G.gfx.paint.reset();
    return this;
  };
  // Bakes the grid into its own canvas.
  P.canvas = function () { var self = this; return G.gfx.bake.layer(this.w, this.h, function (c) { self.paint(c, 0, 0); }); };
  // How many pixels are painted (checks).
  P.count = function () { var n = 0; for (var i = 0; i < this.k.length; i++) if (this.k[i]) n++; return n; };

  // Phase 63: a view of grid g that paints in another grid's coordinates, scaled by s about the
  // top left. A painter written for one size (the walking dog, 40×32) paints into a smaller grid
  // (the dog at its real height beside the fisher) shape by shape: ellipses, capsules and
  // polygons are rasterised at the new size, not shrunk as pixels, so the outline, the eye and
  // the nose stay whole. Pattern callbacks (fill, over, poly) get the painter's own coordinates.
  function Scaled(g, s) { this.g = g; this.s = s; this.w = Math.round(g.w / s); this.h = Math.round(g.h / s); }
  var Q = Scaled.prototype;
  function src(v, s) { return Math.floor((v + 0.5) / s); }
  Q.at = function (x, y) { return this.g.at(Math.round(x * this.s), Math.round(y * this.s)); };
  Q.set = function (key, x, y) { this.g.set(key, x * this.s, y * this.s); return this; };
  Q.clear = function (x, y) { this.g.clear(x * this.s, y * this.s); return this; };
  Q.rect = function (key, x, y, w, h) {
    var s = this.s, x0 = Math.round(x * s), y0 = Math.round(y * s);
    this.g.rect(key, x0, y0, Math.max(1, Math.round((x + w) * s) - x0), Math.max(1, Math.round((y + h) * s) - y0)); return this;
  };
  Q.fill = function (x0, y0, w, h, fn) {
    var s = this.s, g = this.g, a = Math.floor(x0 * s), b = Math.floor(y0 * s), a1 = Math.ceil((x0 + w) * s), b1 = Math.ceil((y0 + h) * s);
    for (var y = b; y < b1; y++) for (var x = a; x < a1; x++) {
      var sx = src(x, s), sy = src(y, s);
      if (sx < x0 || sy < y0 || sx >= x0 + w || sy >= y0 + h) continue;
      var k = fn(sx, sy, g.at(x, y)); if (k) g.set(k, x, y);
    }
    return this;
  };
  Q.over = function (x0, y0, w, h, fn) { return this.fill(x0, y0, w, h, function (x, y, cur) { return cur ? fn(x, y, cur) : ''; }); };
  Q.ell = function (cx, cy, rx, ry, keys, o) { var s = this.s; this.g.ell(cx * s, cy * s, Math.max(0.6, rx * s), Math.max(0.6, ry * s), keys, o); return this; };
  Q.cap = function (x0, y0, x1, y1, r, keys, bias) { var s = this.s; this.g.cap(x0 * s, y0 * s, x1 * s, y1 * s, Math.max(0.55, r * s), keys, bias); return this; };
  Q.line = function (key, x0, y0, x1, y1) { var s = this.s; this.g.line(key, x0 * s, y0 * s, x1 * s, y1 * s); return this; };
  Q.poly = function (pts, fill) {
    var s = this.s, sp = [], i;
    for (i = 0; i < pts.length; i++) sp.push([pts[i][0] * s, pts[i][1] * s]);
    this.g.poly(sp, typeof fill === 'string' ? fill : function (x, y) { return fill(src(x, s), src(y, s)); }); return this;
  };
  Q.slab = function (x, y, w, h, keys) {
    var s = this.s, x0 = Math.round(x * s), y0 = Math.round(y * s);
    this.g.slab(x0, y0, Math.max(2, Math.round((x + w) * s) - x0), Math.max(2, Math.round((y + h) * s) - y0), keys); return this;
  };
  Q.outline = function (key, diag) { this.g.outline(key, diag); return this; };
  Q.recolor = function (map) { this.g.recolor(map); return this; };
  Q.flip = function () { this.g.flip(); return this; };
  Q.count = function () { return this.g.count(); };
  Q.canvas = function () { return this.g.canvas(); };
  Q.paint = function (ctx, ox, oy) { this.g.paint(ctx, ox, oy); return this; };

  return { grid: function (w, h) { return new Grid(w, h); }, scaled: function (g, s) { return new Scaled(g, s); }, tone: tone };
})();
