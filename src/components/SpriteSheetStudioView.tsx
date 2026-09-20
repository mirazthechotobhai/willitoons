import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Play,
  Pause,
  Sparkles,
  Eye,
  EyeOff,
  Grid,
  Info,
  BookmarkPlus,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
} from "lucide-react";
import { SpriteSheetState, BackgroundMode, SavedAnimation, CharacterModel } from "../types";
import { RunnerIcon } from "./RunnerIcon";
import { SavedAnimationsModal } from "./SavedAnimationsModal";
import {
  subscribeToSavedAnimations,
  saveAnimation,
  deleteSavedAnimation
} from "../firebase";

interface SpriteSheetStudioViewProps {
  characters?: CharacterModel[];
  onImportAnimationAsCharacter?: (anim: SavedAnimation) => void;
  onRemoveAnimationFromCharacterList?: (anim: SavedAnimation) => void;
  onOpenMainCharacterList?: () => void;
}

export const SpriteSheetStudioView: React.FC<SpriteSheetStudioViewProps> = ({
  characters,
  onImportAnimationAsCharacter,
  onRemoveAnimationFromCharacterList,
  onOpenMainCharacterList,
}) => {
  const [state, setState] = useState<SpriteSheetState>({
    imageUrl: "/character1-run.png",
    fileName: "character1-run.png",
    frameCount: 4,
    rowCount: 1,
    activeRow: 0,
    duration: 0.8,
    isPlaying: true,
    naturalWidth: 1600,
    naturalHeight: 600,
    currentStep: 0,
    background: "checker-dark",
    scale: 1,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showRawStrip, setShowRawStrip] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Movable animation box position state (can be freely dragged anywhere)
  const [boxPosition, setBoxPosition] = useState({ x: 0, y: 0 });
  const [isMovingBox, setIsMovingBox] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  // Saved animations from Firebase
  const [savedAnimations, setSavedAnimations] = useState<SavedAnimation[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Container ref to track size accurately for 100% full-screen fit across all devices
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic viewport tracking for 100% distortion-free responsive sizing
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to saved animations from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToSavedAnimations((items) => {
      setSavedAnimations(items);
    });
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Listen to container resize / window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setScreenSize({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || window.innerHeight,
        });
      } else {
        setScreenSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Inspect the natural dimensions of the initial image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1600;
      const h = img.naturalHeight || 600;
      let detected = 4;
      if (w > h && w % h === 0) {
        const exact = w / h;
        if (exact >= 2 && exact <= 120) {
          detected = exact;
        }
      } else {
        const frameMatch = state.fileName.match(/(\d+)\s*(?:frames?|fps|steps)/i);
        if (frameMatch) {
          detected = parseInt(frameMatch[1], 10);
        } else {
          detected = 4;
        }
      }
      setState((prev) => ({
        ...prev,
        naturalWidth: w,
        naturalHeight: h,
        frameCount: prev.frameCount || detected,
      }));
    };
    img.src = state.imageUrl;
  }, []);

  // Keyboard shortcuts (Space = Play/Pause, H = Toggle Controls)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
      } else if (e.key.toLowerCase() === "h") {
        setShowControls((prev) => !prev);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          scale: Math.min(4.0, parseFloat(((prev.scale || 1) + 0.1).toFixed(2))),
        }));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          scale: Math.max(0.2, parseFloat(((prev.scale || 1) - 0.1).toFixed(2))),
        }));
      } else if (e.key === "0") {
        e.preventDefault();
        setState((prev) => ({ ...prev, scale: 1 }));
        setBoxPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Process uploaded image file
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatusMessage("Please upload a valid PNG or image file.");
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Auto-detect frame count:
        let detectedFrames = 4;
        if (w > h && w % h === 0) {
          const exact = w / h;
          if (exact >= 2 && exact <= 120) {
            detectedFrames = exact;
          }
        } else {
          const frameMatch = file.name.match(/(\d+)\s*(?:frames?|fps|steps)/i);
          if (frameMatch) {
            detectedFrames = parseInt(frameMatch[1], 10);
          } else {
            detectedFrames = state.frameCount || 4;
          }
        }

        setState((prev) => ({
          ...prev,
          imageUrl: dataUrl,
          fileName: file.name,
          naturalWidth: w,
          naturalHeight: h,
          frameCount: detectedFrames,
          rowCount: 1,
          activeRow: 0,
          isPlaying: true,
          currentStep: 0,
        }));

        const singleW = Math.round(w / detectedFrames);
        setStatusMessage(
          `Loaded "${file.name}" • ${singleW}×${h}px per frame • steps(${detectedFrames})`
        );
        setTimeout(() => setStatusMessage(null), 4000);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Movable animation box pointer drag handlers
  const handleBoxPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag on primary pointer click (left mouse button or single touch)
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: boxPosition.x,
      initY: boxPosition.y,
    };
    setIsMovingBox(true);
  };

  const handleBoxPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMovingBox || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setBoxPosition({
      x: Math.round(dragStartRef.current.initX + dx),
      y: Math.round(dragStartRef.current.initY + dy),
    });
  };

  const handleBoxPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMovingBox) {
      setIsMovingBox(false);
      dragStartRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleBoxPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMovingBox) {
      setIsMovingBox(false);
      dragStartRef.current = null;
    }
  };

  // =========================================================================
  // MATHEMATICAL ASPECT-RATIO LOCK (PREVENTS ANY THIN, FAT, OR TALL SQUEEZING)
  // =========================================================================
  // 1. Single frame natural dimensions
  const singleFrameWidth = Math.max(1, state.naturalWidth / state.frameCount);
  const singleFrameHeight = Math.max(1, state.naturalHeight);
  const originalFrameRatio = singleFrameWidth / singleFrameHeight;

  // 2. Available safe screen space (leaving comfortable room for floating dock)
  const isMobile = screenSize.width < 640;
  const paddingX = isMobile ? 24 : 48;
  const paddingY = isMobile ? 140 : 130;

  const availableWidth = Math.max(120, screenSize.width - paddingX);
  const availableHeight = Math.max(120, screenSize.height - paddingY);
  const availableRatio = availableWidth / availableHeight;

  // 3. Exact display width and height strictly adhering to originalFrameRatio
  let displayWidth: number;
  let displayHeight: number;

  if (availableRatio > originalFrameRatio) {
    // Screen is wider than the character: height is the limiting constraint
    displayHeight = availableHeight * state.scale;
    displayWidth = displayHeight * originalFrameRatio;
  } else {
    // Screen is narrower than the character: width is the limiting constraint
    displayWidth = availableWidth * state.scale;
    displayHeight = displayWidth / originalFrameRatio;
  }

  // Round dimensions to clean integers
  const roundedDisplayWidth = Math.round(displayWidth);
  const roundedDisplayHeight = Math.round(displayHeight);

  // Background style helper
  const getBackgroundClass = (bg: BackgroundMode) => {
    switch (bg) {
      case "checker-dark":
        return "bg-checker-dark";
      case "checker-light":
        return "bg-checker-light";
      case "black":
        return "bg-black";
      case "slate":
        return "bg-neutral-900";
      default:
        return "bg-checker-dark";
    }
  };

  // Handlers for Firebase Save & Load
  const handleSaveToFirebase = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await saveAnimation({
        imageUrl: state.imageUrl,
        fileName: state.fileName,
        frameCount: state.frameCount,
        rowCount: 1,
        activeRow: 0,
        duration: state.duration,
        naturalWidth: state.naturalWidth,
        naturalHeight: state.naturalHeight,
      });

      // Instantly update the local saved list for zero latency
      setSavedAnimations((prev) => {
        const filtered = prev.filter((a) => a.id !== saved.id);
        const next = [...filtered, saved].sort((a, b) => a.serialNumber - b.serialNumber);
        return next;
      });

      setStatusMessage(`Animation ${saved.serialNumber} saved to Firebase!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Save error:", err);
      setStatusMessage("Failed to save animation.");
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSavedAnimation = (anim: SavedAnimation) => {
    setState((prev) => ({
      ...prev,
      imageUrl: anim.imageUrl,
      fileName: anim.fileName,
      frameCount: anim.frameCount,
      rowCount: 1,
      activeRow: 0,
      duration: anim.duration,
      naturalWidth: anim.naturalWidth,
      naturalHeight: anim.naturalHeight,
      isPlaying: true,
      currentStep: 0,
    }));
    setStatusMessage(`Loaded Animation ${anim.serialNumber}`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleDeleteSavedAnimation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedAnimation(id);
      setStatusMessage("Animation deleted from Firebase.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-300 flex items-center justify-center ${getBackgroundClass(
        state.background
      )}`}
    >
      {/* Top Left Runner Icon (User's Icon) -> Opens Saved Animations List */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsSavedModalOpen(true)}
          title="Saved Animations List"
          className="relative p-2 rounded-xl bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 backdrop-blur-md transition shadow-lg flex items-center gap-2 group active:scale-95 cursor-pointer"
        >
          <RunnerIcon className="w-6 h-6 drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]" />
          {savedAnimations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-mono font-bold leading-none">
              {savedAnimations.length}
            </span>
          )}
        </button>
      </div>

      {/* Hidden File Input for Native File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/gif,image/jpeg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Fullscreen Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-rose-950/75 backdrop-blur-md border-4 border-dashed border-rose-400 flex flex-col items-center justify-center p-8 pointer-events-none animate-pulse">
          <Upload className="w-16 h-16 text-rose-300 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider text-center">
            Drop Sprite Sheet PNG Here
          </h2>
          <p className="text-sm text-rose-200 mt-2 font-mono text-center">
            Automatic frame calculation & instant animation
          </p>
        </div>
      )}

      {/* Floating Toast Notification */}
      {statusMessage && (
        <div className="absolute top-4 z-40 px-4 py-2 rounded-xl bg-neutral-900/90 text-neutral-100 text-xs font-mono border border-neutral-700 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-fade-in max-w-[90vw] truncate">
          <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* Top Action Icons (Zoom Controls, Show/Hide Controls) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-black/60 border border-white/10 backdrop-blur-md rounded-xl p-1 shadow-lg text-neutral-300">
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                scale: Math.max(0.2, parseFloat(((prev.scale || 1) - 0.15).toFixed(2))),
              }))
            }
            title="Zoom Out (- or wheel down)"
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, scale: 1 }))}
            title="Click to reset zoom to 100% (0)"
            className="px-2 py-1 rounded-lg text-xs font-mono font-bold hover:bg-white/10 hover:text-white transition cursor-pointer text-amber-300"
          >
            {Math.round((state.scale || 1) * 100)}%
          </button>
          <button
            onClick={() =>
              setState((prev) => ({
                ...prev,
                scale: Math.min(4.0, parseFloat(((prev.scale || 1) + 0.15).toFixed(2))),
              }))
            }
            title="Zoom In (+ or wheel up)"
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {((state.scale || 1) !== 1 || boxPosition.x !== 0 || boxPosition.y !== 0) && (
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, scale: 1 }));
                setBoxPosition({ x: 0, y: 0 });
              }}
              title="Reset Position & Zoom to 100% (0)"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer ml-0.5 border-l border-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowControls((prev) => !prev)}
          title={showControls ? "Hide Controls (H)" : "Show Controls (H)"}
          className="p-2.5 rounded-xl bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white border border-white/10 backdrop-blur-md transition shadow-lg cursor-pointer"
        >
          {showControls ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4 text-rose-400" />
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* CENTER STAGE: THE LIVE ANIMATED SPRITE IN ORIGINAL NATURAL RATIO */}
      {/* =================================================================== */}
      <div
        className="relative flex items-center justify-center max-w-full max-h-full select-none"
        onWheel={(e) => {
          // Allow mouse wheel zoom over the preview canvas
          const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
          setState((prev) => ({
            ...prev,
            scale: Math.min(
              4.0,
              Math.max(0.2, parseFloat(((prev.scale || 1) + zoomDelta).toFixed(2)))
            ),
          }));
        }}
      >
        {/* Viewport Frame with mathematically locked 1-frame dimensions - Draggable anywhere */}
        <div
          onPointerDown={handleBoxPointerDown}
          onPointerMove={handleBoxPointerMove}
          onPointerUp={handleBoxPointerUp}
          onPointerCancel={handleBoxPointerCancel}
          onDoubleClick={() => setBoxPosition({ x: 0, y: 0 })}
          style={{
            width: `${roundedDisplayWidth}px`,
            height: `${roundedDisplayHeight}px`,
            transform: `translate3d(${boxPosition.x}px, ${boxPosition.y}px, 0)`,
            touchAction: "none",
          }}
          className={`relative overflow-hidden rounded-2xl border shadow-2xl flex items-center justify-start group select-none ${
            isMovingBox
              ? "cursor-grabbing border-rose-500/70 shadow-rose-950/50 ring-2 ring-rose-500/30"
              : "cursor-grab border-white/10 hover:border-white/30 active:cursor-grabbing transition-[border-color,box-shadow]"
          }`}
          title="Click & drag inside the box to move it anywhere • Double-click to reset position"
        >
          {/* Classic 1-Line Sprite Running Strip */}
          <div
            className="h-full flex items-center shrink-0 pointer-events-none"
            style={{
              width: `${state.frameCount * 100}%`,
              height: "100%",
              animationName: "run",
              animationDuration: `${state.duration}s`,
              animationTimingFunction: `steps(${state.frameCount})`,
              animationIterationCount: "infinite",
              animationPlayState: state.isPlaying ? "running" : "paused",
              willChange: "transform",
            }}
          >
            {state.imageUrl ? (
              <img
                src={state.imageUrl}
                alt={state.fileName}
                className="w-full h-full object-fill pointer-events-none select-none"
                style={{
                  imageRendering:
                    state.naturalHeight <= 64 ? "pixelated" : "auto",
                }}
              />
            ) : null}
          </div>

          {/* Hover Frame Dimension Specs Badge & Drag Hint */}
          <div className="absolute top-2 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
            <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-[10px] font-mono text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Move className="w-2.5 h-2.5 text-rose-400" />
              <span>Drag to move</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-[10px] font-mono text-neutral-300 border border-white/10">
              {Math.round(singleFrameWidth)}×{Math.round(singleFrameHeight)}px (
              {originalFrameRatio >= 1
                ? `${originalFrameRatio.toFixed(2)}:1`
                : `1:${(1 / originalFrameRatio).toFixed(2)}`}
              )
            </span>
          </div>

          {/* Subtle Move handle icon in bottom-right corner on hover */}
          <div className="absolute bottom-2 right-2 pointer-events-none opacity-0 group-hover:opacity-75 transition-opacity z-10">
            <span className="p-1 rounded-md bg-black/80 backdrop-blur-sm text-neutral-400 border border-white/10 flex items-center justify-center">
              <Move className="w-3 h-3 text-rose-400/80" />
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RESPONSIVE FLOATING CONTROLS DOCK (NO HEADER, NO FOOTER) */}
      {/* =================================================================== */}
      {showControls && (
        <div className="absolute bottom-3 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex flex-col items-center gap-2 max-w-xl w-full">
          {/* Main Floating Glass Dock */}
          <div className="w-full bg-neutral-900/95 border border-neutral-800/90 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl transition flex flex-col items-center gap-2.5">
            
            {/* ROW 1: ACTION BUTTONS (Always in the top line, centered) */}
            <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2">
              {/* Upload PNG */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
                title="Upload Sprite Sheet PNG"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PNG</span>
              </button>

              {/* Play / Pause Toggle */}
              <button
                onClick={() =>
                  setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
                }
                title={state.isPlaying ? "Pause (Space)" : "Play (Space)"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/60 text-xs font-semibold transition active:scale-95 shrink-0"
              >
                {state.isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-rose-400" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Save to Firebase */}
              <button
                onClick={handleSaveToFirebase}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0 disabled:opacity-60"
                title="Save Animation to Firebase (1, 2, 3...)"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>

              {/* Background Theme Toggle */}
              <button
                onClick={() =>
                  setState((prev) => {
                    const modes: BackgroundMode[] = [
                      "checker-dark",
                      "black",
                      "slate",
                      "checker-light",
                    ];
                    const nextIndex =
                      (modes.indexOf(prev.background) + 1) % modes.length;
                    return { ...prev, background: modes[nextIndex] };
                  })
                }
                title="Toggle Background Theme"
                className="p-1.5 sm:p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition shrink-0"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              {/* View Raw Strip Info */}
              <button
                onClick={() => setShowRawStrip((prev) => !prev)}
                title="View Spritesheet Information"
                className={`p-1.5 sm:p-2 rounded-xl border transition shrink-0 ${
                  showRawStrip
                    ? "bg-rose-600 text-white border-rose-500"
                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ROW 2: STEPS, LINES & SPEED CONTROLS */}
            {/* Desktop: side-by-side • Mobile: stacked centered */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-center flex-wrap gap-2 pt-2 border-t border-neutral-800/80">
              
              {/* Frame Steps Presets & Direct Input */}
              <div className="flex items-center justify-center gap-1 bg-neutral-950/70 border border-neutral-800 rounded-xl px-2.5 py-1 shrink-0">
                <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400">
                  Steps:
                </span>
                <div className="flex items-center gap-0.5">
                  {[4, 8, 12, 16, 24, 28].map((count) => (
                    <button
                      key={count}
                      onClick={() =>
                        setState((prev) => ({ ...prev, frameCount: count }))
                      }
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono transition cursor-pointer ${
                        state.frameCount === count
                          ? "bg-rose-600 text-white font-bold"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                {/* Custom Number Input */}
                <div className="flex items-center pl-1 border-l border-neutral-800">
                  <input
                    type="number"
                    min="1"
                    max="128"
                    value={state.frameCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        setState((prev) => ({ ...prev, frameCount: val }));
                      }
                    }}
                    className="w-9 bg-transparent text-center font-mono text-xs font-bold text-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-500 rounded"
                    title="Enter exact frame count (columns)"
                  />
                </div>
              </div>

              {/* Speed / Duration Presets */}
              <div className="flex items-center justify-center gap-1 bg-neutral-950/70 border border-neutral-800 rounded-xl px-2.5 py-1 shrink-0">
                <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400">
                  Speed:
                </span>
                <div className="flex items-center gap-0.5">
                  {[0.5, 0.8, 1, 1.5, 2].map((dur) => (
                    <button
                      key={dur}
                      onClick={() =>
                        setState((prev) => ({ ...prev, duration: dur }))
                      }
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono transition cursor-pointer ${
                        state.duration === dur
                          ? "bg-rose-600 text-white font-bold"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Raw Sprite Sheet Strip Inspector Tray */}
      {showRawStrip && (
        <div className="absolute top-16 inset-x-4 sm:inset-x-12 z-40 bg-neutral-900/95 border border-neutral-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-2 max-h-[45vh] overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span className="truncate">
              File: {state.fileName} ({state.naturalWidth}×{state.naturalHeight}px)
            </span>
            <button
              onClick={() => setShowRawStrip(false)}
              className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white shrink-0 ml-2 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto p-2 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-start">
            {state.imageUrl ? (
              <img
                src={state.imageUrl}
                alt="Raw Sprite Strip"
                className="h-24 sm:h-28 object-contain rounded border border-neutral-700/50"
                style={{ imageRendering: "pixelated" }}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-400 font-mono gap-2">
            <span>
              Frame dimensions: {Math.round(singleFrameWidth)}×
              {Math.round(singleFrameHeight)}px (Ratio:{" "}
              {originalFrameRatio.toFixed(3)})
            </span>
            <span>
              Steps: {state.frameCount} frames
            </span>
          </div>
        </div>
      )}

      {/* Saved Animations List Modal */}
      <SavedAnimationsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        animations={savedAnimations}
        onSelectAnimation={handleSelectSavedAnimation}
        onDeleteAnimation={handleDeleteSavedAnimation}
        characters={characters}
        onImportAnimationAsCharacter={onImportAnimationAsCharacter}
        onRemoveAnimationFromCharacterList={onRemoveAnimationFromCharacterList}
        onOpenMainCharacterList={onOpenMainCharacterList}
        selectedId={
          savedAnimations.find(
            (a) =>
              a.imageUrl === state.imageUrl &&
              a.frameCount === state.frameCount &&
              a.duration === state.duration
          )?.id
        }
      />
    </div>
  );
};
