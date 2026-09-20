// Stitch individual frames (1.png to 28.png) into a Godot-compatible walk.png spritesheet
// Matches public/character_sundor_v/walk.tres: 15 frames per row, 512x512 with 2px gap (step 514)

export function stitchFramesToSpritesheet(
  images: HTMLImageElement[],
  framesPerRow: number = 15,
  frameWidth: number = 512,
  frameHeight: number = 512,
  stepX: number = 514,
  stepY: number = 514
): HTMLCanvasElement {
  const totalFrames = images.length;
  const numCols = Math.min(totalFrames, framesPerRow);
  const numRows = Math.ceil(totalFrames / framesPerRow);

  const canvasWidth = numCols > 0 ? (numCols - 1) * stepX + frameWidth : 7710;
  const canvasHeight = numRows > 0 ? (numRows - 1) * stepY + frameHeight : 1028;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(7710, canvasWidth);
  canvas.height = Math.max(1028, canvasHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  images.forEach((img, idx) => {
    const col = idx % framesPerRow;
    const row = Math.floor(idx / framesPerRow);

    const destX = col * stepX;
    const destY = row * stepY;

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    let targetW = iw;
    let targetH = ih;

    // Scale to fit within frameWidth x frameHeight if larger
    if (iw > frameWidth || ih > frameHeight) {
      const aspect = iw / ih;
      if (aspect > 1) {
        targetW = frameWidth;
        targetH = Math.round(frameWidth / aspect);
      } else {
        targetH = frameHeight;
        targetW = Math.round(frameHeight * aspect);
      }
    }

    const offsetX = Math.round((frameWidth - targetW) / 2);
    const offsetY = Math.round((frameHeight - targetH) / 2);

    ctx.drawImage(img, destX + offsetX, destY + offsetY, targetW, targetH);
  });

  return canvas;
}
