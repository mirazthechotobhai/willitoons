import { CharacterAppearance } from '../types';
import { generateMouthSvgString } from './mouthRenderer';

/**
 * Triggers a client-side file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'image/svg+xml') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Triggers a download of a Data URL (e.g. uploaded or generated PNG/JPEG).
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generates an SVG string for a specific mouth viseme.
 */
export function exportVisemeSvg(viseme: string, appearance: CharacterAppearance): string {
  // If user has a custom image for this viseme, and it's SVG or data url:
  const customImg = appearance.customMouthImages?.[viseme];
  if (customImg && customImg.startsWith('data:image/svg+xml')) {
    try {
      const decoded = decodeURIComponent(customImg.split(',')[1]);
      return decoded;
    } catch {
      // fallback to generated
    }
  }

  const lipColor = appearance.lipColor || '#8D5538';
  const innerSvg = generateMouthSvgString({
    appearance,
    lipSyncViseme: viseme,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 18 20 10" width="400" height="200">
  <defs>
    <style>
      .lip-base { fill: ${lipColor}; }
    </style>
  </defs>
  <!-- WilliToons Mouth Viseme: ${viseme} -->
  ${innerSvg}
</svg>`;
}

/**
 * Generates an SVG string for character eyes.
 */
export function exportEyesSvg(appearance: CharacterAppearance): string {
  if (appearance.customEyesImage && appearance.customEyesImage.startsWith('data:image/svg+xml')) {
    try {
      return decodeURIComponent(appearance.customEyesImage.split(',')[1]);
    } catch {
      // fallback
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="42 12 16 10" width="320" height="200">
  <!-- WilliToons Character Eyes Element -->
  <g id="eyes-pair">
    <!-- Left Eye -->
    <ellipse cx="47.2" cy="17" rx="1.8" ry="1.9" fill="#ffffff" stroke="#1f2937" stroke-width="0.4" />
    <circle cx="47.5" cy="17" r="1.1" fill="#1e293b" />
    <circle cx="47.8" cy="16.6" r="0.4" fill="#ffffff" />

    <!-- Right Eye -->
    <ellipse cx="52.8" cy="17" rx="1.8" ry="1.9" fill="#ffffff" stroke="#1f2937" stroke-width="0.4" />
    <circle cx="52.5" cy="17" r="1.1" fill="#1e293b" />
    <circle cx="52.8" cy="16.6" r="0.4" fill="#ffffff" />

    <!-- Eyebrows -->
    <path d="M45.5 14.5 Q47.5 13.8 49 14.5" stroke="#18181b" stroke-width="0.9" fill="none" stroke-linecap="round" />
    <path d="M51 14.5 Q52.5 13.8 54.5 14.5" stroke="#18181b" stroke-width="0.9" fill="none" stroke-linecap="round" />
  </g>
</svg>`;
}

/**
 * Generates an SVG string for head base & ears.
 */
export function exportHeadSvg(appearance: CharacterAppearance): string {
  if (appearance.customHeadImage && appearance.customHeadImage.startsWith('data:image/svg+xml')) {
    try {
      return decodeURIComponent(appearance.customHeadImage.split(',')[1]);
    } catch {
      // fallback
    }
  }

  const skin = appearance.skinTone || '#d49b6a';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="38 6 24 24" width="300" height="300">
  <!-- WilliToons Character Head & Face Element -->
  <g id="head-element">
    <ellipse cx="50" cy="18" rx="7.5" ry="8.5" fill="${skin}" stroke="#57361a" stroke-width="0.5" />
    <!-- Left Ear -->
    <ellipse cx="42.5" cy="18" rx="1.5" ry="2.5" fill="${skin}" stroke="#57361a" stroke-width="0.4" />
    <!-- Right Ear -->
    <ellipse cx="57.5" cy="18" rx="1.5" ry="2.5" fill="${skin}" stroke="#57361a" stroke-width="0.4" />
    <!-- Nose Contour -->
    <path d="M50 17.5 L50.5 19.5 L49.5 20" stroke="#78350f" stroke-width="0.8" fill="none" stroke-linecap="round" />
  </g>
</svg>`;
}

/**
 * Generates an SVG string for hair.
 */
export function exportHairSvg(appearance: CharacterAppearance): string {
  const color = appearance.hairColor || '#1e293b';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="38 6 24 20" width="300" height="250">
  <!-- WilliToons Character Hair Element -->
  <path d="M42 16 Q50 9 58 16 Q58 13 50 11 Q42 13 42 16 Z" fill="${color}" />
</svg>`;
}

/**
 * Generates an SVG string for torso / body clothing.
 */
export function exportBodySvg(appearance: CharacterAppearance): string {
  const color = appearance.clothingColor || '#ffffff';
  const skin = appearance.skinTone || '#d49b6a';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="36 24 28 36" width="350" height="450">
  <!-- WilliToons Character Body / Torso Element -->
  <g id="body-element">
    <!-- Base Torso -->
    <path d="M41 28 Q50 27 59 28 L61 54 Q50 56 39 54 Z" fill="${skin}" />
    <!-- Garment -->
    <path d="M40 27 Q50 29 60 27 L63 58 Q50 60 37 58 Z" fill="${color}" stroke="#64748b" stroke-width="0.8" />
  </g>
</svg>`;
}

/**
 * Generates an SVG string for a hand.
 */
export function exportHandSvg(side: 'left' | 'right', skinColor: string = '#d49b6a'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="160" height="160">
  <!-- WilliToons Character Hand Element (${side}) -->
  <g id="hand-${side}">
    <circle cx="8" cy="8" r="6" fill="${skinColor}" stroke="#57361a" stroke-width="0.5" />
    <path d="M5 8 Q8 10 11 8" stroke="#57361a" stroke-width="0.7" fill="none" stroke-linecap="round" />
  </g>
</svg>`;
}

/**
 * Generates an SVG string for feet / shoes.
 */
export function exportFeetSvg(side: 'left' | 'right', color: string = '#78350f'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" width="200" height="120">
  <!-- WilliToons Character Foot / Shoe Element (${side}) -->
  <ellipse cx="10" cy="6" rx="9" ry="4.5" fill="${color}" stroke="#3b1a07" stroke-width="0.6" />
</svg>`;
}
