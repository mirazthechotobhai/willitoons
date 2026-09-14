import React, { useRef, useState, useEffect } from 'react';
import {
  StageElement,
  Scene,
  ProjectSettings,
  CharacterModel,
  MediaAsset,
} from '../types';
import { CartoonCharacter } from './CartoonCharacter';
import {
  Play,
  Pause,
  SkipBack,
  RotateCcw,
  RotateCw,
  Film,
  Hand,
  Search,
  Maximize,
  Undo2,
  Redo2,
  Copy,
  Scissors,
  Camera,
  Layers,
  CheckSquare,
  ZoomIn,
  ZoomOut,
  Trash2,
  Volume2,
  MousePointer,
  Type,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface CanvasStageProps {
  scene: Scene;
  project: ProjectSettings;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<StageElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDropAssetOnStage: (itemType: string, itemData: CharacterModel | MediaAsset, dropX: number, dropY: number) => void;
  zoomScale: number;
  onChangeZoomScale: (newZoom: number) => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onAddTextElement?: () => void;
  onAddSpeechBubble?: () => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  scene,
  project,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onDropAssetOnStage,
  zoomScale,
  onChangeZoomScale,
  canvasRef,
  onAddTextElement,
  onAddSpeechBubble,
}) => {
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  // Dedicated Pan & Stage Dimension states
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [stageBaseSize, setStageBaseSize] = useState<{ width: number; height: number }>({ width: 960, height: 540 });

  // Compute exact 16:9 base canvas dimensions dynamically from container
  useEffect(() => {
    if (!stageViewportRef.current) return;

    const updateBaseDimensions = () => {
      if (!stageViewportRef.current) return;
      const { clientWidth, clientHeight } = stageViewportRef.current;
      const padX = 40;
      const padY = 40;
      const availW = Math.max(260, clientWidth - padX);
      const availH = Math.max(160, clientHeight - padY);

      // Target aspect ratio (strict 16:9 by default)
      const ratio = project.aspectRatio === '9:16' ? 9 / 16 : project.aspectRatio === '1:1' ? 1 : 16 / 9;

      let w = availW;
      let h = availW / ratio;

      if (h > availH) {
        h = availH;
        w = availH * ratio;
      }

      setStageBaseSize({ width: Math.round(w), height: Math.round(h) });
    };

    updateBaseDimensions();
    const observer = new ResizeObserver(updateBaseDimensions);
    observer.observe(stageViewportRef.current);
    return () => observer.disconnect();
  }, [project.aspectRatio]);

  // Spacebar hotkey to temporarily activate Hand/Pan tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const isPanActive = isPanMode || isSpacePressed;

  // Viewport Mouse Down for Panning
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (isPanActive || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startPanX = panOffset.x;
      const startPanY = panOffset.y;

      const onMouseMove = (moveEvent: MouseEvent) => {
        setPanOffset({
          x: Math.round(startPanX + (moveEvent.clientX - startClientX)),
          y: Math.round(startPanY + (moveEvent.clientY - startClientY)),
        });
      };

      const onMouseUp = () => {
        setIsPanning(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  };

  // Drag & Drop onto Stage
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataString = e.dataTransfer.getData('application/json');
    if (!dataString) return;

    try {
      const parsed = JSON.parse(dataString);
      const stageRect = stageContainerRef.current?.getBoundingClientRect();
      if (!stageRect) return;

      const dropX = ((e.clientX - stageRect.left) / stageRect.width) * 100;
      const dropY = ((e.clientY - stageRect.top) / stageRect.height) * 100;

      onDropAssetOnStage(
        parsed.type,
        parsed.data,
        Math.max(10, Math.min(80, Math.round(dropX))),
        Math.max(10, Math.min(80, Math.round(dropY)))
      );
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  // Dragging selected element on stage
  const handleElementMouseDown = (e: React.MouseEvent, element: StageElement) => {
    if (isPanActive) return; // In pan mode, don't drag elements
    e.stopPropagation();
    onSelectElement(element.id);
    if (element.locked) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    setIsDraggingElement(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startClientX) / stageRect.width) * 100;
      const deltaY = ((moveEvent.clientY - startClientY) / stageRect.height) * 100;

      // Unconstrained positioning: allow moving anywhere across the macro stage (-300% to +400%)
      onUpdateElement(element.id, {
        x: Math.round(Math.max(-300, Math.min(400, startX + deltaX))),
        y: Math.round(Math.max(-300, Math.min(400, startY + deltaY))),
      });
    };

    const onMouseUp = () => {
      setIsDraggingElement(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Transform Bounding Box Handle Drag (Resize - Unlimited Scale & Zoom)
  const handleResizeHandleDown = (
    e: React.MouseEvent,
    element: StageElement,
    handle: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w' | 'rotate'
  ) => {
    e.stopPropagation();
    if (element.locked) return;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startW = element.width;
    const startH = element.height;
    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const elemCenterX = stageRect.left + (element.x / 100) * stageRect.width;
    const elemCenterY = stageRect.top + (element.y / 100) * stageRect.height;
    const startDistFromCenter = Math.hypot(startClientX - elemCenterX, startClientY - elemCenterY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (handle === 'rotate') {
        const angleRad = Math.atan2(moveEvent.clientY - elemCenterY, moveEvent.clientX - elemCenterX);
        const deg = Math.round((angleRad * 180) / Math.PI + 90);
        onUpdateElement(element.id, { rotation: deg });
        return;
      }

      // CORNER HANDLES: Proportional scale around center (Unlimited Zoom / Shrink from 2% to 1000%+)
      if (handle === 'se' || handle === 'sw' || handle === 'ne' || handle === 'nw') {
        const currDistFromCenter = Math.hypot(moveEvent.clientX - elemCenterX, moveEvent.clientY - elemCenterY);
        const factor = Math.max(0.01, currDistFromCenter / (startDistFromCenter || 1));
        const newW = Math.max(2, Math.round(startW * factor));
        const newH = Math.max(2, Math.round(startH * factor));
        onUpdateElement(element.id, {
          width: newW,
          height: newH,
        });
        return;
      }

      // EDGE HANDLES: Horizontal / Vertical stretching
      if (handle === 'e' || handle === 'w') {
        const distRatioX = Math.abs(moveEvent.clientX - elemCenterX) / (stageRect.width / 2);
        const newW = Math.max(2, Math.round(startW * Math.max(0.05, distRatioX)));
        onUpdateElement(element.id, { width: newW });
        return;
      }

      if (handle === 'n' || handle === 's') {
        const distRatioY = Math.abs(moveEvent.clientY - elemCenterY) / (stageRect.height / 2);
        const newH = Math.max(2, Math.round(startH * Math.max(0.05, distRatioY)));
        onUpdateElement(element.id, { height: newH });
        return;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Mouse wheel zoom on canvas with Ctrl/Cmd or normal wheel with Alt / in pan mode
  const handleViewportWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || isPanActive || e.altKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.max(0.1, Math.min(10.0, Math.round(zoomScale * zoomFactor * 100) / 100));
      onChangeZoomScale(newZoom);
    }
  };

  // Format time as MM:SS (e.g. 00:04)
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedElement = scene.elements.find(el => el.id === selectedElementId);

  return (
    <div className="flex-1 flex flex-col bg-[#E2E8F0] overflow-hidden select-none relative">
      
      {/* Top Floating Stage Quick Tools Pill (Professional Polish Theme pattern) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md border border-slate-200 z-20">
        <button
          onClick={() => onSelectElement(null)}
          title="Select / Pointer"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 text-xs transition-colors cursor-pointer"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onAddTextElement?.()}
          title="Add Text Dialogue"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 text-xs transition-colors cursor-pointer"
        >
          <Type className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onAddSpeechBubble?.()}
          title="Add Speech Bubble"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 text-xs transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button
          onClick={() => setIsPanMode(!isPanMode)}
          title="Hand Tool (Pan Stage) - Hold Space"
          className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors cursor-pointer ${
            isPanActive ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 16:9 MAIN CANVAS STAGE VIEWPORT & PAN CONTAINER */}
      <div
        ref={stageViewportRef}
        onWheel={handleViewportWheel}
        onMouseDown={handleViewportMouseDown}
        className={`flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-[#E2E8F0] canvas-grid-dots select-none ${
          isPanActive ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onClick={() => {
          if (!isPanActive) {
            onSelectElement(null);
          }
        }}
      >
        <div
          ref={stageContainerRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={e => {
            if (!isPanActive) {
              onSelectElement(null);
            }
          }}
          className="relative bg-white shadow-2xl overflow-hidden rounded-md ring-1 ring-slate-300 shrink-0 select-none cursor-default"
          style={{
            width: `${stageBaseSize.width}px`,
            height: `${stageBaseSize.height}px`,
            aspectRatio: project.aspectRatio === '16:9' ? '16 / 9' : project.aspectRatio === '9:16' ? '9 / 16' : '1 / 1',
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out',
          }}
        >
          {/* STAGE EXPORT / RENDER TARGET (Used by canvas recorder) */}
          <div
            ref={canvasRef as React.RefObject<HTMLDivElement>}
            onClick={e => {
              if (!isPanActive) {
                onSelectElement(null);
              }
            }}
            className="w-full h-full relative overflow-hidden bg-white cursor-default"
          >
            
            {/* STAGE BACKGROUND: Render neutral backdrop or scene background if no active background element in elements */}
            {(!scene.elements.some(el => el.isBackground && el.visible !== false) || scene.background.type === 'color') && (
              scene.background.type === 'color' ? (
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{ backgroundColor: scene.background.value }}
                />
              ) : scene.background.type === 'video' ? (
                <video
                  src={scene.background.value}
                  autoPlay
                  loop
                  muted
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img
                  src={scene.background.value}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30"
                />
              )
            )}

            {/* STAGE ELEMENTS (Characters, Images, Speech Bubbles, Text, Effects, Backgrounds) */}
            {scene.elements
              .filter(el => {
                if (el.visible === false) return false;
                // Check if element is active at currentTime
                return currentTime >= el.startTime && currentTime <= el.startTime + el.duration;
              })
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(el => {
                const isSelected = el.id === selectedElementId;
                const isBg = !!el.isBackground;

                return (
                  <div
                    key={el.id}
                    onClick={e => {
                      if (isBg) {
                        onSelectElement(null);
                        return;
                      }
                      e.stopPropagation();
                      onSelectElement(el.id);
                    }}
                    onMouseDown={e => {
                      if (isBg) return;
                      handleElementMouseDown(e, el);
                    }}
                    className={`absolute transition-shadow select-none ${
                      isBg ? 'pointer-events-none' : el.locked ? 'cursor-default' : 'cursor-move'
                    } ${
                      !isBg && isSelected ? 'ring-2 ring-blue-500 z-50' : !isBg ? 'hover:ring-1 hover:ring-blue-400/50' : ''
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                      transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                      opacity: el.opacity ?? 1,
                      zIndex: el.zIndex,
                    }}
                  >
                    {/* CHARACTER ELEMENT */}
                    {el.type === 'character' && el.characterData && (
                      <div className="w-full h-full pointer-events-none">
                        <CartoonCharacter
                          model={el.characterData}
                          animation={el.animation || 'idle'}
                          flipped={el.scaleX === -1}
                          isLipSyncing={el.isLipSyncing || el.animation === 'talk'}
                          width="100%"
                          height="100%"
                        />
                      </div>
                    )}

                    {/* IMAGE / VIDEO ELEMENT */}
                    {el.type === 'image' && el.mediaUrl && (
                      <img
                        src={el.mediaUrl}
                        alt={el.name}
                        className={`w-full h-full pointer-events-none select-none ${
                          el.isBackground ? 'object-cover' : 'object-contain drop-shadow'
                        }`}
                      />
                    )}

                    {/* EFFECT / FILTER ELEMENT */}
                    {el.type === 'effect' && (
                      <div className="w-full h-full pointer-events-none overflow-hidden relative">
                        {el.effectType === 'vignette' ? (
                          <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.75)] pointer-events-none" />
                        ) : el.effectType === 'cinema' ? (
                          <div className="absolute inset-0 border-y-[28px] border-black/90 pointer-events-none" />
                        ) : (
                          // Default sunlight / light sparkles
                          <>
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 via-orange-300/10 to-transparent mix-blend-screen pointer-events-none" />
                            <div className="absolute top-2 right-4 w-72 h-72 rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-6 left-10 w-48 h-48 rounded-full bg-yellow-100/20 blur-2xl pointer-events-none" />
                          </>
                        )}
                      </div>
                    )}

                    {el.type === 'video' && el.mediaUrl && (
                      <video
                        src={el.mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover pointer-events-none rounded-lg shadow-md"
                      />
                    )}

                    {/* SPEECH BUBBLE ELEMENT */}
                    {el.type === 'speechBubble' && (
                      <div className="relative w-full h-full flex items-center justify-center p-2.5 filter drop-shadow-md">
                        <div
                          className="w-full h-full rounded-2xl flex items-center justify-center text-center p-2 font-bold leading-snug border-2 border-slate-900 shadow-md transition-all"
                          style={{
                            backgroundColor: el.bubbleColor || '#ffffff',
                            color: el.textColor || '#0f172a',
                            fontSize: `${el.fontSize || 15}px`,
                          }}
                        >
                          {el.text || 'Type your dialogue here...'}
                        </div>
                        {/* Comic speech bubble triangle tail */}
                        <div
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900"
                        />
                        <div
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-6"
                          style={{ borderTopColor: el.bubbleColor || '#ffffff' }}
                        />
                      </div>
                    )}

                    {/* TEXT ELEMENT */}
                    {el.type === 'text' && (
                      <div
                        className="w-full h-full flex items-center justify-center font-extrabold tracking-wide drop-shadow-md p-1"
                        style={{
                          color: el.textColor || '#ffffff',
                          fontSize: `${el.fontSize || 22}px`,
                          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                        }}
                      >
                        {el.text || 'Add Text'}
                      </div>
                    )}

                    {/* BOUNDING BOX TRANSFORMS (When Selected) */}
                    {isSelected && (
                      <>
                        {el.locked ? (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded shadow flex items-center space-x-1 pointer-events-none whitespace-nowrap z-50">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Locked (Unlock in Timeline to Move)</span>
                          </div>
                        ) : (
                          <>
                            {/* Top Rotation Handle */}
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'rotate')}
                              className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center hover:scale-125 transition-transform z-50"
                              title="Rotate Element"
                            >
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-blue-500 pointer-events-none" />

                            {/* 4 Corner Resize Handles (Unlimited Proportional Scaling) */}
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'nw')}
                              className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-50"
                              title="Resize Corner (Unlimited Size)"
                            />
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'ne')}
                              className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-50"
                              title="Resize Corner (Unlimited Size)"
                            />
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'sw')}
                              className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 transition-transform z-50"
                              title="Resize Corner (Unlimited Size)"
                            />
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'se')}
                              className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 transition-transform z-50"
                              title="Resize Corner (Unlimited Size)"
                            />

                            {/* 4 Edge Resize Handles */}
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'n')}
                              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-blue-600 rounded-xs shadow-xs cursor-ns-resize hover:scale-125 transition-transform z-50"
                              title="Stretch Height"
                            />
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 's')}
                              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-blue-600 rounded-xs shadow-xs cursor-ns-resize hover:scale-125 transition-transform z-50"
                              title="Stretch Height"
                            />
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'w')}
                              className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-4 bg-white border-2 border-blue-600 rounded-xs shadow-xs cursor-ew-resize hover:scale-125 transition-transform z-50"
                              title="Stretch Width"
                            />
                            <div
                              onMouseDown={e => handleResizeHandleDown(e, el, 'e')}
                              className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-4 bg-white border-2 border-blue-600 rounded-xs shadow-xs cursor-ew-resize hover:scale-125 transition-transform z-50"
                              title="Stretch Width"
                            />

                            {/* Floating Quick Size / Zoom Control Pill Directly on Element */}
                            <div
                              onMouseDown={e => e.stopPropagation()}
                              className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xs text-white px-2.5 py-1 rounded-full shadow-xl border border-slate-700/80 flex items-center space-x-1.5 pointer-events-auto z-50 whitespace-nowrap text-xs select-none"
                            >
                              <button
                                onClick={() => {
                                  onUpdateElement(el.id, {
                                    width: Math.max(2, Math.round(el.width * 0.8)),
                                    height: Math.max(2, Math.round(el.height * 0.8)),
                                  });
                                }}
                                className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 rounded-full cursor-pointer text-slate-300 hover:text-white font-bold transition-colors"
                                title="Zoom Out (Make Smaller)"
                              >
                                -
                              </button>

                              <span className="font-mono text-[11px] font-bold text-blue-400 px-1">
                                {Math.round(el.width)}%
                              </span>

                              <button
                                onClick={() => {
                                  onUpdateElement(el.id, {
                                    width: Math.max(2, Math.round(el.width * 1.25)),
                                    height: Math.max(2, Math.round(el.height * 1.25)),
                                  });
                                }}
                                className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 rounded-full cursor-pointer text-slate-300 hover:text-white font-bold transition-colors"
                                title="Zoom In (Make Bigger / Unlimited Zoom)"
                              >
                                +
                              </button>

                              <div className="w-px h-3 bg-slate-700 mx-0.5" />

                              <button
                                onClick={() => {
                                  const defaultW = el.type === 'character' ? 45 : 30;
                                  const defaultH = el.type === 'character' ? 75 : 30;
                                  onUpdateElement(el.id, { width: defaultW, height: defaultH });
                                }}
                                className="text-[10px] text-slate-300 hover:text-white hover:underline cursor-pointer px-1 transition-colors"
                                title="Reset size to default"
                              >
                                Reset
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* FLOATING PLAYBACK & VIEW CONTROL BAR (Professional Polish clean studio theme) */}
      <div className="h-11 bg-white border-t border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 z-10 shrink-0 shadow-sm">
        
        {/* Left Actions: Multi Select, Layer Duplicate, Duplicate, Split, Camera */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <button
            onClick={() => setIsMultiSelect(!isMultiSelect)}
            className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors cursor-pointer ${
              isMultiSelect ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] hidden sm:inline">Multi Select</span>
          </button>

          <button
            onClick={() => selectedElementId && onDuplicateElement(selectedElementId)}
            disabled={!selectedElementId}
            className="flex items-center space-x-1 px-2 py-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Duplicate</span>
          </button>

          <button
            title="Split element at playhead"
            className="flex items-center space-x-1 px-2 py-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Split</span>
          </button>

          <button
            title="Add Camera Motion"
            className="flex items-center space-x-1 px-2 py-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Camera</span>
          </button>
        </div>

        {/* Center Transport Controls: Jump to Start, -5s, Play/Pause, Scene, +5s, Timecode, Speed */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => onSeek(0)}
            title="Jump to Start"
            className="p-1 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            title="Back 5s"
            className="flex items-center space-x-0.5 px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer text-[11px] font-bold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>5</span>
          </button>

          {/* Big Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full shadow-sm transition-all cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            title="Preview Current Scene"
            onClick={() => onSeek(0)}
            className="p-1 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer transition-colors"
          >
            <Film className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSeek(Math.min(scene.duration, currentTime + 5))}
            title="Forward 5s"
            className="flex items-center space-x-0.5 px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer text-[11px] font-bold transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>5</span>
          </button>

          {/* Timecode & Speed */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-xs font-semibold text-slate-800">
            <span className="text-blue-600 font-bold">{formatTimecode(currentTime)}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">{formatTimecode(scene.duration)}</span>
          </div>

          <button
            onClick={() => {
              const speeds = [0.5, 1, 1.5, 2];
              const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
              setPlaybackSpeed(next);
            }}
            className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded cursor-pointer transition-colors"
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Right Canvas Tools: Pan, Zoom Slider, Fit, Reset, Undo, Redo, Zoom Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            title="Hand Tool (Drag to Pan Canvas anywhere) - Hold Space"
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              isPanActive ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* Zoom Slider with Magnifier (10% to 2000% Unlimited Zoom) */}
          <div className="hidden lg:flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.05"
              value={zoomScale}
              onChange={e => onChangeZoomScale(parseFloat(e.target.value))}
              className="w-24 accent-blue-600 h-1 cursor-pointer"
              title={`Canvas Zoom: ${Math.round(zoomScale * 100)}% (Unlimited Stage Zoom)`}
            />
          </div>

          <button
            onClick={() => {
              onChangeZoomScale(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            title="Fit Canvas to View & Center (100%)"
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors hidden sm:inline-flex"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button
            title="Undo"
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            title="Redo"
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <button
            onClick={() => {
              const step = zoomScale > 4 ? 1.0 : zoomScale > 2 ? 0.5 : zoomScale > 1 ? 0.2 : 0.1;
              onChangeZoomScale(Math.max(0.1, Math.round((zoomScale - step) * 100) / 100));
            }}
            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-600 min-w-[42px] text-center font-medium">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => {
              const step = zoomScale >= 4 ? 1.0 : zoomScale >= 2 ? 0.5 : zoomScale >= 1 ? 0.2 : 0.1;
              onChangeZoomScale(Math.min(20.0, Math.round((zoomScale + step) * 100) / 100));
            }}
            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
            title="Zoom In (Up to 2000%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
