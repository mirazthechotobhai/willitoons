// Utility for cropping image based on physics collision bounding box

import { ANIMATION_PHYSICS } from "../data/characterData";

export interface PhysicsBoxBounds {
  x: number; // In original frame pixel space (0..frameSize)
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates absolute pixel bounds from normalized collision body definition
 */
export function getPhysicsBoxBounds(
  frameSize: number = 512,
  paddingPercent: number = 0.05 // Optional slight margin around physics box
): PhysicsBoxBounds {
  const walkPhys = ANIMATION_PHYSICS.animationPhysics.walk.collisionBody;
  const cx = walkPhys.cx * frameSize;
  const cy = walkPhys.cy * frameSize;
  const hw = walkPhys.hw * frameSize;
  const hh = walkPhys.hh * frameSize;

  const padX = hw * paddingPercent;
  const padY = hh * paddingPercent;

  const rawX = Math.max(0, cx - hw - padX);
  const rawY = Math.max(0, cy - hh - padY);
  const rawW = Math.min(frameSize - rawX, (hw + padX) * 2);
  const rawH = Math.min(frameSize - rawY, (hh + padY) * 2);

  return {
    x: Math.round(rawX),
    y: Math.round(rawY),
    width: Math.round(rawW),
    height: Math.round(rawH),
  };
}

/**
 * Crops a single frame data URL or image element to the physics collision box bounds
 */
export async function cropFrameToPhysicsBox(
  source: string | HTMLImageElement,
  bounds: PhysicsBoxBounds
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement) => {
      const canvas = document.createElement("canvas");
      canvas.width = bounds.width;
      canvas.height = bounds.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Cannot get 2D canvas context"));
        return;
      }

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height
      );

      resolve(canvas.toDataURL("image/png"));
    };

    if (typeof source === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = (e) => reject(e);
      img.src = source;
    } else {
      if (source.complete) {
        processImage(source);
      } else {
        source.onload = () => processImage(source);
      }
    }
  });
}
