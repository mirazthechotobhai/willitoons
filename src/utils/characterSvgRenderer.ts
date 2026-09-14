import { CharacterModel, CharacterAnimationType } from '../types';
import { generateMouthSvgString } from './mouthRenderer';

function shadeColor(color: string, percent: number): string {
  if (!color || !color.startsWith('#')) return color;
  let num = parseInt(color.slice(1), 16);
  if (color.length === 4) {
    const r = (num >> 8) & 0xf;
    const g = (num >> 4) & 0xf;
    const b = num & 0xf;
    num = ((r * 17) << 16) | ((g * 17) << 8) | (b * 17);
  }
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
}

export function renderCharacterSvgString(
  model: CharacterModel,
  animation: CharacterAnimationType = 'idle',
  frame: number = 0,
  isLipSyncing: boolean = false,
  flipped: boolean = false
): string {
  const { appearance, joints, angle } = model;
  const isAngle34Front = angle === 'threeQuarterFront';
  const isAngle34Back = angle === 'threeQuarterBack';

  let headOffsetY = 0;
  let headRotate = 0;
  let armLRotate = 0;
  let armRRotate = 0;
  let legLRotate = 0;
  let legRRotate = 0;
  let bodyOffsetY = 0;
  let isTalkingFrame = isLipSyncing;

  if (animation === 'idle') {
    headOffsetY = Math.sin(frame * 0.1) * 1.5;
    armLRotate = Math.sin(frame * 0.1) * 2;
    armRRotate = -Math.sin(frame * 0.1) * 2;
  } else if (animation === 'walk') {
    const cycle = frame * 0.2;
    legLRotate = Math.sin(cycle) * 20;
    legRRotate = -Math.sin(cycle) * 20;
    armLRotate = -Math.sin(cycle) * 22;
    armRRotate = Math.sin(cycle) * 22;
    bodyOffsetY = Math.abs(Math.sin(cycle)) * 3;
    headOffsetY = bodyOffsetY * 0.8;
  } else if (animation === 'run') {
    const cycle = frame * 0.35;
    legLRotate = Math.sin(cycle) * 35;
    legRRotate = -Math.sin(cycle) * 35;
    armLRotate = -Math.sin(cycle) * 40;
    armRRotate = Math.sin(cycle) * 40;
    bodyOffsetY = Math.abs(Math.sin(cycle)) * 6;
    headOffsetY = bodyOffsetY;
    headRotate = Math.sin(cycle) * 4;
  } else if (animation === 'talk') {
    isTalkingFrame = true;
    headOffsetY = Math.sin(frame * 0.2) * 2;
    headRotate = Math.sin(frame * 0.15) * 3;
    armLRotate = Math.sin(frame * 0.1) * 8 + 5;
    armRRotate = -Math.sin(frame * 0.1) * 6;
  } else if (animation === 'wave') {
    armRRotate = -110 + Math.sin(frame * 0.3) * 25;
    headRotate = -4;
  } else if (animation === 'dance') {
    const cycle = frame * 0.25;
    bodyOffsetY = Math.abs(Math.sin(cycle)) * 5;
    headRotate = Math.sin(cycle) * 10;
    armLRotate = Math.sin(cycle) * 30 - 30;
    armRRotate = -Math.cos(cycle) * 30 + 30;
    legLRotate = Math.sin(cycle) * 12;
    legRRotate = -Math.sin(cycle) * 12;
  } else if (animation === 'celebrate') {
    armLRotate = 130 + Math.sin(frame * 0.2) * 10;
    armRRotate = -130 - Math.sin(frame * 0.2) * 10;
    bodyOffsetY = Math.abs(Math.sin(frame * 0.2)) * 4;
    headRotate = Math.sin(frame * 0.1) * 5;
  } else if (animation === 'angry') {
    headRotate = Math.sin(frame * 0.5) * 2;
    bodyOffsetY = frame % 10 < 5 ? 1 : 0;
    armLRotate = 15;
    armRRotate = -15;
  } else if (animation === 'bow') {
    bodyOffsetY = 6;
    headOffsetY = 8;
    headRotate = 10;
    armLRotate = 40;
    armRRotate = -40;
  }

  const isBlinking = frame % 55 < 3;

  // Mouth SVG string (Format 1 Classic or Format 2 Realistic Shaded Lips)
  const mouthSvg = generateMouthSvgString({
    appearance,
    isTalkingFrame,
    frame,
  });

  // Lower garment
  let lowerGarmentSvg = '';
  if (appearance.legsType === 'lungi') {
    lowerGarmentSvg = `<path d="M38 52 Q50 54 62 52 L64 78 Q50 82 36 78 Z" fill="${appearance.legsColor}" stroke="${shadeColor(appearance.legsColor, -20)}" stroke-width="1" />`;
  } else if (appearance.legsType === 'dhoti') {
    lowerGarmentSvg = `<g><path d="M39 52 Q50 54 61 52 L63 76 Q56 84 51 68 Q45 84 37 76 Z" fill="${appearance.legsColor}" stroke="${shadeColor(appearance.legsColor, -20)}" stroke-width="1" /><line x1="50" y1="53" x2="50" y2="70" stroke="${shadeColor(appearance.legsColor, -25)}" stroke-width="1.5" /></g>`;
  } else if (appearance.legsType === 'pants') {
    lowerGarmentSvg = `<path d="M40 52 L60 52 L62 82 L53 82 L50 63 L47 82 L38 82 Z" fill="${appearance.legsColor}" />`;
  } else if (appearance.legsType === 'skirt') {
    lowerGarmentSvg = `<path d="M41 52 Q50 54 59 52 L65 84 Q50 87 35 84 Z" fill="${appearance.legsColor}" stroke="${shadeColor(appearance.legsColor, -15)}" stroke-width="1" />`;
  }

  // Torso clothing
  let torsoClothingSvg = '';
  if (appearance.bodyType === 'vest') {
    torsoClothingSvg = `<path d="M43 28 Q50 33 57 28 L59 53 Q50 55 41 53 Z" fill="${appearance.clothingColor}" stroke="#d1d5db" stroke-width="0.8" />`;
  } else if (appearance.bodyType === 'kurta') {
    torsoClothingSvg = `<path d="M40 27 Q50 29 60 27 L63 58 Q50 60 37 58 Z" fill="${appearance.clothingColor}" stroke="${shadeColor(appearance.clothingColor, -20)}" stroke-width="1" />`;
  } else if (appearance.bodyType === 'tshirt') {
    torsoClothingSvg = `<path d="M39 27 Q50 30 61 27 L61 53 Q50 55 39 53 Z" fill="${appearance.clothingColor}" />`;
  } else if (appearance.bodyType === 'saree') {
    torsoClothingSvg = `<g><path d="M42 28 Q50 30 58 28 L60 54 Q50 56 40 54 Z" fill="${appearance.clothingColor}" /><path d="M41 28 L59 48 L56 55 L38 35 Z" fill="${appearance.clothingSecondaryColor || '#f59e0b'}" stroke="#fbbf24" stroke-width="0.8" /></g>`;
  } else if (appearance.bodyType === 'royal') {
    torsoClothingSvg = `<g><path d="M39 26 Q50 28 61 26 L63 60 Q50 62 37 60 Z" fill="${appearance.clothingColor}" /><path d="M48 27 L48 60" stroke="#facc15" stroke-width="2" /><path d="M42 34 L58 48" stroke="#ca8a04" stroke-width="2.5" /><rect x="38" y="50" width="24" height="4" fill="#eab308" rx="1" /></g>`;
  }

  // Hair
  let hairSvg = '';
  if (appearance.hairStyle === 'short') {
    hairSvg = `<path d="M42 16 Q50 9 58 16 Q58 13 50 11 Q42 13 42 16 Z" fill="${appearance.hairColor}" />`;
  } else if (appearance.hairStyle === 'bun') {
    hairSvg = `<circle cx="50" cy="10" r="4.5" fill="${appearance.hairColor}" />`;
  } else if (appearance.hairStyle === 'braids') {
    hairSvg = `<g><path d="M43 14 Q50 9 57 14 Z" fill="${appearance.hairColor}" /><path d="M42 18 Q38 28 40 38" stroke="${appearance.hairColor}" stroke-width="3" fill="none" stroke-linecap="round" /><circle cx="40" cy="38" r="2" fill="#ef4444" /></g>`;
  }

  // Headwear
  let headwearSvg = '';
  if (appearance.additionalHeadwear === 'turban') {
    const hwColor = appearance.headwearColor || '#8c8a3e';
    headwearSvg = `<g><ellipse cx="50" cy="13" rx="8.5" ry="4.5" fill="${hwColor}" /><path d="M42 14 Q50 8 58 14 Q56 16 50 14 Q44 16 42 14 Z" fill="${shadeColor(hwColor, 20)}" /><circle cx="50" cy="11" r="2.5" fill="${shadeColor(hwColor, -20)}" /></g>`;
  }

  // Eyes
  let eyesSvg = '';
  if (!isAngle34Back) {
    if (isBlinking) {
      eyesSvg = `<g stroke="#374151" stroke-width="1.2" stroke-linecap="round"><line x1="46" y1="17.5" x2="48.5" y2="17.5" /><line x1="51.5" y1="17.5" x2="54" y2="17.5" /></g>`;
    } else {
      eyesSvg = `
        <g id="eyes">
          <ellipse cx="47.2" cy="17" rx="1.8" ry="1.9" fill="#ffffff" stroke="#1f2937" stroke-width="0.4" />
          <circle cx="47.5" cy="17" r="1.1" fill="#1e293b" />
          <circle cx="47.8" cy="16.6" r="0.4" fill="#ffffff" />
          <ellipse cx="52.8" cy="17" rx="1.8" ry="1.9" fill="#ffffff" stroke="#1f2937" stroke-width="0.4" />
          <circle cx="52.5" cy="17" r="1.1" fill="#1e293b" />
          <circle cx="52.8" cy="16.6" r="0.4" fill="#ffffff" />
          <path d="M45.5 14.5 Q47.5 13.8 49 14.5" stroke="#18181b" stroke-width="0.9" fill="none" stroke-linecap="round" />
          <path d="M51 14.5 Q52.5 13.8 54.5 14.5" stroke="#18181b" stroke-width="0.9" fill="none" stroke-linecap="round" />
        </g>
      `;
    }
  }

  // Accessories
  let accessoriesSvg = '';
  if (appearance.additionalAccessories === 'tilak') {
    accessoriesSvg += `<g><ellipse cx="50" cy="14" rx="0.9" ry="1.6" fill="#dc2626" /><circle cx="50" cy="15.8" r="0.6" fill="#facc15" /></g>`;
  }
  if (appearance.additionalFacialHair === 'mustache') {
    accessoriesSvg += `<path d="M46 20.8 Q50 19.8 54 20.8 Q51.5 22.2 50 21.2 Q48.5 22.2 46 20.8 Z" fill="#18181b" />`;
  }

  const skinGradId = `skinGrad-${model.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <radialGradient id="${skinGradId}" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stop-color="${appearance.skinTone}" />
          <stop offset="100%" stop-color="${shadeColor(appearance.skinTone, -15)}" />
        </radialGradient>
      </defs>
      <g transform="${flipped ? 'translate(100, 0) scale(-1, 1)' : ''}">
        <g transform="translate(0, ${bodyOffsetY})">
          <!-- LEGS -->
          <g id="legs-group">
            <g transform="rotate(${legLRotate}, ${joints.hipL.x}, ${joints.hipL.y})">
              <line x1="${joints.hipL.x}" y1="${joints.hipL.y}" x2="${joints.kneeL.x}" y2="${joints.kneeL.y}" stroke="url(#${skinGradId})" stroke-width="5.5" stroke-linecap="round" />
              <line x1="${joints.kneeL.x}" y1="${joints.kneeL.y}" x2="${joints.ankleL.x}" y2="${joints.ankleL.y}" stroke="url(#${skinGradId})" stroke-width="4.5" stroke-linecap="round" />
              <ellipse cx="${joints.toeL.x}" cy="${joints.toeL.y}" rx="4.5" ry="2.2" fill="#78350f" />
            </g>
            <g transform="rotate(${legRRotate}, ${joints.hipR.x}, ${joints.hipR.y})">
              <line x1="${joints.hipR.x}" y1="${joints.hipR.y}" x2="${joints.kneeR.x}" y2="${joints.kneeR.y}" stroke="url(#${skinGradId})" stroke-width="5.5" stroke-linecap="round" />
              <line x1="${joints.kneeR.x}" y1="${joints.kneeR.y}" x2="${joints.ankleR.x}" y2="${joints.ankleR.y}" stroke="url(#${skinGradId})" stroke-width="4.5" stroke-linecap="round" />
              <ellipse cx="${joints.toeR.x}" cy="${joints.toeR.y}" rx="4.5" ry="2.2" fill="#78350f" />
            </g>
            ${lowerGarmentSvg}
          </g>

          <!-- TORSO -->
          <g id="torso-group">
            <path d="M41 28 Q50 27 59 28 L61 54 Q50 56 39 54 Z" fill="url(#${skinGradId})" />
            ${torsoClothingSvg}
          </g>

          <!-- ARMS -->
          <g id="armL-group" transform="rotate(${armLRotate}, ${joints.shoulderL.x}, ${joints.shoulderL.y})">
            <line x1="${joints.shoulderL.x}" y1="${joints.shoulderL.y}" x2="${joints.elbowL.x}" y2="${joints.elbowL.y}" stroke="url(#${skinGradId})" stroke-width="4.2" stroke-linecap="round" />
            <line x1="${joints.elbowL.x}" y1="${joints.elbowL.y}" x2="${joints.wristL.x}" y2="${joints.wristL.y}" stroke="url(#${skinGradId})" stroke-width="3.6" stroke-linecap="round" />
            <circle cx="${joints.wristL.x}" cy="${joints.wristL.y}" r="2.8" fill="url(#${skinGradId})" />
          </g>
          <g id="armR-group" transform="rotate(${armRRotate}, ${joints.shoulderR.x}, ${joints.shoulderR.y})">
            <line x1="${joints.shoulderR.x}" y1="${joints.shoulderR.y}" x2="${joints.elbowR.x}" y2="${joints.elbowR.y}" stroke="url(#${skinGradId})" stroke-width="4.2" stroke-linecap="round" />
            <line x1="${joints.elbowR.x}" y1="${joints.elbowR.y}" x2="${joints.wristR.x}" y2="${joints.wristR.y}" stroke="url(#${skinGradId})" stroke-width="3.6" stroke-linecap="round" />
            <circle cx="${joints.wristR.x}" cy="${joints.wristR.y}" r="2.8" fill="url(#${skinGradId})" />
          </g>

          <!-- HEAD & FACE -->
          <g id="head-group" transform="translate(0, ${headOffsetY}) rotate(${headRotate}, ${joints.neck.x}, ${joints.neck.y})">
            <rect x="47" y="24" width="6" height="5" fill="url(#${skinGradId})" rx="2" />
            <ellipse cx="${isAngle34Front ? 50.5 : 50}" cy="18" rx="7.5" ry="8.5" fill="url(#${skinGradId})" />
            <ellipse cx="42.5" cy="18" rx="1.5" ry="2.5" fill="url(#${skinGradId})" />
            <ellipse cx="57.5" cy="18" rx="1.5" ry="2.5" fill="url(#${skinGradId})" />
            ${hairSvg}
            ${headwearSvg}
            ${eyesSvg}
            <path d="M50 17.5 L50.5 19.5 L49.5 20" stroke="#78350f" stroke-width="0.8" fill="none" stroke-linecap="round" />
            ${accessoriesSvg}
            ${mouthSvg}
          </g>
        </g>
      </g>
    </svg>
  `.trim();
}
