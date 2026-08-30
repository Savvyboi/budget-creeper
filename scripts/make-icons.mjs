#!/usr/bin/env node
/**
 * Generate the raster icons the SVG favicon cannot cover: the iOS home-screen
 * icon and the Open Graph card image. Both are flat rectangles, so they are
 * drawn straight into an RGBA buffer and encoded as PNG with zlib — no image
 * library, and the result is byte-identical on every machine.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

class Canvas {
  constructor(width, height, background) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
    this.fill(0, 0, width, height, background, 1);
  }

  fill(x0, y0, w, h, [r, g, b], alpha = 1, radius = 0) {
    const x1 = Math.min(this.width, Math.round(x0 + w));
    const y1 = Math.min(this.height, Math.round(y0 + h));
    const sx = Math.max(0, Math.round(x0));
    const sy = Math.max(0, Math.round(y0));
    for (let y = sy; y < y1; y++) {
      for (let x = sx; x < x1; x++) {
        if (radius > 0 && outsideRounded(x, y, sx, sy, x1, y1, radius)) continue;
        const i = (y * this.width + x) * 4;
        this.data[i] = Math.round(this.data[i] * (1 - alpha) + r * alpha);
        this.data[i + 1] = Math.round(this.data[i + 1] * (1 - alpha) + g * alpha);
        this.data[i + 2] = Math.round(this.data[i + 2] * (1 - alpha) + b * alpha);
        this.data[i + 3] = 255;
      }
    }
  }

  toPng() {
    return encodePng(this.width, this.height, this.data);
  }
}

function outsideRounded(x, y, x0, y0, x1, y1, r) {
  const cx = x < x0 + r ? x0 + r : x > x1 - r - 1 ? x1 - r - 1 : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r - 1 ? y1 - r - 1 : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy > r * r;
}

const BLUE = [27, 79, 160];
const WHITE = [255, 255, 255];
const INK = [14, 24, 44];

/** The mark: four blocks in the proportions of a treemap. */
function drawMark(canvas, x, y, size, opacityScale = 1) {
  const gap = size * 0.045;
  const big = size * 0.56;
  const small = size - big - gap;
  const blocks = [
    [x, y, big, big, 0.96],
    [x + big + gap, y, small, small * 0.72, 0.72],
    [x + big + gap, y + small * 0.72 + gap, small, size - small * 0.72 - gap, 0.55],
    [x, y + big + gap, big, size - big - gap, 0.8],
  ];
  const radius = Math.max(2, size * 0.05);
  for (const [bx, by, bw, bh, alpha] of blocks) {
    canvas.fill(bx, by, bw, bh, WHITE, alpha * opacityScale, radius);
  }
}

async function main() {
  // iOS home screen icon.
  const icon = new Canvas(180, 180, BLUE);
  drawMark(icon, 28, 28, 124);
  await writeFile(path.join(ROOT, 'public', 'apple-touch-icon.png'), icon.toPng());

  // Open Graph card. Text lives in the og:title/description meta tags, so the
  // image stays a clean graphic that reads at thumbnail size.
  const og = new Canvas(1200, 630, INK);
  og.fill(0, 0, 1200, 630, INK, 1);
  og.fill(0, 0, 1200, 10, BLUE, 1);
  drawMark(og, 700, 115, 400, 0.9);
  // A simple composition bar echoing the site's "where the money goes" strip.
  const barColours = [
    [111, 164, 238],
    [85, 198, 156],
    [230, 165, 89],
    [154, 138, 36],
    [141, 118, 200],
  ];
  const widths = [0.42, 0.21, 0.16, 0.12, 0.09];
  let cursor = 90;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] * 520;
    og.fill(cursor, 430, w - 6, 40, barColours[i], 0.9, 6);
    cursor += w;
  }
  await writeFile(path.join(ROOT, 'public', 'og.png'), og.toPng());

  process.stdout.write('Wrote public/apple-touch-icon.png and public/og.png\n');
}

main().catch((err) => {
  process.stderr.write(`${err.stack}\n`);
  process.exitCode = 1;
});
