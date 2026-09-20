import React, { useRef, useState, useEffect } from 'react';
import {
  StageElement,
  Scene,
  ProjectSettings,
  CharacterModel,
  MediaAsset,
} from '../types';
import { isGifMedia, getGifDuration } from '../utils/gifUtils';
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
  Sliders,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CanvasStageProps {
  scene: Scene;
  project: ProjectSettings;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedElementId: string | null;
  selectedAudioId?: string | null;
  onSelectElement: (id: string | null) => void;
  onSelectAudio?: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<StageElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string, atStartTime?: number, targetTrackIndex?: number) => void;
  onDuplicateAudioTrack?: (id: string, atStartTime?: number, targetTrackIndex?: number) => void;
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
  onSplitAtPlayhead?: (elementId?: string, atTime?: number) => void;
  onOpenProperties?: () => void;
  isPropertiesOpen?: boolean;
  isCameraBoxVisible?: boolean;
  onToggleCameraBox?: () => void;
  onAddCameraLayer?: () => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  scene,
  project,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedElementId,
  selectedAudioId,
  onSelectElement,
  onSelectAudio,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onDuplicateAudioTrack,
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
  onSplitAtPlayhead,
  onOpenProperties,
  isPropertiesOpen,
  isCameraBoxVisible,
  onToggleCameraBox,
  onAddCameraLayer,
}) => {
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [isPreviewCameraMode, setIsPreviewCameraMode] = useState(false);
  const [selectedCameraBox, setSelectedCameraBox] = useState<'start' | 'target'>('start');

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

    const isElementActiveAtTime = Boolean(
      currentElement &&
      currentTime >= currentElement.startTime &&
      currentTime <= currentElement.startTime + currentElement.duration + 0.05
    );

    // If no element is selected, or if element is locked, or if element is not active at currentTime:
    if (!currentElement || currentElement.locked || !isElementActiveAtTime) {
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const dataString = e.dataTransfer.getData('application/json');
    if (dataString) {
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
      return;
    }

    // Direct OS file drop onto stage (e.g. dragging a GIF or image file from desktop)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const stageRect = stageContainerRef.current?.getBoundingClientRect();
      const dropX = stageRect ? ((e.clientX - stageRect.left) / stageRect.width) * 100 : 50;
      const dropY = stageRect ? ((e.clientY - stageRect.top) / stageRect.height) * 100 : 50;

      const isImageOrGif = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|gif|svg)$/i);
      const isAudio = file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a)$/i);

      if (isImageOrGif) {
        let gifDuration: number | undefined;
        if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
          const detected = await getGifDuration(file);
          if (detected && detected > 0) gifDuration = detected;
        }
        const fileUrl = URL.createObjectURL(file);
        const mediaAsset: MediaAsset = {
          id: `drop-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          url: fileUrl,
          duration: gifDuration,
          category: gifDuration ? 'Animated GIF' : 'Custom Prop',
        };
        onDropAssetOnStage(
          'media',
          mediaAsset,
          Math.max(10, Math.min(80, Math.round(dropX))),
          Math.max(10, Math.min(80, Math.round(dropY)))
        );
      } else if (isAudio) {
        const fileUrl = URL.createObjectURL(file);
        const mediaAsset: MediaAsset = {
          id: `drop-audio-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'audio',
          url: fileUrl,
          duration: 5,
          category: 'Custom Audio',
        };
        onDropAssetOnStage('media', mediaAsset, 50, 50);
      }
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

      if (element.type === 'camera') {
        const halfW = element.width / 2;
        const halfH = element.height / 2;
        const clampedX = Math.max(halfW, Math.min(100 - halfW, Math.round(startX + deltaX)));
        const clampedY = Math.max(halfH, Math.min(100 - halfH, Math.round(startY + deltaY)));
        onUpdateElement(element.id, {
          x: clampedX,
          y: clampedY,
        });
        return;
      }

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

  // Dragging camera target box (Box 2 / End Box)
  const handleCameraTargetPointerDown = (e: React.PointerEvent, element: StageElement) => {
    if (isPanActive) return;
    if (element.locked) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.stopPropagation();
    onSelectElement(element.id);
    setSelectedCameraBox('target');

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const currentTargetW = element.cameraTargetWidth ?? element.width;
    const currentTargetH = element.cameraTargetHeight ?? element.height;
    const startTargetX = element.cameraTargetX ?? Math.min(95, element.x + 7);
    const startTargetY = element.cameraTargetY ?? Math.min(95, element.y + 7);
    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    setIsDraggingElement(true);
    onInteractionStart?.();

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();

      const deltaX = ((moveEvent.clientX - startClientX) / (stageRect.width || 1)) * 100;
      const deltaY = ((moveEvent.clientY - startClientY) / (stageRect.height || 1)) * 100;

      const halfW = currentTargetW / 2;
      const halfH = currentTargetH / 2;
      const clampedX = Math.max(halfW, Math.min(100 - halfW, Math.round(startTargetX + deltaX)));
      const clampedY = Math.max(halfH, Math.min(100 - halfH, Math.round(startTargetY + deltaY)));

      onUpdateElement(element.id, {
        cameraTargetX: clampedX,
        cameraTargetY: clampedY,
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
      onInteractionEnd?.();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Corner resize for camera target box (Box 2 / End Box)
  const handleCameraTargetResizeHandlePointerDown = (
    e: React.PointerEvent,
    element: StageElement,
    handle: 'se' | 'sw' | 'ne' | 'nw'
  ) => {
    if (element.locked) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.stopPropagation();
    setSelectedCameraBox('target');
    const pointerId = e.pointerId;
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const stageRect = stageContainerRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const startX = element.cameraTargetX ?? Math.min(95, element.x + 7);
    const startY = element.cameraTargetY ?? Math.min(95, element.y + 7);
    const startW = element.cameraTargetWidth ?? element.width;
    const startH = element.cameraTargetHeight ?? element.height;

    onInteractionStart?.();

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();

      const mouseX = ((moveEvent.clientX - stageRect.left) / (stageRect.width || 1)) * 100;
      const mouseY = ((moveEvent.clientY - stageRect.top) / (stageRect.height || 1)) * 100;

      if (handle === 'se') {
        const anchorX = startX - startW / 2;
        const anchorY = startY - startH / 2;
        const vx = mouseX - anchorX;
        const vy = mouseY - anchorY;
        const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const targetSize = Math.max(8, Math.round(startW * scaleFactor));
        const maxSize = Math.min(100 - anchorX, 100 - anchorY);
        const finalSize = Math.max(8, Math.min(maxSize, targetSize));
        onUpdateElement(element.id, {
          cameraTargetX: Math.round(anchorX + finalSize / 2),
          cameraTargetY: Math.round(anchorY + finalSize / 2),
          cameraTargetWidth: finalSize,
          cameraTargetHeight: finalSize,
        });
        return;
      }

      if (handle === 'nw') {
        const anchorX = startX + startW / 2;
        const anchorY = startY + startH / 2;
        const vx = anchorX - mouseX;
        const vy = anchorY - mouseY;
        const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const targetSize = Math.max(8, Math.round(startW * scaleFactor));
        const maxSize = Math.min(anchorX, anchorY);
        const finalSize = Math.max(8, Math.min(maxSize, targetSize));
        onUpdateElement(element.id, {
          cameraTargetX: Math.round(anchorX - finalSize / 2),
          cameraTargetY: Math.round(anchorY - finalSize / 2),
          cameraTargetWidth: finalSize,
          cameraTargetHeight: finalSize,
        });
        return;
      }

      if (handle === 'ne') {
        const anchorX = startX - startW / 2;
        const anchorY = startY + startH / 2;
        const vx = mouseX - anchorX;
        const vy = anchorY - mouseY;
        const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const targetSize = Math.max(8, Math.round(startW * scaleFactor));
        const maxSize = Math.min(100 - anchorX, anchorY);
        const finalSize = Math.max(8, Math.min(maxSize, targetSize));
        onUpdateElement(element.id, {
          cameraTargetX: Math.round(anchorX + finalSize / 2),
          cameraTargetY: Math.round(anchorY - finalSize / 2),
          cameraTargetWidth: finalSize,
          cameraTargetHeight: finalSize,
        });
        return;
      }

      if (handle === 'sw') {
        const anchorX = startX + startW / 2;
        const anchorY = startY - startH / 2;
        const vx = anchorX - mouseX;
        const vy = mouseY - anchorY;
        const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
        const targetSize = Math.max(8, Math.round(startW * scaleFactor));
        const maxSize = Math.min(anchorX, 100 - anchorY);
        const finalSize = Math.max(8, Math.min(maxSize, targetSize));
        onUpdateElement(element.id, {
          cameraTargetX: Math.round(anchorX - finalSize / 2),
          cameraTargetY: Math.round(anchorY + finalSize / 2),
          cameraTargetWidth: finalSize,
          cameraTargetHeight: finalSize,
        });
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
      onInteractionEnd?.();
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

      // CAMERA ELEMENT PROPORTIONAL CORNER RESIZE (Maintains 16:9 canvas ratio uniformly and clamped inside canvas)
      if (element.type === 'camera') {
        if (handle === 'se') {
          // Top-left anchor is fixed
          const anchorX = startX - startW / 2;
          const anchorY = startY - startH / 2;
          const vx = mouseX - anchorX;
          const vy = mouseY - anchorY;
          const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
          const targetSize = Math.max(8, Math.round(startW * scaleFactor));
          const maxSize = Math.min(100 - anchorX, 100 - anchorY);
          const finalSize = Math.max(8, Math.min(maxSize, targetSize));
          onUpdateElement(element.id, {
            x: Math.round(anchorX + finalSize / 2),
            y: Math.round(anchorY + finalSize / 2),
            width: finalSize,
            height: finalSize,
          });
          return;
        }

        if (handle === 'nw') {
          // Bottom-right anchor is fixed
          const anchorX = startX + startW / 2;
          const anchorY = startY + startH / 2;
          const vx = anchorX - mouseX;
          const vy = anchorY - mouseY;
          const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
          const targetSize = Math.max(8, Math.round(startW * scaleFactor));
          const maxSize = Math.min(anchorX, anchorY);
          const finalSize = Math.max(8, Math.min(maxSize, targetSize));
          onUpdateElement(element.id, {
            x: Math.round(anchorX - finalSize / 2),
            y: Math.round(anchorY - finalSize / 2),
            width: finalSize,
            height: finalSize,
          });
          return;
        }

        if (handle === 'ne') {
          // Bottom-left anchor is fixed
          const anchorX = startX - startW / 2;
          const anchorY = startY + startH / 2;
          const vx = mouseX - anchorX;
          const vy = anchorY - mouseY;
          const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
          const targetSize = Math.max(8, Math.round(startW * scaleFactor));
          const maxSize = Math.min(100 - anchorX, anchorY);
          const finalSize = Math.max(8, Math.min(maxSize, targetSize));
          onUpdateElement(element.id, {
            x: Math.round(anchorX + finalSize / 2),
            y: Math.round(anchorY - finalSize / 2),
            width: finalSize,
            height: finalSize,
          });
          return;
        }

        if (handle === 'sw') {
          // Top-right anchor is fixed
          const anchorX = startX + startW / 2;
          const anchorY = startY - startH / 2;
          const vx = anchorX - mouseX;
          const vy = mouseY - anchorY;
          const scaleFactor = Math.max(0.05, (vx / (startW || 1) + vy / (startH || 1)) / 2);
          const targetSize = Math.max(8, Math.round(startW * scaleFactor));
          const maxSize = Math.min(anchorX, 100 - anchorY);
          const finalSize = Math.max(8, Math.min(maxSize, targetSize));
          onUpdateElement(element.id, {
            x: Math.round(anchorX - finalSize / 2),
            y: Math.round(anchorY + finalSize / 2),
            width: finalSize,
            height: finalSize,
          });
          return;
        }
        return;
      }

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

      // EDGE HANDLES: Proportional for Sprite Sheet characters, or 1D stretching for normal elements
      if (element.type === 'character' && element.characterData?.isSpriteSheet) {
        const sp = element.characterData.spriteSheet;
        const ratio = sp?.aspectRatio || (sp?.frameWidth && sp?.frameHeight ? sp.frameWidth / sp.frameHeight : 1);
        const stageRatio = project.aspectRatio === '9:16' ? 9 / 16 : project.aspectRatio === '1:1' ? 1 : 16 / 9;
        const adjustedRatio = ratio / stageRatio;

        if (handle === 'e' || handle === 'w') {
          const anchorLeft = startX - startW / 2;
          const anchorRight = startX + startW / 2;
          const newW = handle === 'e'
            ? Math.max(4, Math.round(mouseX - anchorLeft))
            : Math.max(4, Math.round(anchorRight - mouseX));
          const newH = Math.max(4, Math.round(newW / adjustedRatio));
          const newX = handle === 'e' ? anchorLeft + newW / 2 : anchorRight - newW / 2;
          onUpdateElement(element.id, {
            width: newW,
            height: newH,
            x: Math.round(newX),
          });
          return;
        }

        if (handle === 's' || handle === 'n') {
          const anchorTop = startY - startH / 2;
          const anchorBottom = startY + startH / 2;
          const newH = handle === 's'
            ? Math.max(4, Math.round(mouseY - anchorTop))
            : Math.max(4, Math.round(anchorBottom - mouseY));
          const newW = Math.max(4, Math.round(newH * adjustedRatio));
          const newY = handle === 's' ? anchorTop + newH / 2 : anchorBottom - newH / 2;
          onUpdateElement(element.id, {
            width: newW,
            height: newH,
            y: Math.round(newY),
          });
          return;
        }
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
  const isSelectedElementActive = Boolean(
    selectedElement &&
    currentTime >= selectedElement.startTime &&
    currentTime <= selectedElement.startTime + selectedElement.duration + 0.05
  );

  // Active Camera Element for current playhead time
  const activeCameraElement = scene.elements.find(el => {
    if (el.type !== 'camera' || el.visible === false) return false;
    const elEnd = el.startTime + el.duration;
    return currentTime >= el.startTime && (
      currentTime < elEnd ||
      (currentTime >= scene.duration && currentTime <= elEnd + 0.05)
    );
  });

  const hasCameraLayer = scene.elements.some(el => el.type === 'camera');
  const isCameraActive = (isPlaying || isPreviewCameraMode) && !!activeCameraElement;

  let currentCamX = activeCameraElement?.x ?? 50;
  let currentCamY = activeCameraElement?.y ?? 50;
  let currentCamW = activeCameraElement?.width ?? 50;
  let currentCamFlip = activeCameraElement?.scaleX === -1;

  if (activeCameraElement?.hasCameraMotion) {
    const rawProgress = Math.max(
      0,
      Math.min(1, (currentTime - activeCameraElement.startTime) / Math.max(0.1, activeCameraElement.duration))
    );
    // Uniform, constant speed from start to end (সরাসরি সমান স্পিডে শুরু থেকে শেষ অব্দি যাবে)
    const t =
      activeCameraElement.cameraMotion === 'cut'
        ? (rawProgress < 0.5 ? 0 : 1)
        : rawProgress;

    const startX = activeCameraElement.x;
    const startY = activeCameraElement.y;
    const startW = activeCameraElement.width;
    const startFlip = activeCameraElement.scaleX === -1;

    const endX = activeCameraElement.cameraTargetX ?? Math.min(95, startX + 7);
    const endY = activeCameraElement.cameraTargetY ?? Math.min(95, startY + 7);
    const endW = activeCameraElement.cameraTargetWidth ?? startW;
    const endFlip = (activeCameraElement.cameraTargetScaleX ?? (activeCameraElement.scaleX || 1)) === -1;

    currentCamX = startX + (endX - startX) * t;
    currentCamY = startY + (endY - startY) * t;
    currentCamW = startW + (endW - startW) * t;
    currentCamFlip = rawProgress >= 0.5 ? endFlip : startFlip;
  }

  const camScale = activeCameraElement ? 100 / Math.max(1, currentCamW) : 1;
  const camScaleX = currentCamFlip ? -camScale : camScale;
  const camTranslateX = activeCameraElement ? 50 - currentCamX * camScale : 0;
  const camTranslateY = activeCameraElement ? 50 - currentCamY * camScale : 0;

  return (
    <div className="flex-1 flex flex-col bg-[#E2E8F0] overflow-hidden select-none relative">
      
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
            {/* CAMERA MOTION VIEWPORT CONTAINER (Transforms to zoom & pan camera box to fill canvas) */}
            <div
              className="w-full h-full absolute inset-0 overflow-hidden pointer-events-auto"
              style={
                isCameraActive && activeCameraElement
                  ? {
                      transformOrigin: '0 0',
                      transform: `translate(50%, 50%) scale(${camScaleX}, ${camScale}) translate(-${currentCamX}%, -${currentCamY}%)`,
                      transition: 'none',
                    }
                  : {
                      transform: 'none',
                      transition: 'none',
                    }
              }
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
            {(() => {
              // Group visible elements by trackIndex to bridge any head-to-head boundaries seamlessly
              const trackMap = new Map<number, StageElement[]>();
              scene.elements.forEach(el => {
                if (el.visible === false) return;
                const tIdx = el.trackIndex ?? 0;
                const list = trackMap.get(tIdx) || [];
                list.push(el);
                trackMap.set(tIdx, list);
              });

              const activeElements = scene.elements.filter(el => {
                if (el.visible === false) return false;
                const tIdx = el.trackIndex ?? 0;
                const sameTrack = (trackMap.get(tIdx) || []).sort((a, b) => a.startTime - b.startTime);
                const currentIdx = sameTrack.findIndex(item => item.id === el.id);
                const nextEl = currentIdx !== -1 && currentIdx < sameTrack.length - 1 ? sameTrack[currentIdx + 1] : null;

                const elEnd = el.startTime + el.duration;
                // Only bridge split pieces that are genuinely adjacent/touching (gap <= 0.03s).
                // If there is ANY intentional gap between clips, do NOT bridge them!
                const isTouching = nextEl && (nextEl.startTime >= elEnd - 0.05) && (nextEl.startTime - elEnd <= 0.03);
                const effectiveEnd = isTouching ? nextEl.startTime : elEnd;

                // An element is strictly visible ONLY when the playhead (currentTime) is within its time span!
                // During any gap or before its start / after its end, it MUST NOT show on canvas.
                const isPlaybackActive = currentTime >= el.startTime && (
                  currentTime < effectiveEnd ||
                  (currentTime >= scene.duration && currentTime <= elEnd + 0.05)
                );

                return isPlaybackActive;
              });

              return activeElements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(el => {
                  // When camera framing is active (playing or previewing), the red camera box itself is invisible
                  // because we are viewing through the camera lens zoomed to full screen!
                  if (el.type === 'camera' && (isCameraActive || isPlaying)) {
                    return null;
                  }

                  const isSelected = el.id === selectedElementId && !isPlaying;

                  return (
                    <React.Fragment key={el.id}>
                      {/* CONNECTING MOTION PATH ARROW BETWEEN CAMERA BOX 1 & BOX 2 */}
                      {el.type === 'camera' && el.hasCameraMotion && !isCameraActive && !isPlaying && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
                          <defs>
                            <marker
                              id={`cam-motion-arrow-${el.id}`}
                              viewBox="0 0 10 10"
                              refX="7"
                              refY="5"
                              markerWidth="6"
                              markerHeight="6"
                              orient="auto-start-reverse"
                            >
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                            </marker>
                          </defs>
                          <line
                            x1={`${el.x}%`}
                            y1={`${el.y}%`}
                            x2={`${el.cameraTargetX ?? Math.min(95, el.x + 6)}%`}
                            y2={`${el.cameraTargetY ?? Math.min(95, el.y + 6)}%`}
                            stroke="#10B981"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            markerEnd={`url(#cam-motion-arrow-${el.id})`}
                            opacity="0.85"
                          />
                        </svg>
                      )}

                      <div
                        key={el.id}
                        onClick={e => {
                          if (el.locked) {
                            e.stopPropagation();
                            return;
                          }
                          e.stopPropagation();
                          onSelectElement(el.id);
                          if (el.type === 'camera') {
                            setSelectedCameraBox('start');
                          }
                        }}
                        onPointerDown={e => {
                          if (el.locked) {
                            e.stopPropagation();
                            return;
                          }
                          if (el.type === 'camera') {
                            setSelectedCameraBox('start');
                          }
                          handleElementPointerDown(e, el);
                        }}
                      className={`absolute transition-shadow select-none ${
                        el.locked ? 'cursor-default pointer-events-none' : 'cursor-move touch-none'
                      } ${
                        el.type === 'camera'
                          ? ''
                          : !el.locked && isSelected ? 'ring-2 ring-blue-500 z-50' : !el.locked ? 'hover:ring-1 hover:ring-blue-400/50' : ''
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
                            currentTime={currentTime}
                            width="100%"
                            height="100%"
                          />
                        </div>
                      )}

                      {/* IMAGE / VIDEO ELEMENT */}
                      {el.type === 'image' && el.mediaUrl && (
                        <div
                          className="w-full h-full pointer-events-none"
                          style={{
                            transform: el.scaleX === -1 ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          <img
                            src={el.mediaUrl}
                            alt={el.name}
                            loading="eager"
                            decoding="sync"
                            className={`w-full h-full pointer-events-none select-none ${
                              el.fitMode === 'contain'
                                ? 'object-contain'
                                : el.fitMode === 'fill'
                                ? 'object-fill'
                                : el.fitMode === 'cover' || el.isBackground
                                ? 'object-cover'
                                : 'object-contain drop-shadow'
                            }`}
                          />
                        </div>
                      )}

                    {/* EFFECT / FILTER ELEMENT */}
                    {el.type === 'effect' && (
                      <div
                        className="w-full h-full pointer-events-none overflow-hidden relative"
                        style={{
                          transform: el.scaleX === -1 ? 'scaleX(-1)' : undefined,
                        }}
                      >
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
                      <div
                        className="w-full h-full pointer-events-none"
                        style={{
                          transform: el.scaleX === -1 ? 'scaleX(-1)' : undefined,
                        }}
                      >
                        <video
                          src={el.mediaUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover pointer-events-none rounded-lg shadow-md"
                        />
                      </div>
                    )}

                    {/* SPEECH BUBBLE ELEMENT */}
                    {el.type === 'speechBubble' && (
                      <div
                        className="relative w-full h-full flex items-center justify-center p-2.5 filter drop-shadow-md pointer-events-none"
                        style={{
                          transform: el.scaleX === -1 ? 'scaleX(-1)' : undefined,
                        }}
                      >
                        <div
                          className="w-full h-full rounded-2xl flex items-center justify-center text-center p-2 font-bold leading-snug border-2 border-slate-900 shadow-md transition-all"
                          style={{
                            backgroundColor: el.bubbleColor || '#ffffff',
                            color: el.textColor || '#0f172a',
                            fontSize: `${el.fontSize || 15}px`,
                          }}
                        >
                          <span
                            style={{
                              transform: el.scaleX === -1 ? 'scaleX(-1)' : undefined,
                              display: 'inline-block',
                            }}
                          >
                            {el.text || 'Type your dialogue here...'}
                          </span>
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
                          transform: el.scaleX === -1 ? 'scaleX(-1)' : undefined,
                        }}
                      >
                        {el.text || 'Add Text'}
                      </div>
                    )}

                    {/* CAMERA LAYER ELEMENT (16:9 Canvas Ratio, Red border, No text inside) */}
                    {el.type === 'camera' && !isCameraActive && !isPlaying && (
                      <div className="w-full h-full box-border border-2 border-red-500 pointer-events-none relative">
                        {el.hasCameraMotion ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] sm:text-[9px] font-bold flex items-center gap-1 shadow-xs tracking-wider">
                            <span>START (1)</span>
                            {el.scaleX === -1 && <span>• FLIPPED</span>}
                          </div>
                        ) : el.scaleX === -1 ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[8px] sm:text-[9px] font-bold flex items-center gap-1 shadow-xs tracking-wider">
                            <FlipHorizontal className="w-2.5 h-2.5" />
                            <span>FLIPPED</span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* CAMERA LAYER 4 CORNER RESIZE POINTERS */}
                    {isSelected && !el.locked && el.type === 'camera' && !isCameraActive && !isPlaying && (
                      <>
                        {/* Top-Left Corner Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'nw')}
                          className="absolute -top-3 -left-3 sm:-top-2 sm:-left-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-red-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Resize Camera (Maintains 16:9)"
                        >
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-xs pointer-events-none" />
                        </div>

                        {/* Top-Right Corner Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'ne')}
                          className="absolute -top-3 -right-3 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-red-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Resize Camera (Maintains 16:9)"
                        >
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-xs pointer-events-none" />
                        </div>

                        {/* Bottom-Left Corner Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'sw')}
                          className="absolute -bottom-3 -left-3 sm:-bottom-2 sm:-left-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-red-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Resize Camera (Maintains 16:9)"
                        >
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-xs pointer-events-none" />
                        </div>

                        {/* Bottom-Right Corner Handle */}
                        <div
                          onPointerDown={e => handleResizeHandlePointerDown(e, el, 'se')}
                          className="absolute -bottom-3 -right-3 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-red-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                          style={{ touchAction: 'none' }}
                          title="Resize Camera (Maintains 16:9)"
                        >
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-xs pointer-events-none" />
                        </div>
                      </>
                    )}

                    {/* BOUNDING BOX TRANSFORMS (When Selected and Not Locked) */}
                    {isSelected && !el.locked && el.type !== 'camera' && (
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

                        {/* 4 Edge Length & Width Middle Fit Handles (Top, Bottom, Left, Right - for non-sprite elements) */}
                        {!(el.type === 'character' && el.characterData?.isSpriteSheet) && (
                          <>
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
                      </>
                    )}
                  </div>

                  {/* CAMERA TARGET BOX (BOX 2 / END BOX) */}
                  {el.type === 'camera' && el.hasCameraMotion && !isCameraActive && !isPlaying && (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        onSelectElement(el.id);
                        setSelectedCameraBox('target');
                      }}
                      onPointerDown={e => {
                        if (el.locked) {
                          e.stopPropagation();
                          return;
                        }
                        setSelectedCameraBox('target');
                        handleCameraTargetPointerDown(e, el);
                      }}
                      className={`absolute transition-shadow select-none ${
                        el.locked ? 'cursor-default pointer-events-none' : 'cursor-move touch-none'
                      }`}
                      style={{
                        left: `${el.cameraTargetX ?? Math.min(95, el.x + 6)}%`,
                        top: `${el.cameraTargetY ?? Math.min(95, el.y + 6)}%`,
                        width: `${el.cameraTargetWidth ?? el.width}%`,
                        height: `${el.cameraTargetHeight ?? el.height}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: el.zIndex + 1,
                        touchAction: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <div className="w-full h-full box-border border-2 border-emerald-500 pointer-events-none relative">
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] sm:text-[9px] font-bold flex items-center gap-1 shadow-xs tracking-wider">
                          <span>END (2)</span>
                          {(el.cameraTargetScaleX ?? (el.scaleX || 1)) === -1 && <span>• FLIPPED</span>}
                        </div>
                      </div>

                      {/* 4 CORNER RESIZE POINTERS FOR BOX 2 */}
                      {isSelected && !el.locked && (
                        <>
                          <div
                            onPointerDown={e => handleCameraTargetResizeHandlePointerDown(e, el, 'nw')}
                            className="absolute -top-3 -left-3 sm:-top-2 sm:-left-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-emerald-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                            style={{ touchAction: 'none' }}
                            title="Resize End Box 2 (Maintains 16:9)"
                          >
                            <div className="w-1.5 h-1.5 bg-emerald-600 rounded-xs pointer-events-none" />
                          </div>

                          <div
                            onPointerDown={e => handleCameraTargetResizeHandlePointerDown(e, el, 'ne')}
                            className="absolute -top-3 -right-3 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-emerald-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                            style={{ touchAction: 'none' }}
                            title="Resize End Box 2 (Maintains 16:9)"
                          >
                            <div className="w-1.5 h-1.5 bg-emerald-600 rounded-xs pointer-events-none" />
                          </div>

                          <div
                            onPointerDown={e => handleCameraTargetResizeHandlePointerDown(e, el, 'sw')}
                            className="absolute -bottom-3 -left-3 sm:-bottom-2 sm:-left-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-emerald-600 rounded-xs shadow-md cursor-nesw-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                            style={{ touchAction: 'none' }}
                            title="Resize End Box 2 (Maintains 16:9)"
                          >
                            <div className="w-1.5 h-1.5 bg-emerald-600 rounded-xs pointer-events-none" />
                          </div>

                          <div
                            onPointerDown={e => handleCameraTargetResizeHandlePointerDown(e, el, 'se')}
                            className="absolute -bottom-3 -right-3 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-emerald-600 rounded-xs shadow-md cursor-nwse-resize hover:scale-125 active:scale-125 transition-transform z-50 touch-none flex items-center justify-center"
                            style={{ touchAction: 'none' }}
                            title="Resize End Box 2 (Maintains 16:9)"
                          >
                            <div className="w-1.5 h-1.5 bg-emerald-600 rounded-xs pointer-events-none" />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            });
            })()}
            </div>
          </div>
        </div>

        {/* Top Canvas Setting Bar (Floating right below website header with 1 space gap) */}
        {selectedElement && !selectedElement.locked && !isPlaying ? (
          <div
            onPointerDown={e => e.stopPropagation()}
            className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-12px)] sm:max-w-fit px-2 py-1 sm:py-1 rounded-xl sm:rounded-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-xs text-white select-none pointer-events-auto touch-none"
            style={{ touchAction: 'none' }}
          >
            {/* Line 1 on Mobile: Movement & Size & Angles */}
            <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 flex-nowrap shrink-0 overflow-x-auto no-scrollbar max-w-full">
              {/* Directional Nudge Arrows (Rescue off-canvas elements easily) */}
              <div className="flex items-center space-x-0.5 bg-slate-800/90 rounded px-0.5 py-0.5 border border-slate-700/50 shrink-0">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      onUpdateElement(selectedElement.id, {
                        cameraTargetX: (selectedElement.cameraTargetX ?? selectedElement.x + 6) - 2,
                      });
                    } else {
                      onUpdateElement(selectedElement.id, { x: selectedElement.x - 2 });
                    }
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
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      onUpdateElement(selectedElement.id, {
                        cameraTargetY: (selectedElement.cameraTargetY ?? selectedElement.y + 6) - 2,
                      });
                    } else {
                      onUpdateElement(selectedElement.id, { y: selectedElement.y - 2 });
                    }
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
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      onUpdateElement(selectedElement.id, {
                        cameraTargetY: (selectedElement.cameraTargetY ?? selectedElement.y + 6) + 2,
                      });
                    } else {
                      onUpdateElement(selectedElement.id, { y: selectedElement.y + 2 });
                    }
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
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      onUpdateElement(selectedElement.id, {
                        cameraTargetX: (selectedElement.cameraTargetX ?? selectedElement.x + 6) + 2,
                      });
                    } else {
                      onUpdateElement(selectedElement.id, { x: selectedElement.x + 2 });
                    }
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
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      const curW = selectedElement.cameraTargetWidth ?? selectedElement.width;
                      const curH = selectedElement.cameraTargetHeight ?? selectedElement.height;
                      onUpdateElement(selectedElement.id, {
                        cameraTargetWidth: Math.max(2, Math.round(curW * 0.85)),
                        cameraTargetHeight: Math.max(2, Math.round(curH * 0.85)),
                      });
                    } else {
                      onUpdateElement(selectedElement.id, {
                        width: Math.max(2, Math.round(selectedElement.width * 0.85)),
                        height: Math.max(2, Math.round(selectedElement.height * 0.85)),
                      });
                    }
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-slate-800 rounded-full cursor-pointer text-slate-300 hover:text-white font-bold text-[9px] sm:text-xs"
                  title="Shrink Size (-)"
                >
                  -
                </button>

                <span className="font-mono text-[9px] sm:text-[11px] font-bold text-blue-400 min-w-[22px] sm:min-w-[30px] text-center">
                  {Math.round(
                    selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target'
                      ? (selectedElement.cameraTargetWidth ?? selectedElement.width)
                      : selectedElement.width
                  )}%
                </span>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      const curW = selectedElement.cameraTargetWidth ?? selectedElement.width;
                      const curH = selectedElement.cameraTargetHeight ?? selectedElement.height;
                      onUpdateElement(selectedElement.id, {
                        cameraTargetWidth: Math.max(2, Math.round(curW * 1.2)),
                        cameraTargetHeight: Math.max(2, Math.round(curH * 1.2)),
                      });
                    } else {
                      onUpdateElement(selectedElement.id, {
                        width: Math.max(2, Math.round(selectedElement.width * 1.2)),
                        height: Math.max(2, Math.round(selectedElement.height * 1.2)),
                      });
                    }
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-slate-800 rounded-full cursor-pointer text-slate-300 hover:text-white font-bold text-[9px] sm:text-xs"
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
                    if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                      onUpdateElement(selectedElement.id, {
                        cameraTargetWidth: selectedElement.width,
                        cameraTargetHeight: selectedElement.height,
                      });
                    } else {
                      onUpdateElement(selectedElement.id, { width: defaultW, height: defaultH });
                    }
                  }}
                  className="text-[8px] sm:text-[10px] text-slate-400 hover:text-white hover:underline cursor-pointer px-0.5 py-0.5"
                  title="Reset size to default"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Desktop divider between line 1 and line 2 */}
            <div className="hidden sm:block w-px h-3 bg-slate-700/80 mx-0.5 shrink-0" />

            {/* Line 2 on Mobile: Actions (Fit Screen, Center, Flip, Rotate, Hand Tool, Delete, Close) - Strictly fits on 1 line on mobile */}
            <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 flex-nowrap shrink-0 max-w-full">
              {/* Quick Fit to Screen Button (Icon only on mobile, text on PC) */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onUpdateElement(selectedElement.id, {
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    ...(selectedElement.type === 'image' ? { isBackground: true, fitMode: 'cover' } : {}),
                  });
                }}
                className="flex items-center space-x-1 p-1 sm:px-2 sm:py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer shrink-0 font-medium text-[9px] sm:text-[10px] shadow-xs"
                title="Fit element to 100% canvas screen (auto adjust)"
              >
                <Maximize className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Fit Screen</span>
              </button>

              {/* Quick Center Button */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion && selectedCameraBox === 'target') {
                    onUpdateElement(selectedElement.id, { cameraTargetX: 50, cameraTargetY: 50 });
                  } else {
                    onUpdateElement(selectedElement.id, { x: 50, y: 50 });
                  }
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
                  if (selectedElement.type === 'camera' && selectedElement.hasCameraMotion) {
                    if (selectedCameraBox === 'target') {
                      const isTargetFlipped = (selectedElement.cameraTargetScaleX ?? (selectedElement.scaleX || 1)) === -1;
                      onUpdateElement(selectedElement.id, {
                        cameraTargetScaleX: isTargetFlipped ? 1 : -1,
                      });
                    } else {
                      onUpdateElement(selectedElement.id, {
                        scaleX: (selectedElement.scaleX || 1) === 1 ? -1 : 1,
                      });
                    }
                  } else {
                    onUpdateElement(selectedElement.id, {
                      scaleX: (selectedElement.scaleX || 1) === 1 ? -1 : 1,
                    });
                  }
                }}
                className={`p-1 rounded cursor-pointer shrink-0 transition-colors ${
                  (selectedElement.type === 'camera' && selectedElement.hasCameraMotion
                    ? (selectedCameraBox === 'target'
                        ? (selectedElement.cameraTargetScaleX ?? (selectedElement.scaleX || 1)) === -1
                        : selectedElement.scaleX === -1)
                    : selectedElement.scaleX === -1)
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={
                  selectedElement.type === 'camera'
                    ? selectedElement.hasCameraMotion
                      ? selectedCameraBox === 'target'
                        ? 'Flip End Box 2 Horizontal (⇄)'
                        : 'Flip Start Box 1 Horizontal (⇄)'
                      : selectedElement.scaleX === -1
                      ? 'Camera Flipped Horizontal (⇄) - Click to restore'
                      : 'Flip Camera Horizontal (⇄)'
                    : selectedElement.scaleX === -1
                    ? 'Flipped Horizontal (⇄) - Click to restore'
                    : 'Flip Horizontal (⇄)'
                }
              >
                <FlipHorizontal className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>

              {/* Rotate 15° for standard elements, or Camera Motion icon for camera layer */}
              {selectedElement.type === 'camera' ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (selectedElement.hasCameraMotion) {
                      onUpdateElement(selectedElement.id, {
                        hasCameraMotion: false,
                      });
                      setSelectedCameraBox('start');
                    } else {
                      const offset = 6;
                      const targetW = selectedElement.width;
                      const targetH = selectedElement.height;
                      const halfW = targetW / 2;
                      const halfH = targetH / 2;
                      const targetX = Math.max(halfW, Math.min(100 - halfW, Math.round(selectedElement.x + offset)));
                      const targetY = Math.max(halfH, Math.min(100 - halfH, Math.round(selectedElement.y + offset)));

                      onUpdateElement(selectedElement.id, {
                        hasCameraMotion: true,
                        cameraTargetX: targetX,
                        cameraTargetY: targetY,
                        cameraTargetWidth: targetW,
                        cameraTargetHeight: targetH,
                        cameraTargetScaleX: selectedElement.scaleX || 1,
                        cameraMotion: 'linear',
                      });
                      setSelectedCameraBox('target');
                    }
                  }}
                  className={`p-1 rounded cursor-pointer shrink-0 transition-colors ${
                    selectedElement.hasCameraMotion
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={
                    selectedElement.hasCameraMotion
                      ? 'Camera Motion Active: 2 Boxes (Start ➔ End). Click to disable duplicate motion box'
                      : 'Camera Motion: Click to duplicate camera box (1 space offset) on canvas'
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="15"
                    viewBox="0 0 16 15"
                    fill="none"
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                  >
                    <circle
                      opacity="0.67"
                      cx="4.93334"
                      cy="9.0349"
                      r="4.58096"
                      fill="currentColor"
                      stroke="#E0E0E0"
                      strokeWidth="0.704763"
                    />
                    <circle
                      cx="7.60815"
                      cy="7.2517"
                      r="4.58096"
                      fill="currentColor"
                      stroke="#E0E0E0"
                      strokeWidth="0.704763"
                    />
                    <circle
                      cx="10.2234"
                      cy="5.64623"
                      r="4.58096"
                      fill="currentColor"
                      stroke="#E0E0E0"
                      strokeWidth="0.704763"
                    />
                  </svg>
                </button>
              ) : (
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
              )}

              <div className="w-px h-3 bg-slate-700/80 mx-0.5 shrink-0" />

              {/* Hand Tool (Pan Canvas) - Icon only */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setIsPanMode(!isPanMode);
                }}
                className={`p-1 rounded cursor-pointer shrink-0 transition-colors ${
                  isPanActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Hand Tool (Pan Canvas) - Hold Space or drag to move view"
              >
                <Hand className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>

              {/* Quick Delete Element Button (Icon only on mobile, text on PC) */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (selectedElement) {
                    onDeleteElement(selectedElement.id);
                  }
                }}
                className="flex items-center space-x-1 p-1 sm:px-2 sm:py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer shrink-0 font-medium text-[9px] sm:text-[10px] shadow-xs"
                title="Delete this selected layer"
              >
                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Delete</span>
              </button>

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
          </div>
        ) : null}
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

          {/* Duplicate Button: Duplicates selected layer (or layer under red line) and adds it at the red line position */}
          {(() => {
            const selectedEl = scene.elements.find(el => el.id === selectedElementId);
            const selectedAud = selectedAudioId ? scene.audioTracks?.find(at => at.id === selectedAudioId) : null;

            const elUnderPlayhead = !selectedEl && !selectedAud
              ? scene.elements.find(el => currentTime >= el.startTime && currentTime <= el.startTime + el.duration)
              : null;
            const audUnderPlayhead = !selectedEl && !selectedAud && !elUnderPlayhead
              ? scene.audioTracks?.find(at => currentTime >= at.startTime && currentTime <= at.startTime + at.duration)
              : null;

            const targetEl = selectedEl || elUnderPlayhead;
            const targetAud = selectedAud || audUnderPlayhead;
            const canDuplicate = Boolean(targetEl || targetAud);

            const handleDuplicate = () => {
              if (targetEl) {
                onDuplicateElement(targetEl.id, currentTime, targetEl.trackIndex);
              } else if (targetAud && onDuplicateAudioTrack) {
                onDuplicateAudioTrack(targetAud.id, currentTime, targetAud.trackIndex);
              }
            };

            const targetName = targetEl?.name || targetAud?.name;
            const title = canDuplicate
              ? `Duplicate "${targetName}" at red line (${currentTime.toFixed(2)}s)`
              : 'Select a layer to duplicate at red line';

            return (
              <button
                onClick={handleDuplicate}
                disabled={!canDuplicate}
                title={title}
                className={`flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 rounded transition-colors cursor-pointer ${
                  canDuplicate
                    ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 active:scale-95'
                    : 'text-slate-400 opacity-40 cursor-not-allowed'
                }`}
              >
                <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="text-[11px] hidden xl:inline">Duplicate</span>
              </button>
            );
          })()}

          <button
            onClick={() => onSplitAtPlayhead?.(isSelectedElementActive ? selectedElementId || undefined : undefined, currentTime)}
            title={`Split layer at red playhead line (${currentTime.toFixed(1)}s)`}
            className="flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer active:scale-95"
          >
            <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
            <span className="text-[11px] hidden xl:inline font-medium">Split</span>
          </button>

          {/* Properties Button */}
          <button
            onClick={() => onOpenProperties?.()}
            title="Open Properties Panel"
            className={`flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 rounded transition-colors cursor-pointer ${
              isPropertiesOpen
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : isSelectedElementActive
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[11px] hidden xl:inline font-medium">Properties</span>
          </button>

          {/* Camera Layer Button: Adds a 16:9 Camera Layer to Timeline */}
          <button
            onClick={() => onAddCameraLayer?.()}
            title="Add 16:9 Camera Layer to Timeline (Splittable, 4 Corner Resize)"
            className={`flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 rounded transition-all cursor-pointer ${
              selectedElement?.type === 'camera' || scene.elements.some(e => e.type === 'camera')
                ? 'bg-red-50 text-red-600 font-semibold border border-red-200 hover:bg-red-100'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
            <span className="text-[11px] hidden xl:inline">Camera</span>
            {scene.elements.some(e => e.type === 'camera') && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 hidden xl:inline" />
            )}
          </button>

          {/* Camera View / Preview Mode Toggle (Allows framing preview even when paused) */}
          {hasCameraLayer && (
            <button
              onClick={() => setIsPreviewCameraMode(!isPreviewCameraMode)}
              title={
                isPreviewCameraMode
                  ? "Exit Camera Framing Preview (Show Full Canvas)"
                  : "Preview Camera Box Framing (Zoom & Screen-Fit)"
              }
              className={`flex items-center space-x-1 p-0.5 sm:p-1 md:p-1.5 rounded transition-all cursor-pointer ${
                isPreviewCameraMode
                  ? 'bg-red-600 text-white font-semibold shadow-xs'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 font-semibold border border-red-200'
              }`}
            >
              {isPreviewCameraMode ? (
                <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
              )}
              <span className="text-[11px] hidden xl:inline">
                {isPreviewCameraMode ? 'Framed' : 'Preview'}
              </span>
            </button>
          )}
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
