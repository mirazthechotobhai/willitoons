import React, { useState, useEffect } from 'react';
import { CharacterModel, JointId, CharacterAnimationType } from '../types';
import { BONE_CONNECTIONS } from '../utils/characterPresets';
import { renderMouthElement } from '../utils/mouthRenderer';

interface CartoonCharacterProps {
  model: CharacterModel;
  animation?: CharacterAnimationType;
  skeletonMode?: boolean;
  flipped?: boolean;
  isLipSyncing?: boolean;
  onJointDrag?: (jointId: JointId, newX: number, newY: number) => void;
  interactiveBones?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
  selectedJointId?: JointId | null;
  onSelectJoint?: (jointId: JointId) => void;
}

export const CartoonCharacter: React.FC<CartoonCharacterProps> = ({
  model,
  animation = 'idle',
  skeletonMode = false,
  flipped = false,
  isLipSyncing = false,
  onJointDrag,
  interactiveBones = false,
  width = '100%',
  height = '100%',
  className = '',
  selectedJointId = null,
  onSelectJoint,
}) => {
  const [frame, setFrame] = useState(0);
  const [draggingJoint, setDraggingJoint] = useState<JointId | null>(null);
  const [hoveredJoint, setHoveredJoint] = useState<JointId | null>(null);

  // Animation cycle timer
  useEffect(() => {
    // If interactive bones is active, we don't need continuous animation cycle frames
    if (interactiveBones) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (time - lastTime > 60) {
        setFrame(f => (f + 1) % 60);
        lastTime = time;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [interactiveBones]);

  const { appearance, joints, angle } = model;
  const isAngle34Front = angle === 'threeQuarterFront';
  const isAngle34Back = angle === 'threeQuarterBack';

  // Animation offsets calculation
  let headOffsetY = 0;
  let headRotate = 0;
  let armLRotate = 0;
  let armRRotate = 0;
  let legLRotate = 0;
  let legRRotate = 0;
  let bodyOffsetY = 0;
  let isTalkingFrame = isLipSyncing;

  // If interactive bones mode is enabled (character rig editing), keep pose static so joints and limbs do not drift
  if (interactiveBones) {
    headOffsetY = 0;
    headRotate = 0;
    armLRotate = 0;
    armRRotate = 0;
    legLRotate = 0;
    legRRotate = 0;
    bodyOffsetY = 0;
  } else if (animation === 'idle') {
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
    headRotate = (Math.sin(frame * 0.5) * 2);
    bodyOffsetY = (frame % 10 < 5 ? 1 : 0);
    armLRotate = 15;
    armRRotate = -15;
  } else if (animation === 'bow') {
    bodyOffsetY = 6;
    headOffsetY = 8;
    headRotate = 10;
    armLRotate = 40;
    armRRotate = -40;
  }

  // Handle Joint Dragging for IK
  const handleMouseDown = (jointId: JointId, e: React.MouseEvent | React.TouchEvent) => {
    if (!interactiveBones) return;
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();
    setDraggingJoint(jointId);
    if (onSelectJoint) onSelectJoint(jointId);

    const targetElement = e.target as SVGElement;
    const svgElement = targetElement.ownerSVGElement || targetElement.closest('svg');
    if (!svgElement) return;

    // Set cursor and prevent text selection while dragging
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const updatePosition = (clientX: number, clientY: number) => {
      const rect = svgElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      let rawX = ((clientX - rect.left) / rect.width) * 100;
      let rawY = ((clientY - rect.top) / rect.height) * 100;
      if (flipped) rawX = 100 - rawX;
      rawX = Math.max(4, Math.min(96, rawX));
      rawY = Math.max(4, Math.min(98, rawY));

      if (onJointDrag) {
        // Use 1 decimal precision so movement is silky smooth and not jerky
        onJointDrag(jointId, Math.round(rawX * 10) / 10, Math.round(rawY * 10) / 10);
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onTouchMove = (touchEvent: TouchEvent) => {
      if (touchEvent.touches.length > 0) {
        touchEvent.preventDefault();
        updatePosition(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setDraggingJoint(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  };

  // Eyes state (blinking every few seconds)
  const isBlinking = frame % 55 < 3;

  // Mouth path (Format 1 Classic or Format 2 Realistic Shaded Lips / User Custom)
  const renderMouth = () => {
    return renderMouthElement({
      appearance,
      isTalkingFrame,
      frame,
    });
  };

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{
        width,
        height,
        transform: flipped ? 'scaleX(-1)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible drop-shadow-md"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Skin shadow gradient */}
          <radialGradient id={`skinGrad-${model.id}`} cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor={appearance.skinTone} />
            <stop offset="100%" stopColor={shadeColor(appearance.skinTone, -15)} />
          </radialGradient>
          
          {/* Skeleton Glow Filter */}
          <filter id="skeletonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#06b6d4" />
          </filter>
        </defs>

        {/* CHARACTER BODY LAYERS */}
        <g transform={`translate(0, ${bodyOffsetY})`}>
          
          {/* LEGS / LOWER BODY */}
          <g id="legs-group">
            {/* Left Leg */}
            <g transform={`rotate(${legLRotate}, ${joints.hipL.x}, ${joints.hipL.y})`}>
              <line
                x1={joints.hipL.x}
                y1={joints.hipL.y}
                x2={joints.kneeL.x}
                y2={joints.kneeL.y}
                stroke={`url(#skinGrad-${model.id})`}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <line
                x1={joints.kneeL.x}
                y1={joints.kneeL.y}
                x2={joints.ankleL.x}
                y2={joints.ankleL.y}
                stroke={`url(#skinGrad-${model.id})`}
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Foot / Sandal */}
              <ellipse
                cx={joints.toeL.x}
                cy={joints.toeL.y}
                rx="4.5"
                ry="2.2"
                fill="#78350f"
              />
            </g>

            {/* Right Leg */}
            <g transform={`rotate(${legRRotate}, ${joints.hipR.x}, ${joints.hipR.y})`}>
              <line
                x1={joints.hipR.x}
                y1={joints.hipR.y}
                x2={joints.kneeR.x}
                y2={joints.kneeR.y}
                stroke={`url(#skinGrad-${model.id})`}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <line
                x1={joints.kneeR.x}
                y1={joints.kneeR.y}
                x2={joints.ankleR.x}
                y2={joints.ankleR.y}
                stroke={`url(#skinGrad-${model.id})`}
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Foot / Sandal */}
              <ellipse
                cx={joints.toeR.x}
                cy={joints.toeR.y}
                rx="4.5"
                ry="2.2"
                fill="#78350f"
              />
            </g>

            {/* Lower Garment (Lungi / Dhoti / Pants / Skirt) */}
            {appearance.legsType === 'lungi' && (
              <path
                d={`M38 52 Q50 54 62 52 L64 78 Q50 82 36 78 Z`}
                fill={appearance.legsColor}
                stroke={shadeColor(appearance.legsColor, -20)}
                strokeWidth="1"
              />
            )}
            {appearance.legsType === 'dhoti' && (
              <g>
                <path
                  d={`M39 52 Q50 54 61 52 L63 76 Q56 84 51 68 Q45 84 37 76 Z`}
                  fill={appearance.legsColor}
                  stroke={shadeColor(appearance.legsColor, -20)}
                  strokeWidth="1"
                />
                {/* Dhoti central pleats */}
                <line x1="50" y1="53" x2="50" y2="70" stroke={shadeColor(appearance.legsColor, -25)} strokeWidth="1.5" />
              </g>
            )}
            {appearance.legsType === 'pants' && (
              <path
                d={`M40 52 L60 52 L62 82 L53 82 L50 63 L47 82 L38 82 Z`}
                fill={appearance.legsColor}
              />
            )}
            {appearance.legsType === 'skirt' && (
              <path
                d={`M41 52 Q50 54 59 52 L65 84 Q50 87 35 84 Z`}
                fill={appearance.legsColor}
                stroke={shadeColor(appearance.legsColor, -15)}
                strokeWidth="1"
              />
            )}
          </g>

          {/* TORSO / UPPER BODY */}
          <g id="torso-group">
            {/* Bare / Base Torso */}
            <path
              d="M41 28 Q50 27 59 28 L61 54 Q50 56 39 54 Z"
              fill={`url(#skinGrad-${model.id})`}
            />

            {/* Torso Clothing (Vest, Kurta, Saree, T-shirt, Royal) */}
            {appearance.bodyType === 'vest' && (
              <path
                d="M43 28 Q50 33 57 28 L59 53 Q50 55 41 53 Z"
                fill={appearance.clothingColor}
                stroke="#d1d5db"
                strokeWidth="0.8"
              />
            )}
            {appearance.bodyType === 'kurta' && (
              <path
                d="M40 27 Q50 29 60 27 L63 58 Q50 60 37 58 Z"
                fill={appearance.clothingColor}
                stroke={shadeColor(appearance.clothingColor, -20)}
                strokeWidth="1"
              />
            )}
            {appearance.bodyType === 'tshirt' && (
              <path
                d="M39 27 Q50 30 61 27 L61 53 Q50 55 39 53 Z"
                fill={appearance.clothingColor}
              />
            )}
            {appearance.bodyType === 'saree' && (
              <g>
                <path
                  d="M42 28 Q50 30 58 28 L60 54 Q50 56 40 54 Z"
                  fill={appearance.clothingColor}
                />
                {/* Saree Pallu crossing diagonal */}
                <path
                  d="M41 28 L59 48 L56 55 L38 35 Z"
                  fill={appearance.clothingSecondaryColor}
                  stroke="#fbbf24"
                  strokeWidth="0.8"
                />
              </g>
            )}
            {appearance.bodyType === 'royal' && (
              <g>
                <path
                  d="M39 26 Q50 28 61 26 L63 60 Q50 62 37 60 Z"
                  fill={appearance.clothingColor}
                />
                {/* Gold Royal Embroidered Border & Sash */}
                <path d="M48 27 L48 60" stroke="#facc15" strokeWidth="2" />
                <path d="M42 34 L58 48" stroke="#ca8a04" strokeWidth="2.5" />
                {/* Royal Belt / Kamarbandh */}
                <rect x="38" y="50" width="24" height="4" fill="#eab308" rx="1" />
              </g>
            )}
          </g>

          {/* LEFT ARM */}
          <g id="armL-group" transform={`rotate(${armLRotate}, ${joints.shoulderL.x}, ${joints.shoulderL.y})`}>
            <line
              x1={joints.shoulderL.x}
              y1={joints.shoulderL.y}
              x2={joints.elbowL.x}
              y2={joints.elbowL.y}
              stroke={`url(#skinGrad-${model.id})`}
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <line
              x1={joints.elbowL.x}
              y1={joints.elbowL.y}
              x2={joints.wristL.x}
              y2={joints.wristL.y}
              stroke={`url(#skinGrad-${model.id})`}
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            {/* Hand / Palm */}
            <circle cx={joints.wristL.x} cy={joints.wristL.y} r="2.8" fill={`url(#skinGrad-${model.id})`} />
          </g>

          {/* RIGHT ARM */}
          <g id="armR-group" transform={`rotate(${armRRotate}, ${joints.shoulderR.x}, ${joints.shoulderR.y})`}>
            <line
              x1={joints.shoulderR.x}
              y1={joints.shoulderR.y}
              x2={joints.elbowR.x}
              y2={joints.elbowR.y}
              stroke={`url(#skinGrad-${model.id})`}
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <line
              x1={joints.elbowR.x}
              y1={joints.elbowR.y}
              x2={joints.wristR.x}
              y2={joints.wristR.y}
              stroke={`url(#skinGrad-${model.id})`}
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            {/* Hand / Palm */}
            <circle cx={joints.wristR.x} cy={joints.wristR.y} r="2.8" fill={`url(#skinGrad-${model.id})`} />
          </g>

          {/* HEAD & FACE */}
          <g
            id="head-group"
            transform={`translate(0, ${headOffsetY}) rotate(${headRotate}, ${joints.neck.x}, ${joints.neck.y})`}
          >
            {/* Neck */}
            <rect x="47" y="24" width="6" height="5" fill={`url(#skinGrad-${model.id})`} rx="2" />

            {/* Head Base */}
            <ellipse
              cx={isAngle34Front ? 50.5 : 50}
              cy="18"
              rx="7.5"
              ry="8.5"
              fill={`url(#skinGrad-${model.id})`}
            />

            {/* Ears */}
            <ellipse cx="42.5" cy="18" rx="1.5" ry="2.5" fill={`url(#skinGrad-${model.id})`} />
            <ellipse cx="57.5" cy="18" rx="1.5" ry="2.5" fill={`url(#skinGrad-${model.id})`} />

            {/* Hair (Back/Sides) */}
            {appearance.hairStyle === 'short' && (
              <path
                d="M42 16 Q50 9 58 16 Q58 13 50 11 Q42 13 42 16 Z"
                fill={appearance.hairColor}
              />
            )}
            {appearance.hairStyle === 'bun' && (
              <circle cx="50" cy="10" r="4.5" fill={appearance.hairColor} />
            )}
            {appearance.hairStyle === 'braids' && (
              <g>
                <path d="M43 14 Q50 9 57 14 Z" fill={appearance.hairColor} />
                {/* Long braid */}
                <path d="M42 18 Q38 28 40 38" stroke={appearance.hairColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="40" cy="38" r="2" fill="#ef4444" />
              </g>
            )}

            {/* Headwear: Traditional Turban / Pagri */}
            {appearance.additionalHeadwear === 'turban' && (
              <g>
                {/* Folded Pagri */}
                <ellipse cx="50" cy="13" rx="8.5" ry="4.5" fill={appearance.headwearColor || '#8c8a3e'} />
                <path
                  d="M42 14 Q50 8 58 14 Q56 16 50 14 Q44 16 42 14 Z"
                  fill={shadeColor(appearance.headwearColor || '#8c8a3e', 20)}
                />
                {/* Central knot / fan */}
                <circle cx="50" cy="11" r="2.5" fill={shadeColor(appearance.headwearColor || '#8c8a3e', -20)} />
              </g>
            )}

            {/* EYES */}
            {!isAngle34Back && (
              <g id="eyes">
                {isBlinking ? (
                  /* Blinking lines */
                  <g stroke="#374151" strokeWidth="1.2" strokeLinecap="round">
                    <line x1="46" y1="17.5" x2="48.5" y2="17.5" />
                    <line x1="51.5" y1="17.5" x2="54" y2="17.5" />
                  </g>
                ) : (
                  /* Open Eyes with pupils */
                  <g>
                    {/* Left Eye */}
                    <ellipse cx="47.2" cy="17" rx="1.8" ry="1.9" fill="#ffffff" stroke="#1f2937" strokeWidth="0.4" />
                    <circle cx="47.5" cy="17" r="1.1" fill="#1e293b" />
                    <circle cx="47.8" cy="16.6" r="0.4" fill="#ffffff" />
                    
                    {/* Right Eye */}
                    <ellipse cx="52.8" cy="17" rx="1.8" ry="1.9" fill="#ffffff" stroke="#1f2937" strokeWidth="0.4" />
                    <circle cx="52.5" cy="17" r="1.1" fill="#1e293b" />
                    <circle cx="52.8" cy="16.6" r="0.4" fill="#ffffff" />

                    {/* Eyebrows */}
                    <path d="M45.5 14.5 Q47.5 13.8 49 14.5" stroke="#18181b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                    <path d="M51 14.5 Q52.5 13.8 54.5 14.5" stroke="#18181b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                  </g>
                )}

                {/* Nose */}
                <path d="M50 17.5 L50.5 19.5 L49.5 20" stroke="#78350f" strokeWidth="0.8" fill="none" strokeLinecap="round" />

                {/* Tilak / Bindi */}
                {appearance.additionalAccessories === 'tilak' && (
                  <g>
                    <ellipse cx="50" cy="14" rx="0.9" ry="1.6" fill="#dc2626" />
                    <circle cx="50" cy="15.8" r="0.6" fill="#facc15" />
                  </g>
                )}

                {/* Mustache */}
                {appearance.additionalFacialHair === 'mustache' && (
                  <path
                    d="M46 20.8 Q50 19.8 54 20.8 Q51.5 22.2 50 21.2 Q48.5 22.2 46 20.8 Z"
                    fill="#18181b"
                  />
                )}

                {/* Mouth */}
                {renderMouth()}
              </g>
            )}
          </g>

        </g>

        {/* SKELETON IK RIGGING OVERLAY */}
        {skeletonMode && (
          <g id="skeleton-ik-overlay" filter="url(#skeletonGlow)">
            {/* Bone Lines (Cyan Glowing Lines) */}
            {BONE_CONNECTIONS.map(bone => {
              const fromPt = joints[bone.from];
              const toPt = joints[bone.to];
              if (!fromPt || !toPt) return null;
              return (
                <line
                  key={`${bone.from}-${bone.to}`}
                  x1={fromPt.x}
                  y1={fromPt.y}
                  x2={toPt.x}
                  y2={toPt.y}
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.95"
                />
              );
            })}

            {/* Joint Points (Cyan Circles with Handles) */}
            {Object.entries(joints).map(([key, rawPt]) => {
              const jointId = key as JointId;
              const pt = rawPt as { x: number; y: number };
              const isSelected = selectedJointId === jointId;
              const isDragging = draggingJoint === jointId;
              const isHovered = hoveredJoint === jointId;

              return (
                <g
                  key={jointId}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  onMouseEnter={() => setHoveredJoint(jointId)}
                  onMouseLeave={() => setHoveredJoint(null)}
                  onMouseDown={e => handleMouseDown(jointId, e)}
                  onTouchStart={e => handleMouseDown(jointId, e)}
                  onClick={e => {
                    e.stopPropagation();
                    if (onSelectJoint) onSelectJoint(jointId);
                  }}
                  className={interactiveBones ? 'cursor-grab active:cursor-grabbing' : ''}
                >
                  {/* Invisible generous hit target (r=7.5) so clicks and drags never miss */}
                  {interactiveBones && (
                    <circle r="7.5" fill="transparent" />
                  )}

                  {/* Outer selection / hover halo - stable coordinates, never jumps */}
                  {(isSelected || isHovered || isDragging) && (
                    <circle
                      r={isDragging ? 5.8 : isSelected ? 5.2 : 4.6}
                      fill="none"
                      stroke={isDragging ? '#0284c7' : isSelected ? '#38bdf8' : '#22d3ee'}
                      strokeWidth="1.2"
                      strokeDasharray={isSelected ? 'none' : '2 1.5'}
                      opacity="0.9"
                    />
                  )}

                  {/* Main Joint Point */}
                  <circle
                    r={isDragging ? 4.2 : isSelected ? 3.8 : isHovered ? 3.5 : 2.9}
                    fill={isDragging ? '#0284c7' : isSelected ? '#0284c7' : isHovered ? '#0891b2' : '#06b6d4'}
                    stroke="#ffffff"
                    strokeWidth={isSelected || isDragging ? 1.5 : 1.1}
                  />

                  {/* Inner center dot */}
                  <circle r={isSelected || isDragging ? 1.4 : 1} fill="#ffffff" />
                </g>
              );
            })}

            {/* Red IK Ground Root Cross indicator */}
            <g transform="translate(53, 94.5)">
              <line x1="-3" y1="-3" x2="3" y2="3" stroke="#ef4444" strokeWidth="1.5" />
              <line x1="3" y1="-3" x2="-3" y2="3" stroke="#ef4444" strokeWidth="1.5" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};

// Simple color shade helper
function shadeColor(color: string, percent: number): string {
  if (!color || !color.startsWith('#')) return color;
  let num = parseInt(color.slice(1), 16);
  if (color.length === 4) {
    // #RGB
    const r = (num >> 8) & 0xf;
    const g = (num >> 4) & 0xf;
    const b = num & 0xf;
    num = (r * 17) << 16 | (g * 17) << 8 | (b * 17);
  }
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
}
