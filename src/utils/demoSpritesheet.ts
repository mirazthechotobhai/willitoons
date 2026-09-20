import { GROUPS, MOUNTS_SLOTS } from "../data/characterData";

/**
 * Creates a high-fidelity 7710x1028 procedural spritesheet for the 28 walk frames.
 * This guarantees the preview plays immediately even before the user uploads their own walk.png.
 */
export function createDemoSpritesheet(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 7710;
  canvas.height = 1028;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const atlas = GROUPS[0].atlas;
  const frames = atlas.animations.walk.frames;

  frames.forEach((frameName, index) => {
    const frameMeta = atlas.frames[frameName];
    if (!frameMeta) return;

    const { x: cellX, y: cellY } = frameMeta.frame;
    const { x: sX, y: sY, w: sW, h: sH } = frameMeta.spriteSourceSize;

    // Center coordinates inside frame
    const centerX = cellX + sX + sW / 2;
    const groundY = cellY + sY + sH;

    // Walk cycle phase (-1 to +1)
    const phase = (index / 28) * Math.PI * 2;
    const legPhase = Math.sin(phase);
    const bob = Math.abs(Math.sin(phase * 2)) * 8;

    // Head position
    const headY = cellY + sY + 45 - bob;
    const chestY = cellY + sY + 115 - bob;
    const hipY = cellY + sY + 185 - bob;

    ctx.save();

    // Shadow on ground
    ctx.beginPath();
    ctx.ellipse(centerX, groundY - 6, sW * 0.35, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10, 15, 25, 0.4)";
    ctx.fill();

    // Back leg
    const backFootX = centerX - legPhase * (sW * 0.28);
    const backFootY = groundY - Math.max(0, -legPhase) * 18 - 8;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, hipY);
    ctx.lineTo(backFootX - 4, hipY + 60);
    ctx.lineTo(backFootX, backFootY);
    ctx.lineWidth = 22;
    ctx.strokeStyle = "#1e3a8a"; // Dark blue pants
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Back boot
    ctx.beginPath();
    ctx.ellipse(backFootX + 4, backFootY + 2, 14, 8, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#451a03";
    ctx.fill();

    // Torso / Coat
    ctx.beginPath();
    ctx.roundRect(centerX - 36, chestY - 25, 72, 90, [12, 12, 6, 6]);
    ctx.fillStyle = "#0284c7"; // Cyan/Blue adventurer tunic
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0369a1";
    ctx.stroke();

    // Belt
    const beltMount = MOUNTS_SLOTS.belt?.[index];
    const beltY = beltMount ? cellY + beltMount.y : hipY - 5;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(centerX - 38, beltY - 6, 76, 12);
    ctx.fillStyle = "#fbbf24"; // Gold buckle
    ctx.fillRect(centerX - 10, beltY - 9, 20, 18);

    // Front leg
    const frontFootX = centerX + legPhase * (sW * 0.28);
    const frontFootY = groundY - Math.max(0, legPhase) * 18 - 8;
    ctx.beginPath();
    ctx.moveTo(centerX + 8, hipY);
    ctx.lineTo(frontFootX + 4, hipY + 60);
    ctx.lineTo(frontFootX, frontFootY);
    ctx.lineWidth = 22;
    ctx.strokeStyle = "#2563eb"; // Front leg brighter blue
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Front boot
    ctx.beginPath();
    ctx.ellipse(frontFootX + 6, frontFootY + 2, 16, 9, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#78350f";
    ctx.fill();

    // Chest badge / scarf
    ctx.beginPath();
    ctx.moveTo(centerX - 15, chestY - 20);
    ctx.lineTo(centerX + 15, chestY - 20);
    ctx.lineTo(centerX, chestY + 15);
    ctx.closePath();
    ctx.fillStyle = "#f59e0b";
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(centerX, headY, 32, 0, Math.PI * 2);
    ctx.fillStyle = "#fcd34d"; // Skin tone
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#d97706";
    ctx.stroke();

    // Hair / Helmet
    ctx.beginPath();
    ctx.arc(centerX, headY - 6, 33, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#374151";
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(centerX + 8, headY - 2, 4, 0, Math.PI * 2);
    ctx.arc(centerX + 22, headY - 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Front arm swinging
    const rHandMount = MOUNTS_SLOTS.right_hand?.[index];
    const handX = rHandMount ? cellX + rHandMount.x : centerX + Math.cos(phase) * 45;
    const handY = rHandMount ? cellY + rHandMount.y : chestY + 30 + Math.sin(phase) * 20;

    ctx.beginPath();
    ctx.moveTo(centerX + 20, chestY - 10);
    ctx.lineTo(centerX + 28, chestY + 20);
    ctx.lineTo(handX, handY);
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineCap = "round";
    ctx.stroke();

    // Hand glove
    ctx.beginPath();
    ctx.arc(handX, handY, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#78350f";
    ctx.fill();

    ctx.restore();
  });

  return canvas.toDataURL("image/png");
}
