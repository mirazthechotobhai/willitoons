/**
 * Utility functions for detecting GIFs and parsing exact animated GIF durations.
 */

export function isGifMedia(urlOrName?: string, mimeType?: string): boolean {
  if (!urlOrName && !mimeType) return false;
  if (mimeType && mimeType.toLowerCase().includes('image/gif')) return true;
  if (!urlOrName) return false;
  const lower = urlOrName.toLowerCase();
  return (
    lower.endsWith('.gif') ||
    lower.includes('.gif?') ||
    lower.includes('data:image/gif') ||
    lower.includes('/gif')
  );
}

/**
 * Parses binary GIF data to extract exact animated loop duration in seconds.
 * Supports File, Blob, ArrayBuffer, or URL (fetched via fetch API).
 * Returns duration in seconds (e.g. 3.2), or null if static/unparseable.
 */
export async function getGifDuration(source: File | Blob | ArrayBuffer | string): Promise<number | null> {
  try {
    let buffer: ArrayBuffer;
    if (source instanceof ArrayBuffer) {
      buffer = source;
    } else if (source instanceof Blob) {
      buffer = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      const response = await fetch(source);
      if (!response.ok) return null;
      buffer = await response.arrayBuffer();
    } else {
      return null;
    }

    const bytes = new Uint8Array(buffer);
    if (bytes.length < 16) return null;

    // Verify GIF header (GIF87a or GIF89a)
    const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
    if (sig !== 'GIF89a' && sig !== 'GIF87a') {
      return null;
    }

    // Logical screen descriptor (7 bytes at offset 6)
    let pos = 13;
    const packed = bytes[10];
    const hasGlobalColorTable = (packed & 0x80) !== 0;
    if (hasGlobalColorTable) {
      const gctSize = 3 * (1 << ((packed & 0x07) + 1));
      pos += gctSize;
    }

    let totalDurationHundredths = 0;
    let frameCount = 0;

    while (pos < bytes.length) {
      const blockType = bytes[pos];

      // GIF Trailer (End of GIF)
      if (blockType === 0x3b) {
        break;
      }

      // Extension Block (0x21)
      if (blockType === 0x21) {
        if (pos + 1 >= bytes.length) break;
        const extType = bytes[pos + 1];

        // Graphic Control Extension (0xF9)
        if (extType === 0xf9) {
          if (pos + 6 < bytes.length) {
            const blockSize = bytes[pos + 2];
            // Graphic control delay is at offset 4 and 5 in hundredths of a second (little-endian)
            const delayHundredths = bytes[pos + 4] | (bytes[pos + 5] << 8);
            // Browser convention: 0 or 1 hundredth is treated as 10 (100ms)
            const effectiveDelay = delayHundredths <= 1 ? 10 : delayHundredths;
            totalDurationHundredths += effectiveDelay;
            frameCount++;

            pos += 3 + blockSize; // advance past block
            // Skip sub-blocks (terminator 0x00)
            while (pos < bytes.length && bytes[pos] !== 0x00) {
              const subLen = bytes[pos];
              pos += 1 + subLen;
            }
            if (pos < bytes.length && bytes[pos] === 0x00) {
              pos++; // skip terminator
            }
          } else {
            break;
          }
        } else {
          // Other extension: skip header and sub-blocks
          pos += 2;
          while (pos < bytes.length) {
            const subLen = bytes[pos];
            if (subLen === 0x00) {
              pos++;
              break;
            }
            pos += 1 + subLen;
          }
        }
      }
      // Image Descriptor (0x2C)
      else if (blockType === 0x2c) {
        if (pos + 9 >= bytes.length) break;
        const imgPacked = bytes[pos + 9];
        pos += 10; // skip 0x2c + 9 bytes descriptor

        // Local Color Table
        const hasLocalColorTable = (imgPacked & 0x80) !== 0;
        if (hasLocalColorTable) {
          const lctSize = 3 * (1 << ((imgPacked & 0x07) + 1));
          pos += lctSize;
        }

        // LZW Minimum Code Size
        if (pos < bytes.length) {
          pos++; // skip 1 byte
        }

        // Image Data Sub-blocks
        while (pos < bytes.length) {
          const subLen = bytes[pos];
          if (subLen === 0x00) {
            pos++;
            break;
          }
          pos += 1 + subLen;
        }
      } else {
        // Unknown byte or padding
        pos++;
      }
    }

    if (frameCount > 0 && totalDurationHundredths > 0) {
      const durationSec = totalDurationHundredths / 100;
      return Math.max(0.5, Math.round(durationSec * 100) / 100);
    }

    return null;
  } catch (err) {
    console.warn('GIF duration parse error:', err);
    return null;
  }
}
