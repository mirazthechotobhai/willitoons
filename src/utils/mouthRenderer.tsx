import React from 'react';
import { CharacterAppearance, LipsFormat } from '../types';

export interface MouthRenderOptions {
  appearance: CharacterAppearance;
  isTalkingFrame?: boolean;
  frame?: number;
  lipSyncViseme?: string; // Optional forced viseme override ('X', 'A', 'B', 'C', 'D', 'E', 'F')
}

// Viseme definitions matching the 13 uploaded mouth shapes
export const VISEME_CONFIGS = [
  { id: 'X', label: 'Neutral / Closed (X)', desc: 'Resting closed lips with cupid bow & shading', defaultType: 'idle' },
  { id: 'A', label: 'Smile / Parted (A)', desc: 'Gentle open lips with upper teeth row', defaultType: 'smile' },
  { id: 'B', label: 'Wide Smile (B)', desc: 'Wide talk shape with prominent teeth', defaultType: 'talkA' },
  { id: 'C', label: 'Open Vowel (C)', desc: 'Open oral cavity with teeth and pink tongue', defaultType: 'talkO' },
  { id: 'D', label: 'Deep Open (D)', desc: 'Deep jaw-drop shout / wide vowel', defaultType: 'angry' },
  { id: 'E', label: 'Round O (E)', desc: 'Puckered round O/U phoneme lips', defaultType: 'talkO' },
  { id: 'F', label: 'Teeth Clenched (F)', desc: 'Upper and lower teeth clenched (F/V/EE)', defaultType: 'talkA' },
];

/**
 * Renders JSX for mouth on canvas in CartoonCharacter
 */
