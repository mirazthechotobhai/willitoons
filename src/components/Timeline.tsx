import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Scene, StageElement, AudioTrackItem } from '../types';
import {
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X,
  Volume2,
  VolumeX,
  Trash2,
  Music,
  User,
  Type,
  ImageIcon,
  Sparkles,
  Scissors,
  Copy,
  Camera,
  CheckSquare,
  Play,
  Pause,
  SkipBack,
  RotateCcw,
  Film,
  Hand,
  Search,
  Undo2,
  Redo2,
  Layers,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Edit2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sliders,
} from 'lucide-react';
import { STOCK_BACKGROUNDS, STOCK_AUDIO } from '../utils/mediaStock';
import { DEFAULT_CHARACTERS } from '../utils/characterPresets';
import { getLocalBackgrounds } from '../services/backgroundService';

// Distinct color theme per scene to visually distinguish them without needing text/numbers
const SCENE_PALETTE = [
  {
    active: 'bg-amber-500/25 border-amber-400 text-amber-300 ring-1 ring-amber-400/50 shadow-sm',
    inactive: 'bg-amber-950/40 border-amber-700/60 text-amber-400 hover:border-amber-500 hover:bg-amber-900/50',
    dot: 'bg-amber-400',
  },
  {
    active: 'bg-cyan-500/25 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/50 shadow-sm',
    inactive: 'bg-cyan-950/40 border-cyan-700/60 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/50',
    dot: 'bg-cyan-400',
  },
  {
    active: 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50 shadow-sm',
    inactive: 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-900/50',
    dot: 'bg-emerald-400',
  },
  {
    active: 'bg-purple-500/25 border-purple-400 text-purple-300 ring-1 ring-purple-400/50 shadow-sm',
    inactive: 'bg-purple-950/40 border-purple-700/60 text-purple-400 hover:border-purple-500 hover:bg-purple-900/50',
    dot: 'bg-purple-400',
  },
  {
    active: 'bg-rose-500/25 border-rose-400 text-rose-300 ring-1 ring-rose-400/50 shadow-sm',
    inactive: 'bg-rose-950/40 border-rose-700/60 text-rose-400 hover:border-rose-500 hover:bg-rose-900/50',
    dot: 'bg-rose-400',
  },
  {
    active: 'bg-blue-500/25 border-blue-400 text-blue-300 ring-1 ring-blue-400/50 shadow-sm',
    inactive: 'bg-blue-950/40 border-blue-700/60 text-blue-400 hover:border-blue-500 hover:bg-blue-900/50',
    dot: 'bg-blue-400',
  },
  {
    active: 'bg-orange-500/25 border-orange-400 text-orange-300 ring-1 ring-orange-400/50 shadow-sm',
    inactive: 'bg-orange-950/40 border-orange-700/60 text-orange-400 hover:border-orange-500 hover:bg-orange-900/50',
    dot: 'bg-orange-400',
  },
  {
    active: 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-300 ring-1 ring-fuchsia-400/50 shadow-sm',
    inactive: 'bg-fuchsia-950/40 border-fuchsia-700/60 text-fuchsia-400 hover:border-fuchsia-500 hover:bg-fuchsia-900/50',
    dot: 'bg-fuchsia-400',
  },
];

