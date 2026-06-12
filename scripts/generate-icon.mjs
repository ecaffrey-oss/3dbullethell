/**
 * Writes build/icon.png — placeholder app icon (512×512 purple tile).
 * electron-builder converts this to .ico / .icns at pack time.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "build");
const outPath = join(outDir, "icon.png");

const size = 512;
const r = 0x78;
const g = 0x28;
const b = 0xb4;

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const row = Buffer.alloc(1 + size * 3);
row[0] = 0;
for (let x = 0; x < size; x++) {
  row[1 + x * 3] = r;
  row[2 + x * 3] = g;
  row[3 + x * 3] = b;
}
const raw = Buffer.concat(Array.from({ length: size }, () => row));
const compressed = deflateSync(raw);

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 2;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", compressed),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, png);
console.log(`Wrote ${outPath}`);