function renderRawMouth(
  options: MouthRenderOptions,
  activeViseme: string,
  effectiveCustomImage?: string
): React.ReactElement {
  const { appearance, isTalkingFrame = false, frame = 0 } = options;
  const isFormat2 = appearance.lipsFormat === 'format2';
  const customImages = appearance.customMouthImages || {};
  const lipColor = appearance.lipColor || '#8D5538';
  const lipShadow = '#673520';
  const lipHighlight = '#A66B4B';
  const cavityColor = '#30110F';
  const teethColor = '#FFFFFF';
  const tongueColor = '#DC6E6C';

  // If user uploaded a custom image for this viseme (or fallback)
  if (effectiveCustomImage) {
    return (
      <image
        href={effectiveCustomImage}
        x="43.5"
        y="19.5"
        width="13"
        height="6.5"
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  // --- FORMAT 1: CLASSIC MINIMALIST CARTOON SVG ---
  if (!isFormat2) {
    if (isTalkingFrame) {
      const talkShape = Math.floor((frame || 0) / 6) % 3;
      if (talkShape === 0) {
        return <ellipse cx="50" cy="22.5" rx="3" ry="4.5" fill="#450a0a" stroke="#881337" strokeWidth="0.8" />;
      } else if (talkShape === 1) {
        return <path d="M46 22 Q50 27 54 22 Z" fill="#7f1d1d" stroke="#450a0a" strokeWidth="0.8" />;
      } else {
        return (
          <g>
            <path d="M46 22 Q50 26 54 22 Z" fill="#881337" />
            <path d="M47 22 Q50 23.5 53 22 Z" fill="#ffffff" />
          </g>
        );
      }
    }

    if (appearance.mouthType === 'smile' || activeViseme === 'A') {
      return <path d="M46 22 Q50 25.5 54 22" fill="none" stroke="#571c12" strokeWidth="1.6" strokeLinecap="round" />;
    } else if (appearance.mouthType === 'angry' || activeViseme === 'D') {
      return <path d="M47 23.5 Q50 21 53 23.5" fill="none" stroke="#571c12" strokeWidth="1.6" strokeLinecap="round" />;
    } else {
      return <path d="M47 22.5 Q50 24 53 22.5" fill="none" stroke="#682a1d" strokeWidth="1.4" strokeLinecap="round" />;
    }
  }

  // --- FORMAT 2: REALISTIC SHADED LIPS (USER PACK REPLACEMENT) ---
  // Modeled precisely after the 13 uploaded shaded brown lips with teeth and tongue
  switch (activeViseme) {
    case 'A': // Mouth_A: Gentle smile with upper teeth
      return (
        <g id="lips-format2-A" transform="translate(50, 22.5)">
          {/* Dark inner mouth cavity */}
          <path d="M -5.2 0 C -4.2 1.8 4.2 1.8 5.2 0 C 4.5 1.9 -4.5 1.9 -5.2 0 Z" fill={cavityColor} />
          {/* Upper teeth row */}
          <path d="M -4.5 0.1 C -2.5 0 2.5 0 4.5 0.1 C 4.2 1.1 -4.2 1.1 -4.5 0.1 Z" fill={teethColor} />
          {/* Tooth separation fine ticks */}
          <line x1="-1.5" y1="0.1" x2="-1.5" y2="0.85" stroke="#E2E8F0" strokeWidth="0.25" />
          <line x1="0" y1="0.1" x2="0" y2="0.9" stroke="#E2E8F0" strokeWidth="0.25" />
          <line x1="1.5" y1="0.1" x2="1.5" y2="0.85" stroke="#E2E8F0" strokeWidth="0.25" />
          {/* Upper shaded lip */}
          <path
            d="M -5.8 0.1 C -3.8 -1.2 -1.5 -0.9 0 -0.4 C 1.5 -0.9 3.8 -1.2 5.8 0.1 C 4.5 0.2 2 0.3 0 0.1 C -2 0.3 -4.5 0.2 -5.8 0.1 Z"
            fill={lipColor}
          />
          {/* Upper lip subtle specular highlight */}
          <path d="M -2.8 -0.6 C -1 -0.8 1 -0.8 2.8 -0.6" stroke={lipHighlight} strokeWidth="0.35" fill="none" strokeLinecap="round" />
          {/* Lower shaded lip */}
          <path
            d="M -5.8 0.1 C -4.2 0.8 -2.2 1.9 0 2 C 2.2 1.9 4.2 0.8 5.8 0.1 C 4.2 2.6 1.8 2.8 0 2.8 C -1.8 2.8 -4.2 2.6 -5.8 0.1 Z"
            fill={lipShadow}
          />
          {/* Lip center shine */}
          <ellipse cx="0" cy="2.1" rx="1.8" ry="0.35" fill={lipHighlight} opacity="0.6" />
        </g>
      );

    case 'B': // Mouth_B / Mouth_A_B: Wide smiling talk mouth
      return (
        <g id="lips-format2-B" transform="translate(50, 22.5)">
          {/* Dark cavity */}
          <path d="M -5.6 -0.1 C -3.8 2.5 3.8 2.5 5.6 -0.1 C 4.2 2.3 -4.2 2.3 -5.6 -0.1 Z" fill={cavityColor} />
          {/* Upper teeth arc */}
          <path d="M -4.8 0 C -2.5 -0.1 2.5 -0.1 4.8 0 C 4.2 1.3 -4.2 1.3 -4.8 0 Z" fill={teethColor} />
          <line x1="-1.6" y1="0.1" x2="-1.6" y2="1.0" stroke="#CBD5E1" strokeWidth="0.25" />
          <line x1="0" y1="0.1" x2="0" y2="1.1" stroke="#CBD5E1" strokeWidth="0.25" />
          <line x1="1.6" y1="0.1" x2="1.6" y2="1.0" stroke="#CBD5E1" strokeWidth="0.25" />
          {/* Upper lip */}
          <path
            d="M -6.2 -0.1 C -4 -1.4 -1.6 -1.1 0 -0.5 C 1.6 -1.1 4 -1.4 6.2 -0.1 C 4.5 0.2 2 0.2 0 0 C -2 0.2 -4.5 0.2 -6.2 -0.1 Z"
            fill={lipColor}
          />
          {/* Lower lip */}
          <path
            d="M -6.2 -0.1 C -4 1.2 -2 2.3 0 2.4 C 2 2.3 4 1.2 6.2 -0.1 C 4.5 2.8 2 3.1 0 3.1 C -2 3.1 -4.5 2.8 -6.2 -0.1 Z"
            fill={lipShadow}
          />
          <ellipse cx="0" cy="2.3" rx="2" ry="0.4" fill={lipHighlight} opacity="0.6" />
        </g>
      );

    case 'C': // Mouth_A_C / Mouth_C: Open vowel / laugh with teeth & pink tongue
      return (
        <g id="lips-format2-C" transform="translate(50, 22.4)">
          {/* Deep mouth cavity */}
          <path d="M -5 -0.2 C -3.5 3.8 3.5 3.8 5 -0.2 C 3.8 3.6 -3.8 3.6 -5 -0.2 Z" fill={cavityColor} />
          {/* Top teeth */}
          <path d="M -4.4 0 C -2.2 -0.1 2.2 -0.1 4.4 0 C 3.8 1.2 -3.8 1.2 -4.4 0 Z" fill={teethColor} />
          {/* Pink tongue at bottom */}
          <path d="M -2.8 2.2 C -1.8 1.3 1.8 1.3 2.8 2.2 C 1.8 3.2 -1.8 3.2 -2.8 2.2 Z" fill={tongueColor} />
          {/* Upper lip */}
          <path
            d="M -5.6 -0.2 C -3.6 -1.3 -1.4 -1 0 -0.5 C 1.4 -1 3.6 -1.3 5.6 -0.2 C 4 0.1 2 0.2 0 0 C -2 0.2 -4 0.1 -5.6 -0.2 Z"
            fill={lipColor}
          />
          {/* Lower lip */}
          <path
            d="M -5.6 -0.2 C -3.6 1.8 -1.8 3.4 0 3.5 C 1.8 3.4 3.6 1.8 5.6 -0.2 C 3.8 3.9 1.8 4.2 0 4.2 C -1.8 4.2 -3.8 3.9 -5.6 -0.2 Z"
            fill={lipShadow}
          />
          <ellipse cx="0" cy="3.3" rx="1.6" ry="0.4" fill={lipHighlight} opacity="0.5" />
        </g>
      );

    case 'D': // Mouth_A_D / Mouth_A_E: Wide deep shouting jaw drop
      return (
        <g id="lips-format2-D" transform="translate(50, 22.4)">
          {/* Deep tall cavity */}
          <path d="M -4.6 -0.4 C -3.2 5 3.2 5 4.6 -0.4 C 3.5 4.8 -3.5 4.8 -4.6 -0.4 Z" fill={cavityColor} />
          {/* Upper teeth */}
          <path d="M -4.1 -0.2 C -2 -0.3 2 -0.3 4.1 -0.2 C 3.6 1.1 -3.6 1.1 -4.1 -0.2 Z" fill={teethColor} />
          {/* Large rounded pink tongue */}
          <path d="M -3 3.1 C -1.8 2.0 1.8 2.0 3 3.1 C 1.8 4.5 -1.8 4.5 -3 3.1 Z" fill={tongueColor} />
          {/* Upper lip */}
          <path
            d="M -5.2 -0.4 C -3.4 -1.4 -1.4 -1.1 0 -0.6 C 1.4 -1.1 3.4 -1.4 5.2 -0.4 C 3.8 -0.1 2 0 0 -0.2 C -2 0 -3.8 -0.1 -5.2 -0.4 Z"
            fill={lipColor}
          />
          {/* Lower jaw lip */}
          <path
            d="M -5.2 -0.4 C -3 2.5 -1.6 4.7 0 4.8 C 1.6 4.7 3 2.5 5.2 -0.4 C 3.5 5.4 1.6 5.6 0 5.6 C -1.6 5.6 -3.5 5.4 -5.2 -0.4 Z"
            fill={lipShadow}
          />
        </g>
      );

    case 'E': // Mouth_D / Mouth_E: Round O / puckered phoneme
      return (
        <g id="lips-format2-E" transform="translate(50, 22.5)">
          {/* Round lips outer ring */}
          <ellipse cx="0" cy="0.4" rx="3.6" ry="4.2" fill={lipColor} />
          {/* Round dark oral cavity */}
          <ellipse cx="0" cy="0.4" rx="2.2" ry="2.7" fill={cavityColor} />
          {/* Subtle tongue in lower hole */}
          <path d="M -1.2 1.6 C -0.8 1.1 0.8 1.1 1.2 1.6 C 0.8 2.4 -0.8 2.4 -1.2 1.6 Z" fill={tongueColor} />
          {/* Specular highlight on bottom rounded lip */}
          <ellipse cx="0" cy="3.6" rx="1.4" ry="0.4" fill={lipHighlight} opacity="0.6" />
          {/* Top highlight */}
          <ellipse cx="0" cy="-2.8" rx="1.2" ry="0.3" fill={lipHighlight} opacity="0.5" />
        </g>
      );

    case 'F': // Mouth_A_F / Mouth_A_D_N: Teeth clenched with visible upper & lower teeth
      return (
        <g id="lips-format2-F" transform="translate(50, 22.5)">
          {/* Cavity background */}
          <path d="M -5.4 0 C -3.8 2 3.8 2 5.4 0 C 4 1.8 -4 1.8 -5.4 0 Z" fill={cavityColor} />
          {/* Upper teeth */}
          <path d="M -4.6 0 C -2.4 -0.1 2.4 -0.1 4.6 0 C 4.2 0.8 -4.2 0.8 -4.6 0 Z" fill={teethColor} />
          {/* Lower teeth */}
          <path d="M -4 1.4 C -2 1.5 2 1.5 4 1.4 C 3.6 0.9 -3.6 0.9 -4 1.4 Z" fill={teethColor} />
          {/* Center dark teeth gap */}
          <line x1="-4.2" y1="0.8" x2="4.2" y2="0.8" stroke={cavityColor} strokeWidth="0.35" />
          {/* Upper lip */}
          <path
            d="M -5.8 0 C -3.8 -1.2 -1.5 -0.9 0 -0.4 C 1.5 -0.9 3.8 -1.2 5.8 0 C 4.2 0.1 2 0.2 0 0 C -2 0.2 -4.2 0.1 -5.8 0 Z"
            fill={lipColor}
          />
          {/* Lower lip */}
          <path
            d="M -5.8 0 C -4 1.1 -2 2.2 0 2.3 C 2 2.2 4 1.1 5.8 0 C 4.2 2.7 1.8 3 0 3 C -1.8 3 -4.2 2.7 -5.8 0 Z"
            fill={lipShadow}
          />
          <ellipse cx="0" cy="2.2" rx="1.8" ry="0.35" fill={lipHighlight} opacity="0.6" />
        </g>
      );

    case 'X': // Mouth_X / Mouth_A_X: Shaded closed resting lips
    default:
      return (
        <g id="lips-format2-X" transform="translate(50, 22.5)">
          {/* Upper lip with realistic cupid's bow */}
          <path
            d="M -5.6 0 C -3.6 -1.2 -1.4 -0.9 0 -0.4 C 1.4 -0.9 3.6 -1.2 5.6 0 C 4 0.3 2 0.5 0 0.4 C -2 0.5 -4 0.3 -5.6 0 Z"
            fill={lipColor}
          />
          {/* Cupid's bow specular shine */}
          <path d="M -2.4 -0.6 C -0.8 -0.8 0.8 -0.8 2.4 -0.6" stroke={lipHighlight} strokeWidth="0.35" fill="none" strokeLinecap="round" />
          {/* Lower lip with soft plump contour */}
          <path
            d="M -5.6 0 C -3.8 0.4 -1.8 0.5 0 0.4 C 1.8 0.5 3.8 0.4 5.6 0 C 4.2 2.1 2 2.5 0 2.5 C -2 2.5 -4.2 2.1 -5.6 0 Z"
            fill={lipShadow}
          />
          {/* Lip parting crease line */}
          <path d="M -5.6 0 C -3 0.4 0 0.3 5.6 0" stroke="#4A1E15" strokeWidth="0.3" fill="none" strokeLinecap="round" />
          {/* Lower lip center highlight glow */}
          <ellipse cx="0" cy="1.6" rx="1.9" ry="0.4" fill={lipHighlight} opacity="0.55" />
        </g>
      );
  }
}

/**
 * Renders mouth on canvas wrapped in strictly locked center anchor and uniform mouthScale
 */
export function renderMouthElement(options: MouthRenderOptions): React.ReactElement {
  const { appearance, isTalkingFrame = false, frame = 0, lipSyncViseme } = options;
  const customImages = appearance.customMouthImages || {};
  const mouthScale = appearance.mouthScale !== undefined ? Math.max(0.3, Math.min(3.0, appearance.mouthScale)) : 1.0;

  // Determine active viseme
  let activeViseme = lipSyncViseme || 'X';
  if (!lipSyncViseme) {
    if (isTalkingFrame) {
      // Natural speech viseme rhythm: X -> A -> B -> C -> E -> F -> B -> D -> C -> A
      const talkCycle = ['X', 'A', 'B', 'C', 'E', 'F', 'B', 'D', 'C', 'A'];
      const talkIdx = Math.floor((frame || 0) / 3) % talkCycle.length;
      activeViseme = talkCycle[talkIdx];
    } else {
      switch (appearance.mouthType) {
        case 'smile':
        case 'mouthA':
          activeViseme = 'A';
          break;
        case 'mouthB':
        case 'talkA':
          activeViseme = 'B';
          break;
        case 'mouthC':
          activeViseme = 'C';
          break;
        case 'mouthD':
          activeViseme = 'D';
          break;
        case 'mouthE':
          activeViseme = 'E';
          break;
        case 'mouthF':
          activeViseme = 'F';
          break;
        case 'mouthX':
        case 'idle':
        default:
          activeViseme = 'X';
          break;
      }
    }
  }

  // Unified talking lip: resolve custom image or best match
  let effectiveCustomImage = customImages[activeViseme];
  if (!effectiveCustomImage && Object.keys(customImages).length > 0) {
    if (activeViseme === 'X') effectiveCustomImage = customImages['X'] || customImages['A'];
    else if (activeViseme === 'A' || activeViseme === 'B') effectiveCustomImage = customImages['B'] || customImages['A'] || customImages['C'];
    else if (activeViseme === 'C' || activeViseme === 'D') effectiveCustomImage = customImages['C'] || customImages['D'] || customImages['B'];
    else if (activeViseme === 'E' || activeViseme === 'F') effectiveCustomImage = customImages['E'] || customImages['F'] || customImages['B'];
    if (!effectiveCustomImage) effectiveCustomImage = Object.values(customImages)[0];
  }

  const innerMouth = renderRawMouth(options, activeViseme, effectiveCustomImage);

  return (
    <g
      id="locked-talking-lip-unit"
      transform={`translate(50, 22.5) scale(${mouthScale}) translate(-50, -22.5)`}
    >
      {innerMouth}
    </g>
  );
}

/**
 * Generates raw SVG string for video export renderer (characterSvgRenderer.ts)
 */
function generateRawMouthSvg(
  options: MouthRenderOptions,
  activeViseme: string,
  effectiveCustomImage?: string
): string {
  const isFormat2 = options.appearance.lipsFormat === 'format2';
  const lipColor = options.appearance.lipColor || '#8D5538';
  const lipShadow = '#673520';
  const lipHighlight = '#A66B4B';
  const cavityColor = '#30110F';
  const teethColor = '#FFFFFF';
  const tongueColor = '#DC6E6C';

  if (effectiveCustomImage) {
    return `<image href="${effectiveCustomImage}" x="43.5" y="19.5" width="13" height="6.5" preserveAspectRatio="xMidYMid meet" />`;
  }

  if (!isFormat2) {
    if (options.isTalkingFrame) {
      const talkShape = Math.floor((options.frame || 0) / 6) % 3;
      if (talkShape === 0) {
        return '<ellipse cx="50" cy="22.5" rx="3" ry="4.5" fill="#450a0a" stroke="#881337" stroke-width="0.8" />';
      } else if (talkShape === 1) {
        return '<path d="M46 22 Q50 27 54 22 Z" fill="#7f1d1d" stroke="#450a0a" stroke-width="0.8" />';
      } else {
        return '<g><path d="M46 22 Q50 26 54 22 Z" fill="#881337" /><path d="M47 22 Q50 23.5 53 22 Z" fill="#ffffff" /></g>';
      }
    }
    if (options.appearance.mouthType === 'smile' || activeViseme === 'A') {
      return '<path d="M46 22 Q50 25.5 54 22" fill="none" stroke="#571c12" stroke-width="1.6" stroke-linecap="round" />';
    } else if (options.appearance.mouthType === 'angry' || activeViseme === 'D') {
      return '<path d="M47 23.5 Q50 21 53 23.5" fill="none" stroke="#571c12" stroke-width="1.6" stroke-linecap="round" />';
    } else {
      return '<path d="M47 22.5 Q50 24 53 22.5" fill="none" stroke="#682a1d" stroke-width="1.4" stroke-linecap="round" />';
    }
  }

  // Format 2 SVGs
  switch (activeViseme) {
    case 'A':
      return `
        <g id="lips-format2-A" transform="translate(50, 22.5)">
          <path d="M -5.2 0 C -4.2 1.8 4.2 1.8 5.2 0 C 4.5 1.9 -4.5 1.9 -5.2 0 Z" fill="${cavityColor}" />
          <path d="M -4.5 0.1 C -2.5 0 2.5 0 4.5 0.1 C 4.2 1.1 -4.2 1.1 -4.5 0.1 Z" fill="${teethColor}" />
          <line x1="-1.5" y1="0.1" x2="-1.5" y2="0.85" stroke="#E2E8F0" stroke-width="0.25" />
          <line x1="0" y1="0.1" x2="0" y2="0.9" stroke="#E2E8F0" stroke-width="0.25" />
          <line x1="1.5" y1="0.1" x2="1.5" y2="0.85" stroke="#E2E8F0" stroke-width="0.25" />
          <path d="M -5.8 0.1 C -3.8 -1.2 -1.5 -0.9 0 -0.4 C 1.5 -0.9 3.8 -1.2 5.8 0.1 C 4.5 0.2 2 0.3 0 0.1 C -2 0.3 -4.5 0.2 -5.8 0.1 Z" fill="${lipColor}" />
          <path d="M -2.8 -0.6 C -1 -0.8 1 -0.8 2.8 -0.6" stroke="${lipHighlight}" stroke-width="0.35" fill="none" stroke-linecap="round" />
          <path d="M -5.8 0.1 C -4.2 0.8 -2.2 1.9 0 2 C 2.2 1.9 4.2 0.8 5.8 0.1 C 4.2 2.6 1.8 2.8 0 2.8 C -1.8 2.8 -4.2 2.6 -5.8 0.1 Z" fill="${lipShadow}" />
          <ellipse cx="0" cy="2.1" rx="1.8" ry="0.35" fill="${lipHighlight}" opacity="0.6" />
        </g>
      `.trim();

    case 'B':
      return `
        <g id="lips-format2-B" transform="translate(50, 22.5)">
          <path d="M -5.6 -0.1 C -3.8 2.5 3.8 2.5 5.6 -0.1 C 4.2 2.3 -4.2 2.3 -5.6 -0.1 Z" fill="${cavityColor}" />
          <path d="M -4.8 0 C -2.5 -0.1 2.5 -0.1 4.8 0 C 4.2 1.3 -4.2 1.3 -4.8 0 Z" fill="${teethColor}" />
          <line x1="-1.6" y1="0.1" x2="-1.6" y2="1.0" stroke="#CBD5E1" stroke-width="0.25" />
          <line x1="0" y1="0.1" x2="0" y2="1.1" stroke="#CBD5E1" stroke-width="0.25" />
          <line x1="1.6" y1="0.1" x2="1.6" y2="1.0" stroke="#CBD5E1" stroke-width="0.25" />
          <path d="M -6.2 -0.1 C -4 -1.4 -1.6 -1.1 0 -0.5 C 1.6 -1.1 4 -1.4 6.2 -0.1 C 4.5 0.2 2 0.2 0 0 C -2 0.2 -4.5 0.2 -6.2 -0.1 Z" fill="${lipColor}" />
          <path d="M -6.2 -0.1 C -4 1.2 -2 2.3 0 2.4 C 2 2.3 4 1.2 6.2 -0.1 C 4.5 2.8 2 3.1 0 3.1 C -2 3.1 -4.5 2.8 -6.2 -0.1 Z" fill="${lipShadow}" />
          <ellipse cx="0" cy="2.3" rx="2" ry="0.4" fill="${lipHighlight}" opacity="0.6" />
        </g>
      `.trim();

    case 'C':
      return `
        <g id="lips-format2-C" transform="translate(50, 22.4)">
          <path d="M -5 -0.2 C -3.5 3.8 3.5 3.8 5 -0.2 C 3.8 3.6 -3.8 3.6 -5 -0.2 Z" fill="${cavityColor}" />
          <path d="M -4.4 0 C -2.2 -0.1 2.2 -0.1 4.4 0 C 3.8 1.2 -3.8 1.2 -4.4 0 Z" fill="${teethColor}" />
          <path d="M -2.8 2.2 C -1.8 1.3 1.8 1.3 2.8 2.2 C 1.8 3.2 -1.8 3.2 -2.8 2.2 Z" fill="${tongueColor}" />
          <path d="M -5.6 -0.2 C -3.6 -1.3 -1.4 -1 0 -0.5 C 1.4 -1 3.6 -1.3 5.6 -0.2 C 4 0.1 2 0.2 0 0 C -2 0.2 -4 0.1 -5.6 -0.2 Z" fill="${lipColor}" />
          <path d="M -5.6 -0.2 C -3.6 1.8 -1.8 3.4 0 3.5 C 1.8 3.4 3.6 1.8 5.6 -0.2 C 3.8 3.9 1.8 4.2 0 4.2 C -1.8 4.2 -3.8 3.9 -5.6 -0.2 Z" fill="${lipShadow}" />
          <ellipse cx="0" cy="3.3" rx="1.6" ry="0.4" fill="${lipHighlight}" opacity="0.5" />
        </g>
      `.trim();

    case 'D':
      return `
        <g id="lips-format2-D" transform="translate(50, 22.4)">
          <path d="M -4.6 -0.4 C -3.2 5 3.2 5 4.6 -0.4 C 3.5 4.8 -3.5 4.8 -4.6 -0.4 Z" fill="${cavityColor}" />
          <path d="M -4.1 -0.2 C -2 -0.3 2 -0.3 4.1 -0.2 C 3.6 1.1 -3.6 1.1 -4.1 -0.2 Z" fill="${teethColor}" />
          <path d="M -3 3.1 C -1.8 2.0 1.8 2.0 3 3.1 C 1.8 4.5 -1.8 4.5 -3 3.1 Z" fill="${tongueColor}" />
          <path d="M -5.2 -0.4 C -3.4 -1.4 -1.4 -1.1 0 -0.6 C 1.4 -1.1 3.4 -1.4 5.2 -0.4 C 3.8 -0.1 2 0 0 -0.2 C -2 0 -3.8 -0.1 -5.2 -0.4 Z" fill="${lipColor}" />
          <path d="M -5.2 -0.4 C -3 2.5 -1.6 4.7 0 4.8 C 1.6 4.7 3 2.5 5.2 -0.4 C 3.5 5.4 1.6 5.6 0 5.6 C -1.6 5.6 -3.5 5.4 -5.2 -0.4 Z" fill="${lipShadow}" />
        </g>
      `.trim();

    case 'E':
      return `
        <g id="lips-format2-E" transform="translate(50, 22.5)">
          <ellipse cx="0" cy="0.4" rx="3.6" ry="4.2" fill="${lipColor}" />
          <ellipse cx="0" cy="0.4" rx="2.2" ry="2.7" fill="${cavityColor}" />
          <path d="M -1.2 1.6 C -0.8 1.1 0.8 1.1 1.2 1.6 C 0.8 2.4 -0.8 2.4 -1.2 1.6 Z" fill="${tongueColor}" />
          <ellipse cx="0" cy="3.6" rx="1.4" ry="0.4" fill="${lipHighlight}" opacity="0.6" />
          <ellipse cx="0" cy="-2.8" rx="1.2" ry="0.3" fill="${lipHighlight}" opacity="0.5" />
        </g>
      `.trim();

    case 'F':
      return `
        <g id="lips-format2-F" transform="translate(50, 22.5)">
          <path d="M -5.4 0 C -3.8 2 3.8 2 5.4 0 C 4 1.8 -4 1.8 -5.4 0 Z" fill="${cavityColor}" />
          <path d="M -4.6 0 C -2.4 -0.1 2.4 -0.1 4.6 0 C 4.2 0.8 -4.2 0.8 -4.6 0 Z" fill="${teethColor}" />
          <path d="M -4 1.4 C -2 1.5 2 1.5 4 1.4 C 3.6 0.9 -3.6 0.9 -4 1.4 Z" fill="${teethColor}" />
          <line x1="-4.2" y1="0.8" x2="4.2" y2="0.8" stroke="${cavityColor}" stroke-width="0.35" />
          <path d="M -5.8 0 C -3.8 -1.2 -1.5 -0.9 0 -0.4 C 1.5 -0.9 3.8 -1.2 5.8 0 C 4.2 0.1 2 0.2 0 0 C -2 0.2 -4.2 0.1 -5.8 0 Z" fill="${lipColor}" />
          <path d="M -5.8 0 C -4 1.1 -2 2.2 0 2.3 C 2 2.2 4 1.1 5.8 0 C 4.2 2.7 1.8 3 0 3 C -1.8 3 -4.2 2.7 -5.8 0 Z" fill="${lipShadow}" />
          <ellipse cx="0" cy="2.2" rx="1.8" ry="0.35" fill="${lipHighlight}" opacity="0.6" />
        </g>
      `.trim();

    case 'X':
    default:
      return `
        <g id="lips-format2-X" transform="translate(50, 22.5)">
          <path d="M -5.6 0 C -3.6 -1.2 -1.4 -0.9 0 -0.4 C 1.4 -0.9 3.6 -1.2 5.6 0 C 4 0.3 2 0.5 0 0.4 C -2 0.5 -4 0.3 -5.6 0 Z" fill="${lipColor}" />
          <path d="M -2.4 -0.6 C -0.8 -0.8 0.8 -0.8 2.4 -0.6" stroke="${lipHighlight}" stroke-width="0.35" fill="none" stroke-linecap="round" />
          <path d="M -5.6 0 C -3.8 0.4 -1.8 0.5 0 0.4 C 1.8 0.5 3.8 0.4 5.6 0 C 4.2 2.1 2 2.5 0 2.5 C -2 2.5 -4.2 2.1 -5.6 0 Z" fill="${lipShadow}" />
          <path d="M -5.6 0 C -3 0.4 0 0.3 5.6 0" stroke="#4A1E15" stroke-width="0.3" fill="none" stroke-linecap="round" />
          <ellipse cx="0" cy="1.6" rx="1.9" ry="0.4" fill="${lipHighlight}" opacity="0.55" />
        </g>
      `.trim();
  }
}

/**
 * Generates raw SVG string for video export renderer (characterSvgRenderer.ts)
 * strictly wrapped in locked face center anchor (50, 22.5) with mouthScale applied.
 */
export function generateMouthSvgString(options: MouthRenderOptions): string {
  const { appearance, isTalkingFrame = false, frame = 0, lipSyncViseme } = options;
  const customImages = appearance.customMouthImages || {};
  const mouthScale = appearance.mouthScale !== undefined ? Math.max(0.3, Math.min(3.0, appearance.mouthScale)) : 1.0;

  // Determine active viseme
  let activeViseme = lipSyncViseme || 'X';
  if (!lipSyncViseme) {
    if (isTalkingFrame) {
      const talkCycle = ['X', 'A', 'B', 'C', 'E', 'F', 'B', 'D', 'C', 'A'];
      const talkIdx = Math.floor((frame || 0) / 3) % talkCycle.length;
      activeViseme = talkCycle[talkIdx];
    } else {
      switch (appearance.mouthType) {
        case 'smile':
        case 'mouthA':
          activeViseme = 'A';
          break;
        case 'mouthB':
        case 'talkA':
          activeViseme = 'B';
          break;
        case 'mouthC':
          activeViseme = 'C';
          break;
        case 'mouthD':
        case 'angry':
          activeViseme = 'D';
          break;
        case 'mouthE':
        case 'talkO':
          activeViseme = 'E';
          break;
        case 'mouthF':
          activeViseme = 'F';
          break;
        case 'mouthX':
        case 'idle':
        default:
          activeViseme = 'X';
          break;
      }
    }
  }

  // Unified talking lip: resolve custom image or best match
  let effectiveCustomImage = customImages[activeViseme];
  if (!effectiveCustomImage && Object.keys(customImages).length > 0) {
    if (activeViseme === 'X') effectiveCustomImage = customImages['X'] || customImages['A'];
    else if (activeViseme === 'A' || activeViseme === 'B') effectiveCustomImage = customImages['B'] || customImages['A'] || customImages['C'];
    else if (activeViseme === 'C' || activeViseme === 'D') effectiveCustomImage = customImages['C'] || customImages['D'] || customImages['B'];
    else if (activeViseme === 'E' || activeViseme === 'F') effectiveCustomImage = customImages['E'] || customImages['F'] || customImages['B'];
    if (!effectiveCustomImage) effectiveCustomImage = Object.values(customImages)[0];
  }

  const innerSvg = generateRawMouthSvg(options, activeViseme, effectiveCustomImage);

  return `<g id="locked-talking-lip-unit" transform="translate(50, 22.5) scale(${mouthScale}) translate(-50, -22.5)">${innerSvg}</g>`;
}

/**
 * Renders a standalone mini SVG preview of a viseme for UI pickers/buttons
 */
export const MouthPreviewThumbnail: React.FC<{
  viseme: string;
  format?: LipsFormat;
  lipColor?: string;
  customImage?: string;
  className?: string;
}> = ({ viseme, format = 'format2', lipColor = '#8D5538', customImage, className = 'w-12 h-8' }) => {
  if (customImage) {
    return (
      <div className={`flex items-center justify-center overflow-hidden rounded bg-slate-100 ${className}`}>
        <img src={customImage} alt={`Viseme ${viseme}`} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  const activeFormat: LipsFormat = (format === 'format1' ? 'format1' : 'format2');

  const dummyAppearance: CharacterAppearance = {
    skinTone: '#c68b59',
    hairStyle: 'short',
    hairColor: '#2b231c',
    eyeType: 'standard',
    mouthType: 'idle',
    lipsFormat: activeFormat,
    lipColor,
    bodyType: 'vest',
    clothingColor: '#ffffff',
    clothingSecondaryColor: '#eeeeee',
    legsType: 'lungi',
    legsColor: '#609a9e',
  };

  return (
    <svg viewBox="42 19 16 8" className={className}>
      {renderMouthElement({
        appearance: dummyAppearance,
        lipSyncViseme: viseme,
      })}
    </svg>
  );
};