interface TimelineProps {
  scenes: Scene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onAddScene: () => void;
  onDeleteScene: (index: number) => void;
  onUpdateScene?: (index: number, updates: Partial<Scene>) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  selectedAudioId?: string | null;
  onSelectAudio?: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<StageElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement?: (id: string, atStartTime?: number, targetTrackIndex?: number) => void;
  onUpdateAudioTrack: (id: string, updates: Partial<AudioTrackItem>) => void;
  onDeleteAudioTrack: (id: string) => void;
  onDuplicateAudioTrack?: (id: string, atStartTime?: number, targetTrackIndex?: number) => void;
  onAddElement?: (element: StageElement) => void;
  onAddAudioTrack?: (track: AudioTrackItem) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  zoomScale?: number;
  onChangeZoomScale?: (zoom: number) => void;
  timelineZoom?: number;
  onChangeTimelineZoom?: (zoom: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onSplitAtPlayhead?: (elementId?: string, atTime?: number) => void;
  onOpenProperties?: () => void;
  isPropertiesOpen?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onUpdateScene,
  currentTime,
  onSeek,
  selectedElementId,
  onSelectElement,
  selectedAudioId,
  onSelectAudio,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onUpdateAudioTrack,
  onDeleteAudioTrack,
  onDuplicateAudioTrack,
  onAddElement,
  onAddAudioTrack,
  isPlaying = false,
  onTogglePlay,
  zoomScale = 1,
  onChangeZoomScale,
  timelineZoom: externalTimelineZoom,
  onChangeTimelineZoom,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onInteractionStart,
  onInteractionEnd,
  onSplitAtPlayhead,
  onOpenProperties,
  isPropertiesOpen,
}) => {
  // Maximum duration limit per scene is 2 minutes (120 seconds)
  const MAX_SCENE_DURATION = 120;

  const currentScene = scenes[activeSceneIndex] || scenes[0];
  const sceneDuration = Math.min(MAX_SCENE_DURATION, currentScene?.duration || 10);

  // Calculate maximum end time across all visual elements and audio tracks, capped at 120s
  const maxLayerEndTime = Math.min(
    MAX_SCENE_DURATION,
    Math.max(
      sceneDuration,
      ...(currentScene?.elements || []).map(el => (el.startTime || 0) + (el.duration || 0)),
      ...(currentScene?.audioTracks || []).map(at => (at.startTime || 0) + (at.duration || 0))
    )
  );

  // Effective duration capped at 120s (2 minutes). If more time is needed, user adds a new scene.
  const duration = Math.min(MAX_SCENE_DURATION, Math.max(sceneDuration, Math.ceil(maxLayerEndTime)));

  const [internalTimelineZoom, setInternalTimelineZoom] = useState<number>(1);
  const timelineZoom = externalTimelineZoom ?? internalTimelineZoom;
  const setTimelineZoom = onChangeTimelineZoom ?? setInternalTimelineZoom;

  const rulerRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const [isTimelinePanMode, setIsTimelinePanMode] = useState(false);
  const [isTimelinePanning, setIsTimelinePanning] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLayerHeadersVisible, setIsLayerHeadersVisible] = useState(true);
  const [isTimelineLocked, setIsTimelineLocked] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeMenuTrackIndex, setActiveMenuTrackIndex] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [draggingFeedback, setDraggingFeedback] = useState<{
    id: string;
    name?: string;
    kind?: 'element' | 'audio';
    mode: 'move' | 'trim-start' | 'trim-end';
    startTime: number;
    duration: number;
    dragOffsetY?: number;
    targetTrackIdx?: number;
    isNewTrackAbove?: boolean;
    isNewTrackBelow?: boolean;
    originTrackIdx?: number;
    isHeadToHeadSnapped?: boolean;
  } | null>(null);

  // Active magnetic snap point (when playhead or clip trimming magnetically catches a layer edge)
  const [activeSnapTime, setActiveSnapTime] = useState<number | null>(null);

  // Collect all magnetic snap points across all layers in the current scene (start and end times)
  const snapPoints = useMemo(() => {
    const points = new Set<number>();
    points.add(0);
    currentScene.elements.forEach(el => {
      points.add(Math.round(el.startTime * 1000) / 1000);
      points.add(Math.round((el.startTime + el.duration) * 1000) / 1000);
    });
    (currentScene.audioTracks || []).forEach(at => {
      points.add(Math.round(at.startTime * 1000) / 1000);
      points.add(Math.round((at.startTime + at.duration) * 1000) / 1000);
    });
    return Array.from(points).sort((a, b) => a - b);
  }, [currentScene.elements, currentScene.audioTracks]);

  // Check if playhead is magnetically aligned to a layer boundary (from dragging or resting on boundary)
  const alignedSnapPoint = useMemo(() => {
    if (activeSnapTime !== null) return activeSnapTime;
    // Check if currentTime is sitting within 0.035s of any layer boundary
    const match = snapPoints.find(pt => Math.abs(currentTime - pt) <= 0.035);
    return match !== undefined ? match : null;
  }, [activeSnapTime, currentTime, snapPoints]);

  // Helper to find closest snap point within threshold (pixels converted to seconds)
  const getSnapTime = (rawTime: number, thresholdPx = 14): { snappedTime: number; isSnapped: boolean } => {
    if (!rulerRef.current || duration <= 0) return { snappedTime: rawTime, isSnapped: false };
    const rect = rulerRef.current.getBoundingClientRect();
    const pxPerSec = (rect.width || 1) / (duration || 1);
    const thresholdSec = Math.max(0.08, thresholdPx / pxPerSec);

    let closestPoint: number | null = null;
    let minDiff = Infinity;

    for (const pt of snapPoints) {
      const diff = Math.abs(rawTime - pt);
      if (diff <= thresholdSec && diff < minDiff) {
        minDiff = diff;
        closestPoint = pt;
      }
    }

    if (closestPoint !== null) {
      return { snappedTime: closestPoint, isSnapped: true };
    }
    return { snappedTime: rawTime, isSnapped: false };
  };

  // Format timecode (e.g. 00:00)
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic tick generator for Timeline Zoom (ranging down to 1% / 0.01)
  const getTimelineTicks = () => {
    let subStep = 1;
    let majorStep = 1;
    if (timelineZoom <= 0.02) {
      // 1% - 2% zoom: show minute marks
      majorStep = 60; // every 1 min (00:00, 01:00, 02:00)
      subStep = 30;   // every 30 sec
    } else if (timelineZoom <= 0.04) {
      // 3% - 4% zoom: show 30s marks
      majorStep = 30;
      subStep = 15;
    } else if (timelineZoom <= 0.08) {
      majorStep = duration > 60 ? 30 : duration > 20 ? 10 : 5;
      subStep = majorStep / 2;
    } else if (timelineZoom <= 0.18) {
      majorStep = duration > 40 ? 15 : 5;
      subStep = majorStep / 2;
    } else if (timelineZoom <= 0.35) {
      majorStep = 5;
      subStep = 2.5;
    } else if (timelineZoom <= 0.6) {
      majorStep = 2;
      subStep = 2;
    } else if (timelineZoom >= 3.5) {
      majorStep = 1;
      subStep = 0.25;
    } else if (timelineZoom >= 1.75) {
      majorStep = 1;
      subStep = 0.5;
    } else {
      majorStep = 1;
      subStep = 1;
    }

    const ticks: { time: number; isMajor: boolean; label?: string }[] = [];
    const totalSteps = Math.ceil(duration / subStep);
    for (let i = 0; i <= totalSteps; i++) {
      const time = Math.round(i * subStep * 100) / 100;
      if (time > duration) break;
      const isMajor = Math.abs(time % majorStep) < 0.001 || Math.abs((time % majorStep) - majorStep) < 0.001;
      let label = undefined;
      if (isMajor) {
        label = formatTimecode(time);
      } else if (timelineZoom >= 3.5 && Math.abs((time % 1) - 0.5) < 0.01) {
        label = `${time.toFixed(1)}s`;
      }
      ticks.push({ time, isMajor, label });
    }
    return ticks;
  };

  const timelineTicks = getTimelineTicks();

  // Dynamic pixel width calculation for timeline content:
  // Base 75px per second at 1x zoom (100%).
  // Scales down to 1% (0.01x) and up to 5x.
  // When zoomed out, tracks shrink neatly to the left without forcing 100% container width,
  // leaving the right area open and clean as requested by the user.
  const basePixelsPerSec = 75;
  const headerOffsetPx = isLayerHeadersVisible ? 176 : 0;
  const minTrackWidthPx = Math.max(50, Math.round(duration * basePixelsPerSec * timelineZoom));
  const totalTimelineWidthPx = minTrackWidthPx + headerOffsetPx;

  // Close menus on click / tap outside, or on window resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.timeline-menu-container')) {
        setActiveMenuId(null);
        setActiveMenuTrackIndex(null);
      }
    };
    const handleResize = () => {
      setActiveMenuId(null);
      setActiveMenuTrackIndex(null);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Ensure 3-dots layer context menu NEVER overflows outside the viewport (bottom, top, right, left)
  useEffect(() => {
    if (!activeMenuId || !layerMenuRef.current || !menuPosition) return;
    const el = layerMenuRef.current;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const margin = 8;

    let adjustedTop = menuPosition.top;
    let adjustedLeft = menuPosition.left;
    let needsAdjustment = false;

    // If bottom extends below viewport, shift up so all items (Send to back, delete, etc.) are visible
    if (rect.bottom > vh - margin) {
      adjustedTop = Math.max(margin, vh - rect.height - margin);
      needsAdjustment = true;
    }
    // If top extends above top margin
    if (adjustedTop < margin) {
      adjustedTop = margin;
      needsAdjustment = true;
    }
    // If right extends past right margin
    if (rect.right > vw - margin) {
      adjustedLeft = Math.max(margin, vw - rect.width - margin);
      needsAdjustment = true;
    }
    // If left extends past left margin
    if (adjustedLeft < margin) {
      adjustedLeft = margin;
      needsAdjustment = true;
    }

    if (needsAdjustment && (adjustedTop !== menuPosition.top || adjustedLeft !== menuPosition.left)) {
      setMenuPosition({ top: Math.round(adjustedTop), left: Math.round(adjustedLeft) });
    }
  }, [activeMenuId, menuPosition]);

  // Auto-scroll timeline to follow playhead when zoomed
  useEffect(() => {
    if (!isPlaying || !timelineScrollRef.current) return;
    const scrollContainer = timelineScrollRef.current;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.clientWidth;
    if (scrollWidth <= clientWidth) return;

    const headerOffset = isLayerHeadersVisible ? 176 : 0;
    const playheadX = (currentTime / duration) * (scrollWidth - headerOffset) + headerOffset;
    const viewLeft = scrollContainer.scrollLeft;
    const viewRight = viewLeft + clientWidth;

    if (playheadX > viewRight - 60) {
      scrollContainer.scrollLeft = playheadX - 140;
    } else if (playheadX < viewLeft + headerOffset) {
      scrollContainer.scrollLeft = Math.max(0, playheadX - headerOffset);
    }
  }, [currentTime, isPlaying, duration, isLayerHeadersVisible]);

  // Handle Timeline Hand Tool Panning (Mouse Drag)
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!isTimelinePanMode || !timelineScrollRef.current) return;
    setIsTimelinePanning(true);
    const startX = e.clientX;
    const startScrollLeft = timelineScrollRef.current.scrollLeft;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineScrollRef.current) return;
      timelineScrollRef.current.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
    };

    const onMouseUp = () => {
      setIsTimelinePanning(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Timeline Hand Tool Panning (Touch Drag for Mobile / Tablets)
  const handleTimelineTouchStart = (e: React.TouchEvent) => {
    if (!isTimelinePanMode || !timelineScrollRef.current) return;
    if (e.touches.length !== 1) return;
    setIsTimelinePanning(true);
    const startX = e.touches[0].clientX;
    const startScrollLeft = timelineScrollRef.current.scrollLeft;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (!timelineScrollRef.current || moveEvent.touches.length !== 1) return;
      moveEvent.preventDefault();
      const deltaX = moveEvent.touches[0].clientX - startX;
      timelineScrollRef.current.scrollLeft = startScrollLeft - deltaX;
    };

    const onTouchEnd = () => {
      setIsTimelinePanning(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  // Handle Scrubbing on Ruler bar (Touch & Mouse for ALL devices) with magnetic snap
  // Clicking or dragging anywhere on the time ruler immediately moves the red playhead line.
  const handleRulerPointerDown = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const rawPct = Math.max(0, Math.min(1, clickX / rect.width));
    const rawTime = rawPct * duration;

    const { snappedTime, isSnapped } = getSnapTime(rawTime, 14);
    if (isSnapped) {
      setActiveSnapTime(snappedTime);
      onSeek(snappedTime);
    } else {
      setActiveSnapTime(null);
      onSeek(Number(rawTime.toFixed(3)));
    }
    setIsScrubbing(true);

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      const moveX = moveEvent.clientX - rect.left;
      const movePct = Math.max(0, Math.min(1, moveX / rect.width));
      const moveRawTime = movePct * duration;

      const { snappedTime: moveSnappedTime, isSnapped: moveIsSnapped } = getSnapTime(moveRawTime, 14);
      if (moveIsSnapped) {
        setActiveSnapTime(moveSnappedTime);
        onSeek(moveSnappedTime);
      } else {
        setActiveSnapTime(null);
        onSeek(Number(moveRawTime.toFixed(3)));
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {}
      setIsScrubbing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Handle Scrubbing on Tracks: require dragging so clicking on layer rows does NOT jump playhead
  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = rulerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const DRAG_THRESHOLD = 5;
    let hasMovedBeyondThreshold = false;

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();

      if (!hasMovedBeyondThreshold) {
        if (Math.abs(moveEvent.clientX - startX) > DRAG_THRESHOLD) {
          hasMovedBeyondThreshold = true;
          setIsScrubbing(true);
        } else {
          return;
        }
      }

      const moveX = moveEvent.clientX - rect.left;
      const movePct = Math.max(0, Math.min(1, moveX / rect.width));
      const moveRawTime = movePct * duration;

      const { snappedTime: moveSnappedTime, isSnapped: moveIsSnapped } = getSnapTime(moveRawTime, 14);
      if (moveIsSnapped) {
        setActiveSnapTime(moveSnappedTime);
        onSeek(moveSnappedTime);
      } else {
        setActiveSnapTime(null);
        onSeek(Number(moveRawTime.toFixed(3)));
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch (err) {}
      setIsScrubbing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Unified clip representation
  interface UnifiedClipItem {
    id: string;
    name: string;
    startTime: number;
    duration: number;
    trackIndex: number;
    kind: 'element' | 'audio';
    element?: StageElement;
    audio?: AudioTrackItem;
  }

  interface UnifiedTrackItem {
    trackIndex: number;
    clips: UnifiedClipItem[];
    name: string;
    kind: 'element' | 'audio';
    isLocked: boolean;
    isVisible: boolean;
    isMuted?: boolean;
  }

  // Move an individual clip to another track or create a new track layer
  const handleMoveClipToTrack = (
    clipId: string,
    isAudio: boolean,
    targetTrackIndex: number,
    newStartTime?: number
  ) => {
    const totalTracks = unifiedTracks.length;

    if (targetTrackIndex < 0) {
      // Create new TOP layer (track 0), push all other layers down
      const newElements = currentScene.elements.map(el => {
        if (el.id === clipId) {
          return {
            ...el,
            trackIndex: 0,
            zIndex: (totalTracks + 2) * 10,
            ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
          };
        }
        const currentTrackRow = unifiedTracks.findIndex(t => t.clips.some(c => c.id === el.id));
        const newTrackIndex = (currentTrackRow >= 0 ? currentTrackRow : (el.trackIndex ?? 0)) + 1;
        return {
          ...el,
          trackIndex: newTrackIndex,
          zIndex: Math.max(10, (totalTracks + 2 - newTrackIndex) * 10),
        };
      });

      const newAudioTracks = (currentScene.audioTracks || []).map(tr => {
        if (tr.id === clipId) {
          return {
            ...tr,
            trackIndex: 0,
            ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
          };
        }
        const currentTrackRow = unifiedTracks.findIndex(t => t.clips.some(c => c.id === tr.id));
        const newTrackIndex = (currentTrackRow >= 0 ? currentTrackRow : (tr.trackIndex ?? 0)) + 1;
        return {
          ...tr,
          trackIndex: newTrackIndex,
        };
      });

      if (onUpdateScene) {
        onUpdateScene(activeSceneIndex, {
          elements: newElements,
          audioTracks: newAudioTracks,
        });
      } else {
        newElements.forEach(el => onUpdateElement(el.id, el));
        newAudioTracks.forEach(tr => onUpdateAudioTrack(tr.id, tr));
      }
      onInteractionEnd?.();
      return;
    }

    if (targetTrackIndex >= totalTracks) {
      // Create new BOTTOM layer
      const newBottomIndex = totalTracks;
      const newElements = currentScene.elements.map(el => {
        if (el.id === clipId) {
          return {
            ...el,
            trackIndex: newBottomIndex,
            zIndex: 5,
            ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
          };
        }
        const currentTrackRow = unifiedTracks.findIndex(t => t.clips.some(c => c.id === el.id));
        const normIndex = currentTrackRow >= 0 ? currentTrackRow : (el.trackIndex ?? 0);
        return {
          ...el,
          trackIndex: normIndex,
          zIndex: Math.max(10, (totalTracks + 1 - normIndex) * 10),
        };
      });

      const newAudioTracks = (currentScene.audioTracks || []).map(tr => {
        if (tr.id === clipId) {
          return {
            ...tr,
            trackIndex: newBottomIndex,
            ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
          };
        }
        const currentTrackRow = unifiedTracks.findIndex(t => t.clips.some(c => c.id === tr.id));
        return {
          ...tr,
          trackIndex: currentTrackRow >= 0 ? currentTrackRow : (tr.trackIndex ?? 0),
        };
      });

      if (onUpdateScene) {
        onUpdateScene(activeSceneIndex, {
          elements: newElements,
          audioTracks: newAudioTracks,
        });
      } else {
        newElements.forEach(el => onUpdateElement(el.id, el));
        newAudioTracks.forEach(tr => onUpdateAudioTrack(tr.id, tr));
      }
      onInteractionEnd?.();
      return;
    }

    // Move to existing track row targetTrackIndex
    const newElements = currentScene.elements.map(el => {
      if (el.id === clipId) {
        return {
          ...el,
          trackIndex: targetTrackIndex,
          zIndex: Math.max(10, (totalTracks - targetTrackIndex) * 10),
          ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
        };
      }
      const currentTrackRow = unifiedTracks.findIndex(t => t.clips.some(c => c.id === el.id));
      const normIndex = currentTrackRow >= 0 ? currentTrackRow : (el.trackIndex ?? 0);
      return {
        ...el,
        trackIndex: normIndex,
        zIndex: Math.max(10, (totalTracks - normIndex) * 10),
      };
    });

    const newAudioTracks = (currentScene.audioTracks || []).map(tr => {
      if (tr.id === clipId) {
        return {
          ...tr,
          trackIndex: targetTrackIndex,
          ...(newStartTime !== undefined ? { startTime: newStartTime } : {}),
        };
      }
      const currentTrackRow = unifiedTracks.findIndex(t => t.clips.some(c => c.id === tr.id));
      return {
        ...tr,
        trackIndex: currentTrackRow >= 0 ? currentTrackRow : (tr.trackIndex ?? 0),
      };
    });

    if (onUpdateScene) {
      onUpdateScene(activeSceneIndex, {
        elements: newElements,
        audioTracks: newAudioTracks,
      });
    } else {
      newElements.forEach(el => onUpdateElement(el.id, el));
      newAudioTracks.forEach(tr => onUpdateAudioTrack(tr.id, tr));
    }
    onInteractionEnd?.();
  };

  // Move an entire track row up or down (ensures all split pieces on that track move together)
  const handleMoveTrack = (trackIndex: number, direction: 'up' | 'down') => {
    handleLayerAction(null, direction === 'up' ? 'bringForward' : 'sendBackward', trackIndex);
  };

  // Dragging / Trimming Visual Element Clips on Timeline (Touch & Mouse for ALL devices)
  const handleClipPointerDown = (
    e: React.PointerEvent,
    el: StageElement,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    if (el.locked || isTimelineLocked || isTimelinePanMode) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    onSelectElement(el.id);
    onSelectAudio?.(null);
    if (!rulerRef.current) return;

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const rect = rulerRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const currentTrackRowIdx = unifiedTracks.findIndex(t => t.clips.some(c => c.id === el.id));
    const originTrackRow = currentTrackRowIdx >= 0 ? currentTrackRowIdx : (el.trackIndex ?? 0);
    const initialTrackIndex = originTrackRow;
    const initialStart = el.startTime;
    const initialDuration = el.duration;
    const startDuration = duration;
    const pxPerSec = (rect.width || 1) / (startDuration || 1);

    const precision = timelineZoom >= 3.5 ? 100 : timelineZoom >= 2 ? 20 : 10;
    const roundTime = (val: number) => Math.round(val * precision) / precision;
    onInteractionStart?.();

    let hasDragged = false;
    let lastTrackDelta = 0;
    let currentDragStartTime = initialStart;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      hasDragged = true;

      const deltaSec = (moveEvent.clientX - startClientX) / (pxPerSec || 1);
      const deltaY = moveEvent.clientY - startClientY;
      lastTrackDelta = Math.round(deltaY / 36);
      const targetRow = originTrackRow + lastTrackDelta;
      const isNewAbove = mode === 'move' && targetRow < 0;
      const isNewBelow = mode === 'move' && targetRow >= unifiedTracks.length;

      if (mode === 'move') {
        const rawStart = initialStart + deltaSec;
        let snappedStart = rawStart;
        let isSnappedHeadToHead = false;

        // 1. Primary magnetic snap: Check clips on the target track row for head-to-head joint (+)
        const targetTrack = (targetRow >= 0 && targetRow < unifiedTracks.length) ? unifiedTracks[targetRow] : null;
        if (targetTrack) {
          const trackClips = targetTrack.clips.filter(c => c.id !== el.id);
          for (const other of trackClips) {
            const otherEnd = Math.round((other.startTime + other.duration) * 1000) / 1000;
            const otherStart = Math.round(other.startTime * 1000) / 1000;

            const wasAdjacentPreceding = Math.abs(initialStart - otherEnd) <= 0.04;
            const wasAdjacentSucceeding = Math.abs((initialStart + initialDuration) - otherStart) <= 0.04;

            // Snap smoothly flush to end of preceding clip (use crisp 0.10s threshold, avoid trap when pulling away)
            if (!wasAdjacentPreceding || Math.abs(deltaSec) < 0.03) {
              if (Math.abs(rawStart - otherEnd) < 0.12) {
                snappedStart = otherEnd;
                isSnappedHeadToHead = true;
                break;
              }
            } else if (Math.abs(rawStart - otherEnd) < 0.06) {
              snappedStart = otherEnd;
              isSnappedHeadToHead = true;
              break;
            }

            // Snap smoothly flush to start of succeeding clip
            if (!wasAdjacentSucceeding || Math.abs(deltaSec) < 0.03) {
              if (Math.abs((rawStart + initialDuration) - otherStart) < 0.12) {
                snappedStart = Math.max(0, otherStart - initialDuration);
                isSnappedHeadToHead = true;
                break;
              }
            } else if (Math.abs((rawStart + initialDuration) - otherStart) < 0.06) {
              snappedStart = Math.max(0, otherStart - initialDuration);
              isSnappedHeadToHead = true;
              break;
            }
          }
        }

        // 2. Secondary snapping: To 0, playhead, or other clips across the scene
        if (!isSnappedHeadToHead) {
          if (Math.abs(snappedStart) < 0.2) {
            snappedStart = 0;
          } else if (Math.abs(snappedStart - currentTime) < 0.2) {
            snappedStart = currentTime;
          } else {
            const allOtherClips = [
              ...currentScene.elements.filter(o => o.id !== el.id).map(o => ({ s: o.startTime, e: o.startTime + o.duration })),
              ...(currentScene.audioTracks || []).filter(o => o.id !== el.id).map(o => ({ s: o.startTime, e: o.startTime + o.duration })),
            ];
            for (const other of allOtherClips) {
              if (Math.abs(snappedStart - other.e) < 0.22) {
                snappedStart = other.e;
                break;
              }
              if (Math.abs((snappedStart + initialDuration) - other.s) < 0.22) {
                snappedStart = Math.max(0, other.s - initialDuration);
                break;
              }
            }
          }
        }

        const maxStart = Math.max(0, MAX_SCENE_DURATION - initialDuration);
        const clampedStart = Math.max(0, Math.min(maxStart, snappedStart));
        // If head-to-head snapped, preserve exact decimal precision down to the millisecond (never distort with roundTime)
        const finalStart = isSnappedHeadToHead ? Number(clampedStart.toFixed(3)) : roundTime(clampedStart);
        currentDragStartTime = finalStart;
        onUpdateElement(el.id, { startTime: finalStart });
        setDraggingFeedback({
          id: el.id,
          name: el.name,
          kind: 'element',
          mode: 'move',
          startTime: finalStart,
          duration: initialDuration,
          dragOffsetY: deltaY,
          targetTrackIdx: targetRow,
          isNewTrackAbove: isNewAbove,
          isNewTrackBelow: isNewBelow,
          originTrackIdx: originTrackRow,
          isHeadToHeadSnapped: isSnappedHeadToHead,
        });
      } else if (mode === 'trim-end') {
        // Stretch or shrink from the right edge, capped at MAX_SCENE_DURATION (120s / 2m)
        const maxDur = Math.max(0.2, MAX_SCENE_DURATION - initialStart);
        const rawDur = Math.max(0.2, Math.min(maxDur, initialDuration + deltaSec));
        const proposedEnd = initialStart + rawDur;

        // Snap to other layers' start and end points or playhead
        let finalDur = rawDur;
        let isSnapped = false;
        let snapTime: number | null = null;

        for (const pt of snapPoints) {
          if (Math.abs(proposedEnd - pt) <= 0.15) {
            const calculatedDur = Number((pt - initialStart).toFixed(3));
            if (calculatedDur >= 0.2) {
              finalDur = calculatedDur;
              isSnapped = true;
              snapTime = pt;
              break;
            }
          }
        }
        if (!isSnapped && Math.abs(proposedEnd - currentTime) <= 0.15) {
          const calculatedDur = Number((currentTime - initialStart).toFixed(3));
          if (calculatedDur >= 0.2) {
            finalDur = calculatedDur;
            isSnapped = true;
            snapTime = currentTime;
          }
        }

        const roundedDur = isSnapped ? finalDur : roundTime(finalDur);
        setActiveSnapTime(snapTime);
        onUpdateElement(el.id, { duration: roundedDur });
        setDraggingFeedback({
          id: el.id,
          name: el.name,
          kind: 'element',
          mode: 'trim-end',
          startTime: initialStart,
          duration: roundedDur,
          isHeadToHeadSnapped: isSnapped,
        });
      } else if (mode === 'trim-start') {
        // Stretch or shrink from the left edge
        const proposedStart = Math.max(0, Math.min(initialStart + initialDuration - 0.2, initialStart + deltaSec));
        let finalStart = proposedStart;
        let isSnapped = false;
        let snapTime: number | null = null;

        for (const pt of snapPoints) {
          if (Math.abs(proposedStart - pt) <= 0.15) {
            if (pt <= initialStart + initialDuration - 0.2) {
              finalStart = Number(pt.toFixed(3));
              isSnapped = true;
              snapTime = pt;
              break;
            }
          }
        }
        if (!isSnapped && Math.abs(proposedStart - currentTime) <= 0.15) {
          if (currentTime <= initialStart + initialDuration - 0.2) {
            finalStart = Number(currentTime.toFixed(3));
            isSnapped = true;
            snapTime = currentTime;
          }
        }

        const diff = finalStart - initialStart;
        const newDur = Math.max(0.2, initialDuration - diff);
        const roundedStart = isSnapped ? finalStart : roundTime(finalStart);
        const roundedDur = isSnapped ? Number(newDur.toFixed(3)) : roundTime(newDur);

        setActiveSnapTime(snapTime);
        onUpdateElement(el.id, {
          startTime: roundedStart,
          duration: roundedDur,
        });
        setDraggingFeedback({
          id: el.id,
          name: el.name,
          kind: 'element',
          mode: 'trim-start',
          startTime: roundedStart,
          duration: roundedDur,
          isHeadToHeadSnapped: isSnapped,
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

      setDraggingFeedback(null);
      setActiveSnapTime(null);
      if (hasDragged) {
        if (mode === 'move') {
          const finalDeltaY = upEvent.clientY - startClientY;
          const finalRowDelta = Math.round(finalDeltaY / 36);
          const finalTargetRow = originTrackRow + finalRowDelta;

          if (finalTargetRow < 0) {
            handleMoveClipToTrack(el.id, false, -1, currentDragStartTime);
          } else if (finalTargetRow >= unifiedTracks.length) {
            handleMoveClipToTrack(el.id, false, unifiedTracks.length, currentDragStartTime);
          } else if (finalRowDelta !== 0) {
            handleMoveClipToTrack(el.id, false, finalTargetRow, currentDragStartTime);
          } else {
            // Commit exact position even on same track row so history snapshot and scene state are cleanly synced
            handleMoveClipToTrack(el.id, false, originTrackRow, currentDragStartTime);
          }
        }
        onInteractionEnd?.();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Dragging / Trimming Audio Clips on Timeline (Touch & Mouse for ALL devices)
  const handleAudioClipPointerDown = (
    e: React.PointerEvent,
    track: AudioTrackItem,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    if (track.locked || isTimelineLocked || isTimelinePanMode) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    onSelectAudio?.(track.id);
    onSelectElement(null);
    if (!rulerRef.current) return;

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch (err) {}

    const rect = rulerRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const currentTrackRowIdx = unifiedTracks.findIndex(t => t.clips.some(c => c.id === track.id));
    const originTrackRow = currentTrackRowIdx >= 0 ? currentTrackRowIdx : (track.trackIndex ?? 0);
    const initialTrackIndex = originTrackRow;
    const initialStart = track.startTime;
    const initialDuration = track.duration;
    const startDuration = duration;
    const pxPerSec = (rect.width || 1) / (startDuration || 1);

    const precision = timelineZoom >= 3.5 ? 100 : timelineZoom >= 2 ? 20 : 10;
    const roundTime = (val: number) => Math.round(val * precision) / precision;
    onInteractionStart?.();

    let hasDragged = false;
    let lastTrackDelta = 0;
    let currentDragStartTime = initialStart;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      hasDragged = true;

      const deltaSec = (moveEvent.clientX - startClientX) / (pxPerSec || 1);
      const deltaY = moveEvent.clientY - startClientY;
      lastTrackDelta = Math.round(deltaY / 36);
      const targetRow = originTrackRow + lastTrackDelta;
      const isNewAbove = mode === 'move' && targetRow < 0;
      const isNewBelow = mode === 'move' && targetRow >= unifiedTracks.length;

      if (mode === 'move') {
        const rawStart = initialStart + deltaSec;
        let snappedStart = rawStart;
        let isSnappedHeadToHead = false;

        // 1. Primary magnetic snap: Check clips on the target track row for head-to-head joint (+)
        const targetTrack = (targetRow >= 0 && targetRow < unifiedTracks.length) ? unifiedTracks[targetRow] : null;
        if (targetTrack) {
          const trackClips = targetTrack.clips.filter(c => c.id !== track.id);
          for (const other of trackClips) {
            const otherEnd = Math.round((other.startTime + other.duration) * 1000) / 1000;
            const otherStart = Math.round(other.startTime * 1000) / 1000;

            const wasAdjacentPreceding = Math.abs(initialStart - otherEnd) <= 0.04;
            const wasAdjacentSucceeding = Math.abs((initialStart + initialDuration) - otherStart) <= 0.04;

            if (!wasAdjacentPreceding || Math.abs(deltaSec) < 0.03) {
              if (Math.abs(rawStart - otherEnd) < 0.12) {
                snappedStart = otherEnd;
                isSnappedHeadToHead = true;
                break;
              }
            } else if (Math.abs(rawStart - otherEnd) < 0.06) {
              snappedStart = otherEnd;
              isSnappedHeadToHead = true;
              break;
            }

            if (!wasAdjacentSucceeding || Math.abs(deltaSec) < 0.03) {
              if (Math.abs((rawStart + initialDuration) - otherStart) < 0.12) {
                snappedStart = Math.max(0, otherStart - initialDuration);
                isSnappedHeadToHead = true;
                break;
              }
            } else if (Math.abs((rawStart + initialDuration) - otherStart) < 0.06) {
              snappedStart = Math.max(0, otherStart - initialDuration);
              isSnappedHeadToHead = true;
              break;
            }
          }
        }

        // 2. Secondary snapping
        if (!isSnappedHeadToHead) {
          if (Math.abs(snappedStart) < 0.2) {
            snappedStart = 0;
          } else if (Math.abs(snappedStart - currentTime) < 0.2) {
            snappedStart = currentTime;
          } else {
            const allOtherClips = [
              ...currentScene.elements.filter(o => o.id !== track.id).map(o => ({ s: o.startTime, e: o.startTime + o.duration })),
              ...(currentScene.audioTracks || []).filter(o => o.id !== track.id).map(o => ({ s: o.startTime, e: o.startTime + o.duration })),
            ];
            for (const other of allOtherClips) {
              if (Math.abs(snappedStart - other.e) < 0.22) {
                snappedStart = other.e;
                break;
              }
              if (Math.abs((snappedStart + initialDuration) - other.s) < 0.22) {
                snappedStart = Math.max(0, other.s - initialDuration);
                break;
              }
            }
          }
        }

        const maxStart = Math.max(0, MAX_SCENE_DURATION - initialDuration);
        const clampedStart = Math.max(0, Math.min(maxStart, snappedStart));
        const finalStart = isSnappedHeadToHead ? Number(clampedStart.toFixed(3)) : roundTime(clampedStart);
        currentDragStartTime = finalStart;
        onUpdateAudioTrack(track.id, { startTime: finalStart });
        setDraggingFeedback({
          id: track.id,
          name: track.name,
          kind: 'audio',
          mode: 'move',
          startTime: finalStart,
          duration: initialDuration,
          dragOffsetY: deltaY,
          targetTrackIdx: targetRow,
          isNewTrackAbove: isNewAbove,
          isNewTrackBelow: isNewBelow,
          originTrackIdx: originTrackRow,
          isHeadToHeadSnapped: isSnappedHeadToHead,
        });
      } else if (mode === 'trim-end') {
        // Stretch or shrink from the right edge, capped at MAX_SCENE_DURATION (120s / 2m)
        const maxDur = Math.max(0.2, MAX_SCENE_DURATION - initialStart);
        const rawDur = Math.max(0.2, Math.min(maxDur, initialDuration + deltaSec));
        const proposedEnd = initialStart + rawDur;

        let finalDur = rawDur;
        let isSnapped = false;
        let snapTime: number | null = null;

        for (const pt of snapPoints) {
          if (Math.abs(proposedEnd - pt) <= 0.15) {
            const calculatedDur = Number((pt - initialStart).toFixed(3));
            if (calculatedDur >= 0.2) {
              finalDur = calculatedDur;
              isSnapped = true;
              snapTime = pt;
              break;
            }
          }
        }
        if (!isSnapped && Math.abs(proposedEnd - currentTime) <= 0.15) {
          const calculatedDur = Number((currentTime - initialStart).toFixed(3));
          if (calculatedDur >= 0.2) {
            finalDur = calculatedDur;
            isSnapped = true;
            snapTime = currentTime;
          }
        }

        const roundedDur = isSnapped ? finalDur : roundTime(finalDur);
        setActiveSnapTime(snapTime);
        onUpdateAudioTrack(track.id, { duration: roundedDur });
        setDraggingFeedback({
          id: track.id,
          name: track.name,
          kind: 'audio',
          mode: 'trim-end',
          startTime: initialStart,
          duration: roundedDur,
          isHeadToHeadSnapped: isSnapped,
        });
      } else if (mode === 'trim-start') {
        // Stretch or shrink from the left edge
        const proposedStart = Math.max(0, Math.min(initialStart + initialDuration - 0.2, initialStart + deltaSec));
        let finalStart = proposedStart;
        let isSnapped = false;
        let snapTime: number | null = null;

        for (const pt of snapPoints) {
          if (Math.abs(proposedStart - pt) <= 0.15) {
            if (pt <= initialStart + initialDuration - 0.2) {
              finalStart = Number(pt.toFixed(3));
              isSnapped = true;
              snapTime = pt;
              break;
            }
          }
        }
        if (!isSnapped && Math.abs(proposedStart - currentTime) <= 0.15) {
          if (currentTime <= initialStart + initialDuration - 0.2) {
            finalStart = Number(currentTime.toFixed(3));
            isSnapped = true;
            snapTime = currentTime;
          }
        }

        const diff = finalStart - initialStart;
        const newDur = Math.max(0.2, initialDuration - diff);
        const roundedStart = isSnapped ? finalStart : roundTime(finalStart);
        const roundedDur = isSnapped ? Number(newDur.toFixed(3)) : roundTime(newDur);

        setActiveSnapTime(snapTime);
        onUpdateAudioTrack(track.id, {
          startTime: roundedStart,
          duration: roundedDur,
        });
        setDraggingFeedback({
          id: track.id,
          name: track.name,
          kind: 'audio',
          mode: 'trim-start',
          startTime: roundedStart,
          duration: roundedDur,
          isHeadToHeadSnapped: isSnapped,
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

      setDraggingFeedback(null);
      setActiveSnapTime(null);
      if (hasDragged) {
        if (mode === 'move') {
          const finalDeltaY = upEvent.clientY - startClientY;
          const finalRowDelta = Math.round(finalDeltaY / 36);
          const finalTargetRow = originTrackRow + finalRowDelta;

          if (finalTargetRow < 0) {
            handleMoveClipToTrack(track.id, true, -1, currentDragStartTime);
          } else if (finalTargetRow >= unifiedTracks.length) {
            handleMoveClipToTrack(track.id, true, unifiedTracks.length, currentDragStartTime);
          } else if (finalRowDelta !== 0) {
            handleMoveClipToTrack(track.id, true, finalTargetRow, currentDragStartTime);
          } else {
            handleMoveClipToTrack(track.id, true, originTrackRow, currentDragStartTime);
          }
        }
        onInteractionEnd?.();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Layer Reordering Handlers (Supports moving entire track line with all split pieces, front/back, duplicate, delete)
  const handleLayerAction = (
    id: string | null,
    action:
      | 'bringToFront'
      | 'sendToBack'
      | 'bringForward'
      | 'sendBackward'
      | 'moveTrackUp'
      | 'moveTrackDown'
      | 'moveToNewTrackAbove'
      | 'moveToNewTrackBelow'
      | 'split'
      | 'duplicate'
      | 'delete',
    explicitTrackIdx?: number
  ) => {
    setActiveMenuId(null);
    setActiveMenuTrackIndex(null);

    // If splitting
    if (action === 'split') {
      handleSplitSelected();
      return;
    }

    // Find current track row in unifiedTracks
    let targetTrackIdx =
      explicitTrackIdx !== undefined && explicitTrackIdx >= 0 && explicitTrackIdx < unifiedTracks.length
        ? explicitTrackIdx
        : -1;

    if (targetTrackIdx === -1 && id) {
      targetTrackIdx = unifiedTracks.findIndex(t => t.clips.some(c => c.id === id));
    }
    if (targetTrackIdx === -1) return;

    const targetTrack = unifiedTracks[targetTrackIdx];
    if (!targetTrack) return;

    // If duplicating, duplicate the selected clip or clip under playhead or first clip on this track at playhead position on same track
    if (action === 'duplicate') {
      const selectedClip = (id ? targetTrack.clips.find(c => c.id === id) : null)
        || (selectedElementId ? targetTrack.clips.find(c => c.id === selectedElementId) : null)
        || (selectedAudioId ? targetTrack.clips.find(c => c.id === selectedAudioId) : null);
      const clipUnderPlayhead = targetTrack.clips.find(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration);
      const targetClip = selectedClip || clipUnderPlayhead || targetTrack.clips[0];
      if (targetClip) {
        handleDuplicateTarget({
          id: targetClip.id,
          kind: targetClip.kind,
          trackIndex: targetTrack.trackIndex,
        });
      }
      return;
    }

    // If deleting, delete all clips on this entire track row (all split parts)
    if (action === 'delete') {
      targetTrack.clips.forEach(clip => {
        if (clip.kind === 'element') {
          onDeleteElement(clip.id);
        } else {
          onDeleteAudioTrack(clip.id);
        }
      });
      return;
    }

    let newTracks: UnifiedTrackItem[] = unifiedTracks.map(t => ({
      ...t,
      clips: [...t.clips],
    }));

    if (action === 'bringToFront') {
      // Move entire track row (all split pieces) to the very top (Row 0, highest z-index)
      const [movingTrack] = newTracks.splice(targetTrackIdx, 1);
      if (movingTrack) {
        newTracks.unshift(movingTrack);
      }
    } else if (action === 'sendToBack') {
      // Move entire track row (all split pieces) to the very bottom (last row, lowest z-index)
      const [movingTrack] = newTracks.splice(targetTrackIdx, 1);
      if (movingTrack) {
        newTracks.push(movingTrack);
      }
    } else if (action === 'bringForward' || action === 'moveTrackUp') {
      // Move entire track row up 1 position (swap with track above)
      if (targetTrackIdx > 0) {
        const temp = newTracks[targetTrackIdx];
        newTracks[targetTrackIdx] = newTracks[targetTrackIdx - 1];
        newTracks[targetTrackIdx - 1] = temp;
      }
    } else if (action === 'sendBackward' || action === 'moveTrackDown') {
      // Move entire track row down 1 position (swap with track below)
      if (targetTrackIdx < newTracks.length - 1) {
        const temp = newTracks[targetTrackIdx];
        newTracks[targetTrackIdx] = newTracks[targetTrackIdx + 1];
        newTracks[targetTrackIdx + 1] = temp;
      }
    } else if (action === 'moveToNewTrackAbove') {
      // Move entire track row above the previous track
      if (targetTrackIdx > 0) {
        const [movingTrack] = newTracks.splice(targetTrackIdx, 1);
        newTracks.splice(targetTrackIdx - 1, 0, movingTrack);
      }
    } else if (action === 'moveToNewTrackBelow') {
      // Move entire track row below the next track
      if (targetTrackIdx < newTracks.length - 1) {
        const [movingTrack] = newTracks.splice(targetTrackIdx, 1);
        newTracks.splice(targetTrackIdx + 1, 0, movingTrack);
      }
    }

    // Now update trackIndex and zIndex for all elements and audio tracks across all tracks
    const updatedElements = [...currentScene.elements];
    const updatedAudio = [...(currentScene.audioTracks || [])];

    newTracks.forEach((trackItem, rowIdx) => {
      const rowZIndex = Math.max(10, (newTracks.length - rowIdx) * 10);
      trackItem.clips.forEach((clipItem, clipSubIdx) => {
        if (clipItem.kind === 'element') {
          const elIdx = updatedElements.findIndex(e => e.id === clipItem.id);
          if (elIdx >= 0) {
            updatedElements[elIdx] = {
              ...updatedElements[elIdx],
              trackIndex: rowIdx,
              zIndex: rowZIndex + clipSubIdx,
            };
          }
        } else {
          const audIdx = updatedAudio.findIndex(a => a.id === clipItem.id);
          if (audIdx >= 0) {
            updatedAudio[audIdx] = {
              ...updatedAudio[audIdx],
              trackIndex: rowIdx,
            };
          }
        }
      });
    });

    if (onUpdateScene) {
      onUpdateScene(activeSceneIndex, {
        elements: updatedElements,
        audioTracks: updatedAudio,
      });
    } else {
      updatedElements.forEach(el => onUpdateElement(el.id, el));
      updatedAudio.forEach(tr => onUpdateAudioTrack(tr.id, tr));
    }
    onInteractionEnd?.();
  };

  // Split selected element or audio track at current playhead (Red Line)
  const handleSplitSelected = () => {
    if (onSplitAtPlayhead) {
      onSplitAtPlayhead(selectedElementId || undefined, currentTime);
      return;
    }

    let targetElement = currentScene.elements.find(el => el.id === selectedElementId);
    let targetAudio = currentScene.audioTracks?.find(at => at.id === selectedAudioId);

    // If selected element ends or starts right at currentTime, search for another element spanning currentTime
    if (targetElement && (currentTime <= targetElement.startTime + 0.05 || currentTime >= targetElement.startTime + targetElement.duration - 0.05)) {
      const spanningElement = currentScene.elements.find(
        el => el.id !== targetElement?.id && currentTime > el.startTime + 0.05 && currentTime < el.startTime + el.duration - 0.05
      );
      if (spanningElement) {
        targetElement = spanningElement;
      } else {
        const spanningAudio = currentScene.audioTracks?.find(
          at => currentTime > at.startTime + 0.05 && currentTime < at.startTime + at.duration - 0.05
        );
        if (spanningAudio) {
          targetElement = undefined;
          targetAudio = spanningAudio;
        }
      }
    }

    // If neither is explicitly selected, find an element or audio track under the red playhead
    if (!targetElement && !targetAudio) {
      targetElement = currentScene.elements.find(
        el => currentTime > el.startTime + 0.05 && currentTime < el.startTime + el.duration - 0.05
      );
      if (!targetElement) {
        targetAudio = currentScene.audioTracks?.find(
          at => currentTime > at.startTime + 0.05 && currentTime < at.startTime + at.duration - 0.05
        );
      }
    }

    if (targetElement) {
      const origStart = Math.round(targetElement.startTime * 1000) / 1000;
      const origDuration = Math.round(targetElement.duration * 1000) / 1000;
      const origEnd = origStart + origDuration;

      if (currentTime > origStart + 0.05 && currentTime < origEnd - 0.05) {
        const cleanSplit = Number(currentTime.toFixed(3));
        const firstDuration = Number((cleanSplit - origStart).toFixed(3));
        const secondStart = cleanSplit;
        const secondDuration = Number((origEnd - cleanSplit).toFixed(3));

        // Update first part
        onUpdateElement(targetElement.id, { startTime: origStart, duration: firstDuration });

        // Create second part with SAME trackIndex so it sits side-by-side on same track line
        const secondPart: StageElement = {
          ...targetElement,
          id: `elem-split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `${targetElement.name.replace(/ \(Part \d+\)/, '')} (Part 2)`,
          startTime: secondStart,
          duration: secondDuration,
          trackIndex: targetElement.trackIndex ?? 0,
        };

        if (onAddElement) {
          onAddElement(secondPart);
        }
        onSelectElement(secondPart.id);
        onSelectAudio?.(null);
      }
    } else if (targetAudio) {
      const origStart = Math.round(targetAudio.startTime * 1000) / 1000;
      const origDuration = Math.round(targetAudio.duration * 1000) / 1000;
      const origEnd = origStart + origDuration;

      if (currentTime > origStart + 0.05 && currentTime < origEnd - 0.05) {
        const cleanSplit = Number(currentTime.toFixed(3));
        const firstDuration = Number((cleanSplit - origStart).toFixed(3));
        const secondStart = cleanSplit;
        const secondDuration = Number((origEnd - cleanSplit).toFixed(3));

        onUpdateAudioTrack(targetAudio.id, { startTime: origStart, duration: firstDuration });

        const secondPart: AudioTrackItem = {
          ...targetAudio,
          id: `audio-split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `${targetAudio.name.replace(/ \(Part \d+\)/, '')} (Part 2)`,
          startTime: secondStart,
          duration: secondDuration,
          trackIndex: targetAudio.trackIndex ?? 0,
        };

        if (onAddAudioTrack) {
          onAddAudioTrack(secondPart);
        }
        onSelectAudio?.(secondPart.id);
        onSelectElement(null);
      }
    }
  };

  // Start inline renaming
  const handleStartRename = (id: string, currentName: string) => {
    setEditingNameId(id);
    setEditingNameValue(currentName);
  };

  // Commit inline renaming
  const handleCommitRename = (id: string, isAudio: boolean) => {
    if (!editingNameValue.trim()) {
      setEditingNameId(null);
      return;
    }
    if (isAudio) {
      onUpdateAudioTrack(id, { name: editingNameValue.trim() });
    } else {
      onUpdateElement(id, { name: editingNameValue.trim() });
    }
    setEditingNameId(null);
  };

  // Duplicate target layer/cut part/audio at current playhead position on the exact same track
  const handleDuplicateTarget = (target: { id: string; kind: 'element' | 'audio'; trackIndex?: number }) => {
    if (target.kind === 'element') {
      onDuplicateElement?.(target.id, currentTime, target.trackIndex);
    } else {
      onDuplicateAudioTrack?.(target.id, currentTime, target.trackIndex);
    }
  };

  // Build unified tracks ordered by trackIndex ascending (0 = top row)
  const unifiedTracks: UnifiedTrackItem[] = useMemo(() => {
    const rawClips: UnifiedClipItem[] = [];

    // Visual elements sorted by descending zIndex if trackIndex is unset
    const elementsSorted = [...currentScene.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    elementsSorted.forEach((el, idx) => {
      const tIdx = el.trackIndex !== undefined ? el.trackIndex : idx;
      rawClips.push({
        id: el.id,
        name: el.name,
        startTime: el.startTime,
        duration: el.duration,
        trackIndex: tIdx,
        kind: 'element',
        element: el,
      });
    });

    // Audio items
    const audioItems = currentScene.audioTracks || [];
    audioItems.forEach((tr, idx) => {
      const tIdx = tr.trackIndex !== undefined ? tr.trackIndex : (elementsSorted.length + idx);
      rawClips.push({
        id: tr.id,
        name: tr.name,
        startTime: tr.startTime,
        duration: tr.duration,
        trackIndex: tIdx,
        kind: 'audio',
        audio: tr,
      });
    });

    // Group clips by trackIndex
    const trackMap = new Map<number, UnifiedClipItem[]>();
    rawClips.forEach(clip => {
      const list = trackMap.get(clip.trackIndex) || [];
      list.push(clip);
      trackMap.set(clip.trackIndex, list);
    });

    const sortedTrackIndices = Array.from(trackMap.keys()).sort((a, b) => a - b);

    return sortedTrackIndices.map((origIndex, normalizedIndex) => {
      const clips = trackMap.get(origIndex)!.sort((a, b) => a.startTime - b.startTime);
      const firstClip = clips[0];
      const kind = firstClip.kind;
      const isLocked = clips.every(c => (c.kind === 'element' ? c.element?.locked : c.audio?.locked));
      const isVisible = clips.some(c => (c.kind === 'element' ? c.element?.visible !== false : c.audio?.visible !== false));
      const isMuted = clips.every(c => c.audio?.isMuted);

      return {
        trackIndex: normalizedIndex,
        clips,
        name: firstClip.name,
        kind,
        isLocked,
        isVisible,
        isMuted,
      };
    });
  }, [currentScene.elements, currentScene.audioTracks]);

  const visualLayers = [...currentScene.elements].sort((a, b) => b.zIndex - a.zIndex);
  const audioLayers = currentScene.audioTracks || [];

  const selectedElement = currentScene.elements.find(el => el.id === selectedElementId);
  const selectedAudio = currentScene.audioTracks?.find(at => at.id === selectedAudioId);

  const isClipSplittable = (c: { startTime: number; duration: number } | null | undefined) =>
    Boolean(c && currentTime > c.startTime + 0.05 && currentTime < c.startTime + c.duration - 0.05);

  const activeClipForSplit =
    (isClipSplittable(selectedElement) ? selectedElement : null) ||
    (isClipSplittable(selectedAudio) ? selectedAudio : null) ||
    currentScene.elements.find(el => isClipSplittable(el)) ||
    currentScene.audioTracks?.find(at => isClipSplittable(at));

  const canSplit = Boolean(activeClipForSplit);

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / duration) * 100));

  return (
    <div
      className={`bg-[#12161f] border-t border-[#222834] flex flex-col select-none transition-all duration-200 z-20 shrink-0 shadow-lg text-slate-200 ${
        isCollapsed ? 'h-8' : 'h-64 sm:h-72'
      }`}
    >
      {/* 1. SCENE TABS BAR (Screenshot 5: Scene1 [ ⋮ ] + New Scene) */}
      <div className={`h-8 bg-[#181d28] px-2 sm:px-3 flex items-center justify-between text-xs shrink-0 ${!isCollapsed ? 'border-b border-[#242b3a]' : ''}`}>
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {/* LAYER HEADERS TOGGLE (Stacked Layers icon from user - Click to hide/show the left layer-headers panel) */}
          <button
            onClick={() => setIsLayerHeadersVisible(!isLayerHeadersVisible)}
            title={isLayerHeadersVisible ? 'Hide Layer Controls & Names (Maximize Track Space)' : 'Show Layer Controls & Names'}
            className={`flex items-center justify-center p-1.5 rounded transition-all cursor-pointer border active:scale-95 shrink-0 ${
              isLayerHeadersVisible
                ? 'bg-blue-600/30 text-blue-400 border-blue-500/50 shadow-xs'
                : 'bg-[#151922] text-slate-400 hover:text-slate-200 border-[#2e3748] hover:bg-[#1c222e]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {scenes.map((sc, idx) => {
            const isActive = idx === activeSceneIndex;
            const colorTheme = SCENE_PALETTE[idx % SCENE_PALETTE.length];
            return (
              <div
                key={sc.id}
                onClick={() => onSelectScene(idx)}
                title={`${sc.name || `Scene ${idx + 1}`} (${sc.duration}s)`}
                className={`flex items-center justify-center space-x-1 px-2 py-1 sm:px-3 rounded text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
                  isActive
                    ? `${colorTheme.active} scale-105 shadow-sm`
                    : `${colorTheme.inactive}`
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <span className="text-xs leading-none">🖼️</span>
                  <span className="whitespace-nowrap">{sc.name || `Scene ${idx + 1}`}</span>
                </div>

                {scenes.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteScene(idx);
                    }}
                    className="inline-flex p-0.5 text-slate-400 hover:text-red-400 rounded cursor-pointer ml-1"
                    title="Delete Scene"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* + New Scene Button */}
          <button
            onClick={onAddScene}
            title="Add New Scene"
            className="flex items-center justify-center p-1.5 bg-[#1c222e] hover:bg-[#252c3b] text-slate-300 rounded border border-[#2e3748] transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
          </button>

          {/* Red Delete Button: deletes selected layer / cut part / audio / or current scene */}
          {(() => {
            const activeEl = currentScene.elements.find(el => el.id === selectedElementId);
            const activeAud = currentScene.audioTracks?.find(at => at.id === selectedAudioId);
            const elUnderPlayhead = !activeEl && !activeAud
              ? currentScene.elements.find(el => currentTime >= el.startTime && currentTime <= el.startTime + el.duration)
              : null;
            const audUnderPlayhead = !activeEl && !activeAud && !elUnderPlayhead
              ? currentScene.audioTracks?.find(at => currentTime >= at.startTime && currentTime <= at.startTime + at.duration)
              : null;

            const targetToDelete = activeEl || activeAud || elUnderPlayhead || audUnderPlayhead;
            const canDeleteScene = !targetToDelete && scenes.length > 1;
            const canDelete = Boolean(targetToDelete || canDeleteScene);

            const handleDelete = () => {
              if (activeEl) {
                onDeleteElement(activeEl.id);
                onSelectElement(null);
              } else if (activeAud) {
                onDeleteAudioTrack(activeAud.id);
                onSelectAudio?.(null);
              } else if (elUnderPlayhead) {
                onDeleteElement(elUnderPlayhead.id);
                onSelectElement(null);
              } else if (audUnderPlayhead) {
                onDeleteAudioTrack(audUnderPlayhead.id);
                onSelectAudio?.(null);
              } else if (scenes.length > 1) {
                onDeleteScene(activeSceneIndex);
              }
            };

            const title = activeEl
              ? `Delete selected layer / cut piece: "${activeEl.name}"`
              : activeAud
              ? `Delete selected audio: "${activeAud.name}"`
              : elUnderPlayhead
              ? `Delete layer under playhead: "${elUnderPlayhead.name}"`
              : audUnderPlayhead
              ? `Delete audio under playhead: "${audUnderPlayhead.name}"`
              : scenes.length > 1
              ? `Delete current scene (${scenes[activeSceneIndex]?.name || `Scene ${activeSceneIndex + 1}`})`
              : 'Select a layer, cut piece, or audio track to delete';

            return (
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                title={title}
                className={`flex items-center justify-center p-1.5 rounded border transition-all shrink-0 ${
                  canDelete
                    ? 'bg-red-500/15 hover:bg-red-500/30 text-red-500 hover:text-red-400 border-red-500/40 hover:border-red-500/60 cursor-pointer active:scale-95 shadow-sm'
                    : 'bg-[#181d28] text-red-500/40 border-red-500/20 opacity-40 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            );
          })()}
        </div>

        {/* Right Tools: Zoom (- + 100%), Lock & Collapse */}
        <div className="flex items-center space-x-1 sm:space-x-2 text-slate-400">
          {/* Timeline Zoom: - and + with 100% display to the left of lock icon */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 px-1 sm:px-1.5 py-0.5 bg-[#10141c] rounded border border-[#242b3a]">
            <button
              onClick={() => {
                let nextZoom: number;
                if (timelineZoom > 0.25) {
                  nextZoom = Math.max(0.25, Math.round((timelineZoom - 0.25) * 100) / 100);
                } else if (timelineZoom > 0.05) {
                  nextZoom = Math.max(0.05, Math.round((timelineZoom - 0.05) * 100) / 100);
                } else {
                  nextZoom = Math.max(0.01, Math.round((timelineZoom - 0.01) * 100) / 100);
                }
                setTimelineZoom(nextZoom);
              }}
              className="p-0.5 sm:p-1 hover:text-white text-slate-400 rounded hover:bg-[#202634] cursor-pointer transition-colors"
              title="Zoom Out (-) - Down to 1%"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Slider (Visible on md desktop screens) */}
            <input
              type="range"
              min="0.01"
              max="5"
              step="0.01"
              value={timelineZoom}
              onChange={e => setTimelineZoom(parseFloat(e.target.value))}
              className="hidden md:inline-block w-12 lg:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Timeline Zoom: ${Math.round(timelineZoom * 100)}%`}
            />

            <button
              onClick={() => {
                let nextZoom: number;
                if (timelineZoom < 0.05) {
                  nextZoom = Math.min(0.05, Math.round((timelineZoom + 0.01) * 100) / 100);
                } else if (timelineZoom < 0.25) {
                  nextZoom = Math.min(0.25, Math.round((timelineZoom + 0.05) * 100) / 100);
                } else {
                  nextZoom = Math.min(5, Math.round((timelineZoom + 0.25) * 100) / 100);
                }
                setTimelineZoom(nextZoom);
              }}
              className="p-0.5 sm:p-1 hover:text-white text-slate-400 rounded hover:bg-[#202634] cursor-pointer transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom % badge: ALWAYS visible beside -+ on all devices */}
            <span className="text-[10px] font-mono font-semibold text-blue-400 min-w-[32px] text-center px-1 py-0.2 bg-[#161a24] rounded border border-slate-800">
              {Math.round(timelineZoom * 100)}%
            </span>
          </div>

          {/* Fit to Timeline (100%) */}
          <button
            onClick={() => setTimelineZoom(1)}
            className="p-1 sm:p-1.5 hover:text-white text-slate-400 rounded hover:bg-[#202634] cursor-pointer transition-colors"
            title="Fit Timeline (100%)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 sm:h-4 bg-slate-700/80 mx-0.5" />

          <button
            onClick={() => setIsTimelineLocked(!isTimelineLocked)}
            className="p-1 hover:text-white cursor-pointer transition-colors"
            title={isTimelineLocked ? 'Unlock Timeline' : 'Lock Timeline'}
          >
            {isTimelineLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:text-white cursor-pointer transition-colors"
            title={isCollapsed ? 'Expand Timeline' : 'Collapse Timeline'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. TIMELINE TOP CONTROL BAR (Screenshot 5: Multi Select, Layer Duplicate, Split, Camera, Transport, Zoom) */}
      {!isCollapsed && (
        <div className="h-9 bg-[#161a24] border-b border-[#232938] px-1.5 sm:px-2 md:px-3 flex items-center justify-between text-xs text-slate-300 shrink-0 w-full min-w-0 flex-nowrap overflow-x-auto no-scrollbar">
          
          {/* Main Controls: Multi Select, + Layer, Hand Tool, Jump Start/End, Zoom (- + 100%), Fit */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
            <button
              onClick={() => setIsMultiSelect(!isMultiSelect)}
              title="Multi Select"
              className={`p-1 sm:p-1.5 rounded transition-colors cursor-pointer ${
                isMultiSelect
                  ? 'bg-blue-600/30 text-blue-400 font-semibold border border-blue-500/50'
                  : 'hover:bg-[#202634] text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>

            {/* Hand Tool (Moved to left side for extra right-side room) */}
            <button
              onClick={() => setIsTimelinePanMode(!isTimelinePanMode)}
              className={`p-1.5 rounded cursor-pointer transition-all flex items-center space-x-1.5 ${
                isTimelinePanMode
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400 font-medium'
                  : 'hover:text-white hover:bg-[#202634] text-slate-400'
              }`}
              title="Hand Tool (Pan Timeline) - Click & drag to pan left/right"
            >
              <Hand className="w-3.5 h-3.5" />
              {isTimelinePanMode && (
                <span className="text-[10px] font-semibold text-blue-100 hidden sm:inline">Hand</span>
              )}
            </button>

            {/* Properties Toggle Button */}
            <button
              onClick={onOpenProperties}
              className={`p-1.5 rounded cursor-pointer transition-all flex items-center space-x-1 ${
                isPropertiesOpen
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'hover:text-white hover:bg-[#202634] text-slate-400'
              }`}
              title="Toggle Properties Panel"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-medium hidden sm:inline">Properties</span>
            </button>

            {/* Split Layer at Playhead */}
            <button
              onClick={handleSplitSelected}
              disabled={!canSplit}
              className={`p-1.5 rounded cursor-pointer transition-all flex items-center space-x-1 ${
                canSplit
                  ? 'bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 border border-amber-500/40 font-semibold'
                  : 'opacity-40 text-slate-500 cursor-not-allowed'
              }`}
              title={
                canSplit
                  ? `Split layer at red playhead line (${currentTime.toFixed(2)}s)`
                  : 'Move red playhead over a layer to split'
              }
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline font-semibold">Split</span>
            </button>

            {/* Quick Scroll to Timeline Start (00:00) */}
            <button
              onClick={() => {
                if (timelineScrollRef.current) {
                  timelineScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                }
              }}
              className="p-1.5 hover:text-white text-slate-400 rounded hover:bg-[#202634] cursor-pointer transition-colors"
              title="Jump to Start (00:00)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Quick Scroll to Timeline End (Last Layer) */}
            <button
              onClick={() => {
                if (timelineScrollRef.current) {
                  timelineScrollRef.current.scrollTo({ left: timelineScrollRef.current.scrollWidth, behavior: 'smooth' });
                }
              }}
              className="p-1 sm:p-1.5 hover:text-white text-slate-400 rounded hover:bg-[#202634] cursor-pointer transition-colors"
              title="Jump to End (Last Layer)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Tools: Undo & Redo (safely inside screen on mobile) */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 text-slate-300 shrink-0">
            <button
              onClick={onUndo}
              disabled={canUndo === false}
              className="p-1 sm:p-1.5 hover:text-white text-slate-300 disabled:opacity-30 rounded hover:bg-[#202634] transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onRedo}
              disabled={canRedo === false}
              className="p-1 sm:p-1.5 hover:text-white text-slate-300 disabled:opacity-30 rounded hover:bg-[#202634] transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* 3. MULTI-TRACK TIMELINE BODY (Screenshot 5 & 6) */}
      {!isCollapsed && (
        <div
          ref={timelineScrollRef}
          onMouseDown={handleTimelineMouseDown}
          onTouchStart={handleTimelineTouchStart}
          onClick={e => {
            if (isTimelinePanMode) return;
            if (e.target === e.currentTarget) {
              onSelectElement(null);
              onSelectAudio?.(null);
            }
          }}
          className={`flex-1 overflow-x-auto overflow-y-auto bg-[#10141c] relative select-none ${
            isTimelinePanMode ? (isTimelinePanning ? 'cursor-grabbing select-none' : 'cursor-grab') : 'cursor-default'
          }`}
        >
          <div
            style={{
              width: `${totalTimelineWidthPx}px`,
              minWidth: `${totalTimelineWidthPx}px`,
            }}
            className="flex flex-col min-h-full relative shrink-0"
          >
            {/* Hand Tool Pan Overlay: When active, clicking and dragging anywhere on the timeline surface pans smoothly without triggering clip edits */}
            {isTimelinePanMode && (
              <div
                onMouseDown={handleTimelineMouseDown}
                onTouchStart={handleTimelineTouchStart}
                className={`absolute inset-0 z-50 select-none ${
                  isTimelinePanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                title="Hand Tool Active: Press and drag left/right to move through the timeline"
              />
            )}
            {/* TIME RULER (Sticky to top with sticky left corner) */}
            <div className="h-6 bg-[#161a24] border-b border-[#222834] flex items-center sticky top-0 z-40 select-none shrink-0">
              {/* Left Header Corner (Screenshot 5: v84.2.5 Layers) - Hides to the left when isLayerHeadersVisible is false */}
              <div
                className={`transition-all duration-200 shrink-0 bg-[#181d28] h-full sticky left-0 z-50 flex items-center justify-between text-[10px] font-mono text-slate-400 ${
                  isLayerHeadersVisible
                    ? 'w-40 sm:w-44 px-3 border-r border-[#222834] opacity-100'
                    : 'w-0 max-w-0 p-0 overflow-hidden border-r-0 opacity-0 pointer-events-none'
                }`}
              >
                <span className="italic text-slate-500 font-semibold truncate">v84.2.5</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold truncate">Layers</span>
              </div>

              {/* Ruler Track with Seconds */}
              <div
                ref={rulerRef}
                onPointerDown={handleRulerPointerDown}
                className="flex-1 h-full relative cursor-pointer overflow-hidden touch-none select-none"
                style={{ touchAction: 'none' }}
              >
                {timelineTicks.map((t, idx) => {
                  const tickPct = (t.time / duration) * 100;
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 flex flex-col justify-between"
                      style={{ left: `${tickPct}%` }}
                    >
                      <span className={`text-[9px] font-mono pl-1 ${t.isMajor ? 'text-slate-300 font-semibold' : 'text-slate-500'}`}>
                        {t.label}
                      </span>
                      <div className={`w-px ${t.isMajor ? 'h-2.5 bg-slate-500' : 'h-1.5 bg-slate-700'}`} />
                    </div>
                  );
                })}

                {/* White Magnetic Snap Guide Line in Ruler */}
                {alignedSnapPoint !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-50 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,1)]"
                    style={{ left: `${(alignedSnapPoint / duration) * 100}%` }}
                  >
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-white text-slate-950 font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xl border border-slate-300 flex items-center space-x-1 whitespace-nowrap z-50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block mr-0.5" />
                      <span>Align {alignedSnapPoint.toFixed(2)}s</span>
                    </div>
                  </div>
                )}

                {/* Red Draggable Playhead Pin */}
                <div
                  className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none ${
                    alignedSnapPoint !== null ? 'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,1)]' : ''
                  }`}
                  style={{ left: `${playheadPercent}%` }}
                >
                  <div
                    className={`w-3 h-3 bg-red-500 -ml-1.5 -top-1 rotate-45 shadow-md ${
                      alignedSnapPoint !== null ? 'ring-2 ring-white bg-red-400' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* DYNAMIC LAYERS TRACKS LIST (Screenshot 5: Each element has its own row) */}
            <div className="flex-1 divide-y divide-[#1e2330] relative">

              {/* TOP DROP ZONE - CREATE NEW LAYER ABOVE */}
              {draggingFeedback?.isNewTrackAbove && (
                <div className="h-9 px-3 mx-1 my-0.5 rounded border-2 border-dashed border-blue-400 bg-blue-500/20 text-blue-300 flex items-center justify-between animate-pulse shadow-lg z-30">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow">
                      +
                    </span>
                    <span className="font-semibold text-xs text-blue-100">
                      Release to create NEW Top Layer (Track 1)
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-900/80 px-2 py-0.5 rounded text-blue-200 uppercase font-semibold">
                    New Track Above
                  </span>
                </div>
              )}
            
            {unifiedTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400 select-none">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3 text-slate-400">
                  <Layers className="w-5 h-5 opacity-70" />
                </div>
                <div className="text-sm font-semibold text-slate-300 mb-1">Timeline is empty</div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Add a character, background, prop, audio, or effect to start building your scene. The newest layer will appear at the top!
                </p>
              </div>
            ) : (
              unifiedTracks.map((track, trackIdx) => {
                const isAudioTrack = track.kind === 'audio';
                const isDropTarget =
                  draggingFeedback?.mode === 'move' &&
                  draggingFeedback?.targetTrackIdx === trackIdx &&
                  !draggingFeedback.isNewTrackAbove &&
                  !draggingFeedback.isNewTrackBelow &&
                  draggingFeedback.originTrackIdx !== trackIdx;

                return (
                  <div
                    key={`track-${track.trackIndex}-${track.name}`}
                    className={`h-9 flex items-center relative transition-colors ${
                      isDropTarget ? 'bg-blue-950/70 ring-2 ring-blue-500 ring-inset z-10' : 'hover:bg-[#131720]'
                    }`}
                  >
                    {/* LEFT TRACK HEADER - Collapsible, with Move Up/Down, 3-Dots, Name, Lock, Eye, Delete */}
                    <div
                      onClick={() => {
                        const firstClip = track.clips[0];
                        if (firstClip) {
                          if (firstClip.kind === 'element') {
                            onSelectElement(firstClip.id);
                            onSelectAudio?.(null);
                          } else {
                            onSelectAudio?.(firstClip.id);
                            onSelectElement(null);
                          }
                        }
                      }}
                      className={`transition-all duration-200 shrink-0 bg-[#181d28] hover:bg-[#1d2332] cursor-pointer h-full sticky left-0 z-30 flex items-center justify-between text-xs font-medium ${
                        isLayerHeadersVisible
                          ? 'w-40 sm:w-44 px-2 border-r border-[#222834] opacity-100'
                          : 'w-0 max-w-0 p-0 overflow-hidden border-r-0 opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="flex items-center space-x-1 truncate min-w-0 flex-1">
                        {/* 3-Dots Context Menu Button */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const btnRect = e.currentTarget.getBoundingClientRect();
                            const vh = window.innerHeight;
                            const vw = window.innerWidth;
                            const estimatedMenuHeight = 295;
                            const estimatedMenuWidth = 190;
                            const margin = 8;

                            const spaceBelow = vh - btnRect.bottom;
                            const spaceAbove = btnRect.top;

                            let top: number;
                            // Intelligently check if menu fits below or above so it never goes off-screen
                            if (spaceBelow >= estimatedMenuHeight) {
                              top = btnRect.bottom + 4;
                            } else if (spaceAbove >= estimatedMenuHeight) {
                              top = btnRect.top - estimatedMenuHeight - 4;
                            } else {
                              // If neither fits completely, place where more space exists and clamp safely
                              if (spaceAbove > spaceBelow) {
                                top = Math.max(margin, btnRect.top - estimatedMenuHeight - 4);
                              } else {
                                top = Math.max(margin, vh - estimatedMenuHeight - margin);
                              }
                            }

                            let left = btnRect.left;
                            if (left + estimatedMenuWidth > vw - margin) {
                              left = Math.max(margin, vw - estimatedMenuWidth - margin);
                            }

                            setMenuPosition({ top: Math.round(top), left: Math.round(left) });
                            setActiveMenuId(track.clips[0]?.id || null);
                            setActiveMenuTrackIndex(trackIdx);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 cursor-pointer shrink-0"
                          title="Layer Options"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>

                        {/* Move Track Up / Down Reorder Buttons */}
                        <div className="flex flex-col -space-y-1 shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleMoveTrack(track.trackIndex, 'up');
                            }}
                            disabled={trackIdx === 0}
                            className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                            title="Move layer up"
                          >
                            <ChevronUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleMoveTrack(track.trackIndex, 'down');
                            }}
                            disabled={trackIdx === unifiedTracks.length - 1}
                            className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                            title="Move layer down"
                          >
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Track Type Icon */}
                        {isAudioTrack ? (
                          <Music className="w-3 h-3 text-lime-400 shrink-0" />
                        ) : track.clips[0]?.element?.type === 'camera' ? (
                          <Camera className="w-3 h-3 text-red-400 shrink-0" />
                        ) : track.clips[0]?.element?.type === 'character' ? (
                          <User className="w-3 h-3 text-blue-400 shrink-0" />
                        ) : track.clips[0]?.element?.type === 'effect' ? (
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        ) : track.clips[0]?.element?.type === 'speechBubble' || track.clips[0]?.element?.type === 'text' ? (
                          <Type className="w-3 h-3 text-purple-400 shrink-0" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}

                        {/* Inline Editable Track Name */}
                        {editingNameId === track.clips[0]?.id ? (
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={e => setEditingNameValue(e.target.value)}
                            onBlur={() => handleCommitRename(track.clips[0]?.id, isAudioTrack)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleCommitRename(track.clips[0]?.id, isAudioTrack);
                              if (e.key === 'Escape') setEditingNameId(null);
                            }}
                            autoFocus
                            className="bg-[#0f131a] text-white text-[11px] px-1 py-0.5 rounded border border-blue-500 w-20 focus:outline-none"
                          />
                        ) : (
                          <span
                            onClick={e => {
                              e.stopPropagation();
                              if (track.clips[0]) handleStartRename(track.clips[0].id, track.name);
                            }}
                            title="Click to rename"
                            className="truncate text-[11px] text-slate-300 hover:text-white cursor-pointer select-none"
                          >
                            {track.name}
                          </span>
                        )}
                      </div>

                      {/* Header Controls: Mute, Lock, Visibility, Delete */}
                      <div className="flex items-center space-x-0.5 shrink-0 ml-1">
                        {isAudioTrack && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              track.clips.forEach(c => {
                                if (c.audio) onUpdateAudioTrack(c.id, { isMuted: !track.isMuted });
                              });
                            }}
                            className={`p-1 rounded hover:bg-slate-700/50 cursor-pointer ${
                              track.isMuted ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                            }`}
                            title={track.isMuted ? 'Unmute' : 'Mute'}
                          >
                            {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                        )}

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            track.clips.forEach(c => {
                              if (c.kind === 'element') onUpdateElement(c.id, { visible: !track.isVisible });
                              else onUpdateAudioTrack(c.id, { visible: !track.isVisible });
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 cursor-pointer"
                          title={track.isVisible ? 'Hide layer' : 'Show layer'}
                        >
                          {track.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-red-400" />}
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            track.clips.forEach(c => {
                              if (c.kind === 'element') onUpdateElement(c.id, { locked: !track.isLocked });
                              else onUpdateAudioTrack(c.id, { locked: !track.isLocked });
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 cursor-pointer"
                          title={track.isLocked ? 'Unlock layer' : 'Lock layer'}
                        >
                          {track.isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            track.clips.forEach(c => {
                              if (c.kind === 'element') onDeleteElement(c.id);
                              else onDeleteAudioTrack(c.id);
                            });
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700/50 cursor-pointer"
                          title="Delete track"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* RIGHT TRACK LANE: Clips, Head-to-Head Connector, Red Playhead */}
                    <div
                      onPointerDown={e => {
                        if (e.target === e.currentTarget) {
                          handleTrackPointerDown(e);
                        }
                      }}
                      className="flex-1 h-full relative cursor-pointer z-10"
                    >
                      {/* Background Ticks */}
                      {timelineTicks.map((t, idx) => (
                        <div
                          key={idx}
                          className={`absolute top-0 bottom-0 pointer-events-none ${
                            t.isMajor ? 'border-r border-[#191e2b]' : 'border-r border-[#141822]'
                          }`}
                          style={{ left: `${(t.time / duration) * 100}%` }}
                        />
                      ))}

                      {/* CLIPS ON THIS TRACK */}
                      {track.clips.map(clip => {
                        const startPct = (clip.startTime / duration) * 100;
                        const widthPct = (clip.duration / duration) * 100;
                        const isSelected =
                          clip.kind === 'element'
                            ? clip.id === selectedElementId
                            : clip.id === selectedAudioId;
                        const isLocked = track.isLocked;
                        const isClipBeingMoved = draggingFeedback?.id === clip.id && draggingFeedback.mode === 'move';

                        if (clip.kind === 'audio' && clip.audio) {
                          const numBars = Math.max(24, Math.floor(clip.duration * 16 * timelineZoom));

                          return (
                            <div
                              key={clip.id}
                              onClick={e => {
                                e.stopPropagation();
                                onSelectAudio?.(clip.id);
                                onSelectElement(null);
                              }}
                              onPointerDown={e => handleAudioClipPointerDown(e, clip.audio!, 'move')}
                              onDoubleClick={e => {
                                e.stopPropagation();
                                onOpenProperties?.();
                              }}
                              className={`absolute top-1 bottom-1 rounded flex items-center justify-between text-xs overflow-hidden cursor-grab active:cursor-grabbing select-none transition-shadow ${
                                isSelected
                                  ? 'bg-[#15803d] text-white ring-2 ring-lime-400 ring-offset-1 ring-offset-[#10141c] z-20 shadow-lg'
                                  : 'bg-[#166534] hover:bg-[#15803d] text-lime-100 z-10 border border-lime-600/40'
                              } ${isClipBeingMoved ? 'scale-[1.02] shadow-2xl z-50 ring-2 ring-lime-300' : ''}`}
                              style={{
                                left: `${startPct}%`,
                                width: `${widthPct}%`,
                                minWidth: '4px',
                                touchAction: 'none',
                                ...(isClipBeingMoved
                                  ? {
                                      transform: `translateY(${draggingFeedback.dragOffsetY || 0}px)`,
                                      zIndex: 50,
                                    }
                                  : {}),
                              }}
                            >
                              {/* Left Trim Handle */}
                              {!isLocked && (
                                <div
                                  onPointerDown={e => handleAudioClipPointerDown(e, clip.audio!, 'trim-start')}
                                  className="w-3 h-full absolute left-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-20"
                                  style={{ touchAction: 'none' }}
                                  title="Trim start"
                                >
                                  <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                                </div>
                              )}

                              <div className="flex items-center space-x-1.5 truncate px-2">
                                <Music className="w-3 h-3 text-lime-200 shrink-0" />
                                <div className="flex items-center space-x-0.5 h-3 shrink-0 opacity-90">
                                  {Array.from({ length: Math.min(200, numBars) }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-0.5 bg-lime-100 rounded-full shrink-0"
                                      style={{ height: `${Math.max(2.5, ((i * 13) % 10) + 2)}px` }}
                                    />
                                  ))}
                                </div>
                                <span className="truncate text-[11px] font-medium text-lime-100">{clip.name}</span>
                              </div>

                              {/* Right Trim Handle */}
                              {!isLocked && (
                                <div
                                  onPointerDown={e => handleAudioClipPointerDown(e, clip.audio!, 'trim-end')}
                                  className="w-3 h-full absolute right-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-20"
                                  style={{ touchAction: 'none' }}
                                  title="Trim end"
                                >
                                  <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                                </div>
                              )}

                              {/* Tooltip feedback */}
                              {draggingFeedback?.id === clip.id && (
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-lime-300 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl border border-lime-500/60 whitespace-nowrap z-50 pointer-events-none flex items-center space-x-1">
                                  <span>{draggingFeedback.startTime.toFixed(1)}s - {(draggingFeedback.startTime + draggingFeedback.duration).toFixed(1)}s</span>
                                  {draggingFeedback.isNewTrackAbove ? (
                                    <span className="bg-blue-600 text-white text-[9px] px-1 rounded font-semibold ml-1">New Top Track</span>
                                  ) : draggingFeedback.isNewTrackBelow ? (
                                    <span className="bg-blue-600 text-white text-[9px] px-1 rounded font-semibold ml-1">New Bottom Track</span>
                                  ) : draggingFeedback.targetTrackIdx !== undefined && draggingFeedback.targetTrackIdx !== draggingFeedback.originTrackIdx ? (
                                    <span className="bg-blue-800 text-blue-200 text-[9px] px-1 rounded font-semibold ml-1">Track {(draggingFeedback.targetTrackIdx ?? 0) + 1}</span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Visual element clip
                        const el = clip.element!;
                        let clipColor = 'bg-blue-600 text-white';
                        let IconComp = User;

                        if (el.type === 'camera') {
                          clipColor = 'bg-red-600 text-white border border-red-400/80 shadow-xs';
                          IconComp = Camera;
                        } else if (el.type === 'effect') {
                          clipColor = 'bg-[#333d4f] text-slate-200 border border-slate-600/40';
                          IconComp = Sparkles;
                        } else if (el.type === 'character') {
                          clipColor = 'bg-[#1d4ed8] text-white';
                          IconComp = User;
                        } else if (el.type === 'image' && el.isBackground) {
                          clipColor = 'bg-[#3f6212] text-lime-100 border border-lime-800/40';
                          IconComp = ImageIcon;
                        } else if (el.type === 'image') {
                          const isGif = el.name.toLowerCase().endsWith('.gif') || (el.mediaUrl && (el.mediaUrl.toLowerCase().includes('.gif') || el.mediaUrl.includes('data:image/gif')));
                          clipColor = isGif ? 'bg-[#0f766e] text-teal-100 border border-teal-500/40' : 'bg-[#15803d] text-emerald-100';
                          IconComp = ImageIcon;
                        } else if (el.type === 'speechBubble' || el.type === 'text') {
                          clipColor = 'bg-[#b45309] text-amber-100';
                          IconComp = Type;
                        }

                        return (
                          <div
                            key={clip.id}
                            onClick={e => {
                              e.stopPropagation();
                              onSelectElement(clip.id);
                              onSelectAudio?.(null);
                            }}
                            onPointerDown={e => handleClipPointerDown(e, el, 'move')}
                            onDoubleClick={e => {
                              e.stopPropagation();
                              onOpenProperties?.();
                            }}
                            className={`absolute top-1 bottom-1 rounded flex items-center justify-between text-xs overflow-hidden cursor-grab active:cursor-grabbing select-none transition-shadow ${clipColor} ${
                              isSelected
                                ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#10141c] z-20 shadow-lg'
                                : 'z-10'
                            } ${isClipBeingMoved ? 'scale-[1.02] shadow-2xl z-50 ring-2 ring-blue-300' : ''}`}
                            style={{
                              left: `${startPct}%`,
                              width: `${widthPct}%`,
                              minWidth: '4px',
                              touchAction: 'none',
                              ...(isClipBeingMoved
                                ? {
                                    transform: `translateY(${draggingFeedback.dragOffsetY || 0}px)`,
                                    zIndex: 50,
                                  }
                                : {}),
                            }}
                          >
                            {/* Left Trim Handle */}
                            {!isLocked && (
                              <div
                                onPointerDown={e => handleClipPointerDown(e, el, 'trim-start')}
                                className="w-3 h-full absolute left-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-20"
                                style={{ touchAction: 'none' }}
                                title="Trim start"
                              >
                                <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                              </div>
                            )}

                            <div className="flex items-center space-x-1.5 truncate px-2.5">
                              <IconComp className="w-3 h-3 shrink-0 opacity-85" />
                              <span className="truncate text-[11px] select-none">{clip.name}</span>
                              {el.type === 'image' && (el.name.toLowerCase().endsWith('.gif') || (el.mediaUrl && (el.mediaUrl.toLowerCase().includes('.gif') || el.mediaUrl.includes('data:image/gif')))) && (
                                <span className="text-[9px] px-1 py-0.2 bg-teal-900/80 text-teal-200 font-bold rounded shrink-0 border border-teal-400/40">
                                  GIF
                                </span>
                              )}
                            </div>

                            {/* Right Trim Handle */}
                            {!isLocked && (
                              <div
                                onPointerDown={e => handleClipPointerDown(e, el, 'trim-end')}
                                className="w-3 h-full absolute right-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-20"
                                style={{ touchAction: 'none' }}
                                title="Trim end"
                              >
                                <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                              </div>
                            )}

                            {/* Tooltip feedback */}
                            {draggingFeedback?.id === clip.id && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl border border-blue-500/60 whitespace-nowrap z-50 pointer-events-none flex items-center space-x-1">
                                <span>{draggingFeedback.startTime.toFixed(1)}s - {(draggingFeedback.startTime + draggingFeedback.duration).toFixed(1)}s</span>
                                {draggingFeedback.isHeadToHeadSnapped ? (
                                  <span className="bg-emerald-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shadow-sm flex items-center gap-0.5">
                                    <span>+</span> Snapped Flush
                                  </span>
                                ) : draggingFeedback.isNewTrackAbove ? (
                                  <span className="bg-blue-600 text-white text-[9px] px-1 rounded font-semibold ml-1">New Top Track</span>
                                ) : draggingFeedback.isNewTrackBelow ? (
                                  <span className="bg-blue-600 text-white text-[9px] px-1 rounded font-semibold ml-1">New Bottom Track</span>
                                ) : draggingFeedback.targetTrackIdx !== undefined && draggingFeedback.targetTrackIdx !== draggingFeedback.originTrackIdx ? (
                                  <span className="bg-blue-800 text-blue-200 text-[9px] px-1 rounded font-semibold ml-1">Track {(draggingFeedback.targetTrackIdx ?? 0) + 1}</span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* HEAD-TO-HEAD CONNECTED '+' BADGE: Rendered when two consecutive clips touch */}
                      {track.clips.slice(0, -1).map((clipA, cIdx) => {
                        const clipB = track.clips[cIdx + 1];
                        const endA = Math.round((clipA.startTime + clipA.duration) * 1000) / 1000;
                        const startB = Math.round(clipB.startTime * 1000) / 1000;
                        const gap = startB - endA;
                        const isTouching = Math.abs(gap) <= 0.05;
                        const isNear = gap > 0.05 && gap <= 0.35; // Proximity range to snap with 1 click
                        if (!isTouching && !isNear) return null;
                        const connectPct = (endA / duration) * 100;

                        return (
                          <div
                            key={`touch-${clipA.id}-${clipB.id}`}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-40 flex items-center justify-center ${
                              isTouching ? 'pointer-events-none' : 'cursor-pointer group'
                            }`}
                            style={{ left: `${connectPct}%` }}
                            title={isTouching ? "Head-to-head seamless join (+)" : "Click to snap seamlessly flush (+)"}
                            onClick={(e) => {
                              if (isTouching) return;
                              e.stopPropagation();
                              const flushStart = Number(endA.toFixed(3));
                              if (clipB.kind === 'element') {
                                onUpdateElement(clipB.id, { startTime: flushStart });
                              } else if (clipB.kind === 'audio') {
                                onUpdateAudioTrack(clipB.id, { startTime: flushStart });
                              }
                            }}
                          >
                            <div
                              className={`w-4 h-4 rounded-full font-black text-[11px] flex items-center justify-center shadow-lg transition-all group-hover:scale-125 ${
                                isTouching
                                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300/90 shadow-emerald-500/40'
                                  : 'bg-emerald-800/80 text-emerald-200 ring-1 ring-emerald-400/60 animate-pulse'
                              }`}
                            >
                              +
                            </div>
                          </div>
                        );
                      })}

                      {/* White Magnetic Snap Guide Line (Exact Layer Alignment) */}
                      {alignedSnapPoint !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-30 shadow-[0_0_8px_rgba(255,255,255,1)]"
                          style={{ left: `${(alignedSnapPoint / duration) * 100}%` }}
                        />
                      )}

                      {/* Red Playhead Guide Line */}
                      <div
                        className={`absolute top-0 bottom-0 w-0.5 pointer-events-none z-30 transition-colors ${
                          alignedSnapPoint !== null
                            ? 'bg-red-500 ring-1 ring-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                            : 'bg-red-500/50'
                        }`}
                        style={{ left: `${playheadPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}

            {/* BOTTOM DROP ZONE - CREATE NEW LAYER BELOW */}
            {draggingFeedback?.isNewTrackBelow && (
              <div className="h-9 px-3 mx-1 my-0.5 rounded border-2 border-dashed border-blue-400 bg-blue-500/20 text-blue-300 flex items-center justify-between animate-pulse shadow-lg z-30">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow">
                    +
                  </span>
                  <span className="font-semibold text-xs text-blue-100">
                    Release to create NEW Bottom Layer (Track {unifiedTracks.length + 1})
                  </span>
                </div>
                <span className="text-[10px] bg-blue-900/80 px-2 py-0.5 rounded text-blue-200 uppercase font-semibold">
                  New Track Below
                </span>
              </div>
            )}



            {/* Empty space below tracks to allow deselecting by clicking empty timeline area */}
            <div
              className="flex-1 min-h-[50px] cursor-default"
              onClick={() => {
                onSelectElement(null);
                onSelectAudio?.(null);
              }}
            />

          </div>

          </div>

          {/* FLOATING 3-DOTS CONTEXT DROPDOWN MENU (Screenshot 6: Bring To Front, Send To Back, Bring Forward, Send Backward, Delete) */}
          {activeMenuId && menuPosition && (
            <div
              ref={layerMenuRef}
              className="fixed bg-[#181d28]/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 min-w-[185px] max-w-[240px] max-h-[calc(100vh-20px)] overflow-y-auto overscroll-contain timeline-menu-container animate-fade-in"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/50 mb-1 flex items-center justify-between select-none">
                <span>Layer Options</span>
                <span className="text-[9px] text-slate-500 font-normal">
                  Layer {(activeMenuTrackIndex ?? 0) + 1}
                </span>
              </div>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'moveToNewTrackAbove', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer text-blue-300 transition-colors"
              >
                <ArrowUpToLine className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Move to New Layer Above</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'moveToNewTrackBelow', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer text-indigo-300 transition-colors"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Move to New Layer Below</span>
              </button>

              <div className="h-px bg-slate-700/60 my-1" />

              <button
                onClick={() => handleLayerAction(activeMenuId, 'bringToFront', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
              >
                <ChevronsUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Bring To Front</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'sendToBack', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
              >
                <ChevronsDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Send To Back</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'bringForward', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Move Layer Up</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'sendBackward', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Move Layer Down</span>
              </button>

              <div className="h-px bg-slate-700/60 my-1" />

              <button
                onClick={() => handleLayerAction(activeMenuId, 'duplicate', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 text-blue-300 hover:text-white flex items-center space-x-2.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Duplicate at Playhead</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'delete', activeMenuTrackIndex ?? undefined)}
                className="w-full text-left px-3 py-1.5 hover:bg-red-600/30 text-red-400 hover:text-red-200 flex items-center space-x-2.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
