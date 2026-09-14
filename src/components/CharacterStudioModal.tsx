import React, { useState, useRef, useEffect } from 'react';
import { CharacterModel, JointId, CharacterAnimationType, CharacterAngle, LipsFormat } from '../types';
import { CartoonCharacter } from './CartoonCharacter';
import { DEFAULT_JOINTS, ANIMATION_PRESETS } from '../utils/characterPresets';
import {
  X,
  Lock,
  Unlock,
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
  Image as ImageIcon,
  FileUp,
  Check,
  RefreshCw,
  Palette,
  Cloud,
  CloudUpload,
  Sliders,
  Shield,
} from 'lucide-react';
import { VISEME_CONFIGS, MouthPreviewThumbnail } from '../utils/mouthRenderer';
import {
  downloadFile,
  downloadDataUrl,
  exportVisemeSvg,
  exportEyesSvg,
  exportHeadSvg,
  exportHairSvg,
  exportBodySvg,
  exportHandSvg,
  exportFeetSvg,
} from '../utils/elementExporter';
import { saveCharacterToCloud } from '../services/characterService';

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
        mouthScale: 1.0,
        mouthLocked: true,
        lockedParts: { skeleton: false, head: false, eyes: false, mouth: true, body: false, limbs: false },
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
  
  // Element File Input References
  const mouthFileInputRef = useRef<HTMLInputElement>(null);
  const headFileInputRef = useRef<HTMLInputElement>(null);
  const hairFileInputRef = useRef<HTMLInputElement>(null);
  const eyesFileInputRef = useRef<HTMLInputElement>(null);
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const handLFileInputRef = useRef<HTMLInputElement>(null);
  const handRFileInputRef = useRef<HTMLInputElement>(null);
  const footLFileInputRef = useRef<HTMLInputElement>(null);
  const footRFileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Save & Status States
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Generic file upload handler for converting images into base64 Data URLs
  const handleGenericFileUpload = (file: File, onSuccess: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) onSuccess(dataUrl);
    };
    reader.readAsDataURL(file);
  };

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

  // Spacebar keyboard listener for temporary Pan Tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
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
  }, []);

  // Global mouse up for pan release
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
    };
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPanOffset({
        x: Math.round(panStartRef.current.startPanX + dx),
        y: Math.round(panStartRef.current.startPanY + dy),
      });
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('mousemove', onWindowMouseMove);
    return () => {
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('mousemove', onWindowMouseMove);
    };
  }, [isPanning]);

  // Section Accordion State
  const [openSection, setOpenSection] = useState<'layers' | 'feet' | 'eyes' | 'hands' | 'transform' | 'locks'>('layers');
  const [openLayerSub, setOpenLayerSub] = useState<'head' | 'hair' | 'eyes' | 'lips' | 'body' | 'legs' | 'hands' | 'additionals' | null>('lips');

  // Joint dragging handler
  const handleJointDrag = (jointId: JointId, newX: number, newY: number) => {
    if (charData.appearance.lockedParts?.['skeleton']) return;
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

  // Toggle layer & rigging locks
  const toggleLockPart = (part: string) => {
    setCharData(prev => {
      const current = prev.appearance.lockedParts || {};
      const nextVal = !current[part];
      return {
        ...prev,
        appearance: {
          ...prev.appearance,
          lockedParts: {
            ...current,
            [part]: nextVal,
          },
          // Also sync mouthLocked if mouth part toggled
          ...(part === 'mouth' ? { mouthLocked: nextVal } : {}),
        },
      };
    });
  };

  // Firebase Cloud Save Handler
  const handleSaveToCloud = async (saveAsNew: boolean) => {
    setIsSavingToCloud(true);
    setCloudStatusMsg(null);
    try {
      const savedCharacter = await saveCharacterToCloud(charData, saveAsNew);
      onSaveCharacter(savedCharacter);
      setCharData(savedCharacter);
      setCloudStatusMsg({
        type: 'success',
        text: saveAsNew
          ? `Saved as new character "${savedCharacter.name}" in WilliToons Cloud!`
          : `Character "${savedCharacter.name}" updated successfully in WilliToons Cloud!`,
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save character to Firebase:', err);
      // Fallback: save locally and notify
      onSaveCharacter(charData);
      setCloudStatusMsg({
        type: 'success',
        text: 'Saved to local studio (offline mode)!',
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const currentAnim = ANIMATION_PRESETS[previewAnimIndex];
  const isSkeletonLocked = !!charData.appearance.lockedParts?.['skeleton'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="relative flex flex-col w-full h-full max-w-[1400px] max-h-[940px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden text-slate-800">
        
        {/* TOP MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-200 bg-slate-50/80">
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
                  className={`relative pb-1 pt-1 transition-colors cursor-pointer ${
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

          {/* Center Title & WilliToons Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
              WilliToons
            </span>
            <span className="font-bold text-slate-800 text-sm">{charData.name}</span>
            <span className="text-[11px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">Character Studio</span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <button
              onClick={() => toggleLockPart('skeleton')}
              title="Toggle Skeleton Lock"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                isSkeletonLocked
                  ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isSkeletonLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isSkeletonLocked ? 'Skeleton Locked' : 'Lock Skeleton'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CLOUD STATUS BANNER */}
        {cloudStatusMsg && (
          <div
            className={`px-6 py-2 text-xs font-semibold flex items-center justify-between transition-all ${
              cloudStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-red-50 text-red-800 border-b border-red-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>{cloudStatusMsg.text}</span>
            </div>
            <button onClick={() => setCloudStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT SIDEBAR: CUSTOM ACCORDIONS & ELEMENT EDITORS */}
          <div className="w-[340px] border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
            
            {/* Rigging & Layer Locks Section */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => setOpenSection(openSection === 'locks' ? 'layers' : 'locks')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rigging & Element Locks</span>
                </div>
                <span>{openSection === 'locks' ? '−' : '+'}</span>
              </button>
              {openSection === 'locks' && (
                <div className="p-3 bg-slate-50 space-y-2 text-xs border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 mb-1">
                    Lock elements to prevent accidental movement or bone dragging:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'skeleton', label: 'Skeleton IK', icon: '🦴' },
                      { key: 'mouth', label: 'Mouth / Lips', icon: '👄' },
                      { key: 'eyes', label: 'Eyes', icon: '👁' },
                      { key: 'head', label: 'Head / Face', icon: '😊' },
                      { key: 'body', label: 'Body / Torso', icon: '👕' },
                      { key: 'limbs', label: 'Hands & Feet', icon: '✋' },
                    ].map(lk => {
                      const locked = !!charData.appearance.lockedParts?.[lk.key];
                      return (
                        <button
                          key={lk.key}
                          onClick={() => toggleLockPart(lk.key)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            locked
                              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center space-x-1.5 truncate">
                            <span>{lk.icon}</span>
                            <span className="truncate">{lk.label}</span>
                          </span>
                          {locked ? <Lock className="w-3 h-3 text-amber-600 shrink-0" /> : <Unlock className="w-3 h-3 text-slate-300 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Transform & Canvas Pan/Zoom Section */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => setOpenSection(openSection === 'transform' ? 'layers' : 'transform')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Zoom, Pan & Flip Canvas</span>
                </div>
                <span>{openSection === 'transform' ? '−' : '+'}</span>
              </button>
              {openSection === 'transform' && (
                <div className="p-3 bg-slate-50 space-y-3 text-xs border-t border-slate-100">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-600 font-semibold">Scale / Zoom Level</label>
                      <span className="font-mono text-blue-600 font-bold">{Math.round(zoomLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="3.5"
                      step="0.05"
                      value={zoomLevel}
                      onChange={e => setZoomLevel(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1.5 gap-1">
                      {[0.5, 0.75, 1.0, 1.5, 2.0].map(z => (
                        <button
                          key={z}
                          onClick={() => setZoomLevel(z)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                            zoomLevel === z ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {Math.round(z * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-slate-600">
                    <span className="text-[11px]">Pan: X: {panOffset.x}px, Y: {panOffset.y}px</span>
                    <button
                      onClick={handleResetView}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      Recenter View
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

            {/* PRIMARY LAYERS & ELEMENTS (WITH DIRECT DOWNLOAD & UPLOAD PER ELEMENT) */}
            <div>
              <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Character Elements (Upload & Download)</span>
                <span className="text-[10px] text-blue-600 font-semibold">SVG / PNG</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                
                {/* 1. LIPS / MOUTH VISUALS (Format 1 & Realistic Format 2) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'lips' ? null : 'lips')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👄</span>
                      <span className="font-semibold">Lips / Mouth (Formats 1 & 2)</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {charData.appearance.lipsFormat === 'format2' ? 'Format 2 (Realistic)' : 'Format 1'}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'lips' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'lips' && (
                    <div className="px-4 py-3 bg-slate-50/90 space-y-3.5 border-t border-slate-100 text-xs">
                      {/* Format Selector */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-200/50 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            setCharData(p => ({
                              ...p,
                              appearance: { ...p.appearance, lipsFormat: 'format1' },
                            }))
                          }
                          className={`py-1 text-center rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                            charData.appearance.lipsFormat !== 'format2'
                              ? 'bg-white text-blue-600 shadow-xs'
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
                              appearance: { ...p.appearance, lipsFormat: 'format2' },
                            }))
                          }
                          className={`py-1 text-center rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                            charData.appearance.lipsFormat === 'format2'
                              ? 'bg-white text-amber-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>Format 2: Realistic</span>
                          <span className="text-[9px] bg-amber-500 text-white px-1 py-0.2 rounded-full">New</span>
                        </button>
                      </div>

                      {/* Download All Visemes Button */}
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            // Download all 7 visemes
                            ['X', 'A', 'B', 'C', 'D', 'E', 'F'].forEach((viseme, idx) => {
                              setTimeout(() => {
                                const svgStr = exportVisemeSvg(viseme, charData.appearance);
                                downloadFile(svgStr, `willitoons-viseme-${viseme}.svg`);
                              }, idx * 200);
                            });
                          }}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download All 7 Shapes (SVG)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => mouthFileInputRef.current?.click()}
                          className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center space-x-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                        </button>
                      </div>

                      {/* Visemes Grid with individual Download & Upload */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Viseme / Mouth Shapes
                          </label>
                          <span className="text-[10px] text-slate-400">7 Visemes</span>
                        </div>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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
                              <div
                                key={v.id}
                                className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                                  isCurrent
                                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div
                                  onClick={() => {
                                    setActiveUploadViseme(v.id);
                                    setCharData(p => ({
                                      ...p,
                                      appearance: { ...p.appearance, mouthType: `mouth${v.id}` },
                                    }));
                                  }}
                                  className="flex items-center space-x-2 flex-1 cursor-pointer"
                                >
                                  <MouthPreviewThumbnail
                                    viseme={v.id}
                                    format={charData.appearance.lipsFormat || 'format2'}
                                    lipColor={charData.appearance.lipColor || '#8D5538'}
                                    customImage={charData.appearance.customMouthImages?.[v.id]}
                                    className="w-10 h-6 bg-slate-100 rounded p-0.5 shrink-0"
                                  />
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-bold text-[11px]">{v.label}</span>
                                      {hasCustom && (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-semibold">
                                          Custom
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 line-clamp-1">{v.desc}</div>
                                  </div>
                                </div>

                                {/* Download & Upload buttons for this specific viseme */}
                                <div className="flex items-center space-x-1 shrink-0 ml-1">
                                  <button
                                    type="button"
                                    title={`Download Viseme ${v.id} as SVG`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      const svg = exportVisemeSvg(v.id, charData.appearance);
                                      downloadFile(svg, `willi-mouth-${v.id}.svg`);
                                    }}
                                    className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-600" />
                                  </button>
                                  <button
                                    type="button"
                                    title={`Upload custom replacement for Viseme ${v.id}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setActiveUploadViseme(v.id);
                                      mouthFileInputRef.current?.click();
                                    }}
                                    className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                  </button>
                                  {hasCustom && (
                                    <button
                                      type="button"
                                      title="Remove custom image"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setCharData(p => {
                                          const next = { ...(p.appearance.customMouthImages || {}) };
                                          delete next[v.id];
                                          return { ...p, appearance: { ...p.appearance, customMouthImages: next } };
                                        });
                                      }}
                                      className="p-1 hover:bg-red-100 text-red-500 rounded cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mouth Scale & Face Lock */}
                      <div className="space-y-2 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Lip Size Scale
                          </label>
                          <span className="text-[10px] font-mono text-slate-700 font-semibold">
                            {Math.round((charData.appearance.mouthScale || 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.3"
                          max="2.5"
                          step="0.05"
                          value={charData.appearance.mouthScale || 1.0}
                          onChange={e =>
                            setCharData(p => ({
                              ...p,
                              appearance: { ...p.appearance, mouthScale: parseFloat(e.target.value) },
                            }))
                          }
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>

                      {/* Lip Sync Live Test */}
                      <button
                        type="button"
                        onClick={() => setIsTalkingTest(!isTalkingTest)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          isTalkingTest
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {isTalkingTest ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isTalkingTest ? 'Stop Lip-Sync Test' : 'Test Live Lip-Sync Talk'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. EYES ELEMENT (DOWNLOAD & UPLOAD) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'eyes' ? null : 'eyes')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👁</span>
                      <span className="font-semibold">Eyes Element</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {charData.appearance.customEyesImage && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Custom</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'eyes' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'eyes' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const svg = exportEyesSvg(charData.appearance);
                            downloadFile(svg, 'willitoons-eyes-template.svg');
                          }}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Eyes (SVG)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eyesFileInputRef.current?.click()}
                          className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Eyes</span>
                        </button>
                        <input
                          ref={eyesFileInputRef}
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleGenericFileUpload(e.target.files[0], dataUrl => {
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, customEyesImage: dataUrl },
                                }));
                              });
                            }
                          }}
                        />
                      </div>

                      {charData.appearance.customEyesImage && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <img src={charData.appearance.customEyesImage} alt="Custom Eyes" className="w-10 h-6 object-contain bg-white rounded border border-emerald-300" />
                            <span className="text-[11px] text-emerald-900 font-semibold">Custom Eyes Active</span>
                          </div>
                          <button
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: { ...p.appearance, customEyesImage: undefined },
                              }))
                            }
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      {/* Eyes Scale Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-slate-500 font-medium">Eyes Size Scale:</span>
                          <span className="font-mono text-slate-700 font-bold">
                            {Math.round((charData.appearance.customEyesScale || 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={charData.appearance.customEyesScale || 1.0}
                          onChange={e =>
                            setCharData(p => ({
                              ...p,
                              appearance: { ...p.appearance, customEyesScale: parseFloat(e.target.value) },
                            }))
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>

                      {/* Stock Eye Style */}
                      <div>
                        <div className="text-slate-500 font-medium mb-1 text-[11px]">Stock Eye Expressions:</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['standard', 'kind', 'big', 'determined', 'angry'].map(eye => (
                            <button
                              key={eye}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, eyeType: eye },
                                }))
                              }
                              className={`py-1 capitalize rounded border shadow-xs text-[11px] cursor-pointer ${
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
                    </div>
                  )}
                </div>

                {/* 3. HEAD & FACE ELEMENT (DOWNLOAD & UPLOAD) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'head' ? null : 'head')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>😊</span>
                      <span className="font-semibold">Head & Face</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {charData.appearance.customHeadImage && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Custom</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'head' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'head' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const svg = exportHeadSvg(charData.appearance);
                            downloadFile(svg, 'willitoons-head-template.svg');
                          }}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Head (SVG)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => headFileInputRef.current?.click()}
                          className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Head</span>
                        </button>
                        <input
                          ref={headFileInputRef}
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleGenericFileUpload(e.target.files[0], dataUrl => {
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, customHeadImage: dataUrl },
                                }));
                              });
                            }
                          }}
                        />
                      </div>

                      {charData.appearance.customHeadImage && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <img src={charData.appearance.customHeadImage} alt="Custom Head" className="w-8 h-8 object-contain bg-white rounded border border-emerald-300" />
                            <span className="text-[11px] text-emerald-900 font-semibold">Custom Head Active</span>
                          </div>
                          <button
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: { ...p.appearance, customHeadImage: undefined },
                              }))
                            }
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      <div>
                        <div className="text-slate-500 font-medium mb-1.5 text-[11px]">Skin Tone:</div>
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
                              className={`w-6 h-6 rounded-full border-2 transition-transform shadow-xs cursor-pointer ${
                                charData.appearance.skinTone === skin ? 'border-blue-600 scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: skin }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. HAIR ELEMENT (DOWNLOAD & UPLOAD) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'hair' ? null : 'hair')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>💇‍♂️</span>
                      <span className="font-semibold">Hair Element</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {charData.appearance.customHairImage && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Custom</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'hair' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'hair' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const svg = exportHairSvg(charData.appearance);
                            downloadFile(svg, 'willitoons-hair-template.svg');
                          }}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Hair (SVG)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => hairFileInputRef.current?.click()}
                          className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Hair</span>
                        </button>
                        <input
                          ref={hairFileInputRef}
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleGenericFileUpload(e.target.files[0], dataUrl => {
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, customHairImage: dataUrl },
                                }));
                              });
                            }
                          }}
                        />
                      </div>

                      {charData.appearance.customHairImage && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <img src={charData.appearance.customHairImage} alt="Custom Hair" className="w-8 h-8 object-contain bg-white rounded border border-emerald-300" />
                            <span className="text-[11px] text-emerald-900 font-semibold">Custom Hair Active</span>
                          </div>
                          <button
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: { ...p.appearance, customHairImage: undefined },
                              }))
                            }
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      <div>
                        <div className="text-slate-500 font-medium mb-1.5 text-[11px]">Hair Style:</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['short', 'bun', 'braids', 'none'].map(hair => (
                            <button
                              key={hair}
                              onClick={() =>
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, hairStyle: hair },
                                }))
                              }
                              className={`py-1 capitalize text-center rounded border shadow-xs cursor-pointer text-[11px] ${
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

                {/* 5. BODY / TORSO ELEMENT (DOWNLOAD & UPLOAD) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'body' ? null : 'body')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👕</span>
                      <span className="font-semibold">Body & Torso</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {charData.appearance.customBodyImage && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Custom</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'body' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'body' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const svg = exportBodySvg(charData.appearance);
                            downloadFile(svg, 'willitoons-body-template.svg');
                          }}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Body (SVG)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => bodyFileInputRef.current?.click()}
                          className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Body</span>
                        </button>
                        <input
                          ref={bodyFileInputRef}
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handleGenericFileUpload(e.target.files[0], dataUrl => {
                                setCharData(p => ({
                                  ...p,
                                  appearance: { ...p.appearance, customBodyImage: dataUrl },
                                }));
                              });
                            }
                          }}
                        />
                      </div>

                      {charData.appearance.customBodyImage && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <img src={charData.appearance.customBodyImage} alt="Custom Body" className="w-8 h-8 object-contain bg-white rounded border border-emerald-300" />
                            <span className="text-[11px] text-emerald-900 font-semibold">Custom Body Active</span>
                          </div>
                          <button
                            onClick={() =>
                              setCharData(p => ({
                                ...p,
                                appearance: { ...p.appearance, customBodyImage: undefined },
                              }))
                            }
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      <div>
                        <div className="text-slate-500 font-medium mb-1.5 text-[11px]">Outfit Style:</div>
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
                              className={`py-1 capitalize rounded border shadow-xs cursor-pointer text-[11px] ${
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
                        <div className="text-slate-500 font-medium mb-1.5 text-[11px]">Garment Color:</div>
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
                              className={`w-5 h-5 rounded-full border shadow-xs cursor-pointer ${
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

                {/* 6. HANDS ELEMENT (DOWNLOAD & UPLOAD LEFT/RIGHT) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'hands' ? null : 'hands')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>✋</span>
                      <span className="font-semibold">Hands & Palms</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {(charData.appearance.customLeftHandImage || charData.appearance.customRightHandImage) && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Custom</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'hands' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'hands' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          const svg = exportHandSvg('left', charData.appearance.skinTone);
                          downloadFile(svg, 'willitoons-hand-template.svg');
                        }}
                        className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Hand Template (SVG)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[11px] text-slate-500 font-medium mb-1">Left Hand:</div>
                          <button
                            type="button"
                            onClick={() => handLFileInputRef.current?.click()}
                            className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload L</span>
                          </button>
                          <input
                            ref={handLFileInputRef}
                            type="file"
                            accept="image/*,.svg"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                handleGenericFileUpload(e.target.files[0], dataUrl => {
                                  setCharData(p => ({
                                    ...p,
                                    appearance: { ...p.appearance, customLeftHandImage: dataUrl },
                                  }));
                                });
                              }
                            }}
                          />
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 font-medium mb-1">Right Hand:</div>
                          <button
                            type="button"
                            onClick={() => handRFileInputRef.current?.click()}
                            className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload R</span>
                          </button>
                          <input
                            ref={handRFileInputRef}
                            type="file"
                            accept="image/*,.svg"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                handleGenericFileUpload(e.target.files[0], dataUrl => {
                                  setCharData(p => ({
                                    ...p,
                                    appearance: { ...p.appearance, customRightHandImage: dataUrl },
                                  }));
                                });
                              }
                            }}
                          />
                        </div>
                      </div>

                      {(charData.appearance.customLeftHandImage || charData.appearance.customRightHandImage) && (
                        <button
                          type="button"
                          onClick={() =>
                            setCharData(p => ({
                              ...p,
                              appearance: {
                                ...p.appearance,
                                customLeftHandImage: undefined,
                                customRightHandImage: undefined,
                              },
                            }))
                          }
                          className="w-full py-1 text-center text-xs text-red-600 hover:underline cursor-pointer"
                        >
                          Reset Custom Hands
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. FEET & LEGS ELEMENT (DOWNLOAD & UPLOAD) */}
                <div>
                  <button
                    onClick={() => setOpenLayerSub(openLayerSub === 'legs' ? null : 'legs')}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <span>👖</span>
                      <span className="font-semibold">Legs & Feet</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {(charData.appearance.customLeftFootImage || charData.appearance.customRightFootImage) && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">Custom</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openLayerSub === 'legs' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openLayerSub === 'legs' && (
                    <div className="px-4 py-3 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          const svg = exportFeetSvg('left', '#78350f');
                          downloadFile(svg, 'willitoons-feet-template.svg');
                        }}
                        className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Feet (SVG)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[11px] text-slate-500 font-medium mb-1">Left Foot:</div>
                          <button
                            type="button"
                            onClick={() => footLFileInputRef.current?.click()}
                            className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload L</span>
                          </button>
                          <input
                            ref={footLFileInputRef}
                            type="file"
                            accept="image/*,.svg"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                handleGenericFileUpload(e.target.files[0], dataUrl => {
                                  setCharData(p => ({
                                    ...p,
                                    appearance: { ...p.appearance, customLeftFootImage: dataUrl },
                                  }));
                                });
                              }
                            }}
                          />
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 font-medium mb-1">Right Foot:</div>
                          <button
                            type="button"
                            onClick={() => footRFileInputRef.current?.click()}
                            className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload R</span>
                          </button>
                          <input
                            ref={footRFileInputRef}
                            type="file"
                            accept="image/*,.svg"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                handleGenericFileUpload(e.target.files[0], dataUrl => {
                                  setCharData(p => ({
                                    ...p,
                                    appearance: { ...p.appearance, customRightFootImage: dataUrl },
                                  }));
                                });
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 font-medium mb-1 text-[11px]">Lower Garment:</div>
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
                              className={`py-1 capitalize rounded border shadow-xs cursor-pointer text-[11px] ${
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
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* CENTER CANVAS: DOTTED RIGGING STAGE WITH SKELETON BONES & INTERACTIVE PAN/ZOOM */}
          <div className="flex-1 relative flex flex-col bg-slate-100/80 overflow-hidden select-none">
            
            {/* Top Toolbar above character */}
            <div className="flex items-center justify-center space-x-2 py-2 border-b border-slate-200 bg-white/95 backdrop-blur text-xs">
              <button
                onClick={() => toggleLockPart('skeleton')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition-colors cursor-pointer shadow-xs ${
                  isSkeletonLocked
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {isSkeletonLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                <span>{isSkeletonLocked ? 'Locked (Pose Protected)' : 'Lock Pose'}</span>
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
                <span>Download Rig</span>
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

            {/* Interactive Canvas Viewport */}
            <div
              className={`flex-1 relative flex items-center justify-center overflow-hidden ${
                panToolActive || spacebarDown
                  ? 'cursor-grab active:cursor-grabbing'
                  : ''
              }`}
              style={{
                backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
                backgroundSize: '24px 24px',
              }}
              onMouseDown={e => {
                const isDirectCanvasClick = e.target === e.currentTarget;
                if (panToolActive || spacebarDown || e.button === 1 || isDirectCanvasClick) {
                  setIsPanning(true);
                  panStartRef.current = {
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                    startPanX: panOffset.x,
                    startPanY: panOffset.y,
                  };
                }
              }}
              onWheel={e => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  setZoomLevel(z => Math.min(3.5, Math.max(0.25, Number((z + delta).toFixed(2)))));
                } else {
                  setPanOffset(p => ({
                    x: Math.round(p.x - e.deltaX * 0.8),
                    y: Math.round(p.y - e.deltaY * 0.8),
                  }));
                }
              }}
            >
              {/* Floating Hand / Pan Tool Toggle Button */}
              <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2">
                <button
                  title={
                    panToolActive
                      ? 'Pan Tool Active: Click & drag canvas to move (or hold Spacebar)'
                      : 'Pan Tool: Click & drag to pan character in all directions (or hold Spacebar)'
                  }
                  onClick={() => setPanToolActive(!panToolActive)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full shadow-md transition-all cursor-pointer ${
                    panToolActive || spacebarDown
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 scale-105'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Top-Right Zoom & Pan HUD */}
              <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs text-slate-700">
                <span className="font-semibold text-slate-400 text-[11px]">Zoom:</span>
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.25, Number((z - 0.15).toFixed(2))))}
                  title="Zoom Out"
                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  −
                </button>
                <span className="font-mono font-bold text-blue-600 w-12 text-center text-xs">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(3.5, Number((z + 0.15).toFixed(2))))}
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
                  className="w-full h-full drop-shadow-xl"
                />
              </div>

              {/* Bottom Canvas Mode Hint */}
              <div className="absolute bottom-3 left-4 z-20 flex items-center space-x-2 text-[11px] text-slate-500 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>
                  {panToolActive || spacebarDown
                    ? 'Pan Mode Active: Click & drag anywhere to move canvas'
                    : isSkeletonLocked
                    ? '🔒 Skeleton Locked: Pose is protected from dragging'
                    : 'Tip: Hold Spacebar to Pan. Drag cyan joints to pose character.'}
                </span>
              </div>
            </div>

            {/* BOTTOM CONTROLS & CLOUD SAVE PANEL */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white shadow-xs">
              
              {/* Left: Animation Preview & Toggles */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-800 font-bold">Animation:</span>
                  <button
                    onClick={() => setPreviewAnimIndex((previewAnimIndex + 1) % ANIMATION_PRESETS.length)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs font-semibold cursor-pointer"
                  >
                    <span>{currentAnim.icon}</span>
                    <span>{currentAnim.label}</span>
                  </button>
                </div>

                <button
                  onClick={() => setSkeletonMode(!skeletonMode)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer shadow-2xs ${
                    skeletonMode ? 'bg-cyan-50 border-cyan-300 text-cyan-800' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span>🦴 Skeleton</span>
                </button>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer shadow-2xs ${
                    isFlipped ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span>⇄ Flip</span>
                </button>
              </div>

              {/* Right: Character Name Input & Dual Firebase Cloud Save Actions */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-500">Name:</span>
                  <input
                    type="text"
                    value={charData.name}
                    onChange={e => setCharData({ ...charData, name: e.target.value })}
                    className="w-44 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 shadow-2xs focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                {/* 1. Update Current Character */}
                <button
                  disabled={isSavingToCloud}
                  onClick={() => handleSaveToCloud(false)}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Update this character in Firebase Cloud and on Stage"
                >
                  {isSavingToCloud ? (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>Update Original</span>
                </button>

                {/* 2. Save as New Character */}
                <button
                  disabled={isSavingToCloud}
                  onClick={() => handleSaveToCloud(true)}
                  className="py-1.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:opacity-95 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Save as a new separate character in Firebase Cloud"
                >
                  {isSavingToCloud ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <CloudUpload className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Save as New (Cloud)</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
