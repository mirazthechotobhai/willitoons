const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(rowBytes * height);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * rowBytes + 1 + x * 4;
    rawData[offset] = r;
    rawData[offset + 1] = g;
    rawData[offset + 2] = b;
    rawData[offset + 3] = a;
  }

  drawFn(setPixel);

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const chunkType = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([chunkType, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, chunkType, data, crcBuf]);
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c ^= buf[n];
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    return (c ^ 0xffffffff) | 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function generateSpriteSheet(totalFrames, frameWidth, frameHeight) {
  const sheetWidth = totalFrames * frameWidth;
  const sheetHeight = frameHeight;

  return createPng(sheetWidth, sheetHeight, (setPixel) => {
    for (let f = 0; f < totalFrames; f++) {
      const offsetX = f * frameWidth;
      const progress = f / totalFrames;
      const phase = progress * Math.PI * 2;

      const cx = offsetX + Math.floor(frameWidth / 2);
      const cy = Math.floor(frameHeight / 2);
      const scale = frameHeight / 480;

      // Bobbing
      const bob = Math.round(Math.abs(Math.sin(phase * 2)) * 12 * scale);
      const legSwing = Math.sin(phase);

      // Shadow
      for (let y = -4; y <= 4; y++) {
        for (let x = -30; x <= 30; x++) {
          if ((x * x) / 900 + (y * y) / 16 <= 1) {
            setPixel(cx + Math.round(x * scale), cy + Math.round(180 * scale) + y, 10, 15, 25, 120);
          }
        }
      }

      // Head
      const headY = cy - Math.round(100 * scale) - bob;
      const headRadius = Math.round(36 * scale);
      for (let y = -headRadius; y <= headRadius; y++) {
        for (let x = -headRadius; x <= headRadius; x++) {
          if (x * x + y * y <= headRadius * headRadius) {
            setPixel(cx + x, headY + y, 252, 211, 77, 255); // skin
          }
        }
      }

      // Torso
      const torsoTop = headY + headRadius + 4;
      const torsoBottom = torsoTop + Math.round(90 * scale);
      const torsoHalfW = Math.round(34 * scale);
      for (let y = torsoTop; y <= torsoBottom; y++) {
        for (let x = -torsoHalfW; x <= torsoHalfW; x++) {
          setPixel(cx + x, y, 2, 132, 199, 255); // cyan adventurer
        }
      }

      // Legs
      const hipY = torsoBottom;
      const legLen = Math.round(110 * scale);
      const leftFootX = cx - Math.round(legSwing * 40 * scale);
      const rightFootX = cx + Math.round(legSwing * 40 * scale);
      const leftFootY = cy + Math.round(170 * scale) - Math.round(Math.max(0, legSwing) * 20 * scale);
      const rightFootY = cy + Math.round(170 * scale) - Math.round(Math.max(0, -legSwing) * 20 * scale);

      // Draw left leg
      drawLine(cx - 10, hipY, leftFootX, leftFootY, Math.round(16 * scale), [30, 58, 138, 255], setPixel);
      // Draw right leg
      drawLine(cx + 10, hipY, rightFootX, rightFootY, Math.round(16 * scale), [37, 99, 235, 255], setPixel);

      // Boots
      drawCircle(leftFootX, leftFootY, Math.round(12 * scale), [120, 53, 15, 255], setPixel);
      drawCircle(rightFootX, rightFootY, Math.round(12 * scale), [120, 53, 15, 255], setPixel);
    }
  });
}

function drawLine(x0, y0, x1, y1, width, color, setPixel) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;
  const halfW = Math.floor(width / 2);

  while (true) {
    for (let oy = -halfW; oy <= halfW; oy++) {
      for (let ox = -halfW; ox <= halfW; ox++) {
        if (ox * ox + oy * oy <= halfW * halfW) {
          setPixel(cx + ox, cy + oy, color[0], color[1], color[2], color[3]);
        }
      }
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}

function drawCircle(cx, cy, r, color, setPixel) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        setPixel(cx + x, cy + y, color[0], color[1], color[2], color[3]);
      }
    }
  }
}

const pubDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(pubDir)) {
  fs.mkdirSync(pubDir, { recursive: true });
}

// Generate 28-frame spritesheet (28 * 240 x 240 = 6720 x 240)
console.log("Generating demo spritesheet for /character1-run.png...");
const buffer = generateSpriteSheet(28, 240, 240);
fs.writeFileSync(path.join(pubDir, 'character1-run.png'), buffer);
console.log("Created /public/character1-run.png successfully!");
