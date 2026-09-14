import React, { useState, useRef, useEffect } from 'react';
import { CharacterModel, JointId, CharacterAnimationType, CharacterAngle } from '../types';
import { CartoonCharacter } from './CartoonCharacter';
import { DEFAULT_JOINTS, ANIMATION_PRESETS } from '../utils/characterPresets';
import {
  X,
  Lock,
  Upload,
  RotateCcw,
  Download,
  Trash2,
  Maximize2,
  Hand,
  PenTool,
  ZoomIn,
  ZoomOut,
  Smile,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Compass,
  Play,
  Square,
  Image,
  FileUp,
  Check,
  RefreshCw,
  Palette,
} from 'lucide-react';
import { VISEME_CONFIGS, MouthPreviewThumbnail } from '../utils/mouthRenderer';

interface CharacterStudioModalProps {
  initialCharacter?: CharacterModel;
  isOpen: boolean;
  onClose: () => void;
  onSaveCharacter: (character: CharacterModel) => void;
}

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  initialCharacter,
  isOpen,
  onClose,
  onSaveCharacter,
}) => {
  const [charData, setCharData] = useState<CharacterModel>(() => {
    if (initialCharacter) return JSON.parse(JSON.stringify(initialCharacter));
    return {
      id: `char-custom-${Date.now()}`,
      name: 'Custom Village Character',
      category: 'Desi',
      thumbnail: '👨🏽‍🌾',
      angle: 'threeQuarterFront',
      joints: { ...DEFAULT_JOINTS },
      appearance: {
        skinTone: '#c68b59',
        hairStyle: 'short',
        hairColor: '#2b231c',
        eyeType: 'standard',
        mouthType: 'idle',
        bodyType: 'vest',
        clothingColor: '#f1ede4',
        clothingSecondaryColor: '#e0d8c8',
        legsType: 'lungi',
        legsColor: '#609a9e',
        additionalHeadwear: 'turban',
        headwearColor: '#8c8a3e',
        additionalFacialHair: 'mustache',
        additionalAccessories: 'tilak',
      },
      isCustom: true,
    };
  });

  const [activeAngle, setActiveAngle] = useState<CharacterAngle>(charData.angle || 'threeQuarterFront');
  const [previewAnimIndex, setPreviewAnimIndex] = useState(0);
  const [skeletonMode, setSkeletonMode] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedJoint, setSelectedJoint] = useState<JointId | null>(null);

  // Lips Format 2 & custom replacement state
  const [isTalkingTest, setIsTalkingTest] = useState(false);
  const [activeUploadViseme, setActiveUploadViseme] = useState<string>('X');
  const [isDraggingMouth, setIsDraggingMouth] = useState(false);
  const mouthFileInputRef = useRef<HTMLInputElement>(null);

  const handleMouthFilesUpload = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const name = file.name.toUpperCase();
        let matchedViseme = activeUploadViseme;
        if (name.includes('MOUTH')) {
          if (name.includes('MOUTH_X') || name.includes('A_X')) matchedViseme = 'X';
          else if (name.includes('MOUTH_A_B') || name.includes('MOUTH_B')) matchedViseme = 'B';
          else if (name.includes('MOUTH_A_C') || name.includes('MOUTH_C')) matchedViseme = 'C';
          else if (name.includes('MOUTH_A_D_N') || name.includes('MOUTH_A_F')) matchedViseme = 'F';
          else if (name.includes('MOUTH_A_D') || name.includes('MOUTH_A_E')) matchedViseme = 'D';
          else if (name.includes('MOUTH_D') || name.includes('MOUTH_E')) matchedViseme = 'E';
          else if (name.includes('MOUTH_A')) matchedViseme = 'A';
        }

        setCharData(prev => ({
          ...prev,
          appearance: {
            ...prev.appearance,
            lipsFormat: 'format2',
            customMouthImages: {
              ...(prev.appearance.customMouthImages || {}),
              [matchedViseme]: dataUrl,
            },
          },
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Pan and navigation states for full-body inspection
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panToolActive, setPanToolActive] = useState(false);
  const [spacebarDown, setSpacebarDown] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; startPanX: number; startPanY: number }>({
    mouseX: 0,
    mouseY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Spacebar keyboard listener for temporary Pan Tool (Figma/Photoshop standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !spacebarDown &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setSpacebarDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacebarDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacebarDown]);

  // Window drag listeners when panning
  useEffect(() => {
    if (!isPanning) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPanOffset({
        x: Math.round(panStartRef.current.startPanX + dx),
        y: Math.round(panStartRef.current.startPanY + dy),
      });
    };

    const onMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning]);

  // Accordion section states
  const [openSection, setOpenSection] = useState<'layers' | 'feet' | 'eyes' | 'transform'>('layers');
  const [openLayerSub, setOpenLayerSub] = useState<string | null>('head');

  // Synchronize with initialCharacter when opening
  useEffect(() => {
    if (initialCharacter) {
      setCharData(JSON.parse(JSON.stringify(initialCharacter)));
      setActiveAngle(initialCharacter.angle || 'threeQuarterFront');
    }
  }, [initialCharacter]);

  if (!isOpen) return null;

  const currentAnim = ANIMATION_PRESETS[previewAnimIndex];

  const handleJointDrag = (jointId: JointId, newX: number, newY: number) => {
    setCharData(prev => ({
      ...prev,
      joints: {
        ...prev.joints,
        [jointId]: { x: newX, y: newY },
      },
    }));
  };

  const handleResetPose = () => {
    setCharData(prev => ({
      ...prev,
      joints: { ...DEFAULT_JOINTS },
    }));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleAngleChange = (angle: CharacterAngle) => {
    setActiveAngle(angle);
    setCharData(prev => ({ ...prev, angle }));
  };

  const handleSave = () => {
    onSaveCharacter(charData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4">
      <div className="relative flex flex-col w-full h-full max-w-[1400px] max-h-[920px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden text-slate-800">
        
        {/* TOP MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
          {/* Angle Switcher Tabs */}
          <div className="flex items-center space-x-6 text-sm font-semibold">
            {(['threeQuarterFront', 'front', 'threeQuarterBack'] as CharacterAngle[]).map(ang => {
              const label =
                ang === 'threeQuarterFront' ? '3/4 Front' : ang === 'front' ? 'Front' : '3/4 Back';
              const isActive = activeAngle === ang;
              return (
                <button
                  key={ang}
                  onClick={() => handleAngleChange(ang)}
                  className={`relative pb-2 pt-1 transition-colors cursor-pointer ${
                    isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Header Buttons */}
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Watch Quick Guide</span>
            </button>

            <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800">
              <span>⚡ 0</span>
            </div>

            <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs">
              Upgrade
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN STUDIO THREE-COLUMN WORKSPACE */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT COLUMN: ACCORDION LAYERS & RIGGING CONTROLS */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
            
            {/* Change Feet */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => setOpenSection(openSection === 'feet' ? 'layers' : 'feet')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span>Change Feet</span>
                </div>
                <span>{openSection === 'feet' ? '−' : '+'}</span>
              </button>
              {openSection === 'feet' && (
                <div className="p-3 bg-slate-50 space-y-2 text-xs">
                  <div className="text-slate-500 font-medium">Footwear Type:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['barefoot', 'sandals', 'shoes', 'boots'].map(fw => (
                      <button
                        key={fw}
                        onClick={() => {
                          setCharData(prev => ({
                            ...prev,
                            appearance: { ...prev.appearance, legsType: prev.appearance.legsType },
                          }));
                        }}
                        className="py-1.5 px-2 capitalize text-center bg-white hover:bg-blue-50 text-slate-700 rounded border border-slate-200 shadow-xs"
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Change Eyes */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => setOpenSection(openSection === 'eyes' ? 'layers' : 'eyes')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span>Change Eyes</span>
                </div>
                <span>{openSection === 'eyes' ? '−' : '+'}</span>
              </button>
              {openSection === 'eyes' && (
                <div className="p-3 bg-slate-50 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    {['standard', 'kind', 'big', 'determined', 'angry'].map(eye => (
                      <button
                        key={eye}
                        onClick={() => {
                          setCharData(prev => ({
                            ...prev,
                            appearance: { ...prev.appearance, eyeType: eye },
                          }));
                        }}
                        className={`py-1.5 px-2 capitalize text-center rounded border transition-colors shadow-xs ${
                          charData.appearance.eyeType === eye
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {eye}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transform */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => setOpenSection(openSection === 'transform' ? 'layers' : 'transform')}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span>Transform & Canvas</span>
                </div>
                <span>{openSection === 'transform' ? '−' : '+'}</span>
              </button>
              {openSection === 'transform' && (
                <div className="p-3 bg-slate-50 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-600 font-semibold">Scale / Zoom</label>
                      <span className="font-mono text-blue-600 font-bold">{Math.round(zoomLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="3.0"
                      step="0.05"
                      value={zoomLevel}
                      onChange={e => setZoomLevel(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-slate-600">
                    <span className="text-xs">Pan: X: {panOffset.x}px, Y: {panOffset.y}px</span>
                    <button
                      onClick={handleResetView}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      Recenter
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 font-medium">Flip Horizontal</span>
                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      className={`px-3 py-1 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                        isFlipped ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      {isFlipped ? 'Flipped' : 'Normal'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Layers */}
            <div className="border-b border-slate-100 flex-1">
              <div className="flex items-center justify-between px-4 py-3 text-sm font-bold bg-slate-50 text-slate-800 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span>Layers</span>
                </div>
                <span>−</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* Head */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'head' ? null : 'head')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span className="flex items-center space-x-2">
                      <span>😊</span>
                      <span>Head</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'head' ? 'rotate-180' : ''}`} />
                  </button>
                  {openLayerSub === 'head' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div>
                        <div className="text-slate-500 font-medium mb-1.5">Skin Tone:</div>
                        <div className="flex space-x-2">
                          {['#fcd34d', '#f3c59a', '#c68b59', '#b87c4f', '#965935', '#63371f'].map(skin => (
                            <button
                              key={skin}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, skinTone: skin },
                                }))
                              }
                              className={`w-6 h-6 rounded-full border-2 transition-transform shadow-xs ${
                                charData.appearance.skinTone === skin ? 'border-blue-600 scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: skin }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 font-medium mb-1.5">Hair Style:</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['short', 'bun', 'braids', 'turban', 'crest', 'none'].map(hair => (
                            <button
                              key={hair}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, hairStyle: hair },
                                }))
                              }
                              className={`py-1 capitalize text-center rounded border shadow-xs ${
                                charData.appearance.hairStyle === hair
                                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {hair}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Eyes */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'eyes' ? null : 'eyes')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👁</span>
                      <span>Eyes</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'eyes' ? 'rotate-180' : ''}`} />
                  </button>
                  {openLayerSub === 'eyes' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-2 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-1.5">
                        {['standard', 'kind', 'big', 'determined', 'angry'].map(eye => (
                          <button
                            key={eye}
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: { ...p.appearance, eyeType: eye },
                              }))
                            }
                            className={`py-1.5 capitalize rounded border shadow-xs ${
                              charData.appearance.eyeType === eye
                                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {eye}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lips / Mouth Formats */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'lips' ? null : 'lips')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👄</span>
                      <span>Lips / Mouth (Format 1 & 2)</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {charData.appearance.lipsFormat === 'format2' ? 'Format 2 (Realistic)' : 'Format 1 (Classic)'}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'lips' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'lips' && (
                    <div className="px-4 py-3 bg-slate-50/90 space-y-3.5 border-t border-slate-100 text-xs">
                      {/* Format Switcher */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Select Lips Format
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: { ...p.appearance, lipsFormat: 'format1' },
                              }))
                            }
                            className={`py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer ${
                              charData.appearance.lipsFormat !== 'format2'
                                ? 'bg-white text-blue-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Format 1: Classic
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: {
                                  ...p.appearance,
                                  lipsFormat: 'format2',
                                  lipColor: p.appearance.lipColor || '#8D5538',
                                },
                              }))
                            }
                            className={`py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                              charData.appearance.lipsFormat === 'format2'
                                ? 'bg-white text-blue-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>Format 2: Realistic</span>
                            <span className="text-[9px] bg-amber-500 text-white px-1 py-0.2 rounded-full">New</span>
                          </button>
                        </div>
                      </div>

                      {/* FORMAT 1 CONTROLS */}
                      {charData.appearance.lipsFormat !== 'format2' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Classic Cartoon Mouth Shape
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {['idle', 'smile', 'talkA', 'angry'].map(mouth => (
                              <button
                                key={mouth}
                                type="button"
                                onClick={() =>
                                  setCharData(p => ({
                                    ...p,
                                    appearance: { ...p.appearance, mouthType: mouth },
                                  }))
                                }
                                className={`py-1.5 capitalize rounded border shadow-xs transition-colors cursor-pointer ${
                                  charData.appearance.mouthType === mouth
                                    ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                {mouth}
                              </button>
                            ))}
                          </div>
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-tight">
                            💡 Switch to <strong>Format 2</strong> to use realistic shaded lips with teeth & tongue, or upload custom mouth replacement images!
                          </div>
                        </div>
                      )}

                      {/* FORMAT 2 CONTROLS */}
                      {charData.appearance.lipsFormat === 'format2' && (
                        <div className="space-y-3">
                          {/* Viseme Selection Grid */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Viseme / Mouth Shape
                              </label>
                              <span className="text-[10px] text-slate-400">7 Expressive Shapes</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
                              {VISEME_CONFIGS.map(v => {
                                const isCurrent =
                                  charData.appearance.mouthType === `mouth${v.id}` ||
                                  (v.id === 'X' && (charData.appearance.mouthType === 'idle' || charData.appearance.mouthType === 'mouthX')) ||
                                  (v.id === 'A' && charData.appearance.mouthType === 'smile') ||
                                  (v.id === 'B' && charData.appearance.mouthType === 'talkA') ||
                                  (v.id === 'D' && charData.appearance.mouthType === 'angry') ||
                                  (v.id === 'E' && charData.appearance.mouthType === 'talkO');
                                const hasCustom = !!charData.appearance.customMouthImages?.[v.id];

                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveUploadViseme(v.id);
                                      setCharData(p => ({
                                        ...p,
                                        appearance: {
                                          ...p.appearance,
                                          mouthType: `mouth${v.id}`,
                                        },
                                      }));
                                    }}
                                    className={`flex items-center justify-between p-1.5 rounded-lg border transition-all text-left cursor-pointer ${
                                      isCurrent
                                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <MouthPreviewThumbnail
                                        viseme={v.id}
                                        format="format2"
                                        lipColor={charData.appearance.lipColor || '#8D5538'}
                                        customImage={charData.appearance.customMouthImages?.[v.id]}
                                        className="w-10 h-6 bg-slate-100/70 rounded p-0.5"
                                      />
                                      <div>
                                        <div className="flex items-center space-x-1.5">
                                          <span className="font-bold text-[11px]">{v.label}</span>
                                          {hasCustom && (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-semibold">
                                              Custom PNG
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 line-clamp-1">{v.desc}</div>
                                      </div>
                                    </div>
                                    {isCurrent && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Lip Color & Presets */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Lip Shade / Tint
                              </label>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {charData.appearance.lipColor || '#8D5538'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {[
                                { name: 'Natural Brown', color: '#8D5538' },
                                { name: 'Deep Mocha', color: '#673520' },
                                { name: 'Terracotta', color: '#A0522D' },
                                { name: 'Skin Match', color: charData.appearance.skinTone || '#c68b59' },
                                { name: 'Warm Coral', color: '#B85D65' },
                                { name: 'Classic Wine', color: '#881337' },
                              ].map(shade => (
                                <button
                                  key={shade.color}
                                  type="button"
                                  title={shade.name}
                                  onClick={() =>
                                    setCharData(p => ({
                                      ...p,
                                      appearance: { ...p.appearance, lipColor: shade.color },
                                    }))
                                  }
                                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                    (charData.appearance.lipColor || '#8D5538') === shade.color
                                      ? 'scale-110 border-blue-600 shadow-xs'
                                      : 'border-white hover:scale-105 shadow-xs'
                                  }`}
                                  style={{ backgroundColor: shade.color }}
                                />
                              ))}
                              <input
                                type="color"
                                value={charData.appearance.lipColor || '#8D5538'}
                                onChange={e =>
                                  setCharData(p => ({
                                    ...p,
                                    appearance: { ...p.appearance, lipColor: e.target.value },
                                  }))
                                }
                                className="w-6 h-6 rounded border border-slate-300 p-0 cursor-pointer"
                                title="Custom Color"
                              />
                            </div>
                          </div>

                          {/* Mouth / Lip Scale Slider (Fully anchored position at 50, 22.5) */}
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Mouth Size / Scale
                              </label>
                              <span className="text-[10px] font-mono text-slate-700 font-semibold">
                                {Math.round((charData.appearance.mouthScale || 1) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.3"
                              max="3.0"
                              step="0.05"
                              value={charData.appearance.mouthScale || 1}
                              onChange={e => {
                                const newScale = parseFloat(e.target.value);
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, mouthScale: newScale },
                                }));
                              }}
                              className="w-full accent-blue-600 cursor-pointer h-1.5"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                              <span>30% Small</span>
                              <span>100% (Default)</span>
                              <span>300% Large</span>
                            </div>
                          </div>

                          {/* Live Lip-Sync Talking Test */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setIsTalkingTest(p => !p)}
                              className={`w-full py-2 px-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs ${
                                isTalkingTest
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                            >
                              {isTalkingTest ? (
                                <>
                                  <Square className="w-3.5 h-3.5 fill-white" />
                                  <span>Stop Lip Sync Test</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  <span>Test Live Lip-Sync (Talk Animation)</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Custom Mouth Replacement (User Upload) */}
                          <div className="pt-1 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Custom Mouth Replacement
                              </label>
                              {charData.appearance.customMouthImages &&
                                Object.keys(charData.appearance.customMouthImages).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCharData(p => ({
                                        ...p,
                                        appearance: { ...p.appearance, customMouthImages: {} },
                                      }))
                                    }
                                    className="text-[10px] text-red-600 hover:text-red-700 underline cursor-pointer"
                                  >
                                    Reset All Custom
                                  </button>
                                )}
                            </div>

                            {/* Dropzone & file selector */}
                            <div
                              onDragOver={e => {
                                e.preventDefault();
                                setIsDraggingMouth(true);
                              }}
                              onDragLeave={() => setIsDraggingMouth(false)}
                              onDrop={e => {
                                e.preventDefault();
                                setIsDraggingMouth(false);
                                if (e.dataTransfer.files) {
                                  handleMouthFilesUpload(e.dataTransfer.files);
                                }
                              }}
                              onClick={() => mouthFileInputRef.current?.click()}
                              className={`p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                                isDraggingMouth
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <FileUp className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                              <div className="font-semibold text-[11px] text-slate-700">
                                Click or Drag & Drop Mouth PNGs
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Replaces viseme {activeUploadViseme} (or auto-matches Mouth_A, Mouth_X, etc.)
                              </div>
                              <input
                                ref={mouthFileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={e => {
                                  if (e.target.files) {
                                    handleMouthFilesUpload(e.target.files);
                                  }
                                }}
                                className="hidden"
                              />
                            </div>

                            {/* Replaced thumbnail status if active viseme has custom image */}
                            {charData.appearance.customMouthImages?.[activeUploadViseme] && (
                              <div className="mt-2 flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <img
                                    src={charData.appearance.customMouthImages[activeUploadViseme]}
                                    alt="Custom mouth"
                                    className="w-10 h-6 object-contain rounded bg-white border border-emerald-300"
                                  />
                                  <span className="text-[11px] text-emerald-900 font-semibold">
                                    Viseme {activeUploadViseme} is replaced
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCharData(p => {
                                      const next = { ...(p.appearance.customMouthImages || {}) };
                                      delete next[activeUploadViseme];
                                      return {
                                        ...p,
                                        appearance: { ...p.appearance, customMouthImages: next },
                                      };
                                    });
                                  }}
                                  className="text-[10px] text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                                >
                                  Revert
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Body / Clothing */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'body' ? null : 'body')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👕</span>
                      <span>Body / Clothing</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'body' ? 'rotate-180' : ''}`} />
                  </button>
                  {openLayerSub === 'body' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div>
                        <div className="text-slate-500 font-medium mb-1.5">Outfit Style:</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['vest', 'kurta', 'saree', 'tshirt', 'royal'].map(bType => (
                            <button
                              key={bType}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, bodyType: bType },
                                }))
                              }
                              className={`py-1 capitalize rounded border shadow-xs ${
                                charData.appearance.bodyType === bType
                                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {bType}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 font-medium mb-1.5">Garment Color:</div>
                        <div className="flex space-x-2">
                          {['#f1ede4', '#f59e0b', '#dc2626', '#2563eb', '#15803d', '#7c3aed', '#18181b'].map(c => (
                            <button
                              key={c}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, clothingColor: c },
                                }))
                              }
                              className={`w-5 h-5 rounded-full border shadow-xs ${
                                charData.appearance.clothingColor === c ? 'border-slate-900 scale-125' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legs */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'legs' ? null : 'legs')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👖</span>
                      <span>Legs</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'legs' ? 'rotate-180' : ''}`} />
                  </button>
                  {openLayerSub === 'legs' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div>
                        <div className="text-slate-500 font-medium mb-1.5">Lower Garment:</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['lungi', 'dhoti', 'pants', 'skirt'].map(lType => (
                            <button
                              key={lType}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, legsType: lType },
                                }))
                              }
                              className={`py-1 capitalize rounded border shadow-xs ${
                                charData.appearance.legsType === lType
                                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {lType}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 font-medium mb-1.5">Color:</div>
                        <div className="flex space-x-2">
                          {['#609a9e', '#0284c7', '#d97706', '#991b1b', '#1e293b', '#6b21a8'].map(c => (
                            <button
                              key={c}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, legsColor: c },
                                }))
                              }
                              className={`w-5 h-5 rounded-full border shadow-xs ${
                                charData.appearance.legsColor === c ? 'border-slate-900 scale-125' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additionals (Pagri, Mustache, Tilak) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'additionals' ? null : 'additionals')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium"
                  >
                    <span className="flex items-center space-x-2">
                      <span>✋</span>
                      <span>Additionals</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'additionals' ? 'rotate-180' : ''}`} />
                  </button>
                  {openLayerSub === 'additionals' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div>
                        <div className="text-slate-500 font-medium mb-1">Pagri / Turban:</div>
                        <button
                          onClick={() =>
                            setCharData(p => ({
                              ...p,
                              appearance: {
                                ...p.appearance,
                                additionalHeadwear: p.appearance.additionalHeadwear === 'turban' ? 'none' : 'turban',
                              },
                            }))
                          }
                          className={`w-full py-1 rounded border shadow-xs ${
                            charData.appearance.additionalHeadwear === 'turban'
                              ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {charData.appearance.additionalHeadwear === 'turban' ? 'Turban Active' : 'No Turban'}
                        </button>
                      </div>

                      <div>
                        <div className="text-slate-500 font-medium mb-1">Mustache:</div>
                        <button
                          onClick={() =>
                            setCharData(p => ({
                              ...p,
                              appearance: {
                                ...p.appearance,
                                additionalFacialHair: p.appearance.additionalFacialHair === 'mustache' ? 'none' : 'mustache',
                              },
                            }))
                          }
                          className={`w-full py-1 rounded border shadow-xs ${
                            charData.appearance.additionalFacialHair === 'mustache'
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {charData.appearance.additionalFacialHair === 'mustache' ? 'Mustache Active' : 'Clean Shaven'}
                        </button>
                      </div>

                      <div>
                        <div className="text-slate-500 font-medium mb-1">Tilak / Bindi:</div>
                        <button
                          onClick={() =>
                            setCharData(p => ({
                              ...p,
                              appearance: {
                                ...p.appearance,
                                additionalAccessories: p.appearance.additionalAccessories === 'tilak' ? 'none' : 'tilak',
                              },
                            }))
                          }
                          className={`w-full py-1 rounded border shadow-xs ${
                            charData.appearance.additionalAccessories === 'tilak'
                              ? 'bg-red-600 text-white border-red-600 font-semibold'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {charData.appearance.additionalAccessories === 'tilak' ? 'Tilak On Forehead' : 'No Tilak'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER CANVAS: DOTTED RIGGING STAGE WITH SKELETON BONES */}
          <div className="flex-1 relative flex flex-col bg-slate-100/70 overflow-hidden">
            
            {/* Top Toolbar above character (Lock, Upload, Reset, Download, Delete, Center View) */}
            <div className="flex items-center justify-center space-x-2 py-2 border-b border-slate-200 bg-white/90 backdrop-blur text-xs">
              <button className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Lock</span>
              </button>
              <button className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload</span>
              </button>
              <button
                onClick={handleResetPose}
                title="Reset Skeleton Joints to Default Standing Pose"
                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span>Reset Pose</span>
              </button>
              <button
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(charData, null, 2));
                  const a = document.createElement('a');
                  a.href = dataStr;
                  a.download = `${charData.name.toLowerCase().replace(/\s+/g, '-')}-rig.json`;
                  a.click();
                }}
                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download</span>
              </button>
              <button
                onClick={handleResetPose}
                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </button>
              <button
                onClick={handleResetView}
                title="Reset Zoom and Pan (Center View)"
                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Center View</span>
              </button>
            </div>

            {/* Dotted Grid Canvas with Pan & Zoom */}
            <div
              className={`relative flex-1 flex items-center justify-center canvas-grid-dots overflow-hidden select-none ${
                isPanning
                  ? 'cursor-grabbing'
                  : panToolActive || spacebarDown
                  ? 'cursor-grab'
                  : 'cursor-default'
              }`}
              onMouseDown={e => {
                // Allow panning if pan tool is active, spacebar is pressed, middle mouse button, or clicking background
                const isDirectCanvasClick = e.target === e.currentTarget;
                if (panToolActive || spacebarDown || e.button === 1 || isDirectCanvasClick) {
                  e.preventDefault();
                  setIsPanning(true);
                  panStartRef.current = {
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                    startPanX: panOffset.x,
                    startPanY: panOffset.y,
                  };
                }
              }}
              onTouchStart={e => {
                if (e.touches.length === 1 && (panToolActive || e.target === e.currentTarget)) {
                  setIsPanning(true);
                  panStartRef.current = {
                    mouseX: e.touches[0].clientX,
                    mouseY: e.touches[0].clientY,
                    startPanX: panOffset.x,
                    startPanY: panOffset.y,
                  };
                }
              }}
              onTouchMove={e => {
                if (isPanning && e.touches.length === 1) {
                  const dx = e.touches[0].clientX - panStartRef.current.mouseX;
                  const dy = e.touches[0].clientY - panStartRef.current.mouseY;
                  setPanOffset({
                    x: Math.round(panStartRef.current.startPanX + dx),
                    y: Math.round(panStartRef.current.startPanY + dy),
                  });
                }
              }}
              onTouchEnd={() => setIsPanning(false)}
              onWheel={e => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.15 : -0.15;
                  setZoomLevel(z => Math.max(0.4, Math.min(3.0, Number((z + delta).toFixed(2)))));
                } else {
                  // Trackpad or shift scroll pans canvas
                  setPanOffset(p => ({
                    x: Math.round(p.x - e.deltaX),
                    y: Math.round(p.y - e.deltaY),
                  }));
                }
              }}
            >
              
              {/* Floating Tool Icons on left side of character (Pan, Pen, Zoom+, Zoom-, Smile, Pose) */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col space-y-2 z-20">
                <button
                  title={
                    panToolActive
                      ? 'Pan Tool Active: Click & drag to move character anywhere (Click to exit)'
                      : 'Pan Tool: Click & drag to pan character in all directions (or hold Spacebar)'
                  }
                  onClick={() => setPanToolActive(!panToolActive)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full shadow-md transition-colors cursor-pointer ${
                    panToolActive || spacebarDown
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                </button>
                <button
                  title="Toggle Skeleton Rig Mode"
                  onClick={() => setSkeletonMode(!skeletonMode)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full shadow-md transition-colors cursor-pointer ${
                    skeletonMode ? 'bg-cyan-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button
                  title="Zoom In (+15%)"
                  onClick={() => setZoomLevel(z => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                  className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 rounded-full shadow-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  title="Zoom Out (-15%)"
                  onClick={() => setZoomLevel(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 rounded-full shadow-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  title="Change Expression"
                  onClick={() => {
                    const exps = ['idle', 'smile', 'talkA', 'angry'];
                    const nextExp = exps[(exps.indexOf(charData.appearance.mouthType) + 1) % exps.length];
                    setCharData(p => ({
                      ...p,
                      appearance: { ...p.appearance, mouthType: nextExp },
                    }));
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 rounded-full shadow-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  title="Cycle Pose"
                  onClick={() => setPreviewAnimIndex((previewAnimIndex + 1) % ANIMATION_PRESETS.length)}
                  className="w-9 h-9 flex items-center justify-center bg-white text-slate-700 rounded-full shadow-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Top-Right Zoom & Pan HUD */}
              <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs text-slate-700">
                <span className="font-semibold text-slate-500">Zoom:</span>
                <span className="font-mono font-bold text-blue-600 w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  title="Zoom Out"
                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  −
                </button>
                <button
                  onClick={() => setZoomLevel(z => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                  title="Zoom In"
                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  +
                </button>
                {(panOffset.x !== 0 || panOffset.y !== 0 || zoomLevel !== 1) && (
                  <button
                    onClick={handleResetView}
                    title="Center View and Reset Zoom"
                    className="ml-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium rounded transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Recenter</span>
                  </button>
                )}
              </div>

              {/* The Interactive Character Canvas with Pan Transform & Scale */}
              <div
                className="w-[440px] h-[580px] relative transition-transform duration-75 ease-out select-none"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                <CartoonCharacter
                  model={charData}
                  animation={isTalkingTest ? 'talk' : 'idle'}
                  skeletonMode={skeletonMode}
                  interactiveBones={true}
                  flipped={isFlipped}
                  isLipSyncing={isTalkingTest}
                  onJointDrag={handleJointDrag}
                  selectedJointId={selectedJoint}
                  onSelectJoint={setSelectedJoint}
                  width="100%"
                  height="100%"
                />
              </div>

              {/* Bottom Left Notification / Info with Pan & Spacebar guide */}
              <div className="absolute bottom-4 left-6 flex items-center space-x-2 text-xs text-slate-600 bg-white/95 px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs z-20">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>
                  {panToolActive || spacebarDown
                    ? 'Pan Mode Active: Click & drag to pan canvas in any direction'
                    : 'Tip: Hold Spacebar or click Hand icon to pan. Drag cyan joints to pose.'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ANIMATION PREVIEW CARD */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col p-4 justify-between">
            
            {/* Top Box: Live Animation Preview Box */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-xs">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800 font-bold">Animation Preview</span>
                <span className="text-slate-400">−</span>
              </div>

              {/* Character Animated Motion Box */}
              <div className="h-64 flex items-center justify-center p-3 relative overflow-hidden bg-gradient-to-b from-slate-100/50 to-white">
                <div className="w-44 h-56">
                  <CartoonCharacter
                    model={charData}
                    animation={currentAnim.id}
                    skeletonMode={false}
                    flipped={isFlipped}
                    isLipSyncing={currentAnim.id === 'talk' || isTalkingTest}
                    width="100%"
                    height="100%"
                  />
                </div>
              </div>

              {/* Animation Selector Carousel (< Idle >) */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() =>
                    setPreviewAnimIndex(
                      (previewAnimIndex - 1 + ANIMATION_PRESETS.length) % ANIMATION_PRESETS.length
                    )
                  }
                  className="p-1 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 rounded cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800">
                  <span>{currentAnim.icon}</span>
                  <span>{currentAnim.label}</span>
                </div>

                <button
                  onClick={() => setPreviewAnimIndex((previewAnimIndex + 1) % ANIMATION_PRESETS.length)}
                  className="p-1 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 rounded cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Controls: Skeleton Mode Toggle, Flip Toggle, Save Character Button */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {/* Skeleton Mode Toggle */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <span className="text-cyan-600">🦴</span>
                  <span>Skeleton Mode</span>
                </div>
                <button
                  onClick={() => setSkeletonMode(!skeletonMode)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    skeletonMode ? 'bg-cyan-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Flip Toggle */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <span className="text-blue-600">⇄</span>
                  <span>Flip</span>
                </div>
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    isFlipped ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Character Name Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Character Name</label>
                <input
                  type="text"
                  value={charData.name}
                  onChange={e => setCharData({ ...charData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 shadow-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Save Character Button */}
              <button
                onClick={handleSave}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Save Character</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
