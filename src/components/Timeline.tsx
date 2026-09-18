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
  onDuplicateElement?: (id: string) => void;
  onUpdateAudioTrack: (id: string, updates: Partial<AudioTrackItem>) => void;
  onDeleteAudioTrack: (id: string) => void;
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
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

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.timeline-menu-container')) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Handle Scrubbing on Ruler (Touch & Mouse for ALL devices)
  const handleRulerPointerDown = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * duration);
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
      onSeek(movePct * duration);
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

  // Move an entire track row up or down
  const handleMoveTrack = (trackIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? trackIndex - 1 : trackIndex + 1;
    if (targetIndex < 0 || targetIndex >= unifiedTracks.length) return;

    const currentTrack = unifiedTracks[trackIndex];
    const otherTrack = unifiedTracks[targetIndex];
    if (!currentTrack || !otherTrack) return;

    // Swap trackIndex for all clips on both tracks
    currentTrack.clips.forEach(clip => {
      if (clip.kind === 'element') {
        onUpdateElement(clip.id, {
          trackIndex: otherTrack.trackIndex,
          zIndex: (unifiedTracks.length - otherTrack.trackIndex) * 10,
        });
      } else {
        onUpdateAudioTrack(clip.id, { trackIndex: otherTrack.trackIndex });
      }
    });

    otherTrack.clips.forEach(clip => {
      if (clip.kind === 'element') {
        onUpdateElement(clip.id, {
          trackIndex: currentTrack.trackIndex,
          zIndex: (unifiedTracks.length - currentTrack.trackIndex) * 10,
        });
      } else {
        onUpdateAudioTrack(clip.id, { trackIndex: currentTrack.trackIndex });
      }
    });
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
        const newDur = Math.max(0.2, Math.min(maxDur, initialDuration + deltaSec));
        const roundedDur = roundTime(newDur);
        onUpdateElement(el.id, { duration: roundedDur });
        setDraggingFeedback({
          id: el.id,
          name: el.name,
          kind: 'element',
          mode: 'trim-end',
          startTime: initialStart,
          duration: roundedDur,
        });
      } else if (mode === 'trim-start') {
        // Stretch or shrink from the left edge
        const proposedStart = Math.max(0, Math.min(initialStart + initialDuration - 0.2, initialStart + deltaSec));
        const diff = proposedStart - initialStart;
        const newDur = Math.max(0.2, initialDuration - diff);
        const roundedStart = roundTime(proposedStart);
        const roundedDur = roundTime(newDur);
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
        const newDur = Math.max(0.2, Math.min(maxDur, initialDuration + deltaSec));
        const roundedDur = roundTime(newDur);
        onUpdateAudioTrack(track.id, { duration: roundedDur });
        setDraggingFeedback({
          id: track.id,
          name: track.name,
          kind: 'audio',
          mode: 'trim-end',
          startTime: initialStart,
          duration: roundedDur,
        });
      } else if (mode === 'trim-start') {
        // Stretch or shrink from the left edge
        const proposedStart = Math.max(0, Math.min(initialStart + initialDuration - 0.2, initialStart + deltaSec));
        const diff = proposedStart - initialStart;
        const newDur = Math.max(0.2, initialDuration - diff);
        const roundedStart = roundTime(proposedStart);
        const roundedDur = roundTime(newDur);
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

  // Layer Reordering Handlers (Supports track moving, front/back, duplicate, delete)
  const handleLayerAction = (
    id: string,
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
      | 'delete'
  ) => {
    setActiveMenuId(null);

    const isAudio = currentScene.audioTracks?.some(tr => tr.id === id);

    // If deleting
    if (action === 'delete') {
      if (isAudio) {
        onDeleteAudioTrack(id);
      } else {
        onDeleteElement(id);
      }
      return;
    }

    // If splitting
    if (action === 'split') {
      handleSplitSelected();
      return;
    }

    // Find current clip and its track row in unifiedTracks
    const targetTrackIdx = unifiedTracks.findIndex(t => t.clips.some(c => c.id === id));
    if (targetTrackIdx === -1) return;

    const targetTrack = unifiedTracks[targetTrackIdx];
    const targetClip = targetTrack.clips.find(c => c.id === id);
    if (!targetClip) return;

    let newTracks: { clips: UnifiedClipItem[] }[] = unifiedTracks.map(t => ({
      clips: [...t.clips],
    }));

    if (action === 'bringToFront') {
      // Move clip to its own track at the very top (Row 0)
      newTracks[targetTrackIdx].clips = newTracks[targetTrackIdx].clips.filter(c => c.id !== id);
      newTracks = newTracks.filter(t => t.clips.length > 0);
      newTracks.unshift({ clips: [targetClip] });
    } else if (action === 'sendToBack') {
      // Move clip to its own track at the very bottom (Last Row)
      newTracks[targetTrackIdx].clips = newTracks[targetTrackIdx].clips.filter(c => c.id !== id);
      newTracks = newTracks.filter(t => t.clips.length > 0);
      newTracks.push({ clips: [targetClip] });
    } else if (action === 'bringForward' || action === 'moveTrackUp') {
      if (targetTrack.clips.length > 1) {
        newTracks[targetTrackIdx].clips = newTracks[targetTrackIdx].clips.filter(c => c.id !== id);
        const insertIdx = Math.max(0, targetTrackIdx);
        newTracks.splice(insertIdx, 0, { clips: [targetClip] });
      } else if (targetTrackIdx > 0) {
        const temp = newTracks[targetTrackIdx];
        newTracks[targetTrackIdx] = newTracks[targetTrackIdx - 1];
        newTracks[targetTrackIdx - 1] = temp;
      }
    } else if (action === 'sendBackward' || action === 'moveTrackDown') {
      if (targetTrack.clips.length > 1) {
        newTracks[targetTrackIdx].clips = newTracks[targetTrackIdx].clips.filter(c => c.id !== id);
        const insertIdx = Math.min(newTracks.length, targetTrackIdx + 1);
        newTracks.splice(insertIdx, 0, { clips: [targetClip] });
      } else if (targetTrackIdx < newTracks.length - 1) {
        const temp = newTracks[targetTrackIdx];
        newTracks[targetTrackIdx] = newTracks[targetTrackIdx + 1];
        newTracks[targetTrackIdx + 1] = temp;
      }
    } else if (action === 'moveToNewTrackAbove') {
      newTracks[targetTrackIdx].clips = newTracks[targetTrackIdx].clips.filter(c => c.id !== id);
      newTracks = newTracks.filter(t => t.clips.length > 0);
      const insertIdx = Math.max(0, targetTrackIdx);
      newTracks.splice(insertIdx, 0, { clips: [targetClip] });
    } else if (action === 'moveToNewTrackBelow') {
      newTracks[targetTrackIdx].clips = newTracks[targetTrackIdx].clips.filter(c => c.id !== id);
      newTracks = newTracks.filter(t => t.clips.length > 0);
      const insertIdx = Math.min(newTracks.length, targetTrackIdx + 1);
      newTracks.splice(insertIdx, 0, { clips: [targetClip] });
    }

    // Now update trackIndex and zIndex for all elements and audio tracks
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

  const activeClipForSplit =
    selectedElement ||
    selectedAudio ||
    currentScene.elements.find(el => currentTime > el.startTime + 0.05 && currentTime < el.startTime + el.duration - 0.05) ||
    currentScene.audioTracks?.find(at => currentTime > at.startTime + 0.05 && currentTime < at.startTime + at.duration - 0.05);

  const canSplit = Boolean(
    activeClipForSplit &&
    currentTime > activeClipForSplit.startTime + 0.05 &&
    currentTime < activeClipForSplit.startTime + activeClipForSplit.duration - 0.05
  );

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / duration) * 100));

  return (
    <div
      className={`bg-[#12161f] border-t border-[#222834] flex flex-col select-none transition-all duration-200 z-20 shrink-0 shadow-lg text-slate-200 ${
        isCollapsed ? 'h-8' : 'h-64 sm:h-72'
      }`}
    >
      {/* 1. SCENE TABS BAR (Screenshot 5: Scene1 [ ⋮ ] + New Scene) */}
      <div className={`h-8 bg-[#181d28] px-3 flex items-center justify-between text-xs shrink-0 ${!isCollapsed ? 'border-b border-[#242b3a]' : ''}`}>
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelectScene(Math.max(0, activeSceneIndex - 1))}
            disabled={activeSceneIndex === 0}
            className="hidden sm:inline-flex p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

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
                className={`flex items-center justify-center space-x-1 px-2 py-1 sm:px-3 rounded text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? `${colorTheme.active} scale-105 shadow-sm`
                    : `${colorTheme.inactive}`
                }`}
              >
                {/* On mobile: ONLY 🖼️ icon, no text or numbers (1, 2) */}
                <span className="sm:hidden text-sm leading-none select-none">
                  🖼️
                </span>

                {/* On desktop: 🖼️ icon + Scene Name + Duration */}
                <div className="hidden sm:flex items-center space-x-1.5">
                  <span className="text-xs leading-none">🖼️</span>
                  <span>{sc.name || `Scene ${idx + 1}`}</span>
                  <span className="text-[10px] font-mono opacity-75">({sc.duration}s)</span>
                </div>

                {scenes.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteScene(idx);
                    }}
                    className="hidden sm:inline-flex p-0.5 text-slate-400 hover:text-red-400 rounded cursor-pointer ml-1"
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
            title="Add New Scene (Max 2m per scene)"
            className="flex items-center justify-center p-1.5 bg-[#1c222e] hover:bg-[#252c3b] text-slate-300 rounded border border-[#2e3748] transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
          </button>

          {/* Active Scene Duration (Max 120s / 2m per scene) */}
          <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 bg-[#121622] rounded border border-[#2e3748] text-xs text-slate-300 select-none">
            <span className="text-[11px] text-slate-400 font-medium">Duration:</span>
            <button
              onClick={() => onUpdateScene?.(activeSceneIndex, { duration: Math.max(1, currentScene.duration - 5) })}
              className="px-1 py-0.5 hover:bg-[#222a3a] rounded text-slate-300 hover:text-white cursor-pointer"
              title="Decrease Scene Duration -5s"
            >
              -5s
            </button>
            <input
              type="number"
              min={1}
              max={120}
              value={currentScene.duration}
              onChange={e => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  onUpdateScene?.(activeSceneIndex, { duration: Math.max(1, Math.min(120, val)) });
                }
              }}
              className="w-10 bg-[#0d1017] border border-slate-700 text-center font-mono font-bold text-amber-300 rounded px-1 py-0.5 text-xs outline-none focus:border-amber-400"
              title="Current scene duration in seconds (Max 120s / 2m)"
            />
            <span className="font-mono text-xs text-slate-400">s</span>
            <button
              onClick={() => onUpdateScene?.(activeSceneIndex, { duration: Math.min(120, currentScene.duration + 5) })}
              disabled={currentScene.duration >= 120}
              className="px-1 py-0.5 hover:bg-[#222a3a] rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Increase Scene Duration +5s (Max 120s / 2m)"
            >
              +5s
            </button>
            <span className="text-[10px] text-amber-400/80 font-mono pl-1 border-l border-slate-700" title="Max 2 minutes per scene. Add a new scene for more.">
              max 2m
            </span>
          </div>

          <button
            onClick={() => onSelectScene(Math.min(scenes.length - 1, activeSceneIndex + 1))}
            disabled={activeSceneIndex === scenes.length - 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Tools: Lock & Collapse */}
        <div className="flex items-center space-x-2 text-slate-400">
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
                  : (selectedElementId || selectedAudioId)
                    ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border border-blue-500/40'
                    : 'hover:text-white hover:bg-[#202634] text-slate-400'
              }`}
              title="Toggle Properties Panel"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-medium hidden sm:inline">Properties</span>
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

            {/* Divider after Jump to End - closes the large gap */}
            <div className="w-px h-3.5 sm:h-4 bg-slate-700/80 mx-0.5" />

            {/* Timeline Zoom: - and + with 100% display right next to Jump to End */}
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
          </div>

          {/* Quick timing fine-tune bar for selected element or audio track (hidden on mobile, visible on desktop/tablet) */}
          {(selectedElement || selectedAudio) && (
            <div className="hidden sm:flex items-center space-x-1 bg-[#10141c] px-1.5 py-0.5 rounded border border-blue-500/40 text-[11px] text-blue-200 shrink-0 select-none">
              <span className="font-semibold text-white truncate max-w-[60px] sm:max-w-[90px]">
                {selectedElement?.name || selectedAudio?.name}
              </span>
              <div className="w-px h-3 bg-slate-700 mx-0.5" />
              <span className="text-[10px] text-slate-400 hidden sm:inline">Move:</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedElement) onUpdateElement(selectedElement.id, { startTime: Math.max(0, Math.round((selectedElement.startTime - 0.5) * 10) / 10) });
                  if (selectedAudio) onUpdateAudioTrack(selectedAudio.id, { startTime: Math.max(0, Math.round((selectedAudio.startTime - 0.5) * 10) / 10) });
                }}
                className="px-1 py-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer font-mono"
                title="Nudge Left 0.5s"
              >
                ◀ -0.5s
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedElement) onUpdateElement(selectedElement.id, { startTime: Math.min(MAX_SCENE_DURATION - selectedElement.duration, Math.round((selectedElement.startTime + 0.5) * 10) / 10) });
                  if (selectedAudio) onUpdateAudioTrack(selectedAudio.id, { startTime: Math.min(MAX_SCENE_DURATION - selectedAudio.duration, Math.round((selectedAudio.startTime + 0.5) * 10) / 10) });
                }}
                className="px-1 py-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer font-mono"
                title="Nudge Right 0.5s"
              >
                +0.5s ▶
              </button>
              <div className="w-px h-3 bg-slate-700 mx-0.5" />
              <span className="text-[10px] text-slate-400 hidden sm:inline">Length:</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedElement) onUpdateElement(selectedElement.id, { duration: Math.max(0.2, Math.round((selectedElement.duration - 0.5) * 10) / 10) });
                  if (selectedAudio) onUpdateAudioTrack(selectedAudio.id, { duration: Math.max(0.2, Math.round((selectedAudio.duration - 0.5) * 10) / 10) });
                }}
                className="px-1 py-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer font-mono"
                title="Shorten Duration -0.5s"
              >
                -0.5s
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedElement) onUpdateElement(selectedElement.id, { duration: Math.min(MAX_SCENE_DURATION - selectedElement.startTime, Math.round((selectedElement.duration + 0.5) * 10) / 10) });
                  if (selectedAudio) onUpdateAudioTrack(selectedAudio.id, { duration: Math.min(MAX_SCENE_DURATION - selectedAudio.startTime, Math.round((selectedAudio.duration + 0.5) * 10) / 10) });
                }}
                className="px-1 py-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer font-mono"
                title="Lengthen Duration +0.5s (Max 120s / 2m)"
              >
                +0.5s
              </button>
            </div>
          )}

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
            <div className="h-6 bg-[#161a24] border-b border-[#222834] flex items-center sticky top-0 z-30 select-none shrink-0">
              {/* Left Header Corner (Screenshot 5: v84.2.5 Layers) - Hides to the left when isLayerHeadersVisible is false */}
              <div
                className={`transition-all duration-200 shrink-0 bg-[#181d28] h-full sticky left-0 z-40 flex items-center justify-between text-[10px] font-mono text-slate-400 ${
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

                {/* Red Draggable Playhead Pin */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40 pointer-events-none"
                  style={{ left: `${playheadPercent}%` }}
                >
                  <div className="w-3 h-3 bg-red-500 -ml-1.5 -top-1 rotate-45 shadow-md" />
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
                      className={`transition-all duration-200 shrink-0 bg-[#181d28] h-full sticky left-0 z-20 flex items-center justify-between text-xs font-medium ${
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
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({ top: rect.bottom + 4, left: rect.left });
                            setActiveMenuId(track.clips[0]?.id || null);
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
                    <div className="flex-1 h-full relative">
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
                                if (currentTime < clip.startTime || currentTime >= clip.startTime + clip.duration) {
                                  onSeek(clip.startTime);
                                }
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
                                  className="w-3 h-full absolute left-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-30"
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
                                  className="w-3 h-full absolute right-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-30"
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

                        if (el.type === 'effect') {
                          clipColor = 'bg-[#333d4f] text-slate-200 border border-slate-600/40';
                          IconComp = Sparkles;
                        } else if (el.type === 'character') {
                          clipColor = 'bg-[#1d4ed8] text-white';
                          IconComp = User;
                        } else if (el.type === 'image' && el.isBackground) {
                          clipColor = 'bg-[#3f6212] text-lime-100 border border-lime-800/40';
                          IconComp = ImageIcon;
                        } else if (el.type === 'image') {
                          clipColor = 'bg-[#15803d] text-emerald-100';
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
                              if (currentTime < clip.startTime || currentTime >= clip.startTime + clip.duration) {
                                onSeek(clip.startTime);
                              }
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
                                className="w-3 h-full absolute left-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-30"
                                style={{ touchAction: 'none' }}
                                title="Trim start"
                              >
                                <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                              </div>
                            )}

                            <div className="flex items-center space-x-1.5 truncate px-2.5">
                              <IconComp className="w-3 h-3 shrink-0 opacity-85" />
                              <span className="truncate text-[11px] select-none">{clip.name}</span>
                            </div>

                            {/* Right Trim Handle */}
                            {!isLocked && (
                              <div
                                onPointerDown={e => handleClipPointerDown(e, el, 'trim-end')}
                                className="w-3 h-full absolute right-0 top-0 cursor-ew-resize flex items-center justify-center hover:bg-white/40 text-white/80 touch-none z-30"
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

                      {/* Red Playhead Guide Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 pointer-events-none z-30"
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
              className="fixed bg-[#181d28] border border-slate-700/80 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-slate-200 min-w-[170px] timeline-menu-container"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                onClick={() => handleLayerAction(activeMenuId, 'moveToNewTrackAbove')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer text-blue-300"
              >
                <ArrowUpToLine className="w-3.5 h-3.5 text-blue-400" />
                <span>Move to New Layer Above</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'moveToNewTrackBelow')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer text-indigo-300"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400" />
                <span>Move to New Layer Below</span>
              </button>

              <div className="h-px bg-slate-700/60 my-1" />

              <button
                onClick={() => handleLayerAction(activeMenuId, 'bringToFront')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer"
              >
                <ChevronsUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Bring To Front</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'sendToBack')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer"
              >
                <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Send To Back</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'bringForward')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Move Layer Up</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'sendBackward')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5 text-purple-400" />
                <span>Move Layer Down</span>
              </button>

              <div className="h-px bg-slate-700/60 my-1" />

              <button
                onClick={() => handleLayerAction(activeMenuId, 'delete')}
                className="w-full text-left px-3 py-1.5 hover:bg-red-600/30 text-red-400 hover:text-red-200 flex items-center space-x-2.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
