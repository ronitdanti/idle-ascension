// Generates the PWA icons procedurally (no art files are committed).
// Pure Node: rasterizes a flame-orb mark per pixel and writes PNGs with zlib.
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const INK = [7, 6, 13];
const INK2 = [26, 23, 39];
const EMBER = [255, 107, 33];
const HOT = [255, 179, 71];
const CORE = [255, 248, 224];

/** `mark` is the fraction of the canvas the flame occupies (smaller for maskable safe zone). */
function render(size, mark) {
  const buf = Buffer.alloc(size * size * 4);
  const R = (size / 2) * mark;
  const tongues = 9;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2;
      const dy = y + 0.5 - size / 2 + R * 0.04;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      // background: ink with a faint ember glow
      let c = mix(INK, INK2, smooth(0, size * 0.8, r));
      c = mix(c, [60, 24, 10], smooth(R * 2.2, R * 0.4, r) * 0.9);
      // star-shaped flame: radius oscillates between spike and valley
      const k = (Math.cos(a * tongues) + 1) / 2;
      const edge = R * (0.62 + 0.38 * k ** 1.6);
      const aa = size / 256 + 0.6;
      const inFlame = 1 - smooth(edge - aa, edge + aa, r);
      const outline = 1 - smooth(edge + R * 0.05 - aa, edge + R * 0.05 + aa, r);
      c = mix(c, [0, 0, 0], outline);
      const heat = smooth(edge, 0, r);
      let f = mix(EMBER, HOT, heat);
      // bright core disc
      const coreR = R * 0.42;
      f = mix(f, CORE, 1 - smooth(coreR * 0.5, coreR, r));
      c = mix(c, f, inFlame);
      const i = (y * size + x) * 4;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
const outputs = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  // Maskable icons are cropped to a circle or squircle: keep the mark inside the central 60%.
  ['maskable-512.png', 512, 0.58],
];
for (const [name, size, mark] of outputs) {
  writeFileSync(`public/icons/${name}`, png(size, render(size, mark)));
}
console.log('icons generated');
