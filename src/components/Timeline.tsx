import React, { useRef, useState, useEffect } from 'react';
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
  Edit2,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { STOCK_BACKGROUNDS, STOCK_AUDIO } from '../utils/mediaStock';
import { DEFAULT_CHARACTERS } from '../utils/characterPresets';

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
}

export const Timeline: React.FC<TimelineProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onAddScene,
  onDeleteScene,
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
}) => {
  const currentScene = scenes[activeSceneIndex] || scenes[0];
  const sceneDuration = currentScene?.duration || 12;

  // Calculate maximum end time across all visual elements and audio tracks
  const maxLayerEndTime = Math.max(
    sceneDuration,
    ...(currentScene?.elements || []).map(el => (el.startTime || 0) + (el.duration || 0)),
    ...(currentScene?.audioTracks || []).map(at => (at.startTime || 0) + (at.duration || 0))
  );

  // Effective duration expands so user can pan all the way to the end of the longest layer
  const duration = Math.max(sceneDuration, Math.ceil(maxLayerEndTime));

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
  const [isAddLayerOpen, setIsAddLayerOpen] = useState(false);

  // Format timecode (e.g. 00:00)
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic tick generator for Timeline Zoom
  const getTimelineTicks = () => {
    let subStep = 1;
    let majorStep = 1;
    if (timelineZoom <= 0.6) {
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
  // Base 75px per second gives comfortable visual spacing for each second marker and clip handles.
  // Scales with timelineZoom (from 0.5x to 5x).
  // Includes layer headers width and 240px extra right-side buffer to comfortably navigate past the very end of the longest layer.
  const basePixelsPerSec = 75;
  const headerOffsetPx = isLayerHeadersVisible ? 176 : 0;
  const minTrackWidthPx = Math.round(duration * basePixelsPerSec * timelineZoom);
  const totalTimelineWidthPx = minTrackWidthPx + headerOffsetPx + 240;

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.timeline-menu-container')) {
        setActiveMenuId(null);
      }
      if (!target.closest('.add-layer-container')) {
        setIsAddLayerOpen(false);
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

  // Handle Scrubbing on Ruler
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * duration);
    setIsScrubbing(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const moveX = moveEvent.clientX - rect.left;
      const movePct = Math.max(0, Math.min(1, moveX / rect.width));
      onSeek(movePct * duration);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Dragging / Trimming Element Clips on Timeline
  const handleClipMouseDown = (
    e: React.MouseEvent,
    el: StageElement,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    if (el.locked || isTimelineLocked || isTimelinePanMode) return;
    e.stopPropagation();
    onSelectElement(el.id);
    if (!rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const initialStart = el.startTime;
    const initialDuration = el.duration;

    const precision = timelineZoom >= 3.5 ? 100 : timelineZoom >= 2 ? 20 : 10;
    const roundTime = (val: number) => Math.round(val * precision) / precision;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaSec = ((moveEvent.clientX - startClientX) / rect.width) * duration;

      if (mode === 'move') {
        const newStart = Math.max(0, Math.min(duration - initialDuration, initialStart + deltaSec));
        onUpdateElement(el.id, { startTime: roundTime(newStart) });
      } else if (mode === 'trim-end') {
        const newDur = Math.max(0.5, Math.min(duration - initialStart, initialDuration + deltaSec));
        onUpdateElement(el.id, { duration: roundTime(newDur) });
      } else if (mode === 'trim-start') {
        const proposedStart = Math.max(0, Math.min(initialStart + initialDuration - 0.5, initialStart + deltaSec));
        const diff = proposedStart - initialStart;
        onUpdateElement(el.id, {
          startTime: roundTime(proposedStart),
          duration: roundTime(initialDuration - diff),
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Dragging / Trimming Audio Clips on Timeline (for precise audio syncing)
  const handleAudioClipMouseDown = (
    e: React.MouseEvent,
    track: AudioTrackItem,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    if (track.locked || isTimelineLocked || isTimelinePanMode) return;
    e.stopPropagation();
    if (!rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const initialStart = track.startTime;
    const initialDuration = track.duration;

    const precision = timelineZoom >= 3.5 ? 100 : timelineZoom >= 2 ? 20 : 10;
    const roundTime = (val: number) => Math.round(val * precision) / precision;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaSec = ((moveEvent.clientX - startClientX) / rect.width) * duration;

      if (mode === 'move') {
        const newStart = Math.max(0, Math.min(duration - initialDuration, initialStart + deltaSec));
        onUpdateAudioTrack(track.id, { startTime: roundTime(newStart) });
      } else if (mode === 'trim-end') {
        const newDur = Math.max(0.5, Math.min(duration - initialStart, initialDuration + deltaSec));
        onUpdateAudioTrack(track.id, { duration: roundTime(newDur) });
      } else if (mode === 'trim-start') {
        const proposedStart = Math.max(0, Math.min(initialStart + initialDuration - 0.5, initialStart + deltaSec));
        const diff = proposedStart - initialStart;
        onUpdateAudioTrack(track.id, {
          startTime: roundTime(proposedStart),
          duration: roundTime(initialDuration - diff),
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Layer Reordering Handlers (Exact match to Screenshot 6 menu)
  const handleLayerAction = (
    id: string,
    action: 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward' | 'delete'
  ) => {
    setActiveMenuId(null);

    // If deleting
    if (action === 'delete') {
      const isAudio = currentScene.audioTracks?.some(tr => tr.id === id);
      if (isAudio) {
        onDeleteAudioTrack(id);
      } else {
        onDeleteElement(id);
      }
      return;
    }

    // Visual element reordering
    const elements = [...currentScene.elements];
    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;

    // Sort existing elements by ascending zIndex
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const sortedIndex = sorted.findIndex(el => el.id === id);
    if (sortedIndex === -1) return;

    const [target] = sorted.splice(sortedIndex, 1);

    if (action === 'bringToFront') {
      sorted.push(target);
    } else if (action === 'sendToBack') {
      sorted.unshift(target);
    } else if (action === 'bringForward') {
      const newPos = Math.min(sorted.length, sortedIndex + 1);
      sorted.splice(newPos, 0, target);
    } else if (action === 'sendBackward') {
      const newPos = Math.max(0, sortedIndex - 1);
      sorted.splice(newPos, 0, target);
    }

    // Normalize and commit new zIndex values (10, 20, 30...)
    sorted.forEach((item, idx) => {
      onUpdateElement(item.id, { zIndex: (idx + 1) * 10 });
    });
  };

  // Split selected element at current playhead
  const handleSplitSelected = () => {
    if (!selectedElementId) return;
    const target = currentScene.elements.find(el => el.id === selectedElementId);
    if (!target) return;

    if (currentTime > target.startTime + 0.3 && currentTime < target.startTime + target.duration - 0.3) {
      const firstDuration = currentTime - target.startTime;
      const secondDuration = target.duration - firstDuration;

      // Update first part
      onUpdateElement(target.id, { duration: Math.round(firstDuration * 10) / 10 });

      // Create second part
      const newElem: StageElement = {
        ...target,
        id: `elem-split-${Date.now()}`,
        name: `${target.name} (Part 2)`,
        startTime: Math.round(currentTime * 10) / 10,
        duration: Math.round(secondDuration * 10) / 10,
        zIndex: target.zIndex + 1,
      };

      if (onAddElement) {
        onAddElement(newElem);
      }
    }
  };

  // Add layer presets
  const handleAddNewLayer = (type: 'background' | 'character' | 'audio' | 'effect' | 'text' | 'prop') => {
    setIsAddLayerOpen(false);

    if (type === 'background') {
      const count = currentScene.elements.filter(e => e.isBackground).length + 1;
      const newBg: StageElement = {
        id: `elem-bg-${Date.now()}`,
        name: `BG-${count}`,
        type: 'image',
        mediaUrl: STOCK_BACKGROUNDS[(count - 1) % STOCK_BACKGROUNDS.length].url,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        zIndex: 1, // at bottom initially
        startTime: 0,
        duration: duration,
        isBackground: true,
        locked: false,
        visible: true,
      };
      if (onAddElement) onAddElement(newBg);
      onSelectElement(newBg.id);
    } else if (type === 'character') {
      const char = DEFAULT_CHARACTERS[currentScene.elements.filter(e => e.type === 'character').length % DEFAULT_CHARACTERS.length];
      const newChar: StageElement = {
        id: `elem-char-${Date.now()}`,
        name: char.name,
        type: 'character',
        characterData: char,
        x: 45 + (Math.random() * 10 - 5),
        y: 65,
        width: 26,
        height: 52,
        zIndex: (currentScene.elements.length + 1) * 10,
        startTime: 0,
        duration: duration,
        animation: 'idle',
        scaleX: 1,
        locked: false,
        visible: true,
      };
      if (onAddElement) onAddElement(newChar);
      onSelectElement(newChar.id);
    } else if (type === 'audio') {
      const count = (currentScene.audioTracks?.length || 0) + 1;
      const stock = STOCK_AUDIO[(count - 1) % STOCK_AUDIO.length];
      const newAudio: AudioTrackItem = {
        id: `audio-track-${Date.now()}`,
        name: stock.name,
        url: stock.url,
        startTime: currentTime,
        duration: stock.duration || 8,
        volume: 0.8,
        isMuted: false,
        locked: false,
        visible: true,
      };
      if (onAddAudioTrack) onAddAudioTrack(newAudio);
    } else if (type === 'effect') {
      const newFx: StageElement = {
        id: `elem-fx-${Date.now()}`,
        name: 'Li... Spl',
        type: 'effect',
        effectType: 'sunlight',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        zIndex: 99,
        startTime: 0,
        duration: duration,
        locked: false,
        visible: true,
      };
      if (onAddElement) onAddElement(newFx);
      onSelectElement(newFx.id);
    } else if (type === 'text') {
      const newTxt: StageElement = {
        id: `elem-text-${Date.now()}`,
        name: 'Dialogue',
        type: 'speechBubble',
        text: 'New Dialogue text here',
        x: 50,
        y: 35,
        width: 32,
        height: 18,
        bubbleColor: '#ffffff',
        textColor: '#0f172a',
        fontSize: 15,
        zIndex: (currentScene.elements.length + 1) * 10,
        startTime: currentTime,
        duration: Math.min(duration - currentTime, 6),
        locked: false,
        visible: true,
      };
      if (onAddElement) onAddElement(newTxt);
      onSelectElement(newTxt.id);
    } else if (type === 'prop') {
      const newProp: StageElement = {
        id: `elem-prop-${Date.now()}`,
        name: 'Asset Prop',
        type: 'image',
        mediaUrl: STOCK_BACKGROUNDS[1].url,
        x: 50,
        y: 50,
        width: 25,
        height: 25,
        zIndex: (currentScene.elements.length + 1) * 10,
        startTime: currentTime,
        duration: Math.min(duration - currentTime, 8),
        locked: false,
        visible: true,
      };
      if (onAddElement) onAddElement(newProp);
      onSelectElement(newProp.id);
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

  // Visual Elements ordered in descending zIndex (top of timeline = top layer on canvas)
  const visualLayers = [...currentScene.elements].sort((a, b) => b.zIndex - a.zIndex);
  const audioLayers = currentScene.audioTracks || [];

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
            title="Add New Scene"
            className="flex items-center justify-center p-1.5 bg-[#1c222e] hover:bg-[#252c3b] text-slate-300 rounded border border-[#2e3748] transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
          </button>

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

            {/* Quick + Add Layer Dropdown */}
            <div className="relative add-layer-container">
              <button
                onClick={() => setIsAddLayerOpen(!isAddLayerOpen)}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Add Layer to Timeline"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {isAddLayerOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-[#1b202c] border border-slate-700/80 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-slate-200">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Add to Timeline
                  </div>
                  <button
                    onClick={() => handleAddNewLayer('background')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Background Image (BG)</span>
                  </button>
                  <button
                    onClick={() => handleAddNewLayer('character')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Character Layer</span>
                  </button>
                  <button
                    onClick={() => handleAddNewLayer('audio')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <Music className="w-3.5 h-3.5 text-green-400" />
                    <span>Audio Track / Voice</span>
                  </button>
                  <button
                    onClick={() => handleAddNewLayer('effect')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cinematic Effect</span>
                  </button>
                  <button
                    onClick={() => handleAddNewLayer('text')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <Type className="w-3.5 h-3.5 text-purple-400" />
                    <span>Dialogue / Speech Bubble</span>
                  </button>
                  <button
                    onClick={() => handleAddNewLayer('prop')}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Prop / Asset Image</span>
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-slate-700/80 mx-0.5 sm:mx-1" />

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
                onClick={() => setTimelineZoom(Math.max(0.5, Math.round((timelineZoom - 0.25) * 100) / 100))}
                className="p-0.5 sm:p-1 hover:text-white text-slate-400 rounded hover:bg-[#202634] cursor-pointer transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Slider (Visible on md desktop screens) */}
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.25"
                value={timelineZoom}
                onChange={e => setTimelineZoom(parseFloat(e.target.value))}
                className="hidden md:inline-block w-12 lg:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                title={`Timeline Zoom: ${Math.round(timelineZoom * 100)}%`}
              />

              <button
                onClick={() => setTimelineZoom(Math.min(5, Math.round((timelineZoom + 0.25) * 100) / 100))}
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
              minWidth: `max(100%, ${totalTimelineWidthPx}px)`,
              width: `max(100%, ${totalTimelineWidthPx}px)`,
            }}
            className="flex flex-col min-h-full relative"
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
                onMouseDown={handleRulerMouseDown}
                className="flex-1 h-full relative cursor-pointer overflow-hidden"
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
            <div className="flex-1 divide-y divide-[#1e2330]">
            
            {/* ALL VISUAL LAYERS (Sorted by zIndex descending: top layer on timeline = top layer on canvas) */}
            {visualLayers.map(el => {
              const startPct = (el.startTime / duration) * 100;
              const widthPct = (el.duration / duration) * 100;
              const isSelected = el.id === selectedElementId;
              const isLocked = el.locked ?? false;
              const isVisible = el.visible !== false;
              const isEditing = editingNameId === el.id;

              // Color styles and icons based on element type (Matching Screenshot 5)
              let trackColor = 'bg-blue-600 text-white';
              let trackLabel = el.characterData?.name || el.name;
              let IconComp = User;

              if (el.type === 'effect') {
                trackColor = 'bg-[#333d4f] text-slate-200 border border-slate-600/40';
                trackLabel = 'Effects';
                IconComp = Sparkles;
              } else if (el.type === 'character') {
                trackColor = 'bg-[#1d4ed8] text-white';
                trackLabel = el.animation ? el.animation.charAt(0).toUpperCase() + el.animation.slice(1) : 'Idle';
                IconComp = User;
              } else if (el.type === 'image' && el.isBackground) {
                trackColor = 'bg-[#3f6212] text-lime-100 border border-lime-800/40';
                trackLabel = 'Image';
                IconComp = ImageIcon;
              } else if (el.type === 'image') {
                trackColor = 'bg-[#15803d] text-emerald-100';
                trackLabel = el.name || 'Prop';
                IconComp = ImageIcon;
              } else if (el.type === 'speechBubble' || el.type === 'text') {
                trackColor = 'bg-[#b45309] text-amber-100';
                trackLabel = `"${el.text || 'Dialogue'}"`;
                IconComp = Type;
              }

              return (
                <div
                  key={el.id}
                  onClick={() => {
                    onSelectElement(el.id);
                    onSelectAudio?.(null);
                  }}
                  className={`h-9 flex items-center relative transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#1a2130]' : 'hover:bg-[#151922]'
                  }`}
                >
                  {/* LEFT TRACK HEADER (Screenshot 5: [ ⋮ ] Name [ 👁 ] [ 🔒 ] [ ✕ ]) - Collapses to the left */}
                  <div
                    className={`transition-all duration-200 shrink-0 bg-[#181d28] h-full sticky left-0 z-20 flex items-center justify-between text-xs font-medium ${
                      isLayerHeadersVisible
                        ? 'w-40 sm:w-44 px-2 border-r border-[#222834] opacity-100'
                        : 'w-0 max-w-0 p-0 overflow-hidden border-r-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    
                    {/* 3 Dots Menu Button */}
                    <div className="relative timeline-menu-container">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({ top: rect.bottom + 4, left: rect.left });
                          setActiveMenuId(activeMenuId === el.id ? null : el.id);
                        }}
                        className="p-1 hover:text-white text-slate-400 rounded hover:bg-[#252c3c] cursor-pointer transition-colors"
                        title="Layer Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Layer Name (Click to edit / rename) */}
                    <div className="flex-1 min-w-0 px-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={e => setEditingNameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCommitRename(el.id, false);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                          onBlur={() => handleCommitRename(el.id, false)}
                          autoFocus
                          className="w-full bg-[#0d1117] border border-blue-500 text-white text-[11px] px-1 py-0.5 rounded outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => handleStartRename(el.id, el.name)}
                          onClick={() => handleStartRename(el.id, el.name)}
                          title={`${el.name} (Click to rename)`}
                          className="truncate text-[11px] font-semibold text-slate-200 block cursor-pointer hover:text-blue-400"
                        >
                          {el.name}
                        </span>
                      )}
                    </div>

                    {/* Visibility, Lock, and Delete Buttons */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Visibility Eye Icon */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateElement(el.id, { visible: !isVisible });
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isVisible ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={isVisible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Lock Icon */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateElement(el.id, { locked: !isLocked });
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={isLocked ? 'Unlock Layer' : 'Lock Layer'}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-60" />}
                      </button>

                      {/* Delete X Icon */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteElement(el.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 rounded cursor-pointer transition-colors"
                        title="Delete Layer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* RIGHT TRACK LANE CLIP (Screenshot 5) */}
                  <div className="flex-1 h-full relative overflow-hidden">
                    
                    {/* Visual Clip Bar */}
                    <div
                      onMouseDown={e => handleClipMouseDown(e, el, 'move')}
                      className={`absolute top-1 bottom-1 rounded px-2.5 flex items-center justify-between text-xs font-semibold shadow-xs transition-all overflow-hidden ${trackColor} ${
                        isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-grab active:cursor-grabbing'
                      } ${!isVisible ? 'opacity-35 grayscale' : ''} ${
                        isSelected ? 'ring-2 ring-blue-400 z-10' : ''
                      }`}
                      style={{
                        left: `${startPct}%`,
                        width: `${Math.max(4, widthPct)}%`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      {!isLocked && (
                        <div
                          onMouseDown={e => handleClipMouseDown(e, el, 'trim-start')}
                          className="w-1.5 h-full absolute left-0 top-0 cursor-ew-resize hover:bg-white/30"
                        />
                      )}

                      <div className="flex items-center space-x-1.5 truncate pl-0.5">
                        <IconComp className="w-3 h-3 shrink-0 opacity-85" />
                        <span className="truncate text-[11px]">{trackLabel}</span>
                      </div>

                      {/* Right Trim Handle */}
                      {!isLocked && (
                        <div
                          onMouseDown={e => handleClipMouseDown(e, el, 'trim-end')}
                          className="w-1.5 h-full absolute right-0 top-0 cursor-ew-resize hover:bg-white/30"
                        />
                      )}
                    </div>

                    {/* Playhead Guide Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 pointer-events-none z-30"
                      style={{ left: `${playheadPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* AUDIO TRACKS (Screenshot 5: Rich Green Waveform Track with Drag & Trim for precise alignment) */}
            {audioLayers.map(track => {
              const startPct = (track.startTime / duration) * 100;
              const widthPct = (track.duration / duration) * 100;
              const isLocked = track.locked ?? false;
              const isVisible = track.visible !== false;
              const isEditing = editingNameId === track.id;
              const numBars = Math.max(28, Math.floor(track.duration * 16 * timelineZoom));
              const isSelected = selectedAudioId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    onSelectAudio?.(track.id);
                    onSelectElement(null);
                  }}
                  className={`h-9 flex items-center relative transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#14281a]' : 'hover:bg-[#151922]'
                  }`}
                >
                  {/* Left Track Header - Collapses to the left */}
                  <div
                    className={`transition-all duration-200 shrink-0 bg-[#181d28] h-full sticky left-0 z-20 flex items-center justify-between text-xs font-medium ${
                      isLayerHeadersVisible
                        ? 'w-40 sm:w-44 px-2 border-r border-[#222834] opacity-100'
                        : 'w-0 max-w-0 p-0 overflow-hidden border-r-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="relative timeline-menu-container">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({ top: rect.bottom + 4, left: rect.left });
                          setActiveMenuId(activeMenuId === track.id ? null : track.id);
                        }}
                        className="p-1 hover:text-white text-slate-400 rounded hover:bg-[#252c3c] cursor-pointer"
                        title="Audio Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 px-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={e => setEditingNameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCommitRename(track.id, true);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                          onBlur={() => handleCommitRename(track.id, true)}
                          autoFocus
                          className="w-full bg-[#0d1117] border border-green-500 text-white text-[11px] px-1 py-0.5 rounded outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => handleStartRename(track.id, track.name)}
                          onClick={() => handleStartRename(track.id, track.name)}
                          title={`${track.name} (Click to rename)`}
                          className="truncate text-[11px] font-semibold text-slate-200 block cursor-pointer hover:text-green-400"
                        >
                          {track.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Audio Mute */}
                      <button
                        onClick={() => onUpdateAudioTrack(track.id, { isMuted: !track.isMuted })}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          track.isMuted ? 'text-red-400' : 'text-slate-400 hover:text-white'
                        }`}
                        title={track.isMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {track.isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* Lock Icon */}
                      <button
                        onClick={() => onUpdateAudioTrack(track.id, { locked: !isLocked })}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isLocked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={isLocked ? 'Unlock Audio Track' : 'Lock Audio Track'}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-60" />}
                      </button>

                      {/* Delete X */}
                      <button
                        onClick={() => onDeleteAudioTrack(track.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded cursor-pointer transition-colors"
                        title="Delete Audio"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right Track Lane (Green Waveform bar with sub-second drag & trim) */}
                  <div className="flex-1 h-full relative overflow-hidden">
                    <div
                      onMouseDown={e => {
                        onSelectAudio?.(track.id);
                        onSelectElement(null);
                        handleAudioClipMouseDown(e, track, 'move');
                      }}
                      className={`absolute top-1 bottom-1 rounded px-2.5 flex items-center justify-between text-xs font-semibold bg-[#15803d] text-white shadow-xs overflow-hidden ${
                        isSelected ? 'ring-2 ring-lime-400 shadow-md' : ''
                      } ${
                        track.isMuted ? 'opacity-40 grayscale' : ''
                      } ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-grab active:cursor-grabbing'}`}
                      style={{
                        left: `${startPct}%`,
                        width: `${Math.max(4, widthPct)}%`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      {!isLocked && (
                        <div
                          onMouseDown={e => handleAudioClipMouseDown(e, track, 'trim-start')}
                          className="w-1.5 h-full absolute left-0 top-0 cursor-ew-resize hover:bg-white/30 z-10"
                          title="Trim Start"
                        />
                      )}

                      <div className="flex items-center space-x-2 truncate">
                        <Music className="w-3 h-3 text-lime-200 shrink-0" />
                        
                        {/* Realistic Waveform SVG Visualizer scaling with zoom (Screenshot 5) */}
                        <div className="flex items-center space-x-0.5 h-3.5 shrink-0 opacity-95">
                          {Array.from({ length: Math.min(300, numBars) }).map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-lime-100 rounded-full shrink-0"
                              style={{
                                height: `${Math.max(3, ((i * 13) % 11) + 2)}px`,
                              }}
                            />
                          ))}
                        </div>

                        <span className="truncate text-[11px] font-medium text-lime-100">{track.name}</span>
                      </div>

                      {/* Right Trim Handle */}
                      {!isLocked && (
                        <div
                          onMouseDown={e => handleAudioClipMouseDown(e, track, 'trim-end')}
                          className="w-1.5 h-full absolute right-0 top-0 cursor-ew-resize hover:bg-white/30 z-10"
                          title="Trim End"
                        />
                      )}
                    </div>

                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 pointer-events-none z-30"
                      style={{ left: `${playheadPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}

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
                <span>Bring Forward</span>
              </button>

              <button
                onClick={() => handleLayerAction(activeMenuId, 'sendBackward')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center space-x-2.5 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5 text-purple-400" />
                <span>Send Backward</span>
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
