// One-off script: renders the Moveup app icon (indigo tile + a bright green
// ring, echoing the dashboard progress ring) straight to PNG bytes with zlib,
// no image/canvas dependency needed. Run: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const INDIGO = [0x33, 0x2e, 0x8f]; // deep indigo/blue
const GREEN = [0x22, 0xc5, 0x5e]; // bright green accent

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function renderPng(size, { maskable = false } = {}) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const cx = size / 2;
  const cy = size / 2;
  const cornerR = maskable ? 0 : size * 0.22; // rounded-square for the "any" icon
  const ringOuter = size * 0.34;
  const ringInner = size * 0.25;

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const o = y * (1 + size * 4) + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      let inShape;
      if (maskable) {
        inShape = true; // fill edge-to-edge; safe-zone padding handled via ring scale
      } else {
        const rx = Math.max(Math.abs(dx) - (size / 2 - cornerR), 0);
        const ry = Math.max(Math.abs(dy) - (size / 2 - cornerR), 0);
        inShape = rx * rx + ry * ry <= cornerR * cornerR || (Math.abs(dx) <= size / 2 - cornerR || Math.abs(dy) <= size / 2 - cornerR);
      }
      const dist = Math.sqrt(dx * dx + dy * dy);
      const onRing = dist <= ringOuter && dist >= ringInner;
      let r, g, b, a;
      if (!inShape) {
        r = g = b = a = 0;
      } else if (onRing) {
        [r, g, b] = GREEN;
        a = 255;
      } else {
        [r, g, b] = INDIGO;
        a = 255;
      }
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, renderPng(size));
}
writeFileSync("public/icons/maskable-512.png", renderPng(512, { maskable: true }));
writeFileSync("public/icons/apple-touch-icon.png", renderPng(180));
console.log("Generated app icons in public/icons/");
