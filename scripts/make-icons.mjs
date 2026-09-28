/**
 * Genere les declinaisons d'icone a partir de resources/icon.svg.
 *   resources/icon.png  1024x1024 (source pour electron-builder + Capacitor)
 *   resources/icon.ico           (Windows)
 *   resources/icon.512.png / 256 / 128
 *   android mipmaps (ic_launcher.png)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'resources', 'icon.svg');
const res = path.join(root, 'resources');

const png = async (size, out) => {
  const buf = await sharp(src, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(out, buf);
  return buf;
};

await fs.mkdir(res, { recursive: true });

const base = await png(1024, path.join(res, 'icon.png'));
await png(512, path.join(res, 'icon.512.png'));
await png(256, path.join(res, 'icon.256.png'));
await png(128, path.join(res, 'icon.128.png'));
await png(64, path.join(res, 'icon.64.png'));

/* --- ICO (contient 16/24/32/48/64/128/256) --- */
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map(async (s) => ({
    size: s,
    data: await sharp(base).resize(s, s, { fit: 'cover' }).png().toBuffer(),
  })),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + pngs.length * 16;
const dir = [];
for (const p of pngs) {
  const e = Buffer.alloc(16);
  e.writeUInt8(p.size >= 256 ? 0 : p.size, 0);
  e.writeUInt8(p.size >= 256 ? 0 : p.size, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(p.data.length, 8);
  e.writeUInt32LE(offset, 12);
  dir.push(e);
  offset += p.data.length;
}
await fs.writeFile(path.join(res, 'icon.ico'), Buffer.concat([header, ...dir, ...pngs.map((p) => p.data)]));

/* --- Android mipmaps --- */
const mipmap = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
if (await fs.stat(androidRes).then(() => true).catch(() => false)) {
  for (const [dir, size] of Object.entries(mipmap)) {
    const out = path.join(androidRes, dir);
    await fs.mkdir(out, { recursive: true });
    await sharp(base).resize(size, size, { fit: 'cover' }).png().toBuffer().then((b) => fs.writeFile(path.join(out, 'ic_launcher.png'), b));
    await sharp(base).resize(size, size, { fit: 'cover' }).png().toBuffer().then((b) => fs.writeFile(path.join(out, 'ic_launcher_round.png'), b));
    await sharp(base).resize(size, size, { fit: 'cover' }).png().toBuffer().then((b) => fs.writeFile(path.join(out, 'ic_launcher_foreground.png'), b));
  }
  console.log('icones Android ecrites');
}

/* --- Splash --- */
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732">
  <defs>
    <linearGradient id="thermal" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#ffc46b" />
      <stop offset="38%" stop-color="#ff8a4c" />
      <stop offset="68%" stop-color="#ff4d6d" />
      <stop offset="100%" stop-color="#b14aff" />
    </linearGradient>
    <linearGradient id="glyph" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#ffe9df" />
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="#070a16" />
  <g transform="translate(1366 1250) scale(0.62) translate(-512 -512)">
    <path d="M628 340a214 214 0 1 0 0 260" fill="none" stroke="url(#glyph)" stroke-width="104" stroke-linecap="round" />
    <circle cx="694" cy="452" r="66" fill="url(#thermal)" />
  </g>
  <text x="1366" y="1830" text-anchor="middle" font-family="Segoe UI, Roboto, sans-serif"
        font-size="150" font-weight="700" letter-spacing="46" fill="#e9edfa">CELSIUS</text>
</svg>`;

await sharp(Buffer.from(splashSvg))
  .png({ compressionLevel: 9 })
  .toFile(path.join(res, 'splash.png'));

console.log('icones + splash generes dans resources/');
