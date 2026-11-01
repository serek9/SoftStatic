#!/usr/bin/env node
// The home-screen icon as image files (PLAN.md 8.4 #37). Chrome installs a web app only from
// an icon at a same-origin URL, so the manifest needs real files. They are not drawn by hand:
// this paints G.core.device.ICON (the 32×32 grid of palette keys the game itself paints in
// the gallery) with the colours of js/gfx/sprites.js, scaled up whole, and writes PNGs with
// Node's own zlib. No dependencies.
//
//   node tools/icon.js           writes icon-192.png and icon-512.png at the repository root
//   node tools/icon.js --check   exit 1 if the files are missing or differ from the grid
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const SIZES = [192, 512];

// The palette and the grid, loaded as the game loads them.
function load() {
  const ctx = vm.createContext({ Math: Math });
  for (const f of ['js/gfx/sprites.js', 'js/core/device.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { P: ctx.G.gfx.sprites.PALETTE, ICON: ctx.G.core.device.ICON };
}

function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

// RGB pixels of the grid at px × px (px a multiple of 32), each rectangle filled in order.
function paint(P, ICON, px) {
  const s = px / 32, buf = Buffer.alloc(px * px * 3);
  for (const [key, x, y, w, h] of ICON) {
    if (!P[key]) throw new Error('no palette key ' + key);
    const c = rgb(P[key]);
    for (let yy = y * s; yy < (y + h) * s; yy++) for (let xx = x * s; xx < (x + w) * s; xx++) {
      const o = (yy * px + xx) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
    }
  }
  return buf;
}

// A minimal PNG: 8-bit RGB, filter 0 on every row, one IDAT.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgbBuf, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px, 0); ihdr.writeUInt32BE(px, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
  const raw = Buffer.alloc(px * (px * 3 + 1));
  for (let y = 0; y < px; y++) rgbBuf.copy(raw, y * (px * 3 + 1) + 1, y * px * 3, (y + 1) * px * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function main() {
  const check = process.argv.includes('--check'), { P, ICON } = load();
  let bad = 0;
  for (const px of SIZES) {
    const file = path.join(ROOT, 'icon-' + px + '.png'), out = png(paint(P, ICON, px), px);
    if (check) {
      const same = fs.existsSync(file) && fs.readFileSync(file).equals(out);
      console.log((same ? 'PASS ' : 'FAIL ') + 'icon-' + px + '.png ' + (same ? 'matches the grid' : 'is missing or differs: run node tools/icon.js'));
      if (!same) bad++;
    } else { fs.writeFileSync(file, out); console.log('wrote icon-' + px + '.png (' + out.length + ' bytes)'); }
  }
  process.exit(bad ? 1 : 0);
}
main();
