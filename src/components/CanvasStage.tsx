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
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FlipHorizontal,
  Crosshair,
  X,
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
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
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
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onInteractionStart,
  onInteractionEnd,
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

  // Viewport Pointer Down for Panning when Hand tool or space/middle-click is active
  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (isPanActive || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startPanX = panOffset.x;
      const startPanY = panOffset.y;
      const pointerId = e.pointerId;
      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(pointerId);
      } catch (err) {}

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        moveEvent.preventDefault();
        setPanOffset({
          x: Math.round(startPanX + (moveEvent.clientX - startClientX)),
          y: Math.round(startPanY + (moveEvent.clientY - startClientY)),
        });
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        try {
          if (target.hasPointerCapture(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
        } catch (err) {}
        setIsPanning(false);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }
  };

  // Stage Pointer Down: When an element is selected, allow touching/dragging anywhere on the canvas stage to move it smoothly!
  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (isPanActive) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const currentSelectedId = selectedElementId;
    const currentElement = scene.elements.find(el => el.id === currentSelectedId);

    // If on mobile touch, touching canvas just deselects any selected element
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    if (isMobile && e.pointerType === 'touch') {
      if (currentSelectedId) {
        onSelectElement(null);
      }
      return;
    }

    // If no element is selected, or if element is locked:
    if (!currentElement || currentElement.locked) {
      if (currentSelectedId) {
        onSelectElement(null);
      }
      return;
    }

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = currentElement.x;
    const startY = currentElement.y;
    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const pointerId = e.pointerId;
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    let isDragMovement = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dist = Math.hypot(moveEvent.clientX - startClientX, moveEvent.clientY - startClientY);
      if (dist > 3) {
        if (!isDragMovement) {
          isDragMovement = true;
          setIsDraggingElement(true);
          onInteractionStart?.();
        }
        moveEvent.preventDefault();

        const deltaX = ((moveEvent.clientX - startClientX) / (stageRect.width || 1)) * 100;
        const deltaY = ((moveEvent.clientY - startClientY) / (stageRect.height || 1)) * 100;

        onUpdateElement(currentElement.id, {
          x: Math.round(Math.max(-300, Math.min(400, startX + deltaX))),
          y: Math.round(Math.max(-300, Math.min(400, startY + deltaY))),
        });
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {}

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (isDragMovement) {
        setIsDraggingElement(false);
        onInteractionEnd?.();
      } else {
        // If user tapped without dragging, deselect the element
        onSelectElement(null);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
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

  // Dragging selected element on stage via unified Pointer Events (Touch, Mouse, Pen)
  const handleElementPointerDown = (e: React.PointerEvent, element: StageElement) => {
    if (isPanActive) return; // In pan mode, let viewport pan handle it
    if (element.locked) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.stopPropagation();
    onSelectElement(element.id);

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    setIsDraggingElement(true);
    onInteractionStart?.();

    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      hasMoved = true;

      const deltaX = ((moveEvent.clientX - startClientX) / (stageRect.width || 1)) * 100;
      const deltaY = ((moveEvent.clientY - startClientY) / (stageRect.height || 1)) * 100;

      onUpdateElement(element.id, {
        x: Math.round(Math.max(-300, Math.min(400, startX + deltaX))),
        y: Math.round(Math.max(-300, Math.min(400, startY + deltaY))),
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {}

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setIsDraggingElement(false);
      if (hasMoved) {
        onInteractionEnd?.();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Transform Bounding Box Handle Drag via Pointer Events (Touch & Mouse - Unlimited Scale & Zoom)
  const handleResizeHandlePointerDown = (
    e: React.PointerEvent,
    element: StageElement,
    handle: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w' | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (element.locked) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const startW = element.width;
    const startH = element.height;
    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const elemCenterX = stageRect.left + (startX / 100) * stageRect.width;
    const elemCenterY = stageRect.top + (startY / 100) * stageRect.height;
    onInteractionStart?.();

    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      hasMoved = true;
      moveEvent.preventDefault();

      if (handle === 'rotate') {
        const angleRad = Math.atan2(moveEvent.clientY - elemCenterY, moveEvent.clientX - elemCenterX);
        const deg = Math.round((angleRad * 180) / Math.PI + 90);
        onUpdateElement(element.id, { rotation: deg });
        return;
      }

      const mouseX = ((moveEvent.clientX - stageRect.left) / (stageRect.width || 1)) * 100;
      const mouseY = ((moveEvent.clientY - stageRect.top) / (stageRect.height || 1)) * 100;

      // CORNER HANDLES: Directional scale anchoring opposite corner (expands/shrinks strictly in the direction pulled)
      if (handle === 'se') {
        // Top-left anchor is fixed
        const anchorX = startX - startW / 2;
        const anchorY = startY - startH / 2;
        const vx = mouseX - anchorX;
        const vy = mouseY - anchorY;
        const scaleFactor = Math.max(0.02, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const newW = Math.max(2, Math.round(startW * scaleFactor));
        const newH = Math.max(2, Math.round(startH * scaleFactor));
        const newX = anchorX + newW / 2;
        const newY = anchorY + newH / 2;
        onUpdateElement(element.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: newW,
          height: newH,
        });
        return;
      }

      if (handle === 'nw') {
        // Bottom-right anchor is fixed
        const anchorX = startX + startW / 2;
        const anchorY = startY + startH / 2;
        const vx = anchorX - mouseX;
        const vy = anchorY - mouseY;
        const scaleFactor = Math.max(0.02, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const newW = Math.max(2, Math.round(startW * scaleFactor));
        const newH = Math.max(2, Math.round(startH * scaleFactor));
        const newX = anchorX - newW / 2;
        const newY = anchorY - newH / 2;
        onUpdateElement(element.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: newW,
          height: newH,
        });
        return;
      }

      if (handle === 'ne') {
        // Bottom-left anchor is fixed
        const anchorX = startX - startW / 2;
        const anchorY = startY + startH / 2;
        const vx = mouseX - anchorX;
        const vy = anchorY - mouseY;
        const scaleFactor = Math.max(0.02, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const newW = Math.max(2, Math.round(startW * scaleFactor));
        const newH = Math.max(2, Math.round(startH * scaleFactor));
        const newX = anchorX + newW / 2;
        const newY = anchorY - newH / 2;
        onUpdateElement(element.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: newW,
          height: newH,
        });
        return;
      }

      if (handle === 'sw') {
        // Top-right anchor is fixed
        const anchorX = startX + startW / 2;
        const anchorY = startY - startH / 2;
        const vx = anchorX - mouseX;
        const vy = mouseY - anchorY;
        const scaleFactor = Math.max(0.02, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const newW = Math.max(2, Math.round(startW * scaleFactor));
        const newH = Math.max(2, Math.round(startH * scaleFactor));
        const newX = anchorX - newW / 2;
        const newY = anchorY + newH / 2;
        onUpdateElement(element.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: newW,
          height: newH,
        });
        return;
      }

      // EDGE HANDLES: Horizontal / Vertical stretching anchoring opposite edge
      if (handle === 'e') {
        const anchorLeft = startX - startW / 2;
        const newW = Math.max(2, Math.round(mouseX - anchorLeft));
        const newX = anchorLeft + newW / 2;
        onUpdateElement(element.id, { width: newW, x: Math.round(newX) });
        return;
      }

      if (handle === 'w') {
        const anchorRight = startX + startW / 2;
        const newW = Math.max(2, Math.round(anchorRight - mouseX));
        const newX = anchorRight - newW / 2;
        onUpdateElement(element.id, { width: newW, x: Math.round(newX) });
        return;
      }

      if (handle === 's') {
        const anchorTop = startY - startH / 2;
        const newH = Math.max(2, Math.round(mouseY - anchorTop));
        const newY = anchorTop + newH / 2;
        onUpdateElement(element.id, { height: newH, y: Math.round(newY) });
        return;
      }

      if (handle === 'n') {
        const anchorBottom = startY + startH / 2;
        const newH = Math.max(2, Math.round(anchorBottom - mouseY));
        const newY = anchorBottom - newH / 2;
        onUpdateElement(element.id, { height: newH, y: Math.round(newY) });
        return;
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (hasMoved) {
        onInteractionEnd?.();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
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
      
      {/* Top Floating Stage Quick Tools Pill (Always cleanly positioned at top center) */}
      <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md border border-slate-200 z-20 select-none">
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
        onPointerDown={handleViewportPointerDown}
        className={`flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-[#E2E8F0] canvas-grid-dots select-none touch-none ${
          isPanActive ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        style={{ touchAction: 'none' }}
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
          onPointerDown={handleStagePointerDown}
          className="relative bg-white shadow-2xl overflow-hidden rounded-md ring-1 ring-slate-300 shrink-0 select-none cursor-default touch-none"
          style={{
            width: `${stageBaseSize.width}px`,
            height: `${stageBaseSize.height}px`,
            aspectRatio: project.aspectRatio === '16:9' ? '16 / 9' : project.aspectRatio === '9:16' ? '9 / 16' : '1 / 1',
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out',
            touchAction: 'none',
          }}
        >
          {/* STAGE EXPORT / RENDER TARGET (Used by canvas recorder) */}
          <div
            ref={canvasRef as React.RefObject<HTMLDivElement>}
            className="w-full h-full relative overflow-hidden bg-white cursor-default touch-none"
            style={{ touchAction: 'none' }}
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

                return (
                  <div
                    key={el.id}
                    onClick={e => {
                      if (el.locked) {
                        e.stopPropagation();
                        return;
                      }
                      e.stopPropagation();
                      onSelectElement(el.id);
                    }}
                    onPointerDown={e => {
                      if (el.locked) {
                        e.stopPropagation();
                        return;
                      }
                      handleElementPointerDown(e, el);
                    }}
                    className={`absolute transition-shadow select-none ${
                      el.locked ? 'cursor-default pointer-events-none' : 'cursor-move touch-none'
                    } ${
                      !el.locked && isSelected ? 'ring-2 ring-blue-500 z-50' : !el.locked ? 'hover:ring-1 hover:ring-blue-400/50' : ''
                    }`}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                      transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                      opacity: el.opacity ?? 1,
                      zIndex: el.zIndex,
                      touchAction: 'none',
                      userSelect: 'none',
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
                      <div className="relative w-full h-full flex items-center justify-center p-2.5 filter drop-shadow-md pointer-events-none">
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
                        className="w-full h-full flex items-center justify-center font-extrabold tracking-wide drop-shadow-md p-1 pointer-events-none"
                        style={{
                          color: el.textColor || '#ffffff',
                          fontSize: `${el.fontSize || 22}px`,
                          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                        }}
                      >
                        {el.text || 'Add Text'}
                      </div>
                    )}

                    {/* BOUNDING BOX TRANSFORMS (When Selected and Not Locked) */}
                    {isSelected && !el.locked && (
                      <>
                        <div className="absolute -inset-1 border-2 border-blue-500 border-dashed rounded-xs pointer-events-none z-30" />

                        {/* Top Rotation Handle (Available on all devices, touch & mouse) */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'rotate')}
                          className="flex absolute -top-9 sm:-top-8 left-1/2 -translate-x-1/2 w-7 h-7 sm:w-5 sm:h-5 bg-blue-600 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing items-center justify-center hover:scale-125 active:scale-125 transition-transform z-50 touch-none"
                          style={{ touchAction: 'none' }}
                          title="Rotate Element"
                        >
                          <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full pointer-events-none" />
                        </div>
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-0.5 h-5.5 sm:h-5 bg-blue-500 pointer-events-none" />

                        {/* 4 Corner Resize Handles (Available on mobile & PC - easy to touch & drag) */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'nw')}
                          className="absolute -top-3.5 -left-3.5 sm:-top-2 sm:-left-2 w-7 h-7 sm:w-4 sm:h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none"
                          style={{ touchAction: 'none' }}
                          title="Resize Corner"
                        />
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'ne')}
                          className="absolute -top-3.5 -right-3.5 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-4 sm:h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none"
                          style={{ touchAction: 'none' }}
                          title="Resize Corner"
                        />
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'sw')}
                          className="absolute -bottom-3.5 -left-3.5 sm:-bottom-2 sm:-left-2 w-7 h-7 sm:w-4 sm:h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none"
                          style={{ touchAction: 'none' }}
                          title="Resize Corner"
                        />
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'se')}
                          className="absolute -bottom-3.5 -right-3.5 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-4 sm:h-4 bg-white border-2 border-blue-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none"
                          style={{ touchAction: 'none' }}
                          title="Resize Corner"
                        />

                        {/* 4 Edge Length & Width Middle Fit Handles (Top, Bottom, Left, Right - Available on all devices) */}
                        {/* Top Middle Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'n')}
                          className="absolute -top-3.5 sm:-top-2.5 left-1/2 -translate-x-1/2 w-8 sm:w-6 h-3.5 sm:h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ns-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Fit / Stretch Height (Top)"
                        >
                          <div className="w-2.5 h-0.5 bg-blue-500 rounded-full pointer-events-none" />
                        </div>

                        {/* Bottom Middle Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 's')}
                          className="absolute -bottom-3.5 sm:-bottom-2.5 left-1/2 -translate-x-1/2 w-8 sm:w-6 h-3.5 sm:h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ns-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Fit / Stretch Height (Bottom)"
                        >
                          <div className="w-2.5 h-0.5 bg-blue-500 rounded-full pointer-events-none" />
                        </div>

                        {/* Left Middle Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'w')}
                          className="absolute top-1/2 -translate-y-1/2 -left-3.5 sm:-left-2.5 w-3.5 sm:w-2.5 h-8 sm:h-6 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ew-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Fit / Stretch Width (Left)"
                        >
                          <div className="h-2.5 w-0.5 bg-blue-500 rounded-full pointer-events-none" />
                        </div>

                        {/* Right Middle Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'e')}
                          className="absolute top-1/2 -translate-y-1/2 -right-3.5 sm:-right-2.5 w-3.5 sm:w-2.5 h-8 sm:h-6 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ew-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Fit / Stretch Width (Right)"
                        >
                          <div className="h-2.5 w-0.5 bg-blue-500 rounded-full pointer-events-none" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Compact Bottom Floating Element Controller (Single-line, Responsive, Fits on 1 line on mobile, without name/icon) */}
        {selectedElement && !selectedElement.locked && (
          <div
            onPointerDown={e => e.stopPropagation()}
            className="absolute bottom-2 sm:bottom-2.5 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-12px)] sm:max-w-fit px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex items-center space-x-1 sm:space-x-1.5 text-xs text-white select-none whitespace-nowrap overflow-x-auto no-scrollbar pointer-events-auto touch-none"
            style={{ touchAction: 'none' }}
          >
            {/* Directional Nudge Arrows (Rescue off-canvas elements easily) */}
            <div className="flex items-center space-x-0.5 bg-slate-800/90 rounded px-0.5 py-0.5 border border-slate-700/50 shrink-0">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, { x: selectedElement.x - 2 });
                }}
                className="p-0.5 sm:p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Nudge Left 2%"
              >
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, { y: selectedElement.y - 2 });
                }}
                className="p-0.5 sm:p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Nudge Up 2%"
              >
                <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, { y: selectedElement.y + 2 });
                }}
                className="p-0.5 sm:p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Nudge Down 2%"
              >
                <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, { x: selectedElement.x + 2 });
                }}
                className="p-0.5 sm:p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                title="Nudge Right 2%"
              >
                <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>

            <div className="w-px h-3 bg-slate-700/80 mx-0.5 shrink-0" />

            {/* Size / Zoom Adjusters */}
            <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, {
                    width: Math.max(2, Math.round(selectedElement.width * 0.85)),
                    height: Math.max(2, Math.round(selectedElement.height * 0.85)),
                  });
                }}
                className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-slate-800 rounded-full cursor-pointer text-slate-300 hover:text-white font-bold text-[10px] sm:text-xs"
                title="Shrink Size (-)"
              >
                -
              </button>

              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-blue-400 min-w-[26px] sm:min-w-[30px] text-center">
                {Math.round(selectedElement.width)}%
              </span>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, {
                    width: Math.max(2, Math.round(selectedElement.width * 1.2)),
                    height: Math.max(2, Math.round(selectedElement.height * 1.2)),
                  });
                }}
                className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-slate-800 rounded-full cursor-pointer text-slate-300 hover:text-white font-bold text-[10px] sm:text-xs"
                title="Enlarge Size (+)"
              >
                +
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  const defaultW = selectedElement.type === 'character' ? 45 : 30;
                  const defaultH = selectedElement.type === 'character' ? 75 : 30;
                  onUpdateElement(selectedElement.id, { width: defaultW, height: defaultH });
                }}
                className="text-[9px] sm:text-[10px] text-slate-400 hover:text-white hover:underline cursor-pointer px-0.5 py-0.5"
                title="Reset size to default"
              >
                Reset
              </button>
            </div>

            <div className="w-px h-3 bg-slate-700/80 mx-0.5 shrink-0" />

            {/* Quick Center Button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onUpdateElement(selectedElement.id, { x: 50, y: 50 });
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer shrink-0"
              title="Center element on canvas"
            >
              <Crosshair className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>

            {/* Flip Horizontal */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onUpdateElement(selectedElement.id, {
                  scaleX: (selectedElement.scaleX || 1) === 1 ? -1 : 1,
                });
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer shrink-0"
              title="Flip Horizontal (⇄)"
            >
              <FlipHorizontal className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>

            {/* Rotate 15° */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onUpdateElement(selectedElement.id, {
                  rotation: ((selectedElement.rotation || 0) + 15) % 360,
                });
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer shrink-0"
              title="Rotate 15° Clockwise"
            >
              <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>

            <div className="w-px h-3 bg-slate-700/80 mx-0.5 shrink-0" />

            {/* Close / Deselect (✕) */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSelectElement(null);
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer shrink-0"
              title="Close / Deselect Element (✕)"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        )}
      </div>

      {/* FLOATING PLAYBACK & VIEW CONTROL BAR (Professional Polish clean studio theme) */}
      <div className="h-10 sm:h-11 bg-white border-t border-slate-200 px-1 sm:px-2 md:px-3 flex items-center justify-between text-xs text-slate-700 z-10 shrink-0 shadow-sm w-full min-w-0 flex-nowrap overflow-x-auto no-scrollbar">
        
        {/* Left Actions: Multi Select, Duplicate, Split, Camera */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
          <button
            onClick={() => setIsMultiSelect(!isMultiSelect)}
            title="Multi Select Elements"
            className={`flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 rounded transition-colors cursor-pointer ${
              isMultiSelect ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="font-semibold text-[11px] hidden xl:inline">Multi Select</span>
          </button>

          <button
            onClick={() => selectedElementId && onDuplicateElement(selectedElementId)}
            disabled={!selectedElementId}
            title="Duplicate Selected Element"
            className="flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[11px] hidden xl:inline">Duplicate</span>
          </button>

          <button
            title="Split element at playhead"
            className="flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[11px] hidden xl:inline">Split</span>
          </button>

          <button
            title="Add Camera Motion"
            className="flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[11px] hidden xl:inline">Camera</span>
          </button>
        </div>

        {/* Center Transport Controls: Jump to Start, -5s, Play/Pause, Scene, +5s, Timecode */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
          <button
            onClick={() => onSeek(0)}
            title="Jump to Start"
            className="p-0.5 sm:p-1 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer transition-colors"
          >
            <SkipBack className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>

          {/* Back 5s */}
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            title="Back 5s"
            className="p-0.5 sm:p-1 flex items-center space-x-0.5 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            <span className="text-[10px] sm:text-[11px] font-bold hidden sm:inline">5</span>
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full shadow-xs transition-all cursor-pointer shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current" />
            ) : (
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            title="Preview Current Scene"
            onClick={() => onSeek(0)}
            className="hidden sm:inline-flex p-0.5 sm:p-1 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer transition-colors"
          >
            <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>

          {/* Forward 5s */}
          <button
            onClick={() => onSeek(Math.min(scene.duration, currentTime + 5))}
            title="Forward 5s"
            className="p-0.5 sm:p-1 flex items-center space-x-0.5 hover:bg-slate-100 hover:text-slate-900 text-slate-600 rounded cursor-pointer transition-colors"
          >
            <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            <span className="text-[10px] sm:text-[11px] font-bold hidden sm:inline">5</span>
          </button>

          {/* Timecode */}
          <div className="flex items-center space-x-1 px-1 sm:px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px] sm:text-xs font-semibold text-slate-800">
            <span className="text-blue-600 font-bold">{formatTimecode(currentTime)}</span>
            <span className="text-slate-400 hidden sm:inline">/</span>
            <span className="text-slate-500 hidden sm:inline">{formatTimecode(scene.duration)}</span>
          </div>
        </div>

        {/* Right Canvas Tools: Hand, Zoom Slider, Fit, Undo, Redo, Zoom Controls (+/- side by side without %) */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            title="Hand Tool (Drag to Pan Canvas anywhere) - Hold Space"
            className={`p-0.5 sm:p-1 md:p-1.5 rounded cursor-pointer transition-colors ${
              isPanActive ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>

          {/* Zoom Slider with Magnifier (Desktop only) */}
          <div className="hidden lg:flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.05"
              value={zoomScale}
              onChange={e => onChangeZoomScale(parseFloat(e.target.value))}
              className="w-14 xl:w-16 accent-blue-600 h-1 cursor-pointer"
              title={`Canvas Zoom: ${Math.round(zoomScale * 100)}%`}
            />
          </div>

          <button
            onClick={() => {
              onChangeZoomScale(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            title="Fit Canvas to View & Center (100%)"
            className="p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
          >
            <Maximize className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>

          <button
            onClick={onUndo}
            disabled={canUndo === false}
            title="Undo (Ctrl+Z)"
            className="p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors disabled:opacity-30"
          >
            <Undo2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>

          <button
            onClick={onRedo}
            disabled={canRedo === false}
            title="Redo (Ctrl+Y)"
            className="p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors disabled:opacity-30"
          >
            <Redo2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </button>

          <div className="h-3.5 sm:h-4 w-px bg-slate-200 mx-0.5" />

          {/* Canvas Zoom In & Out icons side by side without % (Always visible, clean and compact) */}
          <div className="flex items-center space-x-0.5 bg-slate-100 border border-slate-200 rounded p-0.5">
            <button
              onClick={() => {
                const step = zoomScale > 4 ? 1.0 : zoomScale > 2 ? 0.5 : zoomScale > 1 ? 0.2 : 0.1;
                onChangeZoomScale(Math.max(0.1, Math.round((zoomScale - step) * 100) / 100));
              }}
              className="p-0.5 sm:p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Zoom Out Canvas (-)"
            >
              <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={() => {
                const step = zoomScale >= 4 ? 1.0 : zoomScale >= 2 ? 0.5 : zoomScale >= 1 ? 0.2 : 0.1;
                onChangeZoomScale(Math.min(20.0, Math.round((zoomScale + step) * 100) / 100));
              }}
              className="p-0.5 sm:p-1 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Zoom In Canvas (+)"
            >
              <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
